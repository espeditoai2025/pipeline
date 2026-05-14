"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getCustomBillingTypes, saveCustomBillingTypes, getCustomProductCategories, saveCustomProductCategories } from "@/server/actions/billing-types";
import { PREDEFINED_BILLING_TYPES, type CustomBillingType, type CustomProductCategory } from "@/types/billing-types";

const inputCls = "w-full rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] bg-transparent";

const PREDEFINED_CATEGORY_NAMES: Record<string, string> = {
  SOFTWARE: "Software", HARDWARE: "Hardware", SERVICE: "Servizio",
  SUPPORT: "Supporto", LICENSE: "Licenza", SAAS: "SaaS",
  WEBSITE: "Sito Web", AI_AGENT: "Agenti AI", OTHER: "Altro",
};

export function BillingTypesManager() {
  const [customBillingTypes, setCustomBillingTypes] = useState<CustomBillingType[]>([]);
  const [customCategories, setCustomCategories] = useState<CustomProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingBilling, setSavingBilling] = useState(false);
  const [savingCat, setSavingCat] = useState(false);
  const [newBillingName, setNewBillingName] = useState("");
  const [newBillingPeriod, setNewBillingPeriod] = useState("");
  const [newCatName, setNewCatName] = useState("");

  useEffect(() => {
    Promise.all([getCustomBillingTypes(), getCustomProductCategories()])
      .then(([bt, cats]) => { setCustomBillingTypes(bt); setCustomCategories(cats); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleAddBilling() {
    const name = newBillingName.trim();
    if (!name) { toast.error("Inserisci un nome"); return; }
    const newType: CustomBillingType = { id: `custom_${Date.now()}`, name, period: newBillingPeriod.trim() || undefined };
    const updated = [...customBillingTypes, newType];
    setSavingBilling(true);
    const res = await saveCustomBillingTypes(updated);
    setSavingBilling(false);
    if (res.error) { toast.error(res.error); return; }
    setCustomBillingTypes(updated);
    setNewBillingName(""); setNewBillingPeriod("");
    toast.success("Tipo aggiunto");
  }

  async function handleDeleteBilling(id: string) {
    const updated = customBillingTypes.filter((t) => t.id !== id);
    setSavingBilling(true);
    const res = await saveCustomBillingTypes(updated);
    setSavingBilling(false);
    if (res.error) { toast.error(res.error); return; }
    setCustomBillingTypes(updated);
    toast.success("Tipo rimosso");
  }

  async function handleAddCategory() {
    const name = newCatName.trim();
    if (!name) { toast.error("Inserisci un nome per la categoria"); return; }
    const newCat: CustomProductCategory = { id: `cat_${Date.now()}`, name };
    const updated = [...customCategories, newCat];
    setSavingCat(true);
    const res = await saveCustomProductCategories(updated);
    setSavingCat(false);
    if (res.error) { toast.error(res.error); return; }
    setCustomCategories(updated);
    setNewCatName("");
    toast.success("Categoria aggiunta");
  }

  async function handleDeleteCategory(id: string) {
    const updated = customCategories.filter((c) => c.id !== id);
    setSavingCat(true);
    const res = await saveCustomProductCategories(updated);
    setSavingCat(false);
    if (res.error) { toast.error(res.error); return; }
    setCustomCategories(updated);
    toast.success("Categoria rimossa");
  }

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-[var(--crm-neutral-400)]"><Loader2 className="h-4 w-4 animate-spin" /> Caricamento...</div>;
  }

  return (
    <div className="space-y-8">

      {/* ── CATEGORIE ─────────────────────────────────────────── */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Categorie prodotto</h3>
          <p className="text-xs text-[var(--crm-neutral-500)] mt-0.5">Aggiungi categorie personalizzate oltre alle 9 predefinite.</p>
        </div>

        {/* Predefined */}
        <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-[var(--crm-neutral-400)]" />
            <span className="text-sm font-medium">Categorie predefinite</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PREDEFINED_CATEGORY_NAMES).map(([, label]) => (
              <span key={label} className="rounded-full bg-[var(--crm-neutral-100)] text-[var(--crm-neutral-600)] text-xs px-3 py-1 font-medium">
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Custom */}
        <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-5 space-y-4">
          <span className="text-sm font-medium">Categorie personalizzate</span>

          {customCategories.length === 0 ? (
            <p className="text-sm text-[var(--crm-neutral-400)]">Nessuna categoria personalizzata.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {customCategories.map((c) => (
                <div key={c.id} className="flex items-center gap-1.5 rounded-full border border-[var(--crm-primary)]/30 bg-[var(--crm-primary)]/5 px-3 py-1">
                  <span className="text-xs font-medium text-[var(--crm-primary)]">{c.name}</span>
                  <button
                    onClick={() => handleDeleteCategory(c.id)}
                    disabled={savingCat}
                    className="text-[var(--crm-primary)]/50 hover:text-[var(--crm-danger)] transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
              placeholder="es. Formazione, Consulenza AI..."
              className={`${inputCls} flex-1`}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddCategory}
              disabled={savingCat || !newCatName.trim()}
              className="shrink-0"
            >
              {savingCat ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* ── TIPI DI FATTURAZIONE ───────────────────────────────── */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Tipi di fatturazione</h3>
          <p className="text-xs text-[var(--crm-neutral-500)] mt-0.5">Aggiungi tipi personalizzati oltre ai 7 predefiniti.</p>
        </div>

        {/* Predefined */}
        <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-[var(--crm-neutral-400)]" />
            <span className="text-sm font-medium">Tipi predefiniti</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PREDEFINED_BILLING_TYPES.map((bt) => (
              <div key={bt.id} className="flex items-center justify-between rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2">
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

        {/* Custom */}
        <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-5 space-y-4">
          <span className="text-sm font-medium">Tipi personalizzati</span>

          {customBillingTypes.length === 0 ? (
            <p className="text-sm text-[var(--crm-neutral-400)]">Nessun tipo personalizzato.</p>
          ) : (
            <div className="space-y-2">
              {customBillingTypes.map((ct) => (
                <div key={ct.id} className="flex items-center gap-3 rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{ct.name}</p>
                    {ct.period && <p className="text-xs text-[var(--crm-neutral-500)]">{ct.period}</p>}
                  </div>
                  <button
                    onClick={() => handleDeleteBilling(ct.id)}
                    disabled={savingBilling}
                    className="text-[var(--crm-neutral-400)] hover:text-[var(--crm-danger)] transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-lg border border-dashed border-[var(--crm-neutral-200)] p-4 space-y-3">
            <p className="text-xs font-medium text-[var(--crm-neutral-500)] uppercase tracking-wide">Aggiungi tipo</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={newBillingName}
                onChange={(e) => setNewBillingName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddBilling()}
                placeholder="Nome (es. Leasing trimestrale)"
                className={inputCls}
              />
              <input
                value={newBillingPeriod}
                onChange={(e) => setNewBillingPeriod(e.target.value)}
                placeholder="Periodo (es. ogni 3 mesi)"
                className={inputCls}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddBilling}
              disabled={savingBilling || !newBillingName.trim()}
            >
              {savingBilling ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
              Aggiungi tipo
            </Button>
          </div>
        </div>
      </div>

    </div>
  );
}
