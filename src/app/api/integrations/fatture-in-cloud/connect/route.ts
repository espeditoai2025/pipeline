import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { featureAccess, featureError } from "@/lib/feature-access";
import { ficConfigured, FIC_BASE, FIC_SCOPES } from "@/lib/fatture-in-cloud";
import { sealIntegration } from "@/lib/integration-crypto";

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await featureAccess("integrations", "invoicing");
    if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Origine non valida" }, { status: 403 });
    if (!ficConfigured()) return NextResponse.json({ error: "Fatture in Cloud non ancora configurato dal gestore di Pipely." }, { status: 503 });
    const state = randomBytes(32).toString("base64url");
    const url = new URL(FIC_BASE + "/oauth/authorize");
    url.search = new URLSearchParams({ response_type: "code", client_id: process.env.FIC_CLIENT_ID!, redirect_uri: process.env.FIC_REDIRECT_URI!, scope: FIC_SCOPES, state }).toString();
    const response = NextResponse.json({ url: url.href });
    response.cookies.set("pipely_fic_oauth", sealIntegration(JSON.stringify({ state, orgId, userId, expires: Date.now() + 600000 }), "fic-oauth"), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/integrations/fatture-in-cloud", maxAge: 600 });
    return response;
  } catch (error) { return NextResponse.json({ error: featureError(error) }, { status: 400 }); }
}
