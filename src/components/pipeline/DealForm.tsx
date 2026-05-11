"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { createDeal, updateDeal } from "@/server/actions/deals";
import type { Deal, Stage } from "@/types/deals";

const schema = z.object({
  title: z.string().min(1, "Titolo obbligatorio"),
  value: z.number().min(0, "Valore non valido"),
  currency: z.string().min(1),
  stageId: z.string().min(1, "Seleziona uno stage"),
  expectedClose: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  deal?: Deal | null;
  stages: Stage[];
  pipelineId: string;
  defaultStageId?: string;
};

export function DealForm({ open, onClose, deal, stages, pipelineId, defaultStageId }: Props) {
  const isEditing = !!deal;

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
        }
      : {
          title: "",
          value: 0,
          currency: "EUR",
          stageId: defaultStageId ?? stages[0]?.id ?? "",
          expectedClose: "",
        },
  });

  async function onSubmit(data: FormValues) {
    const result = isEditing
      ? await updateDeal({ id: deal!.id, ...data })
      : await createDeal({ ...data, pipelineId });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(isEditing ? "Affare aggiornato" : "Affare creato");
      reset();
      onClose();
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Modifica affare" : "Nuovo affare"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Titolo *</label>
            <input
              {...register("title")}
              className="w-full rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)]"
              placeholder="es. Implementazione CRM"
            />
            {errors.title && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Valore (€)</label>
              <input
                type="number"
                min={0}
                step={100}
                {...register("value", { valueAsNumber: true })}
                className="w-full rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)]"
              />
              {errors.value && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.value.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Valuta</label>
              <select
                {...register("currency")}
                className="w-full rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)]"
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Stage *</label>
            <select
              {...register("stageId")}
              className="w-full rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)]"
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {errors.stageId && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.stageId.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Chiusura prevista</label>
            <input
              type="date"
              {...register("expectedClose")}
              className="w-full rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)]"
            />
          </div>

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
      </SheetContent>
    </Sheet>
  );
}
