/**
 * Cron (ogni 15 min): retry failed webhook deliveries with exponential backoff
 * + invio delle campagne email programmate scadute.
 * Protected by CRON_SECRET (fail-closed). Schedule in vercel.json.
 */
import { NextRequest, NextResponse } from "next/server";
import { processWebhookRetries } from "@/server/actions/webhooks";
import { processDueCampaigns } from "@/lib/campaign-sender";
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
    // Campagne programmate: un fallimento qui non deve bloccare i retry webhook.
    // Limite basso per restare nel budget maxDuration=60s del cron.
    const campaignsSent = await processDueCampaigns(3).catch((err) => {
      logger.error("cron-webhooks", "Errore invio campagne programmate", { error: String(err) });
      return 0;
    });
    return NextResponse.json({ ok: true, processed, campaignsSent });
  } catch (err) {
    logger.error("cron-webhooks", "Errore nel retry webhook", { error: String(err) });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
