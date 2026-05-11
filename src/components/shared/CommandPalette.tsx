"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  LayoutDashboard,
  Package,
  Plus,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "cmdk";
import { useUIStore } from "@/stores/ui";

const navCommands = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Affari", href: "/deals", icon: Briefcase },
  { label: "Contatti", href: "/contacts", icon: Users },
  { label: "Aziende", href: "/companies", icon: Building2 },
  { label: "Lead", href: "/leads", icon: Zap },
  { label: "Attività", href: "/activities", icon: Calendar },
  { label: "Report", href: "/reports", icon: BarChart3 },
  { label: "Automazioni", href: "/automations", icon: Workflow },
  { label: "Prodotti", href: "/products", icon: Package },
];

const actionCommands = [
  { label: "Nuovo affare", href: "/deals?new=1", icon: Plus },
  { label: "Nuovo contatto", href: "/contacts?new=1", icon: Plus },
  { label: "Nuovo lead", href: "/leads?new=1", icon: Plus },
  { label: "Nuova attività", href: "/activities?new=1", icon: Plus },
];

export function CommandPalette() {
  const t = useTranslations("commandPalette");
  const router = useRouter();
  const { commandPaletteOpen, openCommandPalette, closeCommandPalette } = useUIStore();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        commandPaletteOpen ? closeCommandPalette() : openCommandPalette();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [commandPaletteOpen, openCommandPalette, closeCommandPalette]);

  function navigate(href: string) {
    closeCommandPalette();
    router.push(href);
  }

  return (
    <CommandDialog open={commandPaletteOpen} onOpenChange={(v) => (v ? openCommandPalette() : closeCommandPalette())}>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={closeCommandPalette} />
      <div className="fixed left-1/2 top-1/4 z-50 w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] shadow-2xl">
        <CommandInput
          placeholder={t("placeholder")}
          className="w-full border-0 border-b border-[var(--crm-neutral-100)] dark:border-white/10 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-[var(--crm-neutral-500)]"
        />
        <CommandList className="max-h-80 overflow-y-auto p-2">
          <CommandEmpty className="py-8 text-center text-sm text-[var(--crm-neutral-500)]">
            {t("noResults")}
          </CommandEmpty>

          <CommandGroup
            heading={
              <span className="px-2 py-1 text-xs font-semibold text-[var(--crm-neutral-500)] uppercase tracking-wide">
                {t("groups.navigation")}
              </span>
            }
          >
            {navCommands.map(({ label, href, icon: Icon }) => (
              <CommandItem
                key={href}
                value={label}
                onSelect={() => navigate(href)}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--crm-neutral-900)] dark:text-white hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 aria-selected:bg-[var(--crm-primary)]/10"
              >
                <Icon className="h-4 w-4 text-[var(--crm-neutral-500)]" />
                {label}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator className="my-1 border-t border-[var(--crm-neutral-100)] dark:border-white/10" />

          <CommandGroup
            heading={
              <span className="px-2 py-1 text-xs font-semibold text-[var(--crm-neutral-500)] uppercase tracking-wide">
                {t("groups.actions")}
              </span>
            }
          >
            {actionCommands.map(({ label, href, icon: Icon }) => (
              <CommandItem
                key={href}
                value={label}
                onSelect={() => navigate(href)}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--crm-neutral-900)] dark:text-white hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 aria-selected:bg-[var(--crm-primary)]/10"
              >
                <Icon className="h-4 w-4 text-[var(--crm-primary)]" />
                {label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </div>
    </CommandDialog>
  );
}
