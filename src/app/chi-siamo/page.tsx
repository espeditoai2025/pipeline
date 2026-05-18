import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Shield, Users, Zap, Globe } from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const metadata: Metadata = {
  title: "Chi Siamo — Pipely, il CRM Made in Italy | Pipely",
  description: "Pipely è il CRM italiano con AI per PMI e team di vendita. Scopri la nostra missione: rendere la gestione commerciale semplice, efficace e accessibile per le aziende italiane.",
  alternates: { canonical: "https://www.pipely.it/chi-siamo" },
  openGraph: {
    title: "Chi Siamo — Pipely, il CRM Made in Italy",
    description: "Il CRM italiano con AI per PMI. La nostra missione è rendere la gestione commerciale semplice e accessibile per le aziende italiane.",
    url: "https://www.pipely.it/chi-siamo",
    images: [{ url: "https://www.pipely.it/opengraph-image", width: 1200, height: 630, alt: "Pipely CRM — Il CRM italiano con AI e automazioni" }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Pipely",
  url: "https://www.pipely.it",
  logo: "https://www.pipely.it/pipely-logo.svg",
  description: "Pipely è il CRM italiano con AI e automazioni per PMI e team di vendita.",
  email: "support@pipely.it",
  areaServed: "IT",
  knowsLanguage: "it",
};

const VALUES = [
  {
    icon: Globe,
    color: "bg-blue-500",
    title: "Made in Italy, per l'Italia",
    description: "Pipely è pensato e costruito per le aziende italiane: interfaccia, documentazione e supporto in italiano, processi che rispecchiano il modo di lavorare italiano.",
  },
  {
    icon: Zap,
    color: "bg-amber-500",
    title: "Semplicità senza compromessi",
    description: "Crediamo che uno strumento potente non debba essere complicato. Ogni funzionalità di Pipely è progettata per essere usabile da chiunque, senza formazione tecnica.",
  },
  {
    icon: Users,
    color: "bg-violet-500",
    title: "Costruito con i clienti",
    description: "Ogni nuova funzionalità nasce da richieste reali degli utenti. Ascoltiamo attivamente il feedback e rilasciamo aggiornamenti frequenti basati su ciò che conta davvero.",
  },
  {
    icon: Shield,
    color: "bg-green-500",
    title: "Trasparenza e privacy",
    description: "I tuoi dati sono tuoi. Li teniamo in Europa, non li vendiamo e non li usiamo per pubblicità. La nostra Privacy Policy è scritta in italiano chiaro, non in legalese.",
  },
];

export default function ChiSiamoPage() {
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
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-medium text-blue-300">
            Made in Italy 🇮🇹
          </div>
          <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl">
            Chi Siamo —{" "}
            <span className="bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
              Pipely, il CRM Made in Italy
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-slate-300">
            La nostra missione è semplice: rendere la gestione commerciale semplice, efficace e accessibile per tutte le aziende italiane — dalle startup ai team di vendita consolidati.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight text-slate-900">La nostra missione</h2>
          <div className="space-y-4 text-lg leading-relaxed text-slate-600">
            <p>
              Troppi team commerciali italiani perdono opportunità per mancanza di strumenti adeguati. I CRM enterprise sono troppo costosi e complessi per le PMI. I fogli Excel non scalano. Le soluzioni internazionali non capiscono il modo di lavorare italiano.
            </p>
            <p>
              Pipely nasce per risolvere questo problema: un CRM completo — pipeline, contatti, automazioni, email marketing e AI Assistant — progettato e localizzato per il mercato italiano, accessibile con un piano gratuito per sempre.
            </p>
            <p>
              Crediamo che ogni azienda italiana, indipendentemente dalle dimensioni, meriti gli stessi strumenti che usano i team più avanzati al mondo. Resi semplici, in italiano, con supporto umano raggiungibile.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-slate-50 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-4 text-center text-2xl font-semibold tracking-tight text-slate-900">I nostri valori</h2>
          <p className="mb-12 text-center text-slate-500">Principi che guidano ogni decisione che prendiamo.</p>
          <div className="grid gap-6 sm:grid-cols-2">
            {VALUES.map((v) => (
              <div key={v.title} className="flex gap-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className={`mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${v.color} text-white`}>
                  <v.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="mb-2 font-semibold text-slate-900">{v.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{v.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight text-slate-900">Il prodotto</h2>
          <div className="space-y-4 text-slate-600 leading-relaxed">
            <p>Pipely è una piattaforma CRM SaaS che include:</p>
            <ul className="ml-5 space-y-2 list-disc">
              <li>Pipeline vendite Kanban con stage personalizzabili</li>
              <li>Gestione contatti e aziende con storico interazioni</li>
              <li>Calendario attività, task e promemoria</li>
              <li>Campagne email con tracking aperture e click</li>
              <li>Automazioni workflow per follow-up e processi ripetitivi</li>
              <li>AI Assistant per bozze email, analisi opportunità e forecast</li>
              <li>Import contatti da Excel e CSV</li>
              <li>Report e analytics in tempo reale</li>
              <li>Gestione lead con score e conversione in affare</li>
              <li>SMTP personalizzato per invio email dal tuo dominio</li>
            </ul>
            <p>
              Il piano <strong>Starter è gratuito per sempre</strong> e non richiede carta di credito. Il piano <strong>Pro a €29/mese</strong> include tutte le funzionalità avanzate.
            </p>
          </div>
        </div>
      </section>

      {/* Privacy & Security */}
      <section className="bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Privacy e sicurezza</h2>
          <div className="space-y-3 text-sm leading-relaxed text-slate-600">
            <p>I tuoi dati sono archiviati su infrastruttura europea, crittografati in transito (TLS 1.2+) e a riposo. Non vendiamo i tuoi dati a terzi né li utilizziamo per pubblicità.</p>
            <p>Siamo conformi al GDPR (Regolamento UE 2016/679). Puoi esportare o richiedere la cancellazione dei tuoi dati in qualsiasi momento.</p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
              <Link href="/termini" className="text-blue-600 hover:underline">Termini di Servizio</Link>
              <Link href="/cookie" className="text-blue-600 hover:underline">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Contact + CTA */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold text-slate-900">Contattaci</h2>
            <p className="text-slate-600">Per domande sul prodotto, supporto tecnico o informazioni commerciali:</p>
            <ul className="mt-4 space-y-2 text-slate-600">
              <li>Supporto generale: <a href="mailto:support@pipely.it" className="text-blue-600 hover:underline">support@pipely.it</a></li>
              <li>Privacy e GDPR: <a href="mailto:privacy@pipely.it" className="text-blue-600 hover:underline">privacy@pipely.it</a></li>
              <li>Pagina contatti: <Link href="/contatti" className="text-blue-600 hover:underline">pipely.it/contatti</Link></li>
            </ul>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-center">
            <h2 className="mb-2 text-xl font-semibold text-white">Prova Pipely gratis</h2>
            <p className="mb-6 text-blue-100">Piano Starter gratuito per sempre. Nessuna carta di credito richiesta.</p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-all"
            >
              Crea il tuo account <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
