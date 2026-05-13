"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetBody, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { createProduct, updateProduct } from "@/server/actions/products";
import type { Product, ProductCategory } from "@/types/products";

const schema = z.object({
  name: z.string().min(1, "Nome obbligatorio"),
  code: z.string().min(1, "Codice obbligatorio"),
  description: z.string().optional(),
  category: z.enum(["SOFTWARE", "HARDWARE", "SERVICE", "SUPPORT", "LICENSE", "OTHER"]),
  unitPrice: z.number().min(0),
  currency: z.string().min(1),
  taxRate: z.number().min(0).max(100),
  unit: z.string().min(1, "Unità obbligatoria"),
});

type FormValues = z.infer<typeof schema>;

const CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: "SOFTWARE",  label: "Software" },
  { value: "HARDWARE",  label: "Hardware" },
  { value: "SERVICE",   label: "Servizio" },
  { value: "SUPPORT",   label: "Supporto" },
  { value: "LICENSE",   label: "Licenza" },
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

export function ProductForm({ open, onClose, product, onSaved }: Props) {
  const isEditing = !!product;

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
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
      : { name: "", code: "", description: "", category: "SERVICE", unitPrice: 0, currency: "EUR", taxRate: 22, unit: "pezzo" },
  });

  useEffect(() => {
    if (open) {
      reset(product
        ? { name: product.name, code: product.code, description: product.description ?? "", category: product.category, unitPrice: product.unitPrice, currency: product.currency, taxRate: product.taxRate, unit: product.unit }
        : { name: "", code: "", description: "", category: "SERVICE", unitPrice: 0, currency: "EUR", taxRate: 22, unit: "pezzo" }
      );
    }
  }, [open, product, reset]);

  async function onSubmit(data: FormValues) {
    const result = isEditing
      ? await updateProduct(product!.id, data)
      : await createProduct(data);

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
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Modifica prodotto" : "Nuovo prodotto"}</SheetTitle>
        </SheetHeader>

        <SheetBody>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

          <div>
            <label className="block text-sm font-medium mb-2">Categoria</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(({ value, label }) => (
                <label key={value} className="cursor-pointer">
                  <input {...register("category")} type="radio" value={value} className="sr-only peer" />
                  <div className="rounded-lg border-2 border-[var(--crm-neutral-100)] p-2 text-xs font-medium text-center transition-colors peer-checked:border-[var(--crm-primary)] peer-checked:bg-[var(--crm-primary)]/5">
                    {label}
                  </div>
                </label>
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

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Annulla</Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? "Salva" : "Crea"}
            </Button>
          </div>
        </form>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
