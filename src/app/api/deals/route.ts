import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ApiResponse } from "@/types";
import type { Deal } from "@/types/deals";

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

function getOrgId(session: Awaited<ReturnType<typeof auth>>) {
  return (session?.user as { organizationId?: string } | undefined)?.organizationId ?? null;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const orgId = getOrgId(session);
  if (!orgId) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const pipelineId = searchParams.get("pipelineId") ?? undefined;
  const ownerId = searchParams.get("ownerId") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const minValue = searchParams.get("minValue") ? Number(searchParams.get("minValue")) : undefined;
  const maxValue = searchParams.get("maxValue") ? Number(searchParams.get("maxValue")) : undefined;

  const rows = await db.deal.findMany({
    where: {
      organizationId: orgId,
      status: "OPEN",
      ...(pipelineId && { pipelineId }),
      ...(ownerId && { ownerId }),
      ...(search && { title: { contains: search, mode: "insensitive" } }),
      ...(minValue !== undefined && { value: { gte: minValue } }),
      ...(maxValue !== undefined && { value: { lte: maxValue } }),
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      company: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const now = new Date();
  const deals: Deal[] = rows.map((d) => ({
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

  const response: ApiResponse<Deal[]> = { data: deals, error: null };
  return NextResponse.json(response);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const orgId = getOrgId(session);
  const ownerId = session.user?.id;
  if (!orgId || !ownerId) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const body: unknown = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dati non validi" }, { status: 422 });

  const { expectedClose, ...rest } = parsed.data;

  const created = await db.deal.create({
    data: {
      ...rest,
      organizationId: orgId,
      ownerId,
      expectedClose: expectedClose ? new Date(expectedClose) : undefined,
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      company: { select: { id: true, name: true } },
    },
  });

  const now = new Date();
  const deal: Deal = {
    id: created.id,
    title: created.title,
    value: Number(created.value),
    currency: created.currency,
    status: created.status,
    expectedClose: created.expectedClose?.toISOString() ?? null,
    closedAt: created.closedAt?.toISOString() ?? null,
    lostReason: created.lostReason ?? null,
    stageId: created.stageId,
    pipelineId: created.pipelineId,
    ownerId: created.ownerId,
    owner: { id: created.owner.id, name: created.owner.name, email: created.owner.email },
    contact: created.contact
      ? { id: created.contact.id, firstName: created.contact.firstName, lastName: created.contact.lastName ?? null }
      : null,
    company: created.company ? { id: created.company.id, name: created.company.name } : null,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
    daysInStage: Math.floor((now.getTime() - created.updatedAt.getTime()) / 86_400_000),
  };

  return NextResponse.json({ data: deal, error: null }, { status: 201 });
}
