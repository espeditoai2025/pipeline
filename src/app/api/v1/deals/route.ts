import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { authenticateApiKey, parsePagination, validateOrgForeignKeys } from "@/lib/api-auth";

const createSchema = z.object({
  title: z.string().min(1, "title is required"),
  value: z.number().min(0).default(0),
  currency: z.string().default("EUR"),
  stageId: z.string().min(1, "stageId is required"),
  pipelineId: z.string().min(1, "pipelineId is required"),
  expectedClose: z.string().optional(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  ownerId: z.string().optional(),
});

function serializeDeal(d: any) {
  return {
    id: d.id,
    title: d.title,
    value: Number(d.value),
    currency: d.currency,
    status: d.status,
    stageId: d.stageId,
    pipelineId: d.pipelineId,
    ownerId: d.ownerId,
    contactId: d.contactId ?? null,
    companyId: d.companyId ?? null,
    expectedClose: d.expectedClose?.toISOString() ?? null,
    closedAt: d.closedAt?.toISOString() ?? null,
    lostReason: d.lostReason ?? null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    ...(d.owner && { owner: { id: d.owner.id, name: d.owner.name, email: d.owner.email } }),
    ...(d.contact && { contact: { id: d.contact.id, firstName: d.contact.firstName, lastName: d.contact.lastName ?? null } }),
    ...(d.company && { company: { id: d.company.id, name: d.company.name } }),
    ...(d.stage && { stage: { id: d.stage.id, name: d.stage.name } }),
  };
}

export async function GET(req: NextRequest) {
  const authResult = await authenticateApiKey(req);
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;

  const { page, perPage, skip } = parsePagination(req);
  const search = req.nextUrl.searchParams.get("search") ?? undefined;
  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  const pipelineId = req.nextUrl.searchParams.get("pipeline_id") ?? undefined;

  const where: any = { organizationId };
  if (status) where.status = status.toUpperCase();
  if (pipelineId) where.pipelineId = pipelineId;
  if (search) where.title = { contains: search, mode: "insensitive" };

  const [rows, total] = await Promise.all([
    db.deal.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: perPage,
    }),
    db.deal.count({ where }),
  ]);

  return NextResponse.json({
    data: rows.map(serializeDeal),
    meta: { total, page, per_page: perPage },
  });
}

export async function POST(req: NextRequest) {
  const authResult = await authenticateApiKey(req);
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  // Prevent cross-tenant FK injection: every referenced id must belong to the org.
  const fkError = await validateOrgForeignKeys(organizationId, {
    stageId: parsed.data.stageId,
    pipelineId: parsed.data.pipelineId,
    contactId: parsed.data.contactId,
    companyId: parsed.data.companyId,
    ownerId: parsed.data.ownerId,
  });
  if (fkError) return fkError;

  const { expectedClose, ownerId, ...rest } = parsed.data;

  // If no ownerId, use first org member
  let resolvedOwnerId = ownerId;
  if (!resolvedOwnerId) {
    const firstUser = await db.user.findFirst({ where: { organizationId }, select: { id: true } });
    if (!firstUser) return NextResponse.json({ error: "No users in organization" }, { status: 400 });
    resolvedOwnerId = firstUser.id;
  }

  const deal = await db.deal.create({
    data: {
      ...rest,
      organizationId,
      ownerId: resolvedOwnerId,
      expectedClose: expectedClose ? new Date(expectedClose) : undefined,
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      company: { select: { id: true, name: true } },
      stage: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: serializeDeal(deal) }, { status: 201 });
}
