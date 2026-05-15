"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { chatCompletion } from "@/lib/openrouter";
import { getOrgPlan, checkFeature } from "@/lib/plan";
import { createLead } from "@/server/actions/leads";
import type { LeadFinderSearch, LeadCandidate } from "@/types/lead-finder";

function getIds(s: Session | null) {
  const user = s?.user as { id?: string; organizationId?: string } | undefined;
  return { orgId: user?.organizationId ?? null, userId: user?.id ?? null };
}

function mapSearch(s: {
  id: string; organizationId: string; name: string; sector: string | null;
  location: string | null; companySize: string | null; keywords: string | null;
  idealCustomer: string | null; maxResults: number; status: string; error: string | null;
  createdAt: Date; updatedAt: Date;
}): LeadFinderSearch {
  return {
    ...s,
    status: s.status as LeadFinderSearch["status"],
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

function mapCandidate(c: {
  id: string; organizationId: string; searchId: string; companyName: string;
  website: string | null; sector: string | null; location: string | null;
  companySize: string | null; contactName: string | null; contactRole: string | null;
  email: string | null; phone: string | null; linkedinUrl: string | null;
  score: number; source: string; motivation: string | null; status: string;
  leadId: string | null; createdAt: Date;
}): LeadCandidate {
  return {
    ...c,
    status: c.status as LeadCandidate["status"],
    createdAt: c.createdAt.toISOString(),
  };
}

const searchSchema = z.object({
  name: z.string().min(1, "Nome ricerca obbligatorio"),
  sector: z.string().optional(),
  location: z.string().optional(),
  companySize: z.string().optional(),
  keywords: z.string().optional(),
  idealCustomer: z.string().optional(),
  maxResults: z.number().int().min(3).max(20).default(10),
});

// ─── createSearch ─────────────────────────────────────────────────────────

export async function createSearch(
  input: z.infer<typeof searchSchema>
): Promise<{ data: LeadFinderSearch | null; error: string | null }> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return { data: null, error: "Non autorizzato" };

  const plan = await getOrgPlan(orgId);
  const planError = checkFeature(plan, "ai");
  if (planError) return { data: null, error: planError };

  const parsed = searchSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Input non valido" };

  try {
    const row = await db.leadFinderSearch.create({
      data: { organizationId: orgId, ...parsed.data, status: "PENDING" },
    });
    revalidatePath("/lead-finder");
    return { data: mapSearch(row), error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Errore creazione ricerca" };
  }
}

// ─── Google Places helper ─────────────────────────────────────────────────

type PlacesResult = {
  companyName: string;
  website: string | null;
  phone: string | null;
  location: string | null;
};

async function searchGooglePlaces(query: string, maxResults: number): Promise<PlacesResult[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.websiteUri,places.businessStatus",
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: Math.min(maxResults, 20),
        languageCode: "it",
        regionCode: "IT",
      }),
    });

    if (!res.ok) return [];

    const data = await res.json() as {
      places?: Array<{
        displayName?: { text?: string };
        formattedAddress?: string;
        internationalPhoneNumber?: string;
        websiteUri?: string;
        businessStatus?: string;
      }>;
    };

    return (data.places ?? [])
      .filter((p) => p.businessStatus !== "CLOSED_PERMANENTLY" && p.displayName?.text)
      .map((p) => ({
        companyName: p.displayName!.text!,
        website: p.websiteUri ? p.websiteUri.replace(/\/$/, "") : null,
        phone: p.internationalPhoneNumber ?? null,
        // Extract city from formattedAddress (first meaningful part before country)
        location: p.formattedAddress
          ? p.formattedAddress.split(",").slice(-3, -1).map((s) => s.trim()).join(", ")
          : null,
      }));
  } catch {
    return [];
  }
}

// ─── JSON parsing helper ──────────────────────────────────────────────────

function extractJsonArray(raw: string): Array<Record<string, unknown>> {
  const stripped = raw.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
  const match = stripped.match(/\[[\s\S]*\]/);
  if (!match) throw new Error(`Risposta AI non valida — nessun array JSON trovato. Risposta: ${raw.slice(0, 300)}`);
  try {
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) throw new Error("Non è un array");
    return parsed as Array<Record<string, unknown>>;
  } catch {
    throw new Error(`JSON malformato nella risposta AI: ${match[0].slice(0, 200)}`);
  }
}

