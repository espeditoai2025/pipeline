"use client";

import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Building2, Users, Briefcase, Megaphone, TrendingUp, Mail, Euro, Workflow } from "lucide-react";
import type { AdminOverview, AdminPlanStats } from "@/server/actions/admin";

const PLAN_BADGE: Record<string, string> = {
  FREE: "bg-slate-700 text-slate-300",
  STARTER: "bg-slate-700 text-slate-300",
  ESSENTIAL: "bg-blue-900/50 text-blue-300",
  ADVANCED: "bg-blue-900/50 text-blue-300",
  PROFESSIONAL: "bg-emerald-900/50 text-emerald-300",
  PRO: "bg-emerald-900/50 text-emerald-300",
  ENTERPRISE: "bg-amber-900/50 text-amber-300",
};

const PLAN_LABEL: Record<string, string> = {
  FREE: "Starter", STARTER: "Starter",
  ESSENTIAL: "Pro", ADVANCED: "Pro", PROFESSIONAL: "Pro", PRO: "Pro",
  ENTERPRISE: "Enterprise",
};

const PLAN_COLORS: Record<string, string> = {
  STARTER: "#64748b", FREE: "#64748b",
  PRO: "#10b981", PROFESSIONAL: "#10b981", ADVANCED: "#10b981", ESSENTIAL: "#10b981",
  ENTERPRISE: "#f59e0b",
};

function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="rounded-xl bg-slate-900 border border-white/10 p-5">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg mb-3 ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-bold text-white">{typeof value === "number" ? value.toLocaleString("it-IT") : value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

