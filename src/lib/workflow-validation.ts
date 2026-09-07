import { db } from "@/lib/db";
import type { z } from "zod";
import type { workflowSchema } from "@/lib/workflow-schema";

export async function validateWorkflowReferences(
  orgId: string,
  config: z.infer<typeof workflowSchema>,
): Promise<string | null> {
  let pipelineId: string | undefined;
  for (const stageId of [config.trigger.fromStageId, config.trigger.toStageId]) {
    if (!stageId) continue;
    const stage = await db.stage.findFirst({
      where: { id: stageId, pipeline: { organizationId: orgId } },
      select: { pipelineId: true },
    });
    if (!stage) return "Fase del trigger non disponibile nella tua organizzazione";
    if (pipelineId && pipelineId !== stage.pipelineId)
      return "Le fasi del trigger devono appartenere alla stessa pipeline";
    pipelineId = stage.pipelineId;
  }
  for (const step of config.steps) {
    const action = step.action;
    if (
      action.type === "SEND_EMAIL" &&
      !(await db.emailTemplate.findFirst({
        where: { id: action.templateId, organizationId: orgId },
        select: { id: true },
      }))
    )
      return "Template email non disponibile";
    if (
      action.type === "ASSIGN_OWNER" &&
      !(await db.user.findFirst({
        where: { id: action.userId, organizationId: orgId },
        select: { id: true },
      }))
    )
      return "Responsabile non disponibile nella tua organizzazione";
    if (
      action.type === "UPDATE_DEAL_STAGE" &&
      !(await db.stage.findFirst({
        where: {
          id: action.stageId,
          ...(pipelineId ? { pipelineId } : {}),
          pipeline: { organizationId: orgId },
        },
        select: { id: true },
      }))
    )
      return "Fase dell'azione non disponibile nella pipeline selezionata";
  }
  return null;
}
