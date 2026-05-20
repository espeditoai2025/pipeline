"use server";

import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
type Role = "OWNER" | "ADMIN" | "MANAGER" | "SALES" | "VIEWER";

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
    select: {
      id: true, name: true, slug: true, plan: true, createdAt: true,
      website: true, phone: true, vatNumber: true,
      address: true, city: true, country: true, sector: true,
    },
  });
  return org;
}

export async function updateOrgDetails(data: {
  name: string;
  website?: string;
  phone?: string;
  vatNumber?: string;
  address?: string;
  city?: string;
  country?: string;
  sector?: string;
}) {
  const session = await auth();
  const { orgId, userId } = getIds(session);
  if (!orgId || !userId) return { error: "Non autorizzato" };

  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user || !["OWNER", "ADMIN"].includes(user.role)) return { error: "Permesso negato" };

  if (!data.name?.trim()) return { error: "Nome non valido" };

  await db.organization.update({
    where: { id: orgId },
    data: {
      name: data.name.trim(),
      website: data.website?.trim() || null,
      phone: data.phone?.trim() || null,
      vatNumber: data.vatNumber?.trim() || null,
      address: data.address?.trim() || null,
      city: data.city?.trim() || null,
      country: data.country?.trim() || null,
      sector: data.sector?.trim() || null,
    },
  });
  revalidatePath("/settings");
  return { error: null };
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

// ─── Invitations ──────────────────────────────────────────────────────────────

export async function inviteTeamMember(email: string, role: Role) {
  const session = await auth();
  const { orgId, userId } = getIds(session);
  if (!orgId || !userId) return { error: "Non autorizzato" };

  const actor = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!actor || !["OWNER", "ADMIN"].includes(actor.role)) return { error: "Permesso negato" };

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return { error: "Email non valida" };

  const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) return { error: "Utente già registrato su Pipely" };

  const pending = await db.invitation.findFirst({
    where: { email: normalizedEmail, organizationId: orgId, acceptedAt: null, expiresAt: { gt: new Date() } },
  });
  if (pending) return { error: "Invito già inviato a questa email" };

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 giorni

  await db.invitation.create({
    data: { email: normalizedEmail, role, token, organizationId: orgId, expiresAt },
  });

  revalidatePath("/settings");
  return { error: null, token };
}

export async function getInvitations() {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return [];

  return db.invitation.findMany({
    where: { organizationId: orgId, acceptedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, role: true, token: true, createdAt: true, expiresAt: true },
  });
}

export async function revokeInvitation(id: string) {
  const session = await auth();
  const { orgId, userId } = getIds(session);
  if (!orgId || !userId) return { error: "Non autorizzato" };

  const actor = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!actor || !["OWNER", "ADMIN"].includes(actor.role)) return { error: "Permesso negato" };

  await db.invitation.deleteMany({ where: { id, organizationId: orgId } });
  revalidatePath("/settings");
  return { error: null };
}

// ─── Team members ─────────────────────────────────────────────────────────────

export async function removeMember(targetUserId: string) {
  const session = await auth();
  const { orgId, userId } = getIds(session);
  if (!orgId || !userId) return { error: "Non autorizzato" };

  if (targetUserId === userId) return { error: "Non puoi rimuovere te stesso" };

  const [actor, target] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { role: true } }),
    db.user.findUnique({ where: { id: targetUserId }, select: { role: true, organizationId: true } }),
  ]);

  if (!actor || !["OWNER", "ADMIN"].includes(actor.role)) return { error: "Permesso negato" };
  if (!target || target.organizationId !== orgId) return { error: "Utente non trovato" };
  if (target.role === "OWNER") return { error: "Non puoi rimuovere il proprietario dell'organizzazione" };

  await db.user.delete({ where: { id: targetUserId } });
  revalidatePath("/settings");
  return { error: null };
}

export async function updateMemberRole(targetUserId: string, role: Role) {
  const session = await auth();
  const { orgId, userId } = getIds(session);
  if (!orgId || !userId) return { error: "Non autorizzato" };

  if (targetUserId === userId) return { error: "Non puoi cambiare il tuo ruolo" };

  const [actor, target] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { role: true } }),
    db.user.findUnique({ where: { id: targetUserId }, select: { role: true, organizationId: true } }),
  ]);

  if (!actor || actor.role !== "OWNER") return { error: "Solo il proprietario può cambiare i ruoli" };
  if (!target || target.organizationId !== orgId) return { error: "Utente non trovato" };
  if (target.role === "OWNER") return { error: "Non puoi cambiare il ruolo del proprietario" };

  await db.user.update({ where: { id: targetUserId }, data: { role } });
  revalidatePath("/settings");
  return { error: null };
}

// ─── GDPR — Art. 20 Portabilità dei dati ─────────────────────────────────────

export async function exportOrgData() {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return { error: "Non autorizzato", data: null };

  const [org, users, contacts, companies, deals, activities, leads] = await Promise.all([
    db.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, slug: true, plan: true, website: true, phone: true, vatNumber: true, address: true, city: true, country: true, sector: true, createdAt: true },
    }),
    db.user.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    }),
    db.contact.findMany({ where: { organizationId: orgId } }),
    db.company.findMany({ where: { organizationId: orgId } }),
    db.deal.findMany({ where: { organizationId: orgId } }),
    db.activity.findMany({ where: { organizationId: orgId } }),
    db.lead.findMany({ where: { organizationId: orgId } }),
  ]);

  return {
    error: null,
    data: { exportedAt: new Date().toISOString(), organization: org, users, contacts, companies, deals, activities, leads },
  };
}

// ─── GDPR — Art. 17 Diritto all'oblio ────────────────────────────────────────
// Cancella l'intera organizzazione dell'utente e tutti i dati collegati (Cascade).
// Solo il proprietario (OWNER) può eseguire questa operazione.
// Richiede conferma testuale per prevenire cancellazioni accidentali.

export async function deleteAccount(confirmText: string): Promise<{ error: string | null }> {
  const session = await auth();
  const { orgId, userId } = getIds(session);
  if (!orgId || !userId) return { error: "Non autorizzato" };

  if (confirmText !== "ELIMINA") return { error: 'Scrivi "ELIMINA" per confermare' };

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, email: true },
  });
  if (!user || user.role !== "OWNER") {
    return { error: "Solo il proprietario dell'account può eliminarlo" };
  }

  // Cancella organizzazione — Prisma Cascade rimuove tutti i dati collegati:
  // users, deals, contacts, companies, activities, campaigns, workflows, smtp config, etc.
  await db.organization.delete({ where: { id: orgId } });

  return { error: null };
}
