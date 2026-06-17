/**
 * Cron: retry failed webhook deliveries with exponential backoff.
 * Protected by CRON_SECRET (fail-closed). Schedule in vercel.json.
 */
import { NextRequest, NextResponse } from "next/server";
import { processWebhookRetries } from "@/server/actions/webhooks";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!secret) {
    logger.error("cron-webhooks", "CRON_SECRET non configurato: endpoint disabilitato");
    return NextResponse.json({ error: "Cron non configurato" }, { status: 503 });
  }
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const processed = await processWebhookRetries(100);
    return NextResponse.json({ ok: true, processed });
  } catch (err) {
    logger.error("cron-webhooks", "Errore nel retry webhook", { error: String(err) });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
