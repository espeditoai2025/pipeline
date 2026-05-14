"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetBody, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { createProduct, updateProduct } from "@/server/actions/products";
import { getCustomBillingTypes, getCustomProductCategories } from "@/server/actions/billing-types";
import { PREDEFINED_BILLING_TYPES, type CustomBillingType, type CustomProductCategory } from "@/types/billing-types";
import type { Product } from "@/types/products";

const schema = z.object({
  name: z.string().min(1, "Nome obbligatorio"),
  code: z.string().min(1, "Codice obbligatorio"),
  description: z.string().optional(),
  category: z.string().min(1, "Categoria obbligatoria"),
  unitPrice: z.number().min(0),
  currency: z.string().min(1),
  taxRate: z.number().min(0).max(100),
  unit: z.string().min(1, "Unità obbligatoria"),
});

type FormValues = z.infer<typeof schema>;

const PREDEFINED_CATEGORIES: { value: string; label: string }[] = [
  { value: "SOFTWARE",  label: "Software" },
  { value: "HARDWARE",  label: "Hardware" },
  { value: "SERVICE",   label: "Servizio" },
  { value: "SUPPORT",   label: "Supporto" },
  { value: "LICENSE",   label: "Licenza" },
  { value: "SAAS",      label: "SaaS" },
  { value: "WEBSITE",   label: "Sito Web" },
  { value: "AI_AGENT",  label: "Agenti AI" },
  { value: "OTHER",     label: "Altro" },
];

const CURRENCIES = ["EUR", "USD", "GBP", "CHF"];
const TAX_RATES = [0, 4, 5, 10, 22];

const inputCls = "w-full rounded-lg border border-[var(--crm-neutral-200)] bg-white dark:bg-white/5 px-3 py-2.5 text-sm text-[var(--crm-neutral-900)] dark:text-white placeholder:text-[var(--crm-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] focus:border-transparent transition-colors";

type Props = {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
  onSaved: (p: Product) => void;
};

function getBillingTypeFromProduct(p: Product | null | undefined): string {
  if (!p || !p.isSubscription) return "one_time";
  return p.billingPeriod ?? "monthly";
}

const defaultValues: FormValues = {
  name: "", code: "", description: "", category: "SERVICE",
  unitPrice: 0, currency: "EUR", taxRate: 22, unit: "pezzo",
};

export function ProductForm({ open, onClose, product, onSaved }: Props) {
  const isEditing = !!product;
  const [billingType, setBillingType] = useState<string>("one_time");
  const [customBillingTypes, setCustomBillingTypes] = useState<CustomBillingType[]>([]);
  const [customCategories, setCustomCategories] = useState<CustomProductCategory[]>([]);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: product
      ? {
          name: product.name,
          code: product.code,
          description: product.description ?? "",
          category: product.category,
          unitPrice: product.unitPrice,
          currency: product.currency,
          taxRate: product.taxRate,
          unit: product.unit,
        }
      : defaultValues,
  });

  const selectedCategory = watch("category");

  useEffect(() => {
    if (open) {
      reset(product
        ? {
            name: product.name,
            code: product.code,
            description: product.description ?? "",
            category: product.category,
            unitPrice: product.unitPrice,
            currency: product.currency,
            taxRate: product.taxRate,
            unit: product.unit,
          }
        : defaultValues
      );
      setBillingType(getBillingTypeFromProduct(product));
      Promise.all([getCustomBillingTypes(), getCustomProductCategories()])
        .then(([bt, cats]) => {
          setCustomBillingTypes(bt);
          setCustomCategories(cats);
        })
        .catch(() => {});
    }
  }, [open, product, reset]);

  const allBillingTypes = [
    ...PREDEFINED_BILLING_TYPES,
    ...customBillingTypes.map((ct) => ({ id: ct.id, name: ct.name, description: ct.period ?? "Personalizzato", isRecurring: true })),
  ];

  const allCategories = [
    ...PREDEFINED_CATEGORIES,
    ...customCategories.map((c) => ({ value: c.id, label: c.name })),
  ];

  async function onSubmit(data: FormValues) {
    const selectedType = allBillingTypes.find((t) => t.id === billingType);
    const isSubscription = selectedType?.isRecurring ?? false;
    const billingPeriod = isSubscription ? billingType : null;

    const result = isEditing
      ? await updateProduct(product!.id, { ...data, isSubscription, billingPeriod })
      : await createProduct({ ...data, isSubscription, billingPeriod });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(isEditing ? "Prodotto aggiornato" : "Prodotto creato");
      onSaved(result.data!);
      onClose();
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Modifica prodotto" : "Nuovo prodotto"}</SheetTitle>
        </SheetHeader>

        <SheetBody>
          <form id="product-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Nome *</label>
                <input {...register("name")} className={inputCls} placeholder="es. Pipely Enterprise" />
                {errors.name && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Codice *</label>
                <input {...register("code")} className={inputCls} placeholder="es. PIP-001" />
                {errors.code && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.code.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Unità *</label>
                <input {...register("unit")} className={inputCls} placeholder="es. ora, anno" />
                {errors.unit && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.unit.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Descrizione</label>
              <textarea {...register("description")} rows={2} className={`${inputCls} resize-none`} placeholder="Descrizione opzionale..." />
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium mb-2">Categoria</label>
              <div className="grid grid-cols-3 gap-2">
                {allCategories.map(({ value, label }) => (
                  <label key={value} className="cursor-pointer">
                    <input
                      type="radio"
                      value={value}
                      checked={selectedCategory === value}
                      onChange={() => setValue("category", value, { shouldValidate: true })}
                      className="sr-only"
                    />
                    <div className={`rounded-lg border-2 p-2 text-xs font-medium text-center transition-colors ${
                      selectedCategory === value
                        ? "border-[var(--crm-primary)] bg-[var(--crm-primary)]/5 text-[var(--crm-primary)]"
                        : "border-[var(--crm-neutral-100)] hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5"
                    }`}>
                      {label}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Billing type selector */}
            <div>
              <label className="block text-sm font-medium mb-2">Tipo di fatturazione</label>
              <div className="grid grid-cols-2 gap-2">
                {allBillingTypes.map((bt) => (
                  <button
                    key={bt.id}
                    type="button"
                    onClick={() => setBillingType(bt.id)}
                    className={`rounded-lg border-2 px-3 py-2.5 text-left transition-colors ${
                      billingType === bt.id
                        ? "border-[var(--crm-primary)] bg-[var(--crm-primary)]/5"
                        : "border-[var(--crm-neutral-100)] hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5"
                    }`}
                  >
                    <p className={`text-sm font-medium ${billingType === bt.id ? "text-[var(--crm-primary)]" : ""}`}>{bt.name}</p>
                    <p className="text-xs text-[var(--crm-neutral-400)] mt-0.5">{bt.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="block text-sm font-medium mb-1">Prezzo unitario</label>
                <input
                  {...register("unitPrice", { valueAsNumber: true })}
                  type="number" min={0} step={0.01}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Valuta</label>
                <select {...register("currency")} className={inputCls}>
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">IVA %</label>
                <select {...register("taxRate", { valueAsNumber: true })} className={inputCls}>
                  {TAX_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
                </select>
              </div>
            </div>
          </form>
        </SheetBody>

        <div className="px-6 py-4 border-t border-[var(--crm-neutral-100)] dark:border-white/10 flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Annulla</Button>
          <Button form="product-form" type="submit" disabled={isSubmitting} className="flex-1 bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? "Salva" : "Crea"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
