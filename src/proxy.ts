import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Edge-safe proxy: uses JWT-only config, no db/pg imports.
const { auth } = NextAuth(authConfig);

export { auth as proxy };

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
