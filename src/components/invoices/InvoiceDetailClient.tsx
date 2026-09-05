"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody, SheetDescription } from "@/components/ui/sheet";
import { recordInvoicePayment, updateInvoiceDueDate, voidInvoicePayment } from "@/server/actions/invoice-workspace";
import { updateInvoiceStatus, type InvoiceDetail } from "@/server/actions/invoices";
import { currencyDigits, invoiceDate, invoiceMoney, paymentMethods, todayInItaly } from "@/lib/invoice-utils";
import { InvoiceStatus } from "./InvoiceWorkspace";

const inputClass = "w-full rounded-lg border border-[var(--crm-neutral-100)] bg-transparent px-3 py-2 text-sm";
const primaryClass = "inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--crm-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50";

function PaymentForm({ invoice, onClose }: { invoice: InvoiceDetail; onClose: () => void }) {
  const router = useRouter();
  const [requestId] = useState(() => crypto.randomUUID());
  const [amount, setAmount] = useState(invoice.balance.toFixed(currencyDigits(invoice.currency)).replace(".", ","));
  const [paidOn, setPaidOn] = useState(todayInItaly());
  const [method, setMethod] = useState<keyof typeof paymentMethods>("bonifico");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError(null);
    try {
      const result = await recordInvoicePayment({ invoiceId: invoice.id, requestId, amount, paidOn, method, reference });
      if (result.error) { setError(result.error); return; }
      toast.success("Incasso registrato"); router.refresh(); onClose();
    } catch { setError("Salvataggio non confermato. Riprova senza chiudere il modulo per evitare duplicati."); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <Sheet open onOpenChange={open => { if (!open && !busy) onClose(); }}><SheetContent className="w-full sm:max-w-lg" showCloseButton={!busy}><SheetHeader><SheetTitle>Registra incasso</SheetTitle><SheetDescription>{invoice.number} · {invoice.recipientName}</SheetDescription></SheetHeader><SheetBody>
    <form onSubmit={submit} className="space-y-5">
      <div className="rounded-xl bg-[var(--crm-neutral-50)] p-4"><p className="text-sm text-[var(--crm-neutral-500)]">Saldo residuo</p><p className="text-2xl font-semibold">{invoiceMoney(invoice.balance, invoice.currency)}</p></div>
      <label className="block space-y-1 text-sm">Importo incassato ({invoice.currency})<input autoFocus required inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} className={inputClass} /></label>
      <p className="-mt-3 text-xs text-[var(--crm-neutral-500)]">Inserisci l’acconto ricevuto oppure l’intero saldo. Usa la virgola per i decimali.</p>
      <label className="block space-y-1 text-sm">Data incasso<input required type="date" max={todayInItaly()} value={paidOn} onChange={e => setPaidOn(e.target.value)} className={inputClass} /></label>
      <label className="block space-y-1 text-sm">Metodo<select value={method} onChange={e => setMethod(e.target.value as keyof typeof paymentMethods)} className={inputClass}>{Object.entries(paymentMethods).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>
      <label className="block space-y-1 text-sm">Riferimento (facoltativo)<input value={reference} onChange={e => setReference(e.target.value)} maxLength={250} placeholder="Es. acconto o riferimento bonifico" className={inputClass} /></label>
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      <button disabled={busy} className={`${primaryClass} w-full`}>{busy ? "Registrazione…" : "Conferma incasso"}</button>
    </form>
  </SheetBody></SheetContent></Sheet>;
}

export function InvoiceDetailClient({ invoice, canWrite }: { invoice: InvoiceDetail; canWrite: boolean }) {
  const router = useRouter();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [voiding, setVoiding] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  async function run(operation: () => Promise<{ error: string | null }>, message: string) {
    if (pending.current) return;
    pending.current = true; setBusy(true);
    try {
      const result = await operation();
      if (result.error) { toast.error(result.error); return; }
      toast.success(message); setVoiding(null); setReason(""); router.refresh();
    } catch { toast.error("Operazione non riuscita. Riprova."); }
    finally { pending.current = false; setBusy(false); }
  }
  return <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
    <Link href="/invoices" className="inline-flex items-center gap-2 text-sm text-[var(--crm-neutral-500)]"><ArrowLeft className="h-4 w-4" /> Fatture e incassi</Link>
    <header className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-semibold">{invoice.number}</h1><InvoiceStatus status={invoice.status} partial={invoice.paidAmount > 0} /></div><p className="mt-2">{invoice.recipientName}</p><p className="mt-1 text-sm text-[var(--crm-neutral-500)]">Data documento {invoiceDate(invoice.issueDate)}</p></div>
      {canWrite && invoice.status === "SENT" && <button className={primaryClass} onClick={() => setPaymentOpen(true)}><Plus className="h-4 w-4" /> Registra incasso</button>}
    </header>
    {invoice.status === "DRAFT" && <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p>Questa è una bozza. Completa l’emissione nel tuo servizio di fatturazione e poi aggiorna lo stato qui. Il pulsante non invia documenti al cliente o allo SdI.</p>{canWrite && <div className="flex flex-wrap gap-3"><button disabled={busy} onClick={() => run(() => updateInvoiceStatus(invoice.id, "SENT"), "Fattura segnata come inviata")} className={primaryClass}>Segna come inviata</button><button disabled={busy} className="px-3 py-2 text-sm underline" onClick={() => { if (window.confirm("Annullare questa bozza? Il numero e i dati restano nello storico.")) void run(() => updateInvoiceStatus(invoice.id, "CANCELLED"), "Bozza annullata"); }}>Annulla bozza</button></div>}</div>}
    <div className="grid gap-3 sm:grid-cols-3">{[["Totale documento", invoice.total], ["Incassato", invoice.paidAmount], [invoice.status === "DRAFT" || invoice.status === "CANCELLED" ? "Da incassare (esclusa)" : "Saldo residuo", invoice.status === "DRAFT" || invoice.status === "CANCELLED" ? 0 : invoice.balance]].map(([label, amount]) => <div key={label} className="rounded-xl border border-[var(--crm-neutral-100)] bg-white p-5 dark:bg-white/5"><p className="text-sm text-[var(--crm-neutral-500)]">{label}</p><p className="mt-2 text-2xl font-semibold" data-testid={label === "Saldo residuo" ? "invoice-balance" : undefined}>{invoiceMoney(Number(amount), invoice.currency)}</p></div>)}</div>
    <div className="grid gap-5 md:grid-cols-2">
      <section className="space-y-3 rounded-xl border border-[var(--crm-neutral-100)] p-5"><h2 className="font-semibold">Scadenza</h2><p>{invoiceDate(invoice.dueDate)}</p>{canWrite && ["DRAFT", "SENT"].includes(invoice.status) && <form key={invoice.dueDate} onSubmit={e => { e.preventDefault(); const dueDate = String(new FormData(e.currentTarget).get("dueDate")); void run(() => updateInvoiceDueDate({ invoiceId: invoice.id, dueDate }), "Scadenza aggiornata"); }} className="flex flex-wrap gap-2"><input required type="date" name="dueDate" aria-label="Nuova scadenza" defaultValue={invoice.dueDate?.slice(0, 10) ?? ""} className={`${inputClass} min-w-0 flex-1`} /><button disabled={busy} className="rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm">Salva scadenza</button></form>}</section>
      <section className="space-y-2 rounded-xl border border-[var(--crm-neutral-100)] p-5"><h2 className="font-semibold">Cliente e affare</h2><p className="text-sm">{invoice.recipientName}{invoice.recipientVat && ` · ${invoice.recipientVat}`}</p><p className="text-sm text-[var(--crm-neutral-500)]">{[invoice.recipientAddress, invoice.recipientCity].filter(Boolean).join(", ")}</p>{invoice.dealId && <Link className="block text-sm text-[var(--crm-primary)] underline" href={`/deals/${invoice.dealId}`}>{invoice.dealTitle ?? "Apri affare"}</Link>}</section>
    </div>
    <section className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-white/5"><h2 className="border-b border-[var(--crm-neutral-100)] p-5 font-semibold">Prodotti e servizi</h2><ul className="divide-y divide-[var(--crm-neutral-100)]">{invoice.items.map((item, index) => <li key={index} className="flex flex-wrap justify-between gap-3 p-4"><div className="min-w-0"><p className="break-words text-sm">{item.description}</p><p className="mt-1 text-xs text-[var(--crm-neutral-500)]">IVA {item.taxRate}%{item.discount ? ` · Sconto ${item.discount}%` : ""}</p></div><p className="text-sm font-medium">{invoiceMoney(item.total, invoice.currency)}</p></li>)}</ul><div className="border-t border-[var(--crm-neutral-100)] p-4 text-right text-sm">Imponibile {invoiceMoney(invoice.subtotal, invoice.currency)} · IVA {invoiceMoney(invoice.taxAmount, invoice.currency)}</div></section>
    <section aria-label="Storico incassi" className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-white/5"><h2 className="border-b border-[var(--crm-neutral-100)] p-5 font-semibold">Storico incassi</h2>{!invoice.payments.length ? <div className="p-8 text-center text-sm text-[var(--crm-neutral-500)]"><Receipt className="mx-auto mb-2 h-6 w-6" />Nessun incasso registrato.</div> : <ul className="divide-y divide-[var(--crm-neutral-100)]">{invoice.payments.map(payment => <li key={payment.id} className="space-y-2 p-5">
      <div className="flex flex-wrap justify-between gap-2"><div><p className={`font-semibold ${payment.voidedAt ? "line-through text-[var(--crm-neutral-400)]" : ""}`}>{invoiceMoney(payment.amount, invoice.currency)}{payment.voidedAt && <span className="ml-2 text-xs no-underline">Annullato</span>}</p><p className="mt-1 text-sm">{invoiceDate(payment.paidAt)} · {paymentMethods[payment.method as keyof typeof paymentMethods] ?? payment.method.replaceAll("_", " ")}</p></div>{canWrite && !payment.voidedAt && <button disabled={busy} onClick={() => { setVoiding(payment.id); setReason(""); }} className="text-sm text-[var(--crm-neutral-500)] underline" aria-label={`Rettifica incasso di ${invoiceMoney(payment.amount, invoice.currency)}`}>Rettifica</button>}</div>
      {payment.reference && <p className="break-words text-sm">{payment.reference}</p>}<p className="text-xs text-[var(--crm-neutral-500)]">Registrato da {payment.createdBy} il {invoiceDate(payment.createdAt)}</p>{payment.voidedAt && <p className="text-sm text-rose-600 dark:text-rose-300">{payment.voidReason} · {payment.voidedBy ?? "Utente"}, {invoiceDate(payment.voidedAt)}</p>}
    </li>)}</ul>}</section>
    {invoice.notes && <section><h2 className="mb-2 font-semibold">Note</h2><p className="whitespace-pre-wrap text-sm">{invoice.notes}</p></section>}
    {paymentOpen && <PaymentForm invoice={invoice} onClose={() => setPaymentOpen(false)} />}
    {voiding && <Sheet open onOpenChange={open => { if (!open && !busy) setVoiding(null); }}><SheetContent className="w-full sm:max-w-lg" showCloseButton={!busy}><SheetHeader><SheetTitle>Rettifica incasso</SheetTitle><SheetDescription>Il movimento resta nello storico come annullato. Il saldo residuo viene ricalcolato.</SheetDescription></SheetHeader><SheetBody><form className="space-y-4" onSubmit={e => { e.preventDefault(); void run(() => voidInvoicePayment({ invoiceId: invoice.id, paymentId: voiding, reason }), "Incasso rettificato"); }}><label className="block space-y-1 text-sm">Motivo della rettifica<textarea autoFocus required minLength={5} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} className={inputClass} /></label><button disabled={busy} className={primaryClass}>Conferma rettifica</button></form></SheetBody></SheetContent></Sheet>}
  </div>;
}
