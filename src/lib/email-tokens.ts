/**
 * HMAC tokens for email tracking & unsubscribe links.
 *
 * Click/open tracking URLs and unsubscribe links embed user/campaign ids that
 * an attacker could otherwise forge (open-redirect via the click tracker,
 * analytics inflation, unsubscribing arbitrary contacts). Signing the payload
 * with the app secret makes these links tamper-proof. Fail-closed: throws if no
 * secret is configured (never falls back to a known value).
 */

import { createHmac, timingSafeEqual } from "crypto";

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET/AUTH_SECRET non configurato");
  return secret;
}

/** Returns a URL-safe HMAC-SHA256 signature of `payload`. */
export function signEmailToken(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

/** Constant-time verification of a signature against `payload`. Never throws. */
export function verifyEmailToken(payload: string, signature: string | null | undefined): boolean {
  if (!signature) return false;
  try {
    const expected = signEmailToken(payload);
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Canonical payloads (keep in sync between signing and verifying sites). */
export const tokenPayload = {
  click: (campaignId: string, contactId: string, url: string) => `click:${campaignId}:${contactId}:${url}`,
  open: (campaignId: string, contactId: string) => `open:${campaignId}:${contactId}`,
  unsubscribe: (contactId: string, listId: string) => `unsub:${contactId}:${listId}`,
};
