import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MOCK_EMAIL_THREADS } from "@/lib/mock-emails";
import type { ApiResponse } from "@/types";
import type { EmailThread } from "@/types/emails";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const dealId = searchParams.get("dealId");
  const contactId = searchParams.get("contactId");
  const search = searchParams.get("search")?.toLowerCase();

  const filtered = MOCK_EMAIL_THREADS.filter((t) => {
    if (dealId && t.dealId !== dealId) return false;
    if (contactId && t.contactId !== contactId) return false;
    if (search && !t.subject.toLowerCase().includes(search)) return false;
    return true;
  });

  const response: ApiResponse<EmailThread[]> = { data: filtered, error: null };
  return NextResponse.json(response);
}
