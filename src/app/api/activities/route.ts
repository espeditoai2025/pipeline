import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MOCK_ACTIVITIES } from "@/lib/mock-activities";
import type { ApiResponse } from "@/types";
import type { Activity, ActivityType } from "@/types/activities";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type") as ActivityType | null;
  const completed = searchParams.get("completed");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const dealId = searchParams.get("dealId");
  const contactId = searchParams.get("contactId");

  const filtered = MOCK_ACTIVITIES.filter((a) => {
    if (type && a.type !== type) return false;
    if (completed === "true" && !a.completedAt) return false;
    if (completed === "false" && a.completedAt) return false;
    if (dateFrom && a.dueDate && a.dueDate < dateFrom) return false;
    if (dateTo && a.dueDate && a.dueDate > dateTo) return false;
    if (dealId && a.dealId !== dealId) return false;
    if (contactId && a.contactId !== contactId) return false;
    return true;
  });

  const response: ApiResponse<Activity[]> = { data: filtered, error: null };
  return NextResponse.json(response);
}
