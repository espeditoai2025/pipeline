import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import type Stripe from "stripe";

export const runtime = "nodejs";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

async function handleSubscriptionUpsert(subscription: Stripe.Subscription) {
  const orgId = subscription.metadata?.organizationId;
  if (!orgId) return;

  const isActive = subscription.status === "active" || subscription.status === "trialing";

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
