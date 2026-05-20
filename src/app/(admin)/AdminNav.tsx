"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, Users, Megaphone, Workflow, ArrowLeft, Server } from "lucide-react";

const NAV = [
  { href: "/admin", label: "Panoramica", icon: LayoutDashboard },
  { href: "/admin/organizations", label: "Iscritti", icon: Building2 },
  { href: "/admin/users", label: "Utenti", icon: Users },
  { href: "/admin/campaigns", label: "Campagne", icon: Megaphone },
  { href: "/admin/workflow-logs", label: "Log Automazioni", icon: Workflow },
  { href: "/admin/system", label: "Sistema", icon: Server },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <aside className="w-56 flex-shrink-0 bg-slate-900 border-r border-white/10 flex flex-col h-screen sticky top-0">
      <div className="px-5 py-4 border-b border-white/10">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Pipely</p>
        <p className="text-sm font-semibold text-white mt-0.5">Admin Panel</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              path === href
                ? "bg-white/10 text-white"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-white/10">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna al CRM
        </Link>
      </div>
    </aside>
  );
}
