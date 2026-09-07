import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { sendOrgMail } from "@/lib/mailer";
import { getLimits } from "@/lib/plan";
import { crmTransaction, CrmError } from "@/lib/crm-transaction";
import { workflowStepSchema } from "@/lib/workflow-schema";
import { enqueueWorkflows, workflowEntity, type WorkflowPayload } from "@/lib/workflow-events";
import type { Prisma, WorkflowQueue } from "@/generated/prisma/client";
import type { WorkflowStep } from "@/types/workflows";

export type { WorkflowPayload } from "@/lib/workflow-events";
type Tx = Prisma.TransactionClient;
type StepLog = { at: string; step: number; action: string; status: string; message: string };
type Context = Awaited<ReturnType<typeof resolveContext>>;
const LEASE_MS = 5 * 60_000;
const stepLogs = (logs: Prisma.JsonValue[]) => logs as unknown as StepLog[];
const esc = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
class SkipStep extends Error {}

async function resolveContext(tx: Tx, job: WorkflowQueue) {
  const payload = job.payload as unknown as WorkflowPayload;
  if (payload.orgId !== job.orgId) throw new CrmError("Organizzazione evento non valida");
  const deal =
    "dealId" in payload && payload.dealId
      ? await tx.deal.findFirst({
          where: { id: payload.dealId, organizationId: job.orgId, status: { not: "DELETED" } },
        })
      : null;
  if (payload.trigger.startsWith("DEAL_") && !deal)
    throw new CrmError("Affare non disponibile nell'organizzazione");
  const lead =
    payload.trigger === "LEAD_CREATED"
      ? await tx.lead.findFirst({ where: { id: payload.leadId, organizationId: job.orgId } })
      : null;
  if (payload.trigger === "LEAD_CREATED" && !lead)
    throw new CrmError("Lead non disponibile nell'organizzazione");
  if (payload.trigger === "ACTIVITY_OVERDUE") {
    const activity = await tx.activity.findFirst({
      where: {
        id: payload.activityId,
        organizationId: job.orgId,
        completedAt: null,
        dueDate: { lt: new Date() },
      },
    });
    if (!activity || (payload.dueDate && activity.dueDate?.toISOString() !== payload.dueDate))
      throw new SkipStep("Attività completata o scadenza modificata");
  }
  const contactId =
    deal?.contactId ?? lead?.contactId ?? ("contactId" in payload ? payload.contactId : undefined);
  const contact = contactId
    ? await tx.contact.findFirst({ where: { id: contactId, organizationId: job.orgId } })
    : null;
  if (payload.trigger === "CONTACT_CREATED" && !contact)
    throw new CrmError("Contatto non disponibile nell'organizzazione");
  const ownerId =
    job.ownerId || deal?.ownerId || lead?.ownerId || contact?.ownerId || payload.actorId;
  const owner = ownerId
    ? await tx.user.findFirst({ where: { id: ownerId, organizationId: job.orgId } })
    : await tx.user.findFirst({
        where: { organizationId: job.orgId, role: "OWNER" },
        orderBy: { id: "asc" },
      });
  const name = contact
    ? `${contact.firstName} ${contact.lastName ?? ""}`.trim()
    : (lead?.title ?? "");
  const variables: Record<string, string> = {
    nome: name,
    cognome: contact?.lastName ?? "",
    email: contact?.email ?? lead?.email ?? "",
    deal: deal?.title ?? "",
    lead: lead?.title ?? "",
  };
  return { payload, deal, lead, contact, owner, variables };
}

function interpolate(text: string, ctx: Context, html = false) {
  return text.replace(/\{\{(nome|cognome|email|deal|lead)\}\}/gi, (_, name: string) =>
    html ? esc(ctx.variables[name.toLowerCase()] ?? "") : (ctx.variables[name.toLowerCase()] ?? ""),
  );
}

