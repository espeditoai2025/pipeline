import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pipely — CRM italiano con AI, pipeline Kanban e automazioni",
  description:
    "Chiudi più affari con Pipely: CRM per team italiani con pipeline Kanban, contatti, campagne email, workflow automatizzati e AI Assistant integrato. Inizia gratis.",
  alternates: { canonical: "https://www.pipely.it" },
  openGraph: {
    title: "Pipely — CRM italiano con AI, pipeline e automazioni",
    description:
      "CRM italiano con AI Assistant, pipeline Kanban, automazioni reali e campagne email. Gratis per sempre nel piano Starter.",
    url: "https://www.pipely.it",
    images: [
      {
        url: "https://www.pipely.it/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Pipely CRM — Chiudi più affari. Lavora meno.",
      },
    ],
  },
};
import {
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Mail,
  Package,
  Sparkles,
  Users,
  Workflow,
  Zap,
  ArrowRight,
  TrendingUp,
  Shield,
  Globe,
  MousePointerClick,
  Bell,
  FileSpreadsheet,
  Megaphone,
  XCircle,
  ChevronDown,
} from "lucide-react";
import { PipelyAppIcon, PipelyWordmark } from "@/components/shared/PipelyLogo";
import { KanbanPreview } from "@/components/marketing/KanbanPreview";
import { FadeIn, FadeInStagger, FadeInStaggerItem } from "@/components/ui/FadeIn";

const features = [
  {
    icon: Briefcase,
    color: "bg-blue-500",
    title: "Pipeline Kanban",
    description:
      "Drag & drop tra stage personalizzati. Visualizza lo stato di ogni affare, il valore e il responsabile a colpo d'occhio.",
  },
  {
    icon: Users,
    color: "bg-violet-500",
    title: "Contatti & Aziende",
    description:
      "Database clienti unificato con storico completo: interazioni, attività, affari e campi personalizzati.",
  },
  {
    icon: Calendar,
    color: "bg-emerald-500",
    title: "Attività & Calendario",
    description:
      "Pianifica chiamate, meeting, task e scadenze. I workflow attivano automaticamente le attività di follow-up.",
  },
  {
    icon: BarChart3,
    color: "bg-orange-500",
    title: "Report & Analytics",
    description:
      "KPI in tempo reale, funnel di conversione, trend mensili e performance del team sempre aggiornati.",
  },
  {
    icon: Megaphone,
    color: "bg-sky-500",
    title: "Campagne email",
    description:
      "Crea e invia campagne alle tue liste. Traccia aperture e click in tempo reale con pixel di tracking.",
  },
  {
    icon: Mail,
    color: "bg-indigo-500",
    title: "SMTP personalizzato",
    description:
      "Collega Gmail, Aruba, Libero o qualsiasi provider SMTP. Le email partono dal tuo dominio.",
  },
  {
    icon: Sparkles,
    color: "bg-pink-500",
    title: "AI Assistant",
    description:
      "Chiedi in linguaggio naturale: deal a rischio, forecast revenue, bozze email. Risponde con i tuoi dati reali.",
  },
  {
    icon: Workflow,
    color: "bg-fuchsia-500",
    title: "Automazioni reali",
    description:
      "Workflow trigger-action che eseguono davvero: inviano email, creano attività, spostano deal e notificano il team.",
  },
  {
    icon: MousePointerClick,
    color: "bg-teal-500",
    title: "Tracking aperture & click",
    description:
      "Ogni email inviata include pixel di tracking. Sai esattamente chi ha aperto e su quali link ha cliccato.",
  },
  {
    icon: Building2,
    color: "bg-amber-500",
    title: "Lead management",
    description:
      "Cattura lead da qualsiasi fonte, assegna score, qualifica e converti in affare con un click.",
  },
  {
    icon: Package,
    color: "bg-lime-500",
    title: "Catalogo prodotti",
    description:
      "Gestisci il listino, collega prodotti agli affari e calcola totali con IVA automaticamente.",
  },
  {
    icon: FileSpreadsheet,
    color: "bg-cyan-500",
    title: "Import XLS / CSV",
    description:
      "Importa contatti da Excel o CSV. Rilevamento colonne automatico, gestione duplicati e aggiornamento live della lista.",
  },
];

