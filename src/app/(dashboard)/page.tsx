import { getTranslations } from "next-intl/server";
import { ArrowUpRight, Briefcase, CheckCircle, Euro, TrendingUp, Target } from "lucide-react";
import type { Metadata } from "next";
import { PipelineOverviewChart } from "@/components/charts/PipelineOverviewChart";
import { getKpis, getForecast } from "@/lib/reporting";
import { AIInsightsStrip } from "@/components/ai/AIInsightsStrip";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("title") };
}

type KpiCardProps = {
  title: string;
  value: string;
  sub?: string;
  change: string;
  positive: boolean;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
};

function KpiCard({ title, value, sub, change, positive, icon: Icon, iconColor, iconBg }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[var(--crm-neutral-500)]">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--crm-neutral-900)] dark:text-white">{value}</p>
          {sub && <p className="text-xs text-[var(--crm-neutral-400)] mt-0.5">{sub}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1">
        <ArrowUpRight className={`h-3.5 w-3.5 ${positive ? "text-[var(--crm-success)]" : "rotate-90 text-[var(--crm-danger)]"}`} />
        <span className={`text-xs font-medium ${positive ? "text-[var(--crm-success)]" : "text-[var(--crm-danger)]"}`}>{change}</span>
        <span className="text-xs text-[var(--crm-neutral-500)]">vs periodo precedente</span>
      </div>
    </div>
  );
}

function formatEur(v: number) {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}k`;
  return `€${v}`;
}

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const kpis = getKpis("30d");
  const forecast = getForecast();

  const kpiCards: KpiCardProps[] = [
    {
      title: t("kpi.openDeals"),
      value: String(kpis.openDeals),
      sub: `Pipeline: ${formatEur(kpis.totalPipelineValue)}`,
      change: "+12%", positive: true,
      icon: Briefcase, iconColor: "text-[var(--crm-primary)]", iconBg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      title: t("kpi.totalValue"),
      value: formatEur(kpis.totalPipelineValue),
      sub: `Forecast: ${formatEur(forecast.forecast)}`,
      change: "+8.3%", positive: true,
      icon: Euro, iconColor: "text-[var(--crm-success)]", iconBg: "bg-green-50 dark:bg-green-900/20",
    },
    {
      title: "Win rate",
      value: `${kpis.winRate}%`,
      sub: `${kpis.wonDeals} vinti questo mese`,
      change: "+3%", positive: true,
      icon: Target, iconColor: "text-purple-600", iconBg: "bg-purple-50 dark:bg-purple-900/20",
    },
    {
      title: t("kpi.activitiesOverdue"),
      value: String(kpis.overdueActivities),
      sub: "Da completare",
      change: kpis.overdueActivities > 0 ? `+${kpis.overdueActivities}` : "0",
      positive: kpis.overdueActivities === 0,
      icon: CheckCircle, iconColor: "text-[var(--crm-danger)]", iconBg: "bg-red-50 dark:bg-red-900/20",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--crm-neutral-900)] dark:text-white">{t("title")}</h1>
        <p className="text-sm text-[var(--crm-neutral-500)] mt-0.5">{t("welcome")}</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((kpi) => <KpiCard key={kpi.title} {...kpi} />)}
      </div>

      {/* AI Insight (compact) */}
      <AIInsightsStrip compact />

      {/* Forecast strip */}
      <div className="rounded-xl border border-[var(--crm-primary)]/20 bg-[var(--crm-primary)]/5 px-5 py-3 flex items-center gap-6 flex-wrap">
        <TrendingUp className="h-5 w-5 text-[var(--crm-primary)] flex-shrink-0" />
        <div>
          <p className="text-xs text-[var(--crm-neutral-500)]">Forecast ponderato (30 giorni)</p>
          <p className="text-lg font-bold text-[var(--crm-primary)]">{formatEur(forecast.forecast)}</p>
        </div>
        <div className="h-6 w-px bg-[var(--crm-primary)]/20" />
        <div>
          <p className="text-xs text-[var(--crm-neutral-500)]">Avg deal size</p>
          <p className="text-lg font-bold">{formatEur(kpis.avgDealSize)}</p>
        </div>
        <p className="text-xs text-[var(--crm-neutral-400)] ml-auto hidden sm:block">
          Vai a <a href="/reports" className="text-[var(--crm-primary)] hover:underline">Report</a> per l&apos;analisi completa
        </p>
      </div>

      {/* Pipeline chart */}
      <div className="rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[var(--crm-neutral-900)] dark:text-white mb-4">{t("pipelineOverview")}</h2>
        <PipelineOverviewChart />
        <div className="mt-3 flex items-center gap-4 text-xs text-[var(--crm-neutral-500)]">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[var(--crm-primary)]" /> Numero affari
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#e0efff]" /> Valore (€)
          </span>
        </div>
      </div>
    </div>
  );
}
