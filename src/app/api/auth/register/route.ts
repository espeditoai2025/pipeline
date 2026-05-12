import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findUserByEmail, createUser } from "@/lib/mock-users";

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

  if (findUserByEmail(email)) {
    return NextResponse.json({ error: "Email già in uso" }, { status: 409 });
  }

  createUser({ name, email, organizationName, password });

  return NextResponse.json({ ok: true }, { status: 201 });
}
