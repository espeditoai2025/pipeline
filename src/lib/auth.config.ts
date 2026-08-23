import type { NextAuthConfig } from "next-auth";

// Edge-safe config: no database imports, no Node.js-only packages.
// Used by the middleware to validate the JWT session.
// Nota: il provider Google è stato rimosso — senza adapter/callback signIn che
// crei l'utente e l'organizzazione in DB, la sessione OAuth veniva invalidata
// al primo refresh (bottone di fatto decorativo). Da reintrodurre solo insieme
// al flusso di provisioning completo. (Le credenziali GOOGLE_CLIENT_ID/SECRET
// restano in uso per l'integrazione Google Calendar, che ha un flusso proprio.)
export const authConfig: NextAuthConfig = {
  providers: [],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isPublic =
        nextUrl.pathname === "/" ||
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/register") ||
        nextUrl.pathname.startsWith("/forgot-password") ||
        nextUrl.pathname.startsWith("/reset-password") ||
        nextUrl.pathname.startsWith("/api/auth") ||
        nextUrl.pathname.startsWith("/api/register") ||
        nextUrl.pathname.startsWith("/api/cron/") ||
        nextUrl.pathname.startsWith("/api/track/") ||
        nextUrl.pathname === "/api/stripe/webhook" ||
        nextUrl.pathname.startsWith("/api/v1/") ||
        nextUrl.pathname.startsWith("/emails/unsubscribe") ||
        nextUrl.pathname.startsWith("/api/emails/unsubscribe") ||
        nextUrl.pathname.startsWith("/privacy") ||
        nextUrl.pathname.startsWith("/termini") ||
        nextUrl.pathname.startsWith("/cookie") ||
        nextUrl.pathname.startsWith("/contatti") ||
        nextUrl.pathname === "/sitemap.xml" ||
        nextUrl.pathname === "/robots.txt" ||
        // Landing page marketing e SEO
        nextUrl.pathname.startsWith("/crm-per-") ||
        nextUrl.pathname.startsWith("/crm-commerciale") ||
        nextUrl.pathname.startsWith("/crm-email-marketing") ||
        nextUrl.pathname.startsWith("/alternativa-") ||
        nextUrl.pathname.startsWith("/migliori-") ||
        nextUrl.pathname.startsWith("/chi-siamo") ||
        nextUrl.pathname.startsWith("/blog") ||
        nextUrl.pathname.startsWith("/book/") ||
        nextUrl.pathname.startsWith("/survey/");

      if (isPublic) return true;
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.organizationId = (user as { organizationId?: string }).organizationId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        (session.user as { role?: string }).role = token.role as string | undefined;
        (session.user as { organizationId?: string }).organizationId =
          token.organizationId as string | undefined;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
};
