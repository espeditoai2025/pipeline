import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api-auth";
import { validateCrmReferences } from "@/lib/crm-references";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  value: z.number().min(0).optional(),
  stageId: z.string().min(1).optional(),
  status: z.enum(["OPEN", "WON", "LOST"]).optional(),
  expectedClose: z.string().date().or(z.string().datetime({ offset: true })).nullable().optional(),
  contactId: z.string().nullable().optional(),
  companyId: z.string().nullable().optional(),
  lostReason: z.string().nullable().optional(),
});

export async function GET(req: NextRequest, { params }: Params) {
  const authResult = await authenticateApiKey(req);
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;
  const { id } = await params;

  const deal = await db.deal.findFirst({
    where: { id, organizationId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      company: { select: { id: true, name: true } },
      stage: { select: { id: true, name: true } },
      products: { include: { product: { select: { id: true, name: true, code: true, unit: true } } } },
    },
  });

  if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });

  return NextResponse.json({
    data: {
      id: deal.id,
      title: deal.title,
      value: Number(deal.value),
      currency: deal.currency,
      status: deal.status,
      stageId: deal.stageId,
      pipelineId: deal.pipelineId,
      ownerId: deal.ownerId,
      contactId: deal.contactId ?? null,
      companyId: deal.companyId ?? null,
      expectedClose: deal.expectedClose?.toISOString() ?? null,
      closedAt: deal.closedAt?.toISOString() ?? null,
      lostReason: deal.lostReason ?? null,
      createdAt: deal.createdAt.toISOString(),
      updatedAt: deal.updatedAt.toISOString(),
      owner: deal.owner,
      contact: deal.contact,
      company: deal.company,
      stage: deal.stage,
      products: deal.products.map((p) => ({
        id: p.id,
        productId: p.productId,
        productName: p.product.name,
        productCode: p.product.code,
        quantity: p.quantity,
        unitPrice: Number(p.unitPrice),
        discount: Number(p.discount),
      })),
    },
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const authResult = await authenticateApiKey(req);
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;
  const { id } = await params;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const existing = await db.deal.findFirst({ where: { id, organizationId, status: { not: "DELETED" } }, select: { id: true, status: true, pipelineId: true } });
  if (!existing) return NextResponse.json({ error: "Deal not found" }, { status: 404 });

  const { expectedClose, status, ...rest } = parsed.data;
  const referenceError = await validateCrmReferences(organizationId, { ...rest, pipelineId: rest.stageId ? existing.pipelineId : undefined });
  if (referenceError) return NextResponse.json({ error: referenceError }, { status: 422 });
  const statusChanged = status !== undefined && status !== existing.status;
  const deal = await db.deal.update({
    where: { id, organizationId, status: existing.status },
    data: {
      ...rest,
      ...(status && { status }),
      ...(statusChanged && { closedAt: status === "OPEN" ? null : new Date() }),
      ...(statusChanged && status !== "LOST" ? { lostReason: null } : {}),
      ...(expectedClose !== undefined && { expectedClose: expectedClose ? new Date(expectedClose) : null }),
    },
  });

  return NextResponse.json({
    data: {
      id: deal.id,
      title: deal.title,
      value: Number(deal.value),
      currency: deal.currency,
      status: deal.status,
      stageId: deal.stageId,
      updatedAt: deal.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const authResult = await authenticateApiKey(req);
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;
  const { id } = await params;

  const existing = await db.deal.findFirst({ where: { id, organizationId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Deal not found" }, { status: 404 });

  await db.deal.update({ where: { id, organizationId }, data: { status: "DELETED" } });
  return NextResponse.json({ data: { id, deleted: true } });
}
