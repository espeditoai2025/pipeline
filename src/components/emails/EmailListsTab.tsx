"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Users, ChevronRight, Upload, X, UserPlus, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  getEmailListDetail, createEmailList, updateEmailList, deleteEmailList,
  addContactToList, removeContactFromList, importContactsToList,
} from "@/server/actions/campaigns";
import type { EmailList, EmailListDetail, EmailListContact } from "@/types/emails";

const inputCls = "w-full rounded-lg border border-[var(--crm-neutral-200)] bg-white dark:bg-white/5 px-3 py-2.5 text-sm text-[var(--crm-neutral-900)] dark:text-white placeholder:text-[var(--crm-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] focus:border-transparent transition-colors";

type Props = { lists: EmailList[]; onChange: (lists: EmailList[]) => void };

type View = { type: "list" } | { type: "detail"; listId: string };

export function EmailListsTab({ lists, onChange }: Props) {
  const [view, setView] = useState<View>({ type: "list" });
  const [detail, setDetail] = useState<EmailListDetail | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addFirst, setAddFirst] = useState("");
  const [addLast, setAddLast] = useState("");
  const [showAddContact, setShowAddContact] = useState(false);
  const [, startTransition] = useTransition();

  function openDetail(id: string) {
    startTransition(async () => {
      const res = await getEmailListDetail(id);
      if (res.error) { toast.error(res.error); return; }
      setDetail(res.data!);
      setView({ type: "detail", listId: id });
    });
  }

  function handleCreate() {
    if (!newName.trim()) return;
    startTransition(async () => {
      const res = await createEmailList({ name: newName.trim(), description: newDesc.trim() || undefined });
      if (res.error) { toast.error(res.error); return; }
      onChange([res.data!, ...lists]);
      setShowCreate(false);
      setNewName(""); setNewDesc("");
      toast.success("Lista creata");
    });
  }

  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      const res = await deleteEmailList(id);
      if (res.error) { toast.error(res.error); return; }
      onChange(lists.filter((l) => l.id !== id));
      if (view.type === "detail" && view.listId === id) setView({ type: "list" });
      toast.success("Lista eliminata");
    });
  }

  function handleAddContact() {
    if (!detail || !addEmail.trim()) return;
    startTransition(async () => {
      const res = await addContactToList(detail.id, {
        email: addEmail.trim(),
        firstName: addFirst.trim() || undefined,
        lastName: addLast.trim() || undefined,
      });
      if (res.error) { toast.error(res.error); return; }
      const updated: EmailListDetail = {
        ...detail,
        contacts: [res.data!, ...detail.contacts],
        contactCount: detail.contactCount + 1,
      };
      setDetail(updated);
      onChange(lists.map((l) => l.id === detail.id ? { ...l, contactCount: l.contactCount + 1 } : l));
      setAddEmail(""); setAddFirst(""); setAddLast("");
      setShowAddContact(false);
      toast.success("Contatto aggiunto");
    });
  }

  function handleRemoveContact(contact: EmailListContact) {
    if (!detail) return;
    startTransition(async () => {
      const res = await removeContactFromList(contact.id);
      if (res.error) { toast.error(res.error); return; }
      const updated: EmailListDetail = {
        ...detail,
        contacts: detail.contacts.filter((c) => c.id !== contact.id),
        contactCount: detail.contactCount - 1,
      };
      setDetail(updated);
      onChange(lists.map((l) => l.id === detail.id ? { ...l, contactCount: l.contactCount - 1 } : l));
    });
  }

  function handleImportCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !detail) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(Boolean);
      const rows = lines.map((line) => {
        const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        return { email: cols[0] ?? "", firstName: cols[1], lastName: cols[2] };
      }).filter((r) => r.email);

      startTransition(async () => {
        const res = await importContactsToList(detail.id, rows);
        if (res.error) { toast.error(res.error); return; }
        const { added, skipped } = res.data!;
        toast.success(`Importati ${added} contatti${skipped > 0 ? `, ${skipped} ignorati` : ""}`);
        const refreshed = await getEmailListDetail(detail.id);
        if (refreshed.data) {
          setDetail(refreshed.data);
          onChange(lists.map((l) => l.id === detail.id ? { ...l, contactCount: refreshed.data!.contactCount } : l));
        }
      });
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  if (view.type === "detail" && detail) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView({ type: "list" })}
            className="flex items-center gap-1.5 text-sm text-[var(--crm-neutral-500)] hover:text-[var(--crm-neutral-900)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Liste
          </button>
          <span className="text-[var(--crm-neutral-300)]">/</span>
          <span className="text-sm font-medium">{detail.name}</span>
          <span className="ml-auto text-xs text-[var(--crm-neutral-400)]">{detail.contactCount} contatti</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white"
            onClick={() => setShowAddContact((v) => !v)}
          >
            <UserPlus className="h-4 w-4 mr-1.5" /> Aggiungi contatto
          </Button>
          <label className="cursor-pointer">
            <input type="file" accept=".csv" className="sr-only" onChange={handleImportCSV} />
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--crm-neutral-200)] px-3 py-1.5 text-sm font-medium text-[var(--crm-neutral-700)] hover:bg-[var(--crm-neutral-50)] transition-colors cursor-pointer">
              <Upload className="h-4 w-4" /> Importa CSV
            </span>
          </label>
        </div>

        {showAddContact && (
          <div className="rounded-xl border border-[var(--crm-neutral-100)] p-4 space-y-3">
            <p className="text-xs font-medium text-[var(--crm-neutral-500)] uppercase tracking-wide">Nuovo contatto</p>
            <div className="grid grid-cols-2 gap-3">
              <input value={addFirst} onChange={(e) => setAddFirst(e.target.value)} placeholder="Nome" className={inputCls} />
              <input value={addLast} onChange={(e) => setAddLast(e.target.value)} placeholder="Cognome" className={inputCls} />
            </div>
            <input value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="email@esempio.it *" type="email" className={inputCls} />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowAddContact(false)}>Annulla</Button>
              <Button size="sm" className="bg-[var(--crm-primary)] text-white" onClick={handleAddContact} disabled={!addEmail.trim()}>Aggiungi</Button>
            </div>
          </div>
        )}

        <p className="text-xs text-[var(--crm-neutral-400)]">CSV formato: email, nome, cognome (una riga per contatto, senza intestazione)</p>

        {detail.contacts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--crm-neutral-200)] p-10 text-center">
            <Users className="h-8 w-8 text-[var(--crm-neutral-300)] mx-auto mb-2" />
            <p className="text-sm text-[var(--crm-neutral-500)]">Nessun contatto. Aggiungine uno o importa un CSV.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--crm-neutral-100)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--crm-neutral-100)] bg-[var(--crm-neutral-50)] dark:bg-white/5">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--crm-neutral-500)]">Email</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--crm-neutral-500)]">Nome</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--crm-neutral-500)]">Stato</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--crm-neutral-100)]">
                {detail.contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs">{c.email}</td>
                    <td className="px-4 py-2.5 text-[var(--crm-neutral-600)]">
                      {[c.firstName, c.lastName].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {c.unsubscribed
                        ? <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs">Disiscritto</span>
                        : <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs">Attivo</span>
                      }
                    </td>
                    <td className="px-2">
                      <button
                        onClick={() => handleRemoveContact(c)}
                        className="p-1 rounded text-[var(--crm-neutral-400)] hover:text-[var(--crm-danger)] hover:bg-red-50 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--crm-neutral-500)]">{lists.length} liste</p>
        <Button
          size="sm"
          className="bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white"
          onClick={() => setShowCreate((v) => !v)}
        >
          <Plus className="h-4 w-4 mr-1.5" /> Nuova lista
        </Button>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-[var(--crm-primary)]/30 bg-[var(--crm-primary)]/5 p-4 space-y-3">
          <p className="text-sm font-medium">Nuova lista email</p>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome lista *" className={inputCls} />
          <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Descrizione (opzionale)" className={inputCls} />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { setShowCreate(false); setNewName(""); setNewDesc(""); }}>Annulla</Button>
            <Button size="sm" className="bg-[var(--crm-primary)] text-white" onClick={handleCreate} disabled={!newName.trim()}>Crea</Button>
          </div>
        </div>
      )}

      {lists.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--crm-neutral-200)] p-12 text-center">
          <Users className="h-10 w-10 text-[var(--crm-neutral-300)] mx-auto mb-3" />
          <p className="text-sm font-medium text-[var(--crm-neutral-600)]">Nessuna lista</p>
          <p className="text-xs text-[var(--crm-neutral-400)] mt-1">Crea la tua prima lista email per le campagne</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--crm-neutral-100)] overflow-hidden divide-y divide-[var(--crm-neutral-100)]">
          {lists.map((list) => (
            <div
              key={list.id}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 cursor-pointer transition-colors group"
              onClick={() => openDetail(list.id)}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--crm-primary)]/10 flex-shrink-0">
                <Users className="h-4 w-4 text-[var(--crm-primary)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{list.name}</p>
                {list.description && <p className="text-xs text-[var(--crm-neutral-500)] truncate">{list.description}</p>}
              </div>
              <span className="text-xs text-[var(--crm-neutral-400)] flex-shrink-0">{list.contactCount} contatti</span>
              <button
                onClick={(e) => handleDelete(list.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[var(--crm-neutral-400)] hover:text-[var(--crm-danger)] hover:bg-red-50 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <ChevronRight className="h-4 w-4 text-[var(--crm-neutral-300)]" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