/** The checkpoint and database action share a transaction. A crash cannot repeat committed actions. */
async function checkpoint(
  tx: Tx,
  job: WorkflowQueue,
  data: Omit<Prisma.WorkflowQueueUpdateInput, "logs"> & { logs?: Prisma.JsonValue[] },
) {
  const { logs: inputLogs, ...rest } = data;
  const updated = await tx.workflowQueue.update({
    where: { id: job.id, lockToken: job.lockToken },
    data: {
      ...rest,
      ...(inputLogs
        ? { logs: inputLogs.filter((v) => v !== null) as Prisma.InputJsonValue[] }
        : {}),
    },
  });
  const payload = updated.payload as unknown as WorkflowPayload;
  const logs = stepLogs(updated.logs);
  const execution = {
    status: updated.status,
    payload: {
      trigger: payload.trigger,
      ...workflowEntity(payload),
      error: updated.error,
      stepsExecuted: logs.filter((l) => l.status === "SUCCESS").length,
    },
    logs: updated.logs as Prisma.InputJsonValue[],
    finishedAt: ["SUCCESS", "SKIPPED", "FAILED"].includes(updated.status) ? new Date() : null,
  };
  await tx.workflowExecution.upsert({
    where: { queueId: job.id },
    create: { workflowId: job.workflowId, queueId: job.id, ...execution },
    update: execution,
  });
  return updated;
}

async function executeDatabaseStep(
  tx: Tx,
  job: WorkflowQueue,
  step: WorkflowStep,
  ctx: Context,
): Promise<{ message: string; ownerId?: string }> {
  const a = step.action;
  switch (a.type) {
    case "CREATE_ACTIVITY": {
      if (!ctx.owner) throw new CrmError("Responsabile non disponibile nell'organizzazione");
      const parsed = workflowStepSchema.parse(step);
      if (parsed.action.type !== "CREATE_ACTIVITY") throw new CrmError("Azione non valida");
      await tx.activity.create({
        data: {
          type: parsed.action.activityType,
          subject: interpolate(a.subject, ctx),
          dueDate: new Date(Date.now() + a.dueDays * 86_400_000),
          organizationId: job.orgId,
          userId: ctx.owner.id,
          dealId: ctx.deal?.id,
          contactId: ctx.contact?.id,
        },
      });
      return { message: `Attività creata: ${interpolate(a.subject, ctx)}` };
    }
    case "UPDATE_DEAL_STAGE": {
      if (!ctx.deal) throw new CrmError("Questa azione richiede un affare");
      const stage = await tx.stage.findFirst({
        where: {
          id: a.stageId,
          pipelineId: ctx.deal.pipelineId,
          pipeline: { organizationId: job.orgId },
        },
      });
      if (!stage) throw new CrmError("Fase non disponibile nella pipeline dell'affare");
      if (ctx.deal.status !== "OPEN") throw new SkipStep("Affare già chiuso");
      if (ctx.deal.stageId === a.stageId) throw new SkipStep("Affare già nella fase selezionata");
      const before = ctx.deal.stageId;
      await tx.deal.update({
        where: { id: ctx.deal.id, organizationId: job.orgId, status: "OPEN", stageId: before },
        data: { stageId: a.stageId },
      });
      await enqueueWorkflows(
        tx,
        {
          trigger: "DEAL_STAGE_CHANGED",
          orgId: job.orgId,
          dealId: ctx.deal.id,
          dealTitle: ctx.deal.title,
          ownerId: ctx.deal.ownerId,
          contactId: ctx.deal.contactId ?? undefined,
          fromStageId: before,
          toStageId: a.stageId,
          source: "automation",
          depth: (ctx.payload.depth ?? 0) + 1,
        },
        `workflow:${job.id}:${job.stepIndex}`,
      );
      return { message: `Affare spostato in ${stage.name}` };
    }
    case "ASSIGN_OWNER": {
      const owner = await tx.user.findFirst({ where: { id: a.userId, organizationId: job.orgId } });
      if (!owner) throw new CrmError("Responsabile non disponibile nell'organizzazione");
      if (ctx.deal)
        await tx.deal.update({
          where: { id: ctx.deal.id, organizationId: job.orgId },
          data: { ownerId: owner.id },
        });
      else if (ctx.lead)
        await tx.lead.update({
          where: { id: ctx.lead.id, organizationId: job.orgId },
          data: { ownerId: owner.id },
        });
      else if (ctx.contact)
        await tx.contact.update({
          where: { id: ctx.contact.id, organizationId: job.orgId },
          data: { ownerId: owner.id },
        });
      else throw new CrmError("Nessuna entità da riassegnare");
      return { message: `Assegnato a ${owner.name ?? owner.email}`, ownerId: owner.id };
    }
    case "SEND_NOTIFICATION": {
      const recipients =
        a.to === "team"
          ? await tx.user.findMany({ where: { organizationId: job.orgId }, select: { id: true } })
          : ctx.owner
            ? [ctx.owner]
            : [];
      if (!recipients.length) throw new CrmError("Nessun responsabile disponibile");
      await tx.notification.createMany({
        data: recipients.map((user) => ({
          userId: user.id,
          type: "WORKFLOW",
          title: "Automazione attivata",
          message: interpolate(a.message, ctx),
        })),
      });
      return {
        message: `Notifica inviata a ${recipients.length} ${recipients.length === 1 ? "persona" : "persone"}`,
      };
    }
    default:
      throw new CrmError("Azione non eseguibile");
  }
}

