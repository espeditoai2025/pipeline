import { resend, FROM_DEFAULT } from "@/lib/resend";
import { sendViaSMTP } from "@/lib/smtp-send";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * Unico punto d'uscita della posta.
 *
 * Esiste perché l'SDK Resend NON lancia sugli errori dell'API: `emails.send`
 * restituisce `{ data, error }`, quindi un `await` senza controllo su `.error`
 * fa passare per riuscito un invio rifiutato (dominio non verificato, chiave
 * errata, limite di frequenza). Ogni invio deve passare da qui, che l'errore lo
 * legge e lo riporta al chiamante.
 */

export type MailOptions = {
  to: string;
  subject: string;
  html: string;
  cc?: string[];
  replyTo?: string;
  /** Sovrascrive il nome del mittente sul canale SMTP dell'organizzazione. */
  fromName?: string;
  headers?: Record<string, string>;
};

export type MailResult = { ok: true; via: "smtp" | "resend" } | { ok: false; error: string };

/** Canale d'invio di un'organizzazione: SMTP proprio se verificato, altrimenti Resend di piattaforma. */
export type OrgChannel = "smtp" | "resend";

/**
 * Applica il nome mittente scelto dall'utente al mittente di piattaforma.
 * L'indirizzo resta quello verificato su Resend — cambiarlo farebbe rifiutare
 * l'invio — ma il destinatario vede il nome dell'azienda invece di "Pipely CRM".
 */
function fromWithName(fromName?: string): string {
  if (!fromName) return FROM_DEFAULT;
  const address = /<([^>]+)>/.exec(FROM_DEFAULT)?.[1] ?? FROM_DEFAULT;
  return `${fromName.replace(/["<>\r\n]/g, "").trim()} <${address}>`;
}

async function sendViaResend(opts: MailOptions): Promise<MailResult> {
  if (!resend) return { ok: false, error: "Nessun provider email configurato (RESEND_API_KEY assente)" };
  try {
    const r = await resend.emails.send({
      from: fromWithName(opts.fromName),
      to: opts.to,
      cc: opts.cc,
      subject: opts.subject,
      html: opts.html,
      replyTo: opts.replyTo,
      headers: opts.headers,
    });
    // Il controllo che dà senso a questo modulo: senza, un rifiuto dell'API
    // passerebbe per invio riuscito.
    if (r.error) return { ok: false, error: `${r.error.name}: ${r.error.message}` };
    return { ok: true, via: "resend" };
  } catch (err) {
    // Qui arrivano solo gli errori di rete/timeout, non quelli dell'API.
    return { ok: false, error: err instanceof Error ? err.message : "Errore di rete verso Resend" };
  }
}

/**
 * Posta della piattaforma (reset password, benvenuto, inviti, modulo contatti,
 * avvisi al gestore): parte sempre dall'identità Pipely. Registra i fallimenti,
 * che altrimenti resterebbero invisibili.
 */
export async function sendPlatformMail(context: string, opts: MailOptions): Promise<MailResult> {
  const result = await sendViaResend(opts);
  if (!result.ok) {
    // Nessun indirizzo nei log: basta il contesto per risalire al flusso.
    logger.error("mailer", `Invio email non riuscito (${context})`, { error: result.error });
  }
  return result;
}

/** Legge una sola volta da quale canale deve uscire la posta di un'organizzazione. */
export async function resolveOrgChannel(orgId: string): Promise<OrgChannel | null> {
  const smtp = await db.smtpConfig.findUnique({
    where: { organizationId: orgId },
    select: { isVerified: true },
  });
  if (smtp?.isVerified) return "smtp";
  return resend ? "resend" : null;
}

/**
 * Posta inviata per conto di un'organizzazione (email singole, campagne,
 * automazioni). Con un SMTP verificato esce dal dominio del cliente; solo in sua
 * assenza si ripiega su Resend. Un SMTP configurato che fallisce NON ricade su
 * Resend: il messaggio partirebbe da un mittente che il cliente non si aspetta.
 *
 * Passare `channel` (da resolveOrgChannel) evita una query per ogni destinatario.
 */
export async function sendOrgMail(orgId: string, opts: MailOptions, channel?: OrgChannel | null): Promise<MailResult> {
  const via = channel === undefined ? await resolveOrgChannel(orgId) : channel;
  if (via === null) {
    return { ok: false, error: "Configura un provider email (SMTP verificato o Resend) prima di inviare." };
  }
  if (via === "smtp") {
    const r = await sendViaSMTP(orgId, opts);
    return r.ok ? { ok: true, via: "smtp" } : { ok: false, error: r.error ?? "Invio SMTP non riuscito" };
  }
  return sendViaResend(opts);
}
