"use server";

import { z } from "zod";
import { resend, FROM_DEFAULT } from "@/lib/resend";

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? "support@pipely.it";

const schema = z.object({
  name: z.string().min(2, "Nome troppo corto").max(100),
  email: z.string().email("Email non valida"),
  subject: z.enum(["info", "support", "billing", "partnership", "other"], {
    message: "Seleziona un argomento",
  }),
  message: z.string().min(10, "Messaggio troppo corto").max(3000),
  privacy: z.literal(true, { message: "Devi accettare la privacy policy" }),
});

export type ContactFormInput = z.infer<typeof schema>;

export type ContactFormResult = {
  success: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof ContactFormInput, string>>;
};

const SUBJECT_LABELS: Record<ContactFormInput["subject"], string> = {
  info: "Informazioni generali",
  support: "Supporto tecnico",
  billing: "Fatturazione / Piano",
  partnership: "Partnership / Rivenditori",
  other: "Altro",
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function submitContactForm(data: unknown): Promise<ContactFormResult> {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof ContactFormInput, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof ContactFormInput;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { success: false, fieldErrors };
  }

  const { name, email, subject, message } = parsed.data;
  const subjectLabel = SUBJECT_LABELS[subject];

  if (!resend) {
    console.warn(
      `[contact-form] RESEND_API_KEY non configurato. Messaggio ricevuto ma non inviato.\n` +
      `Da: ${email} (${name}) | Argomento: ${subjectLabel}\n${message}`
    );
    return { success: true };
  }

  await resend.emails.send({
    from: FROM_DEFAULT,
    to: SUPPORT_EMAIL,
    replyTo: email,
    subject: `[Pipely Contatti] ${subjectLabel} — ${esc(name)}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#1e293b">Nuovo messaggio dal form contatti</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr><td style="padding:8px 0;color:#64748b;font-size:14px;width:120px">Nome</td><td style="padding:8px 0;font-size:14px;font-weight:600">${esc(name)}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-size:14px">Email</td><td style="padding:8px 0;font-size:14px"><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
          <tr><td style="padding:8px 0;color:#64748b;font-size:14px">Argomento</td><td style="padding:8px 0;font-size:14px">${esc(subjectLabel)}</td></tr>
        </table>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;font-size:14px;line-height:1.6;color:#334155;white-space:pre-wrap">${esc(message)}</div>
        <p style="margin-top:20px;font-size:12px;color:#94a3b8">Inviato da pipely.it/contatti</p>
      </div>
    `,
  });

  await resend.emails.send({
    from: FROM_DEFAULT,
    to: email,
    subject: "Abbiamo ricevuto il tuo messaggio — Pipely",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#1e293b">Ciao ${esc(name)},</h2>
        <p style="color:#475569;line-height:1.6">
          Grazie per averci contattato! Abbiamo ricevuto il tuo messaggio riguardo a
          <strong>${esc(subjectLabel.toLowerCase())}</strong> e ti risponderemo al più presto,
          di solito entro 1 giorno lavorativo.
        </p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:20px 0;font-size:14px;line-height:1.6;color:#334155;white-space:pre-wrap">${esc(message)}</div>
        <p style="color:#475569;font-size:14px">
          Nel frattempo puoi esplorare la documentazione o creare il tuo account gratuito su
          <a href="https://pipely.it" style="color:#2563eb">pipely.it</a>.
        </p>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px">
          Pipely · <a href="mailto:support@pipely.it" style="color:#94a3b8">support@pipely.it</a>
        </p>
      </div>
    `,
  });

  return { success: true };
}
