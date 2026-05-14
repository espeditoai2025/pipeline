import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";

const bodySchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  organizationName: z.string().min(2).optional(),
  password: z.string().min(8),
  inviteToken: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body: unknown = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi" }, { status: 422 });
  }

  const { name, email, organizationName, password, inviteToken } = parsed.data;

  try {
    // ── Invite flow ──────────────────────────────────────────────────────────
    if (inviteToken) {
      const invitation = await db.invitation.findUnique({
        where: { token: inviteToken },
        include: { organization: { select: { id: true } } },
      });

      if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
        return NextResponse.json({ error: "Invito non valido o scaduto" }, { status: 400 });
      }

      const normalizedEmail = email.trim().toLowerCase();
      if (invitation.email !== normalizedEmail) {
        return NextResponse.json({ error: "Questo invito è stato inviato a un'altra email" }, { status: 400 });
      }

      const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
      if (existing) {
        return NextResponse.json({ error: "Email già in uso" }, { status: 409 });
      }

      const passwordHash = await hash(password, 12);

      await db.$transaction([
        db.user.create({
          data: {
            name,
            email: normalizedEmail,
            passwordHash,
            role: invitation.role,
            organizationId: invitation.organizationId,
          },
        }),
        db.invitation.update({
          where: { id: invitation.id },
          data: { acceptedAt: new Date() },
        }),
      ]);

      return NextResponse.json({ ok: true }, { status: 201 });
    }

    // ── Standard registration flow ───────────────────────────────────────────
    if (!organizationName || organizationName.trim().length < 2) {
      return NextResponse.json({ error: "Nome azienda non valido" }, { status: 422 });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email già in uso" }, { status: 409 });
    }

    const slug = `${organizationName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 50)}-${Date.now()}`;

    const passwordHash = await hash(password, 12);

    await db.organization.create({
      data: {
        name: organizationName,
        slug,
        users: {
          create: { name, email, passwordHash, role: "OWNER" },
        },
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[register]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
