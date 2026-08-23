"use client";

import { useState } from "react";
import { FileText, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { createInvoiceFromDeal, generateFatturaPAXml } from "@/server/actions/invoices";

const inputCls = "w-full rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--crm-primary)]";

type Props = {
  dealId: string;
  contactName?: string;
  companyName?: string;
  open: boolean;
  onClose: () => void;
};

export function CreateInvoiceModal({ dealId, contactName, companyName, open, onClose }: Props) {
  const [saving, setSaving] = useState(false);
  const [recipientName, setRecipientName] = useState(companyName ?? contactName ?? "");
  const [recipientVat, setRecipientVat] = useState("");
  const [recipientSdi, setRecipientSdi] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [recipientCity, setRecipientCity] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bonifico");
  const [paymentTerms, setPaymentTerms] = useState("30gg");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  if (!open) return null;

  async function handleCreate() {
    if (!recipientName.trim()) { toast.error("Inserisci il nome del destinatario"); return; }
    if (!recipientVat.trim()) { toast.error("Inserisci la P.IVA del destinatario"); return; }

    setSaving(true);
    const res = await createInvoiceFromDeal({
      dealId,
      recipientName: recipientName.trim(),
      recipientVat: recipientVat.trim(),
      recipientSdi: recipientSdi.trim() || undefined,
      recipientAddress: recipientAddress.trim() || undefined,
      recipientCity: recipientCity.trim() || undefined,
      paymentMethod,
      paymentTerms,
      dueDate: dueDate || undefined,
      notes: notes.trim() || undefined,
    });

    if (res.error) {
      toast.error(res.error);
      setSaving(false);
      return;
    }

    toast.success(`Fattura ${res.data!.number} creata!`);

    // Auto-download XML
    const xmlRes = await generateFatturaPAXml(res.data!.id);
    if (xmlRes.xml && xmlRes.filename) {
      const blob = new Blob([xmlRes.xml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = xmlRes.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("XML FatturaPA scaricato!");
    }

    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--crm-neutral-100)] px-5 py-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[var(--crm-primary)]" />
            <h2 className="text-base font-semibold">Genera Fattura Elettronica</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-[var(--crm-neutral-50)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <p className="text-xs text-[var(--crm-neutral-500)]">
            I dati dell&apos;emittente vengono dalle impostazioni azienda. I prodotti vengono dall&apos;affare.
          </p>

          <div>
            <label className="block text-xs font-medium text-[var(--crm-neutral-600)] mb-1">Ragione sociale destinatario *</label>
            <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className={inputCls} placeholder="Azienda SRL" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--crm-neutral-600)] mb-1">P.IVA destinatario *</label>
              <input value={recipientVat} onChange={(e) => setRecipientVat(e.target.value)} className={inputCls} placeholder="01234567890" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--crm-neutral-600)] mb-1">Codice SDI / PEC</label>
              <input value={recipientSdi} onChange={(e) => setRecipientSdi(e.target.value)} className={inputCls} placeholder="M5UXCR1 o pec@email.it" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--crm-neutral-600)] mb-1">Indirizzo</label>
              <input value={recipientAddress} onChange={(e) => setRecipientAddress(e.target.value)} className={inputCls} placeholder="Via Roma 1" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--crm-neutral-600)] mb-1">Città</label>
              <input value={recipientCity} onChange={(e) => setRecipientCity(e.target.value)} className={inputCls} placeholder="Milano" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--crm-neutral-600)] mb-1">Metodo di pagamento</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={inputCls}>
                <option value="bonifico">Bonifico bancario</option>
                <option value="carta">Carta di credito</option>
                <option value="contanti">Contanti</option>
                <option value="assegno">Assegno</option>
                <option value="rid">RID / SDD</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--crm-neutral-600)] mb-1">Termini di pagamento</label>
              <select value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className={inputCls}>
                <option value="immediato">Immediato</option>
                <option value="30gg">30 giorni</option>
                <option value="60gg">60 giorni</option>
                <option value="90gg">90 giorni</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--crm-neutral-600)] mb-1">Data scadenza</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--crm-neutral-600)] mb-1">Note / Causale</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} placeholder="Note opzionali per la fattura..." />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-[var(--crm-neutral-100)] px-5 py-4">
          <button onClick={onClose} className="flex-1 rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm hover:bg-[var(--crm-neutral-50)] transition-colors">
            Annulla
          </button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="flex-1 rounded-lg bg-[var(--crm-primary)] text-white px-3 py-2 text-sm font-medium hover:bg-[var(--crm-primary-dark)] disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Genera fattura + XML
          </button>
        </div>
      </div>
    </div>
  );
}
