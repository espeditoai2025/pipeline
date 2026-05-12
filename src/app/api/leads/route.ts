import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MOCK_LEADS } from "@/lib/mock-contacts";
import type { ApiResponse } from "@/types";
import type { Lead, LeadStatus } from "@/types/contacts";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search")?.toLowerCase();
  const status = searchParams.get("status") as LeadStatus | null;
  const source = searchParams.get("source");

  const filtered = MOCK_LEADS.filter((l) => {
    if (search && !l.title.toLowerCase().includes(search)) return false;
    if (status && l.status !== status) return false;
    if (source && l.source !== source) return false;
    return true;
  });

  const response: ApiResponse<Lead[]> = { data: filtered, error: null };
  return NextResponse.json(response);
}
