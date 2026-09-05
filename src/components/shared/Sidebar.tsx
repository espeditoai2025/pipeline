"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Cog,
  CreditCard,
  LayoutDashboard,
  Mail,
  Package,
  Telescope,
  Users,
  Workflow,
  Zap,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui";
import { X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PipelyFavicon, PipelyWordmark, PipelyWordmarkDark } from "@/components/shared/PipelyLogo";

const navItems = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "deals", href: "/deals", icon: Briefcase },
  { key: "contacts", href: "/contacts", icon: Users },
  { key: "companies", href: "/companies", icon: Building2 },
  { key: "leads", href: "/leads", icon: Zap },
  { key: "leadFinder", href: "/lead-finder", icon: Telescope },
  { key: "activities", href: "/activities", icon: Calendar },
  { key: "invoices", href: "/invoices", icon: Receipt },
  { key: "emails", href: "/emails", icon: Mail },
  { key: "reports", href: "/reports", icon: BarChart3 },
  { key: "automations", href: "/automations", icon: Workflow },
  { key: "products", href: "/products", icon: Package },
] as const;

const bottomItems = [
  { key: "guida", href: "/guida", icon: BookOpen },
  { key: "billing", href: "/billing", icon: CreditCard },
  { key: "settings", href: "/settings", icon: Cog },
] as const;

export function Sidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, closeMobileSidebar } = useUIStore();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
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

  const sidebarContent = (
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
        {sidebarCollapsed ? (
          <PipelyFavicon size={28} />
        ) : (
          <>
            <PipelyWordmark className="dark:hidden" />
            <PipelyWordmarkDark className="hidden dark:block" />
          </>
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

      {/* Collapse toggle (desktop only) */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-16 z-10 hidden md:flex h-6 w-6 items-center justify-center rounded-full border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] shadow-sm hover:shadow-md transition-shadow"
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

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex">{sidebarContent}</div>

      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeMobileSidebar}
            aria-hidden
          />
          {/* Panel — always expanded on mobile */}
          <div className="relative z-10 flex flex-col w-56 h-full border-r border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e]">
            {/* Close button */}
            <button
              onClick={closeMobileSidebar}
              className="absolute right-3 top-4 flex h-7 w-7 items-center justify-center rounded-lg hover:bg-[var(--crm-neutral-100)] dark:hover:bg-white/10"
              aria-label="Chiudi menu"
            >
              <X className="h-4 w-4 text-[var(--crm-neutral-500)]" />
            </button>

            {/* Logo */}
            <div className="flex items-center h-14 px-3 border-b border-[var(--crm-neutral-100)] dark:border-white/10 shrink-0 gap-2">
              <PipelyWordmark className="dark:hidden" />
              <PipelyWordmarkDark className="hidden dark:block" />
            </div>

            {/* Nav */}
            <ScrollArea className="flex-1 py-3">
              <nav className="space-y-0.5 px-2">
                {navItems.map(({ key, href, icon: Icon }) => {
                  const active = isActive(href);
                  return (
                    <Link
                      key={key}
                      href={href}
                      onClick={closeMobileSidebar}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        active
                          ? "bg-[var(--crm-primary)] text-white"
                          : "text-[var(--crm-neutral-500)] hover:bg-[var(--crm-neutral-50)] hover:text-[var(--crm-neutral-900)] dark:hover:bg-white/5 dark:hover:text-white",
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span>{t(key)}</span>
                    </Link>
                  );
                })}
              </nav>
            </ScrollArea>

            {/* Bottom */}
            <div className="py-3 border-t border-[var(--crm-neutral-100)] dark:border-white/10 px-2">
              {bottomItems.map(({ key, href, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={key}
                    href={href}
                    onClick={closeMobileSidebar}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      active
                        ? "bg-[var(--crm-primary)] text-white"
                        : "text-[var(--crm-neutral-500)] hover:bg-[var(--crm-neutral-50)] hover:text-[var(--crm-neutral-900)] dark:hover:bg-white/5 dark:hover:text-white",
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{t(key)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
