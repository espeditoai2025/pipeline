/**
 * Workflow execution engine.
 * Called from server actions after relevant CRM events.
 * Never import this from client components.
 */

import { db } from "./db";
import { resend, FROM_DEFAULT } from "./resend";
import { decrypt } from "./crypto";
import nodemailer from "nodemailer";
import type { TriggerConfig, WorkflowStep } from "@/types/workflows";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── Payload types per trigger ────────────────────────────────────────────────

export type WorkflowPayload =
  | { trigger: "DEAL_CREATED";       orgId: string; dealId: string;    dealTitle: string; dealValue?: number; ownerId: string; stageId: string; contactId?: string }
  | { trigger: "DEAL_STAGE_CHANGED"; orgId: string; dealId: string;    dealTitle: string; fromStageId: string; toStageId: string; contactId?: string; ownerId: string }
  | { trigger: "DEAL_WON";           orgId: string; dealId: string;    dealTitle: string; dealValue?: number; contactId?: string; ownerId: string }
  | { trigger: "DEAL_LOST";          orgId: string; dealId: string;    dealTitle: string; contactId?: string; ownerId: string }
  | { trigger: "DEAL_VALUE_CHANGED"; orgId: string; dealId: string;    dealTitle: string; newValue: number;  contactId?: string; ownerId: string }
  | { trigger: "CONTACT_CREATED";    orgId: string; contactId: string; contactName: string; contactEmail?: string; ownerId: string }
  | { trigger: "LEAD_CREATED";       orgId: string; leadId: string;    leadTitle: string }
  | { trigger: "ACTIVITY_OVERDUE";   orgId: string; activityId: string; ownerId: string; dealId?: string; contactId?: string };

// ─── Trigger matcher ──────────────────────────────────────────────────────────

function triggerMatches(cfg: TriggerConfig, payload: WorkflowPayload): boolean {
  if (cfg.type !== payload.trigger) return false;

  if (cfg.type === "DEAL_STAGE_CHANGED" && payload.trigger === "DEAL_STAGE_CHANGED") {
    if (cfg.toStageId && cfg.toStageId !== payload.toStageId) return false;
    if (cfg.fromStageId && cfg.fromStageId !== payload.fromStageId) return false;
  }

  if (cfg.type === "DEAL_VALUE_CHANGED" && payload.trigger === "DEAL_VALUE_CHANGED") {
    if (cfg.minValue !== undefined && payload.newValue < cfg.minValue) return false;
  }

  return true;
}

// ─── Email sender (SMTP preferred, Resend fallback) ───────────────────────────

async function sendMail(orgId: string, opts: { to: string; subject: string; html: string }): Promise<void> {
  const smtp = await db.smtpConfig.findUnique({ where: { organizationId: orgId } });
  if (smtp?.isVerified) {
    let password: string;
    try { password = decrypt(smtp.passwordEnc); } catch { throw new Error("Errore decifratura SMTP"); }
    const transporter = nodemailer.createTransport({
      host: smtp.host, port: smtp.port, secure: smtp.secure,
      auth: { user: smtp.username, pass: password },
    });
    await transporter.sendMail({
      from: `"${smtp.fromName ?? smtp.fromEmail}" <${smtp.fromEmail}>`,
      to: opts.to, subject: opts.subject, html: opts.html,
    });
    return;
  }

  if (resend) {
    await resend.emails.send({ from: FROM_DEFAULT, to: opts.to, subject: opts.subject, html: opts.html });
    return;
  }

  throw new Error("Nessun provider email configurato");
}

// ─── Step executor ────────────────────────────────────────────────────────────

