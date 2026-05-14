import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Edge-safe proxy: uses JWT-only config, no db/pg imports.
const { auth } = NextAuth(authConfig);

export { auth as proxy };

export const config = {
  // Skip middleware for Next.js internals, static assets, and common file extensions
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest|css|js|woff|woff2|ttf|eot)$).*)",
  ],
};
