"use server";

import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { CrmModeId } from "@/types/crm-modes";
import { DEFAULT_MODE } from "@/types/crm-modes";

function getOrgId(s: Session | null) {
  return (s?.user as { organizationId?: string } | undefined)?.organizationId ?? null;
}

export async function getCrmMode(): Promise<CrmModeId> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return DEFAULT_MODE;

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { crmMode: true },
  });
  return (org?.crmMode as CrmModeId | null) ?? DEFAULT_MODE;
}

export async function isCrmModeSet(): Promise<boolean> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return false;

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { crmMode: true },
  });
  return !!org?.crmMode;
}

export async function setCrmMode(mode: CrmModeId): Promise<{ error?: string }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  await db.organization.update({
    where: { id: orgId },
    data: { crmMode: mode },
  });

  revalidatePath("/dashboard");
  return {};
}