async function executeJob(initial: WorkflowQueue, deadline: number) {
  let job = initial;
  const parsed = workflowStepSchema.array().min(1).max(30).safeParse(job.steps);
  try {
    if (!parsed.success)
      throw new CrmError(`Configurazione non valida: ${parsed.error.issues[0]?.message}`);
    const steps = parsed.data;
    while (job.stepIndex < steps.length && Date.now() < deadline) {
      const workflow = await db.workflow.findFirst({
        where: { id: job.workflowId, organizationId: job.orgId },
        select: { isActive: true },
      });
      const org = await db.organization.findUnique({
        where: { id: job.orgId },
        select: { plan: true },
      });
      if (!workflow?.isActive || !org || !getLimits(org.plan).automations) {
        await crmTransaction((tx) =>
          checkpoint(tx, job, {
            status: "SUSPENDED",
            error: "Automazione disattivata o piano non abilitato. Ripresa manuale richiesta.",
            lockToken: null,
            lockedUntil: null,
          }),
        );
        return;
      }
      const step = steps[job.stepIndex]!;
      const entry: StepLog = {
        at: new Date().toISOString(),
        step: job.stepIndex,
        action: step.action.type,
        status: "SUCCESS",
        message: "",
      };
      if (step.action.type === "WAIT") {
        const days = step.action.days;
        entry.status = "PAUSED";
        entry.message = `Attesa di ${step.action.days} giorni`;
        await crmTransaction((tx) =>
          checkpoint(tx, job, {
            stepIndex: job.stepIndex + 1,
            attempts: 0,
            status: "PAUSED",
            resumeAt: new Date(Date.now() + days * 86_400_000),
            logs: [...job.logs, entry],
            lockToken: null,
            lockedUntil: null,
          }),
        );
        return;
      }
      if (step.action.type === "SEND_EMAIL") {
        // External mail and Postgres cannot commit atomically. Quarantine uncertain sends.
        const ctx = await resolveContext(db, job);
        const to =
          step.action.to === "contact"
            ? ctx.contact?.email
            : step.action.to === "lead"
              ? ctx.lead?.email
              : step.action.to === "owner"
                ? ctx.owner?.email
                : step.action.to;
        const template = await db.emailTemplate.findFirst({
          where: { id: step.action.templateId, organizationId: job.orgId },
        });
        if (!to || !template) {
          entry.status = "SKIPPED";
          entry.message = !to ? "Destinatario senza email" : "Template non disponibile";
        } else {
          job = await crmTransaction((tx) => checkpoint(tx, job, { emailInFlight: true }));
          const subject = interpolate(template.subject, ctx);
          const html = interpolate(template.body, ctx, true);
          let timer: ReturnType<typeof setTimeout> | undefined;
          const sent = await Promise.race([
            sendOrgMail(job.orgId, {
              to,
              subject,
              html,
              idempotencyKey: `workflow-${job.id}-${job.stepIndex}`,
            }),
            new Promise<never>((_, reject) => {
              timer = setTimeout(
                () =>
                  reject(
                    new CrmError(
                      "Timeout invio: esito incerto. Verifica nel provider prima di riprovare.",
                    ),
                  ),
                15_000,
              );
            }),
          ]).finally(() => clearTimeout(timer));
          if (!sent.ok)
            throw new CrmError(
              `Email non confermata: ${sent.error}. Verifica l'esito prima di riprovare.`,
            );
          entry.message = "Email accettata dal provider";
          job = await crmTransaction(async (tx) => {
            await tx.email.create({
              data: {
                organizationId: job.orgId,
                subject,
                body: html,
                fromAddress: "Automazione Pipely",
                toAddresses: [to],
                ccAddresses: [],
                status: "SENT",
                sentAt: new Date(),
                contactId: ctx.contact?.id,
                dealId: ctx.deal?.id,
              },
            });
            return checkpoint(tx, job, {
              emailInFlight: false,
              stepIndex: job.stepIndex + 1,
              attempts: 0,
              logs: [...job.logs, entry],
            });
          });
          continue;
        }
        job = await crmTransaction((tx) =>
          checkpoint(tx, job, {
            stepIndex: job.stepIndex + 1,
            attempts: 0,
            logs: [...job.logs, entry],
          }),
        );
      } else {
        job = await crmTransaction(async (tx) => {
          let result: { message: string; ownerId?: string };
          try {
            result = await executeDatabaseStep(tx, job, step, await resolveContext(tx, job));
          } catch (error) {
            if (!(error instanceof SkipStep)) throw error;
            result = { message: error.message };
            entry.status = "SKIPPED";
          }
          entry.message = result.message;
          return checkpoint(tx, job, {
            stepIndex: job.stepIndex + 1,
            attempts: 0,
            ownerId: result.ownerId ?? job.ownerId,
            logs: [...job.logs, entry],
          });
        });
      }
    }
    const finished = job.stepIndex >= steps.length;
    await crmTransaction((tx) =>
      checkpoint(tx, job, {
        status: finished
          ? stepLogs(job.logs).some((l) => l.status === "SKIPPED")
            ? "SKIPPED"
            : "SUCCESS"
          : "PENDING",
        lockToken: null,
        lockedUntil: null,
        resumeAt: new Date(),
        error: null,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore durante l'esecuzione";
    const retryable =
      !job.emailInFlight &&
      !(error instanceof CrmError) &&
      !(error instanceof SkipStep) &&
      job.attempts < 3;
    await crmTransaction((tx) =>
      checkpoint(tx, job, {
        status: error instanceof SkipStep ? "SKIPPED" : retryable ? "PENDING" : "FAILED",
        error: message,
        resumeAt: new Date(Date.now() + 60_000 * Math.max(1, job.attempts)),
        lockToken: null,
        lockedUntil: null,
        logs: [
          ...job.logs,
          {
            at: new Date().toISOString(),
            step: job.stepIndex,
            action: parsed.success ? (parsed.data[job.stepIndex]?.action.type ?? "END") : "CONFIG",
            status: "FAILED",
            message,
          },
        ],
      }),
    );
  }
}

/** Bounded worker. Concurrent cron/after requests compete for an atomic claim. */
export async function processWorkflowQueue({
  orgId,
  limit = 30,
  budgetMs = 40_000,
}: { orgId?: string; limit?: number; budgetMs?: number } = {}) {
  const now = new Date();
  const deadline = Date.now() + budgetMs;
  const stale = await db.workflowQueue.findMany({
    where: { ...(orgId ? { orgId } : {}), status: "RUNNING", lockedUntil: { lt: now } },
    take: limit,
    orderBy: [{ lockedUntil: "asc" }, { id: "asc" }],
  });
  for (const job of stale) {
    await crmTransaction(async (tx) => {
      const claimed = await tx.workflowQueue.updateMany({
        where: {
          id: job.id,
          status: "RUNNING",
          lockToken: job.lockToken,
          lockedUntil: { lt: now },
        },
        data: { lockedUntil: new Date(Date.now() + LEASE_MS) },
      });
      if (!claimed.count) return;
      await checkpoint(tx, job, {
        status: job.emailInFlight ? "FAILED" : "PENDING",
        error: job.emailInFlight
          ? "Invio email interrotto: esito incerto. Verifica prima di riprovare."
          : "Esecuzione interrotta: ripresa dal passo salvato",
        resumeAt: now,
        lockToken: null,
        lockedUntil: null,
      });
    });
  }
  const due = await db.workflowQueue.findMany({
    where: {
      ...(orgId ? { orgId } : {}),
      status: { in: ["PENDING", "PAUSED"] },
      resumeAt: { lte: now },
    },
    orderBy: [{ resumeAt: "asc" }, { id: "asc" }],
    take: Math.min(100, Math.max(1, limit)),
  });
  let processed = 0;
  for (const item of due) {
    if (Date.now() >= deadline) break;
    const token = randomUUID();
    const claimed = await db.workflowQueue.updateMany({
      where: { id: item.id, status: { in: ["PENDING", "PAUSED"] }, resumeAt: { lte: now } },
      data: {
        status: "RUNNING",
        lockToken: token,
        lockedUntil: new Date(Date.now() + LEASE_MS),
        attempts: { increment: 1 },
      },
    });
    if (!claimed.count) continue;
    const job = await db.workflowQueue.findUnique({ where: { id: item.id } });
    if (!job || job.lockToken !== token) continue;
    await executeJob(job, deadline);
    processed++;
  }
  return processed;
}

/** Deadline identity, bounded scan and transaction prevent repeated/starved overdue events. */
export async function enqueueOverdueActivities(limit = 50, budgetMs = 10_000) {
  const deadline = Date.now() + budgetMs;
  const due = await db.activity.findMany({
    where: {
      completedAt: null,
      dueDate: { lt: new Date() },
      OR: [
        { workflowOverdueAt: null },
        { NOT: { workflowOverdueAt: { equals: db.activity.fields.dueDate } } },
      ],
    },
    orderBy: [{ dueDate: "asc" }, { id: "asc" }],
    take: limit,
  });
  let count = 0;
  for (const activity of due) {
    if (Date.now() >= deadline) break;
    const emitted = await crmTransaction(async (tx) => {
      const claimed = await tx.activity.updateMany({
        where: {
          id: activity.id,
          dueDate: activity.dueDate,
          completedAt: null,
          workflowOverdueAt: activity.workflowOverdueAt,
        },
        data: { workflowOverdueAt: activity.dueDate },
      });
      if (!claimed.count || !activity.dueDate) return false;
      await enqueueWorkflows(
        tx,
        {
          trigger: "ACTIVITY_OVERDUE",
          orgId: activity.organizationId,
          activityId: activity.id,
          ownerId: activity.userId,
          dueDate: activity.dueDate.toISOString(),
          dealId: activity.dealId ?? undefined,
          contactId: activity.contactId ?? undefined,
        },
        `overdue:${activity.id}:${activity.dueDate.toISOString()}`,
      );
      return true;
    });
    if (emitted) count++;
  }
  return count;
}

/** Trusted callers only. CRM mutations enqueue in their own transaction instead. */
export async function runWorkflows(payload: WorkflowPayload): Promise<void> {
  await crmTransaction((tx) => enqueueWorkflows(tx, payload, `event:${randomUUID()}`));
  await processWorkflowQueue({ orgId: payload.orgId });
}
