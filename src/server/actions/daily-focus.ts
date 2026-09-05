"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { italianDayBounds } from "@/lib/italian-date";
import type { Prisma } from "@/generated/prisma/client";

export async function getDailyFocus() {
  const session = await auth();
  const userId = session?.user?.id;
  const organizationId = (session?.user as { organizationId?: string } | undefined)?.organizationId;
  if (!userId || !organizationId) return null;

  const now = new Date();
  const { end } = italianDayBounds(now);
  const activityWhere = { organizationId, userId, completedAt: null };
  const followUpWhere: Prisma.DealWhereInput = {
    organizationId, ownerId: userId, status: "OPEN",
    activities: { none: { organizationId, completedAt: null, dueDate: { gte: now } } },
  };
  const activitySelect = {
    id: true, subject: true, dueDate: true, type: true,
    deal: { select: { id: true, title: true } },
    contact: { select: { id: true, firstName: true, lastName: true } },
  } as const;
  const [overdueCount, todayCount, followUpCount, overdue, today, deals] = await Promise.all([
    db.activity.count({ where: { ...activityWhere, dueDate: { lt: now } } }),
    db.activity.count({ where: { ...activityWhere, dueDate: { gte: now, lt: end } } }),
    db.deal.count({ where: followUpWhere }),
    db.activity.findMany({ where: { ...activityWhere, dueDate: { lt: now } }, select: activitySelect, orderBy: [{ dueDate: "asc" }, { id: "asc" }], take: 4 }),
    db.activity.findMany({ where: { ...activityWhere, dueDate: { gte: now, lt: end } }, select: activitySelect, orderBy: [{ dueDate: "asc" }, { id: "asc" }], take: 4 }),
    db.deal.findMany({
      where: followUpWhere,
      select: { id: true, title: true, value: true, currency: true, expectedClose: true, contactId: true, stage: { select: { name: true } } },
      orderBy: [{ expectedClose: { sort: "asc", nulls: "last" } }, { updatedAt: "asc" }, { id: "asc" }],
      take: 5,
    }),
  ]);
  return {
    generatedAt: now.toISOString(), overdueCount, todayCount, followUpCount,
    activities: [...overdue, ...today].map(activity => ({
      ...activity, dueDate: activity.dueDate!.toISOString(), overdue: activity.dueDate! < now,
    })),
    deals: deals.map(deal => ({ ...deal, value: Number(deal.value), expectedClose: deal.expectedClose?.toISOString() ?? null })),
  };
}

export type DailyFocusData = NonNullable<Awaited<ReturnType<typeof getDailyFocus>>>;
