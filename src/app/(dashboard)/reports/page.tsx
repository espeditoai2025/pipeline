"use client";

import { useState, useTransition, useEffect } from "react";
import {
  BarChart3, TrendingUp, Target, Users, Download,
  Briefcase, Euro, CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
const ChartSkeleton = () => <div className="h-48 animate-pulse rounded-xl bg-[var(--crm-neutral-100)]" />;
const FunnelChart         = dynamic(() => import("@/components/charts/FunnelChart").then(m => m.FunnelChart), { ssr: false, loading: ChartSkeleton });
const TrendChart          = dynamic(() => import("@/components/charts/TrendChart").then(m => m.TrendChart), { ssr: false, loading: ChartSkeleton });
const ActivitiesByTypeChart = dynamic(() => import("@/components/charts/ActivitiesByTypeChart").then(m => m.ActivitiesByTypeChart), { ssr: false, loading: ChartSkeleton });
const TopPerformersTable  = dynamic(() => import("@/components/charts/TopPerformersTable").then(m => m.TopPerformersTable), { ssr: false, loading: () => <div className="h-24 animate-pulse rounded-xl bg-[var(--crm-neutral-100)]" /> });
import { getReportData } from "@/server/actions/reports";
import { AIInsightsStrip } from "@/components/ai/AIInsightsStrip";

type Period = "7d" | "30d" | "90d" | "12m";

const PERIODS: { value: Period; label: string }[] = [
  { value: "7d", label: "7 giorni" },
  { value: "30d", label: "30 giorni" },
  { value: "90d", label: "90 giorni" },
  { value: "12m", label: "12 mesi" },
];

function formatEur(v: number) {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}k`;
  return `€${v}`;
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

type ReportData = Awaited<ReturnType<typeof getReportData>>;

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>("30d");
  const [data, setData] = useState<ReportData>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await getReportData(period);
      setData(result);
    });
  }, [period]);

  const kpis = data?.kpis;
  const funnel = data?.funnel ?? [];
  const trend = data?.trend ?? [];
  const byType = data?.byType ?? [];
  const performers = data?.performers ?? [];

  function handleExportCSV() {
    if (!data) return;
    const rows: string[][] = [];
    const periodLabel = PERIODS.find((p) => p.value === period)?.label ?? period;

    rows.push([`Report Pipely — ${periodLabel}`, "", "", ""]);
    rows.push(["", "", "", ""]);

    rows.push(["KPI", "Valore", "", ""]);
    rows.push(["Affari aperti", String(kpis?.openDeals ?? 0), "", ""]);
    rows.push(["Revenue periodo (€)", String(kpis?.wonValue ?? 0), "", ""]);
    rows.push(["Affari vinti", String(kpis?.wonDeals ?? 0), "", ""]);
    rows.push(["Affari persi", String(kpis?.lostDeals ?? 0), "", ""]);
    rows.push(["Win rate (%)", String(kpis?.convRate ?? 0), "", ""]);
    rows.push(["Avg deal size (€)", String(Math.round(kpis?.avgDeal ?? 0)), "", ""]);
    rows.push(["Attività", String(kpis?.activities ?? 0), "", ""]);
    rows.push(["", "", "", ""]);

    rows.push(["Trend mensile", "Vinti", "Persi", "Revenue (€)"]);
    for (const t of trend) rows.push([t.label, String(t.vinti), String(t.persi), String(t.valore)]);
    rows.push(["", "", "", ""]);

    rows.push(["Pipeline per stage", "Deal", "Valore (€)", ""]);
    for (const f of funnel) rows.push([f.stage, String(f.count), String(f.value), ""]);
    rows.push(["", "", "", ""]);

    rows.push(["Top performer", "Affari vinti", "Revenue (€)", "Conv. rate (%)"]);
    for (const p of performers) rows.push([p.name, String(p.won), String(p.revenue), String(p.convRate)]);

    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pipely-report-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const kpiCards = kpis ? [
    {
      title: "Affari aperti", value: String(kpis.openDeals),
      sub: `Pipeline: ${formatEur(kpis.totalValue)}`,
      icon: Briefcase, iconBg: "bg-blue-50 dark:bg-blue-900/20", iconColor: "text-[var(--crm-primary)]",
    },
    {
      title: "Revenue (periodo)", value: formatEur(kpis.wonValue),
      sub: `${kpis.wonDeals} affari vinti`,
      icon: Euro, iconBg: "bg-green-50 dark:bg-green-900/20", iconColor: "text-[var(--crm-success)]",
    },
    {
      title: "Win rate", value: `${kpis.convRate}%`,
      sub: "Affari vinti / chiusi",
      icon: Target, iconBg: "bg-purple-50 dark:bg-purple-900/20", iconColor: "text-purple-600",
    },
    {
      title: "Avg deal size", value: formatEur(kpis.avgDeal),
      sub: "Valore medio vinti",
      icon: TrendingUp, iconBg: "bg-yellow-50 dark:bg-yellow-900/20", iconColor: "text-[var(--crm-warning)]",
    },
    {
      title: "Affari persi", value: String(kpis.lostDeals),
      sub: "Nel periodo selezionato",
      icon: CheckCircle, iconBg: "bg-red-50 dark:bg-red-900/20", iconColor: "text-[var(--crm-danger)]",
    },
    {
      title: "Attività", value: String(kpis.activities),
      sub: "Nel periodo selezionato",
      icon: Users, iconBg: "bg-sky-50 dark:bg-sky-900/20", iconColor: "text-sky-600",
    },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--crm-primary)]/10">
            <BarChart3 className="h-5 w-5 text-[var(--crm-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Report</h1>
            <p className="text-sm text-[var(--crm-neutral-500)]">Analisi performance vendite</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-[var(--crm-neutral-100)] overflow-hidden">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors border-r border-[var(--crm-neutral-100)] last:border-r-0 ${period === p.value ? "bg-[var(--crm-primary)] text-white" : "text-[var(--crm-neutral-600)] hover:bg-[var(--crm-neutral-50)]"}`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!data || isPending}>
            <Download className="h-4 w-4 mr-1.5" /> Esporta CSV
          </Button>
        </div>
      </div>

      <AIInsightsStrip />

      {isPending || !data ? (
        <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-12 text-center text-sm text-[var(--crm-neutral-500)]">
          Caricamento dati...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            {kpiCards.map((k) => (
              <div key={k.title} className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${k.iconBg}`}>
                    <k.icon className={`h-4 w-4 ${k.iconColor}`} />
                  </div>
                </div>
                <p className="text-xl font-bold">{k.value}</p>
                <p className="text-xs text-[var(--crm-neutral-500)] mt-0.5">{k.title}</p>
                <p className="text-xs text-[var(--crm-neutral-400)] mt-0.5">{k.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Pipeline per stage (affari aperti)">
              <FunnelChart data={funnel.map((f) => ({ name: f.stage, affari: f.count, valore: f.value, probability: 0 }))} />
            </ChartCard>

            <ChartCard title="Revenue ultimi 6 mesi">
              <TrendChart data={trend} showValue />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Affari vinti vs persi (6 mesi)">
              <TrendChart data={trend} showValue={false} />
            </ChartCard>

            <ChartCard title="Attività per tipo">
              <ActivitiesByTypeChart data={byType.map((b) => ({ name: b.type, completate: b.count, pendenti: 0, totale: b.count }))} />
            </ChartCard>
          </div>

          <ChartCard title="Top performer">
            <TopPerformersTable data={performers.map((p) => ({ name: p.name ?? "", vinti: p.won, valore: p.revenue, winRate: p.convRate }))} />
          </ChartCard>
        </>
      )}
    </div>
  );
}
