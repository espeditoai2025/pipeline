import type { Prisma } from "@/generated/prisma/client";
import { getLimits } from "@/lib/plan";
import type { TriggerConfig } from "@/types/workflows";

type EventContext = {
  source?: "manual" | "api" | "import" | "automation";
  depth?: number;
  actorId?: string;
};
export type WorkflowPayload = EventContext &
  (
    | {
        trigger: "DEAL_CREATED";
        orgId: string;
        dealId: string;
        dealTitle: string;
        dealValue?: number;
        ownerId: string;
        stageId: string;
        contactId?: string;
      }
    | {
        trigger: "DEAL_STAGE_CHANGED";
        orgId: string;
        dealId: string;
        dealTitle: string;
        fromStageId: string;
        toStageId: string;
        contactId?: string;
        ownerId: string;
      }
    | {
        trigger: "DEAL_WON";
        orgId: string;
        dealId: string;
        dealTitle: string;
        dealValue?: number;
        contactId?: string;
        ownerId: string;
      }
    | {
        trigger: "DEAL_LOST";
        orgId: string;
        dealId: string;
        dealTitle: string;
        contactId?: string;
        ownerId: string;
      }
    | {
        trigger: "DEAL_VALUE_CHANGED";
        orgId: string;
        dealId: string;
        dealTitle: string;
        oldValue?: number;
        newValue: number;
        contactId?: string;
        ownerId: string;
      }
    | {
        trigger: "CONTACT_CREATED";
        orgId: string;
        contactId: string;
        contactName: string;
        contactEmail?: string;
        ownerId: string;
      }
    | {
        trigger: "LEAD_CREATED";
        orgId: string;
        leadId: string;
        leadTitle: string;
        ownerId?: string;
        contactId?: string;
      }
    | {
        trigger: "ACTIVITY_OVERDUE";
        orgId: string;
        activityId: string;
        ownerId: string;
        dueDate?: string;
        dealId?: string;
        contactId?: string;
      }
  );

export function triggerMatches(cfg: TriggerConfig, payload: WorkflowPayload): boolean {
  if (cfg.type !== payload.trigger) return false;
  if (cfg.type === "DEAL_STAGE_CHANGED" && payload.trigger === cfg.type) {
    if (cfg.toStageId && cfg.toStageId !== payload.toStageId) return false;
    if (cfg.fromStageId && cfg.fromStageId !== payload.fromStageId) return false;
  }
  if (
    cfg.type === "DEAL_VALUE_CHANGED" &&
    payload.trigger === cfg.type &&
    cfg.minValue !== undefined
  ) {
    if (
      payload.newValue < cfg.minValue ||
      (payload.oldValue !== undefined && payload.oldValue >= cfg.minValue)
    )
      return false;
  }
  return true;
}

export function workflowEntity(payload: WorkflowPayload) {
  if (payload.trigger === "ACTIVITY_OVERDUE")
    return {
      entityId: payload.activityId,
      entityType: "activity",
      entityLabel: "Attività scaduta",
    };
  if ("dealId" in payload)
    return { entityId: payload.dealId, entityType: "deal", entityLabel: payload.dealTitle };
  if (payload.trigger === "LEAD_CREATED")
    return { entityId: payload.leadId, entityType: "lead", entityLabel: payload.leadTitle };
  return { entityId: payload.contactId, entityType: "contact", entityLabel: payload.contactName };
}

