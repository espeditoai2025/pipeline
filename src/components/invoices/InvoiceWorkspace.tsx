import Link from "next/link";
import { ArrowUpRight, Receipt, Search } from "lucide-react";
import type { InvoiceWorkspace as WorkspaceData } from "@/server/actions/invoice-workspace";
import { invoiceDate, invoiceMoney, todayInItaly, type InvoiceFilter } from "@/lib/invoice-utils";

export const invoiceFilterLabels: Record<InvoiceFilter, string> = { all: "Tutte", overdue: "Scadute", due: "Entro 7 giorni", partial: "Con acconto", DRAFT: "Bozze", SENT: "Da incassare", PAID: "Saldate", CANCELLED: "Annullate" };
export function InvoiceStatus({ status, partial }: { status: string; partial: boolean }) {
  const label = status === "SENT" && partial ? "Acconto ricevuto" : ({ DRAFT: "Bozza", SENT: "Da incassare", PAID: "Saldata", CANCELLED: "Annullata" }[status] ?? status);
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${status === "PAID" ? "bg-emerald-100 text-emerald-800" : status === "SENT" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-600"}`}>{label}</span>;
}

export function InvoiceWorkspace({ data, q = "", filter = "all" }: { data: WorkspaceData; q?: string; filter?: InvoiceFilter }) {
  function href(nextFilter: InvoiceFilter, page = 1) {
    return `/invoices?${new URLSearchParams({ filter: nextFilter, q, page: String(page) })}`;
  }
  const today = todayInItaly();
  return <div className="space-y-6 p-4 sm:p-6 lg:p-8">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="font-heading text-2xl font-semibold">Fatture e incassi</h1><p className="mt-1 text-sm text-[var(--crm-neutral-500)]">Scadenze, acconti e saldi dei tuoi clienti, in un unico posto.</p></div>
      {data.canWrite && <Link href="/deals" className="inline-flex items-center gap-2 rounded-lg bg-[var(--crm-primary)] px-4 py-2 text-sm font-medium text-white">Crea da un affare <ArrowUpRight className="h-4 w-4" /></Link>}
    </div>

    <section aria-label="Riepilogo incassi" className="space-y-3">
      <p className="text-xs text-[var(--crm-neutral-500)]">Totali di tutte le fatture inviate, suddivisi per valuta. Bozze e annullate escluse.</p>
      {data.summary.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--crm-neutral-100)] p-5 text-sm text-[var(--crm-neutral-500)]">Il riepilogo si aggiorna quando segni la prima fattura come inviata.</div>
        : data.summary.map(s => <div key={s.currency} className="grid gap-3 sm:grid-cols-3">
          <Link href={href("SENT")} className="rounded-xl border border-[var(--crm-neutral-100)] bg-white p-5 dark:bg-white/5"><p className="text-sm text-[var(--crm-neutral-500)]">Da incassare · {s.currency}</p><p className="my-2 text-2xl font-semibold tabular-nums">{invoiceMoney(s.outstanding, s.currency)}</p><p className="text-xs text-[var(--crm-neutral-500)]">{s.openCount} fatture aperte</p></Link>
          <Link href={href("overdue")} className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-900 dark:bg-rose-950/30 dark:text-rose-200"><p className="text-sm">Di cui scaduto · {s.currency}</p><p className="my-2 text-2xl font-semibold tabular-nums">{invoiceMoney(s.overdue, s.currency)}</p><p className="text-xs">{s.overdueCount} fatture da seguire</p></Link>
          <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white p-5 dark:bg-white/5"><p className="text-sm text-[var(--crm-neutral-500)]">Incassato · {s.currency}</p><p className="my-2 text-2xl font-semibold tabular-nums">{invoiceMoney(s.received, s.currency)}</p><p className="text-xs text-[var(--crm-neutral-500)]">Acconti e saldi registrati, al netto delle rettifiche</p></div>
        </div>)}
    </section>

    <section aria-label="Elenco fatture" className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-white/5">
      <div className="space-y-4 border-b border-[var(--crm-neutral-100)] p-4">
        <form action="/invoices" method="get" className="flex gap-2">
          <input type="hidden" name="filter" value={filter} />
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[var(--crm-neutral-100)] px-3"><Search className="h-4 w-4 shrink-0 text-[var(--crm-neutral-400)]" /><input name="q" aria-label="Cerca fatture" defaultValue={q} maxLength={100} placeholder="Numero, cliente o partita IVA" className="w-full bg-transparent py-2 text-sm outline-none" /></label>
          <button className="rounded-lg border border-[var(--crm-neutral-100)] px-4 text-sm">Cerca</button>
        </form>
        <nav aria-label="Filtri fatture" className="flex flex-wrap gap-2">{(Object.entries(invoiceFilterLabels) as [InvoiceFilter, string][]).map(([key, label]) => <Link key={key} href={href(key)} aria-current={filter === key ? "page" : undefined} className={`rounded-lg px-3 py-1.5 text-sm ${filter === key ? "bg-[var(--crm-primary)] text-white" : "bg-[var(--crm-neutral-50)] text-[var(--crm-neutral-600)] hover:bg-[var(--crm-neutral-100)]"}`}>{label}</Link>)}</nav>
      </div>
      {!data.rows.length ? <div className="py-14 text-center"><Receipt className="mx-auto mb-3 h-8 w-8 text-[var(--crm-neutral-400)]" /><p className="font-medium">Nessuna fattura {q || filter !== "all" ? "per questi filtri" : "presente"}</p><p className="mt-1 px-4 text-sm text-[var(--crm-neutral-500)]">{q || filter !== "all" ? "Prova un altro cliente o modifica i filtri." : "Apri un affare con prodotti o servizi e scegli Fattura per creare una bozza."}</p></div>
        : <ul className="divide-y divide-[var(--crm-neutral-100)]">{data.rows.map(row => {
          const overdue = row.status === "SENT" && row.dueDate && row.dueDate.slice(0, 10) < today;
          return <li key={row.id}><Link href={`/invoices/${row.id}`} className="grid gap-3 p-4 transition-colors hover:bg-[var(--crm-neutral-50)] sm:grid-cols-[minmax(0,1fr)_180px_160px] sm:items-center">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{row.number}</span><InvoiceStatus status={row.status} partial={row.paidAmount > 0} /></div><p className="mt-1 truncate text-sm">{row.recipientName}</p>{row.dealTitle && <p className="truncate text-xs text-[var(--crm-neutral-500)]">{row.dealTitle}</p>}</div>
            <div className={`text-sm ${overdue ? "font-medium text-rose-600 dark:text-rose-300" : "text-[var(--crm-neutral-500)]"}`}><p>{overdue ? "Scaduta il" : "Scadenza"}</p><p>{invoiceDate(row.dueDate)}</p></div>
            <div className="sm:text-right"><p className="font-semibold tabular-nums">{invoiceMoney(row.total, row.currency)}</p>{row.status === "SENT" && <p className="text-xs text-[var(--crm-neutral-500)]">Residuo {invoiceMoney(row.balance, row.currency)}</p>}</div>
          </Link></li>;
        })}</ul>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--crm-neutral-100)] p-4 text-sm"><p className="text-[var(--crm-neutral-500)]">{data.count} fatture · Pagina {data.page} di {data.pages}</p><div className="flex gap-3">{data.page > 1 && <Link href={href(filter, data.page - 1)}>Precedente</Link>}{data.page < data.pages && <Link href={href(filter, data.page + 1)}>Successiva</Link>}</div></div>
    </section>
    <p className="text-xs text-[var(--crm-neutral-500)]">L’invio e l’emissione avvengono nel tuo servizio di fatturazione. In Pipely tieni traccia dello stato e degli incassi.</p>
  </div>;
}
