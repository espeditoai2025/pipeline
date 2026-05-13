import { getAdminWorkflowLogs } from "@/server/actions/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Workflow, CheckCircle2, XCircle, Clock } from "lucide-react";

const TRIGGER_LABELS: Record<string, string> = {
  DEAL_CREATED: "Affare creato",
  DEAL_STAGE_CHANGED: "Stage cambiato",
  DEAL_WON: "Affare vinto",
  DEAL_LOST: "Affare perso",
  DEAL_VALUE_CHANGED: "Valore cambiato",
  CONTACT_CREATED: "Contatto creato",
  LEAD_CREATED: "Lead creato",
  ACTIVITY_OVERDUE: "Attività scaduta",
};

export default async function AdminWorkflowLogsPage() {
  const logs = await getAdminWorkflowLogs(200);
  if (!logs) redirect("/dashboard");

  const successCount = logs.filter((l) => l.status === "SUCCESS").length;
  const failedCount = logs.filter((l) => l.status === "FAILED").length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Workflow className="h-5 w-5 text-fuchsia-400" />
            Log Automazioni
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Ultime {logs.length} esecuzioni workflow su tutta la piattaforma</p>
        </div>
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> {successCount} ok
          </span>
          <span className="flex items-center gap-1.5 text-red-400">
            <XCircle className="h-4 w-4" /> {failedCount} errori
          </span>
        </div>
      </div>

      <div className="rounded-xl bg-slate-900 border border-white/10 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Stato</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Workflow</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Organizzazione</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Trigger</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Entità</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-slate-400">Data</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                <td className="px-5 py-3">
                  {log.status === "SUCCESS" ? (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> OK
                    </span>
                  ) : log.status === "FAILED" ? (
                    <span className="flex items-center gap-1.5 text-xs text-red-400">
                      <XCircle className="h-3.5 w-3.5" /> Errore
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-yellow-400">
                      <Clock className="h-3.5 w-3.5" /> In corso
                    </span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <p className="text-xs font-medium text-slate-200">{log.workflowName}</p>
                </td>
                <td className="px-5 py-3">
                  <Link href={`/admin/organizations/${log.orgId}`} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                    {log.orgName}
                  </Link>
                </td>
                <td className="px-5 py-3">
                  <span className="rounded-full bg-fuchsia-900/40 text-fuchsia-300 px-2 py-0.5 text-[10px] font-medium">
                    {TRIGGER_LABELS[log.trigger] ?? log.trigger}
                  </span>
                </td>
                <td className="px-5 py-3 text-xs text-slate-400 max-w-[180px] truncate">
                  {log.entityLabel || "—"}
                </td>
                <td className="px-5 py-3 text-right text-xs text-slate-400 whitespace-nowrap">
                  {new Date(log.startedAt).toLocaleString("it-IT", {
                    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-500">Nessuna esecuzione registrata</div>
        )}
      </div>
    </div>
  );
}
