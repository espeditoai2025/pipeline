"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Building2, Hash, Briefcase, Users, Calendar, MapPin, Globe, User, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetBody, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { createLead, updateLead, enrichLead } from "@/server/actions/leads";
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
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichMsg, setEnrichMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    getContacts().then((cs) => setContacts(cs.map((c) => ({ id: c.id, firstName: c.firstName, lastName: c.lastName ?? null, email: c.email ?? null }))));
    getTeamMembers().then((ms) => setMembers(ms.map((m) => ({ id: m.id, name: m.name ?? null, email: m.email }))));
  }, [open]);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", source: "", score: 50, status: "NEW", email: "", phone: "", notes: "", ownerId: "", contactId: "" },
  });

  useEffect(() => {
    if (!open) return;
    const vals = lead
      ? { title: lead.title, source: lead.source ?? "", score: lead.score, status: lead.status, email: lead.email ?? "", phone: lead.phone ?? "", notes: lead.notes ?? "", ownerId: lead.ownerId ?? "", contactId: lead.contactId ?? "" }
      : { title: "", source: "", score: 50, status: "NEW" as const, email: "", phone: "", notes: "", ownerId: "", contactId: "" };
    reset(vals);
    setScoreVal(lead?.score ?? 50);
  }, [open, lead, reset]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const watchedScore = watch("score");
  useEffect(() => { setScoreVal(watchedScore); }, [watchedScore]);

  async function handleEnrich() {
    if (!lead?.id) return;
    setIsEnriching(true);
    setEnrichMsg(null);
    const result = await enrichLead(lead.id);
    setIsEnriching(false);
    if (result.error) {
      setEnrichMsg(`Errore: ${result.error}`);
      return;
    }
    const found: string[] = [];
    if (result.email) found.push(`email: ${result.email}`);
    if (result.phone) found.push(`tel: ${result.phone}`);
    setEnrichMsg(found.length > 0 ? `Trovato — ${found.join(", ")}` : "Nessuna info aggiuntiva trovata");
    if (found.length > 0) onClose();
  }

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
          {/* Dati CCIAA / Lead Finder — read only */}
          {lead?.data && Object.keys(lead.data).some(k => ["piva","ateco","nDipendenti","formaGiuridica","annoFondazione","website","sector","location","contactName","contactRole"].includes(k) && lead.data![k]) && (
            <div className="mb-4 rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-[var(--crm-neutral-50)] dark:bg-white/5 p-4 space-y-2">
              <p className="text-xs font-semibold text-[var(--crm-neutral-500)] uppercase tracking-wide flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Dati azienda (Lead Finder)
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {!!lead.data.piva && (
                  <span className="flex items-center gap-1 text-xs text-[var(--crm-neutral-700)] dark:text-[var(--crm-neutral-300)]">
                    <Hash className="h-3 w-3 shrink-0 text-[var(--crm-neutral-400)]" /> P.IVA: <strong>{String(lead.data.piva)}</strong>
                  </span>
                )}
                {!!lead.data.ateco && (
                  <span className="flex items-center gap-1 text-xs text-[var(--crm-neutral-700)] dark:text-[var(--crm-neutral-300)]">
                    <Briefcase className="h-3 w-3 shrink-0 text-[var(--crm-neutral-400)]" /> ATECO: <strong>{String(lead.data.ateco)}</strong>
                  </span>
                )}
                {!!lead.data.sector && (
                  <span className="flex items-center gap-1 text-xs text-[var(--crm-neutral-700)] dark:text-[var(--crm-neutral-300)] col-span-2">
                    <Briefcase className="h-3 w-3 shrink-0 text-[var(--crm-neutral-400)]" /> {String(lead.data.sector)}
                  </span>
                )}
                {!!lead.data.nDipendenti && (
                  <span className="flex items-center gap-1 text-xs text-[var(--crm-neutral-700)] dark:text-[var(--crm-neutral-300)]">
                    <Users className="h-3 w-3 shrink-0 text-[var(--crm-neutral-400)]" /> {String(lead.data.nDipendenti)} dip.
                  </span>
                )}
                {!!lead.data.formaGiuridica && (
                  <span className="flex items-center gap-1 text-xs text-[var(--crm-neutral-700)] dark:text-[var(--crm-neutral-300)]">
                    <Calendar className="h-3 w-3 shrink-0 text-[var(--crm-neutral-400)]" /> {String(lead.data.formaGiuridica)}
                    {!!lead.data.annoFondazione ? ` · est. ${String(lead.data.annoFondazione)}` : ""}
                  </span>
                )}
                {!!lead.data.location && (
                  <span className="flex items-center gap-1 text-xs text-[var(--crm-neutral-700)] dark:text-[var(--crm-neutral-300)] col-span-2">
                    <MapPin className="h-3 w-3 shrink-0 text-[var(--crm-neutral-400)]" /> {String(lead.data.location)}
                  </span>
                )}
                {!!lead.data.website && (
                  <a href={String(lead.data.website).startsWith("http") ? String(lead.data.website) : `https://${String(lead.data.website)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-[var(--crm-primary)] hover:underline col-span-2 truncate">
                    <Globe className="h-3 w-3 shrink-0" /> {String(lead.data.website)}
                  </a>
                )}
                {!!lead.data.contactName && (
                  <span className="flex items-center gap-1 text-xs text-[var(--crm-neutral-700)] dark:text-[var(--crm-neutral-300)] col-span-2">
                    <User className="h-3 w-3 shrink-0 text-[var(--crm-neutral-400)]" /> {String(lead.data.contactName)}
                    {!!lead.data.contactRole ? ` — ${String(lead.data.contactRole)}` : ""}
                  </span>
                )}
              </div>
            </div>
          )}

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

            {isEditing && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleEnrich}
                  disabled={isEnriching}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--crm-neutral-200)] dark:border-white/10 bg-[var(--crm-neutral-50)] dark:bg-white/5 px-3 py-2 text-sm font-medium text-[var(--crm-neutral-700)] dark:text-[var(--crm-neutral-300)] hover:bg-[var(--crm-neutral-100)] dark:hover:bg-white/10 disabled:opacity-50 transition-colors"
                >
                  {isEnriching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Aggiorna info (cerca email e telefono)
                </button>
                {enrichMsg && (
                  <p className={`mt-1.5 text-xs text-center ${enrichMsg.startsWith("Errore") ? "text-red-500" : enrichMsg.startsWith("Nessuna") ? "text-[var(--crm-neutral-500)]" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {enrichMsg}
                  </p>
                )}
              </div>
            )}

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
