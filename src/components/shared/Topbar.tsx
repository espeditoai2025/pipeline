"use client";

import { useTranslations } from "next-intl";
import { signOut, useSession } from "next-auth/react";
import { Bell, Moon, Search, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useUIStore } from "@/stores/ui";

export function Topbar() {
  const t = useTranslations();
  const { data: session } = useSession();
  const { theme, setTheme, openCommandPalette } = useUIStore();

  const isDark = theme === "dark";
  const initials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  return (
    <header className="flex h-14 items-center gap-3 border-b border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] px-4 shrink-0">
      {/* Search trigger */}
      <button
        onClick={openCommandPalette}
        className="flex flex-1 max-w-sm items-center gap-2 rounded-lg border border-[var(--crm-neutral-100)] dark:border-white/10 bg-[var(--crm-neutral-50)] dark:bg-white/5 px-3 py-1.5 text-sm text-[var(--crm-neutral-500)] hover:border-[var(--crm-primary)] transition-colors"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">{t("common.search")}</span>
        <span className="ml-auto hidden sm:flex items-center gap-1">
          <kbd className="rounded bg-[var(--crm-neutral-100)] dark:bg-white/10 px-1.5 py-0.5 text-xs font-mono">
            ⌘K
          </kbd>
        </span>
      </button>

      <div className="ml-auto flex items-center gap-2">
        {/* Dark mode toggle */}
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/10 transition-colors"
          aria-label={isDark ? t("common.lightMode") : t("common.darkMode")}
        >
          {isDark ? (
            <Sun className="h-4 w-4 text-[var(--crm-neutral-500)]" />
          ) : (
            <Moon className="h-4 w-4 text-[var(--crm-neutral-500)]" />
          )}
        </button>

        {/* Notifications */}
        <button className="relative flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/10 transition-colors">
          <Bell className="h-4 w-4 text-[var(--crm-neutral-500)]" />
          <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px] bg-[var(--crm-danger)] border-white">
            3
          </Badge>
        </button>

        {/* User avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/10 transition-colors border-0 bg-transparent cursor-pointer"
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-[var(--crm-primary)] text-white text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden md:block text-sm font-medium text-[var(--crm-neutral-900)] dark:text-white truncate max-w-28">
              {session?.user?.name ?? session?.user?.email}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs text-[var(--crm-neutral-500)]">
              {session?.user?.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { window.location.href = "/settings"; }}>
              {t("common.profile")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-[var(--crm-danger)]"
            >
              {t("common.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
