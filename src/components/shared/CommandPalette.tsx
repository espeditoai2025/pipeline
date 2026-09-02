"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  BarChart3, Briefcase, Building2, Calendar,
  LayoutDashboard, Package, Plus, Users, Workflow,
  Zap, User, Search, Loader2, Mail,
} from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup,
  CommandInput, CommandItem, CommandList, CommandSeparator,
} from "cmdk";
import { useUIStore } from "@/stores/ui";
import { globalSearch, type SearchResult } from "@/server/actions/search";

const navCommands = [
  { label: "Dashboard",   href: "/dashboard",   icon: LayoutDashboard },
  { label: "Affari",      href: "/deals",       icon: Briefcase },
  { label: "Contatti",    href: "/contacts",    icon: Users },
  { label: "Aziende",     href: "/companies",   icon: Building2 },
  { label: "Lead",        href: "/leads",       icon: Zap },
  { label: "Attività",    href: "/activities",  icon: Calendar },
  { label: "Report",      href: "/reports",     icon: BarChart3 },
  { label: "Automazioni", href: "/automations", icon: Workflow },
  { label: "Prodotti",    href: "/products",    icon: Package },
  { label: "Email",       href: "/emails",      icon: Mail },
];

const actionCommands = [
  { label: "Nuovo affare",    href: "/deals?new=1",      icon: Plus },
  { label: "Nuovo contatto",  href: "/contacts?new=1",   icon: Plus },
  { label: "Nuovo lead",      href: "/leads?new=1",      icon: Plus },
  { label: "Nuova attività",  href: "/activities?new=1", icon: Plus },
];

const TYPE_LABELS: Record<SearchResult["type"], string> = {
  contact: "Contatto", deal: "Affare", company: "Azienda", lead: "Lead",
};
const TYPE_ICONS: Record<SearchResult["type"], React.ElementType> = {
  contact: User, deal: Briefcase, company: Building2, lead: Zap,
};
const TYPE_COLORS: Record<SearchResult["type"], string> = {
  contact: "text-teal-600", deal: "text-blue-600",
  company: "text-violet-600", lead: "text-amber-600",
};

export function CommandPalette() {
  const t = useTranslations("commandPalette");
  const router = useRouter();
  const { commandPaletteOpen, openCommandPalette, closeCommandPalette } = useUIStore();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        commandPaletteOpen ? closeCommandPalette() : openCommandPalette();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [commandPaletteOpen, openCommandPalette, closeCommandPalette]);

  // Reset on close
  useEffect(() => {
    if (!commandPaletteOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery("");
      setResults([]);
    }
  }, [commandPaletteOpen]);

  function handleSearch(val: string) {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const res = await globalSearch(val);
        setResults(res);
      });
    }, 250);
  }

  function navigate(href: string) {
    closeCommandPalette();
    router.push(href);
  }

  const isSearching = query.trim().length >= 2;
  const grouped = isSearching
    ? (["contact", "deal", "company", "lead"] as SearchResult["type"][])
        .map((type) => ({ type, items: results.filter((r) => r.type === type) }))
        .filter((g) => g.items.length > 0)
    : [];

  return (
    <CommandDialog
      open={commandPaletteOpen}
      onOpenChange={(v) => (v ? openCommandPalette() : closeCommandPalette())}
    >
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={closeCommandPalette} />
      <div className="fixed left-1/2 top-[20%] z-50 w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] shadow-2xl">

        {/* Input */}
        <div className="flex items-center gap-3 border-b border-[var(--crm-neutral-100)] dark:border-white/10 px-4 py-3">
          {isPending
            ? <Loader2 className="h-4 w-4 text-[var(--crm-neutral-400)] shrink-0 animate-spin" />
            : <Search className="h-4 w-4 text-[var(--crm-neutral-400)] shrink-0" />
          }
          <CommandInput
            value={query}
            onValueChange={handleSearch}
            placeholder={t("placeholder")}
            className="flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-[var(--crm-neutral-500)]"
          />
          <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-[var(--crm-neutral-200)] px-1.5 font-mono text-[10px] text-[var(--crm-neutral-400)]">
            ESC
          </kbd>
        </div>

        <CommandList className="max-h-96 overflow-y-auto p-2">
          <CommandEmpty className="py-8 text-center text-sm text-[var(--crm-neutral-500)]">
            {isSearching && !isPending ? t("noResults") : null}
          </CommandEmpty>

          {/* ── Risultati ricerca ── */}
          {isSearching && grouped.map(({ type, items }) => {
            const Icon = TYPE_ICONS[type];
            return (
              <CommandGroup
                key={type}
                heading={
                  <span className="px-2 py-1 text-xs font-semibold text-[var(--crm-neutral-500)] uppercase tracking-wide">
                    {TYPE_LABELS[type]}
                  </span>
                }
              >
                {items.map((r) => (
                  <CommandItem
                    key={r.id}
                    value={`${r.type}-${r.id}`}
                    onSelect={() => navigate(r.href)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 aria-selected:bg-[var(--crm-primary)]/10"
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${TYPE_COLORS[type]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--crm-neutral-900)] dark:text-white truncate">{r.title}</p>
                      {r.subtitle && <p className="text-xs text-[var(--crm-neutral-500)] truncate">{r.subtitle}</p>}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}

          {/* ── Navigazione (solo quando non sta cercando) ── */}
          {!isSearching && (
            <>
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
            </>
          )}
        </CommandList>

        {/* Footer */}
        <div className="border-t border-[var(--crm-neutral-100)] dark:border-white/10 px-4 py-2 flex items-center gap-4">
          <span className="text-[10px] text-[var(--crm-neutral-400)]">
            <kbd className="font-mono">↑↓</kbd> naviga &nbsp;·&nbsp; <kbd className="font-mono">↵</kbd> apri &nbsp;·&nbsp; <kbd className="font-mono">ESC</kbd> chiudi
          </span>
          {isSearching && !isPending && results.length > 0 && (
            <span className="ml-auto text-[10px] text-[var(--crm-neutral-400)]">{results.length} risultati</span>
          )}
        </div>
      </div>
    </CommandDialog>
  );
}
