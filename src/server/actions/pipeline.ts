"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { crmPermissionError } from "@/lib/crm-permissions";
import { db } from "@/lib/db";
import type { Pipeline } from "@/types/deals";
import { crmTransaction, assertPipelineCapacity } from "@/lib/crm-transaction";

function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

// Cap deals loaded per stage for rendering. A Kanban column can't usefully show
// more than this; accurate counts/totals come from a separate aggregate so the
// header figures stay correct even when the list is capped (avoids loading every
// open deal with 3 relations — H17).
const DEALS_PER_STAGE = 100;

export async function getPipeline(): Promise<Pipeline | null> {
  const session = await auth();
  if (!session?.user) return null;

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return null;

  const pipeline = await db.pipeline.findFirst({
    where: { organizationId: orgId },
    orderBy: [{ isDefault: "desc" }, { position: "asc" }],
    include: {
      stages: {
        orderBy: { position: "asc" },
        include: {
          deals: {
            where: { status: "OPEN" },
            orderBy: { createdAt: "asc" },
            take: DEALS_PER_STAGE,
            include: {
              owner: { select: { id: true, name: true, email: true } },
              contact: { select: { id: true, firstName: true, lastName: true } },
              company: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  if (!pipeline) {
    if (await crmPermissionError(session, "write")) return null;
    // First login: create a default pipeline with 5 stages
    const created = await crmTransaction(async tx => {
    const existing = await tx.pipeline.findFirst({ where: { organizationId: orgId }, include: { stages: { orderBy: { position: "asc" } } } });
    if (existing) return existing;
    await assertPipelineCapacity(tx, orgId);
    return tx.pipeline.create({
      data: {
        name: "Pipeline Principale",
        organizationId: orgId,
        isDefault: true,
        position: 0,
        stages: {
          create: [
            { name: "Qualificazione", position: 0, probability: 20, rotting: 14 },
            { name: "Contatto",       position: 1, probability: 40, rotting: 10 },
            { name: "Proposta",       position: 2, probability: 60, rotting:  7 },
            { name: "Negoziazione",   position: 3, probability: 80, rotting:  5 },
            { name: "Chiusura",       position: 4, probability: 95, rotting:  3 },
          ],
        },
      },
      include: {
        stages: {
          orderBy: { position: "asc" },
          include: { deals: false },
        },
      },
    });
    });
    return {
      id: created.id,
      name: created.name,
      isDefault: created.isDefault,
      stages: created.stages.map((s) => ({
        id: s.id,
        name: s.name,
        position: s.position,
        probability: s.probability,
        rotting: s.rotting,
        deals: [],
        totalValue: 0,
      })),
    };
  }

  const now = new Date();

  // Accurate count + value sum across ALL open deals per stage (the loaded
  // `deals` array above is capped at DEALS_PER_STAGE).
  const agg = await db.deal.groupBy({
    by: ["stageId"],
    where: { pipelineId: pipeline.id, status: "OPEN" },
    _count: { _all: true },
    _sum: { value: true },
  });
  const aggByStage = new Map(
    agg.map((a) => [a.stageId, { count: a._count._all, sum: Number(a._sum.value ?? 0) }]),
  );

  return {
    id: pipeline.id,
    name: pipeline.name,
    isDefault: pipeline.isDefault,
    stages: pipeline.stages.map((stage) => {
      const deals = stage.deals.map((deal) => ({
        id: deal.id,
        title: deal.title,
        value: Number(deal.value),
        currency: deal.currency,
        status: deal.status,
        expectedClose: deal.expectedClose?.toISOString() ?? null,
        closedAt: deal.closedAt?.toISOString() ?? null,
        lostReason: deal.lostReason ?? null,
        stageId: deal.stageId,
        pipelineId: deal.pipelineId,
        ownerId: deal.ownerId,
        owner: { id: deal.owner.id, name: deal.owner.name, email: deal.owner.email },
        contact: deal.contact
          ? { id: deal.contact.id, firstName: deal.contact.firstName, lastName: deal.contact.lastName ?? null }
          : null,
        company: deal.company ? { id: deal.company.id, name: deal.company.name } : null,
        createdAt: deal.createdAt.toISOString(),
        updatedAt: deal.updatedAt.toISOString(),
        daysInStage: daysBetween(deal.updatedAt, now),
      }));

      const stageAgg = aggByStage.get(stage.id);
      return {
        id: stage.id,
        name: stage.name,
        position: stage.position,
        probability: stage.probability,
        rotting: stage.rotting,
        deals,
        totalValue: stageAgg ? stageAgg.sum : deals.reduce((sum, d) => sum + d.value, 0),
        dealCount: stageAgg ? stageAgg.count : deals.length,
      };
    }),
  };
}

export async function createPipeline(name: string): Promise<{ error: string | null; id?: string }> {
  const session = await auth();
  if ((!session?.user) || (await crmPermissionError(session, "manage"))) return { error: "Non autorizzato" };
  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return { error: "Non autorizzato" };

  if (!name.trim() || name.length > 200) return { error: "Nome pipeline non valido" };
  try {
  const row = await crmTransaction(async tx => {
  const currentCount = await assertPipelineCapacity(tx, orgId);
  return tx.pipeline.create({
    data: {
      name: name.trim(),
      organizationId: orgId,
      position: currentCount,
    },
  });
  });

  revalidatePath("/pipeline");
  return { error: null, id: row.id };
  } catch (error) { return { error: error instanceof Error ? error.message : "Impossibile creare la pipeline" }; }
}

export async function getPipelineOwners() {
  const session = await auth();
  if (!session?.user) return [];

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return [];

  return db.user.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}
