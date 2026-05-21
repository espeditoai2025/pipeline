"use client";

import { useState } from "react";
import { Loader2, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetBody, SheetTitle } from "@/components/ui/sheet";
import { mergeContacts } from "@/server/actions/contacts";
import type { Contact } from "@/types/contacts";

type DuplicateGroup = { key: string; contacts: Contact[] };

type Props = {
  open: boolean;
  onClose: () => void;
  duplicates: DuplicateGroup[];
  onMerged: () => void;
};

type FieldChoice = "a" | "b";

const FIELDS = [
  { key: "firstName", label: "Nome" },
  { key: "lastName", label: "Cognome" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Telefono" },
  { key: "jobTitle", label: "Ruolo" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

export function MergeDuplicatesModal({ open, onClose, duplicates, onMerged }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [choices, setChoices] = useState<Record<FieldKey, FieldChoice>>({
    firstName: "a", lastName: "a", email: "a", phone: "a", jobTitle: "a",
  });
  const [merging, setMerging] = useState(false);

  const group = duplicates[currentIdx];
  if (!group || group.contacts.length < 2) return null;

  const contactA = group.contacts[0]!;
  const contactB = group.contacts[1]!;

  function getFieldValue(contact: Contact, key: FieldKey): string {
    const v = contact[key];
    return v ?? "—";
  }

  function selectChoice(field: FieldKey, choice: FieldChoice) {
    setChoices(prev => ({ ...prev, [field]: choice }));
  }

  async function handleMerge() {
    setMerging(true);

    const overrides: Record<string, string | null | undefined> = {};
    for (const f of FIELDS) {
      const chosen = choices[f.key] === "a" ? contactA : contactB;
      overrides[f.key] = chosen[f.key] ?? null;
    }

    const res = await mergeContacts(contactA.id, contactB.id, overrides);
    setMerging(false);

    if (res.error) {
      toast.error(res.error);
      return;
    }

    toast.success(`Contatti uniti: ${contactA.firstName} ${contactA.lastName ?? ""}`);

    if (currentIdx < duplicates.length - 1) {
      setCurrentIdx(i => i + 1);
      setChoices({ firstName: "a", lastName: "a", email: "a", phone: "a", jobTitle: "a" });
    } else {
      onMerged();
      onClose();
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Unisci duplicati ({currentIdx + 1}/{duplicates.length})</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <p className="text-sm text-[var(--crm-neutral-500)] mb-4">
            Email condivisa: <span className="font-medium text-[var(--crm-neutral-700)]">{group.key}</span>.
            Scegli quale valore mantenere per ogni campo.
          </p>

          <div className="space-y-3">
            {/* Header row */}
            <div className="grid grid-cols-[100px_1fr_1fr] gap-2 text-xs font-semibold text-[var(--crm-neutral-500)] uppercase tracking-wide">
              <div>Campo</div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-[var(--crm-primary)]" />
                {contactA.firstName} {contactA.lastName ?? ""}
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-orange-500" />
                {contactB.firstName} {contactB.lastName ?? ""}
              </div>
            </div>

            {/* Field rows */}
            {FIELDS.map(f => {
              const valA = getFieldValue(contactA, f.key);
              const valB = getFieldValue(contactB, f.key);
              const selected = choices[f.key];

              return (
                <div key={f.key} className="grid grid-cols-[100px_1fr_1fr] gap-2">
                  <div className="text-xs font-medium text-[var(--crm-neutral-600)] py-2">{f.label}</div>
                  <button
                    onClick={() => selectChoice(f.key, "a")}
                    className={`rounded-lg border px-3 py-2 text-sm text-left transition-all ${
                      selected === "a"
                        ? "border-[var(--crm-primary)] bg-[var(--crm-primary)]/5 ring-1 ring-[var(--crm-primary)]"
                        : "border-[var(--crm-neutral-100)] hover:border-[var(--crm-neutral-300)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{valA}</span>
                      {selected === "a" && <Check className="h-3.5 w-3.5 text-[var(--crm-primary)] flex-shrink-0" />}
                    </div>
                  </button>
                  <button
                    onClick={() => selectChoice(f.key, "b")}
                    className={`rounded-lg border px-3 py-2 text-sm text-left transition-all ${
                      selected === "b"
                        ? "border-orange-500 bg-orange-50 ring-1 ring-orange-500"
                        : "border-[var(--crm-neutral-100)] hover:border-[var(--crm-neutral-300)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{valB}</span>
                      {selected === "b" && <Check className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              <strong>Cosa succede:</strong> Il contatto B verrà eliminato. Tutti i suoi affari, attività, email e note verranno trasferiti al contatto A con i valori scelti sopra.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6">
            {duplicates.length > 1 && currentIdx < duplicates.length - 1 && (
              <button
                onClick={() => {
                  setCurrentIdx(i => i + 1);
                  setChoices({ firstName: "a", lastName: "a", email: "a", phone: "a", jobTitle: "a" });
                }}
                className="text-xs text-[var(--crm-neutral-500)] hover:underline"
              >
                Salta questo →
              </button>
            )}
            <Button variant="outline" onClick={onClose} disabled={merging}>
              Annulla
            </Button>
            <Button
              onClick={handleMerge}
              disabled={merging}
              className="bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white gap-1.5"
            >
              {merging ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Unisci contatti
            </Button>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
