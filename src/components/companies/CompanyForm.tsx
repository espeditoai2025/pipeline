"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { createCompany, updateCompany } from "@/server/actions/contacts";
import type { Company } from "@/types/contacts";

const schema = z.object({
  name: z.string().min(1, "Nome obbligatorio"),
  website: z.string().url("URL non valido").optional().or(z.literal("")),
  industry: z.string().optional(),
  size: z.string().optional(),
  address: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  company?: Company | null;
  onSaved: (c: Company) => void;
};

const inputCls = "w-full rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)]";

const INDUSTRIES = ["Tecnologia", "Consulenza", "Manifatturiero", "Finanza", "Media", "Retail", "Sanità", "Educazione", "Altro"];
const SIZES = ["1-10", "10-50", "50-200", "200-1000", "1000+"];

export function CompanyForm({ open, onClose, company, onSaved }: Props) {
  const isEditing = !!company;

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: company
      ? { name: company.name, website: company.website ?? "", industry: company.industry ?? "", size: company.size ?? "", address: company.address ?? "" }
      : { name: "", website: "", industry: "", size: "", address: "" },
  });

  async function onSubmit(data: FormValues) {
    const result = isEditing
      ? await updateCompany({ id: company!.id, ...data })
      : await createCompany(data);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(isEditing ? "Azienda aggiornata" : "Azienda creata");
      onSaved(result.data!);
      reset();
      onClose();
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Modifica azienda" : "Nuova azienda"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome *</label>
            <input {...register("name")} className={inputCls} placeholder="Acme S.r.l." />
            {errors.name && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Sito web</label>
            <input {...register("website")} className={inputCls} placeholder="https://esempio.it" />
            {errors.website && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.website.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Settore</label>
              <select {...register("industry")} className={inputCls}>
                <option value="">Seleziona...</option>
                {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Dimensioni</label>
              <select {...register("size")} className={inputCls}>
                <option value="">Seleziona...</option>
                {SIZES.map((s) => <option key={s} value={s}>{s} dipendenti</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Indirizzo</label>
            <input {...register("address")} className={inputCls} placeholder="Via Roma 1, Milano" />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Annulla</Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? "Salva" : "Crea"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
