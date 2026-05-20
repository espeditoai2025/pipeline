import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search")?.toLowerCase();
  const status = searchParams.get("status") ?? undefined;
  const source = searchParams.get("source") ?? undefined;

  const rows = await db.lead.findMany({
    where: {
      organizationId: orgId,
      ...(status ? { status: status as never } : {}),
      ...(source ? { source } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ data: rows, error: null });
}
