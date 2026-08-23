import { db } from "@/lib/db";
import { resend, FROM_DEFAULT } from "@/lib/resend";
import { sendViaSMTP } from "@/lib/smtp-send";
import { signEmailToken, tokenPayload } from "@/lib/email-tokens";
import { getOrgPlan, checkFeature } from "@/lib/plan";
import { logger } from "@/lib/logger";

/** Escapes HTML-special chars to prevent markup injection from user values. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type DeliverResult = { sent: number; failed: number; error?: string };

/**
 * Core di invio campagna, senza sessione: usato sia dalla server action
 * sendCampaign (dopo auth + gating piano) sia dal cron per le campagne
 * programmate. Il passaggio a SENDING è un claim atomico, così action e cron
 * non possono inviare la stessa campagna due volte.
 */
export async function deliverCampaign(campaignId: string, orgId: string): Promise<DeliverResult> {
  // Claim atomico PRIMA di leggere: solo chi porta DRAFT/SCHEDULED → SENDING
  // invia, e da quel momento updateCampaign (filtrata su DRAFT/SCHEDULED) non
  // può più modificare contenuto/lista — niente invii con dati stantii.
  const claimed = await db.emailCampaign.updateMany({
    where: { id: campaignId, organizationId: orgId, status: { in: ["DRAFT", "SCHEDULED"] } },
    data: { status: "SENDING" },
  });
  if (claimed.count === 0) {
    const existing = await db.emailCampaign.findFirst({
      where: { id: campaignId, organizationId: orgId },
      select: { status: true },
    });
    if (!existing) return { sent: 0, failed: 0, error: "Campagna non trovata" };
    return { sent: 0, failed: 0, error: existing.status === "SENT" ? "Campagna già inviata" : "Campagna già in invio" };
  }

  const campaign = await db.emailCampaign.findFirst({
    where: { id: campaignId, organizationId: orgId },
    include: { list: { include: { contacts: { where: { unsubscribed: false } }, organization: { select: { name: true } } } } },
  });
  if (!campaign) {
    return { sent: 0, failed: 0, error: "Campagna non trovata" };
  }

  if (!resend) {
    const smtp = await db.smtpConfig.findUnique({ where: { organizationId: orgId } });
    if (!smtp?.isVerified) {
      // Rilascia il claim: senza provider la campagna torna in Bozza (evita che
      // resti SENDING o che intasi la coda del cron restando SCHEDULED).
      await db.emailCampaign.update({ where: { id: campaignId }, data: { status: "DRAFT" } }).catch(() => {});
      return { sent: 0, failed: 0, error: "Configura un provider email (SMTP o Resend) prima di inviare campagne." };
    }
  }

  const contacts = campaign.list.contacts;
  let sent = 0;
  let failed = 0;
  const from = FROM_DEFAULT;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

  const orgName = escapeHtml(campaign.list?.organization?.name ?? "Pipely");

  for (const contact of contacts) {
    // HTML-escape user-controlled values before interpolating into markup so a
    // contact's name/email cannot inject active markup into the recipient's inbox.
    const personalizedBody = campaign.body
      .replace(/\{\{nome\}\}/g, escapeHtml(contact.firstName ?? ""))
      .replace(/\{\{cognome\}\}/g, escapeHtml(contact.lastName ?? ""))
      .replace(/\{\{email\}\}/g, escapeHtml(contact.email));

    // Convert plain-text newlines to HTML, then inject tracking
    let html = personalizedBody.replace(/\n/g, "<br>");

    // Rewrite href links for click tracking — destination is HMAC-signed so the
    // tracker can't be abused as an open redirector.
    html = html.replace(
      /href=(["'])(https?:\/\/[^"']+)\1/g,
      (_match, _quote, originalUrl) => {
        const sig = signEmailToken(tokenPayload.click(campaign.id, contact.id, originalUrl));
        const tracked = `${appUrl}/api/track/click/${campaign.id}/${contact.id}?url=${encodeURIComponent(originalUrl)}&sig=${sig}`;
        return `href="${tracked}"`;
      }
    );

    // Inject open-tracking pixel (1x1 GIF), signed so opens can't be forged.
    const openSig = signEmailToken(tokenPayload.open(campaign.id, contact.id));
    html += `<img src="${appUrl}/api/track/open/${campaign.id}/${contact.id}?sig=${openSig}" width="1" height="1" style="display:none;border:0" alt="" />`;

    // GDPR / Art. 130 c.4-bis Codice Privacy — footer obbligatorio con link unsubscribe visibile
    const unsubSig = signEmailToken(tokenPayload.unsubscribe(contact.id, campaign.listId));
    const unsubscribeQs = `cid=${contact.id}&lid=${campaign.listId}&sig=${unsubSig}`;
    const unsubscribeUrl = `${appUrl}/emails/unsubscribe?${unsubscribeQs}`;
    html += `
<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;font-family:sans-serif;">
  Hai ricevuto questa email perché sei nella lista contatti di ${orgName}.
  <br/>
  <a href="${unsubscribeUrl}" style="color:#6366f1;text-decoration:underline;">Disiscriviti dalla lista</a>
  &nbsp;·&nbsp;
  <a href="https://www.pipely.it/privacy" style="color:#94a3b8;text-decoration:underline;">Privacy Policy</a>
</div>`;

    // List-Unsubscribe header (RFC 2369 + RFC 8058) — punta all'endpoint POST one-click.
    const listUnsubscribeHeader = `<mailto:unsubscribe@pipely.it?subject=unsubscribe&body=${contact.id}>, <${appUrl}/api/emails/unsubscribe?${unsubscribeQs}>`;

    try {
      if (resend) {
        // resend.emails.send non lancia sugli errori API: ritorna { data, error }.
        const r = await resend.emails.send({
          from,
          to: contact.email,
          subject: campaign.subject,
          html,
          headers: {
            "List-Unsubscribe": listUnsubscribeHeader,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });
        if (r.error) throw new Error(r.error.message);
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
    where: { id: campaignId },
    data: sent > 0
      ? { status: "SENT", sentAt: new Date(), totalSent: sent }
      : { status: "DRAFT", totalSent: 0 },
  });

  return { sent, failed };
}

/**
 * Invia le campagne programmate scadute (status SCHEDULED con scheduledAt nel
 * passato). Chiamato dal cron ogni 15 minuti. Ritorna il numero processato.
 *
 * Ogni campagna estratta esce comunque dalla coda: SENT se l'invio riesce,
 * DRAFT se non può partire (piano insufficiente, provider mancante, tutti gli
 * invii falliti) — mai lasciata SCHEDULED, altrimenti le campagne bloccate
 * occuperebbero per sempre i primi slot della query (starvation) e una
 * campagna congelata da un downgrade partirebbe a sorpresa mesi dopo.
 */
export async function processDueCampaigns(limit = 3): Promise<number> {
  // Recovery: una campagna rimasta in SENDING oltre 30 minuti è un invio morto
  // a metà (crash/timeout della function) — torna in Bozza così l'utente la
  // vede e può decidere; senza questo resterebbe in SENDING per sempre.
  await db.emailCampaign.updateMany({
    where: { status: "SENDING", updatedAt: { lt: new Date(Date.now() - 30 * 60 * 1000) } },
    data: { status: "DRAFT" },
  }).catch(() => {});

  const due = await db.emailCampaign.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } },
    orderBy: { scheduledAt: "asc" },
    take: limit,
    select: { id: true, organizationId: true, name: true },
  });

  let processed = 0;
  for (const c of due) {
    // Ricontrolla il gating piano: l'org può aver fatto downgrade dopo la
    // programmazione — la campagna torna in Bozza e non parte.
    const plan = await getOrgPlan(c.organizationId);
    if (checkFeature(plan, "emailCampaigns")) {
      await db.emailCampaign.updateMany({
        where: { id: c.id, status: "SCHEDULED" },
        data: { status: "DRAFT" },
      }).catch(() => {});
      continue;
    }

    const result = await deliverCampaign(c.id, c.organizationId).catch((err) => {
      logger.error("campaign-scheduler", `Invio campagna programmata fallito: ${c.name}`, { error: String(err) });
      return null;
    });
    // Se deliverCampaign non ha potuto processarla e l'ha lasciata SCHEDULED,
    // demozione a DRAFT per non intasare la coda ai prossimi run.
    await db.emailCampaign.updateMany({
      where: { id: c.id, status: "SCHEDULED" },
      data: { status: "DRAFT" },
    }).catch(() => {});
    if (result) processed++;
  }
  return processed;
}
