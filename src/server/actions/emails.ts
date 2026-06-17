"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resend, FROM_DEFAULT, isEmailEnabled } from "@/lib/resend";
import { getOrgPlan, getLimits } from "@/lib/plan";
import { sendViaSMTP } from "@/server/actions/smtp";
import type { EmailMessage, EmailTemplate } from "@/types/emails";

function getOrgId(s: Session | null) {
  return (s?.user as { organizationId?: string } | undefined)?.organizationId ?? null;
}

function mapEmail(row: {
  id: string; subject: string; body: string; fromAddress: string; fromName: string | null;
  toAddresses: string[]; ccAddresses: string[]; status: string; threadId: string | null;
  sentAt: Date | null; openedAt: Date | null; clickedAt: Date | null; trackingId: string;
  createdAt: Date; contactId: string | null; dealId: string | null;
}, dealTitle?: string | null, contactName?: string | null): EmailMessage {
  return {
    id: row.id,
    threadId: row.threadId ?? row.id,
    subject: row.subject,
    body: row.body,
    from: row.fromAddress,
    fromName: row.fromName ?? "",
    to: row.toAddresses,
    cc: row.ccAddresses,
    status: row.status as EmailMessage["status"],
    tracking: row.openedAt ? "OPENED" : row.sentAt ? "SENT" : "NONE",
    openedAt: row.openedAt?.toISOString() ?? null,
    clickedAt: row.clickedAt?.toISOString() ?? null,
    sentAt: row.sentAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    dealId: row.dealId,
    dealTitle: dealTitle ?? null,
    contactId: row.contactId,
    contactName: contactName ?? null,
  };
}

function mapTemplate(row: {
  id: string; name: string; subject: string; body: string; category: string;
  usageCount: number; createdAt: Date; updatedAt: Date;
}): EmailTemplate {
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    body: row.body,
    category: row.category,
    usageCount: row.usageCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const composeSchema = z.object({
  to: z.string().email("Email destinatario non valida"),
  cc: z.string().optional(),
  subject: z.string().min(1, "Oggetto obbligatorio"),
  body: z.string().min(1, "Corpo email obbligatorio"),
  dealId: z.string().optional(),
  dealTitle: z.string().optional(),
  contactId: z.string().optional(),
  contactName: z.string().optional(),
});

const templateSchema = z.object({
  name: z.string().min(1, "Nome obbligatorio"),
  subject: z.string().min(1, "Oggetto obbligatorio"),
  body: z.string().min(1, "Corpo obbligatorio"),
  category: z.string().min(1, "Categoria obbligatoria"),
});

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getEmails(): Promise<EmailMessage[]> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return [];

  const rows = await db.email.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { deal: { select: { title: true } }, contact: { select: { firstName: true, lastName: true } } },
  });

  return rows.map((r) =>
    mapEmail(r, r.deal?.title, r.contact ? `${r.contact.firstName} ${r.contact.lastName ?? ""}`.trim() : null)
  );
}

export async function getMyPlanFeatures(): Promise<{ emailCampaigns: boolean; smtp: boolean; ai: boolean; automations: boolean }> {
  const session = await auth();
  const orgId = (session?.user as { organizationId?: string } | undefined)?.organizationId ?? null;
  if (!orgId) return { emailCampaigns: false, smtp: false, ai: false, automations: false };
  const plan = await getOrgPlan(orgId);
  const l = getLimits(plan);
  return { emailCampaigns: l.emailCampaigns, smtp: l.smtp, ai: l.ai, automations: l.automations };
}

export async function getTemplates(): Promise<EmailTemplate[]> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return [];

  const rows = await db.emailTemplate.findMany({
    where: { organizationId: orgId },
    orderBy: { usageCount: "desc" },
  });
  return rows.map(mapTemplate);
}

// ─── Send ─────────────────────────────────────────────────────────────────────

