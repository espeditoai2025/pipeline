import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyEmailToken, tokenPayload } from "@/lib/email-tokens";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ campaignId: string; contactId: string }> }
) {
  const { campaignId, contactId } = await ctx.params;
  const destination = req.nextUrl.searchParams.get("url");
  const sig = req.nextUrl.searchParams.get("sig");

  if (!destination) {
    return new Response("Missing url parameter", { status: 400 });
  }

  // The destination must be signed at send time — otherwise this endpoint is an
  // open redirector (phishing). Reject unsigned/forged links before redirecting.
  if (!verifyEmailToken(tokenPayload.click(campaignId, contactId, destination), sig)) {
    return new Response("Invalid or missing signature", { status: 400 });
  }

  // Only allow http/https destinations.
  let safe: string;
  try {
    const parsed = new URL(destination);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return new Response("Invalid destination", { status: 400 });
    }
    safe = parsed.toString();
  } catch {
    return new Response("Invalid destination URL", { status: 400 });
  }

  try {
    // Un clic per destinatario: chi riapre l'email e riclicca non conta due volte.
    const first = await db.campaignDelivery.updateMany({
      where: { campaignId, contactId, clickedAt: null },
      data: { clickedAt: new Date() },
    });
    if (first.count > 0) {
      await db.emailCampaign.update({
        where: { id: campaignId },
        data: { totalClicked: { increment: 1 } },
      });
    }
  } catch {
    // Campaign deleted or ID invalid — ignore silently
  }

  return Response.redirect(safe, 302);
}
