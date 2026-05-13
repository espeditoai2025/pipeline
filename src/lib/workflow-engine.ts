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

// ─── Payload types per trigger ────────────────────────────────────────────────

export type WorkflowPayload =
  | { trigger: "DEAL_CREATED";       orgId: string; dealId: string;    dealTitle: string; dealValue?: number; ownerId: string; stageId: string; contactId?: string }
  | { trigger: "DEAL_STAGE_CHANGED"; orgId: string; dealId: string;    dealTitle: string; fromStageId: string; toStageId: string; contactId?: string; ownerId: string }
  | { trigger: "DEAL_WON";           orgId: string; dealId: string;    dealTitle: string; dealValue?: number; contactId?: string; ownerId: string }
  | { trigger: "DEAL_LOST";          orgId: string; dealId: string;    dealTitle: string; contactId?: string; ownerId: string }
  | { trigger: "DEAL_VALUE_CHANGED"; orgId: string; dealId: string;    dealTitle: string; newValue: number;  contactId?: string; ownerId: string }
  | { trigger: "CONTACT_CREATED";    orgId: string; contactId: string; contactName: string; contactEmail?: string; ownerId: string }
  | { trigger: "LEAD_CREATED";       orgId: string; leadId: string;    leadTitle: string };

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

      const subject = tpl.subject.replace(/\{\{deal\}\}/gi, entityLabel).replace(/\{\{nome\}\}/gi, entityLabel);
      const html    = tpl.body   .replace(/\{\{deal\}\}/gi, entityLabel).replace(/\{\{nome\}\}/gi, entityLabel);

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
      if ("dealId" in payload) {
        await db.deal.update({ where: { id: payload.dealId }, data: { ownerId: action.userId } });
        return `ASSIGN_OWNER (deal) → user ${action.userId}`;
      }
      if ("contactId" in payload && payload.contactId) {
        await db.contact.update({ where: { id: payload.contactId }, data: { ownerId: action.userId } });
        return `ASSIGN_OWNER (contact) → user ${action.userId}`;
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
      return `WAIT ${action.days}gg — eseguito immediatamente (delay non implementato)`;

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
  const entityId = "dealId" in payload ? payload.dealId : "contactId" in payload ? payload.contactId : "leadId" in payload ? payload.leadId : "";
  const entityLabel = "dealTitle" in payload ? payload.dealTitle : "contactName" in payload ? payload.contactName : "leadTitle" in payload ? payload.leadTitle : "";
  const entityType = payload.trigger.startsWith("DEAL") ? "deal" : payload.trigger.startsWith("CONTACT") ? "contact" : "lead";

  for (const wf of matching) {
    const steps = wf.steps as WorkflowStep[];
    const logs: string[] = [`[${new Date().toLocaleTimeString("it-IT")}] Trigger: ${payload.trigger}`];
    let status: "SUCCESS" | "FAILED" = "SUCCESS";

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]!;
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
