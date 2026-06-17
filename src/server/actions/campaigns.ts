"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resend, FROM_DEFAULT } from "@/lib/resend";
import type { EmailList, EmailListDetail, EmailListContact, EmailCampaign } from "@/types/emails";
import { getOrgPlan, checkFeature } from "@/lib/plan";
import { sendViaSMTP } from "@/server/actions/smtp";

function getOrgId(s: Session | null) {
  return (s?.user as { organizationId?: string } | undefined)?.organizationId ?? null;
}

type AR<T> = { data?: T; error?: string };

// ─── Email Lists ──────────────────────────────────────────────────────────────

function mapList(row: {
  id: string; name: string; description: string | null;
  createdAt: Date; updatedAt: Date;
  _count?: { contacts: number };
}): EmailList {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    contactCount: row._count?.contacts ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapContact(c: {
  id: string; email: string; firstName: string | null; lastName: string | null;
  unsubscribed: boolean; createdAt: Date;
}): EmailListContact {
  return {
    id: c.id,
    email: c.email,
    firstName: c.firstName,
    lastName: c.lastName,
    unsubscribed: c.unsubscribed,
    createdAt: c.createdAt.toISOString(),
  };
}

export async function getEmailLists(): Promise<EmailList[]> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return [];

  const rows = await db.emailList.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { contacts: true } } },
  });
  return rows.map(mapList);
}

export async function getEmailListDetail(id: string): Promise<AR<EmailListDetail>> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  const row = await db.emailList.findFirst({
    where: { id, organizationId: orgId },
    include: {
      contacts: { orderBy: { createdAt: "desc" } },
      _count: { select: { contacts: true } },
    },
  });
  if (!row) return { error: "Lista non trovata" };

  return {
    data: {
      ...mapList(row),
      contacts: row.contacts.map(mapContact),
    },
  };
}

const listSchema = z.object({
  name: z.string().min(1, "Nome obbligatorio"),
  description: z.string().optional(),
});

export async function createEmailList(input: z.infer<typeof listSchema>): Promise<AR<EmailList>> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  const parsed = listSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Input non valido" };

  const row = await db.emailList.create({
    data: { name: parsed.data.name, description: parsed.data.description ?? null, organizationId: orgId },
    include: { _count: { select: { contacts: true } } },
  });
  revalidatePath("/emails");
  return { data: mapList(row) };
}

export async function updateEmailList(id: string, input: z.infer<typeof listSchema>): Promise<AR<EmailList>> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  const row = await db.emailList.update({
    where: { id, organizationId: orgId },
    data: { name: input.name, description: input.description ?? null },
    include: { _count: { select: { contacts: true } } },
  });
  revalidatePath("/emails");
  return { data: mapList(row) };
}

export async function deleteEmailList(id: string): Promise<AR<void>> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  await db.emailList.delete({ where: { id, organizationId: orgId } });
  revalidatePath("/emails");
  return {};
}

const contactSchema = z.object({
  email: z.string().email("Email non valida"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export async function addContactToList(listId: string, input: z.infer<typeof contactSchema>): Promise<AR<EmailListContact>> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  const list = await db.emailList.findFirst({ where: { id: listId, organizationId: orgId } });
  if (!list) return { error: "Lista non trovata" };

  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Input non valido" };

  try {
    const row = await db.emailListContact.create({
      data: {
        listId,
        email: parsed.data.email,
        firstName: parsed.data.firstName ?? null,
        lastName: parsed.data.lastName ?? null,
      },
    });
    revalidatePath("/emails");
    return { data: mapContact(row) };
  } catch {
    return { error: "Email già presente in questa lista" };
  }
}

export async function importContactsToList(
  listId: string,
  contacts: { email: string; firstName?: string; lastName?: string }[]
): Promise<AR<{ added: number; skipped: number }>> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  const list = await db.emailList.findFirst({ where: { id: listId, organizationId: orgId } });
  if (!list) return { error: "Lista non trovata" };

  let added = 0;
  let skipped = 0;

  for (const c of contacts) {
    if (!c.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) { skipped++; continue; }
    try {
      await db.emailListContact.create({
        data: { listId, email: c.email.toLowerCase(), firstName: c.firstName ?? null, lastName: c.lastName ?? null },
      });
      added++;
    } catch {
      skipped++;
    }
  }

  revalidatePath("/emails");
  return { data: { added, skipped } };
}

export async function removeContactFromList(id: string): Promise<AR<void>> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  // Scoping tenant via parent: EmailListContact non ha organizationId (IDOR guard).
  const result = await db.emailListContact.deleteMany({
    where: { id, list: { organizationId: orgId } },
  });
  if (result.count === 0) return { error: "Non trovato" };
  revalidatePath("/emails");
  return {};
}

