"use client";

import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";

type StageData = { name: string; affari: number; valore: number };

type Props = { data: StageData[] };

function formatEur(value: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

export function PipelineOverviewChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-60 items-center justify-center text-sm text-[var(--crm-neutral-400)]">
        Nessun dato pipeline disponibile
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--crm-neutral-100)" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--crm-neutral-500)" }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 11, fill: "var(--crm-neutral-500)" }} axisLine={false} tickLine={false} width={32} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "var(--crm-neutral-500)" }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} width={40} />
        <Tooltip
          formatter={(value, name) => {
            const v = Number(value);
            return name === "valore" ? [formatEur(v), "Valore"] : [v, "Affari"];
          }}
          contentStyle={{ borderRadius: "8px", border: "1px solid var(--crm-neutral-100)", fontSize: 12 }}
        />
        <Bar yAxisId="left" dataKey="affari" fill="var(--crm-primary)" radius={[4, 4, 0, 0]} />
        <Bar yAxisId="right" dataKey="valore" fill="#e0efff" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
