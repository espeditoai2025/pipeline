"use client";

import { useState, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createInvoiceFromDeal } from "@/server/actions/invoices";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody } from "@/components/ui/sheet";
import { defaultInvoiceDueDate, paymentMethods } from "@/lib/invoice-utils";

const inputCls = "w-full rounded-lg border border-[var(--crm-neutral-100)] bg-transparent px-3 py-2 text-sm";
type Props = { dealId: string; contactName?: string; companyName?: string; open: boolean; onClose: () => void };

export function CreateInvoiceModal({ dealId, contactName, companyName, open, onClose }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const [terms, setTerms] = useState("30gg");
  const [dueDate, setDueDate] = useState(() => defaultInvoiceDueDate("30gg"));
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const form = new FormData(event.currentTarget);
    submitting.current = true; setSaving(true); setError(null);
    try {
      const result = await createInvoiceFromDeal({
        dealId, recipientName: String(form.get("recipientName") ?? ""),
        recipientVat: String(form.get("recipientVat") ?? ""),
        recipientAddress: String(form.get("recipientAddress") ?? ""),
        recipientCity: String(form.get("recipientCity") ?? ""),
        paymentMethod: String(form.get("paymentMethod") ?? "bonifico"),
        paymentTerms: terms, dueDate, notes: String(form.get("notes") ?? ""),
      });
      if (result.error || !result.data) { setError(result.error ?? "Creazione non riuscita"); return; }
      toast.success(`Bozza ${result.data.number} creata`);
      onClose(); router.push(`/invoices/${result.data.id}`); router.refresh();
    } catch { setError("Creazione non confermata. Controlla l'elenco fatture prima di riprovare."); }
    finally { submitting.current = false; setSaving(false); }
  }
  return <Sheet open={open} onOpenChange={value => { if (!value && !saving) onClose(); }}>
    <SheetContent className="w-full sm:max-w-lg" showCloseButton={!saving}>
      <SheetHeader><SheetTitle>Crea bozza fattura</SheetTitle><SheetDescription>Prodotti, prezzi e valuta provengono dall’affare. L’emissione si completa nel tuo servizio di fatturazione.</SheetDescription></SheetHeader>
      <SheetBody><form onSubmit={submit} className="space-y-4">
        <label className="block space-y-1 text-sm">Cliente / ragione sociale *<input autoFocus required name="recipientName" maxLength={200} defaultValue={companyName ?? contactName ?? ""} className={inputCls} /></label>
        <label className="block space-y-1 text-sm">Partita IVA o codice fiscale<input name="recipientVat" maxLength={32} className={inputCls} /></label>
        <label className="block space-y-1 text-sm">Indirizzo<input name="recipientAddress" maxLength={200} className={inputCls} /></label>
        <label className="block space-y-1 text-sm">Città<input name="recipientCity" maxLength={100} className={inputCls} /></label>
        <label className="block space-y-1 text-sm">Metodo di pagamento<select name="paymentMethod" defaultValue="bonifico" className={inputCls}>{Object.entries(paymentMethods).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="block space-y-1 text-sm">Termini di pagamento<select value={terms} onChange={e => { setTerms(e.target.value); setDueDate(defaultInvoiceDueDate(e.target.value)); }} className={inputCls}><option value="immediato">Immediato</option><option value="30gg">30 giorni</option><option value="60gg">60 giorni</option><option value="90gg">90 giorni</option></select></label>
        <label className="block space-y-1 text-sm">Data scadenza *<input required type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputCls} /></label>
        <label className="block space-y-1 text-sm">Note<textarea name="notes" rows={3} maxLength={2000} className={inputCls} /></label>
        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
        <button disabled={saving} className="w-full rounded-lg bg-[var(--crm-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? "Creazione…" : "Crea bozza"}</button>
      </form></SheetBody>
    </SheetContent>
  </Sheet>;
}