const stats = [
  { value: "12+", label: "Moduli integrati" },
  { value: "100%", label: "Made in Italia" },
  { value: "0€", label: "Per iniziare" },
  { value: "Reali", label: "Automazioni" },
];

const benefits = [
  "Nessuna carta di credito",
  "Setup in meno di 5 minuti",
  "Dati sempre al sicuro",
  "Supporto in italiano",
];

const seoLinkSections = [
  {
    title: "CRM per team",
    links: [
      { href: "/crm-per-pmi", label: "CRM per PMI" },
      { href: "/crm-commerciale", label: "CRM commerciale" },
      { href: "/crm-per-agenzie", label: "CRM per agenzie" },
      { href: "/crm-per-consulenti", label: "CRM per consulenti" },
      { href: "/crm-email-marketing", label: "CRM email marketing" },
    ],
  },
  {
    title: "CRM per settore",
    links: [
      { href: "/crm-per-agenti-di-commercio", label: "Agenti di commercio" },
      { href: "/crm-per-studi-legali", label: "Studi legali" },
      { href: "/crm-per-commercialisti", label: "Commercialisti" },
      { href: "/crm-per-agenzie-immobiliari", label: "Agenzie immobiliari" },
      { href: "/crm-per-ecommerce", label: "Ecommerce" },
    ],
  },
  {
    title: "Confronti CRM",
    links: [
      { href: "/alternativa-pipedrive", label: "Alternativa Pipedrive" },
      { href: "/alternativa-hubspot", label: "Alternativa HubSpot" },
      { href: "/migliori-crm-italiani", label: "Migliori CRM italiani" },
    ],
  },
];

const faqs = [
  {
    q: "Cos'è un CRM?",
    a: "Un CRM (Customer Relationship Management) è un software che centralizza la gestione dei rapporti con i clienti: contatti, trattative, attività e comunicazioni in un unico posto. Invece di usare fogli Excel e email separate, tutto il team ha accesso alle stesse informazioni in tempo reale.",
  },
  {
    q: "Perché le PMI hanno bisogno di un CRM?",
    a: "Le PMI perdono mediamente il 20–30% delle opportunità per mancanza di follow-up. Un CRM come Pipely automatizza i promemoria, traccia ogni interazione e mostra in tempo reale lo stato di ogni trattativa. Il risultato: più affari chiusi, meno lavoro manuale e nessun cliente dimenticato.",
  },
  {
    q: "CRM vs Excel: qual è la differenza?",
    a: "Excel è statico: ogni aggiornamento è manuale, non c'è cronologia automatica, non puoi collaborare in tempo reale e non invia promemoria. Un CRM è dinamico: storico completo di ogni cliente, notifiche automatiche, automazioni workflow, report in tempo reale e accesso da qualsiasi dispositivo.",
  },
  {
    q: "Quanto costa un CRM?",
    a: "Pipely è gratuito per sempre nel piano Starter (1 pipeline, fino a 500 contatti). Il piano Pro costa 29€/mese e include pipeline illimitate, AI Assistant, automazioni avanzate e campagne email con tracking. Nessun costo nascosto, nessun contratto annuale obbligatorio.",
  },
  {
    q: "Come si automatizzano i follow-up con un CRM?",
    a: "Con Pipely crei workflow trigger-action: ad esempio «quando un affare non ha attività da 7 giorni → crea task di follow-up e notifica il responsabile». Si configura una volta e funziona in automatico, senza dover ricordare manualmente ogni cliente.",
  },
  {
    q: "Pipely è gratuito?",
    a: "Sì. Il piano Starter è gratuito per sempre e non richiede la carta di credito. Include 1 pipeline, fino a 500 contatti, calendario attività, catalogo prodotti e import XLS/CSV. Puoi passare al piano Pro in qualsiasi momento se hai bisogno di più funzionalità.",
  },
  {
    q: "Posso importare i miei contatti da Excel?",
    a: "Assolutamente. Pipely supporta l'import da file XLS e CSV con rilevamento automatico delle colonne. Puoi verificare un'anteprima dei dati e gestire i duplicati prima di confermare. Il processo richiede meno di 2 minuti.",
  },
  {
    q: "Il CRM funziona completamente in italiano?",
    a: "Sì, Pipely è 100% in italiano: interfaccia, notifiche, supporto e documentazione. È stato sviluppato specificamente per i team italiani, con attenzione alle esigenze delle PMI del mercato italiano.",
  },
];

