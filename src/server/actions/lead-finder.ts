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

    const systemPrompt = `Sei un esperto ricercatore di lead B2B per aziende italiane.
Genera aziende target REALISTICHE e PLAUSIBILI che corrispondono ai criteri dati.
Rispondi SOLO con un array JSON valido, senza testo aggiuntivo, markdown o spiegazioni.
Usa nomi di aziende credibili (possono essere reali o verosimili).
Per ogni azienda assegna uno score da 0 a 100 in base a quanto corrisponde ai criteri.`;

    const userPrompt = `Criteri di ricerca:
${criteria.length > 0 ? criteria.join("\n") : "Nessun criterio specifico — genera aziende B2B generiche"}

Genera esattamente ${search.maxResults} aziende candidate in questo formato JSON array (nessun testo extra):
[
  {
    "companyName": "Nome Azienda Srl",
    "website": "www.esempio.it",
    "sector": "settore",
    "location": "Milano, Italia",
    "companySize": "11-50",
    "contactName": "Mario Rossi",
    "contactRole": "CEO",
    "email": "mario.rossi@esempio.it",
    "phone": "+39 02 1234567",
    "score": 87,
    "motivation": "Azienda tech B2B a Milano, dimensione ideale, keywords match"
  }
]`;

    const raw = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { maxTokens: 3000, temperature: 0.5 }
    );

    // Extract JSON array robustly
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("Risposta AI non valida — nessun array JSON trovato");

    const candidates = JSON.parse(match[0]) as Array<Record<string, unknown>>;
    if (!Array.isArray(candidates)) throw new Error("Risposta AI non è un array");

    const rows = candidates
      .filter((c) => typeof c.companyName === "string" && c.companyName)
      .map((c) => ({
        organizationId: orgId,
        searchId,
        companyName: String(c.companyName ?? ""),
        website: c.website ? String(c.website) : null,
        sector: c.sector ? String(c.sector) : null,
        location: c.location ? String(c.location) : null,
        companySize: c.companySize ? String(c.companySize) : null,
        contactName: c.contactName ? String(c.contactName) : null,
        contactRole: c.contactRole ? String(c.contactRole) : null,
        email: c.email ? String(c.email) : null,
        phone: c.phone ? String(c.phone) : null,
        score: typeof c.score === "number" ? Math.min(100, Math.max(0, Math.round(c.score))) : 50,
        source: "AI",
        motivation: c.motivation ? String(c.motivation) : null,
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
