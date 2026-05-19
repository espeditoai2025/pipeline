import Link from "next/link";
import { CheckCircle2, ArrowRight, ChevronDown } from "lucide-react";
import { MarketingShell } from "./MarketingShell";

export type LandingFeature = {
  icon: React.ElementType;
  color: string;
  title: string;
  description: string;
};
export type LandingPainPoint = { emoji: string; title: string; description: string };
export type LandingFaq = { q: string; a: string };

type Props = {
  hero: {
    badge: string;
    h1: React.ReactNode;
    tagline: string;
    description: string;
  };
  painPoints: LandingPainPoint[];
  features: LandingFeature[];
  stats: { value: string; label: string }[];
  faqs: LandingFaq[];
  cta: { title: string; description: string };
  jsonLd?: object;
};

function buildStructuredData(jsonLd: object | undefined, faqs: LandingFaq[]) {
  const faqSchema = {
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  if (!jsonLd) {
    return {
      "@context": "https://schema.org",
      ...faqSchema,
    };
  }

  return {
    "@context": "https://schema.org",
    "@graph": [jsonLd, faqSchema],
  };
}

export function LandingPage({ hero, painPoints, features, stats, faqs, cta, jsonLd }: Props) {
  const structuredData = buildStructuredData(jsonLd, faqs);

  return (
    <MarketingShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-6 py-28 text-center">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-blue-600/20 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-medium text-blue-300">
            {hero.badge}
          </div>
          <h1 className="mb-4 text-4xl leading-tight font-semibold tracking-tight text-white md:text-5xl lg:text-6xl">
            {hero.h1}
          </h1>
          <p className="mb-4 text-xl font-medium text-white/70">{hero.tagline}</p>
          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-300">
            {hero.description}
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-500"
            >
              Inizia gratis <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/#pricing"
              className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-8 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/15"
            >
              Vedi i prezzi
            </Link>
          </div>
          <p className="mt-6 text-sm text-slate-500">
            Gratis per sempre nel piano Starter · Nessuna carta di credito
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-slate-100 bg-slate-50 py-10">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 px-6 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-bold text-blue-600">{s.value}</div>
              <div className="mt-1 text-sm text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pain points */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-4 text-center text-3xl font-semibold tracking-tight text-slate-900">
            Riconosci questi problemi?
          </h2>
          <p className="mb-12 text-center text-slate-500">
            Pipely è stato costruito per risolverli.
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {painPoints.map((p) => (
              <div key={p.title} className="rounded-2xl border border-red-100 bg-red-50/50 p-6">
                <div className="mb-3 text-3xl">{p.emoji}</div>
                <h3 className="mb-2 font-semibold text-slate-900">{p.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-4 text-center text-3xl font-semibold tracking-tight text-slate-900">
            Tutto quello che ti serve, niente di superfluo
          </h2>
          <p className="mb-12 text-center text-slate-500">
            Dalla prima conversazione alla firma del contratto.
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
              >
                <div
                  className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${f.color} text-white`}
                >
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-semibold text-slate-900">{f.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature checklist */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-10 text-white">
          <h2 className="mb-8 text-center text-2xl font-semibold">Perché scegliere Pipely</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "100% in italiano — interfaccia, supporto e documentazione",
              "Setup in meno di 5 minuti, nessun tecnico necessario",
              "Piano gratuito per sempre, nessuna carta di credito",
              "Automazioni reali: email, task, notifiche e spostamenti",
              "AI Assistant integrato per forecast e bozze email",
              "Import contatti da Excel o CSV con un click",
              "Email marketing con tracking aperture e click",
              "Supporto italiano dal lunedì al venerdì",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5 text-sm text-blue-100">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" />
                {item}
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-blue-600 transition-all hover:bg-blue-50"
            >
              Inizia gratis ora <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-slate-50 px-6 py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-10 text-center text-3xl font-semibold tracking-tight text-slate-900">
            Domande frequenti
          </h2>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.q}
                className="group cursor-pointer rounded-xl border border-slate-200 bg-white px-6 py-4"
              >
                <summary className="flex list-none items-center justify-between font-medium text-slate-900">
                  {faq.q}
                  <ChevronDown className="ml-4 h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-br from-slate-900 to-blue-950 px-6 py-20 text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="mb-4 text-3xl font-semibold text-white">{cta.title}</h2>
          <p className="mb-8 text-slate-300">{cta.description}</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-blue-500"
          >
            Crea il tuo account gratis <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}
