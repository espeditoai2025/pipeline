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
    : wonValue > 0 ? null : 0;

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

export type ForecastMonth = {
  label: string;
  actual: number;
  forecast: number;
};

export async function getForecastData(): Promise<ForecastMonth[] | null> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return null;

  const now = new Date();

  // Get won deals in last 6 months for "actual" bars
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const [wonDeals, openDeals, stages] = await Promise.all([
    db.deal.findMany({
      where: { organizationId: orgId, status: "WON", closedAt: { gte: sixMonthsAgo } },
      select: { value: true, closedAt: true },
    }),
    db.deal.findMany({
      where: { organizationId: orgId, status: "OPEN" },
      select: { value: true, stageId: true, expectedClose: true },
    }),
    db.stage.findMany({
      where: { pipeline: { organizationId: orgId } },
      select: { id: true, probability: true },
    }),
  ]);

  const stageProb = new Map(stages.map((s) => [s.id, s.probability ?? 50]));

  const months: ForecastMonth[] = [];

  for (let i = 5; i >= -3; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const label = d.toLocaleString("it-IT", { month: "short", year: "2-digit" });

    // Actual: won deals closed in this month
    const actual = i >= 0
      ? wonDeals
          .filter((x) => x.closedAt && new Date(x.closedAt) >= mStart && new Date(x.closedAt) < mEnd)
          .reduce((s, x) => s + Number(x.value), 0)
      : 0;

    // Forecast: for future months (i < 0), weight open deals by stage probability + expected close
    let forecast = 0;
    if (i <= 0) {
      for (const deal of openDeals) {
        const prob = stageProb.get(deal.stageId) ?? 50;
        if (deal.expectedClose) {
          const closeDate = new Date(deal.expectedClose);
          if (closeDate >= mStart && closeDate < mEnd) {
            forecast += Number(deal.value) * (prob / 100);
          }
        } else if (i === 0) {
          // Deals without expected close go into current month
          forecast += Number(deal.value) * (prob / 100);
        }
      }
    }

    months.push({ label, actual: Math.round(actual), forecast: Math.round(forecast) });
  }

  return months;
}

export type OnboardingStatus = {
  hasCompany:   boolean;
  hasContact:   boolean;
  hasLead:      boolean;
  hasProduct:   boolean;
  hasDeal:      boolean;
  hasActivity:  boolean;
  hasPipeline:  boolean;
  hasSmtp:      boolean;
  hasWorkflow:  boolean;
  hasEmailList: boolean;
  hasCampaign:  boolean;
  hasCrmMode:   boolean;
};

export async function getOnboardingStatus(): Promise<OnboardingStatus | null> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return null;

  const [companies, contacts, leads, products, deals, activities, pipelines, smtp, workflows, emailLists, campaigns, org] = await Promise.all([
    db.company.count({ where: { organizationId: orgId } }),
    db.contact.count({ where: { organizationId: orgId } }),
    db.lead.count({ where: { organizationId: orgId } }),
    db.product.count({ where: { organizationId: orgId } }),
    db.deal.count({ where: { organizationId: orgId } }),
    db.activity.count({ where: { organizationId: orgId } }),
    db.pipeline.count({ where: { organizationId: orgId } }),
    db.smtpConfig.count({ where: { organizationId: orgId } }),
    db.workflow.count({ where: { organizationId: orgId } }),
    db.emailList.count({ where: { organizationId: orgId } }),
    db.emailCampaign.count({ where: { organizationId: orgId } }),
    db.organization.findUnique({ where: { id: orgId }, select: { crmMode: true } }),
  ]);

  return {
    hasCompany:   companies  > 0,
    hasContact:   contacts   > 0,
    hasLead:      leads      > 0,
    hasProduct:   products   > 0,
    hasDeal:      deals      > 0,
    hasActivity:  activities > 0,
    hasPipeline:  pipelines  > 0,
    hasSmtp:      smtp       > 0,
    hasWorkflow:  workflows  > 0,
    hasEmailList: emailLists > 0,
    hasCampaign:  campaigns  > 0,
    hasCrmMode:   !!org?.crmMode,
  };
}

// ─── Team Performance / Leaderboard ───────────────────────────────────────────

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  dealsWon: number;
  revenue: number;
  dealsOpen: number;
  activitiesDone: number;
  winRate: number;
};

export async function getTeamPerformance(days: number = 30): Promise<TeamMember[]> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return [];

  const since = new Date(Date.now() - days * 86400_000);

  const users = await db.user.findMany({
    where: { organizationId: orgId },
    select: {
      id: true,
      name: true,
      email: true,
      ownedDeals: {
        where: {
          OR: [
            { status: "WON", closedAt: { gte: since } },
            { status: "LOST", closedAt: { gte: since } },
            { status: "OPEN" },
          ],
        },
        select: { status: true, value: true },
      },
      activities: {
        where: { completedAt: { gte: since } },
        select: { id: true },
      },
    },
  });

  return users
    .map((u) => {
      const won = u.ownedDeals.filter((d) => d.status === "WON");
      const lost = u.ownedDeals.filter((d) => d.status === "LOST");
      const open = u.ownedDeals.filter((d) => d.status === "OPEN");
      const closed = won.length + lost.length;
      return {
        id: u.id,
        name: u.name ?? u.email.split("@")[0]!,
        email: u.email,
        dealsWon: won.length,
        revenue: won.reduce((s, d) => s + Number(d.value), 0),
        dealsOpen: open.length,
        activitiesDone: u.activities.length,
        winRate: closed > 0 ? Math.round((won.length / closed) * 100) : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}
