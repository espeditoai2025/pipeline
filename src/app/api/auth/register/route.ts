import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";

const bodySchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  organizationName: z.string().min(2),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const body: unknown = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi" }, { status: 422 });
  }

  const { name, email, organizationName, password } = parsed.data;

  try {
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
