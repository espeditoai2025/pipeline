import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { authenticateApiKey, parsePagination, validateOrgForeignKeys } from "@/lib/api-auth";
import { getOrgPlan, checkContactLimit } from "@/lib/plan";

const createSchema = z.object({
  firstName: z.string().min(1, "firstName is required"),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  companyId: z.string().optional(),
  ownerId: z.string().optional(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serialize(c: any) {
  return {
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName ?? null,
    email: c.email ?? null,
    phone: c.phone ?? null,
    jobTitle: c.jobTitle ?? null,
    companyId: c.companyId ?? null,
    ownerId: c.ownerId,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    ...(c.owner && { owner: { id: c.owner.id, name: c.owner.name, email: c.owner.email } }),
    ...(c.company && { company: { id: c.company.id, name: c.company.name } }),
    ...(c._count && { dealsCount: c._count.deals }),
  };
}

export async function GET(req: NextRequest) {
  const authResult = await authenticateApiKey(req);
  if (authResult instanceof NextResponse) return authResult;
  const { organizationId } = authResult;

  const { page, perPage, skip } = parsePagination(req);
  const search = req.nextUrl.searchParams.get("search") ?? undefined;
  const companyId = req.nextUrl.searchParams.get("company_id") ?? undefined;

  const where = {
    organizationId,
    ...(companyId && { companyId }),
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: "insensitive" as const } },
        { lastName: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [rows, total] = await Promise.all([
    db.contact.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        company: { select: { id: true, name: true } },
        _count: { select: { deals: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: perPage,
    }),
    db.contact.count({ where }),
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

  // Plan gating: enforce contact limit (same leva di monetizzazione delle action interne).
  const plan = await getOrgPlan(organizationId);
  const currentCount = await db.contact.count({ where: { organizationId } });
  const limitError = checkContactLimit(plan, currentCount);
  if (limitError) return NextResponse.json({ error: limitError }, { status: 402 });

  // Prevent cross-tenant FK injection (companyId/ownerId must belong to the org).
  const fkError = await validateOrgForeignKeys(organizationId, {
    companyId: parsed.data.companyId,
    ownerId: parsed.data.ownerId,
  });
  if (fkError) return fkError;

  const { ownerId, ...rest } = parsed.data;
  let resolvedOwnerId = ownerId;
  if (!resolvedOwnerId) {
    const firstUser = await db.user.findFirst({ where: { organizationId }, select: { id: true } });
    if (!firstUser) return NextResponse.json({ error: "No users in organization" }, { status: 400 });
    resolvedOwnerId = firstUser.id;
  }

  const contact = await db.contact.create({
    data: { ...rest, organizationId, ownerId: resolvedOwnerId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      company: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: serialize(contact) }, { status: 201 });
}
