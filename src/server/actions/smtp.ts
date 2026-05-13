"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import nodemailer from "nodemailer";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";
import { getOrgPlan, checkFeature } from "@/lib/plan";

function getOrgId(s: Session | null) {
  return (s?.user as { organizationId?: string } | undefined)?.organizationId ?? null;
}

export type SmtpProvider = "gmail" | "aruba" | "libero" | "custom";

export type SmtpConfigPublic = {
  id: string;
  provider: SmtpProvider;
  host: string;
  port: number;
  secure: boolean;
  fromEmail: string;
  fromName: string | null;
  username: string;
  isVerified: boolean;
  updatedAt: string;
};

type AR<T = void> = { data?: T; error?: string };

function mapConfig(row: {
  id: string; provider: string; host: string; port: number; secure: boolean;
  fromEmail: string; fromName: string | null; username: string;
  isVerified: boolean; updatedAt: Date;
}): SmtpConfigPublic {
  return {
    id: row.id,
    provider: row.provider as SmtpProvider,
    host: row.host,
    port: row.port,
    secure: row.secure,
    fromEmail: row.fromEmail,
    fromName: row.fromName,
    username: row.username,
    isVerified: row.isVerified,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getSmtpConfig(): Promise<SmtpConfigPublic | null> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return null;

  const row = await db.smtpConfig.findUnique({ where: { organizationId: orgId } });
  return row ? mapConfig(row) : null;
}

const configSchema = z.object({
  provider: z.enum(["gmail", "aruba", "libero", "custom"]),
  host: z.string().min(1, "Host obbligatorio"),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  fromEmail: z.string().email("Email mittente non valida"),
  fromName: z.string().optional(),
  username: z.string().min(1, "Username obbligatorio"),
  password: z.string().min(1, "Password obbligatoria"),
});

export type SmtpConfigInput = z.infer<typeof configSchema>;

export async function saveSmtpConfig(input: SmtpConfigInput): Promise<AR<SmtpConfigPublic>> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  const parsed = configSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Input non valido" };

  const plan = await getOrgPlan(orgId);
  const featureError = checkFeature(plan, "smtp");
  if (featureError) return { error: featureError };

  const passwordEnc = encrypt(parsed.data.password);

  const data = {
    provider: parsed.data.provider,
    host: parsed.data.host,
    port: parsed.data.port,
    secure: parsed.data.secure,
    fromEmail: parsed.data.fromEmail,
    fromName: parsed.data.fromName ?? null,
    username: parsed.data.username,
    passwordEnc,
    isVerified: false,
  };

  const row = await db.smtpConfig.upsert({
    where: { organizationId: orgId },
    create: { ...data, organizationId: orgId },
    update: data,
  });

  revalidatePath("/settings");
  return { data: mapConfig(row) };
}

export async function testSmtpConfig(id: string): Promise<AR<{ message: string }>> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  const row = await db.smtpConfig.findFirst({ where: { id, organizationId: orgId } });
  if (!row) return { error: "Configurazione non trovata" };

  let password: string;
  try {
    password = decrypt(row.passwordEnc);
  } catch {
    return { error: "Errore decifratura password. Riconfigura il provider." };
  }

  const transporter = nodemailer.createTransport({
    host: row.host,
    port: row.port,
    secure: row.secure,
    auth: { user: row.username, pass: password },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  });

  try {
    await transporter.verify();
    await db.smtpConfig.update({ where: { id }, data: { isVerified: true } });
    revalidatePath("/settings");
    return { data: { message: "Connessione riuscita! Il provider è operativo." } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Errore sconosciuto";
    return { error: `Connessione fallita: ${msg}` };
  }
}

export async function deleteSmtpConfig(): Promise<AR> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  await db.smtpConfig.deleteMany({ where: { organizationId: orgId } });
  revalidatePath("/settings");
  return {};
}

// Used by emails.ts to send via SMTP when configured
export async function sendViaSMTP(orgId: string, opts: {
  to: string; subject: string; html: string; fromName?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const row = await db.smtpConfig.findUnique({ where: { organizationId: orgId } });
  if (!row) return { ok: false, error: "Nessun provider SMTP configurato" };

  let password: string;
  try { password = decrypt(row.passwordEnc); }
  catch { return { ok: false, error: "Errore decifratura credenziali" }; }

  const transporter = nodemailer.createTransport({
    host: row.host, port: row.port, secure: row.secure,
    auth: { user: row.username, pass: password },
  });

  try {
    await transporter.sendMail({
      from: `"${opts.fromName ?? row.fromName ?? row.fromEmail}" <${row.fromEmail}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Errore invio" };
  }
}
