import { createHmac } from "crypto";
import { db } from "@/lib/db";
import { assertPublicUrl } from "@/lib/ssrf";
import type { WebhookEvent } from "@/server/actions/webhooks";

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

const MAX_ATTEMPTS = 5;
/** Quanto resta "presa in carico" una consegna mentre la si sta spedendo: piu' del
 *  timeout della richiesta, cosi' un'altra esecuzione del cron non la rispedisce. */
const LEASE_MS = 5 * 60_000;

/** Exponential backoff for retries: 1,2,4,8,16 minutes, capped at 2h. */
function backoffMs(attempts: number): number {
  const minutes = Math.min(2 ** (attempts - 1), 120);
  return minutes * 60_000;
}

function buildPayload(event: string, data: unknown): string {
  return JSON.stringify({ event, data, timestamp: new Date().toISOString() });
}

type DeliveryResult = { success: boolean; statusCode: number | null; response: string | null };

/** Single delivery attempt (SSRF-guarded). Never throws. */
async function attemptDelivery(
  webhook: { id: string; url: string; secret: string },
  event: string,
  payload: string,
): Promise<DeliveryResult> {
  // Re-validate at send time (defends against DNS rebinding / record changes).
  try {
    await assertPublicUrl(webhook.url);
  } catch (e) {
    return {
      success: false,
      statusCode: null,
      response: (e instanceof Error ? e.message : "URL non consentito").slice(0, 1000),
    };
  }
  try {
    const res = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signPayload(payload, webhook.secret),
        "X-Webhook-Event": event,
        "X-Webhook-Id": webhook.id,
      },
      body: payload,
      signal: AbortSignal.timeout(10_000),
      // No redirect following: a 30x would bypass the SSRF check above
      // (public URL redirecting to an internal/metadata address).
      redirect: "manual",
    });
    const response = (await res.text().catch(() => null))?.slice(0, 1000) ?? null;
    return { success: res.ok, statusCode: res.status, response };
  } catch (e) {
    return {
      success: false,
      statusCode: null,
      response: (e instanceof Error ? e.message : "Errore di connessione").slice(0, 1000),
    };
  }
}

/**
 * Dispatch a webhook event to all active webhooks for an organization.
 * Attempts delivery once; on failure the delivery row is queued for retry
 * (nextRetryAt) and the cron picks it up with exponential backoff — so a target
 * being briefly down no longer means the event is lost.
 */
export async function dispatchWebhook(
  orgId: string,
  event: WebhookEvent,
  data: Record<string, unknown>,
) {
  try {
    const webhooks = await db.webhook.findMany({
      where: { organizationId: orgId, isActive: true, events: { has: event } },
    });
    if (webhooks.length === 0) return;

    await Promise.allSettled(
      webhooks.map(async (webhook) => {
        const payload = buildPayload(event, data);
        const result = await attemptDelivery(webhook, event, payload);
        await db.webhookDelivery
          .create({
            data: {
              webhookId: webhook.id,
              event,
              payload: data as object,
              statusCode: result.statusCode,
              response: result.response,
              success: result.success,
              attempts: 1,
              nextRetryAt: result.success ? null : new Date(Date.now() + backoffMs(1)),
            },
          })
          .catch(() => {});
      }),
    );
  } catch {
    // Webhook dispatch should never break the main flow
  }
}

/**
 * Retries failed webhook deliveries whose nextRetryAt is due. Called by the cron.
 * Uses exponential backoff and gives up after MAX_ATTEMPTS. Returns count processed.
 */
export async function processWebhookRetries(limit = 50): Promise<number> {
  const due = await db.webhookDelivery.findMany({
    where: { success: false, attempts: { lt: MAX_ATTEMPTS }, nextRetryAt: { lte: new Date() } },
    include: { webhook: true },
    orderBy: { nextRetryAt: "asc" },
    take: limit,
  });

  let processed = 0;
  for (const d of due) {
    // Webhook deleted/deactivated → stop retrying.
    if (!d.webhook || !d.webhook.isActive) {
      processed++;
      await db.webhookDelivery
        .update({ where: { id: d.id }, data: { nextRetryAt: null } })
        .catch(() => {});
      continue;
    }
    // Presa in carico atomica prima di spedire. Due cron sovrapposti (backup alle 02:00
    // e process-webhooks ogni 15 minuti) selezionavano le stesse righe e consegnavano
    // l'evento due volte, con il contatore dei tentativi che avanzava di uno solo.
    // La riga viene rivendicata spostando nextRetryAt avanti: chi perde la corsa la salta.
    const attempts = d.attempts + 1;
    const claim = await db.webhookDelivery.updateMany({
      where: { id: d.id, success: false, attempts: d.attempts, nextRetryAt: { lte: new Date() } },
      data: { attempts, nextRetryAt: new Date(Date.now() + LEASE_MS) },
    });
    if (claim.count === 0) continue;
    processed++;
    const payload = buildPayload(d.event, d.payload);
    const result = await attemptDelivery(d.webhook, d.event, payload);
    await db.webhookDelivery
      .update({
        where: { id: d.id },
        data: {
          attempts,
          success: result.success,
          statusCode: result.statusCode,
          response: result.response,
          nextRetryAt:
            result.success || attempts >= MAX_ATTEMPTS
              ? null
              : new Date(Date.now() + backoffMs(attempts)),
        },
      })
      .catch(() => {});
  }
  return processed;
}
