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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = await (db as any).user?.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email già in uso" }, { status: 409 });
  }

  const slug = organizationName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 50);

  const uniqueSlug = `${slug}-${Date.now()}`;
  const passwordHash = await hash(password, 12);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).organization?.create({
    data: {
      name: organizationName,
      slug: uniqueSlug,
      users: {
        create: { name, email, passwordHash, role: "OWNER" },
      },
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
