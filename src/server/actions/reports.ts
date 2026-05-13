"use server";

import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function getOrgId(s: Session | null) {
  return (s?.user as { organizationId?: string } | undefined)?.organizationId ?? null;
}

function periodStart(period: string): Date {
  const now = new Date();
  if (period === "7d") return new Date(now.getTime() - 7 * 86400000);
  if (period === "30d") return new Date(now.getTime() - 30 * 86400000);
  if (period === "90d") return new Date(now.getTime() - 90 * 86400000);
  // 12m
  return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
}

export async function getReportData(period: string) {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return null;

  const since = periodStart(period);

  const [allDeals, stages, activities, users] = await Promise.all([
    db.deal.findMany({
      where: { organizationId: orgId, createdAt: { gte: since } },
      select: {
        id: true, value: true, status: true, stageId: true,
        closedAt: true, createdAt: true, ownerId: true,
        owner: { select: { id: true, name: true } },
      },
    }),
    db.stage.findMany({
      where: { pipeline: { organizationId: orgId } },
      orderBy: { position: "asc" },
      select: { id: true, name: true, position: true },
    }),
    db.activity.findMany({
      where: { organizationId: orgId, createdAt: { gte: since } },
      select: { type: true },
    }),
    db.user.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true, email: true },
    }),
  ]);

  const open = allDeals.filter((d) => d.status === "OPEN");
  const won = allDeals.filter((d) => d.status === "WON");
  const lost = allDeals.filter((d) => d.status === "LOST");

  const totalValue = open.reduce((s, d) => s + Number(d.value), 0);
  const wonValue = won.reduce((s, d) => s + Number(d.value), 0);
  const convRate = allDeals.length > 0 ? Math.round((won.length / allDeals.length) * 100) : 0;
  const avgDeal = won.length > 0 ? wonValue / won.length : 0;

  // Funnel
  const funnel = stages.map((s) => {
    const stageDeals = allDeals.filter((d) => d.stageId === s.id);
    return {
      stage: s.name,
      count: stageDeals.length,
      value: stageDeals.reduce((sum, d) => sum + Number(d.value), 0),
    };
  });

  // Trend (last 6 months)
  const trend: { label: string; vinti: number; persi: number; valore: number; pipeline: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const label = d.toLocaleString("it-IT", { month: "short" });
    const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const mDeals = allDeals.filter((x) => {
      const at = new Date(x.createdAt);
      return at >= mStart && at <= mEnd;
    });
    trend.push({
      label,
      vinti: mDeals.filter((x) => x.status === "WON").length,
      persi: mDeals.filter((x) => x.status === "LOST").length,
      valore: mDeals.filter((x) => x.status === "WON").reduce((s, x) => s + Number(x.value), 0),
      pipeline: mDeals.filter((x) => x.status === "OPEN").reduce((s, x) => s + Number(x.value), 0),
    });
  }

  // Activities by type
  const typeCount: Record<string, number> = {};
  for (const a of activities) {
    typeCount[a.type] = (typeCount[a.type] ?? 0) + 1;
  }
  const byType = Object.entries(typeCount).map(([type, count]) => ({ type, count }));

  // Top performers
  const performers = users.map((u) => {
    const uDeals = allDeals.filter((d) => d.ownerId === u.id);
    const uWon = uDeals.filter((d) => d.status === "WON");
    return {
      id: u.id,
      name: u.name ?? u.email,
      won: uWon.length,
      revenue: uWon.reduce((s, d) => s + Number(d.value), 0),
      pipeline: uDeals.filter((d) => d.status === "OPEN").reduce((s, d) => s + Number(d.value), 0),
      convRate: uDeals.length > 0 ? Math.round((uWon.length / uDeals.length) * 100) : 0,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  return {
    kpis: {
      openDeals: open.length,
      totalValue,
      wonDeals: won.length,
      lostDeals: lost.length,
      wonValue,
      convRate,
      avgDeal,
      activities: activities.length,
    },
    funnel,
    trend,
    byType,
    performers,
  };
}
