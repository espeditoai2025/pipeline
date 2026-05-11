import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { MOCK_PIPELINE } from "@/lib/mock-data";
import type { ApiResponse } from "@/types";
import type { Deal } from "@/types/deals";

const createSchema = z.object({
  title: z.string().min(1),
  value: z.number().min(0),
  currency: z.string().default("EUR"),
  stageId: z.string(),
  pipelineId: z.string(),
  expectedClose: z.string().optional(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const pipelineId = searchParams.get("pipelineId") ?? MOCK_PIPELINE.id;
  const ownerId = searchParams.get("ownerId");
  const search = searchParams.get("search")?.toLowerCase();
  const minValue = searchParams.get("minValue") ? Number(searchParams.get("minValue")) : undefined;
  const maxValue = searchParams.get("maxValue") ? Number(searchParams.get("maxValue")) : undefined;

  // TODO: real DB query
  const allDeals = MOCK_PIPELINE.id === pipelineId
    ? MOCK_PIPELINE.stages.flatMap((s) => s.deals)
    : [];

  const filtered = allDeals.filter((d) => {
    if (ownerId && d.ownerId !== ownerId) return false;
    if (search && !d.title.toLowerCase().includes(search)) return false;
    if (minValue !== undefined && d.value < minValue) return false;
    if (maxValue !== undefined && d.value > maxValue) return false;
    return true;
  });

  const response: ApiResponse<Deal[]> = { data: filtered, error: null };
  return NextResponse.json(response);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const body: unknown = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dati non validi" }, { status: 422 });

  // TODO: real DB insert
  const userId = session.user?.id ?? "";
  const newDeal: Deal = {
    id: `deal-${Date.now()}`,
    ...parsed.data,
    value: parsed.data.value,
    status: "OPEN",
    expectedClose: parsed.data.expectedClose ?? null,
    closedAt: null,
    lostReason: null,
    ownerId: userId,
    owner: { id: userId, name: session.user?.name ?? null, email: session.user?.email ?? "" },
    contact: null,
    company: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    daysInStage: 0,
  };

  return NextResponse.json({ data: newDeal, error: null }, { status: 201 });
}
