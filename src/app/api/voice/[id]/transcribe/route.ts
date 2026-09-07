import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { featureAccess, featureError } from "@/lib/feature-access";
import { CrmError } from "@/lib/crm-transaction";
import { reserveVoiceAi, transcribeAudio } from "@/lib/voice-ai";
export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { orgId, userId, role } = await featureAccess("write", "ai");
    if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Origine non valida" }, { status: 403 });
    const { id } = await params;
    const where = { id, organizationId: orgId, ...(role === "OWNER" || role === "ADMIN" ? {} : { authorId: userId }) };
    const note = await db.voiceNote.findFirst({ where });
    if (!note) throw new CrmError("Nota non disponibile");
    if (note.transcript.trim()) return NextResponse.json({ text: note.transcript });
    const lease = new Date();
    const claimed = await db.voiceNote.updateMany({ where: { ...where, transcript: "", OR: [{ transcribingAt: null }, { transcribingAt: { lt: new Date(Date.now() - 120000) } }] }, data: { transcribingAt: lease } });
    if (!claimed.count) throw new CrmError("Trascrizione già in corso. Attendi e aggiorna l’elenco.");
    try {
      await reserveVoiceAi(orgId);
      const text = await transcribeAudio(note.audio, note.mimeType);
      await featureAccess("write", "ai");
      await db.voiceNote.updateMany({ where: { ...where, transcribingAt: lease, transcript: "" }, data: { transcript: text, transcribingAt: null } });
      return NextResponse.json({ text });
    } finally {
      await db.voiceNote.updateMany({ where: { ...where, transcribingAt: lease }, data: { transcribingAt: null } });
    }
  } catch (error) { return NextResponse.json({ error: featureError(error) }, { status: 400 }); }
}