// ─── runSearch ────────────────────────────────────────────────────────────

export async function runSearch(
  searchId: string
): Promise<{ error: string | null }> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return { error: "Non autorizzato" };

  const plan = await getOrgPlan(orgId);
  const planError = checkFeature(plan, "ai");
  if (planError) return { error: planError };

  const search = await db.leadFinderSearch.findFirst({
    where: { id: searchId, organizationId: orgId },
  });
  if (!search) return { error: "Ricerca non trovata" };

  await db.leadFinderSearch.update({ where: { id: searchId }, data: { status: "RUNNING" } });

  try {
    // ── FASE 1: Google Places → aziende reali verificate ──────────────────
    const placesQuery = [
      search.keywords || search.sector,
      search.location,
    ].filter(Boolean).join(" ");

    const placesResults = placesQuery
      ? await searchGooglePlaces(placesQuery, search.maxResults)
      : [];

    const hasPlacesData = placesResults.length > 0;

    // ── FASE 2: Perplexity/Sonar ──────────────────────────────────────────
    // Se abbiamo dati da Places: Sonar arricchisce solo contatti + scoring
    // Altrimenti: Sonar trova tutto da zero (fallback)

    const criteria: string[] = [];
    if (search.sector) criteria.push(`Settore: ${search.sector}`);
    if (search.location) criteria.push(`Paese/Città: ${search.location}`);
    if (search.companySize) criteria.push(`Dimensione azienda: ${search.companySize} dipendenti`);
    if (search.keywords) criteria.push(`Parole chiave: ${search.keywords}`);
    if (search.idealCustomer) criteria.push(`Descrizione cliente ideale: ${search.idealCustomer}`);
    const criteriaText = criteria.length > 0 ? criteria.join("\n") : "Aziende B2B italiane generiche";

    let parsed: Array<{
      companyName: string; website: string | null; sector: string | null;
      location: string | null; companySize: string | null; contactName: string | null;
      contactRole: string | null; email: string | null; phone: string | null;
      linkedinUrl: string | null; score: number; motivation: string | null;
    }>;

    if (hasPlacesData) {
      // Sonar arricchisce le aziende reali trovate da Google Places
      const companiesList = placesResults
        .map((p, i) => `${i + 1}. ${p.companyName}${p.website ? ` — ${p.website}` : ""}${p.location ? ` — ${p.location}` : ""}`)
        .join("\n");

      const raw = await chatCompletion(
        [
          {
            role: "system",
            content: `Sei un esperto ricercatore di lead B2B con accesso alla ricerca web in tempo reale.
Ti vengono fornite aziende REALI già verificate da Google Maps. Il tuo compito è:
1. Trovare il referente principale (CEO, titolare, direttore commerciale) cercando su LinkedIn, sito web, CCIAA, comunicati stampa
2. Trovare l'email di contatto (personale o generica info@/commerciale@)
3. Assegnare uno score 0-100 in base alla corrispondenza con i criteri del cliente ideale
4. Scrivere una breve motivazione dello score
Rispondi SOLO con JSON array valido, zero testo aggiuntivo, zero markdown.`,
          },
          {
            role: "user",
            content: `Criteri cliente ideale:
${criteriaText}

Aziende reali da arricchire (trovate su Google Maps):
${companiesList}

Per ognuna cerca sul web il referente e restituisci SOLO questo JSON array:
[
  {
    "companyName": "nome esatto come sopra",
    "contactName": "Nome Cognome del titolare/CEO",
    "contactRole": "CEO / Titolare / Direttore Commerciale",
    "email": "email trovata sul web",
    "linkedinUrl": "https://linkedin.com/...",
    "score": 85,
    "motivation": "perché corrisponde ai criteri"
  }
]`,
          },
        ],
        { maxTokens: 3000, temperature: 0.4, model: process.env.OPENROUTER_MODEL_LEADFINDER ?? "perplexity/sonar" }
      );

      const enriched = extractJsonArray(raw) as Array<Record<string, unknown>>;

      // Merge Google Places data + Sonar enrichment
      parsed = placesResults.map((p) => {
        const match = enriched.find(
          (e) => typeof e.companyName === "string" &&
            e.companyName.toLowerCase().includes(p.companyName.toLowerCase().slice(0, 8))
        );
        return {
          companyName: p.companyName,
          website: p.website,
          sector: search.sector ?? null,
          location: p.location,
          companySize: search.companySize ?? null,
          phone: p.phone,
          contactName: match?.contactName ? String(match.contactName) : null,
          contactRole: match?.contactRole ? String(match.contactRole) : null,
          email: match?.email ? String(match.email) : null,
          linkedinUrl: match?.linkedinUrl ? String(match.linkedinUrl) : null,
          score: typeof match?.score === "number" ? Math.min(100, Math.max(0, Math.round(match.score))) : 60,
          motivation: match?.motivation ? String(match.motivation) : null,
        };
      });

    } else {
      // Fallback: Sonar trova tutto da zero
      const raw = await chatCompletion(
        [
          {
            role: "system",
            content: `Sei un esperto ricercatore di lead B2B con accesso alla ricerca web in tempo reale.
Trova aziende REALI con i relativi referenti commerciali (CEO, titolare, direttore commerciale).
Per ogni azienda cerca: sito web, referente principale, email, telefono, profilo LinkedIn.
Rispondi SOLO con JSON array valido, zero testo aggiuntivo, zero markdown.`,
          },
          {
            role: "user",
            content: `Criteri di ricerca:
${criteriaText}

Trova esattamente ${search.maxResults} aziende reali. Rispondi SOLO con JSON array:
[
  {
    "companyName": "Nome Azienda Srl",
    "website": "www.nomeazienda.it",
    "sector": "settore",
    "location": "Città, Provincia",
    "companySize": "11-50",
    "contactName": "Nome Cognome",
    "contactRole": "CEO / Titolare",
    "email": "nome@azienda.it",
    "phone": "+39 02 1234567",
    "linkedinUrl": "https://linkedin.com/company/...",
    "score": 85,
    "motivation": "perché corrisponde ai criteri"
  }
]
IMPORTANTE: usa email generica (info@, commerciale@) se non trovi quella personale.`,
          },
        ],
        { maxTokens: 3000, temperature: 0.5, model: process.env.OPENROUTER_MODEL_LEADFINDER ?? "perplexity/sonar" }
      );

      const candidates = extractJsonArray(raw);
      parsed = candidates
        .filter((c) => typeof c.companyName === "string" && c.companyName)
        .map((c) => ({
          companyName: String(c.companyName),
          website: c.website ? String(c.website) : null,
          sector: c.sector ? String(c.sector) : null,
          location: c.location ? String(c.location) : null,
          companySize: c.companySize ? String(c.companySize) : null,
          contactName: c.contactName ? String(c.contactName) : null,
          contactRole: c.contactRole ? String(c.contactRole) : null,
          email: c.email ? String(c.email) : null,
          phone: c.phone ? String(c.phone) : null,
          linkedinUrl: c.linkedinUrl ? String(c.linkedinUrl) : null,
          score: typeof c.score === "number" ? Math.min(100, Math.max(0, Math.round(c.score))) : 50,
          motivation: c.motivation ? String(c.motivation) : null,
        }));
    }

    // Enrichment pass: aziende ancora senza email → secondo tentativo Sonar
    const stillMissingEmail = parsed.filter((c) => !c.email);
    if (stillMissingEmail.length > 0) {
      try {
        const enrichPrompt = stillMissingEmail
          .map((c) => `- ${c.companyName}${c.website ? ` (${c.website})` : ""}`)
          .join("\n");
        const enrichRaw = await chatCompletion(
          [
            { role: "system", content: "Cerca sul web email e telefono delle seguenti aziende italiane. Rispondi SOLO con JSON array, zero testo extra." },
            { role: "user", content: `Trova email e telefono cercando su sito web, pagina contatti, LinkedIn, PagineGialle:\n${enrichPrompt}\n\nJSON array:\n[{"companyName":"...","email":"...","phone":"..."}]` },
          ],
          { maxTokens: 1500, temperature: 0.2, model: process.env.OPENROUTER_MODEL_LEADFINDER ?? "perplexity/sonar" }
        );
        const enrichStripped = enrichRaw.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
        const enrichMatch = enrichStripped.match(/\[[\s\S]*\]/);
        if (enrichMatch) {
          const enriched = JSON.parse(enrichMatch[0]) as Array<{ companyName: string; email?: string; phone?: string }>;
          parsed = parsed.map((c) => {
            const found = enriched.find((e) => e.companyName?.toLowerCase().includes(c.companyName.toLowerCase().slice(0, 8)));
            if (!found) return c;
            return { ...c, email: c.email ?? (found.email || null), phone: c.phone ?? (found.phone || null) };
          });
        }
      } catch {
        // non-fatal
      }
    }

    const rows = parsed.map((c) => ({
      organizationId: orgId,
      searchId,
      ...c,
      source: hasPlacesData ? "Google Maps + AI" : "AI",
      status: "PENDING",
    }));

    await db.leadCandidate.createMany({ data: rows });
    await db.leadFinderSearch.update({ where: { id: searchId }, data: { status: "DONE" } });
    revalidatePath(`/lead-finder/${searchId}`);
    return { error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore AI";
    await db.leadFinderSearch.update({ where: { id: searchId }, data: { status: "FAILED", error: msg } });
    return { error: msg };
  }
}

