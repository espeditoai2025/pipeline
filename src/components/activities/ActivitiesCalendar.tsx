"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Clock, Briefcase, User, Plus } from "lucide-react";
import { ActivityTypeIcon, ACTIVITY_CONFIG } from "./ActivityTypeIcon";
import type { Activity, ActivityType } from "@/types/activities";

type Props = {
  activities: Activity[];
  onActivityClick?: (activity: Activity) => void;
  onNewActivity?: (date: Date) => void;
};

const WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const MONTHS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const days: (Date | null)[] = Array(startOffset).fill(null);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

export function ActivitiesCalendar({ activities, onActivityClick, onNewActivity }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  function prev() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function next() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }
  function goToday() {
    setMonth(today.getMonth());
    setYear(today.getFullYear());
  }

  const days = getCalendarDays(year, month);

  const activityMap = useMemo(() => {
    const map = new Map<string, Activity[]>();
    for (const a of activities) {
      if (!a.dueDate) continue;
      const d = new Date(a.dueDate);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    // Sort each day's activities by time
    for (const [, list] of map) {
      list.sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
    }
    return map;
  }, [activities]);

  function getForDay(day: Date) {
    return activityMap.get(`${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`) ?? [];
  }

  const expandedDayKey = expandedDay;
  const expandedActivities = expandedDayKey ? (activityMap.get(expandedDayKey) ?? []) : [];
  const expandedDate = expandedDayKey ? (() => {
    const parts = expandedDayKey.split("-").map(Number);
    return new Date(parts[0]!, parts[1]!, parts[2]!);
  })() : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={prev} className="rounded-lg p-2 hover:bg-[var(--crm-neutral-100)] dark:hover:bg-white/10 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-lg font-semibold text-[var(--crm-neutral-900)] dark:text-white min-w-[180px] text-center">
            {MONTHS[month]} {year}
          </h2>
          <button onClick={next} className="rounded-lg p-2 hover:bg-[var(--crm-neutral-100)] dark:hover:bg-white/10 transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={goToday}
          className="rounded-lg border border-[var(--crm-neutral-200)] dark:border-white/10 px-3 py-1.5 text-xs font-medium hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 transition-colors"
        >
          Oggi
        </button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-[var(--crm-neutral-100)] dark:border-white/10">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-2 py-2.5 text-center text-xs font-semibold text-[var(--crm-neutral-500)] uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            if (!day) {
              return (
                <div
                  key={`e-${i}`}
                  className="min-h-[100px] border-b border-r border-[var(--crm-neutral-100)] dark:border-white/10 bg-[var(--crm-neutral-50)]/50 dark:bg-white/[0.02]"
                />
              );
            }

            const dayActivities = getForDay(day);
            const isToday = sameDay(day, today);
            const dayKey = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
            const isExpanded = expandedDayKey === dayKey;
            const hasPending = dayActivities.some(a => !a.completedAt);
            const hasOverdue = dayActivities.some(a => !a.completedAt && new Date(a.dueDate!) < today && !isToday);
            const maxShow = 3;

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[100px] border-b border-r border-[var(--crm-neutral-100)] dark:border-white/10 p-1.5 transition-colors group relative ${
                  isExpanded ? "bg-[var(--crm-primary)]/5" : "hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/[0.03]"
                }`}
              >
                {/* Day number + add button */}
                <div className="flex items-center justify-between mb-1">
                  <button
                    onClick={() => setExpandedDay(isExpanded ? null : dayKey)}
                    className={`flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium transition-colors ${
                      isToday
                        ? "bg-[var(--crm-primary)] text-white"
                        : isExpanded
                        ? "bg-[var(--crm-primary)]/10 text-[var(--crm-primary)]"
                        : "text-[var(--crm-neutral-700)] dark:text-white/70 hover:bg-[var(--crm-neutral-100)] dark:hover:bg-white/10"
                    }`}
                  >
                    {day.getDate()}
                  </button>
                  {onNewActivity && (
                    <button
                      onClick={() => onNewActivity(day)}
                      className="opacity-0 group-hover:opacity-100 h-5 w-5 rounded flex items-center justify-center text-[var(--crm-neutral-400)] hover:text-[var(--crm-primary)] hover:bg-[var(--crm-primary)]/10 transition-all"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Activity pills */}
                <div className="space-y-0.5">
                  {dayActivities.slice(0, maxShow).map(a => {
                    const config = ACTIVITY_CONFIG[a.type];
                    const done = !!a.completedAt;
                    return (
                      <button
                        key={a.id}
                        onClick={() => onActivityClick?.(a)}
                        className={`w-full text-left rounded px-1.5 py-0.5 text-[10px] font-medium truncate transition-colors ${
                          done
                            ? "bg-[var(--crm-neutral-100)] dark:bg-white/5 text-[var(--crm-neutral-400)] line-through"
                            : `${config.bg} ${config.color}`
                        } hover:opacity-80`}
                        title={`${config.label}: ${a.subject}`}
                      >
                        {a.dueDate && <span className="mr-1">{formatTime(a.dueDate)}</span>}
                        {a.subject}
                      </button>
                    );
                  })}
                  {dayActivities.length > maxShow && (
                    <button
                      onClick={() => setExpandedDay(isExpanded ? null : dayKey)}
                      className="w-full text-center text-[10px] font-medium text-[var(--crm-primary)] hover:underline"
                    >
                      +{dayActivities.length - maxShow} altre
                    </button>
                  )}
                </div>

                {/* Activity count indicator for days with no space */}
                {dayActivities.length > 0 && dayActivities.length <= maxShow && (
                  <div className="absolute bottom-1 right-1.5 flex gap-0.5">
                    {hasOverdue && <span className="h-1.5 w-1.5 rounded-full bg-[var(--crm-danger)]" />}
                    {hasPending && !hasOverdue && <span className="h-1.5 w-1.5 rounded-full bg-[var(--crm-primary)]" />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Expanded day detail panel */}
      {expandedDate && expandedActivities.length > 0 && (
        <div className="rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[var(--crm-neutral-900)] dark:text-white">
              {expandedDate.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
            </h3>
            <span className="text-xs text-[var(--crm-neutral-500)]">
              {expandedActivities.length} attivit{expandedActivities.length === 1 ? "à" : "à"}
            </span>
          </div>
          <div className="space-y-2">
            {expandedActivities.map(a => {
              const done = !!a.completedAt;
              const overdue = !done && a.dueDate && new Date(a.dueDate) < today;
              return (
                <button
                  key={a.id}
                  onClick={() => onActivityClick?.(a)}
                  className={`w-full text-left flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 ${
                    done ? "opacity-50" : ""
                  }`}
                >
                  <ActivityTypeIcon type={a.type} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${done ? "line-through text-[var(--crm-neutral-400)]" : ""}`}>
                      {a.subject}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {a.dueDate && (
                        <span className={`flex items-center gap-1 text-xs ${overdue ? "text-[var(--crm-danger)]" : "text-[var(--crm-neutral-500)]"}`}>
                          <Clock className="h-3 w-3" />
                          {formatTime(a.dueDate)}
                          {a.duration ? ` · ${a.duration}min` : ""}
                        </span>
                      )}
                      {a.dealTitle && (
                        <span className="flex items-center gap-1 text-xs text-[var(--crm-neutral-500)]">
                          <Briefcase className="h-3 w-3" />{a.dealTitle}
                        </span>
                      )}
                      {a.contactName && (
                        <span className="flex items-center gap-1 text-xs text-[var(--crm-neutral-500)]">
                          <User className="h-3 w-3" />{a.contactName}
                        </span>
                      )}
                    </div>
                  </div>
                  {done && (
                    <span className="text-[10px] font-medium text-[var(--crm-success)] bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                      Completata
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 flex-wrap">
        {(Object.keys(ACTIVITY_CONFIG) as ActivityType[]).map(type => {
          const { label, color, Icon } = ACTIVITY_CONFIG[type];
          return (
            <span key={type} className="flex items-center gap-1.5 text-xs text-[var(--crm-neutral-500)]">
              <Icon className={`h-3 w-3 ${color}`} />
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
