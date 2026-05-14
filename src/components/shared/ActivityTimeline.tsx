"use client";

import { useState } from "react";
import { Phone, Users, Mail, CheckSquare, Clock, UtensilsCrossed, Plus, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createActivity, completeActivity } from "@/server/actions/activities";
import { useRouter } from "next/navigation";

type ActivityItem = {
  id: string;
  type: string;
  subject: string;
  notes: string | null;
  dueDate: string | null;
  completedAt: string | null;
  duration: number | null;
  user: { id: string; name: string | null; email: string };
  createdAt: string;
};

type Props = {
  activities: ActivityItem[];
  entityId: string;
  entityType: "contact" | "deal";
};

const TYPE_ICON: Record<string, React.ElementType> = {
  CALL: Phone,
  MEETING: Users,
  EMAIL: Mail,
  TASK: CheckSquare,
  DEADLINE: Clock,
  LUNCH: UtensilsCrossed,
};

const TYPE_LABEL: Record<string, string> = {
  CALL: "Chiamata",
  MEETING: "Riunione",
  EMAIL: "Email",
  TASK: "Task",
  DEADLINE: "Scadenza",
  LUNCH: "Pranzo",
};

const TYPE_COLOR: Record<string, string> = {
  CALL: "bg-blue-100 text-blue-600",
  MEETING: "bg-purple-100 text-purple-600",
  EMAIL: "bg-sky-100 text-sky-600",
  TASK: "bg-amber-100 text-amber-600",
  DEADLINE: "bg-rose-100 text-rose-600",
  LUNCH: "bg-green-100 text-green-600",
};

const inputCls =
  "w-full rounded-lg border border-[var(--crm-neutral-200)] bg-white dark:bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] transition-colors";

type ActivityType = "CALL" | "MEETING" | "EMAIL" | "TASK" | "DEADLINE" | "LUNCH";

export function ActivityTimeline({ activities: initial, entityId, entityType }: Props) {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityItem[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<ActivityType>("CALL");
  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  async function handleAdd() {
    if (!subject.trim()) { toast.error("Inserisci un oggetto"); return; }
    setSaving(true);
    const res = await createActivity({
      type,
      subject: subject.trim(),
      notes: notes.trim() || undefined,
      dueDate: dueDate || undefined,
      ...(entityType === "contact" ? { contactId: entityId } : { dealId: entityId }),
    });
    setSaving(false);
    if (res.error) { toast.error(res.error); return; }
    setActivities((prev) => [res.data!, ...prev]);
    setSubject(""); setNotes(""); setDueDate(""); setType("CALL");
    setShowForm(false);
    toast.success("Attività aggiunta");
    router.refresh();
  }

  async function handleComplete(id: string) {
    setCompletingId(id);
    const res = await completeActivity(id);
    setCompletingId(null);
    if (res.error) { toast.error(res.error); return; }
    setActivities((prev) =>
      prev.map((a) => a.id === id ? { ...a, completedAt: new Date().toISOString() } : a)
    );
    toast.success("Attività completata");
  }

  return (
    <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--crm-neutral-700)]">
          Attività ({activities.length})
        </h2>
        {!showForm && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> Aggiungi
          </Button>
        )}
      </div>

      {/* New activity form */}
      {showForm && (
        <div className="rounded-lg border border-[var(--crm-primary)]/30 bg-[var(--crm-primary)]/5 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Tipo</label>
              <select value={type} onChange={(e) => setType(e.target.value as ActivityType)} className={inputCls}>
                {(Object.entries(TYPE_LABEL) as [ActivityType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Data / ora</label>
              <input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Oggetto *</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="es. Chiamata di follow-up"
              className={inputCls}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Note</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Dettagli opzionali..."
              className={`${inputCls} resize-none`}
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleAdd}
              disabled={saving}
              size="sm"
              className="bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Salva
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
              Annulla
            </Button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {activities.length === 0 ? (
        <p className="text-sm text-[var(--crm-neutral-400)] text-center py-6">
          Nessuna attività ancora. Aggiungine una!
        </p>
      ) : (
        <div className="space-y-1">
          {activities.map((a, i) => {
            const Icon = TYPE_ICON[a.type] ?? CheckSquare;
            const colorCls = TYPE_COLOR[a.type] ?? "bg-gray-100 text-gray-500";
            const isDone = !!a.completedAt;
            const isLast = i === activities.length - 1;

            return (
              <div key={a.id} className="flex gap-3">
                {/* Dot + line */}
                <div className="flex flex-col items-center">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorCls} ${isDone ? "opacity-50" : ""}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {!isLast && <div className="w-px flex-1 bg-[var(--crm-neutral-100)] my-1" />}
                </div>

                {/* Content */}
                <div className={`flex-1 min-w-0 pb-4 ${isLast ? "" : ""}`}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isDone ? "line-through text-[var(--crm-neutral-400)]" : ""}`}>
                        {a.subject}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 mt-0.5 text-xs text-[var(--crm-neutral-400)]">
                        <span>{TYPE_LABEL[a.type] ?? a.type}</span>
                        {a.dueDate && (
                          <>
                            <span>·</span>
                            <span>{new Date(a.dueDate).toLocaleString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                          </>
                        )}
                        {a.user.name && (
                          <>
                            <span>·</span>
                            <span>{a.user.name}</span>
                          </>
                        )}
                        {isDone && (
                          <>
                            <span>·</span>
                            <span className="text-emerald-500">Completata</span>
                          </>
                        )}
                      </div>
                      {a.notes && (
                        <p className="mt-1 text-xs text-[var(--crm-neutral-500)] leading-relaxed">{a.notes}</p>
                      )}
                    </div>

                    {!isDone && (
                      <button
                        onClick={() => handleComplete(a.id)}
                        disabled={completingId === a.id}
                        className="shrink-0 text-[var(--crm-neutral-300)] hover:text-emerald-500 transition-colors mt-0.5"
                        title="Segna come completata"
                      >
                        {completingId === a.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Circle className="h-4 w-4" />
                        }
                      </button>
                    )}
                    {isDone && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
