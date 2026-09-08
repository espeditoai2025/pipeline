import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { getStripe, STRIPE_PRO_PRICE_ID, APP_URL } from "@/lib/stripe";
import { assertBillingOwner } from "@/lib/billing-auth";
import { getTier, PRO_PRICING } from "@/lib/plan-client";
import { logger } from "@/lib/logger";

export const maxDuration = 60;
export async function POST() {
  const session = await auth();
  const guard = await assertBillingOwner(session);
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });
  if (!STRIPE_PRO_PRICE_ID || !process.env.STRIPE_SECRET_KEY)
    return NextResponse.json(
      { error: "Pagamenti non configurati. Contatta il supporto." },
      { status: 503 },
    );
  try {
    const stripe = getStripe();
    const price = await stripe.prices.retrieve(STRIPE_PRO_PRICE_ID);
    if (
      !price.active ||
      price.currency !== PRO_PRICING.currency ||
      price.unit_amount !== PRO_PRICING.cents ||
      price.recurring?.interval !== PRO_PRICING.interval ||
      price.recurring.interval_count !== 1 ||
      price.recurring.usage_type !== "licensed"
    ) {
      return NextResponse.json(
        {
          error: "Il prezzo configurato non corrisponde al piano pubblicato. Contatta il supporto.",
        },
        { status: 503 },
      );
    }
    // Il lock sulla riga Organization copre anche le chiamate a Stripe, e questo è voluto: serve
    // a impedire che due richieste concorrenti scrivano due sessioni di checkout diverse sulla
    // stessa organizzazione. La duplicazione lato Stripe è già esclusa dalle chiavi di idempotenza
    // qui sotto, e la durata del lock è limitata dal timeout di 8 secondi del client Stripe
    // (src/lib/stripe.ts) e dal timeout della transazione: nel caso peggiore l'organizzazione
    // resta bloccata per la durata di un checkout, non indefinitamente.
    const result = await db.$transaction(
      async (tx) => {
        await tx.$queryRaw(
          Prisma.sql`SELECT id FROM "Organization" WHERE id = ${guard.orgId} FOR UPDATE`,
        );
        const org = await tx.organization.findUnique({ where: { id: guard.orgId } });
        if (!org) return { error: "Organizzazione non trovata", status: 404 };
        if (org.stripeSubscriptionId || getTier(org.plan) !== "starter")
          return {
            error: "Piano già attivo. Usa la gestione abbonamento o contatta il supporto.",
            status: 409,
          };
        if (org.stripeCheckoutSessionId) {
          const previous = await stripe.checkout.sessions.retrieve(org.stripeCheckoutSessionId);
          if (previous.status === "open" && previous.url) return { url: previous.url };
          if (previous.status === "complete") {
            const subscriptionId =
              typeof previous.subscription === "string"
                ? previous.subscription
                : previous.subscription?.id;
            const subscription = subscriptionId
              ? await stripe.subscriptions.retrieve(subscriptionId)
              : null;
            if (!subscription || !["canceled", "incomplete_expired"].includes(subscription.status))
              return {
                error:
                  "Pagamento ricevuto: l’attivazione del piano è in elaborazione. Ricarica tra poco.",
                status: 409,
              };
          }
        }
        let customerId = org.stripeCustomerId;
        if (!customerId) {
          const customer = await stripe.customers.create(
            {
              email: session?.user?.email ?? undefined,
              name: org.name,
              metadata: { organizationId: org.id },
            },
            { idempotencyKey: `pipely-customer-${org.id}` },
          );
          customerId = customer.id;
        }
        const checkout = await stripe.checkout.sessions.create(
          {
            customer: customerId,
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [{ price: STRIPE_PRO_PRICE_ID, quantity: 1 }],
            success_url: `${APP_URL}/billing?upgraded=1`,
            cancel_url: `${APP_URL}/billing`,
            metadata: { organizationId: org.id },
            subscription_data: { metadata: { organizationId: org.id } },
            allow_promotion_codes: true,
            locale: "it",
          },
          { idempotencyKey: `pipely-checkout-${org.id}-${org.stripeCheckoutSessionId ?? "first"}` },
        );
        await tx.organization.update({
          where: { id: org.id },
          data: { stripeCustomerId: customerId, stripeCheckoutSessionId: checkout.id },
        });
        return { url: checkout.url };
      },
      { timeout: 30000 },
    );
    return NextResponse.json(result, { status: "status" in result ? result.status : 200 });
  } catch (error) {
    logger.error("stripe-checkout", "Checkout non disponibile", { error: String(error) });
    return NextResponse.json(
      { error: "Pagamento temporaneamente non disponibile. Riprova tra poco." },
      { status: 503 },
    );
  }
}
