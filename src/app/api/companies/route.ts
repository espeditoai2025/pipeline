import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MOCK_COMPANIES } from "@/lib/mock-contacts";
import type { ApiResponse } from "@/types";
import type { Company } from "@/types/contacts";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search")?.toLowerCase();
  const industry = searchParams.get("industry");

  const filtered = MOCK_COMPANIES.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search)) return false;
    if (industry && c.industry !== industry) return false;
    return true;
  });

  const response: ApiResponse<Company[]> = { data: filtered, error: null };
  return NextResponse.json(response);
}
