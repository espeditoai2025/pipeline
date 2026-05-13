"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Lead, LeadStatus } from "@/types/contacts";

function getOrgId(s: Session | null) {
  return (s?.user as { organizationId?: string } | undefined)?.organizationId ?? null;
}

// DB enum → app type mapping
const DB_TO_APP: Record<string, LeadStatus> = {
  NEW: "NEW",
  CONTACTED: "WORKING",
  QUALIFIED: "NURTURING",
  CONVERTED: "CONVERTED",
  DISQUALIFIED: "DISQUALIFIED",
};
const APP_TO_DB: Record<string, string> = {
  NEW: "NEW",
  WORKING: "CONTACTED",
  NURTURING: "QUALIFIED",
  CONVERTED: "CONVERTED",
  DISQUALIFIED: "DISQUALIFIED",
};

export async function getLeads(): Promise<Lead[]> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return [];

  const rows = await db.lead.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((l) => ({
    id: l.id,
    title: l.title,
    source: l.source ?? null,
    score: l.score,
    status: (DB_TO_APP[l.status] ?? l.status) as LeadStatus,
    data: (l.data ?? {}) as Record<string, unknown>,
    organizationId: l.organizationId,
    convertedDealId: l.convertedDealId ?? null,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.createdAt.toISOString(),
  }));
}

const leadSchema = z.object({
  title: z.string().min(1, "Titolo obbligatorio"),
  source: z.string().optional(),
  score: z.number().min(0).max(100),
  status: z.enum(["NEW", "WORKING", "NURTURING", "CONVERTED", "DISQUALIFIED"]),
  data: z.record(z.string(), z.unknown()).optional(),
});

export async function createLead(input: z.infer<typeof leadSchema>): Promise<{ data: Lead | null; error: string | null }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!session || !orgId) return { data: null, error: "Non autorizzato" };

  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  try {
    const row = await db.lead.create({
      data: {
        title: parsed.data.title,
        source: parsed.data.source || null,
        score: parsed.data.score,
        status: APP_TO_DB[parsed.data.status] as "NEW" | "CONTACTED" | "QUALIFIED" | "CONVERTED" | "DISQUALIFIED",
        data: (parsed.data.data ?? {}) as Record<string, string>,
        organizationId: orgId,
      },
    });

    revalidatePath("/leads");
    return {
      data: {
        id: row.id,
        title: row.title,
        source: row.source ?? null,
        score: row.score,
        status: (DB_TO_APP[row.status] ?? row.status) as LeadStatus,
        data: (row.data ?? {}) as Record<string, unknown>,
        organizationId: row.organizationId,
        convertedDealId: row.convertedDealId ?? null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.createdAt.toISOString(),
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Errore durante la creazione" };
  }
}

export async function updateLead(input: z.infer<typeof leadSchema> & { id: string }): Promise<{ data: Lead | null; error: string | null }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!session || !orgId) return { data: null, error: "Non autorizzato" };

  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  try {
    const row = await db.lead.update({
      where: { id: input.id, organizationId: orgId },
      data: {
        title: parsed.data.title,
        source: parsed.data.source || null,
        score: parsed.data.score,
        status: APP_TO_DB[parsed.data.status] as "NEW" | "CONTACTED" | "QUALIFIED" | "CONVERTED" | "DISQUALIFIED",
        data: (parsed.data.data ?? {}) as Record<string, string>,
      },
    });

    revalidatePath("/leads");
    return {
      data: {
        id: row.id,
        title: row.title,
        source: row.source ?? null,
        score: row.score,
        status: (DB_TO_APP[row.status] ?? row.status) as LeadStatus,
        data: (row.data ?? {}) as Record<string, unknown>,
        organizationId: row.organizationId,
        convertedDealId: row.convertedDealId ?? null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.createdAt.toISOString(),
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Errore durante l'aggiornamento" };
  }
}

export async function deleteLead(id: string): Promise<{ error: string | null }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  try {
    await db.lead.delete({ where: { id, organizationId: orgId } });
    revalidatePath("/leads");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Errore durante l'eliminazione" };
  }
}

export async function convertLead(id: string, dealTitle: string): Promise<{ dealId: string | null; error: string | null }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!session || !orgId) return { dealId: null, error: "Non autorizzato" };

  try {
    const lead = await db.lead.findUnique({ where: { id, organizationId: orgId } });
    if (!lead) return { dealId: null, error: "Lead non trovato" };
    if (lead.status === "CONVERTED") return { dealId: null, error: "Lead già convertito" };

    const pipeline = await db.pipeline.findFirst({
      where: { organizationId: orgId },
      include: { stages: { orderBy: { position: "asc" }, take: 1 } },
    });
    if (!pipeline?.stages[0]) return { dealId: null, error: "Nessuna pipeline configurata" };

    const deal = await db.deal.create({
      data: {
        title: dealTitle,
        value: 0,
        currency: "EUR",
        status: "OPEN",
        pipelineId: pipeline.id,
        stageId: pipeline.stages[0].id,
        organizationId: orgId,
        ownerId: session.user!.id!,
      },
    });

    await db.lead.update({
      where: { id },
      data: { status: "CONVERTED", convertedDealId: deal.id },
    });

    revalidatePath("/leads");
    revalidatePath("/deals");
    return { dealId: deal.id, error: null };
  } catch (e) {
    return { dealId: null, error: e instanceof Error ? e.message : "Errore durante la conversione" };
  }
}
