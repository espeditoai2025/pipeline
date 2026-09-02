"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetBody, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { createCampaign, updateCampaign } from "@/server/actions/campaigns";
import { UpgradeModal } from "@/components/shared/UpgradeModal";
import { isPlanError } from "@/lib/plan-client";
import type { EmailCampaign, EmailList, EmailTemplate } from "@/types/emails";

const schema = z.object({
  name: z.string().min(1, "Nome obbligatorio"),
  subject: z.string().min(1, "Oggetto obbligatorio"),
  body: z.string().min(1, "Corpo obbligatorio"),
  fromName: z.string().optional(),
  listId: z.string().min(1, "Seleziona una lista"),
  scheduledAt: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const inputCls = "w-full rounded-lg border border-[var(--crm-neutral-200)] bg-white dark:bg-white/5 px-3 py-2.5 text-sm text-[var(--crm-neutral-900)] dark:text-white placeholder:text-[var(--crm-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] focus:border-transparent transition-colors";

type Props = {
  open: boolean;
  onClose: () => void;
  campaign?: EmailCampaign | null;
  lists: EmailList[];
  templates: EmailTemplate[];
  onSaved: (c: EmailCampaign) => void;
};

const PLACEHOLDERS = [
  { token: "{{nome}}", label: "Nome contatto" },
  { token: "{{cognome}}", label: "Cognome" },
  { token: "{{email}}", label: "Email contatto" },
];

export function CampaignForm({ open, onClose, campaign, lists, templates, onSaved }: Props) {
  const isEditing = !!campaign;
  const [upgradeMsg, setUpgradeMsg] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: campaign
      ? { name: campaign.name, subject: campaign.subject, body: campaign.body, fromName: campaign.fromName ?? "", listId: campaign.listId, scheduledAt: campaign.scheduledAt?.slice(0, 16) ?? "" }
      : { name: "", subject: "", body: "", fromName: "", listId: "", scheduledAt: "" },
  });

  useEffect(() => {
    if (open) {
      reset(campaign
        ? { name: campaign.name, subject: campaign.subject, body: campaign.body, fromName: campaign.fromName ?? "", listId: campaign.listId, scheduledAt: campaign.scheduledAt?.slice(0, 16) ?? "" }
        : { name: "", subject: "", body: "", fromName: "", listId: "", scheduledAt: "" }
      );
    }
  }, [open, campaign, reset]);

  function applyTemplate(tpl: EmailTemplate) {
    setValue("subject", tpl.subject);
    setValue("body", tpl.body);
  }

  async function onSubmit(data: FormValues) {
    const result = isEditing
      ? await updateCampaign(campaign!.id, data)
      : await createCampaign(data);

    if (result.error) {
      if (isPlanError(result.error)) setUpgradeMsg(result.error);
      else toast.error(result.error);
      return;
    }
    toast.success(isEditing ? "Campagna aggiornata" : "Campagna creata");
    onSaved(result.data!);
    onClose();
  }

  return (
    <>
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Modifica campagna" : "Nuova campagna"}</SheetTitle>
        </SheetHeader>

        <SheetBody>
          <form id="campaign-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Nome campagna *</label>
              <input {...register("name")} className={inputCls} placeholder="es. Newsletter Maggio 2025" />
              {errors.name && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Lista destinatari *</label>
              <select {...register("listId")} className={inputCls}>
                <option value="">Seleziona una lista...</option>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>{l.name} ({l.contactCount} contatti)</option>
                ))}
              </select>
              {errors.listId && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.listId.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Nome mittente</label>
              <input {...register("fromName")} className={inputCls} placeholder="es. Mario Rossi" />
            </div>

            {templates.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1.5">Usa template (opzionale)</label>
                <select
                  className={inputCls}
                  onChange={(e) => {
                    const tpl = templates.find((t) => t.id === e.target.value);
                    if (tpl) applyTemplate(tpl);
                    e.target.value = "";
                  }}
                  defaultValue=""
                >
                  <option value="">Scegli un template...</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1.5">Oggetto email *</label>
              <input {...register("subject")} className={inputCls} placeholder="Oggetto dell'email" />
              {errors.subject && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.subject.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium">Corpo email *</label>
                <div className="flex gap-1">
                  {PLACEHOLDERS.map((p) => (
                    <button
                      key={p.token}
                      type="button"
                      // eslint-disable-next-line react-hooks/incompatible-library
                      onClick={() => setValue("body", (watch("body") ?? "") + p.token)}
                      className="text-xs px-2 py-0.5 rounded border border-[var(--crm-neutral-200)] text-[var(--crm-neutral-600)] hover:bg-[var(--crm-neutral-50)] transition-colors"
                      title={p.label}
                    >
                      {p.token}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                {...register("body")}
                rows={10}
                className={`${inputCls} resize-none font-mono text-xs`}
                placeholder="Scrivi il corpo dell'email..."
              />
              {errors.body && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.body.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Programmazione invio (opzionale)</label>
              <input {...register("scheduledAt")} type="datetime-local" className={inputCls} />
              <p className="mt-1 text-xs text-[var(--crm-neutral-400)]">Lascia vuoto per salvare come bozza e inviare manualmente</p>
            </div>
          </form>
        </SheetBody>

        <div className="px-6 py-4 border-t border-[var(--crm-neutral-100)] dark:border-white/10 flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Annulla</Button>
          <Button form="campaign-form" type="submit" disabled={isSubmitting} className="flex-1 bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? "Salva" : "Crea campagna"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
    {upgradeMsg && <UpgradeModal message={upgradeMsg} onClose={() => setUpgradeMsg(null)} />}
    </>
  );
}
