import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  status: z.enum(["NEW", "WORKING", "NURTURING", "CONVERTED", "DISQUALIFIED"]).optional(),
  source: z.string().nullable().optional(),
  score: z.number().min(0).max(100).optional(),
  notes: z.string().nullable().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(req: NextRequest, { params }: Params) {
  const authResult = await authenticateApiKey(req);
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;
  const { id } = await params;

  const lead = await db.lead.findFirst({
    where: { id, organizationId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      contact: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  return NextResponse.json({
    data: {
      id: lead.id,
      title: lead.title,
      email: lead.email ?? null,
      phone: lead.phone ?? null,
      status: lead.status,
      source: lead.source ?? null,
      score: lead.score,
      notes: lead.notes ?? null,
      data: lead.data ?? null,
      ownerId: lead.ownerId ?? null,
      contactId: lead.contactId ?? null,
      convertedDealId: lead.convertedDealId ?? null,
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
      owner: lead.owner,
      contact: lead.contact,
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

  const existing = await db.lead.findFirst({ where: { id, organizationId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const updateData: Record<string, unknown> = {};
  const d = parsed.data;
  if (d.title !== undefined) updateData.title = d.title;
  if (d.email !== undefined) updateData.email = d.email;
  if (d.phone !== undefined) updateData.phone = d.phone;
  if (d.status !== undefined) updateData.status = d.status;
  if (d.source !== undefined) updateData.source = d.source;
  if (d.score !== undefined) updateData.score = d.score;
  if (d.notes !== undefined) updateData.notes = d.notes;
  if (d.data !== undefined) updateData.data = d.data;

  const lead = await db.lead.update({
    where: { id },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: updateData as any,
  });

  return NextResponse.json({
    data: {
      id: lead.id,
      title: lead.title,
      status: lead.status,
      score: lead.score,
      updatedAt: lead.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const authResult = await authenticateApiKey(req);
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;
  const { id } = await params;

  const existing = await db.lead.findFirst({ where: { id, organizationId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  await db.lead.delete({ where: { id } });
  return NextResponse.json({ data: { id, deleted: true } });
}
