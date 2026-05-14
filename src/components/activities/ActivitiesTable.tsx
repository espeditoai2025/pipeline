"use client";

import { useState, useMemo } from "react";
import { CheckCircle2, Circle, Pencil, Trash2, Plus, Clock, Briefcase, User, CalendarDays, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { completeActivity, deleteActivity } from "@/server/actions/activities";
import { syncActivityToGoogleCalendar, toGoogleCalendarUrl } from "@/server/actions/google-calendar";
import { ActivityForm } from "./ActivityForm";
import { ActivityTypeIcon, ACTIVITY_CONFIG } from "./ActivityTypeIcon";
import type { Activity, ActivityType } from "@/types/activities";

type Props = {
  initialActivities: Activity[];
  filterDay?: Date | null;
  gcalConnected?: boolean;
};

type Filter = {
  type: ActivityType | "";
  completed: "all" | "pending" | "done";
  search: string;
};

function isOverdue(a: Activity) {
  if (a.completedAt || !a.dueDate) return false;
  return new Date(a.dueDate) < new Date();
}

function isToday(dateStr: string | null) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

function isTomorrow(dateStr: string | null) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

function isThisWeek(dateStr: string | null) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + 7);
  return d > now && d <= endOfWeek;
}

function formatDueDate(dateStr: string | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isToday(dateStr)) return `Oggi ${d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`;
  if (isTomorrow(dateStr)) return `Domani ${d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`;
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" }) + " " + d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

type Group = { label: string; color: string; activities: Activity[] };

