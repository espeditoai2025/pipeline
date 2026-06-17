import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { verifyOAuthState } from "@/lib/oauth-state";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.redirect(new URL("/activities?gcal=error", req.url));

  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/activities?gcal=error", req.url));

  // CSRF: the state must be valid for THIS session and match the cookie we set.
  const state = req.nextUrl.searchParams.get("state");
  const cookieState = req.cookies.get("gcal_oauth_state")?.value;
  if (!state || state !== cookieState || !verifyOAuthState(state, session.user.id)) {
    return NextResponse.redirect(new URL("/activities?gcal=error", req.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${baseUrl}/api/google-calendar/callback`,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json() as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error?: string;
    };

    if (tokens.error || !tokens.access_token) {
      return NextResponse.redirect(new URL("/activities?gcal=error", req.url));
    }

    const expiry = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : new Date(Date.now() + 3600 * 1000);

    // Encrypt OAuth tokens at rest (reuses crypto.ts / SMTP_ENCRYPTION_KEY).
    await db.user.update({
      where: { id: session.user.id },
      data: {
        googleCalendarToken: encrypt(tokens.access_token),
        googleCalendarRefreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
        googleCalendarTokenExpiry: expiry,
      },
    });

    const res = NextResponse.redirect(new URL("/activities?gcal=connected", req.url));
    res.cookies.delete("gcal_oauth_state");
    return res;
  } catch {
    return NextResponse.redirect(new URL("/activities?gcal=error", req.url));
  }
}
