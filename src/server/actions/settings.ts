"use server";

import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

function getIds(s: Session | null) {
  const user = s?.user as { id?: string; organizationId?: string } | undefined;
  return { userId: user?.id ?? null, orgId: user?.organizationId ?? null };
}

export async function getOrgData() {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return null;

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, slug: true, plan: true, createdAt: true },
  });
  return org;
}

export async function updateOrgName(name: string) {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return { error: "Non autorizzato" };
  if (!name.trim()) return { error: "Nome non valido" };

  await db.organization.update({ where: { id: orgId }, data: { name: name.trim() } });
  revalidatePath("/settings");
  return { error: null };
}

export async function getTeamMembers() {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return [];

  const users = await db.user.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return users;
}

export async function getUsageStats() {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return null;

  const [deals, contacts, companies, activities, leads, products] = await Promise.all([
    db.deal.count({ where: { organizationId: orgId } }),
    db.contact.count({ where: { organizationId: orgId } }),
    db.company.count({ where: { organizationId: orgId } }),
    db.activity.count({ where: { organizationId: orgId } }),
    db.lead.count({ where: { organizationId: orgId } }),
    db.product.count({ where: { organizationId: orgId } }),
  ]);

  return { deals, contacts, companies, activities, leads, products };
}