function groupActivities(activities: Activity[]): Group[] {
  const pending = activities.filter(a => !a.completedAt);
  const done = activities.filter(a => !!a.completedAt);

  const overdue = pending.filter(a => a.dueDate && isOverdue(a));
  const today = pending.filter(a => isToday(a.dueDate));
  const tomorrow = pending.filter(a => isTomorrow(a.dueDate));
  const thisWeek = pending.filter(a => a.dueDate && !isToday(a.dueDate) && !isTomorrow(a.dueDate) && isThisWeek(a.dueDate));
  const later = pending.filter(a => {
    if (!a.dueDate) return true;
    const d = new Date(a.dueDate);
    const now = new Date();
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + 7);
    return d > endOfWeek;
  });
  const noDue = pending.filter(a => !a.dueDate);

  const groups: Group[] = [];
  if (overdue.length) groups.push({ label: `In ritardo (${overdue.length})`, color: "text-[var(--crm-danger)]", activities: overdue });
  if (today.length) groups.push({ label: `Oggi (${today.length})`, color: "text-[var(--crm-primary)]", activities: today });
  if (tomorrow.length) groups.push({ label: "Domani", color: "text-[var(--crm-neutral-700)] dark:text-white/80", activities: tomorrow });
  if (thisWeek.length) groups.push({ label: "Questa settimana", color: "text-[var(--crm-neutral-700)] dark:text-white/80", activities: thisWeek });
  if (later.length) groups.push({ label: "Più avanti", color: "text-[var(--crm-neutral-500)]", activities: later });
  if (noDue.length) groups.push({ label: "Senza data", color: "text-[var(--crm-neutral-500)]", activities: noDue });
  if (done.length) groups.push({ label: `Completate (${done.length})`, color: "text-[var(--crm-success)]", activities: done });

  return groups;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function ActivitiesTable({ initialActivities, filterDay, gcalConnected }: Props) {
  const [activities, setActivities] = useState(initialActivities);
  const [filter, setFilter] = useState<Filter>({ type: "", completed: "all", search: "" });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = activities;
    if (filterDay) list = list.filter(a => a.dueDate && sameDay(new Date(a.dueDate), filterDay));
    if (filter.type) list = list.filter(a => a.type === filter.type);
    if (filter.completed === "pending") list = list.filter(a => !a.completedAt);
    if (filter.completed === "done") list = list.filter(a => !!a.completedAt);
    if (filter.search) list = list.filter(a => a.subject.toLowerCase().includes(filter.search.toLowerCase()));
    return list;
  }, [activities, filter, filterDay]);

  const groups = useMemo(() => groupActivities(filtered), [filtered]);

  async function handleComplete(id: string) {
    setCompleting(id);
    const res = await completeActivity(id);
    setCompleting(null);
    if (res.error) { toast.error(res.error); return; }
    setActivities(prev => prev.map(a => a.id === id ? { ...a, completedAt: new Date().toISOString() } : a));
    toast.success("Attività completata ✓");
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questa attività?")) return;
    const res = await deleteActivity(id);
    if (res.error) { toast.error(res.error); return; }
    setActivities(prev => prev.filter(a => a.id !== id));
    toast.success("Attività eliminata");
  }

  async function handleSyncGcal(activity: Activity) {
    setSyncing(activity.id);
    const res = await syncActivityToGoogleCalendar(activity);
    setSyncing(null);
    if (res.error) { toast.error(res.error); return; }
    toast.success("Aggiunto a Google Calendar");
  }

  return (
    <div className="space-y-4">
      {/* Filters + button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <input
            value={filter.search}
            onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
            placeholder="Cerca attività..."
            className="rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] w-44 dark:bg-white/5 dark:border-white/10"
          />
          <select
            value={filter.type}
            onChange={e => setFilter(f => ({ ...f, type: e.target.value as ActivityType | "" }))}
            className="rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] dark:bg-white/5 dark:border-white/10"
          >
            <option value="">Tutti i tipi</option>
            {(Object.keys(ACTIVITY_CONFIG) as ActivityType[]).map(t => (
              <option key={t} value={t}>{ACTIVITY_CONFIG[t].label}</option>
            ))}
          </select>
          <select
            value={filter.completed}
            onChange={e => setFilter(f => ({ ...f, completed: e.target.value as Filter["completed"] }))}
            className="rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] dark:bg-white/5 dark:border-white/10"
          >
            <option value="all">Tutte</option>
            <option value="pending">Da completare</option>
            <option value="done">Completate</option>
          </select>
          {filterDay && (
            <span className="flex items-center gap-1 rounded-lg bg-[var(--crm-primary)]/10 px-3 py-2 text-xs font-medium text-[var(--crm-primary)]">
              <CalendarDays className="h-3.5 w-3.5" />
              {filterDay.toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}
            </span>
          )}
        </div>
        <Button
          size="sm"
          className="bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white"
          onClick={() => { setEditing(null); setFormOpen(true); }}
        >
          <Plus className="h-4 w-4 mr-1.5" /> Nuova attività
        </Button>
      </div>

      {/* Grouped list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] px-4 py-12 text-center text-[var(--crm-neutral-400)] text-sm">
          Nessuna attività trovata
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(group => (
            <div key={group.label}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${group.color}`}>{group.label}</p>
              <div className="rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] divide-y divide-[var(--crm-neutral-100)] dark:divide-white/5">
                {group.activities.map(activity => {
                  const overdue = isOverdue(activity);
                  const done = !!activity.completedAt;
                  const isCompleting = completing === activity.id;
                  return (
                    <div key={activity.id} className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 ${done ? "opacity-50" : ""}`}>

                      {/* Big completion circle */}
                      <button
                        title={done ? "Già completata" : "Segna come completata"}
                        disabled={done || isCompleting}
                        onClick={() => !done && handleComplete(activity.id)}
                        className={`flex-shrink-0 transition-all ${done ? "cursor-default" : "hover:scale-110 cursor-pointer"}`}
                      >
                        {done ? (
                          <CheckCircle2 className="h-6 w-6 text-[var(--crm-success)]" />
                        ) : isCompleting ? (
                          <Circle className="h-6 w-6 text-[var(--crm-neutral-300)] animate-pulse" />
                        ) : (
                          <Circle className="h-6 w-6 text-[var(--crm-neutral-300)] hover:text-[var(--crm-success)] transition-colors" />
                        )}
                      </button>

                      <ActivityTypeIcon type={activity.type} />

                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm truncate ${done ? "line-through text-[var(--crm-neutral-400)]" : ""}`}>
                          {activity.subject}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {activity.dueDate && (
                            <span className={`flex items-center gap-1 text-xs ${overdue ? "text-[var(--crm-danger)] font-medium" : "text-[var(--crm-neutral-500)]"}`}>
                              <Clock className="h-3 w-3" />
                              {formatDueDate(activity.dueDate)}
                              {activity.duration && ` · ${activity.duration}min`}
                            </span>
                          )}
                          {activity.dealTitle && (
                            <span className="flex items-center gap-1 text-xs text-[var(--crm-neutral-500)]">
                              <Briefcase className="h-3 w-3" />{activity.dealTitle}
                            </span>
                          )}
                          {activity.contactName && (
                            <span className="flex items-center gap-1 text-xs text-[var(--crm-neutral-500)]">
                              <User className="h-3 w-3" />{activity.contactName}
                            </span>
                          )}
                        </div>
                        {activity.notes && (
                          <p className="mt-0.5 text-xs text-[var(--crm-neutral-400)] truncate">{activity.notes}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        {activity.dueDate && (
                          gcalConnected ? (
                            <button
                              title="Sincronizza con Google Calendar"
                              disabled={syncing === activity.id}
                              onClick={() => handleSyncGcal(activity)}
                              className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-[var(--crm-neutral-400)] hover:text-blue-600"
                            >
                              <CalendarDays className={`h-3.5 w-3.5 ${syncing === activity.id ? "animate-spin" : ""}`} />
                            </button>
                          ) : (
                            <a
                              href={toGoogleCalendarUrl(activity)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Apri in Google Calendar"
                              className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-[var(--crm-neutral-400)] hover:text-blue-600"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )
                        )}
                        <button
                          className="p-1.5 rounded hover:bg-[var(--crm-neutral-100)] dark:hover:bg-white/10 text-[var(--crm-neutral-400)]"
                          onClick={() => { setEditing(activity); setFormOpen(true); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-[var(--crm-neutral-400)] hover:text-[var(--crm-danger)]"
                          onClick={() => handleDelete(activity.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-[var(--crm-neutral-400)]">{filtered.length} attività</p>

      <ActivityForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        activity={editing}
        onSaved={saved => {
          setActivities(prev =>
            editing ? prev.map(a => a.id === saved.id ? saved : a) : [saved, ...prev]
          );
        }}
      />
    </div>
  );
}
