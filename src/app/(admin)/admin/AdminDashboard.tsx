"use client";

import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Building2, Users, Briefcase, Megaphone, TrendingUp, Mail } from "lucide-react";
import type { AdminOverview } from "@/server/actions/admin";

const PLAN_BADGE: Record<string, string> = {
  FREE: "bg-slate-700 text-slate-300",
  ESSENTIAL: "bg-blue-900/50 text-blue-300",
  ADVANCED: "bg-violet-900/50 text-violet-300",
  PROFESSIONAL: "bg-emerald-900/50 text-emerald-300",
  ENTERPRISE: "bg-amber-900/50 text-amber-300",
};

function KpiCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string; value: number; sub?: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="rounded-xl bg-slate-900 border border-white/10 p-5">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg mb-3 ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-bold text-white">{value.toLocaleString("it-IT")}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

export function AdminDashboard({ data }: { data: AdminOverview }) {
  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white">Panoramica piattaforma</h1>
        <p className="text-sm text-slate-400 mt-0.5">Dati in tempo reale da tutte le organizzazioni</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="Organizzazioni" value={data.totalOrgs} icon={Building2} color="bg-violet-900/50 text-violet-300" />
        <KpiCard label="Utenti totali" value={data.totalUsers} icon={Users} color="bg-blue-900/50 text-blue-300" />
        <KpiCard label="Affari totali" value={data.totalDeals} icon={Briefcase} color="bg-emerald-900/50 text-emerald-300" />
        <KpiCard label="Campagne inviate" value={data.totalCampaignsSent} icon={Megaphone} color="bg-rose-900/50 text-rose-300" />
        <KpiCard label="Nuove org. (30gg)" value={data.newOrgsLast30} icon={TrendingUp} color="bg-amber-900/50 text-amber-300" />
        <KpiCard label="SMTP configurati" value={data.orgsWithSmtp} icon={Mail} color="bg-sky-900/50 text-sky-300" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Signups chart */}
        <div className="lg:col-span-2 rounded-xl bg-slate-900 border border-white/10 p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Nuove iscrizioni — ultimi 30 giorni</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.signupsByDay} barSize={8}>
              <XAxis
                dataKey="date"
                tickFormatter={(d) =>
                  new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" })
                }
                tick={{ fill: "#64748b", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={6}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={20}
              />
              <Tooltip
                contentStyle={{
                  background: "#1e293b",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  color: "#f1f5f9",
                  fontSize: 12,
                }}
                labelFormatter={(d) =>
                  new Date(d as string).toLocaleDateString("it-IT", {
                    weekday: "short", day: "2-digit", month: "short",
                  })
                }
                formatter={(v) => [v, "Iscrizioni"]}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent signups */}
        <div className="rounded-xl bg-slate-900 border border-white/10 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Ultime iscrizioni</h2>
            <Link href="/admin/organizations" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              Vedi tutte →
            </Link>
          </div>
          <div className="space-y-3">
            {data.recentOrgs.map((o) => (
              <Link key={o.id} href={`/admin/organizations/${o.id}`} className="flex items-center gap-3 group">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  {o.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate group-hover:text-white transition-colors">
                    {o.name}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{o.ownerEmail ?? o.slug}</p>
                </div>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${PLAN_BADGE[o.plan] ?? "bg-slate-700 text-slate-300"}`}>
                  {o.plan}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Top orgs */}
      <div className="rounded-xl bg-slate-900 border border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Top 5 organizzazioni per affari</h2>
          <Link href="/admin/organizations" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
            Vedi tutte →
          </Link>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              {["Organizzazione", "Piano", "Affari", "Contatti", "Utenti"].map((h, i) => (
                <th key={h} className={`py-3 px-5 text-xs font-medium text-slate-400 ${i === 0 ? "text-left" : "text-right"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.topOrgs.map((o, i) => (
              <tr key={o.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-5 py-3">
                  <Link href={`/admin/organizations/${o.id}`} className="flex items-center gap-2.5 group">
                    <span className="text-xs text-slate-500 w-4">{i + 1}</span>
                    <span className="text-xs font-medium text-slate-200 group-hover:text-white transition-colors">
                      {o.name}
                    </span>
                  </Link>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PLAN_BADGE[o.plan] ?? "bg-slate-700 text-slate-300"}`}>
                    {o.plan}
                  </span>
                </td>
                <td className="px-5 py-3 text-right text-xs text-slate-300">{o.dealCount}</td>
                <td className="px-5 py-3 text-right text-xs text-slate-300">{o.contactCount}</td>
                <td className="px-5 py-3 text-right text-xs text-slate-300">{o.userCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
