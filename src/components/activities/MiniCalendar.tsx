"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ACTIVITY_CONFIG } from "./ActivityTypeIcon";
import type { Activity } from "@/types/activities";

type Props = {
  activities: Activity[];
  selectedDay: Date | null;
  onSelectDay: (day: Date | null) => void;
};

const WEEKDAYS = ["L", "M", "M", "G", "V", "S", "D"];
const MONTHS = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const days: (Date | null)[] = Array(startOffset).fill(null);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function MiniCalendar({ activities, selectedDay, onSelectDay }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  function prev() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function next() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const days = getCalendarDays(year, month);

  function activitiesForDay(day: Date) {
    return activities.filter(a => a.dueDate && sameDay(new Date(a.dueDate), day));
  }

  // Today's pending activities
  const todayActivities = activities.filter(a =>
    !a.completedAt && a.dueDate && sameDay(new Date(a.dueDate), today)
  );
  const overdueActivities = activities.filter(a =>
    !a.completedAt && a.dueDate && new Date(a.dueDate) < today && !sameDay(new Date(a.dueDate), today)
  );

  return (
    <div className="space-y-4">
      {/* Mini calendar */}
      <div className="rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={prev} className="rounded p-1 hover:bg-[var(--crm-neutral-100)] dark:hover:bg-white/10">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()); }}
            className="text-xs font-semibold hover:text-[var(--crm-primary)] transition-colors"
          >
            {MONTHS[month]} {year}
          </button>
          <button onClick={next} className="rounded p-1 hover:bg-[var(--crm-neutral-100)] dark:hover:bg-white/10">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((d, i) => (
            <div key={i} className="text-center text-[10px] font-semibold text-[var(--crm-neutral-400)] py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {days.map((day, i) => {
            if (!day) return <div key={`e-${i}`} />;

            const dayActs = activitiesForDay(day);
            const isToday = sameDay(day, today);
            const isSelected = selectedDay ? sameDay(day, selectedDay) : false;
            const hasPending = dayActs.some(a => !a.completedAt);
            const hasOverdue = dayActs.some(a => !a.completedAt && new Date(a.dueDate!) < today && !isToday);

            return (
              <button
                key={day.toISOString()}
                onClick={() => onSelectDay(isSelected ? null : day)}
                className={`relative flex flex-col items-center rounded-md py-1 text-xs font-medium transition-colors ${
                  isSelected
                    ? "bg-[var(--crm-primary)] text-white"
                    : isToday
                    ? "bg-[var(--crm-primary)]/10 text-[var(--crm-primary)]"
                    : "hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 text-[var(--crm-neutral-700)] dark:text-white/70"
                }`}
              >
                {day.getDate()}
                {dayActs.length > 0 && (
                  <span className={`mt-0.5 h-1 w-1 rounded-full ${
                    isSelected ? "bg-white" : hasOverdue ? "bg-[var(--crm-danger)]" : hasPending ? "bg-[var(--crm-primary)]" : "bg-[var(--crm-success)]"
                  }`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-3 flex gap-3 flex-wrap">
          <span className="flex items-center gap-1 text-[10px] text-[var(--crm-neutral-500)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--crm-primary)]" /> Attività
          </span>
          <span className="flex items-center gap-1 text-[10px] text-[var(--crm-neutral-500)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--crm-danger)]" /> Scadute
          </span>
          <span className="flex items-center gap-1 text-[10px] text-[var(--crm-neutral-500)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--crm-success)]" /> Completate
          </span>
        </div>
      </div>

      {/* Today's summary */}
      {(todayActivities.length > 0 || overdueActivities.length > 0) && (
        <div className="rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-4 space-y-3">
          <p className="text-xs font-semibold text-[var(--crm-neutral-700)] dark:text-white/80">Riepilogo</p>

          {overdueActivities.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--crm-danger)]">
                {overdueActivities.length} scadut{overdueActivities.length === 1 ? "a" : "e"}
              </p>
              {overdueActivities.slice(0, 3).map(a => {
                const { Icon, color } = ACTIVITY_CONFIG[a.type];
                return (
                  <div key={a.id} className="flex items-center gap-2">
                    <Icon className={`h-3 w-3 flex-shrink-0 ${color}`} />
                    <span className="text-xs text-[var(--crm-neutral-600)] dark:text-white/60 truncate">{a.subject}</span>
                  </div>
                );
              })}
            </div>
          )}

          {todayActivities.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--crm-primary)]">
                Oggi — {todayActivities.length} attivit{todayActivities.length === 1 ? "à" : "à"}
              </p>
              {todayActivities.slice(0, 4).map(a => {
                const { Icon, color } = ACTIVITY_CONFIG[a.type];
                const time = a.dueDate ? new Date(a.dueDate).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : "";
                return (
                  <div key={a.id} className="flex items-center gap-2">
                    <Icon className={`h-3 w-3 flex-shrink-0 ${color}`} />
                    <span className="text-xs text-[var(--crm-neutral-600)] dark:text-white/60 truncate flex-1">{a.subject}</span>
                    {time && <span className="text-[10px] text-[var(--crm-neutral-400)] shrink-0">{time}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
