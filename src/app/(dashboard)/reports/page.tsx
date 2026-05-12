"use client";

import { useState } from "react";
import {
  BarChart3, TrendingUp, Target, Users, Download,
  Briefcase, Euro, CheckCircle, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FunnelChart } from "@/components/charts/FunnelChart";
import { TrendChart } from "@/components/charts/TrendChart";
import { ActivitiesByTypeChart } from "@/components/charts/ActivitiesByTypeChart";
import { TopPerformersTable } from "@/components/charts/TopPerformersTable";
import {
  getKpis, getFunnelData, getTrendData, getActivitiesByType, getTopPerformers, getForecast, exportDealsCSV,
  type Period,
} from "@/lib/reporting";
import { AIInsightsStrip } from "@/components/ai/AIInsightsStrip";

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

function ChartCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>("30d");

  const kpis = getKpis(period);
  const funnel = getFunnelData();
  const trend = getTrendData();
  const byType = getActivitiesByType();
  const performers = getTopPerformers();
  const forecast = getForecast();

  function handleExportCSV() {
    const csv = exportDealsCSV();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deals-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const kpiCards = [
    {
      title: "Affari aperti", value: String(kpis.openDeals),
      sub: `Pipeline: ${formatEur(kpis.totalPipelineValue)}`,
      icon: Briefcase, iconBg: "bg-blue-50 dark:bg-blue-900/20", iconColor: "text-[var(--crm-primary)]",
      change: "+12%", positive: true,
    },
    {
      title: "Revenue (periodo)", value: formatEur(kpis.wonValue),
      sub: `${kpis.wonDeals} affari vinti`,
      icon: Euro, iconBg: "bg-green-50 dark:bg-green-900/20", iconColor: "text-[var(--crm-success)]",
      change: `${kpis.revenueChange >= 0 ? "+" : ""}${kpis.revenueChange}%`, positive: kpis.revenueChange >= 0,
    },
    {
      title: "Win rate", value: `${kpis.winRate}%`,
      sub: "Affari vinti / chiusi",
      icon: Target, iconBg: "bg-purple-50 dark:bg-purple-900/20", iconColor: "text-purple-600",
      change: "+3%", positive: true,
    },
    {
      title: "Avg deal size", value: formatEur(kpis.avgDealSize),
      sub: "Valore medio vinti",
      icon: TrendingUp, iconBg: "bg-yellow-50 dark:bg-yellow-900/20", iconColor: "text-[var(--crm-warning)]",
      change: "+5%", positive: true,
    },
    {
      title: "Attività scadute", value: String(kpis.overdueActivities),
      sub: "Da completare",
      icon: CheckCircle, iconBg: "bg-red-50 dark:bg-red-900/20", iconColor: "text-[var(--crm-danger)]",
      change: "-2", positive: true,
    },
    {
      title: "Contatti totali", value: String(kpis.contactsCount),
      sub: "Nel CRM",
      icon: Users, iconBg: "bg-sky-50 dark:bg-sky-900/20", iconColor: "text-sky-600",
      change: "+4", positive: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
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
          {/* Period filter */}
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

          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1.5" /> Esporta CSV
          </Button>
        </div>
      </div>

      {/* AI Insights */}
      <AIInsightsStrip />

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {kpiCards.map((k) => (
          <div key={k.title} className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-4">
            <div className="flex items-start justify-between mb-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${k.iconBg}`}>
                <k.icon className={`h-4 w-4 ${k.iconColor}`} />
              </div>
              <div className={`flex items-center gap-0.5 text-xs font-medium ${k.positive ? "text-[var(--crm-success)]" : "text-[var(--crm-danger)]"}`}>
                {k.positive
                  ? <ArrowUpRight className="h-3 w-3" />
                  : <ArrowDownRight className="h-3 w-3" />}
                {k.change}
              </div>
            </div>
            <p className="text-xl font-bold">{k.value}</p>
            <p className="text-xs text-[var(--crm-neutral-500)] mt-0.5">{k.title}</p>
            <p className="text-xs text-[var(--crm-neutral-400)] mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Forecast banner */}
      <div className="rounded-xl border border-[var(--crm-primary)]/20 bg-[var(--crm-primary)]/5 p-4 flex items-center gap-6 flex-wrap">
        <div>
          <p className="text-xs text-[var(--crm-neutral-500)] font-medium uppercase tracking-wide">Pipeline totale</p>
          <p className="text-2xl font-bold text-[var(--crm-primary)]">{formatEur(forecast.pipeline)}</p>
        </div>
        <div className="h-8 w-px bg-[var(--crm-primary)]/20" />
        <div>
          <p className="text-xs text-[var(--crm-neutral-500)] font-medium uppercase tracking-wide">Forecast ponderato</p>
          <p className="text-2xl font-bold">{formatEur(forecast.forecast)}</p>
        </div>
        <p className="text-xs text-[var(--crm-neutral-500)] ml-auto">
          Calcolato pesando il valore di ogni affare per la probabilità dello stage
        </p>
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Pipeline per stage (affari aperti)">
          <FunnelChart data={funnel} />
        </ChartCard>

        <ChartCard title="Revenue ultimi 6 mesi">
          <TrendChart data={trend} showValue />
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Affari vinti vs persi (6 mesi)">
          <TrendChart data={trend} showValue={false} />
        </ChartCard>

        <ChartCard title="Attività per tipo">
          <ActivitiesByTypeChart data={byType} />
        </ChartCard>
      </div>

      {/* Top performers */}
      <ChartCard title="Top performer">
        <TopPerformersTable data={performers} />
      </ChartCard>
    </div>
  );
}
