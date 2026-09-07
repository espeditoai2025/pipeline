import { z } from "zod";

const id = z.string().trim().min(1, "Seleziona un valore").max(200);
const trigger = z.object({
  type: z.enum([
    "DEAL_CREATED",
    "DEAL_STAGE_CHANGED",
    "DEAL_WON",
    "DEAL_LOST",
    "CONTACT_CREATED",
    "ACTIVITY_OVERDUE",
    "LEAD_CREATED",
    "DEAL_VALUE_CHANGED",
  ]),
  fromStageId: id.optional(),
  toStageId: id.optional(),
  minValue: z.number().finite().nonnegative().optional(),
});
export const workflowStepSchema = z.object({
  id,
  action: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("SEND_EMAIL"),
      templateId: id,
      to: z.enum(["contact", "owner", "lead"]).or(z.string().email()),
    }),
    z.object({
      type: z.literal("CREATE_ACTIVITY"),
      activityType: z.enum(["CALL", "MEETING", "TASK", "DEADLINE", "EMAIL", "LUNCH"]),
      subject: z.string().trim().min(1).max(300),
      dueDays: z.number().int().min(0).max(365),
    }),
    z.object({ type: z.literal("UPDATE_DEAL_STAGE"), stageId: id }),
    z.object({ type: z.literal("ASSIGN_OWNER"), userId: id }),
    z.object({
      type: z.literal("SEND_NOTIFICATION"),
      message: z.string().trim().min(1).max(2000),
      to: z.enum(["owner", "team"]).optional(),
    }),
    z.object({ type: z.literal("WAIT"), days: z.number().int().min(1).max(365) }),
  ]),
});
export const workflowSchema = z
  .object({
    name: z.string().trim().min(1, "Nome obbligatorio").max(200),
    description: z.string().max(2000).optional(),
    trigger,
    triggerOnImport: z.boolean().optional(),
    steps: z.array(workflowStepSchema).min(1, "Almeno un'azione richiesta").max(30),
  })
  .superRefine((value, ctx) => {
    if (new Set(value.steps.map((s) => s.id)).size !== value.steps.length)
      ctx.addIssue({
        code: "custom",
        path: ["steps"],
        message: "Ogni azione deve avere un identificatore diverso",
      });
    if (
      (value.trigger.fromStageId || value.trigger.toStageId) &&
      value.trigger.type !== "DEAL_STAGE_CHANGED"
    )
      ctx.addIssue({
        code: "custom",
        path: ["trigger"],
        message: "I filtri di fase richiedono il trigger cambio fase",
      });
    if (value.trigger.minValue !== undefined && value.trigger.type !== "DEAL_VALUE_CHANGED")
      ctx.addIssue({
        code: "custom",
        path: ["trigger"],
        message: "La soglia richiede il trigger variazione valore",
      });
    for (const [index, step] of value.steps.entries()) {
      const dealTrigger = value.trigger.type.startsWith("DEAL_");
      if (step.action.type === "UPDATE_DEAL_STAGE" && !dealTrigger)
        ctx.addIssue({
          code: "custom",
          path: ["steps", index],
          message: "Lo spostamento di fase richiede un evento su un affare",
        });
      if (step.action.type === "ASSIGN_OWNER" && value.trigger.type === "ACTIVITY_OVERDUE")
        ctx.addIssue({
          code: "custom",
          path: ["steps", index],
          message: "La riassegnazione richiede un affare, contatto o lead",
        });
      if (
        step.action.type === "SEND_EMAIL" &&
        step.action.to === "lead" &&
        value.trigger.type !== "LEAD_CREATED"
      )
        ctx.addIssue({
          code: "custom",
          path: ["steps", index],
          message: "Il destinatario lead richiede Nuovo lead",
        });
      if (
        step.action.type === "SEND_EMAIL" &&
        step.action.to === "contact" &&
        value.trigger.type === "LEAD_CREATED"
      )
        ctx.addIssue({
          code: "custom",
          path: ["steps", index],
          message: "Per Nuovo lead scegli il destinatario lead o responsabile",
        });
    }
  });
