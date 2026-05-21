"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, FileText, Loader2, Library } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetBody, SheetTitle } from "@/components/ui/sheet";
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

const inputCls = "w-full rounded-lg border border-[var(--crm-neutral-200)] bg-white dark:bg-white/5 px-3 py-2.5 text-sm text-[var(--crm-neutral-900)] dark:text-white placeholder:text-[var(--crm-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] focus:border-transparent transition-colors";
const CATEGORIES = ["Vendita", "Follow-up", "Chiusura", "Onboarding", "Supporto", "Altro"];

const VARIABLE_HINTS = ["{{nome}}", "{{azienda}}", "{{data}}", "{{prodotto}}", "{{mittente}}", "{{oggetto}}", "{{scadenza}}"];

const PRESET_TEMPLATES = [
  {
    name: "Benvenuto nuovo cliente",
    subject: "Benvenuto in {{azienda}}!",
    body: "Ciao {{nome}},\n\nGrazie per aver scelto {{azienda}}! Siamo felici di averti a bordo.\n\nIl tuo referente dedicato è {{mittente}} — non esitare a scriverci per qualsiasi esigenza.\n\nA presto,\n{{mittente}}",
    category: "Onboarding",
  },
  {
    name: "Follow-up dopo call",
    subject: "Riepilogo della nostra chiamata",
    body: "Ciao {{nome}},\n\nGrazie per il tempo dedicato alla nostra chiamata di oggi.\n\nCome discusso, ti riepilogo i punti principali:\n- [Punto 1]\n- [Punto 2]\n- [Prossimi passi]\n\nResto a disposizione per qualsiasi domanda.\n\nCordiali saluti,\n{{mittente}}",
    category: "Follow-up",
  },
  {
    name: "Proposta commerciale",
    subject: "Proposta per {{azienda}} — {{prodotto}}",
    body: "Gentile {{nome}},\n\nA seguito del nostro incontro, Le invio la proposta commerciale per {{prodotto}}.\n\nL'offerta include:\n- [Descrizione servizio/prodotto]\n- [Prezzo e condizioni]\n- Validità: {{scadenza}}\n\nResto a disposizione per un incontro di approfondimento.\n\nCordiali saluti,\n{{mittente}}",
    category: "Vendita",
  },
  {
    name: "Promemoria pagamento",
    subject: "Promemoria: fattura in scadenza",
    body: "Gentile {{nome}},\n\nLe ricordiamo che la fattura n. [numero] con scadenza {{scadenza}} risulta ancora in attesa di pagamento.\n\nLa preghiamo di provvedere al saldo al più presto.\n\nPer qualsiasi chiarimento, non esiti a contattarci.\n\nCordiali saluti,\n{{mittente}}",
    category: "Follow-up",
  },
  {
    name: "Richiesta feedback",
    subject: "Come è andata? Il tuo feedback è importante",
    body: "Ciao {{nome}},\n\nSperiamo che tu sia soddisfatto di {{prodotto}}!\n\nCi farebbe molto piacere avere un tuo feedback. Bastano 2 minuti:\n\n[Link al sondaggio]\n\nGrazie mille per il tuo tempo!\n\n{{mittente}}",
    category: "Supporto",
  },
  {
    name: "Upsell / Cross-sell",
    subject: "{{nome}}, scopri cosa abbiamo preparato per te",
    body: "Ciao {{nome}},\n\nCome cliente di {{azienda}}, abbiamo pensato a un'offerta esclusiva per te.\n\n[Descrizione offerta]\n\nL'offerta è valida fino al {{scadenza}}.\n\nVuoi saperne di più? Rispondi a questa email o prenota una call.\n\nA presto,\n{{mittente}}",
    category: "Vendita",
  },
  {
    name: "Re-engagement contatto freddo",
    subject: "È passato un po'... ci manchi!",
    body: "Ciao {{nome}},\n\nÈ passato un po' dall'ultima volta che ci siamo sentiti.\n\nNel frattempo, abbiamo introdotto novità interessanti che potrebbero fare al caso tuo:\n- [Novità 1]\n- [Novità 2]\n\nTi va di fare una breve call per aggiornarci?\n\n{{mittente}}",
    category: "Follow-up",
  },
  {
    name: "Conferma appuntamento",
    subject: "Conferma appuntamento del {{data}}",
    body: "Ciao {{nome}},\n\nTi confermo il nostro appuntamento:\n\n📅 Data: {{data}}\n⏰ Ora: [ora]\n📍 Luogo: [luogo / link videocall]\n\nSe hai bisogno di spostare, rispondi a questa email.\n\nA presto,\n{{mittente}}",
    category: "Supporto",
  },
  {
    name: "Chiusura affare — prossimi step",
    subject: "Siamo ufficiali! Ecco i prossimi passi",
    body: "Ciao {{nome}},\n\nSiamo felici di confermare la chiusura dell'accordo per {{prodotto}}!\n\nEcco i prossimi passi:\n1. [Passo 1 — es. firma contratto]\n2. [Passo 2 — es. onboarding]\n3. [Passo 3 — es. prima consegna]\n\nIl tuo referente dedicato sarà {{mittente}}.\n\nBenvenuto a bordo!\n{{mittente}}",
    category: "Chiusura",
  },
  {
    name: "Invito evento / webinar",
    subject: "Sei invitato: [Nome evento] il {{data}}",
    body: "Ciao {{nome}},\n\nTi invitiamo a [nome evento/webinar] organizzato da {{azienda}}.\n\n📅 {{data}}\n⏰ [ora]\n📍 [luogo / link]\n\nArgomenti:\n- [Topic 1]\n- [Topic 2]\n\nI posti sono limitati — registrati subito!\n\n[Link registrazione]\n\nA presto,\n{{mittente}}",
    category: "Vendita",
  },
];

export function TemplatesManager({ initialTemplates }: Props) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);

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
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setLibraryOpen(true)}>
            <Library className="h-4 w-4 mr-1.5" /> Template pronti
          </Button>
          <Button size="sm" className="bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" /> Nuovo template
          </Button>
        </div>
      </div>

      {/* Preset Library Sheet */}
      <Sheet open={libraryOpen} onOpenChange={setLibraryOpen}>
        <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Libreria Template Pronti</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <p className="text-xs text-[var(--crm-neutral-500)] mb-4">
              Seleziona un template per importarlo. Potrai personalizzarlo dopo.
            </p>
            <div className="space-y-3">
              {PRESET_TEMPLATES.map((preset) => (
                <div key={preset.name} className="rounded-lg border border-[var(--crm-neutral-100)] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{preset.name}</p>
                      <p className="text-xs text-[var(--crm-neutral-500)] mt-0.5">
                        <span className="bg-[var(--crm-neutral-100)] dark:bg-white/10 rounded px-1.5 py-0.5 text-[10px] font-medium">{preset.category}</span>
                        {" · "}{preset.subject}
                      </p>
                      <p className="text-xs text-[var(--crm-neutral-400)] mt-1 line-clamp-2">{preset.body.slice(0, 120)}...</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={importing === preset.name}
                      onClick={async () => {
                        setImporting(preset.name);
                        const res = await createTemplate(preset);
                        setImporting(null);
                        if (res.error) { toast.error(res.error); return; }
                        setTemplates((prev) => [res.data!, ...prev]);
                        toast.success(`"${preset.name}" importato!`);
                      }}
                    >
                      {importing === preset.name ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>

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

          <SheetBody>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}
