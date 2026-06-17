import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { withAuthRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { verifyToken } from "../forgot-password/route";

const bodySchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const limited = await withAuthRateLimit(req);
  if (limited) return limited;

  const body: unknown = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi" }, { status: 422 });
  }

  const { token, password } = parsed.data;

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Link non valido o scaduto. Richiedi un nuovo link." }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, passwordHash: true },
  });

  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "Account non trovato o usa OAuth" }, { status: 400 });
  }

  const passwordHash = await hash(password, 12);
  // passwordChangedAt invalidates older JWT sessions (M5); the new hash also
  // kills any other outstanding reset token (M4).
  await db.user.update({
    where: { id: payload.userId },
    data: { passwordHash, passwordChangedAt: new Date() },
  });

  logger.info("reset-password", "Password reimpostata", { userId: payload.userId });

  return NextResponse.json({ ok: true });
}
