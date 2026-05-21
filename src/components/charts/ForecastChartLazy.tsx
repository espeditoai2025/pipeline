"use client";

import dynamic from "next/dynamic";
import type { ForecastMonth } from "@/server/actions/dashboard";

const ForecastChart = dynamic(
  () => import("@/components/charts/ForecastChart").then((m) => m.ForecastChart),
  { ssr: false, loading: () => <div className="h-[280px] animate-pulse rounded-xl bg-[var(--crm-neutral-100)]" /> },
);

export function ForecastChartLazy({ data }: { data: ForecastMonth[] }) {
  return <ForecastChart data={data} />;
}
