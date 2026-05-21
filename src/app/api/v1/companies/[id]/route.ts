import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  website: z.string().url().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
});

export async function GET(req: NextRequest, { params }: Params) {
  const authResult = await authenticateApiKey(req);
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;
  const { id } = await params;

  const company = await db.company.findFirst({
    where: { id, organizationId },
    include: {
      contacts: { select: { id: true, firstName: true, lastName: true, email: true }, take: 50 },
      _count: { select: { contacts: true, deals: true } },
    },
  });

  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  return NextResponse.json({
    data: {
      id: company.id,
      name: company.name,
      website: company.website ?? null,
      phone: company.phone ?? null,
      email: company.email ?? null,
      address: company.address ?? null,
      city: company.city ?? null,
      industry: company.industry ?? null,
      createdAt: company.createdAt.toISOString(),
      updatedAt: company.updatedAt.toISOString(),
      contactsCount: company._count.contacts,
      dealsCount: company._count.deals,
      contacts: company.contacts.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName ?? null,
        email: c.email ?? null,
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

  const existing = await db.company.findFirst({ where: { id, organizationId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const company = await db.company.update({ where: { id }, data: parsed.data });

  return NextResponse.json({
    data: {
      id: company.id,
      name: company.name,
      updatedAt: company.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const authResult = await authenticateApiKey(req);
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;
  const { id } = await params;

  const existing = await db.company.findFirst({ where: { id, organizationId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  await db.company.delete({ where: { id } });
  return NextResponse.json({ data: { id, deleted: true } });
}
