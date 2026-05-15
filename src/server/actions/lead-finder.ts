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
    const criteria: string[] = [];
    if (search.sector) criteria.push(`Settore: ${search.sector}`);
    if (search.location) criteria.push(`Paese/Città: ${search.location}`);
    if (search.companySize) criteria.push(`Dimensione azienda: ${search.companySize} dipendenti`);
    if (search.keywords) criteria.push(`Parole chiave: ${search.keywords}`);
    if (search.idealCustomer) criteria.push(`Descrizione cliente ideale: ${search.idealCustomer}`);

    const systemPrompt = `Sei un esperto ricercatore di lead B2B con accesso alla ricerca web in tempo reale.
Il tuo compito è trovare aziende REALI con i relativi referenti commerciali (CEO, titolare, direttore commerciale, responsabile acquisti).
Per ogni azienda cerca attivamente:
- Il sito web ufficiale
- Il nome e cognome del referente principale (CEO, titolare o direttore commerciale)
- L'email di contatto (cerca su sito web, LinkedIn, pagine "Contatti", CCIAA, comunicati stampa)
- Il numero di telefono (cerca su sito web, pagina contatti, Google Maps, PagineGialle)
- Il profilo LinkedIn dell'azienda o del referente
Rispondi SOLO con un array JSON valido, senza testo aggiuntivo, markdown o spiegazioni.`;

    const userPrompt = `Criteri di ricerca:
${criteria.length > 0 ? criteria.join("\n") : "Aziende B2B italiane generiche"}

Trova esattamente ${search.maxResults} aziende reali. Per ognuna cerca sul web il referente e i contatti.
Rispondi SOLO con questo JSON array (zero testo extra, zero markdown):
[
  {
    "companyName": "Nome Azienda Srl",
    "website": "www.nomeazienda.it",
    "sector": "settore preciso",
    "location": "Città, Provincia",
    "companySize": "11-50",
    "contactName": "Nome Cognome",
    "contactRole": "CEO / Titolare / Direttore Commerciale",
    "email": "nome@nomeazienda.it",
    "phone": "+39 02 1234567",
    "linkedinUrl": "https://www.linkedin.com/company/nome-azienda",
    "score": 87,
    "motivation": "perché corrisponde ai criteri"
  }
]
IMPORTANTE: compila email e phone con dati reali trovati sul web. Se non trovi l'email personale usa quella generica dell'azienda (info@, commerciale@, contatti@). Se non trovi il telefono usa quello presente sulla pagina contatti del sito.`;

    const raw = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { maxTokens: 3000, temperature: 0.5, model: process.env.OPENROUTER_MODEL_LEADFINDER ?? "perplexity/sonar" }
    );

    // Extract JSON array robustly
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("Risposta AI non valida — nessun array JSON trovato");

    const candidates = JSON.parse(match[0]) as Array<Record<string, unknown>>;
    if (!Array.isArray(candidates)) throw new Error("Risposta AI non è un array");

    let parsed = candidates
      .filter((c) => typeof c.companyName === "string" && c.companyName)
      .map((c) => ({
        companyName: String(c.companyName ?? ""),
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

    // Enrichment pass: for companies still missing email+phone, ask Sonar to find them
    const missing = parsed.filter((c) => !c.email && !c.phone);
    if (missing.length > 0) {
      try {
        const enrichPrompt = missing
          .map((c) => `- ${c.companyName}${c.website ? ` (${c.website})` : ""}`)
          .join("\n");
        const enrichRaw = await chatCompletion(
          [
            {
              role: "system",
              content: `Cerca sul web i contatti (email e telefono) delle seguenti aziende italiane. Rispondi SOLO con JSON array, zero testo extra.`,
            },
            {
              role: "user",
              content: `Per ognuna di queste aziende trova email di contatto e numero di telefono cercando su sito web, pagina contatti, LinkedIn, PagineGialle:\n${enrichPrompt}\n\nRispondi con JSON array:\n[{"companyName":"...","email":"...","phone":"..."}]`,
            },
          ],
          { maxTokens: 1500, temperature: 0.2, model: process.env.OPENROUTER_MODEL_LEADFINDER ?? "perplexity/sonar" }
        );
        const enrichMatch = enrichRaw.match(/\[[\s\S]*\]/);
        if (enrichMatch) {
          const enriched = JSON.parse(enrichMatch[0]) as Array<{ companyName: string; email?: string; phone?: string }>;
          parsed = parsed.map((c) => {
            const found = enriched.find((e) => e.companyName?.toLowerCase().includes(c.companyName.toLowerCase().slice(0, 10)));
            if (!found) return c;
            return {
              ...c,
              email: c.email ?? (found.email || null),
              phone: c.phone ?? (found.phone || null),
            };
          });
        }
      } catch {
        // enrichment failure is non-fatal — proceed with what we have
      }
    }

    const rows = parsed.map((c) => ({
      organizationId: orgId,
      searchId,
      ...c,
      source: "AI",
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
