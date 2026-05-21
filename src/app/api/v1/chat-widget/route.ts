import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orgId, visitorName, visitorEmail, message, page } = body;

    if (!orgId || !visitorName || !visitorEmail || !message) {
      return NextResponse.json(
        { error: "Campi obbligatori: orgId, visitorName, visitorEmail, message" },
        { status: 400 },
      );
    }

    // Verify org exists
    const org = await db.organization.findUnique({ where: { id: orgId }, select: { id: true } });
    if (!org) {
      return NextResponse.json({ error: "Organizzazione non trovata" }, { status: 404 });
    }

    await db.chatMessage.create({
      data: {
        visitorName,
        visitorEmail,
        message,
        page: page ?? null,
        organizationId: orgId,
      },
    });

    return NextResponse.json({ success: true }, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch {
    return NextResponse.json({ error: "Errore interno" }, {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
}

// CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
