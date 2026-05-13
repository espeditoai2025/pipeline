"use server";

import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function getOrgId(s: Session | null) {
  return (s?.user as { organizationId?: string } | undefined)?.organizationId ?? null;
}

export async function getDashboardData() {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return null;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400_000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400_000);

  const [
    openDeals,
    wonThisPeriod,
    lostThisPeriod,
    wonPrevPeriod,
    overdueActivities,
    stages,
  ] = await Promise.all([
    // Open deals with stage info
    db.deal.findMany({
      where: { organizationId: orgId, status: "OPEN" },
      select: { value: true, stageId: true },
    }),
    // Won in last 30 days
    db.deal.findMany({
      where: { organizationId: orgId, status: "WON", closedAt: { gte: thirtyDaysAgo } },
      select: { value: true },
    }),
    // Lost in last 30 days
    db.deal.count({
      where: { organizationId: orgId, status: "LOST", closedAt: { gte: thirtyDaysAgo } },
    }),
    // Won in previous 30 days (for % change)
    db.deal.findMany({
      where: { organizationId: orgId, status: "WON", closedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      select: { value: true },
    }),
    // Overdue activities
    db.activity.count({
      where: { organizationId: orgId, completedAt: null, dueDate: { lt: now } },
    }),
    // Stages for pipeline chart
    db.stage.findMany({
      where: { pipeline: { organizationId: orgId } },
      select: { id: true, name: true, position: true, probability: true },
      orderBy: { position: "asc" },
    }),
  ]);

  // KPIs
  const totalValue = openDeals.reduce((s, d) => s + Number(d.value), 0);
  const wonValue = wonThisPeriod.reduce((s, d) => s + Number(d.value), 0);
  const prevWonValue = wonPrevPeriod.reduce((s, d) => s + Number(d.value), 0);
  const totalClosed = wonThisPeriod.length + lostThisPeriod;
  const winRate = totalClosed > 0 ? Math.round((wonThisPeriod.length / totalClosed) * 100) : 0;
  const avgDeal = wonThisPeriod.length > 0 ? wonValue / wonThisPeriod.length : 0;

  // Revenue change %
  const revenueChange = prevWonValue > 0
    ? Math.round(((wonValue - prevWonValue) / prevWonValue) * 100)
    : wonValue > 0 ? 100 : 0;

  // Forecast ponderato
  const stageProb = new Map(stages.map((s) => [s.id, s.probability ?? 0]));
  const forecast = openDeals.reduce((s, d) => {
    const prob = stageProb.get(d.stageId) ?? 50;
    return s + Number(d.value) * (prob / 100);
  }, 0);

  // Pipeline chart data (per stage)
  const stageDeals = new Map<string, { affari: number; valore: number }>();
  for (const stage of stages) {
    stageDeals.set(stage.id, { affari: 0, valore: 0 });
  }
  for (const deal of openDeals) {
    const entry = stageDeals.get(deal.stageId);
    if (entry) {
      entry.affari += 1;
      entry.valore += Number(deal.value);
    }
  }
  const pipelineChartData = stages.map((s) => ({
    name: s.name,
    affari: stageDeals.get(s.id)?.affari ?? 0,
    valore: stageDeals.get(s.id)?.valore ?? 0,
  }));

  return {
    kpis: {
      openDeals: openDeals.length,
      totalValue,
      wonDeals: wonThisPeriod.length,
      wonValue,
      winRate,
      avgDeal,
      overdueActivities,
      revenueChange,
    },
    forecast: Math.round(forecast),
    pipelineChartData,
  };
}
