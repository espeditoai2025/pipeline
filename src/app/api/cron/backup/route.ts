/**
 * Cron backup endpoint — triggered daily by Vercel Cron Jobs.
 * Collects aggregate stats for all organizations and sends a summary
 * email to the admin. Also logs the snapshot for Vercel log retention.
 *
 * Vercel schedule: daily at 02:00 UTC (see vercel.json > crons).
 * Protected by CRON_SECRET env var (set in Vercel dashboard).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isEmailEnabled } from "@/lib/resend";
import { sendPlatformMail } from "@/lib/mailer";
import { logger } from "@/lib/logger";
import { runWorkflows, runStepsFrom, type WorkflowPayload } from "@/lib/workflow-engine";
import { processWebhookRetries } from "@/server/actions/webhooks";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized triggers (fail-closed: if the
  // secret is not configured, refuse the request rather than running open).
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!secret) {
    logger.error("cron-backup", "CRON_SECRET non configurato: endpoint disabilitato");
    return NextResponse.json({ error: "Cron non configurato" }, { status: 503 });
  }
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();

  try {
    // Aggregate stats across all organizations
    const [orgs, totalUsers, totalContacts, totalDeals, totalLeads, totalCampaigns] =
      await Promise.all([
        db.organization.count(),
        db.user.count(),
        db.contact.count(),
        db.deal.count(),
        db.lead.count(),
        db.emailCampaign.count(),
      ]);

    const snapshot = {
      date: new Date().toISOString().slice(0, 10),
      orgs,
      users: totalUsers,
      contacts: totalContacts,
      deals: totalDeals,
      leads: totalLeads,
      campaigns: totalCampaigns,
      durationMs: Date.now() - startedAt,
    };

    logger.info("cron:backup", "Daily snapshot collected", snapshot);

    // Send summary email to admin
    const adminEmail = process.env.ADMIN_EMAIL;
    if (isEmailEnabled() && adminEmail) {
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.pipely.it").replace(/\/$/, "");

      await sendPlatformMail("snapshot-giornaliero", {
        to: adminEmail,
        subject: `[Pipely] Snapshot giornaliero — ${snapshot.date}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
            <h2 style="color:#0f172a;margin:0 0 16px;">📊 Snapshot Pipely — ${snapshot.date}</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              ${[
                ["Organizzazioni", orgs],
                ["Utenti", totalUsers],
                ["Contatti", totalContacts],
                ["Deal", totalDeals],
                ["Lead", totalLeads],
                ["Campagne email", totalCampaigns],
              ]
                .map(
                  ([label, value]) =>
                    `<tr>
                      <td style="padding:8px 12px;border:1px solid #e2e8f0;color:#475569;">${label}</td>
                      <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;color:#0f172a;">${value}</td>
                    </tr>`,
                )
                .join("")}
            </table>
            <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">
              Snapshot raccolto in ${snapshot.durationMs}ms ·
              <a href="${appUrl}" style="color:#3b82f6;">Apri Pipely</a>
            </p>
            <hr style="border:none;border-top:1px solid #f1f5f9;margin:16px 0;">
            <p style="font-size:11px;color:#94a3b8;">
              Nota: per backup completi del database consulta il pannello Supabase →
              Database &gt; Backups. Supabase Pro include backup giornalieri automatici.
            </p>
          </div>`,
      });

      logger.info("cron:backup", "Snapshot email inviata", { to: adminEmail });
    }

    // ── ACTIVITY_OVERDUE trigger ─────────────────────────────────────────────
    // Trova tutte le attività scadute non ancora completate e triggera i workflow
    const overdueActivities = await db.activity.findMany({
      where: {
        completedAt: null,
        dueDate: { lt: new Date() },
      },
      select: { id: true, organizationId: true, userId: true, dealId: true, contactId: true },
    });

    if (overdueActivities.length > 0) {
      logger.info("cron:backup", "Attività scadute trovate", { count: overdueActivities.length });
      // Raggruppa per org e triggera workflow (max 50 per evitare timeout)
      const toProcess = overdueActivities.slice(0, 50);
      await Promise.allSettled(
        toProcess.map((a) =>
          runWorkflows({
            trigger: "ACTIVITY_OVERDUE",
            orgId: a.organizationId,
            activityId: a.id,
            ownerId: a.userId,
            dealId: a.dealId ?? undefined,
            contactId: a.contactId ?? undefined,
          })
        )
      );
    }

    // ── WorkflowQueue — resume paused workflows whose delay has elapsed ────────
    const dueQueueItems = await db.workflowQueue.findMany({
      where: { resumeAt: { lte: new Date() } },
      include: { workflow: { select: { id: true, steps: true, isActive: true } } },
      take: 50,
    });

    let queueResumed = 0;
    for (const item of dueQueueItems) {
      if (!item.workflow.isActive) {
        await db.workflowQueue.delete({ where: { id: item.id } });
        continue;
      }
      const payload = item.payload as WorkflowPayload;
      const entityId = ("dealId" in payload ? payload.dealId : "contactId" in payload ? (payload.contactId ?? "") : "leadId" in payload ? payload.leadId : "") ?? "";
      const entityLabel = "dealTitle" in payload ? payload.dealTitle : "contactName" in payload ? payload.contactName : "leadTitle" in payload ? payload.leadTitle : "";
      const entityType = payload.trigger.startsWith("DEAL") ? "deal" : payload.trigger.startsWith("CONTACT") ? "contact" : "lead";

      await runStepsFrom({
        workflows: [item.workflow],
        payload,
        orgId: item.orgId,
        ownerId: item.ownerId,
        entityId,
        entityLabel,
        entityType,
        startIndex: item.stepIndex,
      });
      await db.workflowQueue.delete({ where: { id: item.id } });
      queueResumed++;
    }

    if (queueResumed > 0) {
      logger.info("cron:backup", "Workflow in coda ripresi", { count: queueResumed });
    }

    // ── Webhook retry — fallback daily run (a dedicated cron handles it more
    // frequently when the plan allows; this guarantees retries happen at least daily).
    const webhooksRetried = await processWebhookRetries(100).catch(() => 0);
    if (webhooksRetried > 0) {
      logger.info("cron:backup", "Consegne webhook ritentate", { count: webhooksRetried });
    }

    return NextResponse.json({ ok: true, snapshot, overdueTriggered: overdueActivities.length, queueResumed, webhooksRetried });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("cron:backup", "Backup snapshot fallito", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
