"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Trash2, Package } from "lucide-react";
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
import type { Deal, Stage } from "@/types/deals";
import type { Product } from "@/types/products";

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
    if (!isEditing) setSelectedProducts([]);
  }, [open, isEditing]);

  const {
    register,
    handleSubmit,
    reset,
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

  function handleAddProduct() {
    const prod = products.find((p) => p.id === pickedProductId);
    if (!prod) return;
    if (selectedProducts.find((sp) => sp.productId === prod.id)) {
      toast.error("Prodotto già aggiunto");
      return;
    }
    setSelectedProducts((prev) => [
      ...prev,
      { productId: prod.id, name: prod.name, unitPrice: prod.unitPrice, currency: prod.currency, quantity: 1, discount: 0, taxRate: prod.taxRate },
    ]);
    setPickedProductId("");
    setAddingProduct(false);
  }

  function removeProduct(productId: string) {
    setSelectedProducts((prev) => prev.filter((p) => p.productId !== productId));
  }

  function updateProductQty(productId: string, qty: number) {
    setSelectedProducts((prev) => prev.map((p) => p.productId === productId ? { ...p, quantity: Math.max(1, qty) } : p));
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
                  type="number" min={0} step={100}
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
                        <input
                          type="number"
                          min={1}
                          value={sp.quantity}
                          onChange={(e) => updateProductQty(sp.productId, parseInt(e.target.value) || 1)}
                          className="w-14 rounded border border-[var(--crm-neutral-200)] px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-[var(--crm-primary)]"
                        />
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
