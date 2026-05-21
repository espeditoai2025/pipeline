import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { authenticateApiKey, parsePagination } from "@/lib/api-auth";

const createSchema = z.object({
  title: z.string().min(1, "title is required"),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  score: z.number().min(0).max(100).default(0),
  data: z.record(z.string(), z.unknown()).optional(),
  ownerId: z.string().optional(),
});

function serialize(l: any) {
  return {
    id: l.id,
    title: l.title,
    email: l.email ?? null,
    phone: l.phone ?? null,
    status: l.status,
    source: l.source ?? null,
    score: l.score,
    notes: l.notes ?? null,
    data: l.data ?? null,
    ownerId: l.ownerId ?? null,
    contactId: l.contactId ?? null,
    convertedDealId: l.convertedDealId ?? null,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
    ...(l.owner && { owner: { id: l.owner.id, name: l.owner.name, email: l.owner.email } }),
  };
}

export async function GET(req: NextRequest) {
  const authResult = await authenticateApiKey(req);
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;

  const { page, perPage, skip } = parsePagination(req);
  const search = req.nextUrl.searchParams.get("search") ?? undefined;
  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  const source = req.nextUrl.searchParams.get("source") ?? undefined;

  const where: any = { organizationId };
  if (status) where.status = status.toUpperCase();
  if (source) where.source = source.toUpperCase();
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    db.lead.findMany({
      where,
      include: { owner: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: perPage,
    }),
    db.lead.count({ where }),
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

  const { ownerId, data, ...rest } = parsed.data;

  const lead = await db.lead.create({
    data: {
      ...rest,
      data: (data as any) ?? undefined,
      organizationId,
      ownerId: ownerId ?? null,
    },
    include: { owner: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ data: serialize(lead) }, { status: 201 });
}
