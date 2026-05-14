"use client";

import { useState, useEffect } from "react";
import { Activity as ActivityIcon, CalendarDays, CheckCircle, Clock, Unlink } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { ActivitiesTable } from "./ActivitiesTable";
import { MiniCalendar } from "./MiniCalendar";
import type { Activity } from "@/types/activities";

type Props = {
  initialActivities: Activity[];
  gcalConnected: boolean;
  gcalConfigured: boolean;
};

export function ActivitiesPageClient({ initialActivities, gcalConnected: initialGcalConnected, gcalConfigured }: Props) {
  const [activities, setActivities] = useState(initialActivities);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [gcalConnected, setGcalConnected] = useState(initialGcalConnected);
  const searchParams = useSearchParams();

  useEffect(() => {
    const gcal = searchParams.get("gcal");
    if (gcal === "connected") {
      toast.success("Google Calendar connesso con successo!");
      setGcalConnected(true);
    } else if (gcal === "error") {
      toast.error("Errore nella connessione a Google Calendar");
    }
  }, [searchParams]);

  async function handleDisconnect() {
    await fetch("/api/google-calendar/disconnect", { method: "POST" });
    setGcalConnected(false);
    toast.success("Google Calendar disconnesso");
  }

  const pendingCount = activities.filter(a => !a.completedAt).length;
  const todayCount = activities.filter(a => !a.completedAt && a.dueDate && isToday(a.dueDate)).length;
  const overdueCount = activities.filter(a => !a.completedAt && a.dueDate && new Date(a.dueDate) < new Date() && !isToday(a.dueDate)).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--crm-primary)]/10">
            <ActivityIcon className="h-5 w-5 text-[var(--crm-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Attività</h1>
            <p className="text-sm text-[var(--crm-neutral-500)]">
              {pendingCount} da completare · {activities.length} totali
            </p>
          </div>
        </div>

        {/* Google Calendar connect */}
        <div className="flex items-center gap-2">
          {gcalConfigured && (
            gcalConnected ? (
              <div className="flex items-center gap-2 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-3 py-1.5">
                <CalendarDays className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-xs font-medium text-green-700 dark:text-green-400">Google Calendar connesso</span>
                <button
                  onClick={handleDisconnect}
                  className="ml-1 text-[var(--crm-neutral-400)] hover:text-[var(--crm-danger)] transition-colors"
                  title="Disconnetti"
                >
                  <Unlink className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <a
                href="/api/google-calendar/connect"
                className="flex items-center gap-2 rounded-lg border border-[var(--crm-neutral-200)] dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1.5 text-xs font-medium text-[var(--crm-neutral-700)] dark:text-white/70 hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/10 transition-colors"
              >
                <CalendarDays className="h-4 w-4" />
                Connetti Google Calendar
              </a>
            )
          )}
        </div>
      </div>

      {/* KPI strip */}
      <div className="flex gap-3 flex-wrap">
        {todayCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 px-3 py-2 text-sm cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => setSelectedDay(new Date())}>
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-700 dark:text-blue-400">{todayCount} oggi</span>
          </div>
        )}
        {overdueCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 px-3 py-2 text-sm">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-medium text-red-700 dark:text-red-400">{overdueCount} in ritardo</span>
          </div>
        )}
        {pendingCount === 0 && activities.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 px-3 py-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="font-medium text-green-700 dark:text-green-400">Tutto completato!</span>
          </div>
        )}
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6 items-start">
        <ActivitiesTable
          initialActivities={activities}
          filterDay={selectedDay}
          gcalConnected={gcalConnected}
        />

        <div className="lg:sticky lg:top-6">
          <MiniCalendar
            activities={activities}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
          />
        </div>
      </div>
    </div>
  );
}

function isToday(dateStr: string | null) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}
