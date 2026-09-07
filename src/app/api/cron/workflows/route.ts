import { NextRequest, NextResponse } from "next/server";
import { enqueueOverdueActivities, processWorkflowQueue } from "@/lib/workflow-engine";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Cron non configurato" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  try {
    const startedAt = Date.now();
    const overdue = await enqueueOverdueActivities(50);
    const processed = await processWorkflowQueue({
      limit: 30,
      budgetMs: Math.max(1, 40_000 - (Date.now() - startedAt)),
    });
    return NextResponse.json({ ok: true, overdue, processed });
  } catch (error) {
    logger.error("workflow-cron", "Esecuzione rimandata; i job rimangono salvati", {
      error: String(error),
    });
    return NextResponse.json({ error: "Esecuzione non completata" }, { status: 500 });
  }
}
