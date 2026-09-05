import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, Briefcase, CheckCircle, Euro, TrendingUp, Target } from "lucide-react";
import type { Metadata } from "next";
import { PipelineOverviewChartLazy } from "@/components/charts/PipelineOverviewChartLazy";
import { ForecastChartLazy } from "@/components/charts/ForecastChartLazy";
import { redirect } from "next/navigation";
import { getDashboardData, getOnboardingStatus, getForecastData } from "@/server/actions/dashboard";
import { getCrmMode, isCrmModeSet } from "@/server/actions/crm-mode";
import { AIInsightsStrip } from "@/components/ai/AIInsightsStrip";
import { TeamLeaderboard } from "@/components/dashboard/TeamLeaderboard";
import { OnboardingWizard } from "@/components/dashboard/OnboardingWizard";
import { CrmModeBadge } from "@/components/dashboard/CrmModeBadge";
import { auth } from "@/lib/auth";
import { UpgradeBanner } from "@/components/billing/UpgradeBanner";
import { getOrgPlan } from "@/lib/plan";
import { getDailyFocus } from "@/server/actions/daily-focus";
import { DailyFocus } from "@/components/dashboard/DailyFocus";

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
  comparison?: boolean;
};

function KpiCard({ title, value, sub, change, positive, icon: Icon, iconColor, iconBg, comparison }: KpiCardProps) {
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
        {comparison && <span className="text-xs text-[var(--crm-neutral-500)]">vs 30 giorni precedenti</span>}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const modeSet = await isCrmModeSet();
  if (!modeSet) redirect("/setup");

  const [data, onboarding, crmMode, session, forecastData, dailyFocus] = await Promise.all([
    getDashboardData(), getOnboardingStatus(), getCrmMode(), auth(), getForecastData(), getDailyFocus(),
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
      title: "Vendite vinte (30 giorni)",
      value: formatEur(kpis.wonValue),
      sub: `${kpis.wonDeals} ${kpis.wonDeals === 1 ? "affare vinto" : "affari vinti"}`,
      change: kpis.revenueChange === null ? "Nessuna base di confronto" : kpis.revenueChange >= 0 ? `+${kpis.revenueChange}%` : `${kpis.revenueChange}%`,
      positive: (kpis.revenueChange ?? 0) >= 0,
      comparison: kpis.revenueChange !== null,
      icon: Euro, iconColor: "text-[var(--crm-success)]", iconBg: "bg-green-50 dark:bg-green-900/20",
    },
    {
      title: "Tasso di successo (30 giorni)",
      value: `${kpis.winRate}%`,
      sub: `${kpis.wonDeals} vinti · Media ${formatEur(kpis.avgDeal)}`,
      change: kpis.winRate >= 30 ? "Buon ritmo" : kpis.winRate > 0 ? "Da monitorare" : "Nessun affare vinto",
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

      {dailyFocus && <DailyFocus data={dailyFocus} />}

      {onboarding && <OnboardingWizard status={onboarding} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((kpi) => <KpiCard key={kpi.title} {...kpi} />)}
      </div>

      <AIInsightsStrip compact />

      <div className="rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-[var(--crm-primary)]" />
            <h2 className="text-sm font-semibold text-[var(--crm-neutral-900)] dark:text-white">Previsione vendite</h2>
          </div>
          <div className="flex items-center gap-4 text-right">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[var(--crm-neutral-400)]">Valore ponderato</p>
              <p className="text-sm sm:text-base font-bold text-[var(--crm-primary)]">{formatEur(forecast)}</p>
            </div>
            <div className="h-6 w-px bg-[var(--crm-neutral-100)]" />
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[var(--crm-neutral-400)]">Valore medio vinto</p>
              <p className="text-sm sm:text-base font-bold">{formatEur(kpis.avgDeal)}</p>
            </div>
            <div className="h-6 w-px bg-[var(--crm-neutral-100)]" />
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[var(--crm-neutral-400)]">Pipeline</p>
              <p className="text-sm sm:text-base font-bold">{kpis.openDeals}</p>
            </div>
          </div>
        </div>
        {forecastData && forecastData.length > 0 ? (
          <ForecastChartLazy data={forecastData} />
        ) : (
          <div className="h-[280px] flex items-center justify-center text-sm text-[var(--crm-neutral-400)]">
            Crea affari con date di chiusura previste per vedere il forecast
          </div>
        )}
        <p className="text-xs text-[var(--crm-neutral-400)] mt-3 text-right">
          <Link href="/reports" className="text-[var(--crm-primary)] hover:underline">Report completi →</Link>
        </p>
      </div>

      <div className="rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[var(--crm-neutral-900)] dark:text-white mb-4">{t("pipelineOverview")}</h2>
        <PipelineOverviewChartLazy data={pipelineChartData} />
      </div>

      <TeamLeaderboard />
    </div>
  );
}
