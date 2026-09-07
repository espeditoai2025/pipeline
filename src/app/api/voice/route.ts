import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { featureAccess, featureError } from "@/lib/feature-access";
import { crmTransaction, CrmError } from "@/lib/crm-transaction";
import { getLimits } from "@/lib/plan";
import { MAX_VOICE_BYTES, MAX_VOICE_SECONDS, VOICE_STORAGE_BYTES, voiceMimeTypes, matchesAudioSignature } from "@/lib/voice";
import { withApiKeyRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await featureAccess("write");
    if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Origine non valida" }, { status: 403 });
    const limited = await withApiKeyRateLimit("voice:" + orgId); if (limited) return limited;
    if (Number(request.headers.get("content-length")) > MAX_VOICE_BYTES + 65536) return NextResponse.json({ error: "Audio troppo grande (massimo 3 MB)." }, { status: 413 });
    // Bound actual bytes as well: Content-Length is not trusted.
    const reader = request.body?.getReader(); if (!reader) throw new CrmError("Audio mancante");
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > MAX_VOICE_BYTES + 65536) { await reader.cancel(); throw new CrmError("Audio troppo grande (massimo 3 MB)."); } chunks.push(value); }
    const form = await new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData();
    const parsed = z.object({ id: z.uuid(), title: z.string().trim().min(1).max(200), duration: z.coerce.number().int().min(1).max(MAX_VOICE_SECONDS), dealId: z.string().max(100), contactId: z.string().max(100) }).safeParse(Object.fromEntries(form));
    if (!parsed.success) throw new CrmError("Dati della nota non validi.");
    const file = form.get("audio");
    if (!(file instanceof File) || !file.size || file.size > MAX_VOICE_BYTES) throw new CrmError("Audio non valido (massimo 3 MB).");
    const mimeType = file.type.split(";")[0] ?? ""; const audio = new Uint8Array(await file.arrayBuffer());
    if (!voiceMimeTypes[mimeType] || !matchesAudioSignature(audio, mimeType)) throw new CrmError("Formato audio non supportato.");
    const { id, title, duration, dealId, contactId } = parsed.data;
    if (dealId && contactId) throw new CrmError("Seleziona un solo collegamento.");
    await crmTransaction(async tx => {
      const existing = await tx.voiceNote.findUnique({ where: { id }, select: { organizationId: true, authorId: true } });
      if (existing) { if (existing.organizationId !== orgId || existing.authorId !== userId) throw new CrmError("Identificativo non disponibile"); return; }
      const member = await tx.user.findFirst({ where: { id: userId, organizationId: orgId, role: { in: ["OWNER", "ADMIN", "MANAGER", "SALES"] } } });
      if (!member) throw new CrmError("Permesso negato");
      const org = await tx.organization.findUniqueOrThrow({ where: { id: orgId }, select: { plan: true } });
      const usage = await tx.voiceNote.aggregate({ where: { organizationId: orgId }, _count: true, _sum: { byteSize: true } });
      if (usage._count >= getLimits(org.plan).maxVoiceNotes || (usage._sum.byteSize ?? 0) + audio.length > VOICE_STORAGE_BYTES) throw new CrmError("Spazio note vocali esaurito. Elimina le note che non servono piÃ¹.");
      if (dealId && !await tx.deal.findFirst({ where: { id: dealId, organizationId: orgId, status: { not: "DELETED" } } })) throw new CrmError("Affare non disponibile");
      if (contactId && !await tx.contact.findFirst({ where: { id: contactId, organizationId: orgId } })) throw new CrmError("Contatto non disponibile");
      await tx.voiceNote.create({ data: { id, title, duration, audio, byteSize: audio.length, mimeType, organizationId: orgId, authorId: userId, dealId: dealId || null, contactId: contactId || null } });
    });
    return NextResponse.json({ id });
  } catch (error) { return NextResponse.json({ error: featureError(error) }, { status: 400 }); }
}
