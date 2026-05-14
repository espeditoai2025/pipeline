"use server";

import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function getOrgId(s: Session | null) {
  return (s?.user as { organizationId?: string } | undefined)?.organizationId ?? null;
}

export type CustomBillingType = { id: string; name: string; period?: string };

export const PREDEFINED_BILLING_TYPES: { id: string; name: string; description: string; isRecurring: boolean }[] = [
  { id: "one_time",       name: "Una tantum",        description: "Pagamento unico",         isRecurring: false },
  { id: "monthly",        name: "Mensile",           description: "Abbonamento mensile",     isRecurring: true  },
  { id: "annual",         name: "Annuale",           description: "Abbonamento annuale",     isRecurring: true  },
  { id: "rental_monthly", name: "Noleggio mensile",  description: "Canone noleggio mensile", isRecurring: true  },
  { id: "rental_annual",  name: "Noleggio annuale",  description: "Canone noleggio annuale", isRecurring: true  },
  { id: "lease_monthly",  name: "Affitto mensile",   description: "Canone affitto mensile",  isRecurring: true  },
  { id: "lease_annual",   name: "Affitto annuale",   description: "Canone affitto annuale",  isRecurring: true  },
];

export async function getCustomBillingTypes(): Promise<CustomBillingType[]> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return [];

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { customBillingTypes: true },
  });

  if (!org?.customBillingTypes) return [];
  return org.customBillingTypes as CustomBillingType[];
}

export async function saveCustomBillingTypes(types: CustomBillingType[]): Promise<{ error?: string }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  try {
    await db.organization.update({
      where: { id: orgId },
      data: { customBillingTypes: types },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Errore durante il salvataggio" };
  }
}
