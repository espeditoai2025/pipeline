"use client";

import { useState } from "react";
import { Check, Zap, CreditCard, ExternalLink, Loader2, AlertCircle, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StripeInvoice } from "./page";

type OrgBilling = {
  plan: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeCurrentPeriodEnd: Date | null;
};

const PRO_FEATURES = [
  "Pipeline illimitate",
  "Contatti illimitati",
  "Lead Finder illimitato (50 candidati/ricerca)",
  "AI Assistant",
  "Automazioni workflow",
  "Campagne email marketing",
  "SMTP personalizzato",
  "Report avanzati",
  "Supporto prioritario",
];

export function BillingClient({ org, invoices = [] }: { org: OrgBilling; invoices?: StripeInvoice[] }) {
  const [loading, setLoading] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPro = org.plan === "PRO" || org.plan === "ENTERPRISE";
  const periodEnd = org.stripeCurrentPeriodEnd
    ? new Date(org.stripeCurrentPeriodEnd).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })
    : null;

  async function handleCheckout() {
    setLoading("checkout");
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Errore");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore durante il reindirizzamento");
      setLoading(null);
    }
  }

  async function handlePortal() {
    setLoading("portal");
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Errore");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore durante il reindirizzamento");
      setLoading(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Abbonamento</h1>
        <p className="mt-1 text-sm text-slate-500">Gestisci il tuo piano e la fatturazione.</p>
      </div>

      {/* Piano attuale */}
      <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Piano attuale</h2>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            isPro
              ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
              : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400"
          }`}>
            {isPro ? <Zap className="h-3 w-3" /> : null}
            {isPro ? "Pro" : "Starter (Gratuito)"}
          </span>
        </div>

        {isPro && periodEnd && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Prossimo rinnovo: <span className="font-medium text-slate-700 dark:text-slate-300">{periodEnd}</span>
          </p>
        )}

        {!isPro && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Il piano Starter è gratuito per sempre. Passa a Pro per sbloccare tutte le funzionalità.
          </p>
        )}

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="mt-4 flex gap-3">
          {isPro ? (
            <Button
              variant="outline"
              onClick={handlePortal}
              disabled={loading !== null}
              className="flex items-center gap-2"
            >
              {loading === "portal" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              Gestisci abbonamento
            </Button>
          ) : (
            <Button
              onClick={handleCheckout}
              disabled={loading !== null}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading === "checkout" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              Passa a Pro — 29€/mese
            </Button>
          )}
        </div>
      </div>

      {/* Confronto piani */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Starter */}
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-6">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Starter</h3>
          <div className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
            Gratis <span className="text-base font-normal text-slate-400">per sempre</span>
          </div>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            {["1 pipeline", "500 contatti", "Lead Finder 1/giorno (10 candidati)"].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-slate-400 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Pro */}
        <div className={`rounded-xl border-2 p-6 ${
          isPro
            ? "border-blue-500 bg-blue-50/50 dark:bg-blue-500/5"
            : "border-blue-200 dark:border-blue-500/30 bg-white dark:bg-white/5"
        }`}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Pro</h3>
            <span className="text-xs font-semibold text-blue-600 bg-blue-100 dark:bg-blue-500/20 dark:text-blue-400 px-2 py-0.5 rounded-full">
              Più popolare
            </span>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
            29€ <span className="text-base font-normal text-slate-400">/mese</span>
          </div>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-blue-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          {!isPro && (
            <Button
              onClick={handleCheckout}
              disabled={loading !== null}
              className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading === "checkout" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Inizia ora
            </Button>
          )}
        </div>
      </div>
      {/* Storico fatture */}
      <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-4 w-4 text-slate-500" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Storico fatture</h2>
        </div>

        {invoices.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {org.stripeCustomerId
              ? "Nessuna fattura disponibile."
              : "Le fatture appariranno qui dopo il primo pagamento."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 text-left">
                  <th className="pb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Fattura</th>
                  <th className="pb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Data</th>
                  <th className="pb-2 text-xs font-medium text-slate-500 dark:text-slate-400 text-right">Importo</th>
                  <th className="pb-2 text-xs font-medium text-slate-500 dark:text-slate-400 text-center">Stato</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="py-2">
                    <td className="py-2.5 text-slate-700 dark:text-slate-300 font-mono text-xs">
                      {inv.number ?? inv.id.slice(-8).toUpperCase()}
                    </td>
                    <td className="py-2.5 text-slate-600 dark:text-slate-400 text-xs">
                      {new Date(inv.date * 1000).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-slate-900 dark:text-white text-xs">
                      {(inv.total / 100).toLocaleString("it-IT", { style: "currency", currency: inv.currency.toUpperCase() })}
                    </td>
                    <td className="py-2.5 text-center">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        inv.status === "paid"
                          ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                          : inv.status === "open"
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                          : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400"
                      }`}>
                        {inv.status === "paid" ? "Pagata" : inv.status === "open" ? "In sospeso" : inv.status ?? "—"}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      {inv.pdfUrl && (
                        <a
                          href={inv.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                          <Download className="h-3 w-3" /> PDF
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
