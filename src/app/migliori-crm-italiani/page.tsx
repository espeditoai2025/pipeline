import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ArrowRight, ChevronDown, Star } from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const metadata: Metadata = {
  title: "I Migliori CRM Italiani del 2026 — Guida Completa",
  description: "Guida ai migliori CRM italiani del 2026: confronto funzionalità, prezzi e use case. Qual è il CRM giusto per la tua PMI? Scopri Pipely e le alternative.",
  alternates: { canonical: "https://www.pipely.it/migliori-crm-italiani" },
  openGraph: {
    title: "I Migliori CRM Italiani del 2026 — Guida Completa",
    description: "Confronto tra i migliori CRM italiani del 2026. Prezzi, funzionalità e consigli per scegliere il CRM giusto per la tua PMI.",
    url: "https://www.pipely.it/migliori-crm-italiani",
    images: [{ url: "https://www.pipely.it/opengraph-image", width: 1200, height: 630, alt: "Pipely CRM — Il CRM italiano con AI e automazioni" }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "I Migliori CRM Italiani del 2026",
      url: "https://www.pipely.it/migliori-crm-italiani",
      isPartOf: { "@id": "https://www.pipely.it/#website" },
    },
    {
      "@type": "Article",
      headline: "I Migliori CRM Italiani del 2026 — Guida Completa",
      description: "Guida ai migliori CRM italiani del 2026 per PMI: confronto funzionalità, prezzi e use case.",
      url: "https://www.pipely.it/migliori-crm-italiani",
      publisher: { "@id": "https://www.pipely.it/#organization" },
      inLanguage: "it-IT",
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: "Qual è il miglior CRM italiano?", acceptedAnswer: { "@type": "Answer", text: "Pipely è il CRM italiano più completo per PMI: pipeline Kanban, AI Assistant, automazioni, email marketing e supporto 100% in italiano. Piano gratuito per sempre disponibile." } },
        { "@type": "Question", name: "Esiste un CRM gratuito in italiano?", acceptedAnswer: { "@type": "Answer", text: "Sì. Pipely ha un piano Starter gratuito per sempre con 1 pipeline, fino a 500 contatti, calendario attività e import CSV. Nessuna carta di credito richiesta." } },
        { "@type": "Question", name: "Quanto costa un CRM per PMI italiane?", acceptedAnswer: { "@type": "Answer", text: "I prezzi variano: Pipely Pro costa 29€/mese per tutto il team. HubSpot Professional parte da €890/mese. Pipedrive parte da €14,90 per utente al mese." } },
      ],
    },
  ],
};

const crmList = [
  {
    name: "Pipely",
    badge: "🏆 Miglior scelta per PMI",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    tagline: "CRM italiano con AI, automazioni e email marketing. Gratis per sempre nel piano Starter.",
    pros: [
      "Piano gratuito per sempre (no carta di credito)",
      "100% in italiano: interfaccia, supporto e docs",
      "AI Assistant integrato nel piano Pro (29€/mese)",
      "Email marketing e tracking inclusi",
      "Automazioni workflow reali",
      "Setup in meno di 5 minuti",
    ],
    cons: [
      "App mobile nativa in sviluppo (usa browser)",
      "Ideale per PMI, non per grandi enterprise",
    ],
    prezzo: "0€ / 29€ mese",
    rating: 5,
    href: "/register",
    cta: "Inizia gratis",
    highlight: true,
  },
  {
    name: "HubSpot",
    badge: "🌍 Multinazionale",
    badgeColor: "bg-orange-50 text-orange-700 border-orange-200",
    tagline: "CRM molto potente, pensato per grandi aziende. Molto costoso nei piani avanzati.",
    pros: [
      "Funzionalità molto complete",
      "Integrazione con centinaia di tool",
      "Ottimo per marketing automation avanzato",
    ],
    cons: [
      "Piano Professional da €890/mese",
      "Interfaccia in inglese",
      "Curva di apprendimento alta",
      "Eccessivo per la maggior parte delle PMI",
    ],
    prezzo: "Da €890/mese",
    rating: 3,
    href: "/alternativa-hubspot",
    cta: "Vedi alternativa italiana",
    highlight: false,
  },
  {
    name: "Pipedrive",
    badge: "🌍 Straniero",
    badgeColor: "bg-slate-100 text-slate-600 border-slate-200",
    tagline: "CRM focalizzato sulle vendite, senza piano gratuito e senza email marketing nativo.",
    pros: [
      "Ottima UX per il processo di vendita",
      "Pipeline molto visual",
      "Buona app mobile",
    ],
    cons: [
      "Nessun piano gratuito",
      "Email marketing solo come add-on a pagamento",
      "AI solo come add-on",
      "Prezzo per utente, non per team",
    ],
    prezzo: "Da €14,90/utente/mese",
    rating: 3,
    href: "/alternativa-pipedrive",
    cta: "Vedi alternativa italiana",
    highlight: false,
  },
];

