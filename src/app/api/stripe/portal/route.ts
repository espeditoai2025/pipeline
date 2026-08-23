import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStripe, APP_URL } from "@/lib/stripe";
import { assertBillingOwner } from "@/lib/billing-auth";

export async function POST() {
  const session = await auth();

  // Il portale consente anche la cancellazione dell'abbonamento: solo OWNER.
  const guard = await assertBillingOwner(session);
  if ("error" in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }
  const { orgId } = guard;

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { stripeCustomerId: true },
  });

  if (!org?.stripeCustomerId) {
    return NextResponse.json({ error: "Nessun abbonamento attivo" }, { status: 400 });
  }

  const portalSession = await getStripe().billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${APP_URL}/billing`,
  });

  return NextResponse.json({ url: portalSession.url });
}
