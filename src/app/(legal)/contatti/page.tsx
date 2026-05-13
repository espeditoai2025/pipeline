import type { Metadata } from "next";
import { Mail, Clock, MessageSquare, Headphones } from "lucide-react";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "Contatti",
  description: "Hai domande su Pipely? Scrivici — ti risponderemo entro 1 giorno lavorativo.",
};

const contacts = [
  {
    icon: Mail,
    title: "Email",
    value: "support@pipely.it",
    href: "mailto:support@pipely.it",
    desc: "Per supporto, informazioni e partnership",
  },
  {
    icon: Clock,
    title: "Tempi di risposta",
    value: "Entro 1 giorno lavorativo",
    href: null,
    desc: "Lun–Ven, 9:00–18:00 CET",
  },
  {
    icon: MessageSquare,
    title: "Lingua",
    value: "100% in italiano",
    href: null,
    desc: "Supporto completamente in italiano",
  },
];

export default function ContattiPage() {
  return (
    <div>
      {/* Hero */}
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-xs font-medium text-blue-600 mb-4">
          <Headphones className="h-3.5 w-3.5" />
          Siamo qui per aiutarti
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">Contattaci</h1>
        <p className="text-lg text-slate-500 max-w-xl leading-relaxed">
          Hai domande su Pipely, hai bisogno di supporto o vuoi esplorare una partnership?
          Scrivici e ti risponderemo al più presto.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-5">
        {/* Form — occupa 3 colonne */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Inviaci un messaggio</h2>
            <ContactForm />
          </div>
        </div>

        {/* Info sidebar — occupa 2 colonne */}
        <div className="lg:col-span-2 space-y-4">
          {contacts.map((c) => (
            <div key={c.title} className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100">
                  <c.icon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-0.5">{c.title}</p>
                  {c.href ? (
                    <a href={c.href} className="text-sm font-semibold text-blue-600 hover:underline">
                      {c.value}
                    </a>
                  ) : (
                    <p className="text-sm font-semibold text-slate-800">{c.value}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-0.5">{c.desc}</p>
                </div>
              </div>
            </div>
          ))}

          {/* FAQ rapide */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 mt-2">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Domande frequenti</p>
            <div className="space-y-3">
              {[
                { q: "Il piano Starter è davvero gratuito?", a: "Sì, per sempre. Nessuna carta di credito richiesta." },
                { q: "Posso esportare i miei dati?", a: "Sì, in qualsiasi momento dai contatti o dalle impostazioni." },
                { q: "Come funziona l'upgrade a Pro?", a: "Contattaci — attiviamo il piano manualmente in pochi minuti." },
              ].map((faq) => (
                <div key={faq.q} className="border-b border-slate-200 pb-3 last:border-0 last:pb-0">
                  <p className="text-xs font-semibold text-slate-700 mb-0.5">{faq.q}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
