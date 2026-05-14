"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  getCustomBillingTypes,
  saveCustomBillingTypes,
  PREDEFINED_BILLING_TYPES,
  type CustomBillingType,
} from "@/server/actions/billing-types";

const inputCls = "w-full rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] bg-transparent";

export function BillingTypesManager() {
  const [customTypes, setCustomTypes] = useState<CustomBillingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPeriod, setNewPeriod] = useState("");

  useEffect(() => {
    getCustomBillingTypes().then((types) => {
      setCustomTypes(types);
      setLoading(false);
    });
  }, []);

  async function handleAdd() {
    const name = newName.trim();
    if (!name) { toast.error("Inserisci un nome"); return; }

    const newType: CustomBillingType = {
      id: `custom_${Date.now()}`,
      name,
      period: newPeriod.trim() || undefined,
    };
    const updated = [...customTypes, newType];
    setSaving(true);
    const res = await saveCustomBillingTypes(updated);
    setSaving(false);
    if (res.error) { toast.error(res.error); return; }
    setCustomTypes(updated);
    setNewName("");
    setNewPeriod("");
    toast.success("Tipo aggiunto");
  }

  async function handleDelete(id: string) {
    const updated = customTypes.filter((t) => t.id !== id);
    setSaving(true);
    const res = await saveCustomBillingTypes(updated);
    setSaving(false);
    if (res.error) { toast.error(res.error); return; }
    setCustomTypes(updated);
    toast.success("Tipo rimosso");
  }

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-[var(--crm-neutral-400)]"><Loader2 className="h-4 w-4 animate-spin" /> Caricamento...</div>;
  }

  return (
    <div className="space-y-5">
      {/* Predefined types (read-only) */}
      <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-[var(--crm-neutral-400)]" />
          <h3 className="text-sm font-semibold">Tipi predefiniti</h3>
        </div>
        <p className="text-xs text-[var(--crm-neutral-500)]">Questi tipi sono sempre disponibili e non possono essere rimossi.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PREDEFINED_BILLING_TYPES.map((bt) => (
            <div key={bt.id} className="flex items-center justify-between rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">{bt.name}</p>
                <p className="text-xs text-[var(--crm-neutral-500)]">{bt.description}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${bt.isRecurring ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                {bt.isRecurring ? "Ricorrente" : "Una tantum"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Custom types */}
      <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-5 space-y-4">
        <h3 className="text-sm font-semibold">Tipi personalizzati</h3>

        {customTypes.length === 0 ? (
          <p className="text-sm text-[var(--crm-neutral-400)] py-2">Nessun tipo personalizzato. Aggiungine uno qui sotto.</p>
        ) : (
          <div className="space-y-2">
            {customTypes.map((ct) => (
              <div key={ct.id} className="flex items-center gap-3 rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{ct.name}</p>
                  {ct.period && <p className="text-xs text-[var(--crm-neutral-500)]">{ct.period}</p>}
                </div>
                <button
                  onClick={() => handleDelete(ct.id)}
                  disabled={saving}
                  className="text-[var(--crm-neutral-400)] hover:text-[var(--crm-danger)] transition-colors flex-shrink-0"
                  title="Rimuovi"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add form */}
        <div className="rounded-lg border border-dashed border-[var(--crm-neutral-200)] p-4 space-y-3">
          <p className="text-xs font-medium text-[var(--crm-neutral-500)] uppercase tracking-wide">Aggiungi tipo</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Nome (es. Leasing trimestrale)"
              className={inputCls}
            />
            <input
              value={newPeriod}
              onChange={(e) => setNewPeriod(e.target.value)}
              placeholder="Periodo (es. ogni 3 mesi)"
              className={inputCls}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAdd}
            disabled={saving || !newName.trim()}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
            Aggiungi tipo
          </Button>
        </div>
      </div>
    </div>
  );
}
