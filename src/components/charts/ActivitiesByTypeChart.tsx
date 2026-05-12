"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

type Props = {
  data: { name: string; completate: number; pendenti: number; totale: number }[];
};

export function ActivitiesByTypeChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--crm-neutral-100)" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--crm-neutral-500)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "var(--crm-neutral-500)" }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
        <Tooltip
          formatter={(value, name) => [Number(value), name === "completate" ? "Completate" : "In sospeso"]}
          contentStyle={{ borderRadius: "8px", border: "1px solid var(--crm-neutral-100)", fontSize: 12 }}
        />
        <Legend formatter={(v) => v === "completate" ? "Completate" : "In sospeso"} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="completate" stackId="a" fill="var(--crm-success)" radius={[0, 0, 0, 0]} />
        <Bar dataKey="pendenti" stackId="a" fill="var(--crm-neutral-200)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
