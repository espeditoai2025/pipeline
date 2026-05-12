// Reporting utility — computes all metrics from mock data
import { MOCK_PIPELINE } from "./mock-data";
import { MOCK_ACTIVITIES } from "./mock-activities";
import { MOCK_CONTACTS } from "./mock-contacts";

export type Period = "7d" | "30d" | "90d" | "12m";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function periodStart(period: Period): Date {
  switch (period) {
    case "7d":  return daysAgo(7);
    case "30d": return daysAgo(30);
    case "90d": return daysAgo(90);
    case "12m": return daysAgo(365);
  }
}

const ALL_DEALS = MOCK_PIPELINE.stages.flatMap((s) => s.deals);

// ---- KPIs ----

export function getKpis(period: Period) {
  const since = periodStart(period);
  const prevSince = new Date(since.getTime() - (Date.now() - since.getTime()));

  const open = ALL_DEALS.filter((d) => d.status === "OPEN");
  const won = ALL_DEALS.filter((d) => d.status === "WON" && d.closedAt && new Date(d.closedAt) >= since);
  const lost = ALL_DEALS.filter((d) => d.status === "LOST" && d.closedAt && new Date(d.closedAt) >= since);
  const wonPrev = ALL_DEALS.filter((d) => d.status === "WON" && d.closedAt && new Date(d.closedAt) >= prevSince && new Date(d.closedAt) < since);

  const totalPipelineValue = open.reduce((s, d) => s + d.value, 0);
  const wonValue = won.reduce((s, d) => s + d.value, 0);
  const wonValuePrev = wonPrev.reduce((s, d) => s + d.value, 0);

  const winRate = (won.length + lost.length) > 0
    ? Math.round((won.length / (won.length + lost.length)) * 100)
    : 0;

  const avgDealSize = won.length > 0 ? Math.round(wonValue / won.length) : 0;

  const overdueActivities = MOCK_ACTIVITIES.filter(
    (a) => !a.completedAt && a.dueDate && new Date(a.dueDate) < new Date()
  ).length;

  const revenueChange = wonValuePrev > 0
    ? Math.round(((wonValue - wonValuePrev) / wonValuePrev) * 100)
    : wonValue > 0 ? 100 : 0;

  return {
    openDeals: open.length,
    totalPipelineValue,
    wonDeals: won.length,
    wonValue,
    winRate,
    avgDealSize,
    overdueActivities,
    revenueChange,
    contactsCount: MOCK_CONTACTS.length,
  };
}

// ---- Funnel by stage ----

export function getFunnelData() {
  return MOCK_PIPELINE.stages.map((s) => ({
    name: s.name,
    affari: s.deals.filter((d) => d.status === "OPEN").length,
    valore: s.deals.filter((d) => d.status === "OPEN").reduce((sum, d) => sum + d.value, 0),
    probability: s.probability,
  }));
}

// ---- Won/Lost trend (last 6 months) ----

export function getTrendData() {
  const months: { label: string; vinti: number; persi: number; valore: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const year = d.getFullYear();
    const month = d.getMonth();
    const label = d.toLocaleDateString("it-IT", { month: "short" });

    const won = ALL_DEALS.filter((deal) => {
      if (!deal.closedAt || deal.status !== "WON") return false;
      const cd = new Date(deal.closedAt);
      return cd.getFullYear() === year && cd.getMonth() === month;
    });
    const lost = ALL_DEALS.filter((deal) => {
      if (!deal.closedAt || deal.status !== "LOST") return false;
      const cd = new Date(deal.closedAt);
      return cd.getFullYear() === year && cd.getMonth() === month;
    });

    months.push({
      label,
      vinti: won.length,
      persi: lost.length,
      valore: won.reduce((s, d) => s + d.value, 0),
    });
  }
  return months;
}

// ---- Activities by type ----

export function getActivitiesByType() {
  const counts: Record<string, { completate: number; pendenti: number }> = {};
  for (const a of MOCK_ACTIVITIES) {
    if (!counts[a.type]) counts[a.type] = { completate: 0, pendenti: 0 };
    if (a.completedAt) counts[a.type]!.completate++;
    else counts[a.type]!.pendenti++;
  }
  const labels: Record<string, string> = {
    CALL: "Chiamate", MEETING: "Meeting", EMAIL: "Email",
    TASK: "Attività", DEADLINE: "Scadenze", LUNCH: "Pranzi",
  };
  return Object.entries(counts).map(([type, c]) => ({
    name: labels[type] ?? type,
    ...c,
    totale: c.completate + c.pendenti,
  }));
}

// ---- Top performers ----

export function getTopPerformers() {
  // Aggregate by owner from all deals
  const perf: Record<string, { name: string; vinti: number; valore: number; winRate: number }> = {};
  for (const deal of ALL_DEALS) {
    if (!perf[deal.ownerId]) {
      perf[deal.ownerId] = { name: deal.owner?.name ?? deal.ownerId, vinti: 0, valore: 0, winRate: 0 };
    }
    if (deal.status === "WON") {
      perf[deal.ownerId]!.vinti++;
      perf[deal.ownerId]!.valore += deal.value;
    }
  }
  // Calculate win rates
  for (const ownerId of Object.keys(perf)) {
    const ownerDeals = ALL_DEALS.filter((d) => d.ownerId === ownerId);
    const closed = ownerDeals.filter((d) => d.status === "WON" || d.status === "LOST");
    const won = ownerDeals.filter((d) => d.status === "WON");
    perf[ownerId]!.winRate = closed.length > 0 ? Math.round((won.length / closed.length) * 100) : 0;
  }
  return Object.values(perf)
    .sort((a, b) => b.valore - a.valore)
    .slice(0, 5);
}

// ---- Forecast ----

export function getForecast() {
  const open = ALL_DEALS.filter((d) => d.status === "OPEN");
  let weighted = 0;
  for (const deal of open) {
    const stage = MOCK_PIPELINE.stages.find((s) => s.id === deal.stageId);
    const prob = (stage?.probability ?? 50) / 100;
    weighted += deal.value * prob;
  }
  return { pipeline: open.reduce((s, d) => s + d.value, 0), forecast: Math.round(weighted) };
}

// ---- CSV Export ----

export function exportDealsCSV(): string {
  const headers = ["ID", "Titolo", "Valore", "Valuta", "Stato", "Stage", "Owner", "Creato", "Chiusura prevista"];
  const rows = ALL_DEALS.map((d) => {
    const stage = MOCK_PIPELINE.stages.find((s) => s.id === d.stageId);
    return [
      d.id, d.title, d.value, d.currency, d.status,
      stage?.name ?? "", d.owner?.name ?? "",
      d.createdAt?.slice(0, 10) ?? "",
      d.expectedClose?.slice(0, 10) ?? "",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
  });
  return [headers.join(","), ...rows].join("\n");
}
