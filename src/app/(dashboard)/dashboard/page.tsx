import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, Briefcase, CheckCircle, Euro, TrendingUp, Target } from "lucide-react";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
const PipelineOverviewChart = dynamic(
  () => import("@/components/charts/PipelineOverviewChart").then(m => m.PipelineOverviewChart),
  { ssr: false, loading: () => <div className="h-48 animate-pulse rounded-xl bg-[var(--crm-neutral-100)]" /> }
);
import { redirect } from "next/navigation";
import { getDashboardData, getOnboardingStatus } from "@/server/actions/dashboard";
import { getCrmMode, isCrmModeSet } from "@/server/actions/crm-mode";
import { AIInsightsStrip } from "@/components/ai/AIInsightsStrip";
import { OnboardingWizard } from "@/components/dashboard/OnboardingWizard";
import { CrmModeBadge } from "@/components/dashboard/CrmModeBadge";
import { auth } from "@/lib/auth";
import { UpgradeBanner } from "@/components/billing/UpgradeBanner";
import { getOrgPlan } from "@/lib/plan";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("title") };
}

function formatEur(v: number) {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}k`;
  return `€${Math.round(v)}`;
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
  const Arrow = positive ? ArrowUpRight : ArrowDownRight;
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
        <Arrow className={`h-3.5 w-3.5 ${positive ? "text-[var(--crm-success)]" : "text-[var(--crm-danger)]"}`} />
        <span className={`text-xs font-medium ${positive ? "text-[var(--crm-success)]" : "text-[var(--crm-danger)]"}`}>{change}</span>
        <span className="text-xs text-[var(--crm-neutral-500)]">vs periodo precedente</span>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const modeSet = await isCrmModeSet();
  if (!modeSet) redirect("/setup");

  const [data, onboarding, crmMode, session] = await Promise.all([
    getDashboardData(), getOnboardingStatus(), getCrmMode(), auth(),
  ]);

  const orgId = (session?.user as { organizationId?: string } | undefined)?.organizationId;
  const orgPlan = orgId ? await getOrgPlan(orgId) : "STARTER";
  const isStarter = orgPlan === "STARTER" || orgPlan === "FREE";

  const kpis = data?.kpis ?? {
    openDeals: 0, totalValue: 0, wonDeals: 0, wonValue: 0,
    winRate: 0, avgDeal: 0, overdueActivities: 0, revenueChange: 0,
  };
  const forecast = data?.forecast ?? 0;
  const pipelineChartData = data?.pipelineChartData ?? [];

  const kpiCards: KpiCardProps[] = [
    {
      title: t("kpi.openDeals"),
      value: String(kpis.openDeals),
      sub: `Pipeline: ${formatEur(kpis.totalValue)}`,
      change: kpis.openDeals > 0 ? `${kpis.openDeals} attivi` : "Nessun affare",
      positive: kpis.openDeals > 0,
      icon: Briefcase, iconColor: "text-[var(--crm-primary)]", iconBg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      title: "Revenue (30gg)",
      value: formatEur(kpis.wonValue),
      sub: `${kpis.wonDeals} affare${kpis.wonDeals === 1 ? "" : "i"} vint${kpis.wonDeals === 1 ? "o" : "i"}`,
      change: kpis.revenueChange >= 0 ? `+${kpis.revenueChange}%` : `${kpis.revenueChange}%`,
      positive: kpis.revenueChange >= 0,
      icon: Euro, iconColor: "text-[var(--crm-success)]", iconBg: "bg-green-50 dark:bg-green-900/20",
    },
    {
      title: "Win rate (30gg)",
      value: `${kpis.winRate}%`,
      sub: `${kpis.wonDeals} vinti · Avg ${formatEur(kpis.avgDeal)}`,
      change: kpis.winRate >= 30 ? "Buon ritmo" : kpis.winRate > 0 ? "In miglioramento" : "Nessuna chiusura",
      positive: kpis.winRate >= 30,
      icon: Target, iconColor: "text-purple-600", iconBg: "bg-purple-50 dark:bg-purple-900/20",
    },
    {
      title: t("kpi.activitiesOverdue"),
      value: String(kpis.overdueActivities),
      sub: kpis.overdueActivities > 0 ? "Da completare subito" : "Tutto in ordine",
      change: kpis.overdueActivities > 0 ? `+${kpis.overdueActivities} scadut${kpis.overdueActivities === 1 ? "a" : "e"}` : "0 scadute",
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

      {isStarter && <UpgradeBanner />}

      <CrmModeBadge currentMode={crmMode} />

      {onboarding && <OnboardingWizard status={onboarding} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((kpi) => <KpiCard key={kpi.title} {...kpi} />)}
      </div>

      <AIInsightsStrip compact />

      <div className="rounded-xl border border-[var(--crm-primary)]/20 bg-[var(--crm-primary)]/5 px-5 py-3 flex items-center gap-6 flex-wrap">
        <TrendingUp className="h-5 w-5 text-[var(--crm-primary)] flex-shrink-0" />
        <div>
          <p className="text-xs text-[var(--crm-neutral-500)]">Forecast ponderato pipeline</p>
          <p className="text-lg font-bold text-[var(--crm-primary)]">{formatEur(forecast)}</p>
        </div>
        <div className="h-6 w-px bg-[var(--crm-primary)]/20" />
        <div>
          <p className="text-xs text-[var(--crm-neutral-500)]">Avg deal vinti</p>
          <p className="text-lg font-bold">{formatEur(kpis.avgDeal)}</p>
        </div>
        <div className="h-6 w-px bg-[var(--crm-primary)]/20" />
        <div>
          <p className="text-xs text-[var(--crm-neutral-500)]">Affari in pipeline</p>
          <p className="text-lg font-bold">{kpis.openDeals}</p>
        </div>
        <p className="text-xs text-[var(--crm-neutral-400)] ml-auto hidden sm:block">
          Vai a <Link href="/reports" className="text-[var(--crm-primary)] hover:underline">Report</Link> per l&apos;analisi completa
        </p>
      </div>

      <div className="rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[var(--crm-neutral-900)] dark:text-white mb-4">{t("pipelineOverview")}</h2>
        <PipelineOverviewChart data={pipelineChartData} />
      </div>
    </div>
  );
}
