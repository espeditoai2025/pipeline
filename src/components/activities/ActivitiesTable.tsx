"use client";

import { useState, useMemo } from "react";
import { Check, Pencil, Trash2, Plus, Clock, Briefcase, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { completeActivity, deleteActivity } from "@/server/actions/activities";
import { ActivityForm } from "./ActivityForm";
import { ActivityTypeIcon, ACTIVITY_CONFIG } from "./ActivityTypeIcon";
import type { Activity, ActivityType } from "@/types/activities";

type Props = {
  initialActivities: Activity[];
};

type Filter = {
  type: ActivityType | "";
  completed: "all" | "pending" | "done";
  search: string;
};

function isOverdue(a: Activity): boolean {
  if (a.completedAt || !a.dueDate) return false;
  return new Date(a.dueDate) < new Date();
}

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isToday(dateStr)) return `Oggi ${d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`;
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" }) + " " + d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

export function ActivitiesTable({ initialActivities }: Props) {
  const [activities, setActivities] = useState(initialActivities);
  const [filter, setFilter] = useState<Filter>({ type: "", completed: "all", search: "" });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);

  const filtered = useMemo(() =>
    activities.filter((a) => {
      if (filter.type && a.type !== filter.type) return false;
      if (filter.completed === "pending" && a.completedAt) return false;
      if (filter.completed === "done" && !a.completedAt) return false;
      if (filter.search && !a.subject.toLowerCase().includes(filter.search.toLowerCase())) return false;
      return true;
    }),
    [activities, filter]
  );

  const todayCount = activities.filter((a) => !a.completedAt && isToday(a.dueDate)).length;
  const overdueCount = activities.filter(isOverdue).length;

  async function handleComplete(id: string) {
    const res = await completeActivity(id);
    if (res.error) { toast.error(res.error); return; }
    setActivities((prev) => prev.map((a) => a.id === id ? { ...a, completedAt: new Date().toISOString() } : a));
    toast.success("Attività completata");
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questa attività?")) return;
    const res = await deleteActivity(id);
    if (res.error) { toast.error(res.error); return; }
    setActivities((prev) => prev.filter((a) => a.id !== id));
    toast.success("Attività eliminata");
  }

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex gap-3 flex-wrap">
        {todayCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 px-3 py-2 text-sm">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-700 dark:text-blue-400">{todayCount} oggi</span>
          </div>
        )}
        {overdueCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 px-3 py-2 text-sm">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-medium text-red-700 dark:text-red-400">{overdueCount} in ritardo</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-3 flex-wrap">
          <input
            value={filter.search}
            onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
            placeholder="Cerca attività..."
            className="rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] w-52"
          />
          <select
            value={filter.type}
            onChange={(e) => setFilter((f) => ({ ...f, type: e.target.value as ActivityType | "" }))}
            className="rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)]"
          >
            <option value="">Tutti i tipi</option>
            {(Object.keys(ACTIVITY_CONFIG) as ActivityType[]).map((t) => (
              <option key={t} value={t}>{ACTIVITY_CONFIG[t].label}</option>
            ))}
          </select>
          <select
            value={filter.completed}
            onChange={(e) => setFilter((f) => ({ ...f, completed: e.target.value as Filter["completed"] }))}
            className="rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)]"
          >
            <option value="all">Tutte</option>
            <option value="pending">Da completare</option>
            <option value="done">Completate</option>
          </select>
        </div>
        <Button
          size="sm"
          className="bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white"
          onClick={() => { setEditing(null); setFormOpen(true); }}
        >
          <Plus className="h-4 w-4 mr-1.5" /> Nuova attività
        </Button>
      </div>

      {/* List */}
      <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] divide-y divide-[var(--crm-neutral-100)]">
        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-[var(--crm-neutral-400)] text-sm">
            Nessuna attività trovata
          </div>
        ) : (
          filtered.map((activity) => {
            const overdue = isOverdue(activity);
            const done = !!activity.completedAt;
            return (
              <div key={activity.id} className={`flex items-start gap-4 px-4 py-4 transition-colors hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 ${done ? "opacity-60" : ""}`}>
                <ActivityTypeIcon type={activity.type} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-medium text-sm truncate ${done ? "line-through text-[var(--crm-neutral-400)]" : ""}`}>
                      {activity.subject}
                    </p>
                    {overdue && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        In ritardo
                      </span>
                    )}
                    {done && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Completata
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mt-1 flex-wrap">
                    <span className={`flex items-center gap-1 text-xs ${overdue ? "text-red-600 font-medium" : "text-[var(--crm-neutral-500)]"}`}>
                      <Clock className="h-3 w-3" />
                      {formatDueDate(activity.dueDate)}
                      {activity.duration && ` · ${activity.duration}min`}
                    </span>
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
                    <p className="mt-1 text-xs text-[var(--crm-neutral-500)] truncate">{activity.notes}</p>
                  )}
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {!done && (
                    <button
                      title="Segna come completata"
                      className="p-1.5 rounded hover:bg-green-50 text-[var(--crm-neutral-500)] hover:text-[var(--crm-success)]"
                      onClick={() => handleComplete(activity.id)}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    className="p-1.5 rounded hover:bg-[var(--crm-neutral-100)] text-[var(--crm-neutral-500)]"
                    onClick={() => { setEditing(activity); setFormOpen(true); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="p-1.5 rounded hover:bg-red-50 text-[var(--crm-neutral-500)] hover:text-[var(--crm-danger)]"
                    onClick={() => handleDelete(activity.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <p className="text-xs text-[var(--crm-neutral-500)]">{filtered.length} attività</p>

      <ActivityForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        activity={editing}
        onSaved={(saved) => {
          setActivities((prev) =>
            editing ? prev.map((a) => a.id === saved.id ? saved : a) : [saved, ...prev]
          );
        }}
      />
    </div>
  );
}
