"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { createActivity, updateActivity } from "@/server/actions/activities";
import { ACTIVITY_CONFIG } from "./ActivityTypeIcon";
import type { Activity, ActivityType } from "@/types/activities";

const schema = z.object({
  type: z.enum(["CALL", "MEETING", "EMAIL", "TASK", "DEADLINE", "LUNCH"]),
  subject: z.string().min(1, "Oggetto obbligatorio"),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
  duration: z.number().min(0).optional(),
  dealId: z.string().optional(),
  dealTitle: z.string().optional(),
  contactId: z.string().optional(),
  contactName: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  activity?: Activity | null;
  defaultType?: ActivityType;
  defaultDueDate?: string;
  onSaved: (a: Activity) => void;
};

const inputCls = "w-full rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)]";

const DURATION_OPTIONS = [
  { value: "", label: "Non specificata" },
  { value: "15", label: "15 minuti" },
  { value: "30", label: "30 minuti" },
  { value: "45", label: "45 minuti" },
  { value: "60", label: "1 ora" },
  { value: "90", label: "1h 30min" },
  { value: "120", label: "2 ore" },
  { value: "180", label: "3 ore" },
];

export function ActivityForm({ open, onClose, activity, defaultType, defaultDueDate, onSaved }: Props) {
  const isEditing = !!activity;

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: activity
      ? {
          type: activity.type,
          subject: activity.subject,
          notes: activity.notes ?? "",
          dueDate: activity.dueDate ? activity.dueDate.slice(0, 16) : "",
          duration: activity.duration ?? undefined,
          dealId: activity.dealId ?? "",
          dealTitle: activity.dealTitle ?? "",
          contactId: activity.contactId ?? "",
          contactName: activity.contactName ?? "",
        }
      : {
          type: defaultType ?? "CALL",
          subject: "",
          notes: "",
          dueDate: defaultDueDate ?? "",
          duration: undefined,
          dealId: "",
          dealTitle: "",
          contactId: "",
          contactName: "",
        },
  });

  async function onSubmit(data: FormValues) {
    const result = isEditing
      ? await updateActivity({ id: activity!.id, ...data })
      : await createActivity(data);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(isEditing ? "Attività aggiornata" : "Attività creata");
      onSaved(result.data!);
      reset();
      onClose();
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Modifica attività" : "Nuova attività"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Tipo</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(ACTIVITY_CONFIG) as ActivityType[]).map((t) => {
                const { label, Icon, color, bg } = ACTIVITY_CONFIG[t];
                return (
                  <label key={t} className="cursor-pointer">
                    <input {...register("type")} type="radio" value={t} className="sr-only peer" />
                    <div className={`flex flex-col items-center gap-1 rounded-lg border-2 border-[var(--crm-neutral-100)] p-2 text-xs font-medium transition-colors peer-checked:border-[var(--crm-primary)] peer-checked:${bg}`}>
                      <Icon className={`h-4 w-4 ${color}`} />
                      {label}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Oggetto *</label>
            <input {...register("subject")} className={inputCls} placeholder="es. Chiamata di follow-up" />
            {errors.subject && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.subject.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Data e ora</label>
              <input type="datetime-local" {...register("dueDate")} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Durata</label>
              <select {...register("duration", { setValueAs: (v) => v === "" ? undefined : Number(v) })} className={inputCls}>
                {DURATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Note</label>
            <textarea {...register("notes")} rows={3} className={`${inputCls} resize-none`} placeholder="Note aggiuntive..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Affare collegato</label>
              <input {...register("dealTitle")} className={inputCls} placeholder="Nome affare" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contatto</label>
              <input {...register("contactName")} className={inputCls} placeholder="Nome contatto" />
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
