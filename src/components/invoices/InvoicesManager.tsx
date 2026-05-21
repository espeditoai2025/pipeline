"use client";

import { useState, useEffect } from "react";
import {
  FileText, Download, Loader2, CheckCircle2, Clock, Ban,
  Send, Trash2, Receipt,
} from "lucide-react";
import { toast } from "sonner";
import {
  getInvoices, updateInvoiceStatus, deleteInvoice,
  generateFatturaPAXml, type InvoiceListItem,
} from "@/server/actions/invoices";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Bozza", SENT: "Inviata", PAID: "Pagata", CANCELLED: "Annullata",
};
const STATUS_ICON: Record<string, React.ElementType> = {
  DRAFT: Clock, SENT: Send, PAID: CheckCircle2, CANCELLED: Ban,
};
const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  SENT: "bg-blue-100 text-blue-700",
  PAID: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-rose-100 text-rose-700",
};

function formatEur(n: number) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

export function InvoicesManager() {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    getInvoices().then((data) => { setInvoices(data); setLoading(false); });
  }, []);

  async function handleDownloadXml(id: string) {
    setActionId(id);
    const res = await generateFatturaPAXml(id);
    setActionId(null);
    if (res.error || !res.xml) { toast.error(res.error ?? "Errore"); return; }
    const blob = new Blob([res.xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = res.filename!;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("XML FatturaPA scaricato");
  }

  async function handleStatusChange(id: string, status: "DRAFT" | "SENT" | "PAID" | "CANCELLED") {
    setActionId(id);
    const res = await updateInvoiceStatus(id, status);
    setActionId(null);
    if (res.error) { toast.error(res.error); return; }
    setInvoices((prev) => prev.map((inv) =>
      inv.id === id ? { ...inv, status, paidAt: status === "PAID" ? new Date().toISOString() : null } : inv
    ));
    toast.success(`Fattura segnata come ${(STATUS_LABEL[status] ?? status).toLowerCase()}`);
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questa fattura?")) return;
    setActionId(id);
    const res = await deleteInvoice(id);
    setActionId(null);
    if (res.error) { toast.error(res.error); return; }
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    toast.success("Fattura eliminata");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--crm-neutral-400)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Receipt className="h-5 w-5 text-[var(--crm-primary)]" />
            Fatture Elettroniche ({invoices.length})
          </h2>
        </div>

        <p className="text-xs text-[var(--crm-neutral-500)] mb-4">
          Genera fatture dalla pagina dell&apos;affare. Scarica l&apos;XML FatturaPA e caricalo sul tuo provider (Aruba, Fatture in Cloud, Legalinvoice, ecc.).
        </p>

        {invoices.length === 0 ? (
          <div className="text-center py-10 text-sm text-[var(--crm-neutral-400)]">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Nessuna fattura generata.</p>
            <p className="text-xs mt-1">Vai nella pagina di un affare e clicca &quot;Fattura&quot; per creare la prima.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {invoices.map((inv) => {
              const StatusIcon = STATUS_ICON[inv.status] ?? Clock;
              const isLoading = actionId === inv.id;
              return (
                <div key={inv.id} className="flex items-center gap-3 rounded-lg border border-[var(--crm-neutral-100)] px-4 py-3 hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold font-mono">{inv.number}</span>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 ${STATUS_COLOR[inv.status]}`}>
                        <StatusIcon className="h-3 w-3" />
                        {STATUS_LABEL[inv.status]}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--crm-neutral-500)] mt-0.5">
                      {inv.recipientName}
                      {inv.recipientVat && <span className="text-[var(--crm-neutral-400)]"> · P.IVA {inv.recipientVat}</span>}
                      {inv.dealTitle && <span className="text-[var(--crm-neutral-400)]"> · {inv.dealTitle}</span>}
                    </p>
                    <p className="text-xs text-[var(--crm-neutral-400)] mt-0.5">
                      Emessa: {formatDate(inv.issueDate)}
                      {inv.dueDate && <> · Scad: {formatDate(inv.dueDate)}</>}
                      {inv.paidAt && <> · Pagata: {formatDate(inv.paidAt)}</>}
                    </p>
                  </div>

                  <span className="text-sm font-bold whitespace-nowrap">{formatEur(inv.total)}</span>

                  <div className="flex items-center gap-1">
                    {/* Download XML */}
                    <button
                      onClick={() => handleDownloadXml(inv.id)}
                      disabled={isLoading}
                      className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 transition-colors"
                      title="Scarica XML FatturaPA"
                    >
                      {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    </button>

                    {/* Status actions */}
                    {inv.status === "DRAFT" && (
                      <button
                        onClick={() => handleStatusChange(inv.id, "SENT")}
                        disabled={isLoading}
                        className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 transition-colors"
                        title="Segna come inviata"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {(inv.status === "DRAFT" || inv.status === "SENT") && (
                      <button
                        onClick={() => handleStatusChange(inv.id, "PAID")}
                        disabled={isLoading}
                        className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 transition-colors"
                        title="Segna come pagata"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {/* Delete (only drafts) */}
                    {inv.status === "DRAFT" && (
                      <button
                        onClick={() => handleDelete(inv.id)}
                        disabled={isLoading}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-[var(--crm-neutral-400)] hover:text-[var(--crm-danger)] transition-colors"
                        title="Elimina"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
