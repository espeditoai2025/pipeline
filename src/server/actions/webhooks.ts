"use server";

import { revalidatePath } from "next/cache";
import { randomBytes, createHmac } from "crypto";
import { z } from "zod";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertPublicUrl } from "@/lib/ssrf";

function getOrgId(s: Session | null) {
  return (s?.user as { organizationId?: string } | undefined)?.organizationId ?? null;
}

const WEBHOOK_EVENTS_LIST = [
  "deal.created",
  "deal.updated",
  "deal.won",
  "deal.lost",
  "deal.stage_changed",
  "deal.deleted",
  "contact.created",
  "contact.updated",
  "contact.deleted",
  "company.created",
  "company.updated",
  "lead.created",
  "lead.converted",
  "activity.created",
  "activity.completed",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS_LIST)[number];

export async function getWebhookEvents(): Promise<readonly string[]> {
  return WEBHOOK_EVENTS_LIST;
}

export type WebhookItem = {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
  deliveryStats: { total: number; success: number; failed: number };
};

// ---------- CRUD ----------

export async function getWebhooks(): Promise<WebhookItem[]> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return [];

  const webhooks = await db.webhook.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    include: {
      deliveries: { select: { success: true }, take: 100, orderBy: { createdAt: "desc" } },
    },
  });

  return webhooks.map((w) => ({
    id: w.id,
    name: w.name,
    url: w.url,
    events: w.events,
    isActive: w.isActive,
    createdAt: w.createdAt.toISOString(),
    deliveryStats: {
      total: w.deliveries.length,
      success: w.deliveries.filter((d) => d.success).length,
      failed: w.deliveries.filter((d) => !d.success).length,
    },
  }));
}

const createSchema = z.object({
  name: z.string().min(1, "Nome obbligatorio"),
  url: z.string().url("URL non valido"),
  events: z.array(z.string()).min(1, "Seleziona almeno un evento"),
});

export async function createWebhook(input: z.infer<typeof createSchema>): Promise<{ data: WebhookItem | null; error: string | null }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { data: null, error: "Non autorizzato" };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  // SSRF guard: only public https endpoints (no internal/metadata IPs).
  try {
    await assertPublicUrl(parsed.data.url);
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "URL non consentito" };
  }

  // Max 10 webhooks per org
  const count = await db.webhook.count({ where: { organizationId: orgId } });
  if (count >= 10) return { data: null, error: "Massimo 10 webhook per organizzazione" };

  const secret = `whsec_${randomBytes(24).toString("hex")}`;

  try {
    const w = await db.webhook.create({
      data: {
        name: parsed.data.name,
        url: parsed.data.url,
        events: parsed.data.events,
        secret,
        organizationId: orgId,
      },
    });

    revalidatePath("/settings");
    return {
      data: {
        id: w.id,
        name: w.name,
        url: w.url,
        events: w.events,
        isActive: w.isActive,
        createdAt: w.createdAt.toISOString(),
        deliveryStats: { total: 0, success: 0, failed: 0 },
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Errore durante la creazione" };
  }
}

export async function updateWebhook(
  id: string,
  input: { name?: string; url?: string; events?: string[]; isActive?: boolean },
): Promise<{ error: string | null }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  // SSRF guard on URL change (updateWebhook previously skipped validation).
  if (input.url !== undefined) {
    try {
      await assertPublicUrl(input.url);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "URL non consentito" };
    }
  }

  try {
    await db.webhook.update({
      where: { id, organizationId: orgId },
      data: {
        name: input.name,
        url: input.url,
        events: input.events,
        isActive: input.isActive,
      },
    });
    revalidatePath("/settings");
    return { error: null };
  } catch {
    return { error: "Errore durante l'aggiornamento" };
  }
}

export async function deleteWebhook(id: string): Promise<{ error: string | null }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  try {
    await db.webhook.delete({ where: { id, organizationId: orgId } });
    revalidatePath("/settings");
    return { error: null };
  } catch {
    return { error: "Errore durante l'eliminazione" };
  }
}

export async function getWebhookSecret(id: string): Promise<{ secret: string | null; error: string | null }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { secret: null, error: "Non autorizzato" };

  const w = await db.webhook.findFirst({ where: { id, organizationId: orgId }, select: { secret: true } });
  if (!w) return { secret: null, error: "Webhook non trovato" };

  return { secret: w.secret, error: null };
}

