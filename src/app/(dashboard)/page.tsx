import { getTranslations } from "next-intl/server";
import { ArrowUpRight, Briefcase, CheckCircle, Euro, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import { PipelineOverviewChart } from "@/components/charts/PipelineOverviewChart";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("title") };
}

type KpiCardProps = {
  title: string;
  value: string;
  change: string;
  positive: boolean;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
};

function KpiCard({ title, value, change, positive, icon: Icon, iconColor, iconBg }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[var(--crm-neutral-500)]">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--crm-neutral-900)] dark:text-white">
            {value}
          </p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1">
        <ArrowUpRight
          className={`h-3.5 w-3.5 ${positive ? "text-[var(--crm-success)]" : "rotate-90 text-[var(--crm-danger)]"}`}
        />
        <span
          className={`text-xs font-medium ${positive ? "text-[var(--crm-success)]" : "text-[var(--crm-danger)]"}`}
        >
          {change}
        </span>
        <span className="text-xs text-[var(--crm-neutral-500)]">vs mese scorso</span>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");

  const kpis: KpiCardProps[] = [
    {
      title: t("kpi.openDeals"),
      value: "30",
      change: "+12%",
      positive: true,
      icon: Briefcase,
      iconColor: "text-[var(--crm-primary)]",
      iconBg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      title: t("kpi.totalValue"),
      value: "€927.000",
      change: "+8.3%",
      positive: true,
      icon: Euro,
      iconColor: "text-[var(--crm-success)]",
      iconBg: "bg-green-50 dark:bg-green-900/20",
    },
    {
      title: t("kpi.wonThisMonth"),
      value: "7",
      change: "+3",
      positive: true,
      icon: TrendingUp,
      iconColor: "text-[var(--crm-warning)]",
      iconBg: "bg-yellow-50 dark:bg-yellow-900/20",
    },
    {
      title: t("kpi.activitiesOverdue"),
      value: "5",
      change: "-2",
      positive: false,
      icon: CheckCircle,
      iconColor: "text-[var(--crm-danger)]",
      iconBg: "bg-red-50 dark:bg-red-900/20",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--crm-neutral-900)] dark:text-white">
          {t("title")}
        </h1>
        <p className="text-sm text-[var(--crm-neutral-500)] mt-0.5">{t("welcome")}</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.title} {...kpi} />
        ))}
      </div>

      {/* Pipeline chart */}
      <div className="rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[var(--crm-neutral-900)] dark:text-white mb-4">
          {t("pipelineOverview")}
        </h2>
        <PipelineOverviewChart />
        <div className="mt-3 flex items-center gap-4 text-xs text-[var(--crm-neutral-500)]">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[var(--crm-primary)]" />
            Numero affari
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#e0efff]" />
            Valore (€)
          </span>
        </div>
      </div>
    </div>
  );
}
