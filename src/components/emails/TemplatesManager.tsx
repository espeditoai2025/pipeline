"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { createTemplate, updateTemplate, deleteTemplate } from "@/server/actions/emails";
import type { EmailTemplate } from "@/types/emails";

type Props = {
  initialTemplates: EmailTemplate[];
};

const schema = z.object({
  name: z.string().min(1, "Nome obbligatorio"),
  subject: z.string().min(1, "Oggetto obbligatorio"),
  body: z.string().min(1, "Corpo obbligatorio"),
  category: z.string().min(1, "Categoria obbligatoria"),
});

type FormValues = z.infer<typeof schema>;

const inputCls = "w-full rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)]";
const CATEGORIES = ["Vendita", "Follow-up", "Chiusura", "Onboarding", "Supporto", "Altro"];

const VARIABLE_HINTS = ["{{nome}}", "{{azienda}}", "{{data}}", "{{prodotto}}", "{{mittente}}", "{{oggetto}}", "{{scadenza}}"];

export function TemplatesManager({ initialTemplates }: Props) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: editing
      ? { name: editing.name, subject: editing.subject, body: editing.body, category: editing.category }
      : { name: "", subject: "", body: "", category: "Vendita" },
  });

  function openCreate() {
    setEditing(null);
    reset({ name: "", subject: "", body: "", category: "Vendita" });
    setFormOpen(true);
  }

  function openEdit(tpl: EmailTemplate) {
    setEditing(tpl);
    reset({ name: tpl.name, subject: tpl.subject, body: tpl.body, category: tpl.category });
    setFormOpen(true);
  }

  async function onSubmit(data: FormValues) {
    const result = editing
      ? await updateTemplate({ id: editing.id, ...data })
      : await createTemplate(data);

    if (result.error) { toast.error(result.error); return; }
    toast.success(editing ? "Template aggiornato" : "Template creato");
    setTemplates((prev) =>
      editing ? prev.map((t) => t.id === result.data!.id ? result.data! : t) : [result.data!, ...prev]
    );
    setFormOpen(false);
    setEditing(null);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Eliminare il template "${name}"?`)) return;
    const res = await deleteTemplate(id);
    if (res.error) { toast.error(res.error); return; }
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    toast.success("Template eliminato");
  }

  const byCategory = templates.reduce<Record<string, EmailTemplate[]>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category]!.push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--crm-neutral-500)]">{templates.length} template disponibili</p>
        <Button size="sm" className="bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" /> Nuovo template
        </Button>
      </div>

      {Object.entries(byCategory).map(([category, items]) => (
        <div key={category}>
          <h3 className="text-xs font-semibold text-[var(--crm-neutral-500)] uppercase tracking-wide mb-2">{category}</h3>
          <div className="space-y-2">
            {items.map((tpl) => (
              <div key={tpl.id} className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <FileText className="h-4 w-4 text-[var(--crm-primary)] mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{tpl.name}</p>
                      <p className="text-xs text-[var(--crm-neutral-500)] mt-0.5 truncate">{tpl.subject}</p>
                      <p className="text-xs text-[var(--crm-neutral-400)] mt-1">Usato {tpl.usageCount} volte</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button className="p-1.5 rounded hover:bg-[var(--crm-neutral-100)] text-[var(--crm-neutral-500)]" onClick={() => openEdit(tpl)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button className="p-1.5 rounded hover:bg-red-50 text-[var(--crm-neutral-500)] hover:text-[var(--crm-danger)]" onClick={() => handleDelete(tpl.id, tpl.name)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 rounded-lg bg-[var(--crm-neutral-50)] dark:bg-white/5 px-3 py-2 text-xs text-[var(--crm-neutral-600)] font-mono whitespace-pre-wrap line-clamp-3">
                  {tpl.body}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <Sheet open={formOpen} onOpenChange={(v) => !v && setFormOpen(false)}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editing ? "Modifica template" : "Nuovo template"}</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Nome *</label>
                <input {...register("name")} className={inputCls} placeholder="Prima proposta" />
                {errors.name && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Categoria *</label>
                <select {...register("category")} className={inputCls}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Oggetto *</label>
              <input {...register("subject")} className={inputCls} placeholder="es. Proposta {{azienda}}" />
              {errors.subject && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.subject.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Corpo *</label>
              <textarea {...register("body")} rows={10} className={`${inputCls} resize-none font-mono text-xs`} placeholder="Gentile {{nome}}..." />
              {errors.body && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.body.message}</p>}
            </div>

            <div className="rounded-lg border border-[var(--crm-neutral-100)] p-3">
              <p className="text-xs font-medium text-[var(--crm-neutral-600)] mb-1.5">Variabili disponibili:</p>
              <div className="flex flex-wrap gap-1.5">
                {VARIABLE_HINTS.map((v) => (
                  <code key={v} className="rounded bg-[var(--crm-neutral-100)] px-1.5 py-0.5 text-xs text-[var(--crm-primary)]">{v}</code>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setFormOpen(false)}>Annulla</Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1 bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Salva" : "Crea"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
