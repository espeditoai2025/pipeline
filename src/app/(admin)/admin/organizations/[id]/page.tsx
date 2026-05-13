import { getAdminOrgDetail } from "@/server/actions/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";

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

const ROLE_BADGE: Record<string, string> = {
  OWNER: "bg-amber-900/50 text-amber-300",
  ADMIN: "bg-violet-900/50 text-violet-300",
  MANAGER: "bg-blue-900/50 text-blue-300",
  SALES: "bg-emerald-900/50 text-emerald-300",
  VIEWER: "bg-slate-700 text-slate-300",
};

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-800 border border-white/5 p-4 text-center">
      <p className="text-2xl font-bold text-white">{value.toLocaleString("it-IT")}</p>
      <p className="text-xs text-slate-400 mt-1">{label}</p>
    </div>
  );
}

export default async function OrgDetailPage(ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const org = await getAdminOrgDetail(id);
  if (!org) redirect("/admin/organizations");

  const { stats } = org;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href="/admin/organizations"
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-white">{org.name}</h1>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PLAN_BADGE[org.plan] ?? "bg-slate-700 text-slate-300"}`}>
              {PLAN_LABEL[org.plan] ?? org.plan}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-0.5">
            Iscritto il{" "}
            {new Date(org.createdAt).toLocaleDateString("it-IT", {
              day: "2-digit", month: "long", year: "numeric",
            })}{" "}
            · slug: <span className="font-mono text-slate-300">{org.slug}</span>
          </p>
        </div>
        <div className={`flex items-center gap-1.5 text-xs ${org.hasSmtp ? "text-emerald-400" : "text-slate-500"}`}>
          {org.hasSmtp
            ? <><CheckCircle2 className="h-4 w-4" /> SMTP configurato</>
            : <><XCircle className="h-4 w-4" /> SMTP non configurato</>
          }
        </div>
      </div>

      {/* Usage stats */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Utilizzo piattaforma</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Affari" value={stats.deals} />
          <StatCard label="Contatti" value={stats.contacts} />
          <StatCard label="Aziende" value={stats.companies} />
          <StatCard label="Attività" value={stats.activities} />
          <StatCard label="Prodotti" value={stats.products} />
          <StatCard label="Workflow" value={stats.workflows} />
          <StatCard label="Liste email" value={stats.emailLists} />
          <StatCard label="Campagne inviate" value={stats.campaignsSent} />
        </div>
      </div>

      {/* Users */}
      <div className="rounded-xl bg-slate-900 border border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10">
          <h2 className="text-sm font-semibold text-white">
            Utenti <span className="text-slate-500 font-normal">({org.users.length})</span>
          </h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Nome</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Email</th>
              <th className="text-center px-5 py-3 text-xs font-medium text-slate-400">Ruolo</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-slate-400">Iscritto il</th>
            </tr>
          </thead>
          <tbody>
            {org.users.map((u) => (
              <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                <td className="px-5 py-3 text-xs text-slate-200">{u.name ?? "—"}</td>
                <td className="px-5 py-3 text-xs text-slate-400">{u.email}</td>
                <td className="px-5 py-3 text-center">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ROLE_BADGE[u.role] ?? "bg-slate-700 text-slate-300"}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-5 py-3 text-right text-xs text-slate-400">
                  {new Date(u.createdAt).toLocaleDateString("it-IT")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
