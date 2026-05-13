"use client";

import { useTranslations } from "next-intl";
import { signOut, useSession } from "next-auth/react";
import { Bell, Moon, Search, Sun, Clock, Trophy, XCircle, Zap, CheckCircle2, Inbox } from "lucide-react";
import { useState, useEffect, useRef } from "react";
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
import { getNotifications, type AppNotification } from "@/server/actions/notifications";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "Adesso";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}min fa`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h fa`;
  return `${Math.floor(diff / 86_400_000)}g fa`;
}

const NOTIF_ICONS: Record<AppNotification["type"], React.ElementType> = {
  overdue_activity: Clock,
  deal_won: Trophy,
  deal_lost: XCircle,
  new_lead: Zap,
};

const NOTIF_COLORS: Record<AppNotification["type"], string> = {
  overdue_activity: "text-red-500 bg-red-50 dark:bg-red-900/20",
  deal_won: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20",
  deal_lost: "text-slate-500 bg-slate-100 dark:bg-white/10",
  new_lead: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20",
};

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [read, setRead] = useState<Set<string>>(new Set());

  useEffect(() => {
    getNotifications().then((n) => {
      setNotifications(n);
      setRead(new Set(n.filter((x) => x.read).map((x) => x.id)));
      setLoading(false);
    });
  }, []);

  const unread = notifications.filter((n) => !read.has(n.id));

  function markAllRead() {
    setRead(new Set(notifications.map((n) => n.id)));
  }

  return (
    <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--crm-neutral-100)] dark:border-white/10">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-[var(--crm-primary)]" />
          <span className="text-sm font-semibold">Notifiche</span>
          {unread.length > 0 && (
            <span className="rounded-full bg-[var(--crm-danger)] text-white text-xs px-1.5 py-0.5 font-medium">
              {unread.length}
            </span>
          )}
        </div>
        {unread.length > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1 text-xs text-[var(--crm-primary)] hover:underline"
          >
            <CheckCircle2 className="h-3 w-3" /> Segna tutte lette
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-[var(--crm-neutral-500)]">
            Caricamento...
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <Inbox className="h-8 w-8 text-[var(--crm-neutral-300)] mx-auto mb-2" />
            <p className="text-sm font-medium text-[var(--crm-neutral-500)]">Nessuna notifica</p>
            <p className="text-xs text-[var(--crm-neutral-400)] mt-0.5">Sei in pari con tutto!</p>
          </div>
        ) : (
          notifications.map((n) => {
            const Icon = NOTIF_ICONS[n.type];
            const isUnread = !read.has(n.id);
            return (
              <div
                key={n.id}
                onClick={() => setRead((r) => new Set([...r, n.id]))}
                className={`flex items-start gap-3 px-4 py-3 border-b border-[var(--crm-neutral-100)] dark:border-white/5 last:border-0 cursor-pointer transition-colors hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 ${isUnread ? "bg-[var(--crm-primary)]/[0.03]" : ""}`}
              >
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${NOTIF_COLORS[n.type]}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold ${isUnread ? "text-[var(--crm-neutral-900)] dark:text-white" : "text-[var(--crm-neutral-600)] dark:text-white/70"}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-[var(--crm-neutral-500)] mt-0.5 line-clamp-2">{n.body}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-xs text-[var(--crm-neutral-400)]">{timeAgo(n.createdAt)}</span>
                  {isUnread && <span className="h-1.5 w-1.5 rounded-full bg-[var(--crm-primary)]" />}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function Topbar() {
  const t = useTranslations();
  const { data: session } = useSession();
  const { theme, setTheme, openCommandPalette } = useUIStore();
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  const isDark = theme === "dark";
  const initials = session?.user?.name
    ? session.user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  // Load unread count on mount
  useEffect(() => {
    getNotifications().then((n) => {
      setUnreadCount(n.filter((x) => !x.read).length);
    });
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notifOpen]);

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
          <kbd className="rounded bg-[var(--crm-neutral-100)] dark:bg-white/10 px-1.5 py-0.5 text-xs font-mono">⌘K</kbd>
        </span>
      </button>

      <div className="ml-auto flex items-center gap-2">
        {/* Dark mode toggle */}
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/10 transition-colors"
          aria-label={isDark ? t("common.lightMode") : t("common.darkMode")}
        >
          {isDark ? <Sun className="h-4 w-4 text-[var(--crm-neutral-500)]" /> : <Moon className="h-4 w-4 text-[var(--crm-neutral-500)]" />}
        </button>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/10 transition-colors"
          >
            <Bell className="h-4 w-4 text-[var(--crm-neutral-500)]" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px] bg-[var(--crm-danger)] border-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </button>
          {notifOpen && (
            <NotificationPanel onClose={() => setNotifOpen(false)} />
          )}
        </div>

        {/* User avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/10 transition-colors border-0 bg-transparent cursor-pointer">
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
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })} className="text-[var(--crm-danger)]">
              {t("common.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