export function AdminDashboard({ data, planStats }: { data: AdminOverview; planStats: AdminPlanStats | null }) {
  const pieData = planStats?.distribution.map((d) => ({
    name: PLAN_LABEL[d.plan] ?? d.plan,
    value: d.count,
    color: PLAN_COLORS[d.plan] ?? "#64748b",
    mrr: d.mrr,
  })) ?? [];

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white">Panoramica piattaforma</h1>
        <p className="text-sm text-slate-400 mt-0.5">Dati in tempo reale da tutte le organizzazioni</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-4">
        <KpiCard label="Organizzazioni" value={data.totalOrgs} icon={Building2} color="bg-violet-900/50 text-violet-300" />
        <KpiCard label="Utenti totali" value={data.totalUsers} icon={Users} color="bg-blue-900/50 text-blue-300" />
        <KpiCard label="Affari totali" value={data.totalDeals} icon={Briefcase} color="bg-emerald-900/50 text-emerald-300" />
        <KpiCard label="Campagne inviate" value={data.totalCampaignsSent} icon={Megaphone} color="bg-rose-900/50 text-rose-300" />
        <KpiCard label="Nuove org. (30gg)" value={data.newOrgsLast30} icon={TrendingUp} color="bg-amber-900/50 text-amber-300" />
        <KpiCard label="SMTP configurati" value={data.orgsWithSmtp} icon={Mail} color="bg-sky-900/50 text-sky-300" />
        <KpiCard
          label="MRR stimato"
          value={`€${(planStats?.totalMrr ?? 0).toLocaleString("it-IT")}`}
          sub="Pro + Enterprise"
          icon={Euro}
          color="bg-emerald-900/50 text-emerald-300"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Signups chart */}
        <div className="lg:col-span-2 rounded-xl bg-slate-900 border border-white/10 p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Nuove iscrizioni — ultimi 30 giorni</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.signupsByDay} barSize={8}>
              <XAxis
                dataKey="date"
                tickFormatter={(d) => new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" })}
                tick={{ fill: "#64748b", fontSize: 10 }}
                tickLine={false} axisLine={false} interval={6}
              />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} width={20} />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#f1f5f9", fontSize: 12 }}
                labelFormatter={(d) => new Date(d as string).toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "short" })}
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
            <Link href="/admin/organizations" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Vedi tutte →</Link>
          </div>
          <div className="space-y-3">
            {data.recentOrgs.map((o) => (
              <Link key={o.id} href={`/admin/organizations/${o.id}`} className="flex items-center gap-3 group">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  {o.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate group-hover:text-white transition-colors">{o.name}</p>
                  <p className="text-xs text-slate-500 truncate">{o.ownerEmail ?? o.slug}</p>
                </div>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${PLAN_BADGE[o.plan] ?? "bg-slate-700 text-slate-300"}`}>
                  {PLAN_LABEL[o.plan] ?? o.plan}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Plan distribution + MRR */}
      {planStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl bg-slate-900 border border-white/10 p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Distribuzione piani</h2>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v, name) => [v, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2.5">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-xs text-slate-300 flex-1">{d.name}</span>
                    <span className="text-xs font-semibold text-white">{d.value}</span>
                    <span className="text-xs text-slate-500 w-10 text-right">
                      {planStats.totalOrgs > 0 ? `${Math.round((d.value / planStats.totalOrgs) * 100)}%` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-900 border border-white/10 p-5">
            <h2 className="text-sm font-semibold text-white mb-4">MRR stimato per piano</h2>
            <div className="space-y-3">
              {planStats.distribution.filter((d) => d.mrr > 0).map((d) => (
                <div key={d.plan}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">{PLAN_LABEL[d.plan] ?? d.plan}</span>
                    <span className="font-semibold text-white">€{d.mrr.toLocaleString("it-IT")}/mese</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-700">
                    <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: planStats.totalMrr > 0 ? `${(d.mrr / planStats.totalMrr) * 100}%` : "0%" }} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{d.count} org × €{d.count > 0 ? d.mrr / d.count : 0}/mese</p>
                </div>
              ))}
              {planStats.totalMrr === 0 && (
                <p className="text-xs text-slate-500 text-center py-4">Nessuna organizzazione a pagamento</p>
              )}
              <div className="border-t border-white/10 pt-3 flex justify-between">
                <span className="text-sm font-semibold text-slate-300">Totale MRR</span>
                <span className="text-sm font-bold text-emerald-400">€{planStats.totalMrr.toLocaleString("it-IT")}/mese</span>
              </div>
              <p className="text-xs text-slate-600">ARR stimato: €{(planStats.totalMrr * 12).toLocaleString("it-IT")}/anno</p>
            </div>
          </div>
        </div>
      )}

      {/* Top orgs */}
      <div className="rounded-xl bg-slate-900 border border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Top 5 organizzazioni per affari</h2>
          <Link href="/admin/organizations" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Vedi tutte →</Link>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              {["Organizzazione", "Piano", "Affari", "Contatti", "Utenti"].map((h, i) => (
                <th key={h} className={`py-3 px-5 text-xs font-medium text-slate-400 ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.topOrgs.map((o, i) => (
              <tr key={o.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-5 py-3">
                  <Link href={`/admin/organizations/${o.id}`} className="flex items-center gap-2.5 group">
                    <span className="text-xs text-slate-500 w-4">{i + 1}</span>
                    <span className="text-xs font-medium text-slate-200 group-hover:text-white transition-colors">{o.name}</span>
                  </Link>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PLAN_BADGE[o.plan] ?? "bg-slate-700 text-slate-300"}`}>
                    {PLAN_LABEL[o.plan] ?? o.plan}
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

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: "/admin/users", label: "Gestisci utenti", icon: Users, color: "text-blue-400" },
          { href: "/admin/campaigns", label: "Campagne email", icon: Megaphone, color: "text-rose-400" },
          { href: "/admin/workflow-logs", label: "Log automazioni", icon: Workflow, color: "text-fuchsia-400" },
          { href: "/admin/organizations", label: "Organizzazioni", icon: Building2, color: "text-violet-400" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-xl bg-slate-900 border border-white/10 px-4 py-3 hover:bg-white/5 transition-colors group"
          >
            <item.icon className={`h-4 w-4 shrink-0 ${item.color}`} />
            <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
