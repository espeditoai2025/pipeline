import crypto from "crypto";

const KEY_HEX = process.env.SMTP_ENCRYPTION_KEY;

// Derive a 32-byte key — falls back to a deterministic dev key when env var is missing
function getKey(): Buffer {
  if (KEY_HEX && KEY_HEX.length >= 32) return Buffer.from(KEY_HEX.slice(0, 32), "utf8");
  // Dev fallback — NOT safe for production; set SMTP_ENCRYPTION_KEY in Vercel env vars
  return Buffer.from("pipely-dev-key-00000000000000000", "utf8").slice(0, 32);
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
