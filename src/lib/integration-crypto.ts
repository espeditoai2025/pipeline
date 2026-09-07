import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { CrmError } from "@/lib/crm-transaction";

function key() {
  const secret = process.env.INTEGRATIONS_ENCRYPTION_KEY || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) throw new CrmError("Cifratura delle integrazioni non configurata.");
  return createHash("sha256").update("pipely-integrations-v1:").update(secret).digest();
}
export function sealIntegration(value: string, purpose: string) {
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(purpose));
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}
export function openIntegration(value: string, purpose: string) {
  const [version, iv, tag, data] = value.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new CrmError("Collegamento non leggibile: ricollega Fatture in Cloud.");
  const cipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  cipher.setAAD(Buffer.from(purpose)); cipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([cipher.update(Buffer.from(data, "base64url")), cipher.final()]).toString("utf8");
}