// ─── getSearches ──────────────────────────────────────────────────────────

export async function getSearches(): Promise<{ data: (LeadFinderSearch & { _count: { candidates: number } })[] | null; error: string | null }> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return { data: null, error: "Non autorizzato" };

  try {
    const rows = await db.leadFinderSearch.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { candidates: true } } },
    });
    return {
      data: rows.map((r) => ({ ...mapSearch(r), _count: r._count })),
      error: null,
    };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Errore" };
  }
}

// ─── getCandidates ────────────────────────────────────────────────────────

export async function getCandidates(
  searchId: string
): Promise<{ data: { search: LeadFinderSearch; candidates: LeadCandidate[] } | null; error: string | null }> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return { data: null, error: "Non autorizzato" };

  try {
    const search = await db.leadFinderSearch.findFirst({
      where: { id: searchId, organizationId: orgId },
      include: { candidates: { orderBy: { score: "desc" } } },
    });
    if (!search) return { data: null, error: "Ricerca non trovata" };

    return {
      data: {
        search: mapSearch(search),
        candidates: search.candidates.map(mapCandidate),
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Errore" };
  }
}

// ─── approveCandidate ─────────────────────────────────────────────────────

export async function approveCandidate(
  candidateId: string
): Promise<{ leadId: string | null; error: string | null }> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return { leadId: null, error: "Non autorizzato" };

  const candidate = await db.leadCandidate.findFirst({
    where: { id: candidateId, organizationId: orgId },
  });
  if (!candidate) return { leadId: null, error: "Candidato non trovato" };
  if (candidate.status === "APPROVED") return { leadId: candidate.leadId, error: null };

  const { data: newLead, error: leadError } = await createLead({
    title: candidate.companyName,
    source: "Lead Finder",
    score: candidate.score,
    email: candidate.email ?? undefined,
    phone: candidate.phone ?? undefined,
    notes: candidate.motivation ?? undefined,
    status: "NEW",
    data: {
      website: candidate.website,
      sector: candidate.sector,
      location: candidate.location,
      companySize: candidate.companySize,
      contactName: candidate.contactName,
      contactRole: candidate.contactRole,
      linkedinUrl: candidate.linkedinUrl,
      source: "Lead Finder AI",
    },
  });

  if (leadError || !newLead) return { leadId: null, error: leadError ?? "Errore creazione lead" };

  await db.leadCandidate.update({
    where: { id: candidateId },
    data: { status: "APPROVED", leadId: newLead.id },
  });

  revalidatePath(`/lead-finder`);
  return { leadId: newLead.id, error: null };
}

// ─── rejectBelowScore ─────────────────────────────────────────────────────

export async function rejectBelowScore(
  searchId: string,
  threshold = 70
): Promise<{ count: number; error: string | null }> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return { count: 0, error: "Non autorizzato" };

  try {
    const result = await db.leadCandidate.updateMany({
      where: { searchId, organizationId: orgId, status: "PENDING", score: { lt: threshold } },
      data: { status: "REJECTED" },
    });
    revalidatePath(`/lead-finder/${searchId}`);
    return { count: result.count, error: null };
  } catch (e) {
    return { count: 0, error: e instanceof Error ? e.message : "Errore" };
  }
}

// ─── rejectCandidate ──────────────────────────────────────────────────────

export async function rejectCandidate(
  candidateId: string
): Promise<{ error: string | null }> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return { error: "Non autorizzato" };

  try {
    await db.leadCandidate.updateMany({
      where: { id: candidateId, organizationId: orgId },
      data: { status: "REJECTED" },
    });
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Errore" };
  }
}
