import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function InvoicesManager() {
  return <div className="space-y-3 rounded-xl border border-[var(--crm-neutral-100)] p-6">
    <h2 className="text-lg font-semibold">Fatture e incassi</h2>
    <p className="text-sm text-[var(--crm-neutral-500)]">Gestisci scadenze, acconti e saldi nella nuova area dedicata.</p>
    <Link href="/invoices" className="inline-flex items-center gap-2 rounded-lg bg-[var(--crm-primary)] px-4 py-2 text-sm text-white">Apri fatture e incassi <ArrowUpRight className="h-4 w-4" /></Link>
  </div>;
}
