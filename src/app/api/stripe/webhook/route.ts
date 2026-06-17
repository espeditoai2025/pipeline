import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import type Stripe from "stripe";

export const runtime = "nodejs";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

// "past_due" is kept on PRO as a grace period: Stripe is still retrying the
// payment (dunning). The org is only downgraded when the subscription reaches a
// terminal unpaid/canceled state (handled by subscription.updated/deleted).
const GRACE_STATUSES = new Set<Stripe.Subscription.Status>(["active", "trialing", "past_due"]);

async function handleSubscriptionUpsert(subscription: Stripe.Subscription) {
  const orgId = subscription.metadata?.organizationId;
  if (!orgId) return;

  const isActive = GRACE_STATUSES.has(subscription.status);

  const priceId = subscription.items.data[0]?.price?.id ?? null;

  await db.organization.update({
    where: { id: orgId },
    data: {
      plan: isActive ? "PRO" : "STARTER",
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const orgId = subscription.metadata?.organizationId;
  if (!orgId) return;

  await db.organization.update({
    where: { id: orgId },
    data: {
      plan: "STARTER",
      stripeSubscriptionId: null,
      stripePriceId: null,
      stripeCurrentPeriodEnd: null,
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Idempotency: ignore events we've already processed (Stripe retries deliveries
  // and may deliver out of order). The unique insert acts as a processing lock.
  try {
    await db.processedStripeEvent.create({ data: { id: event.id, type: event.type } });
  } catch {
    // Duplicate event id → already handled. Ack so Stripe stops retrying.
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpsert(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.customer && session.metadata?.organizationId) {
          await db.organization.updateMany({
            where: {
              id: session.metadata.organizationId,
              stripeCustomerId: null,
            },
            data: { stripeCustomerId: session.customer as string },
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
        if (invoice.subscription) {
          const sub = await getStripe().subscriptions.retrieve(invoice.subscription);
          if (sub.status === "past_due" || sub.status === "unpaid") {
            await handleSubscriptionUpsert(sub);
          }
        }
        break;
      }
    }
  } catch (err) {
    console.error("[stripe-webhook] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
