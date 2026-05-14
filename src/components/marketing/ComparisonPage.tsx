import Link from "next/link";
import { CheckCircle2, XCircle, ArrowRight, ChevronDown, Minus } from "lucide-react";
import { MarketingShell } from "./MarketingShell";

export type ComparisonRow = {
  feature: string;
  pipely: string | boolean;
  competitor: string | boolean;
};

type Props = {
  competitor: string;
  hero: { h1: string; description: string };
  summary: { pipely: string[]; competitor: string[] };
  rows: ComparisonRow[];
  advantages: string[];
  faqs: { q: string; a: string }[];
  jsonLd?: object;
};

function Cell({ value }: { value: string | boolean }) {
  if (value === true) return <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" />;
  if (value === false) return <XCircle className="h-5 w-5 text-red-400 mx-auto" />;
  if (value === "—") return <Minus className="h-4 w-4 text-slate-300 mx-auto" />;
  return <span className="text-sm text-slate-700">{value}</span>;
}

export function ComparisonPage({ competitor, hero, summary, rows, advantages, faqs, jsonLd }: Props) {
  return (
    <MarketingShell>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-6 py-24 text-center">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-blue-600/20 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-medium text-blue-300">
            Confronto CRM
          </div>
          <h1 className="mb-6 text-4xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
            {hero.h1}
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-300">{hero.description}</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg hover:bg-blue-500 transition-all"
          >
            Prova Pipely gratis <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Summary cards */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="mx-auto max-w-4xl grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border-2 border-blue-500 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="text-xs font-bold text-white">P</span>
              </div>
              <h2 className="font-semibold text-slate-900">Pipely</h2>
              <span className="ml-auto rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">Consigliato</span>
            </div>
            <ul className="space-y-2">
              {summary.pipely.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 opacity-80">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-slate-200 flex items-center justify-center">
                <span className="text-xs font-bold text-slate-500">{competitor[0]}</span>
              </div>
              <h2 className="font-semibold text-slate-900">{competitor}</h2>
            </div>
            <ul className="space-y-2">
              {summary.competitor.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                  <Minus className="h-4 w-4 shrink-0 text-slate-300 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="py-16 px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-2xl font-semibold text-slate-900">Confronto dettagliato</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[500px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Funzionalità</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-blue-600 uppercase tracking-wide">Pipely</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">{competitor}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.feature} className="hover:bg-slate-50/50">
                    <td className="px-6 py-3.5 text-sm font-medium text-slate-700">{row.feature}</td>
                    <td className="px-6 py-3.5 text-center"><Cell value={row.pipely} /></td>
                    <td className="px-6 py-3.5 text-center"><Cell value={row.competitor} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Why Pipely */}
      <section className="bg-slate-50 py-16 px-6">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-2xl font-semibold text-slate-900">
            Perché scegliere Pipely invece di {competitor}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {advantages.map((adv) => (
              <div key={adv} className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500 mt-0.5" />
                <p className="text-sm text-slate-700">{adv}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-blue-500 transition-all"
            >
              Prova Pipely gratis <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-3 text-sm text-slate-500">Nessuna carta di credito · Setup in 5 minuti</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-8 text-center text-2xl font-semibold text-slate-900">Domande frequenti</h2>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details key={faq.q} className="group rounded-xl border border-slate-200 bg-white px-6 py-4 cursor-pointer">
                <summary className="flex items-center justify-between font-medium text-slate-900 list-none">
                  {faq.q}
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180 ml-4" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
