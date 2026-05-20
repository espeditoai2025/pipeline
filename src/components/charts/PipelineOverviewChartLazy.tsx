"use client";

import dynamic from "next/dynamic";

const PipelineOverviewChart = dynamic(
  () => import("@/components/charts/PipelineOverviewChart").then((m) => m.PipelineOverviewChart),
  { ssr: false, loading: () => <div className="h-48 animate-pulse rounded-xl bg-[var(--crm-neutral-100)]" /> },
);

export function PipelineOverviewChartLazy({ data }: { data: { name: string; affari: number; valore: number }[] }) {
  return <PipelineOverviewChart data={data} />;
}
