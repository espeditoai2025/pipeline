import { NextRequest, NextResponse } from "next/server";
import { getStripe, STRIPE_PRO_PRICE_ID } from "@/lib/stripe";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { logger } from "@/lib/logger";
import type Stripe from "stripe";

export const runtime = "nodejs";
export const maxDuration = 60;
const ACTIVE = new Set<Stripe.Subscription.Status>(["active", "trialing", "past_due"]);

async function applySubscription(tx: Prisma.TransactionClient, event: Stripe.Event) {
  let incoming: Stripe.Subscription;
  if (event.type.startsWith("customer.subscription."))
    incoming = event.data.object as Stripe.Subscription;
  else if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const value = invoice.parent?.subscription_details?.subscription;
    if (!value) return;
    incoming = await getStripe().subscriptions.retrieve(
      typeof value === "string" ? value : value.id,
    );
  } else return;
  const orgId = incoming.metadata?.organizationId;
  if (!orgId) return;
  // Serialize deliveries per organization, then retrieve CURRENT Stripe state while holding the lock.
  await tx.$queryRaw(Prisma.sql`SELECT id FROM "Organization" WHERE id = ${orgId} FOR UPDATE`);
  const org = await tx.organization.findUnique({ where: { id: orgId } });
  if (!org) return;
  if (event.type === "customer.subscription.deleted" && org.stripeSubscriptionId !== incoming.id)
    return;
  const subscription = await getStripe().subscriptions.retrieve(incoming.id);
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  if (org.stripeCustomerId !== customerId)
    throw new Error("Customer Stripe non associato all'organizzazione");
  if (org.stripeSubscriptionId && org.stripeSubscriptionId !== subscription.id) {
    const current = await getStripe().subscriptions.retrieve(org.stripeSubscriptionId);
    if (ACTIVE.has(current.status) || !ACTIVE.has(subscription.status)) return;
  }
  const isActive = ACTIVE.has(subscription.status);
  const item = subscription.items.data.find((i) => i.price.id === STRIPE_PRO_PRICE_ID);
  if (isActive && (!STRIPE_PRO_PRICE_ID || !item))
    throw new Error("Prezzo Stripe non riconosciuto: verifica la configurazione Pro");
  const canceled =
    subscription.status === "canceled" || subscription.status === "incomplete_expired";
  if (canceled && org.stripeSubscriptionId !== subscription.id) return;
  await tx.organization.update({
    where: { id: orgId },
    data: {
      plan: isActive ? (org.plan === "ENTERPRISE" ? "ENTERPRISE" : "PRO") : "STARTER",
      stripeSubscriptionId: canceled ? null : subscription.id,
      stripePriceId: canceled ? null : (item?.price.id ?? null),
      stripeCurrentPeriodEnd:
        canceled || !item?.current_period_end ? null : new Date(item.current_period_end * 1000),
    },
  });
  if (!isActive) {
    await tx.workflow.updateMany({ where: { organizationId: orgId }, data: { isActive: false } });
    await tx.workflowQueue.updateMany({
      where: { orgId, status: { in: ["PENDING", "PAUSED"] } },
      data: {
        status: "SUSPENDED",
        error: "Piano non abilitato. Riattiva il workflow e riprendi esplicitamente l'esecuzione.",
      },
    });
  }
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook non configurato" }, { status: 503 });
  if (!sig) return NextResponse.json({ error: "Firma mancante" }, { status: 400 });
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await req.text(), sig, secret);
  } catch {
    return NextResponse.json({ error: "Firma non valida" }, { status: 400 });
  }
  try {
    const duplicate = await db.$transaction(
      async (tx) => {
        if (await tx.processedStripeEvent.findUnique({ where: { id: event.id } })) return true;
        await applySubscription(tx, event);
        // Completed marker commits with the plan change. Failure rolls both back.
        await tx.processedStripeEvent.create({ data: { id: event.id, type: event.type } });
        return false;
      },
      { timeout: 30000 },
    );
    return NextResponse.json({ received: true, ...(duplicate ? { duplicate: true } : {}) });
  } catch (error) {
    if ((error as { code?: string })?.code === "P2002") {
      try {
        if (await db.processedStripeEvent.findUnique({ where: { id: event.id } }))
          return NextResponse.json({ received: true, duplicate: true });
      } catch {
        /* A database outage must remain retryable. */
      }
    }
    logger.error("stripe-webhook", "Evento non completato: Stripe deve ritentare", {
      eventId: event.id,
      error: String(error),
    });
    return NextResponse.json({ error: "Evento non completato" }, { status: 500 });
  }
}