export async function getWebhookDeliveries(webhookId: string) {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return [];

  const w = await db.webhook.findFirst({ where: { id: webhookId, organizationId: orgId }, select: { id: true } });
  if (!w) return [];

  const deliveries = await db.webhookDelivery.findMany({
    where: { webhookId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return deliveries.map((d) => ({
    id: d.id,
    event: d.event,
    statusCode: d.statusCode,
    success: d.success,
    attempts: d.attempts,
    createdAt: d.createdAt.toISOString(),
  }));
}

// ---------- DISPATCH ----------

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

const MAX_ATTEMPTS = 5;

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
    return { success: false, statusCode: null, response: (e instanceof Error ? e.message : "URL non consentito").slice(0, 1000) };
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
    return { success: false, statusCode: null, response: (e instanceof Error ? e.message : "Errore di connessione").slice(0, 1000) };
  }
}

/**
 * Dispatch a webhook event to all active webhooks for an organization.
 * Attempts delivery once; on failure the delivery row is queued for retry
 * (nextRetryAt) and the cron picks it up with exponential backoff — so a target
 * being briefly down no longer means the event is lost.
 */
export async function dispatchWebhook(orgId: string, event: WebhookEvent, data: Record<string, unknown>) {
  try {
    const webhooks = await db.webhook.findMany({
      where: { organizationId: orgId, isActive: true, events: { has: event } },
    });
    if (webhooks.length === 0) return;

    await Promise.allSettled(
      webhooks.map(async (webhook) => {
        const payload = buildPayload(event, data);
        const result = await attemptDelivery(webhook, event, payload);
        await db.webhookDelivery.create({
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
        }).catch(() => {});
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
    processed++;
    // Webhook deleted/deactivated → stop retrying.
    if (!d.webhook || !d.webhook.isActive) {
      await db.webhookDelivery.update({ where: { id: d.id }, data: { nextRetryAt: null } }).catch(() => {});
      continue;
    }
    const payload = buildPayload(d.event, d.payload);
    const result = await attemptDelivery(d.webhook, d.event, payload);
    const attempts = d.attempts + 1;
    await db.webhookDelivery.update({
      where: { id: d.id },
      data: {
        attempts,
        success: result.success,
        statusCode: result.statusCode,
        response: result.response,
        nextRetryAt: result.success || attempts >= MAX_ATTEMPTS ? null : new Date(Date.now() + backoffMs(attempts)),
      },
    }).catch(() => {});
  }
  return processed;
}

// ---------- TEST ----------

export async function testWebhook(id: string): Promise<{ success: boolean; statusCode: number | null; error: string | null }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { success: false, statusCode: null, error: "Non autorizzato" };

  const webhook = await db.webhook.findFirst({ where: { id, organizationId: orgId } });
  if (!webhook) return { success: false, statusCode: null, error: "Webhook non trovato" };

  const payload = JSON.stringify({
    event: "test",
    data: { message: "Questo è un test da Pipely CRM" },
    timestamp: new Date().toISOString(),
  });

  const signature = signPayload(payload, webhook.secret);

  // SSRF guard before issuing the test request.
  try {
    await assertPublicUrl(webhook.url);
  } catch (e) {
    return { success: false, statusCode: null, error: e instanceof Error ? e.message : "URL non consentito" };
  }

  try {
    const res = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Event": "test",
        "X-Webhook-Id": webhook.id,
      },
      body: payload,
      signal: AbortSignal.timeout(10_000),
      // No redirect following: a 30x would bypass the SSRF check above.
      redirect: "manual",
    });

    await db.webhookDelivery.create({
      data: {
        webhookId: id,
        event: "test",
        payload: { message: "Test webhook" },
        statusCode: res.status,
        response: (await res.text().catch(() => ""))?.slice(0, 500) ?? null,
        success: res.ok,
      },
    }).catch(() => {});

    revalidatePath("/settings");
    return { success: res.ok, statusCode: res.status, error: res.ok ? null : `HTTP ${res.status}` };
  } catch (e) {
    return { success: false, statusCode: null, error: e instanceof Error ? e.message : "Errore di connessione" };
  }
}
