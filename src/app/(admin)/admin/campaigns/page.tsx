import { getAdminCampaigns } from "@/server/actions/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Megaphone, Send, FileText, Clock } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  SENT:      { label: "Inviata",     cls: "bg-emerald-900/50 text-emerald-300", icon: Send },
  DRAFT:     { label: "Bozza",       cls: "bg-slate-700 text-slate-300",        icon: FileText },
  SCHEDULED: { label: "Programmata", cls: "bg-blue-900/50 text-blue-300",       icon: Clock },
  SENDING:   { label: "In invio",    cls: "bg-yellow-900/50 text-yellow-300",   icon: Send },
};

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-700">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
    </div>
  );
}

export default async function AdminCampaignsPage() {
  const campaigns = await getAdminCampaigns();
  if (!campaigns) redirect("/dashboard");

  const sent = campaigns.filter((c) => c.status === "SENT");
  const totalSent = sent.reduce((s, c) => s + c.totalSent, 0);
  const totalOpened = sent.reduce((s, c) => s + c.totalOpened, 0);
  const totalClicked = sent.reduce((s, c) => s + c.totalClicked, 0);
  const avgOpenRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;
  const avgClickRate = totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-rose-400" />
          Campagne Email
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">{campaigns.length} campagne totali su tutta la piattaforma</p>
      </div>

      {/* Aggregate KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Campagne inviate", value: sent.length.toLocaleString("it-IT"), color: "text-emerald-400" },
          { label: "Email consegnate", value: totalSent.toLocaleString("it-IT"), color: "text-blue-400" },
          { label: "Tasso apertura medio", value: `${avgOpenRate}%`, color: "text-violet-400" },
          { label: "Tasso click medio", value: `${avgClickRate}%`, color: "text-amber-400" },
        ].map((k) => (
          <div key={k.label} className="rounded-xl bg-slate-900 border border-white/10 p-4">
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl bg-slate-900 border border-white/10 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Campagna</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Organizzazione</th>
              <th className="text-center px-5 py-3 text-xs font-medium text-slate-400">Stato</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-slate-400">Inviate</th>
              <th className="px-5 py-3 text-xs font-medium text-slate-400 w-40">Aperture</th>
              <th className="px-5 py-3 text-xs font-medium text-slate-400 w-40">Click</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-slate-400">Data invio</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => {
              const cfg = (STATUS_CONFIG[c.status] ?? STATUS_CONFIG.DRAFT)!;
              const Icon = cfg.icon;
              return (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                  <td className="px-5 py-3">
                    <p className="text-xs font-medium text-slate-200 truncate max-w-[180px]">{c.name}</p>
                    <p className="text-xs text-slate-500 truncate max-w-[180px]">{c.subject}</p>
                  </td>
                  <td className="px-5 py-3">
                    <Link href={`/admin/organizations/${c.orgId}`} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                      {c.orgName}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.cls}`}>
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-xs text-slate-300">
                    {c.totalSent > 0 ? c.totalSent.toLocaleString("it-IT") : "—"}
                  </td>
                  <td className="px-5 py-3">
                    {c.status === "SENT" ? <Bar pct={c.openRate} color="bg-violet-500" /> : <span className="text-xs text-slate-600">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    {c.status === "SENT" ? <Bar pct={c.clickRate} color="bg-amber-500" /> : <span className="text-xs text-slate-600">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right text-xs text-slate-400 whitespace-nowrap">
                    {c.sentAt
                      ? new Date(c.sentAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "2-digit" })
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {campaigns.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-500">Nessuna campagna trovata</div>
        )}
      </div>
    </div>
  );
}
