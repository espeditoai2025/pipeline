import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { BillingClient } from "./BillingClient";

export const metadata: Metadata = { title: "Abbonamento | Pipely" };

export type StripeInvoice = {
  id: string;
  number: string | null;
  date: number;
  total: number;
  currency: string;
  status: string | null;
  pdfUrl: string | null;
};

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = (session.user as { organizationId?: string }).organizationId;
  if (!orgId) redirect("/login");

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: {
      plan: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      stripeCurrentPeriodEnd: true,
    },
  });

  if (!org) redirect("/login");

  // Load invoice history from Stripe (fail gracefully if Stripe not configured)
  let invoices: StripeInvoice[] = [];
  if (org.stripeCustomerId && process.env.STRIPE_SECRET_KEY) {
    try {
      const { getStripe } = await import("@/lib/stripe");
      const stripe = getStripe();
      const result = await stripe.invoices.list({
        customer: org.stripeCustomerId,
        limit: 12,
      });
      invoices = result.data.map((inv) => ({
        id: inv.id,
        number: inv.number,
        date: inv.created,
        total: inv.total,
        currency: inv.currency,
        status: inv.status,
        pdfUrl: inv.invoice_pdf ?? null,
      }));
    } catch {
      // Stripe not configured or error — show empty state
    }
  }

  return <BillingClient org={org} invoices={invoices} />;
}
