import crypto from "crypto";

// Derive a 32-byte key from SMTP_ENCRYPTION_KEY env var.
// Must be set in all environments — no dev fallback to avoid silently encrypting
// production data with a known key.
function getKey(): Buffer {
  const key = process.env.SMTP_ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error(
      "SMTP_ENCRYPTION_KEY non configurata o troppo corta (minimo 32 caratteri). " +
      "Impostare la variabile d'ambiente prima di gestire configurazioni SMTP."
    );
  }
  return Buffer.from(key.slice(0, 32), "utf8");
}

const ALG = "aes-256-cbc";

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALG, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + enc.toString("hex");
}

export function decrypt(ciphertext: string): string {
  const [ivHex, encHex] = ciphertext.split(":");
  if (!ivHex || !encHex) throw new Error("Invalid ciphertext");
  const iv = Buffer.from(ivHex, "hex");
  const enc = Buffer.from(encHex, "hex");
  const decipher = crypto.createDecipheriv(ALG, getKey(), iv);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

// Ciphertext format produced by encrypt(): "<ivHex>:<encHex>".
const ENCRYPTED_RE = /^[0-9a-f]+:[0-9a-f]+$/i;

/**
 * Decrypts a value that may be either encrypted (new) or legacy plaintext.
 * Used for fields migrated to encryption-at-rest where older rows are still
 * stored in clear (e.g. Google OAuth tokens). Returns the value unchanged if it
 * isn't in encrypted form or can't be decrypted.
 */
export function tryDecrypt(value: string): string {
  if (!ENCRYPTED_RE.test(value)) return value; // legacy plaintext
  try {
    return decrypt(value);
  } catch {
    return value;
  }
}
