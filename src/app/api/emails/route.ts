import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const dealId = searchParams.get("dealId") ?? undefined;
  const contactId = searchParams.get("contactId") ?? undefined;
  const search = searchParams.get("search") ?? undefined;

  const rows = await db.email.findMany({
    where: {
      organizationId: orgId,
      ...(dealId ? { dealId } : {}),
      ...(contactId ? { contactId } : {}),
      ...(search ? { subject: { contains: search, mode: "insensitive" } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, email: true } },
      deal: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json({ data: rows, error: null });
}
