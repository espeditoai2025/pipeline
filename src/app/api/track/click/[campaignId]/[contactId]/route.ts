import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ campaignId: string; contactId: string }> }
) {
  const { campaignId } = await ctx.params;
  const destination = req.nextUrl.searchParams.get("url");

  try {
    await db.emailCampaign.update({
      where: { id: campaignId },
      data: { totalClicked: { increment: 1 } },
    });
  } catch {
    // Campaign deleted or ID invalid — ignore silently
  }

  if (!destination) {
    return new Response("Missing url parameter", { status: 400 });
  }

  // Only allow http/https destinations to prevent open-redirect abuse
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

  return Response.redirect(safe, 302);
}
