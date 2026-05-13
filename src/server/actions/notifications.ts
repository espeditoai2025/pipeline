"use server";

import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function getOrgId(s: Session | null) {
  return (s?.user as { organizationId?: string } | undefined)?.organizationId ?? null;
}

export type AppNotification = {
  id: string;
  type: "overdue_activity" | "deal_won" | "deal_lost" | "new_lead";
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};

export async function getNotifications(): Promise<AppNotification[]> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return [];

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400_000);

  const [overdueActivities, recentWon, recentLost, recentLeads] = await Promise.all([
    db.activity.findMany({
      where: {
        organizationId: orgId,
        completedAt: null,
        dueDate: { lt: now },
      },
      select: { id: true, subject: true, dueDate: true, type: true },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    db.deal.findMany({
      where: { organizationId: orgId, status: "WON", closedAt: { gte: sevenDaysAgo } },
      select: { id: true, title: true, closedAt: true },
      orderBy: { closedAt: "desc" },
      take: 3,
    }),
    db.deal.findMany({
      where: { organizationId: orgId, status: "LOST", closedAt: { gte: sevenDaysAgo } },
      select: { id: true, title: true, closedAt: true },
      orderBy: { closedAt: "desc" },
      take: 2,
    }),
    db.lead.findMany({
      where: { organizationId: orgId, status: "NEW", createdAt: { gte: sevenDaysAgo } },
      select: { id: true, title: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  const notifications: AppNotification[] = [];

  for (const a of overdueActivities) {
    const daysLate = Math.floor((now.getTime() - new Date(a.dueDate!).getTime()) / 86400_000);
    notifications.push({
      id: `act-${a.id}`,
      type: "overdue_activity",
      title: "Attività scaduta",
      body: `"${a.subject}" — ${daysLate === 0 ? "scaduta oggi" : `scaduta ${daysLate} giorn${daysLate === 1 ? "o" : "i"} fa`}`,
      createdAt: a.dueDate!.toISOString(),
      read: false,
    });
  }

  for (const d of recentWon) {
    notifications.push({
      id: `won-${d.id}`,
      type: "deal_won",
      title: "Affare vinto",
      body: `"${d.title}" è stato chiuso come vinto`,
      createdAt: d.closedAt!.toISOString(),
      read: true,
    });
  }

  for (const d of recentLost) {
    notifications.push({
      id: `lost-${d.id}`,
      type: "deal_lost",
      title: "Affare perso",
      body: `"${d.title}" è stato chiuso come perso`,
      createdAt: d.closedAt!.toISOString(),
      read: true,
    });
  }

  for (const l of recentLeads) {
    notifications.push({
      id: `lead-${l.id}`,
      type: "new_lead",
      title: "Nuovo lead",
      body: `"${l.title}" è entrato nella pipeline lead`,
      createdAt: l.createdAt.toISOString(),
      read: true,
    });
  }

  // Sort by date desc
  return notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
