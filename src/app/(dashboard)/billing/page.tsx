import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { BillingClient } from "./BillingClient";

export const metadata: Metadata = { title: "Abbonamento | Pipely" };

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

  return <BillingClient org={org} />;
}
