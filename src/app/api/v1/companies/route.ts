import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { authenticateApiKey, parsePagination } from "@/lib/api-auth";

const createSchema = z.object({
  name: z.string().min(1, "name is required"),
  website: z.string().url().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  industry: z.string().optional(),
});

function serialize(c: any) {
  return {
    id: c.id,
    name: c.name,
    website: c.website ?? null,
    phone: c.phone ?? null,
    email: c.email ?? null,
    address: c.address ?? null,
    city: c.city ?? null,
    industry: c.industry ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    ...(c._count && { contactsCount: c._count.contacts, dealsCount: c._count.deals }),
  };
}

export async function GET(req: NextRequest) {
  const authResult = await authenticateApiKey(req);
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;

  const { page, perPage, skip } = parsePagination(req);
  const search = req.nextUrl.searchParams.get("search") ?? undefined;

  const where = {
    organizationId,
    ...(search && { name: { contains: search, mode: "insensitive" as const } }),
  };

  const [rows, total] = await Promise.all([
    db.company.findMany({
      where,
      include: { _count: { select: { contacts: true, deals: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: perPage,
    }),
    db.company.count({ where }),
  ]);

  return NextResponse.json({
    data: rows.map(serialize),
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

  const company = await db.company.create({
    data: { ...parsed.data, organizationId },
  });

  return NextResponse.json({ data: serialize(company) }, { status: 201 });
}
