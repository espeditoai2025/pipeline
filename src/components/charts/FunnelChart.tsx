"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

type Props = {
  data: { name: string; affari: number; valore: number; probability: number }[];
};

function formatEur(v: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

const COLORS = ["#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe", "#e0e7ff"];

export function FunnelChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 60, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--crm-neutral-100)" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: "var(--crm-neutral-500)" }} axisLine={false} tickLine={false} />
        <YAxis
          type="category" dataKey="name" width={100}
          tick={{ fontSize: 11, fill: "var(--crm-neutral-600)" }} axisLine={false} tickLine={false}
        />
        <Tooltip
          formatter={(value, name) => {
            const v = Number(value);
            return name === "valore" ? [formatEur(v), "Valore"] : [v, "Affari aperti"];
          }}
          contentStyle={{ borderRadius: "8px", border: "1px solid var(--crm-neutral-100)", fontSize: 12 }}
        />
        <Bar dataKey="affari" radius={[0, 4, 4, 0]} label={{ position: "right", fontSize: 11, fill: "var(--crm-neutral-500)" }}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
