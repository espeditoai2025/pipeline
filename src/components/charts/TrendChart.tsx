"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Area, AreaChart,
} from "recharts";

type DataPoint = { label: string; vinti: number; persi: number; valore: number };

type Props = {
  data: DataPoint[];
  showValue?: boolean;
};

function formatEur(v: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

function formatYAxis(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return `${Math.round(v)}`;
}

export function TrendChart({ data, showValue = false }: Props) {
  if (showValue) {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="valueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--crm-primary)" stopOpacity={0.15} />
              <stop offset="95%" stopColor="var(--crm-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--crm-neutral-100)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--crm-neutral-500)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "var(--crm-neutral-500)" }} tickFormatter={formatYAxis} axisLine={false} tickLine={false} width={48} />
          <Tooltip
            formatter={(value) => [formatEur(Number(value)), "Valore"]}
            contentStyle={{ borderRadius: "8px", border: "1px solid var(--crm-neutral-100)", fontSize: 12 }}
          />
          <Area type="monotone" dataKey="valore" stroke="var(--crm-primary)" strokeWidth={2} fill="url(#valueGrad)" dot={{ fill: "var(--crm-primary)", r: 3 }} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--crm-neutral-100)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--crm-neutral-500)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "var(--crm-neutral-500)" }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
        <Tooltip
          formatter={(value, name) => [Number(value), name === "vinti" ? "Vinti" : "Persi"]}
          contentStyle={{ borderRadius: "8px", border: "1px solid var(--crm-neutral-100)", fontSize: 12 }}
        />
        <Legend formatter={(v) => v === "vinti" ? "Vinti" : "Persi"} wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="vinti" stroke="var(--crm-success)" strokeWidth={2} dot={{ fill: "var(--crm-success)", r: 3 }} />
        <Line type="monotone" dataKey="persi" stroke="var(--crm-danger)" strokeWidth={2} strokeDasharray="4 4" dot={{ fill: "var(--crm-danger)", r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
