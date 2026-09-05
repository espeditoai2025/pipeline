"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarPlus, Check, Clock3, ArrowRight, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { completeActivity } from "@/server/actions/activities";
import type { DailyFocusData } from "@/server/actions/daily-focus";
import { ActivityForm } from "@/components/activities/ActivityForm";
import { CRM_TIME_ZONE } from "@/lib/italian-date";
import { Button } from "@/components/ui/button";

export function DailyFocus({ data }: { data: DailyFocusData }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [refreshing, startRefresh] = useTransition();
  const [form, setForm] = useState<{ dealId?: string; contactId?: string; subject?: string } | null>(null);
  const refresh = () => startRefresh(() => router.refresh());

  async function complete(id: string) {
    if (pendingId || refreshing) return;
    setPendingId(id);
    try {
      const result = await completeActivity(id);
      if (result.error) toast.error(result.error);
      else { toast.success("Attività completata"); refresh(); }
    } catch { toast.error("Impossibile completare l'attività. Riprova."); }
    finally { setPendingId(null); }
  }

  const dateLabel = new Date(data.generatedAt).toLocaleDateString("it-IT", { timeZone: CRM_TIME_ZONE, weekday: "long", day: "numeric", month: "long" });
  return (
    <section aria-labelledby="daily-focus-title" className="rounded-xl border border-[var(--crm-neutral-100)] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a2e]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="daily-focus-title" className="text-base font-semibold">La tua giornata</h2>
          <p className="mt-1 text-xs text-[var(--crm-neutral-500)]">{dateLabel} · Ora italiana · Le attività e gli affari assegnati a te</p>
        </div>
        <Button onClick={() => setForm({})} variant="outline" size="sm" className="gap-1.5"><Plus className="h-4 w-4" />Nuova attività</Button>
      </div>
      <div className="my-5 grid grid-cols-3 gap-2 text-sm" aria-live="polite">
        {[
          { label: "In ritardo", count: data.overdueCount, color: "text-red-600 dark:text-red-400" },
          { label: "Entro oggi", count: data.todayCount, color: "text-[var(--crm-primary)]" },
          { label: "Da ricontattare", count: data.followUpCount, color: "text-amber-700 dark:text-amber-400" },
        ].map(item => <div key={item.label} className="rounded-lg bg-[var(--crm-neutral-50)] p-3 dark:bg-white/5"><p className={`text-xl font-semibold ${item.color}`}>{item.count}</p><p className="mt-1 text-xs text-[var(--crm-neutral-500)]">{item.label}</p></div>)}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">Scadenze e appuntamenti</h3><Link href="/activities" className="text-xs text-[var(--crm-primary)] hover:underline">Tutte le attività</Link></div>
          {data.activities.length === 0 ? <p className="rounded-lg border border-dashed border-[var(--crm-neutral-200)] p-4 text-sm text-[var(--crm-neutral-500)]">Nessuna attività in ritardo o prevista per oggi. Pianifica il prossimo passo con un cliente.</p> : (
            <ul className="divide-y divide-[var(--crm-neutral-100)] dark:divide-white/10">
              {data.activities.map(activity => {
                const label = new Date(activity.dueDate).toLocaleString("it-IT", { timeZone: CRM_TIME_ZONE, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
                const contactName = activity.contact ? `${activity.contact.firstName} ${activity.contact.lastName ?? ""}`.trim() : null;
                return <li key={activity.id} className="flex items-start gap-3 py-3">
                  <button type="button" onClick={() => complete(activity.id)} disabled={!!pendingId || refreshing} aria-label={`Completa ${activity.subject}`} className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--crm-neutral-200)] text-[var(--crm-neutral-500)] hover:border-green-600 hover:text-green-600 disabled:opacity-40">
                    {pendingId === activity.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </button>
                  <div className="min-w-0 flex-1"><p className="break-words text-sm font-medium">{activity.subject}</p>
                    <p className={`mt-1 flex items-center gap-1 text-xs ${activity.overdue ? "text-red-600 dark:text-red-400" : "text-[var(--crm-neutral-500)]"}`}><Clock3 className="h-3 w-3" />{activity.overdue && "In ritardo · "}{label}</p>
                    {activity.deal ? <Link href={`/deals/${activity.deal.id}`} className="mt-1 block truncate text-xs text-[var(--crm-primary)] hover:underline">{activity.deal.title}</Link> : activity.contact && <Link href={`/contacts/${activity.contact.id}`} className="mt-1 block truncate text-xs text-[var(--crm-primary)] hover:underline">{contactName}</Link>}
                  </div>
                </li>;
              })}
            </ul>
          )}
          {data.overdueCount + data.todayCount > data.activities.length && <p className="mt-2 text-xs text-[var(--crm-neutral-500)]">Mostrate {data.activities.length} di {data.overdueCount + data.todayCount} attività. Apri l&apos;agenda per l&apos;elenco completo.</p>}
        </div>
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">Affari senza prossima attività</h3><Link href="/deals" className="text-xs text-[var(--crm-primary)] hover:underline">Tutti gli affari</Link></div>
          <p className="mb-2 text-xs text-[var(--crm-neutral-500)]">Affari aperti senza un&apos;attività futura con data. Parti dalle chiusure più vicine.</p>
          {data.deals.length === 0 ? <p className="rounded-lg border border-dashed border-[var(--crm-neutral-200)] p-4 text-sm text-[var(--crm-neutral-500)]">Nessun affare da ricontattare: le prossime attività sono già pianificate, oppure non hai ancora affari aperti.</p> : (
            <ul className="divide-y divide-[var(--crm-neutral-100)] dark:divide-white/10">
              {data.deals.map(deal => <li key={deal.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0 flex-1"><Link href={`/deals/${deal.id}`} className="inline-flex max-w-full items-center gap-1 text-sm font-medium hover:text-[var(--crm-primary)]"><span className="truncate">{deal.title}</span><ArrowRight className="h-3.5 w-3.5 shrink-0" /></Link>
                  <p className="mt-1 text-xs text-[var(--crm-neutral-500)]">{new Intl.NumberFormat("it-IT", { style: "currency", currency: /^[A-Z]{3}$/.test(deal.currency) ? deal.currency : "EUR" }).format(deal.value)} · {deal.stage.name}</p>
                  {deal.expectedClose && <p className="mt-1 text-xs text-[var(--crm-neutral-500)]">Chiusura prevista: {new Date(deal.expectedClose).toLocaleDateString("it-IT", { timeZone: CRM_TIME_ZONE })}</p>}
                </div>
                <Button variant="outline" size="sm" aria-label={`Pianifica ricontatto per ${deal.title}`} onClick={() => setForm({ dealId: deal.id, contactId: deal.contactId ?? undefined, subject: `Ricontatto: ${deal.title}` })} className="gap-1.5"><CalendarPlus className="h-3.5 w-3.5" />Pianifica</Button>
              </li>)}
            </ul>
          )}
          {data.followUpCount > data.deals.length && <p className="mt-2 text-xs text-[var(--crm-neutral-500)]">Mostrati i primi {data.deals.length} di {data.followUpCount} affari da ricontattare.</p>}
        </div>
      </div>
      {form && <ActivityForm open onClose={() => setForm(null)} requireDueDate={!!form.dealId} defaultType="CALL" defaultDealId={form.dealId} defaultContactId={form.contactId} defaultSubject={form.subject} onSaved={() => { setForm(null); refresh(); }} />}
    </section>
  );
}
