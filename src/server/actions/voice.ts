"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { featureAccess, featureError } from "@/lib/feature-access";
import { crmTransaction, CrmError } from "@/lib/crm-transaction";
import type { VoiceNoteSummary } from "@/lib/voice";

export async function listVoiceNotes(): Promise<{ data?: VoiceNoteSummary[]; error?: string }> {
  try {
    const { orgId } = await featureAccess();
    const rows = await db.voiceNote.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: "desc" }, take: 100,
      select: { id: true, title: true, mimeType: true, duration: true, transcript: true, dealId: true, contactId: true, authorId: true, createdAt: true,
        deal: { select: { title: true, status: true, organizationId: true } }, contact: { select: { firstName: true, lastName: true, organizationId: true } } } });
    return { data: rows.map(({ deal, contact, ...row }) => {
      const hasDeal = deal?.organizationId === orgId && deal.status !== "DELETED";
      const hasContact = contact?.organizationId === orgId;
      return { ...row, dealId: hasDeal ? row.dealId : null, contactId: hasContact ? row.contactId : null,
        targetName: hasDeal ? deal.title : hasContact ? [contact.firstName, contact.lastName].filter(Boolean).join(" ") : null,
        createdAt: row.createdAt.toISOString() };
    }) };
  } catch (error) { return { error: featureError(error) }; }
}

const detailsSchema = z.object({ id: z.string().min(1).max(100), title: z.string().trim().min(1).max(200), kind: z.enum(["deal", "contact", "none"]), targetId: z.string().max(100) }).strict();
export async function updateVoiceNoteDetails(input: z.infer<typeof detailsSchema>) {
  try {
    const { orgId, userId } = await featureAccess("write");
    const parsed = detailsSchema.safeParse(input);
    if (!parsed.success) throw new CrmError("Titolo o collegamento non validi.");
    const { id, title, kind, targetId } = parsed.data;
    await crmTransaction(async tx => {
      const member = await tx.user.findFirst({ where: { id: userId, organizationId: orgId, role: { in: ["OWNER", "ADMIN", "MANAGER", "SALES"] } }, select: { role: true } });
      if (!member) throw new CrmError("Permesso negato.");
      if (kind === "deal" && !await tx.deal.findFirst({ where: { id: targetId, organizationId: orgId, status: { not: "DELETED" } } })) throw new CrmError("Affare non disponibile.");
      if (kind === "contact" && !await tx.contact.findFirst({ where: { id: targetId, organizationId: orgId } })) throw new CrmError("Contatto non disponibile.");
      const changed = await tx.voiceNote.updateMany({ where: { id, organizationId: orgId, ...(member.role === "OWNER" || member.role === "ADMIN" ? {} : { authorId: userId }) }, data: { title, dealId: kind === "deal" ? targetId : null, contactId: kind === "contact" ? targetId : null } });
      if (!changed.count) throw new CrmError("Nota non disponibile o permesso negato.");
    });
    revalidatePath("/voice"); return { ok: true };
  } catch (error) { return { error: featureError(error) }; }
}

export async function saveVoiceTranscript(id: string, transcript: string) {
  try {
    const { orgId, userId, role } = await featureAccess("write");
    if (!z.string().min(1).max(100).safeParse(id).success || !z.string().max(12000).safeParse(transcript).success) throw new CrmError("Testo non valido (massimo 12.000 caratteri).");
    const result = await db.voiceNote.updateMany({ where: { id, organizationId: orgId, ...(role === "OWNER" || role === "ADMIN" ? {} : { authorId: userId }), OR: [{ transcribingAt: null }, { transcribingAt: { lt: new Date(Date.now() - 120000) } }] }, data: { transcript } });
    if (!result.count) throw new CrmError("Nota non modificabile o trascrizione in corso.");
    revalidatePath("/voice"); return { ok: true };
  } catch (error) { return { error: featureError(error) }; }
}

export async function deleteVoiceNote(id: string) {
  try {
    const { orgId, userId, role } = await featureAccess("write");
    const result = await db.voiceNote.deleteMany({ where: { id, organizationId: orgId, ...(role === "OWNER" || role === "ADMIN" ? {} : { authorId: userId }) } });
    if (!result.count) throw new CrmError("Nota non disponibile o permesso negato.");
    revalidatePath("/voice"); return { ok: true };
  } catch (error) { return { error: featureError(error) }; }
}

export async function searchVoiceTargets(query: string) {
  try {
    const { orgId } = await featureAccess();
    if (typeof query !== "string" || query.length > 200) throw new CrmError("Ricerca non valida");
    const [deals, contacts] = await Promise.all([
      db.deal.findMany({ where: { organizationId: orgId, status: { not: "DELETED" }, title: { contains: query, mode: "insensitive" } }, select: { id: true, title: true }, orderBy: { updatedAt: "desc" }, take: 20 }),
      db.contact.findMany({ where: { organizationId: orgId, OR: [{ firstName: { contains: query, mode: "insensitive" } }, { lastName: { contains: query, mode: "insensitive" } }] }, select: { id: true, firstName: true, lastName: true }, orderBy: { updatedAt: "desc" }, take: 20 }),
    ]);
    return { data: [...deals.map(row => ({ id: row.id, kind: "deal" as const, name: row.title })), ...contacts.map(row => ({ id: row.id, kind: "contact" as const, name: [row.firstName, row.lastName].filter(Boolean).join(" ") }))] };
  } catch (error) { return { error: featureError(error) }; }
}
