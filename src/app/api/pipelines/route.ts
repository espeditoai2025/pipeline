import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MOCK_PIPELINES } from "@/lib/mock-data";
import type { ApiResponse } from "@/types";
import type { Pipeline } from "@/types/deals";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  // TODO: replace with real DB query after migration
  // const pipelines = await db.pipeline.findMany({ where: { organizationId: session.user.organizationId }, include: { stages: { orderBy: { position: 'asc' } } } });

  const response: ApiResponse<Pipeline[]> = { data: MOCK_PIPELINES, error: null };
  return NextResponse.json(response);
}
