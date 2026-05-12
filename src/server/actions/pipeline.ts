"use server";

import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Pipeline } from "@/types/deals";

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

  if (!pipeline) return null;

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
