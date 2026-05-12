import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MOCK_CONTACTS } from "@/lib/mock-contacts";
import type { ApiResponse } from "@/types";
import type { Contact } from "@/types/contacts";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search")?.toLowerCase();
  const companyId = searchParams.get("companyId");
  const ownerId = searchParams.get("ownerId");

  const filtered = MOCK_CONTACTS.filter((c) => {
    if (search) {
      const fullName = `${c.firstName} ${c.lastName ?? ""}`.toLowerCase();
      if (!fullName.includes(search) && !c.email?.toLowerCase().includes(search)) return false;
    }
    if (companyId && c.companyId !== companyId) return false;
    if (ownerId && c.ownerId !== ownerId) return false;
    return true;
  });

  const response: ApiResponse<Contact[]> = { data: filtered, error: null };
  return NextResponse.json(response);
}
