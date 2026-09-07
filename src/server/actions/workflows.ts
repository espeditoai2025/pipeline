"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { crmPermissionError } from "@/lib/crm-permissions";
import { getOrgPlan, checkFeature } from "@/lib/plan";
import { workflowSchema } from "@/lib/workflow-schema";
import { validateWorkflowReferences } from "@/lib/workflow-validation";
import { workflowEntity, type WorkflowPayload } from "@/lib/workflow-events";
import { wakeWorkflows } from "@/lib/workflow-wake";
import type {
  Workflow,
  WorkflowLog,
  LogStatus,
  TriggerConfig,
  WorkflowStep,
} from "@/types/workflows";
import type { Workflow as WorkflowRow } from "@/generated/prisma/client";

function orgIdOf(session: import("next-auth").Session | null) {
  return (session?.user as { organizationId?: string } | undefined)?.organizationId ?? null;
}
function mapWorkflow(
  row: WorkflowRow & { _count?: { executions: number }; executions?: { startedAt: Date }[] },
): Workflow {
  return {
    ...row,
    description: row.description ?? "",
    trigger: row.trigger as TriggerConfig,
    steps: row.steps as WorkflowStep[],
    executionCount: row._count?.executions ?? 0,
    lastRunAt: row.executions?.[0]?.startedAt.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
const include = {
  _count: { select: { executions: { where: { status: { not: "VALIDATION" } } } } },
  executions: {
    where: { status: { not: "VALIDATION" } },
    orderBy: { startedAt: "desc" as const },
    take: 1,
    select: { startedAt: true },
  },
};

async function writeGuard() {
  const session = await auth();
  const orgId = orgIdOf(session);
  const error = await crmPermissionError(session, "manage");
  if (!orgId || error) return { orgId: null, error: error ?? "Non autorizzato" };
  return { orgId, error: null };
}

export async function getWorkflows(): Promise<Workflow[]> {
  const orgId = orgIdOf(await auth());
  if (!orgId) return [];
  return (
    await db.workflow.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      include,
    })
  ).map(mapWorkflow);
}

