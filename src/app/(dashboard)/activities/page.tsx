"use client";

import { useState } from "react";
import { CalendarDays, List } from "lucide-react";
import { MOCK_ACTIVITIES } from "@/lib/mock-activities";
import { ActivitiesTable } from "@/components/activities/ActivitiesTable";
import { CalendarView } from "@/components/activities/CalendarView";
import type { Activity } from "@/types/activities";

export default function ActivitiesPage() {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [activities, setActivities] = useState<Activity[]>(MOCK_ACTIVITIES);

  const pendingCount = activities.filter((a) => !a.completedAt).length;

  function handleSaved(saved: Activity) {
    setActivities((prev) => {
      const exists = prev.find((a) => a.id === saved.id);
      return exists ? prev.map((a) => a.id === saved.id ? saved : a) : [saved, ...prev];
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--crm-primary)]/10">
            <CalendarDays className="h-5 w-5 text-[var(--crm-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Attività</h1>
            <p className="text-sm text-[var(--crm-neutral-500)]">{pendingCount} da completare</p>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex rounded-lg border border-[var(--crm-neutral-100)] overflow-hidden">
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${view === "list" ? "bg-[var(--crm-primary)] text-white" : "text-[var(--crm-neutral-600)] hover:bg-[var(--crm-neutral-50)]"}`}
          >
            <List className="h-4 w-4" /> Lista
          </button>
          <button
            onClick={() => setView("calendar")}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors border-l border-[var(--crm-neutral-100)] ${view === "calendar" ? "bg-[var(--crm-primary)] text-white" : "text-[var(--crm-neutral-600)] hover:bg-[var(--crm-neutral-50)]"}`}
          >
            <CalendarDays className="h-4 w-4" /> Calendario
          </button>
        </div>
      </div>

      {view === "list"
        ? <ActivitiesTable initialActivities={activities} />
        : <CalendarView activities={activities} onActivitySaved={handleSaved} />
      }
    </div>
  );
}
