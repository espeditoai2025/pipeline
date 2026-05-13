"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, CheckCircle2, XCircle, ChevronRight, X } from "lucide-react";
import type { AdminOrg } from "@/server/actions/admin";

const PLAN_BADGE: Record<string, string> = {
  FREE: "bg-slate-700 text-slate-300",
  ESSENTIAL: "bg-blue-900/50 text-blue-300",
  ADVANCED: "bg-violet-900/50 text-violet-300",
  PROFESSIONAL: "bg-emerald-900/50 text-emerald-300",
  ENTERPRISE: "bg-amber-900/50 text-amber-300",
};

export function OrgsTable({ orgs }: { orgs: AdminOrg[] }) {
  const [search, setSearch] = useState("");

  const filtered = orgs.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.name.toLowerCase().includes(q) ||
      (o.ownerEmail ?? "").toLowerCase().includes(q) ||
      o.slug.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Iscritti</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {filtered.length !== orgs.length
              ? `${filtered.length} di ${orgs.length} organizzazioni`
              : `${orgs.length} organizzazioni totali`}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per nome, email o slug…"
            className="w-72 rounded-lg bg-slate-800 border border-white/10 pl-9 pr-8 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-slate-900 border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {[
                  { label: "Organizzazione", align: "left" },
                  { label: "Owner", align: "left" },
                  { label: "Piano", align: "right" },
                  { label: "Utenti", align: "right" },
                  { label: "Affari", align: "right" },
                  { label: "Contatti", align: "right" },
                  { label: "Campagne", align: "right" },
                  { label: "SMTP", align: "center" },
                  { label: "Iscrizione", align: "right" },
                  { label: "", align: "center" },
                ].map(({ label, align }) => (
                  <th
                    key={label}
                    className={`px-4 py-3 text-xs font-medium text-slate-400 ${
                      align === "left" ? "text-left" : align === "center" ? "text-center" : "text-right"
                    }`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-sm text-slate-500">
                    Nessun risultato per &ldquo;{search}&rdquo;
                  </td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <tr key={o.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="text-xs font-semibold text-slate-200">{o.name}</p>
                      <p className="text-xs text-slate-500">{o.slug}</p>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-400">{o.ownerEmail ?? "—"}</td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PLAN_BADGE[o.plan] ?? "bg-slate-700 text-slate-300"}`}>
                        {o.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs text-slate-300">{o.userCount}</td>
                    <td className="px-4 py-3.5 text-right text-xs text-slate-300">{o.dealCount}</td>
                    <td className="px-4 py-3.5 text-right text-xs text-slate-300">{o.contactCount}</td>
                    <td className="px-4 py-3.5 text-right text-xs text-slate-300">{o.campaignsSent}</td>
                    <td className="px-4 py-3.5 text-center">
                      {o.hasSmtp
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                        : <XCircle className="h-4 w-4 text-slate-700 mx-auto" />
                      }
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs text-slate-400 whitespace-nowrap">
                      {new Date(o.createdAt).toLocaleDateString("it-IT")}
                    </td>
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/admin/organizations/${o.id}`}
                        className="flex items-center justify-center h-7 w-7 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors mx-auto"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
