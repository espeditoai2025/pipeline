import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStripe, STRIPE_PRO_PRICE_ID, APP_URL } from "@/lib/stripe";
import { assertBillingOwner } from "@/lib/billing-auth";

export async function POST() {
  const session = await auth();

  // Solo l'OWNER può attivare/cambiare l'abbonamento.
  const guard = await assertBillingOwner(session);
  if ("error" in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { orgId } = guard;

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, stripeCustomerId: true, stripeSubscriptionId: true },
  });

  if (!org) return NextResponse.json({ error: "Organizzazione non trovata" }, { status: 404 });

  if (org.stripeSubscriptionId) {
    return NextResponse.json({ error: "Abbonamento già attivo" }, { status: 400 });
  }

  let customerId = org.stripeCustomerId;
  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: session?.user?.email ?? undefined,
      name: org.name,
      metadata: { organizationId: org.id },
    });
    customerId = customer.id;
    await db.organization.update({
      where: { id: org.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const checkoutSession = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: STRIPE_PRO_PRICE_ID, quantity: 1 }],
    success_url: `${APP_URL}/dashboard?upgraded=1`,
    cancel_url: `${APP_URL}/billing`,
    metadata: { organizationId: org.id },
    subscription_data: {
      metadata: { organizationId: org.id },
    },
    allow_promotion_codes: true,
    locale: "it",
  });

  return NextResponse.json({ url: checkoutSession.url });
}
