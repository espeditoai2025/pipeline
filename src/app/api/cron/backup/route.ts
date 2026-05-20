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
import { resend, FROM_DEFAULT } from "@/lib/resend";
import { logger } from "@/lib/logger";
import { runWorkflows } from "@/lib/workflow-engine";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized triggers
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (secret && authHeader !== `Bearer ${secret}`) {
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
    if (resend && adminEmail) {
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.pipely.it").replace(/\/$/, "");

      await resend.emails.send({
        from: FROM_DEFAULT,
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

    return NextResponse.json({ ok: true, snapshot, overdueTriggered: overdueActivities.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("cron:backup", "Backup snapshot fallito", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
