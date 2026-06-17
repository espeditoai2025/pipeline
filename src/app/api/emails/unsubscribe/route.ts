import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyEmailToken, tokenPayload } from "@/lib/email-tokens";

/**
 * Unsubscribe endpoint (POST only — mutation never happens on GET, so email
 * client link prefetching can't accidentally unsubscribe a contact).
 *
 * Handles both:
 *  - RFC 8058 List-Unsubscribe one-click (mail client POSTs here), and
 *  - the human confirmation button on /emails/unsubscribe.
 *
 * Accepts cid/lid/sig from query string. A present signature must be valid;
 * legacy links sent before signing existed (no sig) are still honored for
 * compliance (the user explicitly clicked/confirmed).
 */
export async function POST(req: NextRequest) {
  const cid = req.nextUrl.searchParams.get("cid");
  const lid = req.nextUrl.searchParams.get("lid");
  const sig = req.nextUrl.searchParams.get("sig");

  if (!cid || !lid) {
    return Response.json({ ok: false, error: "Parametri mancanti" }, { status: 400 });
  }

  // If a signature is provided it must verify; reject forged ones.
  if (sig && !verifyEmailToken(tokenPayload.unsubscribe(cid, lid), sig)) {
    return Response.json({ ok: false, error: "Firma non valida" }, { status: 400 });
  }

  try {
    const entry = await db.emailListContact.findFirst({ where: { id: cid, listId: lid } });
    if (!entry) {
      return Response.json({ ok: false, error: "Contatto non trovato" }, { status: 404 });
    }
    if (!entry.unsubscribed) {
      await db.emailListContact.update({ where: { id: entry.id }, data: { unsubscribed: true } });
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "Errore durante la disiscrizione" }, { status: 500 });
  }
}
