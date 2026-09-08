import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { featureAccess } from "@/lib/feature-access";
import { CrmError } from "@/lib/crm-transaction";
import { isRecordId } from "@/lib/record-id";
import { logger } from "@/lib/logger";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { orgId } = await featureAccess(); const { id } = await params;
    if (!isRecordId(id)) return new NextResponse(null, { status: 404 });
    const note = await db.voiceNote.findFirst({ where: { id, organizationId: orgId }, select: { audio: true, mimeType: true, byteSize: true } });
    if (!note) return new NextResponse(null, { status: 404 });
    return new NextResponse(new Uint8Array(note.audio), { headers: { "Content-Type": note.mimeType, "Content-Length": String(note.byteSize), "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" } });
  } catch (error) {
    // Un guasto di infrastruttura non è un problema di permessi: restituire 403 a tutto
    // nascondeva le indisponibilità del database dietro un "accesso negato" senza traccia.
    if (error instanceof CrmError) return new NextResponse(null, { status: 403 });
    logger.error("voice-audio", "Scarico audio non riuscito", { error: String(error) });
    return new NextResponse(null, { status: 500 });
  }
}