const faqs = [
  { q: "Qual è il miglior CRM italiano del 2026?", a: "Per le PMI italiane, Pipely è la scelta più completa: piano gratuito per sempre, AI Assistant, automazioni, email marketing integrato e supporto 100% in italiano a 29€/mese per tutto il team." },
  { q: "Esiste un CRM gratuito completamente in italiano?", a: "Sì. Pipely ha un piano Starter gratuito per sempre, senza carta di credito. Include 1 pipeline, fino a 500 contatti, calendario attività e import CSV/Excel." },
  { q: "Quanto costa mediamente un CRM per una PMI italiana?", a: "I prezzi variano molto: Pipely Pro costa 29€/mese per tutto il team. HubSpot Professional parte da €890/mese. Pipedrive parte da €14,90 per utente/mese. Per la maggior parte delle PMI, Pipely offre il miglior rapporto qualità/prezzo." },
  { q: "Un CRM italiano è meglio di uno straniero per le PMI?", a: "Sì, per diversi motivi pratici: interfaccia in italiano (nessuna traduzione parziale), supporto nella tua lingua senza barriere, conformità nativa al GDPR europeo e un team che capisce le esigenze del mercato italiano." },
  { q: "Cosa deve avere un buon CRM per PMI?", a: "Un buon CRM per PMI deve essere: facile da configurare (max 30 minuti), avere una pipeline visuale, permettere di assegnare attività e follow-up, integrare l'email, avere un prezzo sostenibile e supporto reale. Pipely spunta tutti questi requisiti." },
];

export default function MiglioriCrmItalianiPage() {
  return (
    <MarketingShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-6 py-24 text-center">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-blue-600/20 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-medium text-blue-300">
            Guida aggiornata 2026
          </div>
          <h1 className="mb-6 text-4xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
            I Migliori CRM Italiani del 2026
          </h1>
          <p className="mx-auto text-lg leading-relaxed text-slate-300">
            Confronto completo tra i CRM più usati dalle PMI italiane: funzionalità, prezzi e consigli per scegliere il software giusto per il tuo team.
          </p>
        </div>
      </section>

      {/* Intro */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="mx-auto max-w-3xl prose prose-slate">
          <h2 className="text-2xl font-semibold text-slate-900 mb-4">Come scegliere il CRM giusto per la tua PMI</h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Il mercato dei CRM è affollato di soluzioni internazionali costose e complesse. Per una PMI italiana, le priorità sono diverse: semplicità di utilizzo, prezzo sostenibile, supporto in italiano e funzionalità realmente utili al processo di vendita quotidiano.
          </p>
          <p className="text-slate-600 leading-relaxed">
            In questa guida abbiamo selezionato i 3 CRM più rilevanti per le PMI italiane nel 2026, con un confronto onesto su funzionalità, prezzi e punti di forza.
          </p>
        </div>
      </section>

      {/* CRM list */}
      <section className="py-16 px-6">
        <div className="mx-auto max-w-4xl space-y-8">
          {crmList.map((crm, i) => (
            <article
              key={crm.name}
              className={`rounded-2xl border p-8 ${crm.highlight ? "border-blue-300 bg-blue-50/30 shadow-md" : "border-slate-200 bg-white"}`}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg font-bold text-slate-900">#{i + 1} {crm.name}</span>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${crm.badgeColor}`}>{crm.badge}</span>
                  </div>
                  <p className="text-sm text-slate-600">{crm.tagline}</p>
                </div>
                <div className="text-right">
                  <div className="flex gap-0.5 justify-end mb-1">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className={`h-4 w-4 ${j < crm.rating ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}`} />
                    ))}
                  </div>
                  <div className="text-sm font-semibold text-slate-700">{crm.prezzo}</div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">Punti di forza</p>
                  <ul className="space-y-1.5">
                    {crm.pros.map((p) => (
                      <li key={p} className="flex items-start gap-2 text-sm text-slate-700">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Limitazioni</p>
                  <ul className="space-y-1.5">
                    {crm.cons.map((c) => (
                      <li key={c} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <Link
                href={crm.href}
                className={`inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all ${crm.highlight ? "bg-blue-600 text-white hover:bg-blue-500" : "border border-slate-200 text-slate-700 hover:bg-slate-50"}`}
              >
                {crm.cta} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-slate-50 py-16 px-6">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-8 text-center text-2xl font-semibold text-slate-900">Domande frequenti sui CRM italiani</h2>
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

      {/* CTA */}
      <section className="bg-gradient-to-br from-blue-600 to-indigo-700 px-6 py-20 text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="mb-4 text-3xl font-semibold text-white">Inizia con il CRM #1 per PMI italiane</h2>
          <p className="mb-8 text-blue-100">Piano gratuito per sempre. Nessuna carta di credito. Setup in 5 minuti.</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-blue-600 hover:bg-blue-50 transition-all"
          >
            Crea il tuo account gratis <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}
