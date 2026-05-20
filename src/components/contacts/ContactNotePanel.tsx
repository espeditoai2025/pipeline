"use client";

import { useState } from "react";
import { StickyNote, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createContactNote } from "@/server/actions/contacts";

type Note = { id: string; content: string; authorId: string; createdAt: string };

type Props = {
  contactId: string;
  initialNotes: Note[];
};

export function ContactNotePanel({ contactId, initialNotes }: Props) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!content.trim()) { toast.error("Scrivi qualcosa prima di salvare"); return; }
    setSaving(true);
    const res = await createContactNote(contactId, content.trim());
    setSaving(false);
    if (res.error) { toast.error(res.error); return; }
    // Optimistic: add a temp note
    setNotes((prev) => [
      { id: `tmp-${Date.now()}`, content: content.trim(), authorId: "", createdAt: new Date().toISOString() },
      ...prev,
    ]);
    setContent("");
    setShowForm(false);
    toast.success("Nota salvata");
  }

  return (
    <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--crm-neutral-700)] flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-[var(--crm-primary)]" />
          Note ({notes.length})
        </h2>
        {!showForm && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> Aggiungi
          </Button>
        )}
      </div>

      {showForm && (
        <div className="space-y-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder="Scrivi una nota..."
            autoFocus
            className="w-full rounded-lg border border-[var(--crm-neutral-200)] bg-white dark:bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] resize-none transition-colors"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={saving}
              className="bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Salva
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setContent(""); }}>
              Annulla
            </Button>
          </div>
        </div>
      )}

      {notes.length === 0 && !showForm ? (
        <p className="text-sm text-[var(--crm-neutral-400)] text-center py-4">
          Nessuna nota. Aggiungine una!
        </p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 px-4 py-3"
            >
              <p className="text-sm whitespace-pre-wrap text-[var(--crm-neutral-800)] dark:text-white/90">
                {note.content}
              </p>
              <p className="text-xs text-[var(--crm-neutral-400)] mt-1.5">
                {new Date(note.createdAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
