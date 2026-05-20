"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Workflow, TriggerConfig, WorkflowStep } from "@/types/workflows";
import { getOrgPlan, checkFeature } from "@/lib/plan";

function getOrgId(s: Session | null) {
  return (s?.user as { organizationId?: string } | undefined)?.organizationId ?? null;
}

function mapWorkflow(row: {
  id: string; name: string; description: string | null; isActive: boolean;
  trigger: unknown; steps: unknown; organizationId: string; createdAt: Date; updatedAt: Date;
  _count?: { executions: number };
  executions?: { startedAt: Date }[];
}): Workflow {
  const lastExec = row.executions?.[0]?.startedAt ?? null;
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    isActive: row.isActive,
    trigger: row.trigger as TriggerConfig,
    steps: row.steps as WorkflowStep[],
    organizationId: row.organizationId,
    executionCount: row._count?.executions ?? 0,
    lastRunAt: lastExec?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

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

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getWorkflows(): Promise<Workflow[]> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return [];

  const rows = await db.workflow.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { executions: true } },
      executions: { orderBy: { startedAt: "desc" }, take: 1, select: { startedAt: true } },
    },
  });
  return rows.map(mapWorkflow);
}

export async function getWorkflowLogs() {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return [];

  const rows = await db.workflowExecution.findMany({
    where: { workflow: { organizationId: orgId } },
    orderBy: { startedAt: "desc" },
    take: 100,
    include: { workflow: { select: { name: true } } },
  });

  return rows.map((r) => ({
    id: r.id,
    workflowId: r.workflowId,
    workflowName: r.workflow.name,
    status: r.status as "SUCCESS" | "FAILED" | "SKIPPED",
    trigger: (r.payload as Record<string, unknown>)?.trigger as string ?? "—",
    entityType: ((r.payload as Record<string, unknown>)?.entityType as "deal" | "contact" | "activity" | "lead") ?? "deal",
    entityId: (r.payload as Record<string, unknown>)?.entityId as string ?? "",
    entityLabel: (r.payload as Record<string, unknown>)?.entityLabel as string ?? "",
    stepsExecuted: Array.isArray(r.logs) ? r.logs.length : 0,
    error: r.status === "FAILED" ? ((r.payload as Record<string, unknown>)?.error as string ?? null) : null,
    executedAt: r.startedAt.toISOString(),
  }));
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createWorkflow(input: z.infer<typeof workflowSchema>): Promise<{ data: Workflow | null; error: string | null }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!session || !orgId) return { data: null, error: "Non autorizzato" };

  const parsed = workflowSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  const plan = await getOrgPlan(orgId);
  const featureError = checkFeature(plan, "automations");
  if (featureError) return { data: null, error: featureError };

  const row = await db.workflow.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      trigger: parsed.data.trigger,
      steps: parsed.data.steps,
      organizationId: orgId,
    },
    include: { _count: { select: { executions: true } }, executions: { take: 1, orderBy: { startedAt: "desc" }, select: { startedAt: true } } },
  });

  revalidatePath("/automations");
  return { data: mapWorkflow(row), error: null };
}

export async function updateWorkflow(input: z.infer<typeof workflowSchema> & { id: string }): Promise<{ data: Workflow | null; error: string | null }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!session || !orgId) return { data: null, error: "Non autorizzato" };

  const parsed = workflowSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  const row = await db.workflow.update({
    where: { id: input.id, organizationId: orgId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      trigger: parsed.data.trigger,
      steps: parsed.data.steps,
    },
    include: { _count: { select: { executions: true } }, executions: { take: 1, orderBy: { startedAt: "desc" }, select: { startedAt: true } } },
  });

  revalidatePath("/automations");
  return { data: mapWorkflow(row), error: null };
}

export async function toggleWorkflow(id: string, isActive: boolean): Promise<{ error: string | null }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  await db.workflow.update({ where: { id, organizationId: orgId }, data: { isActive } });
  revalidatePath("/automations");
  return { error: null };
}

export async function deleteWorkflow(id: string): Promise<{ error: string | null }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  await db.workflow.delete({ where: { id, organizationId: orgId } });
  revalidatePath("/automations");
  return { error: null };
}

export async function testWorkflow(id: string): Promise<{ stepsRun: number; log: string[]; error: string | null }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { stepsRun: 0, log: [], error: "Non autorizzato" };

  const workflow = await db.workflow.findFirst({ where: { id, organizationId: orgId } });
  if (!workflow) return { stepsRun: 0, log: [], error: "Automazione non trovata" };

  const steps = workflow.steps as WorkflowStep[];
  const trigger = workflow.trigger as TriggerConfig;
  const log: string[] = [
    `[${new Date().toLocaleTimeString("it-IT")}] VALIDAZIONE — trigger: ${trigger.type}`,
    `[${new Date().toLocaleTimeString("it-IT")}] (Nessuna email inviata, nessun dato modificato)`,
  ];
  let stepsRun = 0;
  let hasError = false;

  for (const step of steps) {
    const { action } = step;
    const stepNum = stepsRun + 1;
    let msg = "";
    let warn = "";

    switch (action.type) {
      case "SEND_EMAIL": {
        const tpl = await db.emailTemplate.findFirst({ where: { id: action.templateId, organizationId: orgId } });
        if (!tpl) {
          msg = `ERRORE: template "${action.templateId}" non trovato`;
          hasError = true;
        } else {
          msg = `✓ Invio email (template: "${tpl.name}") a ${action.to}`;
        }
        break;
      }
      case "CREATE_ACTIVITY":
        msg = `✓ Crea attività "${action.subject}" (${action.activityType}) tra ${action.dueDays ?? 0}gg`;
        break;
      case "UPDATE_DEAL_STAGE": {
        const stage = await db.stage.findFirst({ where: { id: action.stageId, pipeline: { organizationId: orgId } } });
        if (!stage) {
          msg = `ERRORE: stage "${action.stageId}" non trovato`;
          hasError = true;
        } else {
          msg = `✓ Sposta affare a stage "${stage.name}"`;
        }
        break;
      }
      case "ASSIGN_OWNER": {
        const user = await db.user.findFirst({ where: { id: action.userId, organizationId: orgId } });
        if (!user) {
          msg = `ERRORE: utente "${action.userId}" non trovato nell'organizzazione`;
          hasError = true;
        } else {
          msg = `✓ Assegna proprietario a ${user.name ?? user.email}`;
        }
        break;
      }
      case "SEND_NOTIFICATION":
        msg = `✓ Notifica: "${action.message}"`;
        break;
      case "WAIT":
        msg = `⚠ Attendi ${action.days} giorni (i delay vengono ignorati — eseguito immediatamente)`;
        warn = "warning";
        break;
    }

    const prefix = hasError ? "ERRORE" : warn === "warning" ? "⚠" : "✓";
    log.push(`[${new Date().toLocaleTimeString("it-IT")}] Step ${stepNum}: ${msg}`);
    if (hasError) break;
    stepsRun++;
    void prefix;
  }

  const status = hasError ? "FAILED" : "SUCCESS";
  log.push(`[${new Date().toLocaleTimeString("it-IT")}] Validazione ${status}: ${stepsRun}/${steps.length} step validi`);

  await db.workflowExecution.create({
    data: {
      workflowId: id,
      status,
      payload: { trigger: trigger.type, entityType: "deal", entityId: "test", entityLabel: "Validazione manuale" },
      logs: log,
      finishedAt: new Date(),
    },
  });

  revalidatePath("/automations");
  return { stepsRun, log, error: hasError ? "Automazione non valida — controlla gli errori nel log" : null };
}
