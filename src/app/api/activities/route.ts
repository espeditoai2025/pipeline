import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type") ?? undefined;
  const completed = searchParams.get("completed");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const dealId = searchParams.get("dealId") ?? undefined;
  const contactId = searchParams.get("contactId") ?? undefined;

  const rows = await db.activity.findMany({
    where: {
      organizationId: orgId,
      ...(type ? { type: type as never } : {}),
      ...(completed === "true" ? { completedAt: { not: null } } : {}),
      ...(completed === "false" ? { completedAt: null } : {}),
      ...(dealId ? { dealId } : {}),
      ...(contactId ? { contactId } : {}),
      ...(dateFrom || dateTo
        ? {
            dueDate: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
    },
    orderBy: { dueDate: "asc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      deal: { select: { id: true, title: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return NextResponse.json({ data: rows, error: null });
}