export async function getWorkflowChoices() {
  const orgId = orgIdOf(await auth());
  if (!orgId) return { stages: [], users: [] };
  const [stages, users] = await Promise.all([
    db.stage.findMany({
      where: { pipeline: { organizationId: orgId } },
      select: { id: true, name: true, pipelineId: true, pipeline: { select: { name: true } } },
      orderBy: [{ pipelineId: "asc" }, { position: "asc" }],
    }),
    db.user.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return {
    stages: stages.map((s) => ({
      id: s.id,
      pipelineId: s.pipelineId,
      name: s.pipeline.name + " · " + s.name,
    })),
    users: users.map((u) => ({ id: u.id, name: u.name ?? u.email })),
  };
}

export async function createWorkflow(
  input: z.input<typeof workflowSchema>,
): Promise<{ data: Workflow | null; error: string | null }> {
  const guard = await writeGuard();
  if (!guard.orgId || guard.error) return { data: null, error: guard.error };
  const parsed = workflowSchema.safeParse(input);
  if (!parsed.success)
    return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  const error =
    checkFeature(await getOrgPlan(guard.orgId), "automations") ??
    (await validateWorkflowReferences(guard.orgId, parsed.data));
  if (error) return { data: null, error };
  const row = await db.workflow.create({
    data: {
      ...parsed.data,
      organizationId: guard.orgId,
      triggerOnImport: parsed.data.triggerOnImport ?? false,
    },
    include,
  });
  revalidatePath("/automations");
  return { data: mapWorkflow(row), error: null };
}

export async function updateWorkflow(
  input: z.input<typeof workflowSchema> & { id: string; updatedAt?: string },
): Promise<{ data: Workflow | null; error: string | null }> {
  const guard = await writeGuard();
  if (!guard.orgId || guard.error) return { data: null, error: guard.error };
  const parsed = workflowSchema.safeParse(input);
  if (!parsed.success)
    return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  const error =
    checkFeature(await getOrgPlan(guard.orgId), "automations") ??
    (await validateWorkflowReferences(guard.orgId, parsed.data));
  if (error) return { data: null, error };
  try {
    const row = await db.workflow.update({
      where: {
        id: input.id,
        organizationId: guard.orgId,
        ...(input.updatedAt ? { updatedAt: new Date(input.updatedAt) } : {}),
      },
      data: parsed.data,
      include,
    });
    revalidatePath("/automations");
    return { data: mapWorkflow(row), error: null };
  } catch {
    return { data: null, error: "Automazione modificata o non disponibile. Aggiorna la pagina." };
  }
}

export async function toggleWorkflow(
  id: string,
  isActive: boolean,
): Promise<{ error: string | null }> {
  const guard = await writeGuard();
  if (!guard.orgId || guard.error) return { error: guard.error };
  if (typeof isActive !== "boolean") return { error: "Stato non valido" };
  if (isActive) {
    const error = checkFeature(await getOrgPlan(guard.orgId), "automations");
    if (error) return { error };
    const row = await db.workflow.findFirst({ where: { id, organizationId: guard.orgId } });
    const parsed = workflowSchema.safeParse(
      row ? { ...row, description: row.description ?? undefined } : null,
    );
    if (!parsed.success)
      return {
        error: "Configurazione non valida: modifica e valida l'automazione prima di attivarla",
      };
    const referenceError = await validateWorkflowReferences(guard.orgId, parsed.data);
    if (referenceError) return { error: referenceError };
  }
  await db.workflow.update({ where: { id, organizationId: guard.orgId }, data: { isActive } });
  revalidatePath("/automations");
  return { error: null };
}

export async function deleteWorkflow(id: string): Promise<{ error: string | null }> {
  const guard = await writeGuard();
  if (!guard.orgId || guard.error) return { error: guard.error };
  await db.workflow.delete({ where: { id, organizationId: guard.orgId } });
  revalidatePath("/automations");
  return { error: null };
}

/** Validation is not an execution and must not change run counters or send mail. */
export async function testWorkflow(
  id: string,
): Promise<{ stepsRun: number; log: string[]; error: string | null }> {
  const guard = await writeGuard();
  if (!guard.orgId || guard.error) return { stepsRun: 0, log: [], error: guard.error };
  const row = await db.workflow.findFirst({ where: { id, organizationId: guard.orgId } });
  const parsed = workflowSchema.safeParse(
    row ? { ...row, description: row.description ?? undefined } : null,
  );
  if (!parsed.success)
    return {
      stepsRun: 0,
      log: ["Configurazione non valida"],
      error: parsed.error.issues[0]?.message ?? "Automazione non disponibile",
    };
  const error =
    checkFeature(await getOrgPlan(guard.orgId), "automations") ??
    (await validateWorkflowReferences(guard.orgId, parsed.data));
  return {
    stepsRun: error ? 0 : parsed.data.steps.length,
    error,
    log: [
      "VALIDAZIONE: nessuna email inviata e nessuna azione eseguita.",
      ...(error
        ? [error]
        : parsed.data.steps.map(
            (s, i) => i + 1 + ". " + s.action.type + ": configurazione valida",
          )),
      "Le esecuzioni reali e le attese sono disponibili nel registro.",
    ],
  };
}

function renderLog(log: unknown): string {
  if (typeof log === "string") return log;
  if (!log || typeof log !== "object") return "";
  const value = log as { at?: string; step?: number; status?: string; message?: string };
  return [
    value.at,
    typeof value.step === "number" ? "Azione " + (value.step + 1) : "",
    value.status,
    value.message,
  ]
    .filter(Boolean)
    .join(" · ");
}

export async function getWorkflowLogs(): Promise<WorkflowLog[]> {
  const orgId = orgIdOf(await auth());
  if (!orgId) return [];
  const [jobs, legacy] = await Promise.all([
    db.workflowQueue.findMany({
      where: { orgId, workflow: { organizationId: orgId } },
      include: { workflow: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.workflowExecution.findMany({
      where: { queueId: null, status: { not: "VALIDATION" }, workflow: { organizationId: orgId } },
      include: { workflow: { select: { name: true } } },
      orderBy: { startedAt: "desc" },
      take: 30,
    }),
  ]);
  const current: WorkflowLog[] = jobs.map((job) => {
    const payload = job.payload as unknown as WorkflowPayload;
    return {
      id: job.id,
      queueId: job.id,
      workflowId: job.workflowId,
      workflowName: job.workflow.name,
      status: job.status as LogStatus,
      trigger: payload.trigger,
      ...workflowEntity(payload),
      entityType: workflowEntity(payload).entityType as WorkflowLog["entityType"],
      stepsExecuted: job.logs.filter(
        (l) => typeof l === "object" && l !== null && "status" in l && l.status === "SUCCESS",
      ).length,
      error: job.error,
      executedAt: job.createdAt.toISOString(),
      resumeAt: ["PENDING", "PAUSED"].includes(job.status) ? job.resumeAt.toISOString() : null,
      emailInFlight: job.emailInFlight,
      logs: job.logs.map(renderLog),
    };
  });
  return [
    ...current,
    ...legacy.map((row) => {
      const payload = row.payload as Record<string, string>;
      return {
        id: row.id,
        workflowId: row.workflowId,
        workflowName: row.workflow.name,
        status: row.status as LogStatus,
        trigger: payload.trigger ?? "",
        entityType: (payload.entityType ?? "deal") as WorkflowLog["entityType"],
        entityId: payload.entityId ?? "",
        entityLabel: payload.entityLabel ?? "",
        stepsExecuted: 0,
        error: payload.error ?? null,
        executedAt: row.startedAt.toISOString(),
        logs: row.logs.map(renderLog),
      };
    }),
  ]
    .sort((a, b) => b.executedAt.localeCompare(a.executedAt))
    .slice(0, 100);
}

export async function resumeWorkflowJob(
  id: string,
  confirmUncertainEmail = false,
): Promise<{ error: string | null }> {
  const guard = await writeGuard();
  if (!guard.orgId || guard.error) return { error: guard.error };
  const planError = checkFeature(await getOrgPlan(guard.orgId), "automations");
  if (planError) return { error: planError };
  const job = await db.workflowQueue.findFirst({
    where: {
      id,
      orgId: guard.orgId,
      workflow: { organizationId: guard.orgId, isActive: true },
      status: { in: ["FAILED", "SUSPENDED"] },
    },
  });
  if (!job) return { error: "Esecuzione non riprendibile: controlla che l'automazione sia attiva" };
  if (job.emailInFlight && confirmUncertainEmail !== true)
    return {
      error:
        "Esito email incerto. Verifica il provider e conferma esplicitamente il nuovo tentativo.",
    };
  await db.workflowQueue.updateMany({
    where: { id, orgId: guard.orgId, status: job.status, lockToken: null },
    data: {
      status: "PENDING",
      resumeAt: new Date(),
      emailInFlight: false,
      attempts: 0,
      error: null,
      lockedUntil: null,
    },
  });
  revalidatePath("/automations");
  wakeWorkflows(guard.orgId);
  return { error: null };
}
