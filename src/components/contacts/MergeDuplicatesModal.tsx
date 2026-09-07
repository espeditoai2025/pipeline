"use client";

import { useState } from "react";
import { Loader2, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetBody, SheetTitle } from "@/components/ui/sheet";
import { mergeContacts } from "@/server/actions/contacts";
import type { Contact } from "@/types/contacts";
import type { MergeContactOverrides } from "@/lib/merge-contacts";

type DuplicateGroup = { key: string; contacts: Contact[] };

type Props = {
  open: boolean;
  onClose: () => void;
  duplicates: DuplicateGroup[];
  onMerged: () => void | Promise<void>;
};

type FieldChoice = "a" | "b";

const FIELDS = [
  { key: "firstName", label: "Nome" },
  { key: "lastName", label: "Cognome" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Telefono" },
  { key: "jobTitle", label: "Ruolo" },
  { key: "companyId", label: "Azienda" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

export function MergeDuplicatesModal({ open, onClose, duplicates, onMerged }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [groups, setGroups] = useState(duplicates);
  const [choices, setChoices] = useState<Partial<Record<FieldKey, FieldChoice>>>({});
  const [merging, setMerging] = useState(false);
  const [mergeNotice, setMergeNotice] = useState<string | null>(null);

  const group = groups[currentIdx];
  if (!group || group.contacts.length < 2) return null;

  const contactA = group.contacts[0]!;
  const contactB = group.contacts[1]!;

  function getFieldValue(contact: Contact, key: FieldKey): string {
    if (key === "companyId") return contact.company?.name ?? "—";
    const v = contact[key];
    return v ?? "—";
  }

  function selectChoice(field: FieldKey, choice: FieldChoice) {
    setChoices((prev) => ({ ...prev, [field]: choice }));
  }

  async function handleMerge() {
    if (merging) return;
    setMerging(true);
    setMergeNotice(null);
    const overrides: MergeContactOverrides = {};
    for (const f of FIELDS) {
      const choice = choices[f.key] ?? (contactA[f.key] ? "a" : "b");
      const chosen = choice === "a" ? contactA : contactB;
      if (f.key === "firstName") overrides.firstName = chosen.firstName;
      else overrides[f.key] = chosen[f.key] ?? null;
    }
    try {
      const res = await mergeContacts(contactA.id, contactB.id, overrides);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setMergeNotice("Contatti uniti. Storico e dati collegati conservati.");
      await Promise.resolve(onMerged()).catch(() =>
        toast.error("Unione completata. Aggiorna la pagina per ricaricare i contatti."),
      );
      setChoices({});
      if (group!.contacts.length > 2) {
        const merged: Contact = {
          ...contactA,
          ...overrides,
          firstName: overrides.firstName ?? contactA.firstName,
          lastName: overrides.lastName ?? null,
          email: overrides.email ?? null,
          phone: overrides.phone ?? null,
          jobTitle: overrides.jobTitle ?? null,
          companyId: overrides.companyId ?? null,
          company: overrides.companyId === contactA.companyId ? contactA.company : contactB.company,
        };
        setGroups((previous) =>
          previous.map((item, index) =>
            index === currentIdx
              ? { ...item, contacts: [merged, ...item.contacts.slice(2)] }
              : item,
          ),
        );
      } else if (currentIdx < groups.length - 1) setCurrentIdx((i) => i + 1);
      else {
        onClose();
        toast.success("Contatti uniti. Storico e dati collegati conservati.");
      }
    } catch {
      toast.error("Unione non riuscita. Riprova.");
    } finally {
      setMerging(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v && !merging) onClose();
      }}
    >
      <SheetContent className="sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>
            Unisci duplicati ({currentIdx + 1}/{duplicates.length})
          </SheetTitle>
        </SheetHeader>
        <SheetBody>
          <p className="mb-4 text-sm text-[var(--crm-neutral-500)]">
            Email condivisa:{" "}
            <span className="font-medium text-[var(--crm-neutral-700)]">{group.key}</span>. Scegli
            quale valore mantenere per ogni campo. {group.contacts.length} contatti nel gruppo.
          </p>

          <div className="space-y-3">
            {/* Header row */}
            <div className="grid grid-cols-[100px_1fr_1fr] gap-2 text-xs font-semibold tracking-wide text-[var(--crm-neutral-500)] uppercase">
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
            {FIELDS.map((f) => {
              const valA = getFieldValue(contactA, f.key);
              const valB = getFieldValue(contactB, f.key);
              const selected = choices[f.key] ?? (contactA[f.key] ? "a" : "b");

              return (
                <div key={f.key} className="grid grid-cols-[100px_1fr_1fr] gap-2">
                  <div className="py-2 text-xs font-medium text-[var(--crm-neutral-600)]">
                    {f.label}
                  </div>
                  <button
                    disabled={merging}
                    aria-label={`${f.label}: mantieni ${valA} dal contatto A`}
                    aria-pressed={selected === "a"}
                    onClick={() => selectChoice(f.key, "a")}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                      selected === "a"
                        ? "border-[var(--crm-primary)] bg-[var(--crm-primary)]/5 ring-1 ring-[var(--crm-primary)]"
                        : "border-[var(--crm-neutral-100)] hover:border-[var(--crm-neutral-300)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{valA}</span>
                      {selected === "a" && (
                        <Check className="h-3.5 w-3.5 flex-shrink-0 text-[var(--crm-primary)]" />
                      )}
                    </div>
                  </button>
                  <button
                    disabled={merging}
                    aria-label={`${f.label}: mantieni ${valB} dal contatto B`}
                    aria-pressed={selected === "b"}
                    onClick={() => selectChoice(f.key, "b")}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                      selected === "b"
                        ? "border-orange-500 bg-orange-50 ring-1 ring-orange-500"
                        : "border-[var(--crm-neutral-100)] hover:border-[var(--crm-neutral-300)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{valB}</span>
                      {selected === "b" && (
                        <Check className="h-3.5 w-3.5 flex-shrink-0 text-orange-500" />
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              <strong>Cosa succede:</strong> Il contatto B verrà unito al contatto A. Affari,
              attività, email, lead, note e tag vengono trasferiti. I campi personalizzati mancanti
              vengono recuperati; quelli in conflitto e i valori originali restano nella nota di
              storico. L&apos;unione è definitiva.
            </p>
          </div>

          {mergeNotice && (
            <p role="status" className="mt-4 text-sm text-green-700 dark:text-green-400">
              {mergeNotice}
            </p>
          )}
          <div className="mt-6 flex items-center justify-end gap-3">
            {duplicates.length > 1 && currentIdx < duplicates.length - 1 && (
              <button
                disabled={merging}
                onClick={() => {
                  setCurrentIdx((i) => i + 1);
                  setChoices({});
                  setMergeNotice(null);
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
              className="gap-1.5 bg-[var(--crm-primary)] text-white hover:bg-[var(--crm-primary-dark)]"
            >
              {merging ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              Unisci contatti
            </Button>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
