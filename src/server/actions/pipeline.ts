"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Pipeline } from "@/types/deals";
import { getOrgPlan, checkPipelineLimit } from "@/lib/plan";

function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

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
    // First login: create a default pipeline with 5 stages
    const created = await db.pipeline.create({
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

      return {
        id: stage.id,
        name: stage.name,
        position: stage.position,
        probability: stage.probability,
        rotting: stage.rotting,
        deals,
        totalValue: deals.reduce((sum, d) => sum + d.value, 0),
      };
    }),
  };
}

export async function createPipeline(name: string): Promise<{ error: string | null; id?: string }> {
  const session = await auth();
  if (!session?.user) return { error: "Non autorizzato" };
  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return { error: "Non autorizzato" };

  const plan = await getOrgPlan(orgId);
  const currentCount = await db.pipeline.count({ where: { organizationId: orgId } });
  const limitError = checkPipelineLimit(plan, currentCount);
  if (limitError) return { error: limitError };

  const row = await db.pipeline.create({
    data: {
      name,
      organizationId: orgId,
      position: currentCount,
    },
  });

  revalidatePath("/pipeline");
  return { error: null, id: row.id };
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
