import Link from "next/link";
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
} from "lucide-react";
import { PipelyAppIcon, PipelyWordmark } from "@/components/shared/PipelyLogo";

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

const automationSteps = [
  { trigger: "Affare spostato in «Proposta»", actions: ["Crea attività follow-up +3gg", "Invia notifica al responsabile"] },
  { trigger: "Nuovo contatto creato", actions: ["Invia email di benvenuto", "Crea task di verifica"] },
  { trigger: "Affare segnato come Vinto 🎉", actions: ["Notifica tutto il team", "Invia email onboarding", "Crea meeting kickoff"] },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <PipelyWordmark />
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Funzionalità</a>
            <a href="#automations" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Automazioni</a>
            <a href="#ai" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">AI</a>
            <a href="#pricing" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Prezzi</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Accedi
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Inizia gratis
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-6 py-28 text-center">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-blue-600/20 blur-3xl" />
          <div className="absolute right-0 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full bg-teal-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-medium text-blue-300">
            <Sparkles className="h-3.5 w-3.5" />
            CRM italiano con AI + automazioni reali
          </div>

          <h1 className="mb-6 text-5xl font-semibold leading-tight tracking-tight text-white md:text-6xl lg:text-7xl">
            Chiudi più affari.{" "}
            <span className="bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
              Lavora meno.
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-300">
            Pipely è la piattaforma di sales management pensata per team italiani. Pipeline, contatti,
            automazioni che funzionano davvero, campagne email con tracking e AI assistant — tutto integrato.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-all hover:shadow-blue-500/40"
            >
              Inizia gratis
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-8 py-3.5 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/15 transition-all"
            >
              Accedi all&apos;account
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {benefits.map((b) => (
              <span key={b} className="flex items-center gap-1.5 text-sm text-slate-400">
                <CheckCircle2 className="h-4 w-4 text-teal-400" />
                {b}
              </span>
            ))}
          </div>
        </div>

        {/* Dashboard mockup */}
        <div className="relative mx-auto mt-20 max-w-5xl">
          <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-1 shadow-2xl shadow-black/40 backdrop-blur-sm">
            <div className="rounded-xl bg-slate-900 p-4">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500/60" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                  <div className="h-3 w-3 rounded-full bg-green-500/60" />
                </div>
                <div className="h-6 flex-1 rounded-md bg-slate-700/50" />
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Lead", color: "bg-slate-600", deals: [85, 60, 75] },
                  { label: "Qualificato", color: "bg-blue-600", deals: [90, 50] },
                  { label: "Proposta", color: "bg-violet-600", deals: [70, 80, 55] },
                  { label: "Chiuso ✓", color: "bg-teal-600", deals: [65, 95] },
                ].map((col) => (
                  <div key={col.label} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${col.color}`} />
                      <span className="text-xs font-medium text-slate-400">{col.label}</span>
                    </div>
                    {col.deals.map((w, i) => (
                      <div key={i} className="rounded-lg bg-slate-700/60 p-2.5 border border-slate-600/30">
                        <div className="mb-1.5 h-2 rounded bg-slate-500/60" style={{ width: `${w}%` }} />
                        <div className="h-1.5 w-1/2 rounded bg-slate-600/60" />
                        <div className="mt-2 flex items-center justify-between">
                          <div className="h-4 w-4 rounded-full bg-blue-500/50" />
                          <div className="h-1.5 w-8 rounded bg-teal-500/50" />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="absolute -bottom-10 left-1/2 h-32 w-3/4 -translate-x-1/2 rounded-full bg-blue-600/20 blur-3xl" />
        </div>
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
      <section id="features" className="py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-xs font-medium text-blue-600">
              <Zap className="h-3.5 w-3.5" />
              Tutto quello che ti serve, niente di superfluo
            </div>
            <h2 className="text-4xl font-semibold tracking-tight text-slate-900">
              Una piattaforma, ogni processo di vendita
            </h2>
            <p className="mt-4 text-lg text-slate-500">
              Dalla prima conversazione alla firma del contratto — e oltre.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md hover:border-slate-200 transition-all"
              >
                <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${f.color} text-white`}>
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-semibold text-slate-900">{f.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Automations ── */}
      <section id="automations" className="bg-gradient-to-br from-slate-900 via-fuchsia-950 to-slate-900 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-1.5 text-xs font-medium text-fuchsia-300">
            <Workflow className="h-3.5 w-3.5" />
            Automazioni che eseguono davvero
          </div>
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <h2 className="mb-6 text-4xl font-semibold leading-tight tracking-tight text-white">
                Configura una volta.{" "}
                <span className="bg-gradient-to-r from-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                  Lavora in automatico.
                </span>
              </h2>
              <p className="mb-8 text-lg leading-relaxed text-slate-300">
                I workflow di Pipely non sono solo configurazioni — eseguono azioni reali:
                inviano email, creano attività nel calendario, spostano deal tra stage e notificano il team.
              </p>
              <ul className="space-y-3">
                {[
                  "Trigger su ogni evento CRM (affare, contatto, lead)",
                  "Invio email automatico via SMTP o Resend",
                  "Creazione attività con data di scadenza calcolata",
                  "Notifiche in-app istantanee al team",
                  "Log completo di ogni esecuzione",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-fuchsia-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Automation mockup */}
            <div className="space-y-3">
              {automationSteps.map((step, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-slate-800/50 p-4 backdrop-blur-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-fuchsia-600/30 text-xs font-bold text-fuchsia-300">
                      {i + 1}
                    </div>
                    <p className="text-sm font-medium text-slate-200">
                      <span className="text-fuchsia-400">Trigger:</span> {step.trigger}
                    </p>
                  </div>
                  <div className="ml-8 space-y-1.5">
                    {step.actions.map((action) => (
                      <div key={action} className="flex items-center gap-2 text-xs text-slate-400">
                        <ArrowRight className="h-3 w-3 text-fuchsia-500/60 shrink-0" />
                        {action}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-900/10 px-4 py-3 text-xs text-fuchsia-300 text-center">
                ✓ Tutte le esecuzioni vengono tracciate nel log
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Email tracking ── */}
      <section className="bg-slate-50 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="mb-4 text-sm font-semibold text-slate-700">Campagna — Newsletter Maggio</p>
              <div className="space-y-3">
                {[
                  { label: "Inviata a", value: "1.240 contatti", color: "text-slate-600" },
                  { label: "Aperture", value: "68%  (843)", color: "text-emerald-600" },
                  { label: "Click sui link", value: "24%  (298)", color: "text-blue-600" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5">
                    <span className="text-sm text-slate-500">{row.label}</span>
                    <span className={`text-sm font-semibold ${row.color}`}>{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-2.5 flex items-center gap-2">
                <MousePointerClick className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-xs text-emerald-700">Tracking aperture e click in tempo reale per ogni campagna</span>
              </div>
            </div>

            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-sky-50 px-4 py-1.5 text-xs font-medium text-sky-600">
                <Megaphone className="h-3.5 w-3.5" />
                Email marketing integrato
              </div>
              <h2 className="mb-6 text-3xl font-semibold tracking-tight text-slate-900">
                Sai chi apre le tue email — e chi no
              </h2>
              <p className="mb-6 text-lg leading-relaxed text-slate-500">
                Crea liste di contatti, progetta campagne con template e monitora aperture e click
                in tempo reale. Il tracking funziona con pixel invisibili e redirect tracciati.
              </p>
              <ul className="space-y-2.5">
                {[
                  "Import contatti da Excel/CSV con rilevamento colonne",
                  "Template email con variabili {{nome}}, {{email}}",
                  "Tracciamento aperture con pixel 1×1",
                  "Redirect tracciati per ogni link",
                  "SMTP personalizzato: Gmail, Aruba, Libero, custom",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-slate-600">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── AI section ── */}
      <section id="ai" className="bg-gradient-to-br from-indigo-950 to-slate-900 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-300">
                <Sparkles className="h-3.5 w-3.5" />
                AI integrata
              </div>
              <h2 className="mb-6 text-4xl font-semibold leading-tight tracking-tight text-white">
                Il tuo assistente di vendita,
                <span className="bg-gradient-to-r from-indigo-400 to-teal-400 bg-clip-text text-transparent">
                  {" "}sempre disponibile
                </span>
              </h2>
              <p className="mb-8 text-lg leading-relaxed text-slate-300">
                Chiedi in linguaggio naturale con i tuoi dati reali. Forecast revenue, deal a rischio,
                bozze email personalizzate — tutto in pochi secondi.
              </p>
              <ul className="space-y-3">
                {[
                  "Insights automatici su deal in stallo",
                  "Forecast revenue con confidenza",
                  "AI Email Writer per bozze in un click",
                  "Raccomandazioni azioni prioritarie",
                  "Risponde con i dati reali della tua pipeline",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* AI chat mockup */}
            <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-4 backdrop-blur-sm">
              <div className="mb-3 flex items-center gap-2 border-b border-white/10 pb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-medium text-white">Pipely AI</span>
                <div className="ml-auto h-2 w-2 rounded-full bg-teal-400" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-tr-sm bg-indigo-600 px-3.5 py-2.5 text-sm text-white max-w-[80%]">
                    Quali affari sono a rischio questo mese?
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600/30">
                    <Sparkles className="h-3 w-3 text-indigo-400" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-slate-700/80 px-3.5 py-2.5 text-sm text-slate-200 max-w-[85%]">
                    Ho trovato <span className="font-semibold text-orange-400">3 deal</span> senza attività da oltre 14 giorni:
                    Acme Corp (€45k), TechStart Srl (€28k) e Beta Industries (€19k).
                    Ti consiglio di pianificare un follow-up entro domani.
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-tr-sm bg-indigo-600 px-3.5 py-2.5 text-sm text-white max-w-[80%]">
                    Scrivimi una email per Acme Corp
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600/30">
                    <Sparkles className="h-3 w-3 text-indigo-400" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-slate-700/80 px-3.5 py-2.5 text-sm text-slate-200 max-w-[85%]">
                    <div className="mb-1 text-xs text-slate-400">Oggetto: Aggiornamento sulla nostra proposta</div>
                    Gentile referente di Acme Corp, volevo fare un follow-up sulla proposta che le abbiamo inviato…
                    <span className="mt-1 block text-xs text-teal-400 cursor-pointer hover:underline">Continua a leggere →</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2">
                <span className="flex-1 text-sm text-slate-500">Scrivi un messaggio…</span>
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600">
                  <ArrowRight className="h-3 w-3 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-medium text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" />
              Piani semplici
            </div>
            <h2 className="text-4xl font-semibold tracking-tight text-slate-900">
              Prezzi trasparenti, nessuna sorpresa
            </h2>
            <p className="mt-3 text-slate-500">Inizia gratis. Passa a Pro quando hai bisogno di più potenza.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
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
                excluded: ["AI Assistant", "Automazioni", "Campagne email", "SMTP personalizzato"],
                cta: "Inizia gratis",
                href: "/register",
                highlight: false,
              },
              {
                name: "Pro",
                price: "29€",
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
                cta: "Inizia la prova",
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
                  "SLA 99.9% garantito",
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
              <div
                key={plan.name}
                className={`relative rounded-2xl p-8 ${
                  plan.highlight
                    ? "bg-blue-600 text-white shadow-xl shadow-blue-600/30"
                    : "border border-slate-200 bg-white"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-teal-400 px-3 py-1 text-xs font-semibold text-slate-900">
                    Più popolare
                  </div>
                )}
                <div className="mb-6">
                  <div className={`text-sm font-medium ${plan.highlight ? "text-blue-200" : "text-slate-500"}`}>
                    {plan.name}
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className={`text-4xl font-bold ${plan.highlight ? "text-white" : "text-slate-900"}`}>
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className={`text-sm ${plan.highlight ? "text-blue-200" : "text-slate-400"}`}>
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <div className={`mt-1 text-sm ${plan.highlight ? "text-blue-200" : "text-slate-500"}`}>
                    {plan.description}
                  </div>
                </div>
                <ul className="mb-6 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <CheckCircle2 className={`h-4 w-4 shrink-0 ${plan.highlight ? "text-teal-300" : "text-blue-500"}`} />
                      <span className={plan.highlight ? "text-blue-50" : "text-slate-600"}>{f}</span>
                    </li>
                  ))}
                  {plan.excluded.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm opacity-40">
                      <XCircle className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="text-slate-500">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`block w-full rounded-xl py-2.5 text-center text-sm font-semibold transition-all ${
                    plan.highlight
                      ? "bg-white text-blue-600 hover:bg-blue-50"
                      : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <section className="border-y border-slate-100 bg-slate-50 py-12 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
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
                desc: "Ogni automazione e ogni evento importante ti raggiunge con notifiche in-app istantanee.",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{item.title}</div>
                  <div className="mt-1 text-sm text-slate-500">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-gradient-to-br from-blue-600 to-indigo-700 px-6 py-24 text-center">
        <div className="mx-auto max-w-2xl">
          <PipelyAppIcon size={56} className="mx-auto mb-6 rounded-2xl" />
          <h2 className="mb-4 text-4xl font-semibold text-white">
            Pronto a chiudere più affari?
          </h2>
          <p className="mb-8 text-lg text-blue-100">
            Gratis per sempre nel piano Starter. Nessuna carta di credito, setup in 5 minuti.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-blue-600 shadow-lg hover:bg-blue-50 transition-all"
          >
            Crea il tuo account gratis
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-900 px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              <PipelyAppIcon size={28} className="rounded-lg" />
              <span className="font-semibold text-white">Pipely</span>
            </div>
            <div className="flex flex-wrap justify-center gap-5 text-sm text-slate-400">
              <a href="#features" className="hover:text-white transition-colors">Funzionalità</a>
              <a href="#automations" className="hover:text-white transition-colors">Automazioni</a>
              <a href="#pricing" className="hover:text-white transition-colors">Prezzi</a>
              <Link href="/contatti" className="hover:text-white transition-colors">Contatti</Link>
              <Link href="/login" className="hover:text-white transition-colors">Accedi</Link>
              <Link href="/register" className="hover:text-white transition-colors">Registrati</Link>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <div className="text-sm text-slate-500">
                © {new Date().getFullYear()} Pipely. Tutti i diritti riservati.
              </div>
              <div className="flex gap-4 text-xs text-slate-600">
                <Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
                <Link href="/termini" className="hover:text-slate-300 transition-colors">Termini di Servizio</Link>
                <Link href="/cookie" className="hover:text-slate-300 transition-colors">Cookie Policy</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
