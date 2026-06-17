import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createOAuthState } from "@/lib/oauth-state";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "GOOGLE_CLIENT_ID non configurato" }, { status: 503 });
  }

  // CSRF protection: bind a signed state to this user's session, also stored in
  // an httpOnly cookie (double-submit) and echoed by Google on the callback.
  const state = createOAuthState(session.user.id);

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${baseUrl}/api/google-calendar/callback`,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.events",
    access_type: "offline",
    prompt: "consent",
    state,
  });

  const res = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  res.cookies.set("gcal_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // sent on the top-level redirect back from Google
    path: "/",
    maxAge: 600, // 10 minutes
  });
  return res;
}
