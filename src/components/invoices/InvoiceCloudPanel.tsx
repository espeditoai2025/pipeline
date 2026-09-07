"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getInvoiceExport, getInvoiceVatOptions, prepareInvoiceExport, createInvoiceInCloud, refreshInvoiceExport, sendInvoiceToSdi } from "@/server/actions/invoicing";
import { eInvoiceLabels, type InvoiceExportPreview, type InvoiceExportStatus, type InvoiceExportInput } from "@/lib/invoicing-schema";
import type { FicVat } from "@/lib/fatture-in-cloud";
import type { InvoiceDetail } from "@/server/actions/invoices";
import { normalizeItalianVat } from "@/lib/company-autofill";
import { invoiceMoney } from "@/lib/invoice-utils";

const buttonClass = "rounded-lg border px-3 py-2 text-sm disabled:opacity-50";
const inputClass = "mt-1 w-full rounded border bg-transparent p-2 text-sm";
export function InvoiceCloudPanel({ invoice, canWrite }: { invoice: InvoiceDetail; canWrite: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [status, setStatus] = useState<InvoiceExportStatus | null>(null);
  const [vats, setVats] = useState<FicVat[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [preview, setPreview] = useState<InvoiceExportPreview | null>(null);
  const [sendConfirmation, setSendConfirmation] = useState(false);
  const pending = useRef(false);
  const vat = normalizeItalianVat(invoice.recipientVat ?? "");
  const paymentCode: InvoiceExportInput["paymentCode"] = ({ bonifico: "MP05", carta: "MP08", contanti: "MP01", assegno: "MP02", rid: "MP19" } as const)[invoice.paymentMethod as "bonifico" | "carta" | "contanti" | "assegno" | "rid"] ?? "MP05";
  const [fields, setFields] = useState<InvoiceExportInput>({ invoiceId: invoice.id, recipientName: invoice.recipientName, vatNumber: /^\d{11}$/.test(vat) ? vat : "", taxCode: /^[A-Z0-9]{16}$/.test(vat) ? vat : "", address: invoice.recipientAddress ?? "", city: invoice.recipientCity ?? "", postalCode: "", province: "", sdiCode: invoice.recipientSdi && !invoice.recipientSdi.includes("@") ? invoice.recipientSdi : "", pec: invoice.recipientSdi?.includes("@") ? invoice.recipientSdi : "", paymentCode, numeration: "", vatIds: [] });
  async function reload() { const result = await getInvoiceExport(invoice.id); if (result.error) setError(result.error); else setStatus(result.data ?? null); }
  async function run(operation: () => Promise<{ error?: string }>) {
    if (pending.current) return; pending.current = true; setBusy(true); setError(""); setNotice("");
    try { const result = await operation(); if (result.error) setError(result.error); await reload(); }
    catch { setError("Esito non confermato. Aggiorna lo stato prima di riprovare."); }
    finally { pending.current = false; setBusy(false); }
  }
  async function loadForm() {
    await run(async () => { const result = await getInvoiceVatOptions(); if (result.data) { setVats(result.data); setFields(prev => ({ ...prev, vatIds: invoice.items.map(item => { const matching = result.data.filter(row => row.value === item.taxRate); return matching.length === 1 ? matching[0]!.id : -1; }) })); setFormOpen(true); } return result; });
  }
  const editable = !status || (!status.documentId && ["PREPARED", "FAILED"].includes(status.status));
  return <section className="space-y-3 rounded-xl border border-[var(--crm-neutral-200)] p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Fatture in Cloud</h2><button disabled={busy} className={buttonClass} onClick={() => { setOpen(value => !value); if (!open) void run(async () => ({})); }}>{open ? "Chiudi" : "Gestisci fatturazione"}</button></div>
    {open && <>
      <p className="text-sm">Crea il documento nel gestionale, controllalo e conferma separatamente l’invio allo SdI. <Link href="/settings/invoicing" className="underline">Configura collegamento</Link></p>
      <p className="text-xs text-[var(--crm-neutral-500)]">Prima versione: fatture ordinarie italiane in EUR con IVA positiva, senza casse, ritenute o bollo. Nessuna sincronizzazione automatica degli incassi.</p>
      {error && <p role="alert" className="rounded border border-rose-300 p-3 text-sm text-rose-700">{error}</p>}
      {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
      {status && <div className="space-y-2 rounded-lg bg-[var(--crm-neutral-50)] p-3 text-sm"><p>Documento Fatture in Cloud: <strong>{status.remoteNumber ?? "Da creare"}</strong>{status.documentId ? " · ID " + status.documentId : ""}</p><p>Stato: {status.eInvoiceStatus ? eInvoiceLabels[status.eInvoiceStatus] ?? status.eInvoiceStatus : ({ PREPARED: "Anteprima pronta", FAILED: "Creazione non riuscita", CREATING: "Creazione in corso", UNKNOWN: "Esito da verificare", SENDING: "Invio in corso", SENT: "Richiesta di invio accettata", CREATED: "Creato" }[status.status] ?? status.status)}</p>{status.status === "UNKNOWN" && <p>Esito incerto: le nuove richieste sono bloccate finché non viene riconciliato il documento.</p>}{status.remoteTotal !== null && <p>Totale nel gestionale: {invoiceMoney(status.remoteTotal, "EUR")}</p>}{status.error && <p className="text-rose-700">{status.error}</p>}{canWrite && <button disabled={busy} className={buttonClass} onClick={() => run(() => refreshInvoiceExport(invoice.id))}>Aggiorna stato / riconcilia</button>}</div>}
      {canWrite && invoice.status === "DRAFT" && editable && !formOpen && <button disabled={busy} className={buttonClass} onClick={loadForm}>Prepara fattura elettronica</button>}
      {formOpen && editable && <form className="space-y-4" onSubmit={event => { event.preventDefault(); void run(async () => { const result = await prepareInvoiceExport(fields); if (result.data) setPreview(result.data); return result; }); }}>
        <div className="grid gap-3 sm:grid-cols-2">{([ ["recipientName", "Ragione sociale / nome"], ["vatNumber", "Partita IVA italiana"], ["taxCode", "Codice fiscale"], ["address", "Indirizzo"], ["city", "Città"], ["postalCode", "CAP"], ["province", "Provincia"], ["sdiCode", "Codice destinatario (0000000 se assente)"], ["pec", "PEC destinatario"], ["numeration", "Serie / numerazione Fatture in Cloud (facoltativa)"] ] as const).map(([key, label]) => <label key={key} className="text-sm">{label}<input className={inputClass} value={fields[key]} disabled={busy} maxLength={key === "postalCode" ? 5 : key === "province" ? 2 : key === "sdiCode" ? 7 : 200} onChange={event => { setFields(prev => ({ ...prev, [key]: event.target.value })); setPreview(null); }} /></label>)}</div>
        <label className="block text-sm">Modalità di pagamento<select className={inputClass} value={fields.paymentCode} disabled={busy} onChange={event => { setFields(prev => ({ ...prev, paymentCode: event.target.value as InvoiceExportInput["paymentCode"] })); setPreview(null); }}><option value="MP05">Bonifico</option><option value="MP01">Contanti</option><option value="MP02">Assegno</option><option value="MP08">Carta</option><option value="MP19">SDD</option><option value="MP20">SDD CORE</option></select></label>
        {invoice.items.map((item, index) => <label key={index} className="block text-sm">{item.description} · IVA {item.taxRate}%<select className={inputClass} disabled={busy} value={fields.vatIds[index] ?? -1} onChange={event => { setFields(prev => ({ ...prev, vatIds: prev.vatIds.map((id, i) => i === index ? Number(event.target.value) : id) })); setPreview(null); }}><option value={-1}>Seleziona codice IVA del gestionale</option>{vats.filter(row => row.value === item.taxRate).map(row => <option key={row.id} value={row.id}>{row.value}% — {row.description ?? "IVA"}{row.ei_type ? " · Natura " + row.ei_type : ""}</option>)}</select></label>)}
        <button disabled={busy} className={buttonClass}>Controlla dati e totali</button>
      </form>}
      {preview && editable && <div className="space-y-3 rounded-lg border border-[var(--crm-primary)] p-4 text-sm"><p>Creare una fattura per <strong>{preview.recipient}</strong> nell’azienda <strong>{preview.company}</strong>, totale <strong>{invoiceMoney(preview.total, preview.currency)}</strong>?</p><p>Il numero fiscale viene assegnato da Fatture in Cloud. Questo passaggio non invia ancora il documento allo SdI.</p><button disabled={busy} className={buttonClass} onClick={() => run(async () => { const result = await createInvoiceInCloud(invoice.id, preview.previewId); if (!result.error) { setPreview(null); setFormOpen(false); setNotice("Documento creato nel gestionale. Puoi verificarlo e confermare l’invio allo SdI."); } return result; })}>Conferma creazione in Fatture in Cloud</button><button disabled={busy} className={buttonClass} onClick={() => setPreview(null)}>Annulla</button></div>}
      {canWrite && status?.status === "CREATED" && status.eInvoiceStatus === "not_sent" && <button disabled={busy} className={buttonClass} onClick={() => setSendConfirmation(true)}>Invia allo SdI</button>}
      {sendConfirmation && <div className="space-y-3 rounded-lg border border-amber-400 p-4 text-sm"><p>Confermi l’invio fiscale del documento {status?.remoteNumber} allo SdI tramite Fatture in Cloud? Pipely verificherà prima la validità del tracciato.</p><button disabled={busy} className={buttonClass} onClick={() => run(async () => { const result = await sendInvoiceToSdi(invoice.id); if (!result.error) { setSendConfirmation(false); setNotice("Richiesta di invio accettata. Aggiorna lo stato per conoscere l’esito SdI."); router.refresh(); } return result; })}>Conferma invio fiscale</button><button disabled={busy} className={buttonClass} onClick={() => setSendConfirmation(false)}>Annulla</button></div>}
    </>}
  </section>;
}
