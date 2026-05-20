/** HTML email templates for transactional emails. */

export function welcomeEmailHtml({
  name,
  orgName,
  appUrl,
}: {
  name: string;
  orgName: string;
  appUrl: string;
}): string {
  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Benvenuto su Pipely</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
        <!-- Header -->
        <tr><td style="background:#3b82f6;padding:32px 40px;text-align:center;">
          <p style="margin:0;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Pipely CRM</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f172a;">Benvenuto, ${name}! 👋</h1>
          <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
            Il tuo account Pipely per <strong>${orgName}</strong> è pronto. Puoi iniziare subito a gestire
            la tua pipeline di vendita, i contatti e le campagne email.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr><td style="background:#3b82f6;border-radius:10px;padding:12px 28px;">
              <a href="${appUrl}/dashboard" style="color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Apri la dashboard →</a>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;font-size:14px;color:#64748b;font-weight:600;">Cosa puoi fare con Pipely:</p>
          <ul style="margin:0 0 24px;padding-left:20px;color:#475569;font-size:14px;line-height:2;">
            <li>Gestire deal e pipeline di vendita</li>
            <li>Importare e organizzare contatti e aziende</li>
            <li>Inviare campagne email ai tuoi lead</li>
            <li>Automatizzare i follow-up con i workflow</li>
            <li>Analizzare le performance con i report</li>
          </ul>
          <p style="margin:0;font-size:13px;color:#94a3b8;">
            Hai bisogno di aiuto? Scrivici a
            <a href="mailto:support@pipely.it" style="color:#3b82f6;text-decoration:none;">support@pipely.it</a>
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 40px;border-top:1px solid #f1f5f9;text-align:center;">
          <p style="margin:0;font-size:11px;color:#94a3b8;">
            © ${new Date().getFullYear()} Pipely · <a href="${appUrl}/privacy" style="color:#94a3b8;">Privacy</a> ·
            <a href="${appUrl}/termini" style="color:#94a3b8;">Termini</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function inviteEmailHtml({
  inviterName,
  orgName,
  role,
  inviteUrl,
  appUrl,
}: {
  inviterName: string;
  orgName: string;
  role: string;
  inviteUrl: string;
  appUrl: string;
}): string {
  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><title>Invito a Pipely</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;">
        <tr><td style="background:#3b82f6;padding:32px 40px;text-align:center;border-radius:16px 16px 0 0;">
          <p style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">Pipely CRM</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f172a;">Sei stato invitato!</h1>
          <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
            <strong>${inviterName}</strong> ti ha invitato a unirsi a <strong>${orgName}</strong>
            su Pipely con il ruolo di <strong>${role}</strong>.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr><td style="background:#3b82f6;border-radius:10px;padding:12px 28px;">
              <a href="${inviteUrl}" style="color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Accetta l'invito →</a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:12px;color:#94a3b8;">
            Il link scade tra 7 giorni. Se non hai richiesto questo invito, ignora questa email.
          </p>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #f1f5f9;text-align:center;">
          <p style="margin:0;font-size:11px;color:#94a3b8;">© ${new Date().getFullYear()} Pipely</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
