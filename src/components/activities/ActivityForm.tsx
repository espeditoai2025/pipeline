"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetBody, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { createActivity, updateActivity } from "@/server/actions/activities";
import { getContacts } from "@/server/actions/contacts";
import { getDealsForSelect } from "@/server/actions/deals";
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

type ContactOption = { id: string; label: string };
type DealOption = { id: string; label: string };

type Props = {
  open: boolean;
  onClose: () => void;
  activity?: Activity | null;
  defaultType?: ActivityType;
  defaultDueDate?: string;
  onSaved: (a: Activity) => void;
};

const inputCls = "w-full rounded-lg border border-[var(--crm-neutral-200)] bg-white dark:bg-white/5 px-3 py-2.5 text-sm text-[var(--crm-neutral-900)] dark:text-white placeholder:text-[var(--crm-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] focus:border-transparent transition-colors";

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

  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [deals, setDeals] = useState<DealOption[]>([]);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
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

  useEffect(() => {
    if (!open) return;

    getContacts().then((cs) =>
      setContacts(
        cs.map((c) => ({
          id: c.id,
          label: [c.firstName, c.lastName].filter(Boolean).join(" ") +
            ((c as { company?: { name: string } | null }).company?.name ? ` · ${(c as { company?: { name: string } | null }).company!.name}` : ""),
        }))
      )
    );

    getDealsForSelect().then((ds) =>
      setDeals(
        ds.map((d) => ({
          id: d.id,
          label: `${d.title} — ${d.value.toLocaleString("it-IT")} ${d.currency}`,
        }))
      )
    );

    if (activity) {
      reset({
        type: activity.type,
        subject: activity.subject,
        notes: activity.notes ?? "",
        dueDate: activity.dueDate ? activity.dueDate.slice(0, 16) : "",
        duration: activity.duration ?? undefined,
        dealId: activity.dealId ?? "",
        dealTitle: activity.dealTitle ?? "",
        contactId: activity.contactId ?? "",
        contactName: activity.contactName ?? "",
      });
    } else {
      reset({
        type: defaultType ?? "CALL",
        subject: "",
        notes: "",
        dueDate: defaultDueDate ?? "",
        duration: undefined,
        dealId: "",
        dealTitle: "",
        contactId: "",
        contactName: "",
      });
    }
  }, [open, activity, defaultType, defaultDueDate, reset]);

  function handleDealChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setValue("dealId", id);
    const found = deals.find((d) => d.id === id);
    setValue("dealTitle", found ? found.label.split(" —")[0] : "");
  }

  function handleContactChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setValue("contactId", id);
    const found = contacts.find((c) => c.id === id);
    setValue("contactName", found?.label ?? "");
  }

  // eslint-disable-next-line react-hooks/incompatible-library
  const selectedDealId = watch("dealId");
  const selectedContactId = watch("contactId");

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
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Modifica attività" : "Nuova attività"}</SheetTitle>
        </SheetHeader>

        <SheetBody>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Tipo */}
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

            {/* Oggetto */}
            <div>
              <label className="block text-sm font-medium mb-1">Oggetto *</label>
              <input {...register("subject")} className={inputCls} placeholder="es. Chiamata di follow-up" />
              {errors.subject && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.subject.message}</p>}
            </div>

            {/* Data e durata */}
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

            {/* Affare collegato */}
            <div>
              <label className="block text-sm font-medium mb-1">Affare collegato</label>
              <select
                value={selectedDealId ?? ""}
                onChange={handleDealChange}
                className={inputCls}
              >
                <option value="">— Nessun affare —</option>
                {deals.map((d) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
              {deals.length === 0 && (
                <p className="mt-1 text-xs text-[var(--crm-neutral-400)]">Nessun affare aperto nel sistema.</p>
              )}
            </div>

            {/* Contatto */}
            <div>
              <label className="block text-sm font-medium mb-1">Contatto</label>
              <select
                value={selectedContactId ?? ""}
                onChange={handleContactChange}
                className={inputCls}
              >
                <option value="">— Nessun contatto —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              {contacts.length === 0 && (
                <p className="mt-1 text-xs text-[var(--crm-neutral-400)]">Nessun contatto nel sistema.</p>
              )}
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-medium mb-1">Note</label>
              <textarea {...register("notes")} rows={3} className={`${inputCls} resize-none`} placeholder="Note aggiuntive..." />
            </div>

            {/* Azioni */}
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
