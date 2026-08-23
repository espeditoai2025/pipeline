import nodemailer from "nodemailer";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";

/**
 * Invia una email tramite il provider SMTP configurato dall'organizzazione.
 *
 * Vive fuori da un file "use server" di proposito: prende un orgId "grezzo" e
 * NON deve essere un endpoint RPC invocabile dal client (un utente autenticato
 * potrebbe altrimenti inviare email tramite l'SMTP di un'altra org).
 * Chiamare solo da codice server fidato che ha già validato l'orgId.
 */
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
