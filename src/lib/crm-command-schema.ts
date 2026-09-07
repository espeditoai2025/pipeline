import { z } from "zod";
export const crmCommandActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("CREATE_NOTE"), content: z.string().trim().min(1).max(6000) }).strict(),
  z.object({ type: z.literal("CREATE_ACTIVITY"), subject: z.string().trim().min(1).max(200), activityType: z.enum(["CALL", "MEETING", "EMAIL", "TASK", "DEADLINE", "LUNCH"]), dueLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/), notes: z.string().max(2000).default("") }).strict(),
  z.object({ type: z.literal("UPDATE_DEAL"), status: z.enum(["OPEN", "WON", "LOST"]).optional(), value: z.number().finite().min(0).max(999999999999).optional(), stageId: z.string().max(100).optional() }).strict().refine(row => row.status !== undefined || row.value !== undefined || row.stageId, "Nessuna modifica richiesta"),
]);
export const crmProposalSchema = z.object({ actions: z.array(crmCommandActionSchema).min(1).max(5) }).strict();
export type CrmProposal = z.infer<typeof crmProposalSchema>;
export type CrmCommandPreview = { id: string; targetName: string; actions: string[]; expiresAt: string };

export function italianLocalDateTime(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("Data non valida");
  const target = new Date(value + ":00Z");
  if (!Number.isFinite(target.getTime()) || target.toISOString().slice(0, 16) !== value) throw new Error("Data non valida");
  const formatter = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  let result = target;
  for (let i = 0; i < 3; i++) {
    const local = formatter.format(result).replace(" ", "T");
    result = new Date(result.getTime() + target.getTime() - new Date(local + ":00Z").getTime());
  }
  if (formatter.format(result).replace(" ", "T") !== value) throw new Error("Orario inesistente per il cambio dell’ora in Italia");
  return result;
}
