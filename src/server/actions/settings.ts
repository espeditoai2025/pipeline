"use server";

import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { compare, hash } from "bcryptjs";
import { resend, FROM_DEFAULT } from "@/lib/resend";
import { inviteEmailHtml } from "@/lib/email-templates";
import { logger } from "@/lib/logger";
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

  const [invitation, inviter, org] = await Promise.all([
    db.invitation.create({
      data: { email: normalizedEmail, role, token, organizationId: orgId, expiresAt },
    }),
    db.user.findUnique({ where: { id: userId }, select: { name: true } }),
    db.organization.findUnique({ where: { id: orgId }, select: { name: true } }),
  ]);

  if (resend && inviter && org) {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.pipely.it").replace(/\/$/, "");
    const inviteUrl = `${appUrl}/register?invite=${token}`;
    const ROLE_LABELS: Record<string, string> = {
      ADMIN: "Admin", MANAGER: "Manager", SALES: "Sales", VIEWER: "Viewer",
    };
    resend.emails.send({
      from: FROM_DEFAULT,
      to: normalizedEmail,
      subject: `${inviter.name ?? "Il tuo collega"} ti ha invitato su Pipely`,
      html: inviteEmailHtml({
        inviterName: inviter.name ?? "Un collega",
        orgName: org.name,
        role: ROLE_LABELS[role] ?? role,
        inviteUrl,
        appUrl,
      }),
    }).catch((err: unknown) => logger.warn("invite", "Email invito fallita", { error: String(err), to: normalizedEmail }));
  }

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

// ─── API Keys ─────────────────────────────────────────────────────────────────

import { createHash } from "crypto";

function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export type ApiKeyPublic = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
};

export async function getApiKeys(): Promise<ApiKeyPublic[]> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return [];

  const rows = await db.apiKey.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, prefix: true, createdAt: true, lastUsedAt: true, expiresAt: true },
  });

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    prefix: r.prefix,
    createdAt: r.createdAt.toISOString(),
    lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
    expiresAt: r.expiresAt?.toISOString() ?? null,
  }));
}

export async function createApiKey(name: string): Promise<{ error: string | null; key: string | null }> {
  const session = await auth();
  const { orgId, userId } = getIds(session);
  if (!orgId || !userId) return { error: "Non autorizzato", key: null };

  if (!name.trim()) return { error: "Inserisci un nome per la chiave", key: null };

  const count = await db.apiKey.count({ where: { organizationId: orgId } });
  if (count >= 10) return { error: "Limite di 10 chiavi API raggiunto", key: null };

  const raw = `pip_live_${randomBytes(20).toString("hex")}`;
  const keyHash = hashApiKey(raw);
  const prefix = raw.slice(0, 16);

  await db.apiKey.create({
    data: { name: name.trim(), keyHash, prefix, organizationId: orgId, createdBy: userId },
  });

  return { error: null, key: raw };
}

export async function revokeApiKey(id: string): Promise<{ error: string | null }> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return { error: "Non autorizzato" };

  const key = await db.apiKey.findFirst({ where: { id, organizationId: orgId } });
  if (!key) return { error: "Chiave non trovata" };

  await db.apiKey.delete({ where: { id } });
  return { error: null };
}

// ─── Cambio password ──────────────────────────────────────────────────────────

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ error: string | null }> {
  const session = await auth();
  const { userId } = getIds(session);
  if (!userId) return { error: "Non autorizzato" };

  if (newPassword.length < 8) return { error: "La nuova password deve avere almeno 8 caratteri" };

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user?.passwordHash) {
    return { error: "Il tuo account usa Google/OAuth — modifica la password dal pannello Google" };
  }

  const valid = await compare(currentPassword, user.passwordHash);
  if (!valid) return { error: "Password attuale non corretta" };

  if (currentPassword === newPassword) return { error: "La nuova password deve essere diversa da quella attuale" };

  const newHash = await hash(newPassword, 12);
  await db.user.update({ where: { id: userId }, data: { passwordHash: newHash } });

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
