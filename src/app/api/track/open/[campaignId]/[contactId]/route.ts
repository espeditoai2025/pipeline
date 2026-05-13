import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ campaignId: string; contactId: string }> }
) {
  const { campaignId } = await ctx.params;

  try {
    await db.emailCampaign.update({
      where: { id: campaignId },
      data: { totalOpened: { increment: 1 } },
    });
  } catch {
    // Campaign deleted or ID invalid — ignore silently
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
