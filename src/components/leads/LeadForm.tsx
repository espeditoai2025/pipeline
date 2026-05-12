"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { createLead, updateLead } from "@/server/actions/leads";
import type { Lead } from "@/types/contacts";

const schema = z.object({
  title: z.string().min(1, "Titolo obbligatorio"),
  source: z.string().optional(),
  score: z.number().min(0).max(100),
  status: z.enum(["NEW", "WORKING", "NURTURING", "CONVERTED", "DISQUALIFIED"]),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  lead?: Lead | null;
  onSaved: (l: Lead) => void;
};

const inputCls = "w-full rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)]";

const SOURCES = ["Website", "LinkedIn", "Referral", "Evento", "Email Marketing", "Ads", "Cold Call", "Altro"];
const STATUS_LABELS: Record<string, string> = {
  NEW: "Nuovo",
  WORKING: "In lavorazione",
  NURTURING: "Nurturing",
  CONVERTED: "Convertito",
  DISQUALIFIED: "Non qualificato",
};

export function LeadForm({ open, onClose, lead, onSaved }: Props) {
  const isEditing = !!lead;

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: lead
      ? { title: lead.title, source: lead.source ?? "", score: lead.score, status: lead.status }
      : { title: "", source: "", score: 50, status: "NEW" },
  });

  async function onSubmit(data: FormValues) {
    const result = isEditing
      ? await updateLead({ id: lead!.id, ...data })
      : await createLead(data);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(isEditing ? "Lead aggiornato" : "Lead creato");
      onSaved(result.data!);
      reset();
      onClose();
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Modifica lead" : "Nuovo lead"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Titolo *</label>
            <input {...register("title")} className={inputCls} placeholder="es. Richiesta demo Pipely" />
            {errors.title && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Sorgente</label>
              <select {...register("source")} className={inputCls}>
                <option value="">Seleziona...</option>
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Stato</label>
              <select {...register("status")} className={inputCls}>
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Score: <span className="text-[var(--crm-primary)]" id="score-val">—</span></label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              {...register("score", { valueAsNumber: true })}
              className="w-full accent-[var(--crm-primary)]"
            />
            <div className="flex justify-between text-xs text-[var(--crm-neutral-400)] mt-1">
              <span>0</span><span>50</span><span>100</span>
            </div>
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
