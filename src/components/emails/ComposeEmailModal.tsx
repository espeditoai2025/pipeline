"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, FileText, Send, Save } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { sendEmail, saveDraft } from "@/server/actions/emails";
import type { EmailThread, EmailTemplate, EmailMessage } from "@/types/emails";

const schema = z.object({
  to: z.string().email("Email non valida"),
  cc: z.string().optional(),
  subject: z.string().min(1, "Oggetto obbligatorio"),
  body: z.string().min(1, "Corpo email obbligatorio"),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  replyThread?: EmailThread | null;
  templates: EmailTemplate[];
  onSent: (msg: EmailMessage) => void;
};

const inputCls = "w-full rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)]";

function applyTemplate(tpl: EmailTemplate, replyThread?: EmailThread | null): Partial<FormValues> {
  const contactName = replyThread?.contactName ?? "";
  const dealTitle = replyThread?.dealTitle ?? "";
  const today = new Date().toLocaleDateString("it-IT");
  const body = tpl.body
    .replace(/{{nome}}/g, contactName)
    .replace(/{{azienda}}/g, dealTitle)
    .replace(/{{data}}/g, today)
    .replace(/{{mittente}}/g, "Mario Rossi")
    .replace(/{{prodotto}}/g, "CRM")
    .replace(/{{oggetto}}/g, replyThread?.subject ?? "")
    .replace(/{{scadenza}}/g, "");
  return {
    subject: tpl.subject.replace(/{{azienda}}/g, dealTitle).replace(/{{prodotto}}/g, "CRM"),
    body,
  };
}

export function ComposeEmailModal({ open, onClose, replyThread, templates, onSent }: Props) {
  const [showTemplates, setShowTemplates] = useState(false);

  const lastMsg = replyThread?.messages[replyThread.messages.length - 1];
  const defaultTo = replyThread ? (lastMsg?.from === "mario@acme.com" ? lastMsg?.to[0] : lastMsg?.from) ?? "" : "";

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      to: defaultTo,
      cc: "",
      subject: replyThread ? `RE: ${replyThread.subject}` : "",
      body: "",
    },
  });

  async function onSend(data: FormValues) {
    const result = await sendEmail({
      ...data,
      dealId: replyThread?.dealId ?? undefined,
      dealTitle: replyThread?.dealTitle ?? undefined,
      contactId: replyThread?.contactId ?? undefined,
      contactName: replyThread?.contactName ?? undefined,
    });
    if (result.error) { toast.error(result.error); return; }
    toast.success("Email inviata");
    onSent(result.data!);
    reset();
    onClose();
  }

  async function handleSaveDraft() {
    const data = watch();
    const result = await saveDraft({
      ...data,
      dealId: replyThread?.dealId ?? undefined,
      dealTitle: replyThread?.dealTitle ?? undefined,
    });
    if (result.error) { toast.error(result.error); return; }
    toast.success("Bozza salvata");
    reset();
    onClose();
  }

  function applyTpl(tpl: EmailTemplate) {
    const applied = applyTemplate(tpl, replyThread);
    if (applied.subject) setValue("subject", applied.subject);
    if (applied.body) setValue("body", applied.body);
    setShowTemplates(false);
    toast.success(`Template "${tpl.name}" applicato`);
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{replyThread ? "Rispondi" : "Nuova email"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSend)} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">A *</label>
            <input {...register("to")} type="email" className={inputCls} placeholder="destinatario@esempio.it" />
            {errors.to && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.to.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">CC</label>
            <input {...register("cc")} type="email" className={inputCls} placeholder="cc@esempio.it" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium">Oggetto *</label>
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-[var(--crm-primary)] hover:underline"
                onClick={() => setShowTemplates((v) => !v)}
              >
                <FileText className="h-3 w-3" />
                {showTemplates ? "Chiudi template" : "Usa template"}
              </button>
            </div>
            <input {...register("subject")} className={inputCls} placeholder="Oggetto dell'email" />
            {errors.subject && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.subject.message}</p>}
          </div>

          {/* Template picker */}
          {showTemplates && (
            <div className="rounded-xl border border-[var(--crm-neutral-100)] overflow-hidden divide-y divide-[var(--crm-neutral-100)]">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 transition-colors"
                  onClick={() => applyTpl(tpl)}
                >
                  <FileText className="h-4 w-4 text-[var(--crm-primary)] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{tpl.name}</p>
                    <p className="text-xs text-[var(--crm-neutral-500)]">{tpl.category} · usato {tpl.usageCount} volte</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Corpo *</label>
            <textarea
              {...register("body")}
              rows={10}
              className={`${inputCls} resize-none font-mono text-xs`}
              placeholder="Scrivi il tuo messaggio..."
            />
            {errors.body && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.body.message}</p>}
          </div>

          {replyThread && (
            <div className="rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-xs text-[var(--crm-neutral-500)]">
              Risposta a: <strong>{replyThread.subject}</strong>
              {replyThread.dealTitle && <span className="ml-2">· Affare: {replyThread.dealTitle}</span>}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Annulla</Button>
            <Button
              type="button"
              variant="outline"
              className="flex items-center gap-1.5"
              onClick={handleSaveDraft}
            >
              <Save className="h-4 w-4" /> Bozza
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              Invia
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
