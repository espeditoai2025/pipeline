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

/**
 * Dispatch a webhook event to all active webhooks for an organization.
 * Call this from server actions when CRM events happen.
 * Runs in the background — does not block the caller.
 */
export async function dispatchWebhook(orgId: string, event: WebhookEvent, data: Record<string, unknown>) {
  try {
    const webhooks = await db.webhook.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
        events: { has: event },
      },
    });

    if (webhooks.length === 0) return;

    const payload = JSON.stringify({
      event,
      data,
      timestamp: new Date().toISOString(),
    });

    const deliveries = webhooks.map(async (webhook) => {
      const signature = signPayload(payload, webhook.secret);
      let statusCode: number | null = null;
      let response: string | null = null;
      let success = false;

      // Re-validate at send time (defends against DNS rebinding / record changes
      // after the webhook was created).
      try {
        await assertPublicUrl(webhook.url);
      } catch (e) {
        await db.webhookDelivery.create({
          data: {
            webhookId: webhook.id,
            event,
            payload: data as object,
            statusCode: null,
            response: (e instanceof Error ? e.message : "URL non consentito").slice(0, 1000),
            success: false,
          },
        }).catch(() => {});
        return;
      }

      try {
        const res = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Signature": signature,
            "X-Webhook-Event": event,
            "X-Webhook-Id": webhook.id,
          },
          body: payload,
          signal: AbortSignal.timeout(10_000),
        });

        statusCode = res.status;
        response = await res.text().catch(() => null);
        success = res.ok;
      } catch (e) {
        response = e instanceof Error ? e.message : "Errore di connessione";
      }

      // Log delivery
      await db.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          event,
          payload: data as object,
          statusCode,
          response: response?.slice(0, 1000) ?? null,
          success,
        },
      }).catch(() => {}); // Don't fail if logging fails
    });

    await Promise.allSettled(deliveries);
  } catch {
    // Webhook dispatch should never break the main flow
  }
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
