"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Trash2, Package, Trophy, X, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { createDeal, updateDeal } from "@/server/actions/deals";
import { addProductToDeal } from "@/server/actions/products";
import { getContacts } from "@/server/actions/contacts";
import { getProducts } from "@/server/actions/products";
import { getCustomFields, getCustomFieldValues, saveCustomFieldValues } from "@/server/actions/custom-fields";
import { CustomFieldsSection } from "@/components/shared/CustomFieldsSection";
import type { Deal, Stage } from "@/types/deals";
import type { Product } from "@/types/products";
import type { CustomField } from "@/types/custom-fields";

const schema = z.object({
  title: z.string().min(1, "Titolo obbligatorio"),
  value: z.number().min(0, "Valore non valido"),
  currency: z.string().min(1),
  stageId: z.string().min(1, "Seleziona uno stage"),
  expectedClose: z.string().optional(),
  contactId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type ContactOption = { id: string; firstName: string; lastName: string | null; email: string | null; companyName: string | null };
type SelectedProduct = { productId: string; name: string; unitPrice: number; currency: string; quantity: number; discount: number; taxRate: number };

type Props = {
  open: boolean;
  onClose: () => void;
  deal?: Deal | null;
  stages: Stage[];
  pipelineId: string;
  defaultStageId?: string;
};

const inputCls = "w-full rounded-lg border border-[var(--crm-neutral-200)] bg-white dark:bg-white/5 px-3 py-2.5 text-sm text-[var(--crm-neutral-900)] dark:text-white placeholder:text-[var(--crm-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] focus:border-transparent transition-colors";

export function DealForm({ open, onClose, deal, stages, pipelineId, defaultStageId }: Props) {
  const isEditing = !!deal;

  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [addingProduct, setAddingProduct] = useState(false);
  const [pickedProductId, setPickedProductId] = useState("");
  const [closingAs, setClosingAs] = useState<"WON" | "LOST" | null>(null);
  const [lostReason, setLostReason] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: deal
      ? {
          title: deal.title,
          value: deal.value,
          currency: deal.currency,
          stageId: deal.stageId,
          expectedClose: deal.expectedClose?.slice(0, 10) ?? "",
          contactId: deal.contact?.id ?? "",
        }
      : {
          title: "",
          value: 0,
          currency: "EUR",
          stageId: defaultStageId ?? stages[0]?.id ?? "",
          expectedClose: "",
          contactId: "",
        },
  });

  useEffect(() => {
    if (!open) return;
    getContacts().then((cs) =>
      setContacts(cs.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        companyName: (c as { company?: { name: string } | null }).company?.name ?? null,
      })))
    );
    getProducts().then((ps) => setProducts(ps.filter((p) => p.isActive)));
    getCustomFields("deal").then(setCustomFields);
    setCustomValues({});
    if (deal?.id) {
      getCustomFieldValues(deal.id, "deal").then((vals) => {
        const map: Record<string, string> = {};
        for (const v of vals) map[v.fieldId] = v.value;
        setCustomValues(map);
      });
    }
    if (deal) {
      reset({
        title: deal.title,
        value: deal.value,
        currency: deal.currency,
        stageId: deal.stageId,
        expectedClose: deal.expectedClose?.slice(0, 10) ?? "",
        contactId: deal.contact?.id ?? "",
      });
    } else {
      reset({
        title: "",
        value: 0,
        currency: "EUR",
        stageId: defaultStageId ?? stages[0]?.id ?? "",
        expectedClose: "",
        contactId: "",
      });
      setSelectedProducts([]);
    }
    setClosingAs(null);
    setLostReason("");
  }, [open, deal, reset, defaultStageId, stages]);

  function syncValueFromProducts(list: SelectedProduct[]) {
    if (list.length === 0) return;
    const total = list.reduce((sum, p) => sum + p.unitPrice * p.quantity, 0);
    setValue("value", total);
  }

  function handleAddProduct() {
    const prod = products.find((p) => p.id === pickedProductId);
    if (!prod) return;
    if (selectedProducts.find((sp) => sp.productId === prod.id)) {
      toast.error("Prodotto già aggiunto");
      return;
    }
    const next = [
      ...selectedProducts,
      { productId: prod.id, name: prod.name, unitPrice: prod.unitPrice, currency: prod.currency, quantity: 1, discount: 0, taxRate: prod.taxRate },
    ];
    setSelectedProducts(next);
    syncValueFromProducts(next);
    setPickedProductId("");
    setAddingProduct(false);
  }

  function removeProduct(productId: string) {
    const next = selectedProducts.filter((p) => p.productId !== productId);
    setSelectedProducts(next);
    syncValueFromProducts(next);
  }

  function updateProductQty(productId: string, qty: number) {
    const next = selectedProducts.map((p) => p.productId === productId ? { ...p, quantity: Math.max(1, qty) } : p);
    setSelectedProducts(next);
    syncValueFromProducts(next);
  }

  async function handleCloseDeal(status: "WON" | "LOST") {
    if (!deal) return;
    setIsClosing(true);
    const result = await updateDeal({
      id: deal.id,
      status,
      lostReason: status === "LOST" ? (lostReason.trim() || null) : null,
    });
    setIsClosing(false);
    if (result.error) { toast.error(result.error); return; }
    toast.success(status === "WON" ? "Affare chiuso come vinto 🎉" : "Affare chiuso come perso");
    setClosingAs(null);
    setLostReason("");
    onClose();
  }

  async function handleReopenDeal() {
    if (!deal) return;
    setIsClosing(true);
    const result = await updateDeal({ id: deal.id, status: "OPEN", lostReason: null });
    setIsClosing(false);
    if (result.error) { toast.error(result.error); return; }
    toast.success("Affare riaperto");
    onClose();
  }

  async function onSubmit(data: FormValues) {
    const payload = {
      ...data,
      contactId: data.contactId || undefined,
    };

    let newDealId: string | undefined;

    if (isEditing) {
      const result = await updateDeal({ id: deal!.id, ...payload });
      if (result.error) { toast.error(result.error); return; }
    } else {
      const result = await createDeal({ ...payload, pipelineId });
      if (result.error) { toast.error(result.error); return; }
      newDealId = result.id;
    }

    // Add products after deal creation
    if (newDealId && selectedProducts.length > 0) {
      await Promise.all(
        selectedProducts.map((sp) =>
          addProductToDeal({
            dealId: newDealId!,
            productId: sp.productId,
            quantity: sp.quantity,
            unitPrice: sp.unitPrice,
            discount: sp.discount,
            taxRate: sp.taxRate,
            currency: sp.currency,
          })
        )
      );
    }

    const savedDealId = isEditing ? deal!.id : newDealId;
    if (savedDealId) {
      const cfValues = Object.entries(customValues).map(([fieldId, value]) => ({ fieldId, value }));
      if (cfValues.length > 0) {
        await saveCustomFieldValues(savedDealId, "deal", cfValues);
      }
    }

    toast.success(isEditing ? "Affare aggiornato" : "Affare creato");
    reset();
    setSelectedProducts([]);
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Modifica affare" : "Nuovo affare"}</SheetTitle>
        </SheetHeader>

        <SheetBody>
          {/* Status badge + close actions — solo in modifica */}
          {isEditing && deal && (
            <div className="mb-5">
              {deal.status === "OPEN" && (
                <>
                  {closingAs === null ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setClosingAs("WON")}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2.5 transition-colors"
                      >
                        <Trophy className="h-4 w-4" /> Vinto
                      </button>
                      <button
                        type="button"
                        onClick={() => setClosingAs("LOST")}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold py-2.5 transition-colors"
                      >
                        <X className="h-4 w-4" /> Perso
                      </button>
                    </div>
                  ) : closingAs === "WON" ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 p-4 space-y-3">
                      <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Confermi di aver vinto questo affare?</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={isClosing}
                          onClick={() => handleCloseDeal("WON")}
                          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2.5 transition-colors disabled:opacity-60"
                        >
                          {isClosing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />} Sì, Vinto!
                        </button>
                        <button type="button" onClick={() => setClosingAs(null)} className="px-4 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
                          Annulla
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-900/20 p-4 space-y-3">
                      <p className="text-sm font-medium text-rose-800 dark:text-rose-300">Motivo della perdita (opzionale)</p>
                      <input
                        type="text"
                        value={lostReason}
                        onChange={(e) => setLostReason(e.target.value)}
                        placeholder="es. Prezzo, Concorrente, No budget..."
                        className={inputCls}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={isClosing}
                          onClick={() => handleCloseDeal("LOST")}
                          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold py-2.5 transition-colors disabled:opacity-60"
                        >
                          {isClosing ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Conferma Perso
                        </button>
                        <button type="button" onClick={() => { setClosingAs(null); setLostReason(""); }} className="px-4 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
                          Annulla
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {(deal.status === "WON" || deal.status === "LOST") && (
                <div className={`rounded-xl border p-4 flex items-center justify-between ${deal.status === "WON" ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20" : "border-rose-200 bg-rose-50 dark:bg-rose-900/20"}`}>
                  <div>
                    <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${deal.status === "WON" ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
                      {deal.status === "WON" ? <><Trophy className="h-4 w-4" /> Affare vinto</> : <><X className="h-4 w-4" /> Affare perso</>}
                    </span>
                    {deal.status === "LOST" && deal.lostReason && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">Motivo: {deal.lostReason}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={isClosing}
                    onClick={handleReopenDeal}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-1.5 bg-white transition-colors disabled:opacity-60"
                  >
                    {isClosing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />} Riapri
                  </button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Titolo */}
            <div>
              <label className="block text-sm font-medium mb-1">Titolo *</label>
              <input {...register("title")} className={inputCls} placeholder="es. Implementazione Pipely" />
              {errors.title && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.title.message}</p>}
            </div>

            {/* Contatto */}
            <div>
              <label className="block text-sm font-medium mb-1">Contatto</label>
              <select {...register("contactId")} className={inputCls}>
                <option value="">— Nessun contatto —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName}{c.lastName ? ` ${c.lastName}` : ""}{c.companyName ? ` · ${c.companyName}` : ""}{c.email ? ` (${c.email})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Valore e valuta */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Valore</label>
                <input
                  type="number" min={0} step="any"
                  {...register("value", { valueAsNumber: true })}
                  className={inputCls}
                />
                {errors.value && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.value.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Valuta</label>
                <select {...register("currency")} className={inputCls}>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>

            {/* Stage */}
            <div>
              <label className="block text-sm font-medium mb-1">Stage *</label>
              <select {...register("stageId")} className={inputCls}>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {errors.stageId && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.stageId.message}</p>}
            </div>

            {/* Chiusura prevista */}
            <div>
              <label className="block text-sm font-medium mb-1">Chiusura prevista</label>
              <input type="date" {...register("expectedClose")} className={inputCls} />
            </div>

            {/* Prodotti */}
            {!isEditing && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-[var(--crm-neutral-400)]" /> Prodotti
                  </label>
                  {!addingProduct && products.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setAddingProduct(true)}
                      className="text-xs text-[var(--crm-primary)] hover:underline flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> Aggiungi
                    </button>
                  )}
                </div>

                {addingProduct && (
                  <div className="flex gap-2 mb-2">
                    <select
                      value={pickedProductId}
                      onChange={(e) => setPickedProductId(e.target.value)}
                      className={`${inputCls} flex-1`}
                    >
                      <option value="">Seleziona prodotto...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {p.unitPrice.toLocaleString("it-IT", { style: "currency", currency: p.currency })}
                        </option>
                      ))}
                    </select>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddProduct} disabled={!pickedProductId}>
                      OK
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => { setAddingProduct(false); setPickedProductId(""); }}>
                      ✕
                    </Button>
                  </div>
                )}

                {selectedProducts.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedProducts.map((sp) => (
                      <div key={sp.productId} className="flex items-center gap-2 rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm">
                        <span className="flex-1 truncate">{sp.name}</span>
                        <span className="text-xs text-[var(--crm-neutral-500)] shrink-0">
                          {sp.unitPrice.toLocaleString("it-IT", { style: "currency", currency: sp.currency })}
                        </span>
                        <div className="flex flex-col items-center">
                          <input
                            type="number"
                            min={1}
                            value={sp.quantity}
                            onChange={(e) => updateProductQty(sp.productId, parseInt(e.target.value) || 1)}
                            className="w-14 rounded border border-[var(--crm-neutral-200)] px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-[var(--crm-primary)]"
                          />
                          <span className="text-[10px] text-[var(--crm-neutral-400)] mt-0.5">q.tà / mesi</span>
                        </div>
                        <button type="button" onClick={() => removeProduct(sp.productId)} className="text-[var(--crm-neutral-400)] hover:text-[var(--crm-danger)]">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <p className="text-xs text-[var(--crm-neutral-400)] pt-1">
                      Totale: {selectedProducts.reduce((sum, sp) => sum + sp.unitPrice * sp.quantity, 0).toLocaleString("it-IT", { style: "currency", currency: selectedProducts[0]?.currency ?? "EUR" })}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--crm-neutral-400)] py-1">
                    {products.length === 0 ? "Nessun prodotto attivo nel catalogo." : "Nessun prodotto aggiunto."}
                  </p>
                )}
              </div>
            )}

            <CustomFieldsSection
              fields={customFields}
              values={customValues}
              onChange={(fieldId, value) => setCustomValues((prev) => ({ ...prev, [fieldId]: value }))}
            />

            {/* Azioni */}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Annulla
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? "Salva" : "Crea"}
              </Button>
            </div>
          </form>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
