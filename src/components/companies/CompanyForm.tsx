"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Building2, Globe, User, FileText } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetBody, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { createCompany, updateCompany } from "@/server/actions/contacts";
import type { Company } from "@/types/contacts";

const schema = z.object({
  name: z.string().min(1, "Nome obbligatorio"),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().url("URL non valido").optional().or(z.literal("")),
  linkedinUrl: z.string().url("URL non valido").optional().or(z.literal("")),
  industry: z.string().optional(),
  size: z.string().optional(),
  vatNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  description: z.string().optional(),
  referentName: z.string().optional(),
  referentRole: z.string().optional(),
  referentEmail: z.string().email("Email referente non valida").optional().or(z.literal("")),
  referentPhone: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  company?: Company | null;
  onSaved: (c: Company) => void;
};

const inputCls = "w-full rounded-lg border border-[var(--crm-neutral-200)] bg-white dark:bg-white/5 px-3 py-2.5 text-sm text-[var(--crm-neutral-900)] dark:text-white placeholder:text-[var(--crm-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] focus:border-transparent transition-colors";
const labelCls = "block text-xs font-medium text-[var(--crm-neutral-500)] uppercase tracking-wide mb-1.5";

const INDUSTRIES = ["Tecnologia", "Consulenza", "Manifatturiero", "Finanza", "Media", "Retail", "Sanità", "Educazione", "Logistica", "Immobiliare", "Altro"];
const SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"];
const COUNTRIES = ["Italia", "Francia", "Germania", "Spagna", "UK", "USA", "Svizzera", "Altro"];

type Tab = "generale" | "referente" | "note";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "generale", label: "Generale", icon: Building2 },
  { id: "referente", label: "Referente", icon: User },
  { id: "note", label: "Note", icon: FileText },
];

export function CompanyForm({ open, onClose, company, onSaved }: Props) {
  const isEditing = !!company;
  const [activeTab, setActiveTab] = useState<Tab>("generale");

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: company ? {
      name: company.name,
      email: company.email ?? "",
      phone: company.phone ?? "",
      website: company.website ?? "",
      linkedinUrl: company.linkedinUrl ?? "",
      industry: company.industry ?? "",
      size: company.size ?? "",
      vatNumber: company.vatNumber ?? "",
      address: company.address ?? "",
      city: company.city ?? "",
      country: company.country ?? "",
      description: company.description ?? "",
      referentName: company.referentName ?? "",
      referentRole: company.referentRole ?? "",
      referentEmail: company.referentEmail ?? "",
      referentPhone: company.referentPhone ?? "",
    } : {
      name: "", email: "", phone: "", website: "", linkedinUrl: "",
      industry: "", size: "", vatNumber: "", address: "", city: "",
      country: "", description: "", referentName: "", referentRole: "",
      referentEmail: "", referentPhone: "",
    },
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
      setActiveTab("generale");
      onClose();
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) { onClose(); setActiveTab("generale"); } }}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Modifica azienda" : "Nuova azienda"}</SheetTitle>
        </SheetHeader>

        {/* Tab bar */}
        <div className="flex border-b border-[var(--crm-neutral-100)] dark:border-white/10 px-6">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === id
                  ? "border-[var(--crm-primary)] text-[var(--crm-primary)]"
                  : "border-transparent text-[var(--crm-neutral-500)] hover:text-[var(--crm-neutral-700)]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <SheetBody>
          <form id="company-form" onSubmit={handleSubmit(onSubmit)}>

            {/* ── GENERALE ─────────────────────────────────────── */}
            {activeTab === "generale" && (
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Nome azienda *</label>
                  <input {...register("name")} className={inputCls} placeholder="Acme S.r.l." />
                  {errors.name && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.name.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Email aziendale</label>
                    <input type="email" {...register("email")} className={inputCls} placeholder="info@azienda.it" />
                    {errors.email && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.email.message}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>Telefono</label>
                    <input {...register("phone")} className={inputCls} placeholder="+39 02 1234567" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Settore</label>
                    <select {...register("industry")} className={inputCls}>
                      <option value="">Seleziona...</option>
                      {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Dimensioni</label>
                    <select {...register("size")} className={inputCls}>
                      <option value="">Seleziona...</option>
                      {SIZES.map((s) => <option key={s} value={s}>{s} dipendenti</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Partita IVA</label>
                  <input {...register("vatNumber")} className={inputCls} placeholder="IT12345678901" />
                </div>

                <div className="pt-1 border-t border-[var(--crm-neutral-100)] dark:border-white/10">
                  <p className="text-xs font-semibold text-[var(--crm-neutral-400)] uppercase tracking-wide mb-3 pt-3">Web & Social</p>
                  <div className="space-y-3">
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--crm-neutral-400)]" />
                      <input {...register("website")} className={`${inputCls} pl-9`} placeholder="https://azienda.it" />
                      {errors.website && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.website.message}</p>}
                    </div>
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--crm-neutral-400)]" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/></svg>
                      <input {...register("linkedinUrl")} className={`${inputCls} pl-9`} placeholder="https://linkedin.com/company/..." />
                      {errors.linkedinUrl && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.linkedinUrl.message}</p>}
                    </div>
                  </div>
                </div>

                <div className="pt-1 border-t border-[var(--crm-neutral-100)] dark:border-white/10">
                  <p className="text-xs font-semibold text-[var(--crm-neutral-400)] uppercase tracking-wide mb-3 pt-3">Indirizzo</p>
                  <div className="space-y-3">
                    <input {...register("address")} className={inputCls} placeholder="Via Roma 1" />
                    <div className="grid grid-cols-2 gap-3">
                      <input {...register("city")} className={inputCls} placeholder="Milano" />
                      <select {...register("country")} className={inputCls}>
                        <option value="">Paese...</option>
                        {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── REFERENTE ────────────────────────────────────── */}
            {activeTab === "referente" && (
              <div className="space-y-4">
                <div className="rounded-xl bg-[var(--crm-primary)]/5 border border-[var(--crm-primary)]/15 px-4 py-3 text-sm text-[var(--crm-neutral-600)] dark:text-[var(--crm-neutral-300)]">
                  Il referente è la persona di contatto principale per questa azienda.
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Nome referente</label>
                    <input {...register("referentName")} className={inputCls} placeholder="Mario Rossi" />
                  </div>
                  <div>
                    <label className={labelCls}>Ruolo / Qualifica</label>
                    <input {...register("referentRole")} className={inputCls} placeholder="Direttore commerciale" />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Email referente</label>
                  <input type="email" {...register("referentEmail")} className={inputCls} placeholder="mario.rossi@azienda.it" />
                  {errors.referentEmail && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.referentEmail.message}</p>}
                </div>

                <div>
                  <label className={labelCls}>Telefono referente</label>
                  <input {...register("referentPhone")} className={inputCls} placeholder="+39 333 1234567" />
                </div>
              </div>
            )}

            {/* ── NOTE ─────────────────────────────────────────── */}
            {activeTab === "note" && (
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Note interne</label>
                  <textarea
                    {...register("description")}
                    rows={10}
                    className={`${inputCls} resize-none`}
                    placeholder="Inserisci note, contesto, informazioni utili sull'azienda..."
                  />
                </div>
              </div>
            )}
          </form>
        </SheetBody>

        <div className="px-6 py-4 border-t border-[var(--crm-neutral-100)] dark:border-white/10 flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Annulla</Button>
          <Button form="company-form" type="submit" disabled={isSubmitting} className="flex-1 bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? "Salva modifiche" : "Crea azienda"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