// ─── Campaigns ────────────────────────────────────────────────────────────────

function mapCampaign(row: {
  id: string; name: string; subject: string; body: string; fromName: string | null;
  listId: string; status: string; scheduledAt: Date | null; sentAt: Date | null;
  totalSent: number; totalOpened: number; totalClicked: number;
  createdAt: Date; updatedAt: Date;
  list?: { name: string };
}, listName?: string): EmailCampaign {
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    body: row.body,
    fromName: row.fromName,
    listId: row.listId,
    listName: row.list?.name ?? listName ?? "",
    status: row.status as EmailCampaign["status"],
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    sentAt: row.sentAt?.toISOString() ?? null,
    totalSent: row.totalSent,
    totalOpened: row.totalOpened,
    totalClicked: row.totalClicked,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getCampaigns(): Promise<EmailCampaign[]> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return [];

  const rows = await db.emailCampaign.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    include: { list: { select: { name: true } } },
  });
  return rows.map((r) => mapCampaign(r));
}

const campaignSchema = z.object({
  name: z.string().min(1, "Nome obbligatorio"),
  subject: z.string().min(1, "Oggetto obbligatorio"),
  body: z.string().min(1, "Corpo obbligatorio"),
  fromName: z.string().optional(),
  listId: z.string().min(1, "Seleziona una lista"),
  scheduledAt: z.string().optional(),
});

export async function createCampaign(input: z.infer<typeof campaignSchema>): Promise<AR<EmailCampaign>> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Input non valido" };

  const plan = await getOrgPlan(orgId);
  const featureError = checkFeature(plan, "emailCampaigns");
  if (featureError) return { error: featureError };

  const list = await db.emailList.findFirst({ where: { id: parsed.data.listId, organizationId: orgId } });
  if (!list) return { error: "Lista non trovata" };

  const row = await db.emailCampaign.create({
    data: {
      name: parsed.data.name,
      subject: parsed.data.subject,
      body: parsed.data.body,
      fromName: parsed.data.fromName ?? null,
      listId: parsed.data.listId,
      scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
      organizationId: orgId,
    },
    include: { list: { select: { name: true } } },
  });

  revalidatePath("/emails");
  return { data: mapCampaign(row) };
}

export async function updateCampaign(id: string, input: z.infer<typeof campaignSchema>): Promise<AR<EmailCampaign>> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  const row = await db.emailCampaign.update({
    where: { id, organizationId: orgId },
    data: {
      name: input.name,
      subject: input.subject,
      body: input.body,
      fromName: input.fromName ?? null,
      listId: input.listId,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
    },
    include: { list: { select: { name: true } } },
  });

  revalidatePath("/emails");
  return { data: mapCampaign(row) };
}

export async function deleteCampaign(id: string): Promise<AR<void>> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  await db.emailCampaign.delete({ where: { id, organizationId: orgId } });
  revalidatePath("/emails");
  return {};
}

