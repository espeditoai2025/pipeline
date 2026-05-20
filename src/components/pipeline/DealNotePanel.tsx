"use client";

import { useState } from "react";
import { StickyNote, Plus, Loader2, Pencil, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createDealNote, updateNote, deleteNote } from "@/server/actions/deals";

type Note = { id: string; content: string; authorId: string; createdAt: string };

type Props = {
  dealId: string;
  initialNotes: Note[];
};

export function DealNotePanel({ dealId, initialNotes }: Props) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd() {
    if (!content.trim()) { toast.error("Scrivi qualcosa prima di salvare"); return; }
    setSaving(true);
    const res = await createDealNote(dealId, content.trim());
    setSaving(false);
    if (res.error) { toast.error(res.error); return; }
    setNotes((prev) => [
      { id: `tmp-${Date.now()}`, content: content.trim(), authorId: "", createdAt: new Date().toISOString() },
      ...prev,
    ]);
    setContent("");
    setShowForm(false);
    toast.success("Nota salvata");
  }

  async function handleUpdate(noteId: string) {
    if (!editContent.trim()) { toast.error("Il contenuto non può essere vuoto"); return; }
    setSaving(true);
    const res = await updateNote(noteId, editContent.trim());
    setSaving(false);
    if (res.error) { toast.error(res.error); return; }
    setNotes((prev) => prev.map((n) => n.id === noteId ? { ...n, content: editContent.trim() } : n));
    setEditingId(null);
    toast.success("Nota aggiornata");
  }

  async function handleDelete(noteId: string) {
    setDeletingId(noteId);
    const res = await deleteNote(noteId);
    setDeletingId(null);
    if (res.error) { toast.error(res.error); return; }
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    toast.success("Nota eliminata");
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
            <Button size="sm" onClick={handleAdd} disabled={saving} className="bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white">
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
              className="group rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 px-4 py-3"
            >
              {editingId === note.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    autoFocus
                    className="w-full rounded-lg border border-[var(--crm-neutral-200)] bg-white dark:bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleUpdate(note.id)} disabled={saving} className="inline-flex items-center gap-1 rounded-md bg-[var(--crm-primary)] px-2.5 py-1 text-xs font-medium text-white hover:bg-[var(--crm-primary-dark)]">
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Salva
                    </button>
                    <button onClick={() => setEditingId(null)} className="inline-flex items-center gap-1 rounded-md border border-[var(--crm-neutral-200)] px-2.5 py-1 text-xs hover:bg-[var(--crm-neutral-50)]">
                      <X className="h-3 w-3" /> Annulla
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm whitespace-pre-wrap text-[var(--crm-neutral-800)] dark:text-white/90 flex-1">
                      {note.content}
                    </p>
                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingId(note.id); setEditContent(note.content); }}
                        className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-800/30 text-[var(--crm-neutral-400)] hover:text-[var(--crm-neutral-700)]"
                        title="Modifica"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        disabled={deletingId === note.id}
                        className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-[var(--crm-neutral-400)] hover:text-red-600"
                        title="Elimina"
                      >
                        {deletingId === note.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--crm-neutral-400)] mt-1.5">
                    {new Date(note.createdAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
