"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActivityForm } from "./ActivityForm";
import { ActivityTypeIcon, ACTIVITY_CONFIG } from "./ActivityTypeIcon";
import type { Activity, ActivityType } from "@/types/activities";

type Props = {
  activities: Activity[];
  onActivitySaved: (a: Activity) => void;
};

const WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const MONTHS = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  // Monday-based week: Mon=0 … Sun=6
  const startOffset = (first.getDay() + 6) % 7;
  const days: (Date | null)[] = Array(startOffset).fill(null);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function CalendarView({ activities, onActivitySaved }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [formOpen, setFormOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedType, setSelectedType] = useState<ActivityType>("TASK");

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  const days = getCalendarDays(year, month);

  function activitiesForDay(day: Date): Activity[] {
    return activities.filter((a) => a.dueDate && sameDay(new Date(a.dueDate), day));
  }

  function handleDayClick(day: Date) {
    const iso = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9, 0).toISOString().slice(0, 16);
    setSelectedDate(iso);
    setSelectedType("TASK");
    setFormOpen(true);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="rounded-lg border border-[var(--crm-neutral-100)] p-1.5 hover:bg-[var(--crm-neutral-50)]">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-base font-semibold min-w-[160px] text-center">
            {MONTHS[month]} {year}
          </h2>
          <button onClick={nextMonth} className="rounded-lg border border-[var(--crm-neutral-100)] p-1.5 hover:bg-[var(--crm-neutral-50)]">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()); }}
            className="text-xs px-2 py-1 rounded-md border border-[var(--crm-neutral-100)] hover:bg-[var(--crm-neutral-50)] text-[var(--crm-neutral-600)]"
          >
            Oggi
          </button>
        </div>
        <Button
          size="sm"
          className="bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white"
          onClick={() => {
            const iso = new Date().toISOString().slice(0, 16);
            setSelectedDate(iso);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1.5" /> Nuova attività
        </Button>
      </div>

      {/* Grid */}
      <div className="rounded-xl border border-[var(--crm-neutral-100)] overflow-hidden bg-white dark:bg-[#1a1a2e]">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-[var(--crm-neutral-100)]">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-xs font-semibold text-[var(--crm-neutral-500)] uppercase tracking-wide bg-[var(--crm-neutral-50)] dark:bg-[#0f0f1a]">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            if (!day) {
              return <div key={`empty-${i}`} className="min-h-[100px] border-r border-b border-[var(--crm-neutral-100)] bg-[var(--crm-neutral-50)]/50 dark:bg-[#0f0f1a]/50 last:border-r-0" />;
            }

            const isCurrentMonth = day.getMonth() === month;
            const isTodayCell = sameDay(day, today);
            const dayActivities = activitiesForDay(day);
            const isLastInRow = (i + 1) % 7 === 0;

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[100px] border-b border-[var(--crm-neutral-100)] p-1.5 cursor-pointer transition-colors hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 ${!isLastInRow ? "border-r" : ""}`}
                onClick={() => handleDayClick(day)}
              >
                <div className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  isTodayCell
                    ? "bg-[var(--crm-primary)] text-white"
                    : isCurrentMonth
                    ? "text-[var(--crm-neutral-800)]"
                    : "text-[var(--crm-neutral-300)]"
                }`}>
                  {day.getDate()}
                </div>

                <div className="space-y-0.5">
                  {dayActivities.slice(0, 3).map((a) => {
                    const { color, bg, Icon } = ACTIVITY_CONFIG[a.type];
                    const done = !!a.completedAt;
                    return (
                      <div
                        key={a.id}
                        title={a.subject}
                        className={`flex items-center gap-1 rounded px-1 py-0.5 text-xs truncate ${done ? "opacity-50" : ""} ${bg}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Icon className={`h-2.5 w-2.5 flex-shrink-0 ${color}`} />
                        <span className="truncate">{a.subject}</span>
                      </div>
                    );
                  })}
                  {dayActivities.length > 3 && (
                    <div className="px-1 text-xs text-[var(--crm-neutral-500)]">+{dayActivities.length - 3} altri</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {(Object.keys(ACTIVITY_CONFIG) as ActivityType[]).map((t) => {
          const { label, Icon, color, bg } = ACTIVITY_CONFIG[t];
          return (
            <span key={t} className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${bg}`}>
              <Icon className={`h-3 w-3 ${color}`} />
              <span className={color}>{label}</span>
            </span>
          );
        })}
      </div>

      <ActivityForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        defaultType={selectedType}
        defaultDueDate={selectedDate}
        onSaved={(saved) => {
          onActivitySaved(saved);
          setFormOpen(false);
        }}
      />
    </div>
  );
}