export async function sendEmail(input: z.infer<typeof composeSchema>): Promise<{ data: EmailMessage | null; error: string | null }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!session || !orgId) return { data: null, error: "Non autorizzato" };

  const parsed = composeSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  const { to, cc, subject, body, dealId, contactId } = parsed.data;
  const fromAddress = session.user?.email ?? "noreply@pipely.app";
  const fromName = session.user?.name ?? "Pipely CRM";
  const threadId = `thread-${Date.now()}`;
  const now = new Date();

  // Attempt a real send: Resend first, then the org's SMTP config. Track whether
  // an email actually left so we don't persist a misleading "SENT" status (H15).
  const htmlBody = body.replace(/\n/g, "<br>");
  let didSend = false;

  if (isEmailEnabled() && resend) {
    try {
      await resend.emails.send({
        from: FROM_DEFAULT,
        to: [to],
        cc: cc ? [cc] : undefined,
        subject,
        html: htmlBody,
        replyTo: fromAddress,
      });
      didSend = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Errore invio email";
      console.error("[sendEmail] Resend error:", msg);
      return { data: null, error: `Errore invio: ${msg}` };
    }
  } else {
    const r = await sendViaSMTP(orgId, { to, subject, html: htmlBody, fromName });
    if (r.ok) {
      didSend = true;
    } else {
      // No working provider — surface the failure instead of faking a send.
      return { data: null, error: r.error ?? "Nessun provider email configurato (Resend o SMTP)." };
    }
  }

  // Save to DB (status reflects reality)
  const row = await db.email.create({
    data: {
      subject,
      body,
      fromAddress,
      fromName,
      toAddresses: [to],
      ccAddresses: cc ? [cc] : [],
      status: didSend ? "SENT" : "DRAFT",
      threadId,
      sentAt: didSend ? now : null,
      dealId: dealId || null,
      contactId: contactId || null,
      organizationId: orgId,
    },
  });

  revalidatePath("/emails");
  return { data: mapEmail(row, parsed.data.dealTitle, parsed.data.contactName), error: null };
}

export async function saveDraft(input: z.infer<typeof composeSchema>): Promise<{ data: EmailMessage | null; error: string | null }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!session || !orgId) return { data: null, error: "Non autorizzato" };

  const parsed = composeSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  const { to, cc, subject, body, dealId, contactId } = parsed.data;

  const row = await db.email.create({
    data: {
      subject,
      body,
      fromAddress: session.user?.email ?? "",
      fromName: session.user?.name ?? "",
      toAddresses: [to],
      ccAddresses: cc ? [cc] : [],
      status: "DRAFT",
      dealId: dealId || null,
      contactId: contactId || null,
      organizationId: orgId,
    },
  });

  revalidatePath("/emails");
  return { data: mapEmail(row, parsed.data.dealTitle, parsed.data.contactName), error: null };
}

// ─── Templates CRUD ──────────────────────────────────────────────────────────

export async function createTemplate(input: z.infer<typeof templateSchema>): Promise<{ data: EmailTemplate | null; error: string | null }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!session || !orgId) return { data: null, error: "Non autorizzato" };

  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  const row = await db.emailTemplate.create({
    data: { ...parsed.data, organizationId: orgId },
  });

  revalidatePath("/emails");
  return { data: mapTemplate(row), error: null };
}

export async function updateTemplate(input: z.infer<typeof templateSchema> & { id: string }): Promise<{ data: EmailTemplate | null; error: string | null }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!session || !orgId) return { data: null, error: "Non autorizzato" };

  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  const row = await db.emailTemplate.update({
    where: { id: input.id, organizationId: orgId },
    data: parsed.data,
  });

  revalidatePath("/emails");
  return { data: mapTemplate(row), error: null };
}

export async function deleteTemplate(id: string): Promise<{ error: string | null }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  await db.emailTemplate.delete({ where: { id, organizationId: orgId } });
  revalidatePath("/emails");
  return { error: null };
}

export async function incrementTemplateUsage(id: string): Promise<void> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return;
  await db.emailTemplate.update({
    where: { id, organizationId: orgId },
    data: { usageCount: { increment: 1 } },
  });
}
