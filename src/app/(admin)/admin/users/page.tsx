import { getAdminUsers } from "@/server/actions/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Users } from "lucide-react";

const PLAN_BADGE: Record<string, string> = {
  STARTER: "bg-slate-700 text-slate-300", FREE: "bg-slate-700 text-slate-300",
  PRO: "bg-emerald-900/50 text-emerald-300", PROFESSIONAL: "bg-emerald-900/50 text-emerald-300",
  ENTERPRISE: "bg-amber-900/50 text-amber-300",
};
const ROLE_BADGE: Record<string, string> = {
  OWNER: "bg-amber-900/50 text-amber-300",
  ADMIN: "bg-violet-900/50 text-violet-300",
  MANAGER: "bg-blue-900/50 text-blue-300",
  SALES: "bg-emerald-900/50 text-emerald-300",
  VIEWER: "bg-slate-700 text-slate-300",
};

export default async function AdminUsersPage() {
  const users = await getAdminUsers();
  if (!users) redirect("/dashboard");

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-400" />
            Utenti
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">{users.length} utenti totali su tutte le organizzazioni</p>
        </div>
      </div>

      <div className="rounded-xl bg-slate-900 border border-white/10 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Utente</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Organizzazione</th>
              <th className="text-center px-5 py-3 text-xs font-medium text-slate-400">Piano</th>
              <th className="text-center px-5 py-3 text-xs font-medium text-slate-400">Ruolo</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-slate-400">Iscritto il</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                <td className="px-5 py-3">
                  <p className="text-xs font-medium text-slate-200">{u.name ?? <span className="text-slate-500">—</span>}</p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </td>
                <td className="px-5 py-3">
                  <Link href={`/admin/organizations/${u.orgId}`} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                    {u.orgName}
                  </Link>
                </td>
                <td className="px-5 py-3 text-center">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PLAN_BADGE[u.orgPlan] ?? "bg-slate-700 text-slate-300"}`}>
                    {u.orgPlan}
                  </span>
                </td>
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
        {users.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-500">Nessun utente trovato</div>
        )}
      </div>
    </div>
  );
}
