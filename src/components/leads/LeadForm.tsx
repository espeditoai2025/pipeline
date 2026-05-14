"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetBody, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { createLead, updateLead } from "@/server/actions/leads";
import { getContacts } from "@/server/actions/contacts";
import { getTeamMembers } from "@/server/actions/settings";
import type { Lead } from "@/types/contacts";

const schema = z.object({
  title: z.string().min(1, "Titolo obbligatorio"),
  source: z.string().optional(),
  status: z.enum(["NEW", "WORKING", "NURTURING", "CONVERTED", "DISQUALIFIED"]),
  score: z.number().min(0).max(100),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
  ownerId: z.string().optional(),
  contactId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  lead?: Lead | null;
  onSaved: (l: Lead) => void;
};

const inputCls = "w-full rounded-lg border border-[var(--crm-neutral-200)] bg-white dark:bg-white/5 px-3 py-2.5 text-sm text-[var(--crm-neutral-900)] dark:text-white placeholder:text-[var(--crm-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] focus:border-transparent transition-colors";

const SOURCES = ["Website", "LinkedIn", "Referral", "Evento", "Email Marketing", "Ads", "Cold Call", "Altro"];
const STATUS_LABELS: Record<string, string> = {
  NEW: "Nuovo",
  WORKING: "In lavorazione",
  NURTURING: "Nurturing",
  CONVERTED: "Convertito",
  DISQUALIFIED: "Non qualificato",
};

type ContactOption = { id: string; firstName: string; lastName: string | null; email: string | null };
type MemberOption = { id: string; name: string | null; email: string };

export function LeadForm({ open, onClose, lead, onSaved }: Props) {
  const isEditing = !!lead;
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [scoreVal, setScoreVal] = useState(lead?.score ?? 50);

  useEffect(() => {
    if (!open) return;
    getContacts().then((cs) => setContacts(cs.map((c) => ({ id: c.id, firstName: c.firstName, lastName: c.lastName ?? null, email: c.email ?? null }))));
    getTeamMembers().then((ms) => setMembers(ms.map((m) => ({ id: m.id, name: m.name ?? null, email: m.email }))));
    setScoreVal(lead?.score ?? 50);
  }, [open, lead?.score]);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: lead
      ? {
          title: lead.title,
          source: lead.source ?? "",
          score: lead.score,
          status: lead.status,
          email: lead.email ?? "",
          phone: lead.phone ?? "",
          notes: lead.notes ?? "",
          ownerId: lead.ownerId ?? "",
          contactId: lead.contactId ?? "",
        }
      : { title: "", source: "", score: 50, status: "NEW", email: "", phone: "", notes: "", ownerId: "", contactId: "" },
  });

  const watchedScore = watch("score");
  useEffect(() => { setScoreVal(watchedScore); }, [watchedScore]);

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

  const scoreColor = scoreVal >= 70 ? "var(--crm-success)" : scoreVal >= 40 ? "var(--crm-warning)" : "var(--crm-danger)";

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Modifica lead" : "Nuovo lead"}</SheetTitle>
        </SheetHeader>

        <SheetBody>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Titolo */}
            <div>
              <label className="block text-sm font-medium mb-1">Titolo *</label>
              <input {...register("title")} className={inputCls} placeholder="es. Richiesta demo da Mario Rossi" />
              {errors.title && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.title.message}</p>}
            </div>

            {/* Email e Telefono */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" {...register("email")} className={inputCls} placeholder="mario@acme.it" />
                {errors.email && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Telefono</label>
                <input {...register("phone")} className={inputCls} placeholder="+39 02 1234567" />
              </div>
            </div>

            {/* Sorgente e Stato */}
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

            {/* Score */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Score: <span className="font-bold" style={{ color: scoreColor }}>{scoreVal}</span>
              </label>
              <input
                type="range" min={0} max={100} step={5}
                {...register("score", { valueAsNumber: true })}
                className="w-full accent-[var(--crm-primary)]"
              />
              <div className="flex justify-between text-xs text-[var(--crm-neutral-400)] mt-1">
                <span>0 — Freddo</span><span>50</span><span>100 — Caldo</span>
              </div>
            </div>

            {/* Responsabile */}
            <div>
              <label className="block text-sm font-medium mb-1">Responsabile</label>
              <select {...register("ownerId")} className={inputCls}>
                <option value="">— Non assegnato —</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name ?? m.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Contatto collegato */}
            <div>
              <label className="block text-sm font-medium mb-1">Contatto collegato</label>
              <select {...register("contactId")} className={inputCls}>
                <option value="">— Nessun contatto —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName}{c.lastName ? ` ${c.lastName}` : ""}{c.email ? ` (${c.email})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-medium mb-1">Note</label>
              <textarea
                {...register("notes")}
                rows={3}
                className={`${inputCls} resize-none`}
                placeholder="Informazioni aggiuntive sul lead..."
              />
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