const automationSteps = [
  {
    trigger: "Affare spostato in «Proposta»",
    actions: ["Crea attività follow-up +3gg", "Invia notifica al responsabile"],
  },
  {
    trigger: "Nuovo contatto creato",
    actions: ["Invia email di benvenuto", "Crea task di verifica"],
  },
  {
    trigger: "Affare segnato come Vinto 🎉",
    actions: ["Notifica tutto il team", "Invia email onboarding", "Crea meeting kickoff"],
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://www.pipely.it/#organization",
      name: "Pipely",
      url: "https://www.pipely.it",
      logo: "https://www.pipely.it/pipely-app-icon-blue.svg",
      contactPoint: {
        "@type": "ContactPoint",
        email: "support@pipely.it",
        contactType: "customer support",
        availableLanguage: "Italian",
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://www.pipely.it/#app",
      name: "Pipely CRM",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, iOS, Android",
      url: "https://www.pipely.it",
      description:
        "CRM italiano con pipeline Kanban, contatti, campagne email, automazioni workflow e AI Assistant integrato.",
      offers: [
        {
          "@type": "Offer",
          name: "Starter",
          price: "0",
          priceCurrency: "EUR",
          description: "Piano gratuito per sempre",
        },
        {
          "@type": "Offer",
          name: "Pro",
          price: "29",
          priceCurrency: "EUR",
          billingIncrement: "P1M",
          description: "Pipeline illimitate, AI Assistant, automazioni avanzate",
        },
      ],
      publisher: { "@id": "https://www.pipely.it/#organization" },
    },
    {
      "@type": "WebSite",
      "@id": "https://www.pipely.it/#website",
      url: "https://www.pipely.it",
      name: "Pipely",
      publisher: { "@id": "https://www.pipely.it/#organization" },
      inLanguage: "it-IT",
    },
    {
      "@type": "LocalBusiness",
      "@id": "https://www.pipely.it/#localbusiness",
      name: "Pipely",
      url: "https://www.pipely.it",
      email: "support@pipely.it",
      areaServed: { "@type": "Country", "name": "Italia" },
      knowsLanguage: "it",
      priceRange: "€–€€",
      sameAs: ["https://www.pipely.it"],
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <PipelyWordmark />
          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm text-slate-500 transition-colors hover:text-slate-900"
            >
              Funzionalità
            </a>
            <a
              href="#automations"
              className="text-sm text-slate-500 transition-colors hover:text-slate-900"
            >
              Automazioni
            </a>
            <a href="#ai" className="text-sm text-slate-500 transition-colors hover:text-slate-900">
              AI
            </a>
            <a
              href="#pricing"
              className="text-sm text-slate-500 transition-colors hover:text-slate-900"
            >
              Prezzi
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              Accedi
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Inizia gratis
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden bg-slate-950 px-6 py-28 text-center sm:py-36">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-0 left-1/2 h-[700px] w-[900px] -translate-x-1/2 rounded-full bg-blue-600/20 blur-[100px]" />
            <div className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-teal-500/10 blur-[100px]" />
          </div>

          <FadeInStagger className="relative mx-auto max-w-4xl" faster>
            <FadeInStaggerItem>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-medium text-blue-300 shadow-inner">
                <Sparkles className="h-3.5 w-3.5" />
                CRM italiano con AI + automazioni reali
              </div>
            </FadeInStaggerItem>

            <FadeInStaggerItem>
              <h1 className="mb-4 text-5xl leading-tight font-bold tracking-tight text-white md:text-6xl lg:text-7xl">
                CRM Italiano con AI{" "}
                <span className="bg-gradient-to-br from-blue-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent">
                  e Automazioni per PMI
                </span>
              </h1>
            </FadeInStaggerItem>

            <FadeInStaggerItem>
              <p className="mb-6 text-2xl font-medium tracking-tight text-white/80">
                Chiudi più affari. Lavora meno.
              </p>
            </FadeInStaggerItem>

            <FadeInStaggerItem>
              <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-300">
                Pipely è la piattaforma di sales management pensata per team italiani. Pipeline,
                contatti, automazioni che funzionano davvero, campagne email con tracking e AI
                assistant — tutto integrato.
              </p>
            </FadeInStaggerItem>

            <FadeInStaggerItem>
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link
                  href="/register"
                  className="group flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] transition-all hover:scale-105 hover:bg-blue-500 hover:shadow-[0_0_60px_-15px_rgba(37,99,235,0.7)] active:scale-95"
                >
                  Inizia gratis
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/login"
                  className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-8 py-3.5 text-base font-semibold text-white backdrop-blur-md transition-all hover:bg-white/10 hover:scale-105 active:scale-95"
                >
                  Accedi all&apos;account
                </Link>
              </div>
            </FadeInStaggerItem>

            <FadeInStaggerItem>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                {benefits.map((b) => (
                  <span key={b} className="flex items-center gap-1.5 text-sm text-slate-400">
                    <CheckCircle2 className="h-4 w-4 text-teal-400" />
                    {b}
                  </span>
                ))}
              </div>
            </FadeInStaggerItem>
          </FadeInStagger>

          {/* Dashboard mockup animato */}
          <FadeIn delay={0.6} direction="up" className="relative mx-auto mt-20 max-w-5xl">
            <KanbanPreview />
            <div className="absolute -bottom-10 left-1/2 h-32 w-3/4 -translate-x-1/2 rounded-full bg-blue-600/30 blur-3xl" />
          </FadeIn>
        </section>

        {/* ── Stats ── */}
        <section className="border-b border-slate-100 bg-slate-50 py-12">
          <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 px-6 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-4xl font-bold text-blue-600">{s.value}</div>
                <div className="mt-1 text-sm text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="px-6 py-24 bg-slate-50">
          <div className="mx-auto max-w-7xl">
            <FadeIn direction="up" className="mb-16 text-center">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-100/50 px-4 py-1.5 text-xs font-semibold text-blue-700">
                <Zap className="h-3.5 w-3.5" />
                Funzionalità CRM Complete
              </div>
              <h2 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
                Tutto il processo di vendita,{" "}
                <span className="text-slate-500">in un solo strumento</span>
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
                Dal primo contatto alla firma del contratto, Pipely offre gli strumenti per gestire ogni fase della pipeline senza perdite di tempo.
              </p>
            </FadeIn>

            <FadeInStagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <FadeInStaggerItem key={f.title}>
                  <article className="group h-full rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/5">
                    <div
                      className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl ${f.color} text-white shadow-inner transition-transform group-hover:scale-110`}
                      aria-hidden="true"
                    >
                      <f.icon className="h-6 w-6" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-slate-900">{f.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-600">{f.description}</p>
                  </article>
                </FadeInStaggerItem>
              ))}
            </FadeInStagger>
          </div>
        </section>

        {/* ── Automations ── */}
        <section
          id="automations"
          className="relative bg-slate-950 px-6 py-24 overflow-hidden"
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-1/2 left-0 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-fuchsia-600/10 blur-[120px]" />
          </div>

          <div className="relative mx-auto max-w-6xl">
            <div className="grid items-center gap-12 md:grid-cols-2">
              <FadeIn direction="right">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-1.5 text-xs font-semibold text-fuchsia-300 shadow-inner">
                  <Workflow className="h-3.5 w-3.5" />
                  Software Automazioni CRM
                </div>
                <h2 className="mb-6 text-4xl leading-tight font-bold tracking-tight text-white md:text-5xl">
                  Configura una volta.{" "}
                  <span className="bg-gradient-to-r from-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                    Lavora in automatico.
                  </span>
                </h2>
                <p className="mb-8 text-lg leading-relaxed text-slate-300">
                  I workflow automatizzati di Pipely non sono solo regole visive — eseguono azioni reali e continue: inviano
                  email, creano attività nel calendario, spostano trattative ed eliminano il lavoro manuale.
                </p>
                <ul className="space-y-4">
                  {[
                    "Trigger su ogni evento CRM (affare, contatto, lead)",
                    "Invio email automatico personalizzato",
                    "Creazione attività con scadenze intelligenti",
                    "Notifiche in-app istantanee al team",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-fuchsia-500/20">
                        <CheckCircle2 className="h-4 w-4 text-fuchsia-400" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </FadeIn>

              {/* Automation mockup */}
              <FadeInStagger className="space-y-4" faster>
                {automationSteps.map((step, i) => (
                  <FadeInStaggerItem key={i}>
                    <div className="group rounded-2xl border border-white/5 bg-white/5 p-5 backdrop-blur-md transition-colors hover:bg-white/10">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-fuchsia-600/30 font-semibold text-fuchsia-300">
                          {i + 1}
                        </div>
                        <p className="font-medium text-slate-200">
                          <span className="text-fuchsia-400 mr-1">Se</span> {step.trigger}
                        </p>
                      </div>
                      <div className="ml-11 space-y-2">
                        {step.actions.map((action) => (
                          <div
                            key={action}
                            className="flex items-center gap-2 text-sm text-slate-400"
                          >
                            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-fuchsia-500/60" />
                            {action}
                          </div>
                        ))}
                      </div>
                    </div>
                  </FadeInStaggerItem>
                ))}
              </FadeInStagger>
            </div>
          </div>
        </section>

        {/* ── Email tracking ── */}
        <section className="bg-white px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="grid items-center gap-12 md:grid-cols-2">
              <FadeIn direction="up" className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
                <p className="mb-6 text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Campagna — Lancio Q3
                </p>
                <div className="space-y-4">
                  {[
                    { label: "Inviata a", value: "1.240 contatti", color: "text-slate-600", bg: "bg-slate-50" },
                    { label: "Aperture", value: "68%  (843)", color: "text-emerald-700", bg: "bg-emerald-50" },
                    { label: "Click sui link", value: "24%  (298)", color: "text-blue-700", bg: "bg-blue-50" },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className={`flex items-center justify-between rounded-xl px-5 py-4 ${row.bg}`}
                    >
                      <span className="font-medium text-slate-600">{row.label}</span>
                      <span className={`font-bold ${row.color}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 px-5 py-4">
                  <MousePointerClick className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <p className="text-sm font-medium text-emerald-800 leading-relaxed">
                    Il pixel di tracking proprietario ha rilevato 843 aperture univoche. I click si sono concentrati sul link principale.
                  </p>
                </div>
              </FadeIn>

              <FadeIn direction="left">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-sky-100/50 px-4 py-1.5 text-xs font-semibold text-sky-700">
                  <Megaphone className="h-3.5 w-3.5" />
                  CRM con Email Marketing
                </div>
                <h2 className="mb-6 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
                  Sai chi apre le tue email — <span className="text-slate-500">e chi no</span>
                </h2>
                <p className="mb-6 text-lg leading-relaxed text-slate-600">
                  Non servono tool esterni per le newsletter. Crea liste segmentate nel CRM, progetta campagne e monitora aperture e click in tempo reale.
                </p>
                <ul className="space-y-4">
                  {[
                    "Template email con variabili dinamiche",
                    "Tracciamento aperture con pixel 1×1",
                    "Redirect tracciati per ogni link inserito",
                    "SMTP personalizzato (invia dal tuo dominio)",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm font-medium text-slate-700">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ── AI section ── */}
        <section id="ai" className="relative bg-slate-950 px-6 py-24 overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-1/2 right-0 h-[600px] w-[600px] -translate-y-1/2 rounded-full bg-indigo-600/10 blur-[120px]" />
          </div>
          <div className="relative mx-auto max-w-6xl">
            <div className="grid items-center gap-12 md:grid-cols-2">
              <FadeIn direction="right">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-300 shadow-inner">
                  <Sparkles className="h-3.5 w-3.5" />
                  Intelligenza Artificiale per le Vendite
                </div>
                <h2 className="mb-6 text-4xl leading-tight font-bold tracking-tight text-white md:text-5xl">
                  Il tuo assistente di vendita,
                  <span className="bg-gradient-to-r from-indigo-400 to-teal-400 bg-clip-text text-transparent">
                    {" "}
                    sempre disponibile
                  </span>
                </h2>
                <p className="mb-8 text-lg leading-relaxed text-slate-300">
                  Chiedi in linguaggio naturale con i tuoi dati reali. Forecast revenue, analisi delle trattative a
                  rischio, bozze email personalizzate — tutto in pochi secondi per aiutarti a chiudere più affari.
                </p>
                <ul className="space-y-4">
                  {[
                    "Insights automatici su deal in stallo",
                    "Forecast revenue con grado di confidenza",
                    "AI Email Writer per bozze in un click",
                    "Risponde analizzando i dati reali della tua pipeline",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20">
                        <CheckCircle2 className="h-4 w-4 text-teal-400" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </FadeIn>

              {/* AI chat mockup */}
              <FadeIn direction="left" delay={0.2}>
                <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-5 backdrop-blur-xl shadow-2xl">
                  <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/30">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-white">Pipely AI</span>
                    <div className="ml-auto flex h-2 w-2 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)] animate-pulse" />
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-md">
                        Quali affari sono a rischio questo mese?
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600/30">
                        <Sparkles className="h-3 w-3 text-indigo-400" />
                      </div>
                      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-slate-700/60 px-4 py-3 text-sm leading-relaxed text-slate-200">
                        Ho trovato <span className="font-semibold text-orange-400">3 deal</span> senza
                        attività da oltre 14 giorni: Acme Corp (€45k), TechStart Srl (€28k) e Beta
                        Industries (€19k). Ti consiglio di pianificare un follow-up entro domani.
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-md">
                        Scrivimi una email per Acme Corp
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600/30">
                        <Sparkles className="h-3 w-3 text-indigo-400" />
                      </div>
                      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-slate-700/60 px-4 py-3 text-sm leading-relaxed text-slate-200">
                        <div className="mb-2 text-xs font-semibold text-indigo-300">
                          Oggetto: Aggiornamento sulla nostra proposta
                        </div>
                        Gentile referente di Acme Corp, volevo fare un follow-up sulla proposta che le
                        abbiamo inviato…
                        <span className="mt-2 block cursor-pointer text-xs font-semibold text-teal-400 hover:text-teal-300 transition-colors">
                          Continua a leggere →
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/50 px-4 py-2.5 transition-colors focus-within:border-indigo-500/50">
                    <span className="flex-1 text-sm text-slate-500">Scrivi un messaggio…</span>
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors cursor-pointer">
                      <ArrowRight className="h-3.5 w-3.5 text-white" />
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className="px-6 py-24 bg-slate-50 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
          <div className="mx-auto max-w-5xl">
            <FadeIn direction="up" className="mb-16 text-center">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-100/50 px-4 py-1.5 text-xs font-semibold text-emerald-700">
                <TrendingUp className="h-3.5 w-3.5" />
                Piani semplici e trasparenti
              </div>
              <h2 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
                Il giusto prezzo per crescere
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
                Inizia gratis, passa a Pro quando il tuo team ha bisogno di più potenza.
              </p>
            </FadeIn>

            <FadeInStagger className="grid gap-8 md:grid-cols-3">
              {[
                {
                  name: "Starter",
                  price: "0€",
                  period: "per sempre",
                  description: "Per freelance e piccoli team",
                  features: [
                    "1 pipeline",
                    "Fino a 500 contatti",
                    "Attività & calendario",
                    "Catalogo prodotti",
                    "Import XLS / CSV",
                    "Report base",
                  ],
                  excluded: [
                    "AI Assistant",
                    "Automazioni",
                    "Campagne email",
                    "SMTP personalizzato",
                  ],
                  cta: "Inizia gratis",
                  href: "/register",
                  highlight: false,
                },
                {
                  name: "Pro",
                  price: "29€",
                  originalPrice: "99€",
                  period: "/ mese",
                  description: "Per team di vendita in crescita",
                  features: [
                    "Pipeline illimitate",
                    "Contatti illimitati",
                    "AI Assistant completo",
                    "Automazioni workflow reali",
                    "Campagne email + tracking",
                    "SMTP personalizzato",
                    "Report personalizzati",
                    "Supporto prioritario",
                  ],
                  excluded: [],
                  cta: "Passa a Pro",
                  href: "/register",
                  highlight: true,
                },
                {
                  name: "Enterprise",
                  price: "Su misura",
                  period: "",
                  description: "Per grandi organizzazioni",
                  features: [
                    "Tutto il piano Pro",
                    "SSO & SAML",
                    "SLA 99.5% (vedi Termini)",
                    "API dedicata",
                    "Onboarding dedicato",
                    "Account manager",
                  ],
                  excluded: [],
                  cta: "Contattaci",
                  href: "/contatti",
                  highlight: false,
                },
              ].map((plan) => (
                <FadeInStaggerItem key={plan.name}>
                  <article
                    className={`relative flex h-full flex-col rounded-3xl p-8 transition-transform duration-300 hover:-translate-y-2 ${
                      plan.highlight
                        ? "bg-blue-600 text-white shadow-2xl shadow-blue-600/30"
                        : "border border-slate-200/80 bg-white shadow-xl shadow-slate-200/20"
                    }`}
                  >
                    {plan.highlight && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-teal-400 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-900 shadow-md">
                        Più popolare
                      </div>
                    )}
                    <div className="mb-6 border-b pb-6 border-current/10">
                      <h3
                        className={`text-lg font-semibold ${plan.highlight ? "text-blue-100" : "text-slate-900"}`}
                      >
                        {plan.name}
                      </h3>
                      {"originalPrice" in plan && plan.originalPrice && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-sm text-blue-200 line-through">
                            {plan.originalPrice}
                          </span>
                          <span className="rounded-full border border-teal-400/40 bg-teal-400/20 px-2 py-0.5 text-xs font-bold text-teal-300">
                            Offerta limitata
                          </span>
                        </div>
                      )}
                      <div className="mt-2 flex items-baseline gap-1">
                        <span
                          className={`text-5xl font-bold tracking-tight ${plan.highlight ? "text-white" : "text-slate-900"}`}
                        >
                          {plan.price}
                        </span>
                        {plan.period && (
                          <span
                            className={`text-sm font-medium ${plan.highlight ? "text-blue-200" : "text-slate-500"}`}
                          >
                            {plan.period}
                          </span>
                        )}
                      </div>
                      <div
                        className={`mt-3 text-sm ${plan.highlight ? "text-blue-100" : "text-slate-600"}`}
                      >
                        {plan.description}
                      </div>
                    </div>
                    <ul className="mb-8 flex-1 space-y-3">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-3 text-sm font-medium">
                          <CheckCircle2
                            className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlight ? "text-teal-300" : "text-blue-600"}`}
                          />
                          <span className={plan.highlight ? "text-white" : "text-slate-700"}>
                            {f}
                          </span>
                        </li>
                      ))}
                      {plan.excluded.map((f) => (
                        <li key={f} className="flex items-start gap-3 text-sm font-medium opacity-50">
                          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                          <span className={plan.highlight ? "text-white" : "text-slate-500"}>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={plan.href}
                      className={`block w-full rounded-xl py-3.5 text-center text-sm font-bold transition-all ${
                        plan.highlight
                          ? "bg-white text-blue-700 hover:bg-blue-50 hover:shadow-lg"
                          : "bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg"
                      }`}
                    >
                      {plan.cta}
                    </Link>
                  </article>
                </FadeInStaggerItem>
              ))}
            </FadeInStagger>
          </div>
        </section>

        {/* ── Trust strip ── */}
        <section className="border-y border-slate-200/60 bg-white px-6 py-16">
          <FadeInStagger className="mx-auto max-w-5xl">
            <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
              {[
                {
                  icon: Shield,
                  title: "Sicurezza enterprise",
                  desc: "Dati crittografati AES-256, HTTPS ovunque, sessioni sicure e password SMTP cifrate.",
                },
                {
                  icon: Globe,
                  title: "100% in italiano",
                  desc: "Interfaccia, supporto e documentazione completamente in italiano per team italiani.",
                },
                {
                  icon: Bell,
                  title: "Notifiche in tempo reale",
                  desc: "Ogni automazione e evento importante ti raggiunge con notifiche in-app istantanee.",
                },
              ].map((item) => (
                <FadeInStaggerItem key={item.title}>
                  <div className="flex flex-col items-center text-center gap-4 group">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 shadow-sm transition-all group-hover:bg-blue-600 group-hover:text-white group-hover:scale-110">
                      <item.icon className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{item.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.desc}</p>
                    </div>
                  </div>
                </FadeInStaggerItem>
              ))}
            </div>
          </FadeInStagger>
        </section>

        {/* ── FAQ ── */}
        <section className="bg-slate-50 px-6 py-24">
          <div className="mx-auto max-w-3xl">
            <FadeIn direction="up" className="mb-12 text-center">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-100/50 px-4 py-1.5 text-xs font-semibold text-blue-700">
                <Zap className="h-3.5 w-3.5" />
                Domande frequenti
              </div>
              <h2 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
                Tutto quello che vuoi sapere
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                Risposte rapide su Pipely, i CRM e come funzionano per le PMI italiane.
              </p>
            </FadeIn>
            <FadeInStagger className="space-y-4">
              {faqs.map((faq) => (
                <FadeInStaggerItem key={faq.q}>
                  <details
                    className="group cursor-pointer rounded-2xl border border-slate-200/80 bg-white px-6 py-5 transition-all hover:border-blue-200 open:shadow-md"
                  >
                    <summary className="flex list-none items-center justify-between font-semibold text-slate-900 text-lg">
                      {faq.q}
                      <ChevronDown className="ml-4 h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                    </summary>
                    <p className="mt-4 text-base leading-relaxed text-slate-600">{faq.a}</p>
                  </details>
                </FadeInStaggerItem>
              ))}
            </FadeInStagger>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-800 px-6 py-24 text-center">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-[100px]" />
          </div>
          <FadeIn direction="up" className="relative mx-auto max-w-2xl">
            <PipelyAppIcon size={64} className="mx-auto mb-8 rounded-2xl shadow-2xl shadow-indigo-900/50" />
            <h2 className="mb-5 text-4xl font-bold tracking-tight text-white md:text-5xl">
              Pronto a chiudere più affari?
            </h2>
            <p className="mb-10 text-xl text-blue-100/90 font-medium">
              Gratis per sempre nel piano Starter. Nessuna carta di credito, setup in 5 minuti.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-10 py-4 text-lg font-bold text-blue-700 shadow-xl shadow-blue-900/20 transition-all hover:scale-105 hover:bg-blue-50 active:scale-95"
            >
              Crea il tuo account gratis
              <ArrowRight className="h-5 w-5" />
            </Link>
          </FadeIn>
        </section>

        {/* ── Footer ── */}
        <section className="border-t border-slate-100 bg-slate-50 px-6 py-14">
          <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-3">
            {seoLinkSections.map((section) => (
              <div key={section.title}>
                <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
                  {section.title}
                </h2>
                <div className="mt-4 grid gap-2.5 text-sm">
                  {section.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-slate-600 transition-colors hover:text-blue-600"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="bg-slate-900 px-6 py-12">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
              <div className="flex items-center gap-3">
                <PipelyAppIcon size={28} className="rounded-lg" />
                <span className="font-semibold text-white">Pipely</span>
              </div>
              <div className="flex flex-wrap justify-center gap-5 text-sm text-slate-400">
                <a href="#features" className="transition-colors hover:text-white">
                  Funzionalità
                </a>
                <a href="#automations" className="transition-colors hover:text-white">
                  Automazioni
                </a>
                <a href="#pricing" className="transition-colors hover:text-white">
                  Prezzi
                </a>
                <Link href="/contatti" className="transition-colors hover:text-white">
                  Contatti
                </Link>
                <Link href="/login" className="transition-colors hover:text-white">
                  Accedi
                </Link>
                <Link href="/register" className="transition-colors hover:text-white">
                  Registrati
                </Link>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <div className="text-sm text-slate-500">
                  © {new Date().getFullYear()} Pipely. Tutti i diritti riservati.
                </div>
                <div className="flex gap-4 text-xs text-slate-600">
                  <Link href="/privacy" className="transition-colors hover:text-slate-300">
                    Privacy Policy
                  </Link>
                  <Link href="/termini" className="transition-colors hover:text-slate-300">
                    Termini di Servizio
                  </Link>
                  <Link href="/cookie" className="transition-colors hover:text-slate-300">
                    Cookie Policy
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