export async function sendCampaign(id: string): Promise<AR<{ sent: number; failed: number }>> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  const plan = await getOrgPlan(orgId);
  const featureError = checkFeature(plan, "emailCampaigns");
  if (featureError) return { error: featureError };

  const campaign = await db.emailCampaign.findFirst({
    where: { id, organizationId: orgId },
    include: { list: { include: { contacts: { where: { unsubscribed: false } }, organization: { select: { name: true } } } } },
  });
  if (!campaign) return { error: "Campagna non trovata" };
  if (campaign.status === "SENT") return { error: "Campagna già inviata" };

  if (!resend) {
    const smtp = await db.smtpConfig.findUnique({ where: { organizationId: orgId } });
    if (!smtp?.isVerified) return { error: "Configura un provider email (SMTP o Resend) prima di inviare campagne." };
  }

  await db.emailCampaign.update({ where: { id }, data: { status: "SENDING" } });

  const contacts = campaign.list.contacts;
  let sent = 0;
  let failed = 0;
  const from = FROM_DEFAULT;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

  for (const contact of contacts) {
    const personalizedBody = campaign.body
      .replace(/\{\{nome\}\}/g, contact.firstName ?? "")
      .replace(/\{\{cognome\}\}/g, contact.lastName ?? "")
      .replace(/\{\{email\}\}/g, contact.email);

    // Convert plain-text newlines to HTML, then inject tracking
    let html = personalizedBody.replace(/\n/g, "<br>");

    // Rewrite href links for click tracking
    html = html.replace(
      /href=(["'])(https?:\/\/[^"']+)\1/g,
      (_match, _quote, originalUrl) => {
        const tracked = `${appUrl}/api/track/click/${campaign.id}/${contact.id}?url=${encodeURIComponent(originalUrl)}`;
        return `href="${tracked}"`;
      }
    );

    // Inject open-tracking pixel (1x1 GIF) at the bottom of the email
    html += `<img src="${appUrl}/api/track/open/${campaign.id}/${contact.id}" width="1" height="1" style="display:none;border:0" alt="" />`;

    // GDPR / Art. 130 c.4-bis Codice Privacy — footer obbligatorio con link unsubscribe visibile
    const unsubscribeUrl = `${appUrl}/emails/unsubscribe?cid=${contact.id}&lid=${campaign.listId}`;
    html += `
<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;font-family:sans-serif;">
  Hai ricevuto questa email perché sei nella lista contatti di ${campaign.list?.organization?.name ?? "Pipely"}.
  <br/>
  <a href="${unsubscribeUrl}" style="color:#6366f1;text-decoration:underline;">Disiscriviti dalla lista</a>
  &nbsp;·&nbsp;
  <a href="https://www.pipely.it/privacy" style="color:#94a3b8;text-decoration:underline;">Privacy Policy</a>
</div>`;

    // List-Unsubscribe header HTTP (RFC 2369 + RFC 8058) — richiesto da Gmail/Outlook e art. 130 c.4-bis
    const listUnsubscribeHeader = `<mailto:unsubscribe@pipely.it?subject=unsubscribe&body=${contact.id}>, <${unsubscribeUrl}>`;

    try {
      if (resend) {
        await resend.emails.send({
          from,
          to: contact.email,
          subject: campaign.subject,
          html,
          headers: {
            "List-Unsubscribe": listUnsubscribeHeader,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });
      } else {
        // No Resend → send via the org's verified SMTP config.
        const r = await sendViaSMTP(orgId, {
          to: contact.email,
          subject: campaign.subject,
          html,
          fromName: campaign.fromName ?? undefined,
        });
        if (!r.ok) throw new Error(r.error ?? "Invio SMTP fallito");
      }
      sent++;
    } catch {
      failed++;
    }
  }

  // Only mark SENT if at least one email actually went out; otherwise revert to
  // DRAFT so the user can retry (avoids "ghost sent" campaigns where 0 mail left).
  await db.emailCampaign.update({
    where: { id },
    data: sent > 0
      ? { status: "SENT", sentAt: new Date(), totalSent: sent }
      : { status: "DRAFT", totalSent: 0 },
  });

  revalidatePath("/emails");
  if (sent === 0 && failed > 0) {
    return { error: `Invio fallito per tutti i ${failed} destinatari. Verifica la configurazione email.` };
  }
  return { data: { sent, failed } };
}
