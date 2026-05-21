"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import type { ForecastMonth } from "@/server/actions/dashboard";

function formatEur(v: number) {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}k`;
  return `€${v}`;
}

type Props = { data: ForecastMonth[] };

export function ForecastChart({ data }: Props) {
  if (!data.length) return null;

  // Find index where forecast starts (first month with forecast > 0)
  const todayIdx = data.findIndex((d) => d.forecast > 0);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--crm-neutral-100)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "var(--crm-neutral-500)" }}
          axisLine={{ stroke: "var(--crm-neutral-100)" }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatEur}
          tick={{ fontSize: 11, fill: "var(--crm-neutral-500)" }}
          axisLine={false}
          tickLine={false}
          width={60}
        />
        <Tooltip
          formatter={(value, name) => [
            formatEur(Number(value)),
            name === "actual" ? "Realizzato" : "Forecast",
          ]}
          labelStyle={{ fontWeight: 600, fontSize: 12 }}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid var(--crm-neutral-100)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            fontSize: 12,
          }}
        />
        <Legend
          formatter={(value: string) => (value === "actual" ? "Realizzato" : "Forecast")}
          wrapperStyle={{ fontSize: 12 }}
        />
        {todayIdx > 0 && (
          <ReferenceLine
            x={data[todayIdx - 1]?.label}
            stroke="var(--crm-neutral-300)"
            strokeDasharray="4 4"
            label={{ value: "Oggi", position: "top", fontSize: 10, fill: "var(--crm-neutral-400)" }}
          />
        )}
        <Bar
          dataKey="actual"
          fill="var(--crm-primary)"
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />
        <Line
          dataKey="forecast"
          stroke="var(--crm-warning)"
          strokeWidth={2}
          strokeDasharray="6 3"
          dot={{ r: 4, fill: "var(--crm-warning)", strokeWidth: 0 }}
          activeDot={{ r: 6 }}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
