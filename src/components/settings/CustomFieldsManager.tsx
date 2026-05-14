"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  getCustomFields,
  createCustomField,
  deleteCustomField,
} from "@/server/actions/custom-fields";
import type { CustomField, EntityType, FieldType } from "@/types/custom-fields";

const ENTITY_LABELS: Record<EntityType, string> = {
  deal: "Affari",
  contact: "Contatti",
  company: "Aziende",
};

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Testo",
  number: "Numero",
  date: "Data",
  boolean: "Sì / No",
  select: "Scelta multipla",
};

const inputCls =
  "w-full rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] bg-transparent";

type NewField = {
  name: string;
  fieldType: FieldType;
  isRequired: boolean;
  optionsRaw: string;
};

const defaultNew = (): NewField => ({
  name: "",
  fieldType: "text",
  isRequired: false,
  optionsRaw: "",
});

export function CustomFieldsManager() {
  const [activeEntity, setActiveEntity] = useState<EntityType>("deal");
  const [fields, setFields] = useState<Record<EntityType, CustomField[]>>({
    deal: [],
    contact: [],
    company: [],
  });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newField, setNewField] = useState<NewField>(defaultNew());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getCustomFields("deal"),
      getCustomFields("contact"),
      getCustomFields("company"),
    ])
      .then(([deals, contacts, companies]) => {
        setFields({ deal: deals, contact: contacts, company: companies });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!newField.name.trim()) { toast.error("Inserisci un nome per il campo"); return; }
    if (newField.fieldType === "select" && !newField.optionsRaw.trim()) {
      toast.error("Inserisci almeno un'opzione (separate da virgola)"); return;
    }

    setSaving(true);
    const options = newField.fieldType === "select"
      ? newField.optionsRaw.split(",").map((o) => o.trim()).filter(Boolean)
      : undefined;

    const res = await createCustomField({
      entityType: activeEntity,
      name: newField.name,
      fieldType: newField.fieldType,
      options,
      isRequired: newField.isRequired,
    });
    setSaving(false);

    if (res.error) { toast.error(res.error); return; }
    setFields((prev) => ({ ...prev, [activeEntity]: [...prev[activeEntity], res.field!] }));
    setNewField(defaultNew());
    setShowForm(false);
    toast.success("Campo creato");
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const res = await deleteCustomField(id);
    setDeletingId(null);
    if (res.error) { toast.error(res.error); return; }
    setFields((prev) => ({
      ...prev,
      [activeEntity]: prev[activeEntity].filter((f) => f.id !== id),
    }));
    toast.success("Campo eliminato");
  }

  const currentFields = fields[activeEntity];

  return (
    <div className="space-y-4">
      {/* Entity tabs */}
      <div className="flex gap-1 rounded-lg border border-[var(--crm-neutral-100)] p-1 w-fit">
        {(Object.keys(ENTITY_LABELS) as EntityType[]).map((e) => (
          <button
            key={e}
            onClick={() => { setActiveEntity(e); setShowForm(false); setNewField(defaultNew()); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeEntity === e ? "bg-[var(--crm-primary)] text-white" : "text-[var(--crm-neutral-600)] hover:bg-[var(--crm-neutral-100)]"}`}
          >
            {ENTITY_LABELS[e]}
          </button>
        ))}
      </div>

      {/* Fields list */}
      <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] divide-y divide-[var(--crm-neutral-100)]">
        {loading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-[var(--crm-neutral-400)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Caricamento...
          </div>
        ) : currentFields.length === 0 ? (
          <div className="p-6 text-center text-sm text-[var(--crm-neutral-400)]">
            Nessun campo personalizzato per {ENTITY_LABELS[activeEntity].toLowerCase()}.
          </div>
        ) : (
          currentFields.map((f) => (
            <div key={f.id}>
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{f.name}</p>
                    {f.isRequired && (
                      <span className="text-xs bg-red-50 text-red-600 border border-red-100 rounded-full px-1.5 py-0.5">
                        Obbligatorio
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--crm-neutral-400)]">{FIELD_TYPE_LABELS[f.fieldType]}</p>
                </div>
                <div className="flex items-center gap-1">
                  {f.fieldType === "select" && f.options && f.options.length > 0 && (
                    <button
                      onClick={() => setExpandedId(expandedId === f.id ? null : f.id)}
                      className="text-[var(--crm-neutral-400)] hover:text-[var(--crm-neutral-600)] p-1"
                    >
                      {expandedId === f.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(f.id)}
                    disabled={deletingId === f.id}
                    className="text-[var(--crm-neutral-400)] hover:text-[var(--crm-danger)] transition-colors p-1"
                  >
                    {deletingId === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              {expandedId === f.id && f.options && (
                <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                  {f.options.map((opt) => (
                    <span key={opt} className="text-xs bg-[var(--crm-neutral-100)] text-[var(--crm-neutral-600)] rounded-full px-2 py-0.5">
                      {opt}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create form */}
      {showForm ? (
        <div className="rounded-xl border border-[var(--crm-primary)]/30 bg-[var(--crm-primary)]/5 p-4 space-y-3">
          <p className="text-sm font-semibold">Nuovo campo — {ENTITY_LABELS[activeEntity]}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Nome campo *</label>
              <input
                value={newField.name}
                onChange={(e) => setNewField((f) => ({ ...f, name: e.target.value }))}
                placeholder="es. Budget, Settore..."
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Tipo</label>
              <select
                value={newField.fieldType}
                onChange={(e) => setNewField((f) => ({ ...f, fieldType: e.target.value as FieldType }))}
                className={inputCls}
              >
                {(Object.entries(FIELD_TYPE_LABELS) as [FieldType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {newField.fieldType === "select" && (
            <div>
              <label className="block text-xs font-medium mb-1">Opzioni (separate da virgola) *</label>
              <input
                value={newField.optionsRaw}
                onChange={(e) => setNewField((f) => ({ ...f, optionsRaw: e.target.value }))}
                placeholder="es. Piccola, Media, Grande"
                className={inputCls}
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setNewField((f) => ({ ...f, isRequired: !f.isRequired }))}
              className={`relative h-5 w-9 rounded-full transition-colors ${newField.isRequired ? "bg-[var(--crm-primary)]" : "bg-[var(--crm-neutral-200)]"}`}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${newField.isRequired ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
            <span className="text-sm">Campo obbligatorio</span>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleCreate}
              disabled={saving}
              className="bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Crea campo
            </Button>
            <Button
              variant="outline"
              onClick={() => { setShowForm(false); setNewField(defaultNew()); }}
            >
              Annulla
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setShowForm(true)}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" /> Aggiungi campo
        </Button>
      )}
    </div>
  );
}
