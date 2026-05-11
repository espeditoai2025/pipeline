"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Cog,
  LayoutDashboard,
  Package,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

const navItems = [
  { key: "dashboard", href: "/", icon: LayoutDashboard },
  { key: "deals", href: "/deals", icon: Briefcase },
  { key: "contacts", href: "/contacts", icon: Users },
  { key: "companies", href: "/companies", icon: Building2 },
  { key: "leads", href: "/leads", icon: Zap },
  { key: "activities", href: "/activities", icon: Calendar },
  { key: "reports", href: "/reports", icon: BarChart3 },
  { key: "automations", href: "/automations", icon: Workflow },
  { key: "products", href: "/products", icon: Package },
] as const;

const bottomItems = [{ key: "settings", href: "/settings", icon: Cog }] as const;

export function Sidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  function NavLink({
    href,
    icon: Icon,
    label,
  }: {
    href: string;
    icon: React.ElementType;
    label: string;
  }) {
    const active = isActive(href);
    const link = (
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          sidebarCollapsed ? "justify-center px-2" : "",
          active
            ? "bg-[var(--crm-primary)] text-white"
            : "text-[var(--crm-neutral-500)] hover:bg-[var(--crm-neutral-50)] hover:text-[var(--crm-neutral-900)] dark:hover:bg-white/5 dark:hover:text-white",
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!sidebarCollapsed && <span>{label}</span>}
      </Link>
    );

    if (sidebarCollapsed) {
      return (
        <Tooltip>
          <TooltipTrigger>{link}</TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      );
    }
    return link;
  }

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] transition-all duration-200",
        sidebarCollapsed ? "w-14" : "w-56",
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center h-14 px-3 border-b border-[var(--crm-neutral-100)] dark:border-white/10 shrink-0",
          sidebarCollapsed ? "justify-center" : "gap-2",
        )}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--crm-primary)] shrink-0">
          <span className="text-white font-bold text-sm">C</span>
        </div>
        {!sidebarCollapsed && (
          <span className="font-semibold text-[var(--crm-neutral-900)] dark:text-white text-sm">
            CRM
          </span>
        )}
      </div>

      {/* Nav links */}
      <ScrollArea className="flex-1 py-3">
        <nav className={cn("space-y-0.5", sidebarCollapsed ? "px-1" : "px-2")}>
          {navItems.map(({ key, href, icon }) => (
            <NavLink key={key} href={href} icon={icon} label={t(key)} />
          ))}
        </nav>
      </ScrollArea>

      {/* Bottom: settings */}
      <div className={cn("py-3 border-t border-[var(--crm-neutral-100)] dark:border-white/10", sidebarCollapsed ? "px-1" : "px-2")}>
        {bottomItems.map(({ key, href, icon }) => (
          <NavLink key={key} href={href} icon={icon} label={t(key)} />
        ))}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-16 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] shadow-sm hover:shadow-md transition-shadow"
        aria-label={sidebarCollapsed ? "Espandi sidebar" : "Comprimi sidebar"}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="h-3 w-3 text-[var(--crm-neutral-500)]" />
        ) : (
          <ChevronLeft className="h-3 w-3 text-[var(--crm-neutral-500)]" />
        )}
      </button>
    </aside>
  );
}
