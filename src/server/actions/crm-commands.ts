"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { chatCompletion } from "@/lib/openrouter";
import { crmCommandMessages } from "@/lib/crm-command-prompt";
import { featureAccess, featureError } from "@/lib/feature-access";
import { crmTransaction, CrmError } from "@/lib/crm-transaction";
import { checkFeature } from "@/lib/plan";
import { reserveVoiceAi } from "@/lib/voice-ai";
import { crmProposalSchema, italianLocalDateTime, type CrmCommandPreview } from "@/lib/crm-command-schema";
import { enqueueDealChanges } from "@/lib/workflow-events";
import { wakeWorkflows } from "@/lib/workflow-wake";
import { dispatchWebhook } from "@/lib/webhook-delivery";
import type { Prisma } from "@/generated/prisma/client";

const inputSchema = z.object({ text: z.string().trim().min(3).max(6000), kind: z.enum(["deal", "contact"]), targetId: z.string().min(1).max(100) });
const contextSchema = z.object({ kind: z.enum(["deal", "contact"]), id: z.string(), name: z.string(), version: z.string(), currency: z.string(), stages: z.array(z.object({ id: z.string(), name: z.string() })) });

export async function prepareCrmCommand(input: z.infer<typeof inputSchema>): Promise<{ data?: CrmCommandPreview; error?: string }> {
  try {
    const { orgId, userId } = await featureAccess("write", "ai");
    const parsed = inputSchema.safeParse(input); if (!parsed.success) throw new CrmError("Scegli un contatto o un affare e scrivi il comando.");
    const { kind, targetId, text } = parsed.data;
    const deal = kind === "deal" ? await db.deal.findFirst({ where: { id: targetId, organizationId: orgId, status: { not: "DELETED" } }, include: { pipeline: { select: { stages: { select: { id: true, name: true }, orderBy: { position: "asc" } } } } } }) : null;
    const contact = kind === "contact" ? await db.contact.findFirst({ where: { id: targetId, organizationId: orgId } }) : null;
    if (!deal && !contact) throw new CrmError("Destinatario non disponibile.");
    const context = { kind, id: targetId, name: deal?.title ?? [contact?.firstName, contact?.lastName].filter(Boolean).join(" "), version: (deal?.updatedAt ?? contact!.updatedAt).toISOString(), currency: deal?.currency ?? "EUR", stages: deal?.pipeline.stages ?? [] };
    await reserveVoiceAi(orgId);
    const raw = await chatCompletion(crmCommandMessages(text, context), { maxTokens: 2200, temperature: 0, retries: 0, timeoutMs: 45000 });
    let json: unknown; try { json = JSON.parse(raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")); } catch { throw new CrmError("Comando non riconosciuto. Specifica una nota, unâ€™attivitÃ  con data o una modifica allâ€™affare selezionato."); }
    const proposal = crmProposalSchema.safeParse(json);
    if (!proposal.success) throw new CrmError("Comando non riconosciuto o ambiguo. Specifica lâ€™operazione per il record selezionato.");
    const actions = proposal.data.actions.map(action => {
      if (action.type === "CREATE_NOTE") return "Aggiungi nota: " + action.content;
      if (action.type === "CREATE_ACTIVITY") {
        let due: Date; try { due = italianLocalDateTime(action.dueLocal); } catch { throw new CrmError("La data proposta non Ã¨ valida. Specifica data e ora nel comando."); }
        return "Crea attivitÃ  " + action.activityType + ": " + action.subject + " â€” " + due.toLocaleString("it-IT", { timeZone: "Europe/Rome" }) + " (ora italiana), assegnata a te" + (action.notes ? ". Note: " + action.notes : "");
      }
      if (!deal) throw new CrmError("Le modifiche allâ€™affare richiedono la selezione di un affare.");
      const stage = action.stageId ? context.stages.find(stage => stage.id === action.stageId) : null;
      if (action.stageId && !stage) throw new CrmError("Fase non disponibile nella pipeline dellâ€™affare.");
      return "Aggiorna affare: " + [action.status ? "stato " + ({ OPEN: "Aperto", WON: "Vinto", LOST: "Perso" }[action.status]) : "", action.value !== undefined ? "valore " + action.value + " " + context.currency : "", stage ? "fase " + stage.name : ""].filter(Boolean).join(", ");
    });
    await featureAccess("write", "ai");
    const command = await db.crmCommand.create({ data: { organizationId: orgId, authorId: userId, input: text, proposal: proposal.data as Prisma.InputJsonValue, context, expiresAt: new Date(Date.now() + 600000) } });
    return { data: { id: command.id, targetName: context.name, actions, expiresAt: command.expiresAt.toISOString() } };
  } catch (error) { return { error: featureError(error) }; }
}

export async function executeCrmCommand(id: string) {
  try {
    const { orgId, userId } = await featureAccess("write", "ai");
    if (typeof id !== "string" || id.length > 100) throw new CrmError("Comando non valido");
    const result = await crmTransaction(async tx => {
      const member = await tx.user.findFirst({ where: { id: userId, organizationId: orgId, role: { in: ["OWNER", "ADMIN", "MANAGER", "SALES"] } }, include: { organization: { select: { plan: true } } } });
      if (!member || checkFeature(member.organization.plan, "ai")) throw new CrmError("Permesso o piano non piÃ¹ disponibile.");
      await tx.$queryRaw`SELECT id FROM "CrmCommand" WHERE id = ${id} AND "organizationId" = ${orgId} AND "authorId" = ${userId} FOR UPDATE`;
      const command = await tx.crmCommand.findFirst({ where: { id, organizationId: orgId, authorId: userId } });
      if (!command) throw new CrmError("Comando non disponibile");
      if (command.executedAt) return { duplicate: true, targetId: "", count: 0, records: [] as { type: string; id: string }[] };
      if (command.expiresAt < new Date()) throw new CrmError("Anteprima scaduta. Interpreta nuovamente il comando.");
      const context = contextSchema.parse(command.context); const proposal = crmProposalSchema.parse(command.proposal);
      let deal = context.kind === "deal" ? await tx.deal.findFirst({ where: { id: context.id, organizationId: orgId, status: { not: "DELETED" } } }) : null;
      const contact = context.kind === "contact" ? await tx.contact.findFirst({ where: { id: context.id, organizationId: orgId } }) : null;
      if ((!deal && !contact) || (deal?.updatedAt ?? contact!.updatedAt).toISOString() !== context.version) throw new CrmError("Il record Ã¨ cambiato dopo lâ€™anteprima. Interpreta nuovamente il comando.");
      const links = { dealId: deal?.id ?? null, contactId: contact?.id ?? null };
      const records: { type: string; id: string }[] = [];
      for (const action of proposal.actions) {
        if (action.type === "CREATE_NOTE") {
          const row = await tx.note.create({ data: { content: action.content, authorId: userId, ...links } }); records.push({ type: action.type, id: row.id });
        } else if (action.type === "CREATE_ACTIVITY") {
          const row = await tx.activity.create({ data: { type: action.activityType, subject: action.subject, notes: action.notes, dueDate: italianLocalDateTime(action.dueLocal), userId, organizationId: orgId, ...links } }); records.push({ type: action.type, id: row.id });
        } else {
          if (!deal) throw new CrmError("Affare non disponibile");
          if (action.stageId && !await tx.stage.findFirst({ where: { id: action.stageId, pipelineId: deal.pipelineId, pipeline: { organizationId: orgId } } })) throw new CrmError("Fase non disponibile");
          const previous = deal;
          deal = await tx.deal.update({ where: { id: deal.id, organizationId: orgId, updatedAt: deal.updatedAt }, data: {
            value: action.value, status: action.status, stageId: action.stageId,
            ...(action.status && action.status !== deal.status ? { closedAt: action.status === "OPEN" ? null : new Date(), lostReason: null } : {}),
          } });
          await enqueueDealChanges(tx, orgId, previous, deal);
          records.push({ type: action.type, id: deal.id });
        }
      }
      await tx.crmCommand.update({ where: { id }, data: { executedAt: new Date(), result: { records } } });
      return { duplicate: false, targetId: context.id, count: records.length, records };
    });
    if (!result.duplicate) {
      wakeWorkflows(orgId);
      for (const record of result.records) {
        if (record.type === "UPDATE_DEAL") dispatchWebhook(orgId, "deal.updated", { id: record.id, source: "crm-command", commandId: id }).catch(() => {});
        if (record.type === "CREATE_ACTIVITY") dispatchWebhook(orgId, "activity.created", { id: record.id, source: "crm-command", commandId: id }).catch(() => {});
      }
    }
    for (const path of ["/voice", "/deals", "/contacts", "/activities", "/dashboard"]) revalidatePath(path, "layout");
    return { ok: true, message: result.duplicate ? "Comando giÃ  eseguito, nessuna modifica duplicata." : "Comando eseguito: " + result.count + " operazioni." };
  } catch (error) { return { error: featureError(error) }; }
}
