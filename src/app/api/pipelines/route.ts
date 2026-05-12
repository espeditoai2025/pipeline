import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";
import type { Pipeline } from "@/types/deals";

function getOrgId(session: Awaited<ReturnType<typeof auth>>) {
  return (session?.user as { organizationId?: string } | undefined)?.organizationId ?? null;
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const orgId = getOrgId(session);
  if (!orgId) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const rows = await db.pipeline.findMany({
    where: { organizationId: orgId },
    orderBy: [{ isDefault: "desc" }, { position: "asc" }],
    include: {
      stages: {
        orderBy: { position: "asc" },
        include: {
          deals: {
            where: { status: "OPEN" },
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

  const now = new Date();
  const pipelines: Pipeline[] = rows.map((p) => ({
    id: p.id,
    name: p.name,
    isDefault: p.isDefault,
    stages: p.stages.map((stage) => {
      const deals = stage.deals.map((d) => ({
        id: d.id,
        title: d.title,
        value: Number(d.value),
        currency: d.currency,
        status: d.status,
        expectedClose: d.expectedClose?.toISOString() ?? null,
        closedAt: d.closedAt?.toISOString() ?? null,
        lostReason: d.lostReason ?? null,
        stageId: d.stageId,
        pipelineId: d.pipelineId,
        ownerId: d.ownerId,
        owner: { id: d.owner.id, name: d.owner.name, email: d.owner.email },
        contact: d.contact
          ? { id: d.contact.id, firstName: d.contact.firstName, lastName: d.contact.lastName ?? null }
          : null,
        company: d.company ? { id: d.company.id, name: d.company.name } : null,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
        daysInStage: Math.floor((now.getTime() - d.updatedAt.getTime()) / 86_400_000),
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
  }));

  const response: ApiResponse<Pipeline[]> = { data: pipelines, error: null };
  return NextResponse.json(response);
}
