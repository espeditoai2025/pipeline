import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyEmailToken, tokenPayload } from "@/lib/email-tokens";

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ campaignId: string; contactId: string }> }
) {
  const { campaignId, contactId } = await ctx.params;
  const sig = req.nextUrl.searchParams.get("sig");

  // Only count opens from a correctly-signed pixel (prevents trivial inflation).
  // Always return the pixel regardless, so the email renders normally.
  if (verifyEmailToken(tokenPayload.open(campaignId, contactId), sig)) {
    try {
      await db.emailCampaign.update({
        where: { id: campaignId },
        data: { totalOpened: { increment: 1 } },
      });
    } catch {
      // Campaign deleted or ID invalid — ignore silently
    }
  }

  return new Response(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}