/** Called inside the CRM transaction: the saved change and event commit together. */
export async function enqueueWorkflows(
  tx: Prisma.TransactionClient,
  payload: WorkflowPayload,
  eventKey: string,
): Promise<string[]> {
  if ((payload.depth ?? 0) > 5) return [];
  const org = await tx.organization.findUnique({
    where: { id: payload.orgId },
    select: { plan: true },
  });
  if (!org || !getLimits(org.plan).automations) return [];
  const workflows = await tx.workflow.findMany({
    where: {
      organizationId: payload.orgId,
      isActive: true,
      ...(payload.source === "import" ? { triggerOnImport: true } : {}),
    },
  });
  const jobs: string[] = [];
  for (const workflow of workflows) {
    if (!triggerMatches(workflow.trigger as TriggerConfig, payload)) continue;
    const row = await tx.workflowQueue.upsert({
      where: { workflowId_eventKey: { workflowId: workflow.id, eventKey } },
      update: {},
      create: {
        workflowId: workflow.id,
        eventKey,
        stepIndex: 0,
        steps: workflow.steps as Prisma.InputJsonValue,
        payload: JSON.parse(JSON.stringify(payload)),
        orgId: payload.orgId,
        ownerId:
          "ownerId" in payload
            ? (payload.ownerId ?? payload.actorId ?? "")
            : (payload.actorId ?? ""),
        resumeAt: new Date(),
        status: "PENDING",
      },
      select: { id: true },
    });
    jobs.push(row.id);
  }
  return jobs;
}

type DealEventRow = {
  id: string;
  title: string;
  value: unknown;
  stageId: string;
  status: string;
  ownerId: string;
  contactId: string | null;
  updatedAt: Date;
};
/** Imports opt in per workflow and insert jobs in batches in the import transaction. */
export async function enqueueImportedRecords(
  tx: Prisma.TransactionClient,
  orgId: string,
  payloads: WorkflowPayload[],
) {
  const org = await tx.organization.findUnique({ where: { id: orgId }, select: { plan: true } });
  if (!org || !getLimits(org.plan).automations) return;
  const workflows = await tx.workflow.findMany({
    where: { organizationId: orgId, isActive: true, triggerOnImport: true },
  });
  const jobs: Prisma.WorkflowQueueCreateManyInput[] = [];
  for (const payload of payloads) {
    if (payload.orgId !== orgId) throw new Error("Organizzazione importazione non valida");
    for (const workflow of workflows) {
      if (!triggerMatches(workflow.trigger as TriggerConfig, payload)) continue;
      jobs.push({
        workflowId: workflow.id,
        eventKey: `created:${workflowEntity(payload).entityId}`,
        stepIndex: 0,
        steps: workflow.steps as Prisma.InputJsonValue,
        payload: JSON.parse(JSON.stringify({ ...payload, source: "import" })),
        orgId,
        ownerId: "ownerId" in payload ? (payload.ownerId ?? "") : "",
        resumeAt: new Date(),
      });
    }
  }
  for (let index = 0; index < jobs.length; index += 500)
    await tx.workflowQueue.createMany({
      data: jobs.slice(index, index + 500),
      skipDuplicates: true,
    });
}

/** Shared policy for form, drag-and-drop, bulk operations and API. */
export async function enqueueDealChanges(
  tx: Prisma.TransactionClient,
  orgId: string,
  before: Pick<DealEventRow, "value" | "status" | "stageId">,
  after: DealEventRow,
  source: EventContext["source"] = "manual",
) {
  const base = {
    orgId,
    dealId: after.id,
    dealTitle: after.title,
    ownerId: after.ownerId,
    contactId: after.contactId ?? undefined,
    source,
  };
  const version = `${after.id}:${after.updatedAt.toISOString()}`;
  if (before.stageId !== after.stageId)
    await enqueueWorkflows(
      tx,
      {
        ...base,
        trigger: "DEAL_STAGE_CHANGED",
        fromStageId: before.stageId,
        toStageId: after.stageId,
      },
      `stage:${version}`,
    );
  if (before.status !== after.status && after.status === "WON")
    await enqueueWorkflows(
      tx,
      { ...base, trigger: "DEAL_WON", dealValue: Number(after.value) },
      `status:${version}`,
    );
  if (before.status !== after.status && after.status === "LOST")
    await enqueueWorkflows(tx, { ...base, trigger: "DEAL_LOST" }, `status:${version}`);
  if (Number(before.value) !== Number(after.value))
    await enqueueWorkflows(
      tx,
      {
        ...base,
        trigger: "DEAL_VALUE_CHANGED",
        oldValue: Number(before.value),
        newValue: Number(after.value),
      },
      `value:${version}`,
    );
}
