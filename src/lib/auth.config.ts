import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Edge-safe config: no database imports, no Node.js-only packages.
// Used by the middleware to validate the JWT session.
export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
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
        nextUrl.pathname.startsWith("/api/auth") ||
        nextUrl.pathname.startsWith("/api/leads") ||
        nextUrl.pathname.startsWith("/api/register") ||
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
        nextUrl.pathname.startsWith("/blog");

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
