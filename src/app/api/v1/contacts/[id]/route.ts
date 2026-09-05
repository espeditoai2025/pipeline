import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api-auth";
import { validateCrmReferences } from "@/lib/crm-references";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  firstName: z.string().trim().min(1).max(150).optional(),
  lastName: z.string().nullable().optional(),
  email: z.string().trim().toLowerCase().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  jobTitle: z.string().nullable().optional(),
  companyId: z.string().nullable().optional(),
});

export async function GET(req: NextRequest, { params }: Params) {
  const authResult = await authenticateApiKey(req);
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;
  const { id } = await params;

  const contact = await db.contact.findFirst({
    where: { id, organizationId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      company: { select: { id: true, name: true } },
      deals: { select: { id: true, title: true, value: true, status: true }, take: 20 },
    },
  });

  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  return NextResponse.json({
    data: {
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName ?? null,
      email: contact.email ?? null,
      phone: contact.phone ?? null,
      jobTitle: contact.jobTitle ?? null,
      companyId: contact.companyId ?? null,
      ownerId: contact.ownerId,
      createdAt: contact.createdAt.toISOString(),
      updatedAt: contact.updatedAt.toISOString(),
      owner: contact.owner,
      company: contact.company,
      deals: contact.deals.map((d) => ({ ...d, value: Number(d.value) })),
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

  const existing = await db.contact.findFirst({ where: { id, organizationId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const referenceError = await validateCrmReferences(organizationId, parsed.data);
  if (referenceError) return NextResponse.json({ error: referenceError }, { status: 422 });
  const contact = await db.contact.update({ where: { id, organizationId }, data: parsed.data });

  return NextResponse.json({
    data: {
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName ?? null,
      email: contact.email ?? null,
      phone: contact.phone ?? null,
      updatedAt: contact.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const authResult = await authenticateApiKey(req);
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;
  const { id } = await params;

  const existing = await db.contact.findFirst({ where: { id, organizationId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  await db.contact.delete({ where: { id, organizationId } });
  return NextResponse.json({ data: { id, deleted: true } });
}
