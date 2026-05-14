"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { runWorkflows } from "@/lib/workflow-engine";

function getOrgId(session: Session | null) {
  return (session?.user as { organizationId?: string } | undefined)?.organizationId ?? null;
}

const moveSchema = z.object({
  dealId: z.string(),
  newStageId: z.string(),
  oldStageId: z.string(),
});

export async function moveDeal(input: z.infer<typeof moveSchema>) {
  const session = await auth();
  if (!session) return { error: "Non autorizzato" };

  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) return { error: "Input non valido" };

  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  const { dealId, newStageId } = parsed.data;

  try {
    const deal = await db.deal.update({
      where: { id: dealId, organizationId: orgId },
      data: { stageId: newStageId, updatedAt: new Date() },
      select: { id: true, title: true, ownerId: true, contactId: true },
    });
    revalidatePath("/deals");
    runWorkflows({
      trigger: "DEAL_STAGE_CHANGED",
      orgId, dealId, dealTitle: deal.title,
      fromStageId: parsed.data.oldStageId, toStageId: newStageId,
      ownerId: deal.ownerId, contactId: deal.contactId ?? undefined,
    }).catch(console.error);
    return { ok: true };
  } catch {
    return { error: "Errore durante lo spostamento dell'affare" };
  }
}

const updateSchema = z.object({
  id: z.string(),
  title: z.string().min(1).optional(),
  value: z.number().min(0).optional(),
  currency: z.string().optional(),
  stageId: z.string().optional(),
  expectedClose: z.string().nullable().optional(),
  status: z.enum(["OPEN", "WON", "LOST"]).optional(),
  lostReason: z.string().nullable().optional(),
  contactId: z.string().nullable().optional(),
  companyId: z.string().nullable().optional(),
});

export async function updateDeal(input: z.infer<typeof updateSchema>) {
  const session = await auth();
  if (!session) return { error: "Non autorizzato" };

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { error: "Input non valido" };

  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  const { id, expectedClose, status, ...rest } = parsed.data;

  try {
    const prev = await db.deal.findUnique({ where: { id, organizationId: orgId }, select: { value: true, title: true, ownerId: true, contactId: true } });

    const updated = await db.deal.update({
      where: { id, organizationId: orgId },
      data: {
        ...rest,
        expectedClose: expectedClose ? new Date(expectedClose) : expectedClose === null ? null : undefined,
        status: status ?? undefined,
        closedAt: status === "WON" || status === "LOST" ? new Date() : status === "OPEN" ? null : undefined,
        updatedAt: new Date(),
      },
      select: { id: true, title: true, value: true, ownerId: true, contactId: true },
    });

    revalidatePath("/deals");

    const base = { orgId, dealId: updated.id, dealTitle: updated.title, ownerId: updated.ownerId, contactId: updated.contactId ?? undefined };
    if (status === "WON") {
      runWorkflows({ trigger: "DEAL_WON", ...base, dealValue: Number(updated.value) }).catch(console.error);
    } else if (status === "LOST") {
      runWorkflows({ trigger: "DEAL_LOST", ...base }).catch(console.error);
    } else if (rest.value !== undefined && prev && Number(rest.value) !== Number(prev.value)) {
      runWorkflows({ trigger: "DEAL_VALUE_CHANGED", ...base, newValue: Number(updated.value) }).catch(console.error);
    }

    return { ok: true };
  } catch {
    return { error: "Errore durante l'aggiornamento" };
  }
}

const createSchema = z.object({
  title: z.string().min(1),
  value: z.number().min(0),
  currency: z.string().default("EUR"),
  stageId: z.string(),
  pipelineId: z.string(),
  expectedClose: z.string().optional(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
});

export async function createDeal(input: z.infer<typeof createSchema>) {
  const session = await auth();
  if (!session) return { error: "Non autorizzato" };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { error: "Input non valido" };

  const orgId = getOrgId(session);
  const ownerId = session.user?.id;
  if (!orgId || !ownerId) return { error: "Non autorizzato" };

  const { expectedClose, ...rest } = parsed.data;

  try {
    const deal = await db.deal.create({
      data: {
        ...rest,
        organizationId: orgId,
        ownerId,
        expectedClose: expectedClose ? new Date(expectedClose) : undefined,
      },
    });
    revalidatePath("/deals");
    runWorkflows({
      trigger: "DEAL_CREATED",
      orgId, dealId: deal.id, dealTitle: deal.title, dealValue: Number(deal.value),
      ownerId, stageId: deal.stageId, contactId: deal.contactId ?? undefined,
    }).catch(console.error);
    return { ok: true, id: deal.id };
  } catch {
    return { error: "Errore durante la creazione" };
  }
}

export async function deleteDeal(dealId: string) {
  const session = await auth();
  if (!session) return { error: "Non autorizzato" };

  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  try {
    await db.deal.update({
      where: { id: dealId, organizationId: orgId },
      data: { status: "DELETED" },
    });
    revalidatePath("/deals");
    return { ok: true };
  } catch {
    return { error: "Errore durante l'eliminazione" };
  }
}

export async function getDealsForSelect(): Promise<{ id: string; title: string; value: number; currency: string }[]> {
  const session = await auth();
  if (!session) return [];

  const orgId = getOrgId(session);
  if (!orgId) return [];

  try {
    const deals = await db.deal.findMany({
      where: { organizationId: orgId, status: "OPEN" },
      select: { id: true, title: true, value: true, currency: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    return deals.map((d) => ({ ...d, value: Number(d.value) }));
  } catch {
    return [];
  }
}
