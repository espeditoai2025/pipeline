"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { MOCK_WORKFLOWS } from "@/lib/mock-workflows";
import type { Workflow, TriggerConfig, WorkflowStep } from "@/types/workflows";

const triggerSchema = z.object({
  type: z.enum(["DEAL_CREATED", "DEAL_STAGE_CHANGED", "DEAL_WON", "DEAL_LOST", "CONTACT_CREATED", "ACTIVITY_OVERDUE", "LEAD_CREATED", "DEAL_VALUE_CHANGED"]),
  toStageId: z.string().optional(),
  fromStageId: z.string().optional(),
  minValue: z.number().optional(),
});

const stepActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("SEND_EMAIL"), templateId: z.string(), to: z.string() }),
  z.object({ type: z.literal("CREATE_ACTIVITY"), activityType: z.string(), subject: z.string(), dueDays: z.number() }),
  z.object({ type: z.literal("UPDATE_DEAL_STAGE"), stageId: z.string() }),
  z.object({ type: z.literal("ASSIGN_OWNER"), userId: z.string() }),
  z.object({ type: z.literal("SEND_NOTIFICATION"), message: z.string() }),
  z.object({ type: z.literal("WAIT"), days: z.number() }),
]);

const stepSchema = z.object({
  id: z.string(),
  action: stepActionSchema,
  delayDays: z.number().optional(),
});

const workflowSchema = z.object({
  name: z.string().min(1, "Nome obbligatorio"),
  description: z.string().optional(),
  trigger: triggerSchema,
  steps: z.array(stepSchema).min(1, "Almeno un'azione richiesta"),
});

export async function createWorkflow(input: z.infer<typeof workflowSchema>): Promise<{ data: Workflow | null; error: string | null }> {
  const session = await auth();
  if (!session) return { data: null, error: "Non autorizzato" };

  const parsed = workflowSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  // TODO: real DB insert
  const workflow: Workflow = {
    id: `wf-${Date.now()}`,
    name: parsed.data.name,
    description: parsed.data.description ?? "",
    isActive: false,
    trigger: parsed.data.trigger as TriggerConfig,
    steps: parsed.data.steps as WorkflowStep[],
    organizationId: "org-1",
    executionCount: 0,
    lastRunAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  revalidatePath("/automations");
  return { data: workflow, error: null };
}

export async function updateWorkflow(input: z.infer<typeof workflowSchema> & { id: string }): Promise<{ data: Workflow | null; error: string | null }> {
  const session = await auth();
  if (!session) return { data: null, error: "Non autorizzato" };

  const parsed = workflowSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  const existing = MOCK_WORKFLOWS.find((w) => w.id === input.id);
  if (!existing) return { data: null, error: "Automazione non trovata" };

  // TODO: real DB update
  const updated: Workflow = {
    ...existing,
    name: parsed.data.name,
    description: parsed.data.description ?? "",
    trigger: parsed.data.trigger as TriggerConfig,
    steps: parsed.data.steps as WorkflowStep[],
    updatedAt: new Date().toISOString(),
  };

  revalidatePath("/automations");
  return { data: updated, error: null };
}

export async function toggleWorkflow(id: string, isActive: boolean): Promise<{ error: string | null }> {
  const session = await auth();
  if (!session) return { error: "Non autorizzato" };

  // TODO: real DB update
  revalidatePath("/automations");
  return { error: null };
}

export async function deleteWorkflow(id: string): Promise<{ error: string | null }> {
  const session = await auth();
  if (!session) return { error: "Non autorizzato" };

  // TODO: real DB delete
  revalidatePath("/automations");
  return { error: null };
}

export async function testWorkflow(id: string): Promise<{ stepsRun: number; log: string[]; error: string | null }> {
  const session = await auth();
  if (!session) return { stepsRun: 0, log: [], error: "Non autorizzato" };

  const workflow = MOCK_WORKFLOWS.find((w) => w.id === id);
  if (!workflow) return { stepsRun: 0, log: [], error: "Automazione non trovata" };

  // Simulate execution
  const log: string[] = [`[${new Date().toLocaleTimeString("it-IT")}] Trigger: ${workflow.trigger.type}`];
  let stepsRun = 0;

  for (const step of workflow.steps) {
    const { action } = step;
    let msg = "";
    switch (action.type) {
      case "SEND_EMAIL":       msg = `Invio email (template: ${action.templateId}) a ${action.to}`; break;
      case "CREATE_ACTIVITY":  msg = `Crea attività "${action.subject}" (${action.activityType}) tra ${action.dueDays} giorni`; break;
      case "UPDATE_DEAL_STAGE": msg = `Sposta affare a stage ${action.stageId}`; break;
      case "ASSIGN_OWNER":     msg = `Assegna proprietario ${action.userId}`; break;
      case "SEND_NOTIFICATION": msg = `Notifica: "${action.message}"`; break;
      case "WAIT":             msg = `Attendi ${action.days} giorni`; break;
    }
    log.push(`[${new Date().toLocaleTimeString("it-IT")}] Step ${stepsRun + 1}: ${msg} ✓`);
    stepsRun++;
  }

  log.push(`[${new Date().toLocaleTimeString("it-IT")}] Completato: ${stepsRun} step eseguiti`);
  return { stepsRun, log, error: null };
}
