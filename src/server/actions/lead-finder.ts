"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { chatCompletion } from "@/lib/openrouter";
import { getOrgPlan, getLimits, checkFeature } from "@/lib/plan";
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
  maxResults: z.number().int().min(3).max(50).default(10),
});

// ─── createSearch ─────────────────────────────────────────────────────────

export async function createSearch(
  input: z.infer<typeof searchSchema>
): Promise<{ data: LeadFinderSearch | null; error: string | null }> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return { data: null, error: "Non autorizzato" };

  const plan = await getOrgPlan(orgId);
  const limits = getLimits(plan);

  // Check daily limit for STARTER
  if (limits.leadFinderPerDay !== null) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayCount = await db.leadFinderSearch.count({
      where: { organizationId: orgId, createdAt: { gte: startOfDay } },
    });
    if (todayCount >= limits.leadFinderPerDay) {
      return { data: null, error: `Hai raggiunto il limite di ${limits.leadFinderPerDay} ricerca al giorno del piano Starter. Passa a PRO per ricerche illimitate.` };
    }
  }

  const parsed = searchSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Input non valido" };

  // Cap maxResults at plan limit
  const cappedData = {
    ...parsed.data,
    maxResults: Math.min(parsed.data.maxResults, limits.leadFinderMaxResults),
  };

  try {
    const row = await db.leadFinderSearch.create({
      data: { organizationId: orgId, ...cappedData, status: "PENDING" },
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

// ─── FatturatoItalia scraper ──────────────────────────────────────────────
// Source: fatturatoitalia.it — dati CCIAA per comune, ~15 aziende/pagina

function toComuneSlug(location: string): string {
  return (location.split(",")[0] ?? location)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")  // remove accents
    .replace(/['']/g, "")             // remove apostrophes
    .replace(/\s+/g, "-")             // spaces → hyphens
    .replace(/[^a-z0-9-]/g, "");
}

async function fetchFatturatoItalia(location: string, maxResults: number): Promise<PlacesResult[]> {
  const slug = toComuneSlug(location);
  if (!slug) return [];

  const results: PlacesResult[] = [];
  const seenSlugs = new Set<string>();
  const maxPages = Math.min(Math.ceil(maxResults / 15) + 2, 10);
  const cityName = (location.split(",")[0] ?? location).trim();

  for (let page = 1; page <= maxPages; page++) {
    try {
      const url = page === 1
        ? `https://www.fatturatoitalia.it/comune/${slug}`
        : `https://www.fatturatoitalia.it/comune/${slug}/${page}`;

      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Pipely-CRM/1.0)",
          "Accept-Language": "it-IT,it;q=0.9",
        },
        next: { revalidate: 86400 },
      });

      if (!res.ok) break;
      const html = await res.text();

      // Match company links: href="/company_slug" with title="Fatturato NOME AZIENDA"
      // Each company appears twice per row (name + revenue), deduplicate on slug
      const pattern = /href="https?:\/\/www\.fatturatoitalia\.it\/([a-z0-9][a-z0-9_-]+)"[^>]*title="(?:Fatturato\s+)?([^"]+)"/gi;
      let match: RegExpExecArray | null;
      let foundOnPage = 0;

      while ((match = pattern.exec(html)) !== null) {
        const companySlug = match[1] ?? "";
        const rawName = (match[2] ?? "").replace(/^Fatturato\s+/i, "").trim();

        // Skip navigation links (comune, provincia, regione pages)
        if (/^(comune|provincia|regione|settore|categoria)/.test(companySlug)) continue;
        if (seenSlugs.has(companySlug)) continue;
        if (!rawName || rawName.length < 2) continue;

        seenSlugs.add(companySlug);
        // Normalize company name: title case
        const companyName = rawName
          .toLowerCase()
          .replace(/\b\w/g, (c) => c.toUpperCase())
          .replace(/\bDi\b|\bDel\b|\bDella\b|\bDei\b|\bDegli\b|\bDelle\b|\bDa\b|\bIn\b|\bE\b/g, (m) => m.toLowerCase());

        results.push({ companyName, website: null, phone: null, location: cityName });
        foundOnPage++;
        if (results.length >= maxResults) break;
      }

      if (foundOnPage === 0 || results.length >= maxResults) break;
    } catch {
      break;
    }
  }

  return results;
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

  const search = await db.leadFinderSearch.findFirst({
    where: { id: searchId, organizationId: orgId },
  });
  if (!search) return { error: "Ricerca non trovata" };

  await db.leadFinderSearch.update({ where: { id: searchId }, data: { status: "RUNNING" } });

  try {
    // ── FASE 1: Google Places → aziende reali verificate ──────────────────
    const hasSpecificTerm = !!(search.keywords || search.sector);
    const loc = search.location ?? "";

    // Categorie da interrogare in parallelo quando la ricerca è generica
    const GENERIC_CATEGORIES = [
      "aziende imprese commercio",
      "artigiani costruzioni edilizia",
      "bar ristoranti alberghi turismo",
      "professionisti servizi consulenza",
      "negozi attività",
    ];

    let placesResults: PlacesResult[];

    if (hasSpecificTerm) {
      // Ricerca specifica: singola query con il termine dell'utente
      const q = `${search.keywords ?? search.sector} ${loc}`.trim();
      placesResults = await searchGooglePlaces(q, search.maxResults);
    } else {
      // Ricerca generica: 5 categorie in parallelo per massima copertura
      const queries = loc
        ? GENERIC_CATEGORIES.map((cat) => `${cat} ${loc}`)
        : [`aziende imprese artigiani professionisti ${loc}`.trim()];
      const allArrays = await Promise.all(queries.map((q) => searchGooglePlaces(q, 20)));
      const seen = new Set<string>();
      placesResults = allArrays
        .flat()
        .filter((p) => {
          const key = p.companyName.toLowerCase().slice(0, 20);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, search.maxResults);
    }

    // Escludi enti pubblici
    const PUBLIC_PREFIXES = ["comune di", "municipio", "provincia di", "regione ", "asl ", "istituto comprensivo", "scuola "];
    placesResults = placesResults.filter((p) => {
      const l = p.companyName.toLowerCase();
      return !PUBLIC_PREFIXES.some((pfx) => l.startsWith(pfx));
    });

    // ── FASE 1b: FatturatoItalia → aziende CCIAA non su Google Maps ──────
    // Aggiunge aziende registrate che non appaiono su Google Maps
    let fatturatoResults: PlacesResult[] = [];
    if (search.location) {
      try {
        const needed = search.maxResults - placesResults.length;
        const fetchCount = needed > 0 ? search.maxResults : Math.floor(search.maxResults * 0.5);
        fatturatoResults = await fetchFatturatoItalia(search.location, Math.max(fetchCount, 20));
      } catch {
        // non-fatal: procedi senza
      }
    }

    // Merge Places + FatturatoItalia — deduplica per nome (prime 12 lettere)
    const seenNames = new Set(placesResults.map((p) => p.companyName.toLowerCase().slice(0, 12)));
    const newFromFatturato = fatturatoResults.filter((f) => {
      const key = f.companyName.toLowerCase().slice(0, 12);
      if (seenNames.has(key)) return false;
      seenNames.add(key);
      return true;
    });

    // Se la ricerca è specifica (keywords/settore), filtra FatturatoItalia con Sonar dopo
    // Se generica, aggiungi tutte fino al limite
    const allPlacesResults = [...placesResults, ...newFromFatturato].slice(0, search.maxResults);

    const hasPlacesData = allPlacesResults.length > 0;

    // ── FASE 2: Perplexity/Sonar — arricchimento contatti in batch da 15 ──

    const criteria: string[] = [];
    if (search.sector) criteria.push(`Settore: ${search.sector}`);
    if (search.location) criteria.push(`Paese/Città: ${search.location}`);
    if (search.companySize) criteria.push(`Dimensione azienda: ${search.companySize} dipendenti`);
    if (search.keywords) criteria.push(`Parole chiave: ${search.keywords}`);
    if (search.idealCustomer) criteria.push(`Descrizione cliente ideale: ${search.idealCustomer}`);
    const criteriaText = criteria.length > 0
      ? criteria.join("\n")
      : `Qualsiasi azienda, artigiano o libero professionista${search.location ? ` di ${search.location}` : " italiano"}`;

    type ParsedCandidate = {
      companyName: string; website: string | null; sector: string | null;
      location: string | null; companySize: string | null; contactName: string | null;
      contactRole: string | null; email: string | null; phone: string | null;
      linkedinUrl: string | null; score: number; motivation: string | null;
    };

    let parsed: ParsedCandidate[];

    if (hasPlacesData) {
      // Batch Sonar enrichment: 15 aziende per chiamata
      const BATCH = 15;
      const enrichedAll: Array<Record<string, unknown>> = [];

      for (let i = 0; i < allPlacesResults.length; i += BATCH) {
        const batch = allPlacesResults.slice(i, i + BATCH);
        const companiesList = batch
          .map((p, idx) => `${i + idx + 1}. ${p.companyName}${p.website ? ` — ${p.website}` : ""}${p.location ? ` — ${p.location}` : ""}`)
          .join("\n");
        try {
          const raw = await chatCompletion(
            [
              {
                role: "system",
                content: `Sei un esperto ricercatore di lead B2B con accesso alla ricerca web in tempo reale.
Hai ricevuto un elenco di attività reali (da Google Maps e registro CCIAA). Per ognuna:
1. Trova il referente (titolare, CEO, responsabile) cercando su sito web, LinkedIn, CCIAA
2. Trova l'email (personale o generica: info@, commerciale@, contatti@)
3. Assegna uno score 0-100 rispetto ai criteri del cliente ideale
4. Scrivi una motivazione sintetica
Rispondi SOLO con JSON array, zero testo aggiuntivo, zero markdown.`,
              },
              {
                role: "user",
                content: `Criteri cliente ideale:\n${criteriaText}\n\nAttività da arricchire:\n${companiesList}\n\nJSON array (un oggetto per ogni attività, stesso ordine):\n[{"companyName":"...","contactName":"...","contactRole":"...","email":"...","linkedinUrl":"...","score":80,"motivation":"..."}]`,
              },
            ],
            { maxTokens: 2000, temperature: 0.4, model: process.env.OPENROUTER_MODEL_LEADFINDER ?? "perplexity/sonar" }
          );
          try { enrichedAll.push(...extractJsonArray(raw)); } catch { /* batch fallback */ }
        } catch { /* batch failure non-fatal */ }
      }

      // Merge Places/CCIAA + Sonar
      parsed = allPlacesResults.map((p) => {
        const match = enrichedAll.find(
          (e) => typeof e.companyName === "string" &&
            (e.companyName.toLowerCase().includes(p.companyName.toLowerCase().slice(0, 10)) ||
             p.companyName.toLowerCase().includes((e.companyName as string).toLowerCase().slice(0, 10)))
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
      source: hasPlacesData
        ? (fatturatoResults.length > 0 ? "Google Maps + CCIAA + AI" : "Google Maps + AI")
        : "AI",
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

// ─── deleteSearch ─────────────────────────────────────────────────────────

export async function deleteSearch(
  searchId: string
): Promise<{ error: string | null }> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return { error: "Non autorizzato" };

  try {
    await db.leadFinderSearch.delete({
      where: { id: searchId, organizationId: orgId },
    });
    revalidatePath("/lead-finder");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Errore eliminazione" };
  }
}

// ─── getLeadFinderInfo ────────────────────────────────────────────────────
// Returns plan limits + today's usage for the current org

export async function getLeadFinderInfo(): Promise<{
  perDay: number | null;
  maxResults: number;
  usedToday: number;
}> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return { perDay: 0, maxResults: 10, usedToday: 0 };

  const plan = await getOrgPlan(orgId);
  const limits = getLimits(plan);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const usedToday = limits.leadFinderPerDay !== null
    ? await db.leadFinderSearch.count({ where: { organizationId: orgId, createdAt: { gte: startOfDay } } })
    : 0;

  return {
    perDay: limits.leadFinderPerDay,
    maxResults: limits.leadFinderMaxResults,
    usedToday,
  };
}
