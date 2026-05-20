import { NextRequest, NextResponse } from "next/server";
import { createHmac, randomBytes } from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { resend, FROM_DEFAULT } from "@/lib/resend";
import { withAuthRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const bodySchema = z.object({ email: z.string().email() });

/** Signs a password-reset token valid for 1 hour. */
function signToken(userId: string, expiresAt: number): string {
  const secret = process.env.NEXTAUTH_SECRET ?? "fallback-secret";
  const payload = `${userId}:${expiresAt}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export async function POST(req: NextRequest) {
  const limited = await withAuthRateLimit(req);
  if (limited) return limited;

  const body: unknown = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Email non valida" }, { status: 422 });
  }

  const { email } = parsed.data;

  // Always return 200 to prevent email enumeration
  const user = await db.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, name: true, passwordHash: true },
  });

  if (user?.passwordHash) {
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour
    const token = signToken(user.id, expiresAt);
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.pipely.it").replace(/\/$/, "");
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    if (resend) {
      await resend.emails.send({
        from: FROM_DEFAULT,
        to: email,
        subject: "Reimposta la tua password Pipely",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
            <h2 style="color:#0f172a;margin:0 0 12px;">Reimposta la password</h2>
            <p style="color:#475569;font-size:14px;line-height:1.6;">
              Ciao ${user.name ?? ""}! Abbiamo ricevuto una richiesta di reset password per il tuo account Pipely.
            </p>
            <div style="margin:24px 0;">
              <a href="${resetUrl}" style="background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
                Reimposta password →
              </a>
            </div>
            <p style="color:#94a3b8;font-size:12px;">
              Il link scade tra 1 ora. Se non hai richiesto il reset, ignora questa email.
            </p>
          </div>`,
      }).catch((err: unknown) => logger.warn("forgot-password", "Email reset fallita", { error: String(err) }));
    }

    logger.info("forgot-password", "Reset token generato", { userId: user.id });
  }

  return NextResponse.json({ ok: true });
}

/** Exported for use by reset-password route. */
export function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(":");
    if (parts.length !== 3) return null;
    const userId = parts[0]!;
    const expiresAtStr = parts[1]!;
    const sig = parts[2]!;
    const expiresAt = Number(expiresAtStr);
    if (Date.now() > expiresAt) return null;

    const secret = process.env.NEXTAUTH_SECRET ?? "fallback-secret";
    const expected = createHmac("sha256", secret).update(`${userId}:${expiresAtStr}`).digest("hex");
    if (sig !== expected) return null;

    return { userId };
  } catch {
    return null;
  }
}
