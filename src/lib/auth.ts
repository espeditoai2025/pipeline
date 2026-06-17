import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { db } from "./db";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await db.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            passwordChangedAt: true,
            role: true,
            organizationId: true,
          },
        });

        if (!user?.passwordHash) return null;

        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
          organizationId: user.organizationId,
          passwordChangedAt: user.passwordChangedAt ? user.passwordChangedAt.getTime() : 0,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // Node-only jwt callback (this NextAuth instance powers server-side auth(),
    // route handlers and server actions — the edge proxy uses authConfig directly).
    // On sign-in it records the password version; on later requests it re-checks
    // the DB and invalidates the session if the password changed afterwards (M5).
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.organizationId = (user as { organizationId?: string }).organizationId;
        token.pwdAt = (user as { passwordChangedAt?: number }).passwordChangedAt ?? 0;
        return token;
      }
      if (token.sub) {
        try {
          const u = await db.user.findUnique({
            where: { id: token.sub },
            select: { passwordChangedAt: true },
          });
          if (!u) return null; // user deleted → drop the session
          const current = u.passwordChangedAt ? u.passwordChangedAt.getTime() : 0;
          const issued = typeof token.pwdAt === "number" ? token.pwdAt : 0;
          if (current > issued) return null; // password changed after token issuance → invalidate
        } catch {
          // On a transient DB error, keep the existing token (don't lock users out).
        }
      }
      return token;
    },
  },
});
