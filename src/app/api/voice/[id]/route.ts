import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { featureAccess } from "@/lib/feature-access";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { orgId } = await featureAccess(); const { id } = await params;
    const note = await db.voiceNote.findFirst({ where: { id, organizationId: orgId }, select: { audio: true, mimeType: true, byteSize: true } });
    if (!note) return new NextResponse(null, { status: 404 });
    return new NextResponse(new Uint8Array(note.audio), { headers: { "Content-Type": note.mimeType, "Content-Length": String(note.byteSize), "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" } });
  } catch { return new NextResponse(null, { status: 403 }); }
}
