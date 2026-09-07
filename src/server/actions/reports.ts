"use server";
import { calculateReport } from "@/lib/report-metrics";

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

export async function getReportData(period: string, requestedCurrency = "EUR") {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return null;

  if (!["7d", "30d", "90d", "12m"].includes(period) || !/^[A-Z]{3}$/.test(requestedCurrency)) return null;
  const currency = requestedCurrency;
  const since = periodStart(period);

  const trendSince = new Date();
  trendSince.setMonth(trendSince.getMonth() - 6);
  trendSince.setDate(1);
  trendSince.setHours(0, 0, 0, 0);

  const [allDeals, trendDeals, stages, activities, users, currencyRows] = await Promise.all([
    db.deal.findMany({
      where: { organizationId: orgId, currency, OR: [{ status: "OPEN" }, { status: { in: ["WON", "LOST"] }, closedAt: { gte: since, lte: new Date() } }] },
      select: {
        id: true, value: true, status: true, stageId: true,
        closedAt: true, createdAt: true, ownerId: true,
        owner: { select: { id: true, name: true } },
      },
    }),
    db.deal.findMany({
      where: { organizationId: orgId, currency, OR: [{ status: { in: ["WON", "LOST"] }, closedAt: { gte: trendSince, lte: new Date() } }, { status: "OPEN", createdAt: { gte: trendSince } }] },
      select: { value: true, status: true, closedAt: true, createdAt: true },
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
    db.deal.findMany({ where: { organizationId: orgId, status: { not: "DELETED" } }, distinct: ["currency"], select: { currency: true } }),
  ]);

  return { currency, currencies: [...new Set(["EUR", ...currencyRows.map(r => r.currency).filter(c => /^[A-Z]{3}$/.test(c))])].sort(), ...calculateReport({ allDeals, trendDeals, stages, activities, users }) };
}
