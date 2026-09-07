import { z } from "zod";
import { db } from "@/lib/db";
import { CrmError } from "@/lib/crm-transaction";
import { openIntegration, sealIntegration } from "@/lib/integration-crypto";

export const FIC_BASE = "https://api-v2.fattureincloud.it";
export const FIC_SCOPES = "issued_documents.invoices:a settings:r";
export class FicError extends CrmError {
  constructor(message: string, public uncertain = false) { super(message); }
}
export function ficConfigured() { return Boolean(process.env.FIC_CLIENT_ID && process.env.FIC_CLIENT_SECRET && process.env.FIC_REDIRECT_URI); }
export async function ficRequest<T>(token: string, path: string, method = "GET", body?: unknown): Promise<T> {
  if (!path.startsWith("/") || path.startsWith("//")) throw new CrmError("Percorso non valido");
  let response: Response;
  try {
    response = await fetch(FIC_BASE + path, { method, headers: { Authorization: "Bearer " + token, Accept: "application/json", "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000), cache: "no-store", redirect: "error" });
  } catch { throw new FicError("Fatture in Cloud non ha confermato la risposta. Verifica lo stato prima di riprovare.", method !== "GET"); }
  let json: { error?: { message?: string; validation_result?: unknown } };
  try { json = await response.json(); } catch { throw new FicError("Risposta non valida da Fatture in Cloud.", method !== "GET"); }
  if (!response.ok || json.error) {
    const message = response.status === 401 ? "Collegamento scaduto o revocato: ricollega Fatture in Cloud." : response.status === 403 ? "Il collegamento non dispone dei permessi o del piano Fatture in Cloud richiesti." : response.status === 429 ? "Limite Fatture in Cloud raggiunto. Attendi prima di riprovare." : "Fatture in Cloud: " + String(json.error?.message ?? "errore " + response.status).slice(0, 400);
    const validation = Array.isArray(json.error?.validation_result) ? " " + json.error.validation_result.filter(value => typeof value === "string").join("; ").slice(0, 700) : "";
    throw new FicError(message + validation, method !== "GET" && response.status >= 500);
  }
  return json as T;
}
const tokensSchema = z.object({ access_token: z.string().min(1), refresh_token: z.string().min(1), expires_in: z.number().positive() });
export async function exchangeFicToken(grant: { code: string } | { refresh_token: string }) {
  if (!ficConfigured()) throw new CrmError("Fatture in Cloud non ancora configurato dal gestore di Pipely.");
  // No token, secret or provider response is logged or returned to the browser.
  const response = await fetch(FIC_BASE + "/oauth/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_id: process.env.FIC_CLIENT_ID, client_secret: process.env.FIC_CLIENT_SECRET, grant_type: "code" in grant ? "authorization_code" : "refresh_token", ...("code" in grant ? { redirect_uri: process.env.FIC_REDIRECT_URI } : {}), ...grant }), signal: AbortSignal.timeout(15000), redirect: "error", cache: "no-store" });
  if (!response.ok) throw new CrmError("Autorizzazione Fatture in Cloud non riuscita. Ricollega l’account.");
  const parsed = tokensSchema.safeParse(await response.json()); if (!parsed.success) throw new CrmError("Autorizzazione Fatture in Cloud non valida.");
  return parsed.data;
}
export async function ficConnection(orgId: string) {
  // Serializes token rotation across serverless workers without retrying a used refresh token.
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "organizationId" FROM "InvoicingConnection" WHERE "organizationId" = ${orgId} FOR UPDATE`;
    let connection = await tx.invoicingConnection.findUnique({ where: { organizationId: orgId } });
    if (!connection) throw new CrmError("Collega Fatture in Cloud dalle impostazioni di fatturazione.");
    if (connection.expiresAt && connection.expiresAt.getTime() < Date.now() + 60000) {
      if (!connection.refreshToken) throw new CrmError("Ricollega Fatture in Cloud.");
      const tokens = await exchangeFicToken({ refresh_token: openIntegration(connection.refreshToken, "fic:" + orgId) });
      connection = await tx.invoicingConnection.update({ where: { organizationId: orgId }, data: { accessToken: sealIntegration(tokens.access_token, "fic:" + orgId), refreshToken: sealIntegration(tokens.refresh_token, "fic:" + orgId), expiresAt: new Date(Date.now() + tokens.expires_in * 1000) } });
    }
    return { ...connection, token: openIntegration(connection.accessToken, "fic:" + orgId) };
  }, { timeout: 22000, maxWait: 10000 });
}
export const ficCompanySchema = z.object({ id: z.number().int().positive(), name: z.string(), vat_number: z.string().nullish(), type: z.string().nullish() });
export const ficVatSchema = z.object({ id: z.number().int().nonnegative(), value: z.number(), description: z.string().nullish(), ei_type: z.string().nullish(), e_invoice: z.boolean().nullish(), is_disabled: z.boolean().nullish() });
export const ficDocumentSchema = z.object({ id: z.number().int().positive(), type: z.literal("invoice"), number: z.number().int(), numeration: z.string().nullish(), amount_gross: z.number().finite(), amount_net: z.number().finite(), amount_vat: z.number().finite(), currency: z.object({ id: z.string() }), subject: z.string().nullish(), ei_status: z.string().nullish(), e_invoice: z.boolean().nullish(), entity: z.object({ vat_number: z.string().nullish(), tax_code: z.string().nullish() }).nullish() });
export type FicDocument = z.infer<typeof ficDocumentSchema>;
export type FicVat = z.infer<typeof ficVatSchema>;
