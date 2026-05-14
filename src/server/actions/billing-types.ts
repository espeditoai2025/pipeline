"use server";

import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { CustomBillingType, CustomProductCategory } from "@/types/billing-types";

function getOrgId(s: Session | null) {
  return (s?.user as { organizationId?: string } | undefined)?.organizationId ?? null;
}

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

export async function getCustomProductCategories(): Promise<CustomProductCategory[]> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return [];

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { customProductCategories: true },
  });

  if (!org?.customProductCategories) return [];
  return org.customProductCategories as CustomProductCategory[];
}

export async function saveCustomProductCategories(categories: CustomProductCategory[]): Promise<{ error?: string }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  try {
    await db.organization.update({
      where: { id: orgId },
      data: { customProductCategories: categories },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Errore durante il salvataggio" };
  }
}
