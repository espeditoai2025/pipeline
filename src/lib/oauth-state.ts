/**
 * CSRF state tokens for OAuth flows (e.g. Google Calendar connect).
 *
 * The state is bound to the initiating user's session via HMAC, so an attacker
 * cannot forge a state that validates against the victim's session (prevents
 * login-CSRF / account-stitching on the callback). Fail-closed: throws if no
 * app secret is configured.
 */

import { createHmac, randomBytes, timingSafeEqual } from "crypto";

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET/AUTH_SECRET non configurato");
  return secret;
}

/** Creates an opaque `nonce.sig` state bound to `userId`. */
export function createOAuthState(userId: string): string {
  const nonce = randomBytes(16).toString("hex");
  const sig = createHmac("sha256", getSecret()).update(`${userId}:${nonce}`).digest("base64url");
  return `${nonce}.${sig}`;
}

/** Constant-time verification that `state` was issued for `userId`. Never throws. */
export function verifyOAuthState(state: string | null | undefined, userId: string): boolean {
  if (!state) return false;
  const [nonce, sig] = state.split(".");
  if (!nonce || !sig) return false;
  try {
    const expected = createHmac("sha256", getSecret()).update(`${userId}:${nonce}`).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