async function executeStep(
  step: WorkflowStep,
  payload: WorkflowPayload,
  orgId: string,
  ownerId: string,
): Promise<string> {
  const { action } = step;

  switch (action.type) {
    case "SEND_EMAIL": {
      // Resolve destination email
      let toEmail: string | null = null;

      if (action.to === "contact" || action.to === "owner") {
        if (action.to === "contact" && "contactId" in payload && payload.contactId) {
          const c = await db.contact.findUnique({ where: { id: payload.contactId }, select: { email: true, firstName: true, lastName: true } });
          toEmail = c?.email ?? null;
        }
        if (action.to === "owner") {
          const u = await db.user.findUnique({ where: { id: ownerId }, select: { email: true } });
          toEmail = u?.email ?? null;
        }
      } else {
        // action.to is a literal email
        toEmail = action.to;
      }

      if (!toEmail) return `SKIP SEND_EMAIL: nessuna email destinatario disponibile`;

      // Load template
      const tpl = await db.emailTemplate.findFirst({ where: { id: action.templateId, organizationId: orgId } });
      if (!tpl) return `SKIP SEND_EMAIL: template ${action.templateId} non trovato`;

      const entityLabel = "dealTitle" in payload ? payload.dealTitle : "contactName" in payload ? payload.contactName : "leadTitle" in payload ? payload.leadTitle : "";
      const safeLabel = esc(entityLabel);

      const subject = tpl.subject.replace(/\{\{deal\}\}/gi, entityLabel).replace(/\{\{nome\}\}/gi, entityLabel);
      const html    = tpl.body   .replace(/\{\{deal\}\}/gi, safeLabel).replace(/\{\{nome\}\}/gi, safeLabel);

      await sendMail(orgId, { to: toEmail, subject, html });
      return `SEND_EMAIL → ${toEmail} (template: ${tpl.name})`;
    }

    case "CREATE_ACTIVITY": {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (action.dueDays ?? 0));

      await db.activity.create({
        data: {
          type: action.activityType as never,
          subject: action.subject,
          dueDate,
          organizationId: orgId,
          userId: ownerId,
          dealId:    "dealId"    in payload ? payload.dealId    : undefined,
          contactId: "contactId" in payload && payload.contactId ? payload.contactId : undefined,
        },
      });
      return `CREATE_ACTIVITY: "${action.subject}" (${action.activityType}) tra ${action.dueDays ?? 0}gg`;
    }

    case "UPDATE_DEAL_STAGE": {
      if (!("dealId" in payload)) return `SKIP UPDATE_DEAL_STAGE: nessun affare nel payload`;
      await db.deal.update({ where: { id: payload.dealId }, data: { stageId: action.stageId } });
      return `UPDATE_DEAL_STAGE → stage ${action.stageId}`;
    }

    case "ASSIGN_OWNER": {
      const targetUser = await db.user.findFirst({ where: { id: action.userId, organizationId: orgId } });
      if (!targetUser) return `SKIP ASSIGN_OWNER: utente ${action.userId} non trovato nell'organizzazione`;
      if ("dealId" in payload) {
        await db.deal.update({ where: { id: payload.dealId }, data: { ownerId: action.userId } });
        return `ASSIGN_OWNER (deal) → ${targetUser.name ?? targetUser.email}`;
      }
      if ("contactId" in payload && payload.contactId) {
        await db.contact.update({ where: { id: payload.contactId }, data: { ownerId: action.userId } });
        return `ASSIGN_OWNER (contact) → ${targetUser.name ?? targetUser.email}`;
      }
      return `SKIP ASSIGN_OWNER: nessuna entità modificabile`;
    }

    case "SEND_NOTIFICATION": {
      const targetUserId = ownerId;
      const entityLabel = "dealTitle" in payload ? payload.dealTitle : "contactName" in payload ? payload.contactName : "leadTitle" in payload ? payload.leadTitle : "";
      await db.notification.create({
        data: {
          userId: targetUserId,
          type: "WORKFLOW",
          title: "Automazione attivata",
          message: action.message.replace(/\{\{deal\}\}/gi, entityLabel).replace(/\{\{nome\}\}/gi, entityLabel),
        },
      });
      return `SEND_NOTIFICATION → user ${targetUserId}`;
    }

    case "WAIT":
      // Handled externally by the caller; should never reach here
      return `WAIT ${action.days}gg`;

    default:
      return `SKIP: tipo step sconosciuto`;
  }
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function runWorkflows(payload: WorkflowPayload): Promise<void> {
  const orgId = payload.orgId;

  const workflows = await db.workflow.findMany({
    where: { organizationId: orgId, isActive: true },
  });

  const matching = workflows.filter((wf) =>
    triggerMatches(wf.trigger as TriggerConfig, payload)
  );

  if (matching.length === 0) return;

  const ownerId = "ownerId" in payload ? payload.ownerId : "";
  const entityId = ("dealId" in payload ? payload.dealId : "contactId" in payload ? payload.contactId : "leadId" in payload ? payload.leadId : "") ?? "";
  const entityLabel = "dealTitle" in payload ? payload.dealTitle : "contactName" in payload ? payload.contactName : "leadTitle" in payload ? payload.leadTitle : "";
  const entityType = payload.trigger.startsWith("DEAL") ? "deal" : payload.trigger.startsWith("CONTACT") ? "contact" : "lead";

  await runStepsFrom({ workflows: matching, payload, orgId, ownerId, entityId, entityLabel, entityType, startIndex: 0 });
}

// ─── Shared step runner (also used by cron for resumed queued steps) ──────────

export async function runStepsFrom({
  workflows,
  payload,
  orgId,
  ownerId,
  entityId,
  entityLabel,
  entityType,
  startIndex,
}: {
  workflows: { id: string; steps: unknown }[];
  payload: WorkflowPayload;
  orgId: string;
  ownerId: string;
  entityId: string;
  entityLabel: string;
  entityType: string;
  startIndex: number;
}): Promise<void> {
  for (const wf of workflows) {
    const steps = wf.steps as WorkflowStep[];
    const logs: string[] = [`[${new Date().toLocaleTimeString("it-IT")}] Trigger: ${payload.trigger}`];
    let status: "SUCCESS" | "FAILED" | "PAUSED" = "SUCCESS";

    for (let i = startIndex; i < steps.length; i++) {
      const step = steps[i]!;

      // Handle WAIT by scheduling the remainder and stopping
      if (step.action.type === "WAIT") {
        const days = step.action.days ?? 1;
        const resumeAt = new Date(Date.now() + days * 86_400_000);
        await db.workflowQueue.create({
          data: {
            workflowId: wf.id,
            stepIndex: i + 1,
            payload: payload as never,
            orgId,
            ownerId,
            resumeAt,
          },
        });
        logs.push(`[${new Date().toLocaleTimeString("it-IT")}] Step ${i + 1}: WAIT ${days}gg — riprende il ${resumeAt.toLocaleDateString("it-IT")}`);
        status = "PAUSED";
        break;
      }

      try {
        const msg = await executeStep(step, payload, orgId, ownerId);
        logs.push(`[${new Date().toLocaleTimeString("it-IT")}] Step ${i + 1}: ${msg}`);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logs.push(`[${new Date().toLocaleTimeString("it-IT")}] Step ${i + 1} ERRORE: ${errMsg}`);
        status = "FAILED";
        break;
      }
    }

    logs.push(`[${new Date().toLocaleTimeString("it-IT")}] Fine esecuzione: ${status}`);

    if (status !== "PAUSED") {
      await db.workflowExecution.create({
        data: {
          workflowId: wf.id,
          status,
          payload: { trigger: payload.trigger, entityType, entityId, entityLabel },
          logs,
          finishedAt: new Date(),
        },
      });
    }
  }
}
