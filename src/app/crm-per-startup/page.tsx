import type { Metadata } from "next";
import { Rocket, Workflow, BarChart3, Zap } from "lucide-react";
import { LandingPage } from "@/components/marketing/LandingPage";

export const metadata: Metadata = {
  title: "CRM per Startup Italiane — Scala le Vendite dal Giorno Zero | Pipely",
  description: "Il CRM per startup italiane. Pipeline vendite, automazioni e AI Assistant per crescere velocemente senza processi manuali. Piano Starter gratuito.",
  alternates: { canonical: "https://www.pipely.it/crm-per-startup" },
  openGraph: {
    title: "CRM per Startup Italiane — Scala le Vendite dal Giorno Zero | Pipely",
    description: "Pipeline, automazioni e AI per startup italiane. Costruisci un processo commerciale scalabile dal primo giorno. Inizia gratis.",
    url: "https://www.pipely.it/crm-per-startup",
    images: [{ url: "https://www.pipely.it/opengraph-image", width: 1200, height: 630, alt: "Pipely CRM — Il CRM italiano con AI e automazioni" }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "CRM per Startup Italiane — Pipely",
  description: "Pipeline vendite, automazioni e AI per startup che vogliono crescere velocemente.",
  url: "https://www.pipely.it/crm-per-startup",
  isPartOf: { "@id": "https://www.pipely.it/#website" },
};

export default function CrmStartupPage() {
  return (
    <LandingPage
      jsonLd={jsonLd}
      hero={{
        badge: "CRM per Startup · AI Integrata",
        h1: <>CRM per Startup —{" "}<span className="bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">Scala le Vendite dal Giorno Zero</span></>,
        tagline: "Costruisci un processo commerciale scalabile, non uno spaghetti di fogli Excel.",
        description: "Pipely è il CRM italiano per startup che vogliono crescere velocemente. Pipeline strutturata, automazioni, AI Assistant e team illimitato nel piano Pro — tutto quello che serve per scalare le vendite.",
      }}
      painPoints={[
        { emoji: "🚀", title: "Crescita caotica senza processo commerciale", description: "I founder chiudono i primi deal a forza di relazioni personali. Funziona nei primi 6 mesi, poi si blocca perché non è scalabile e non puoi replicarlo." },
        { emoji: "👥", title: "Il team vendite non ha visibilità condivisa", description: "Ogni commerciale ha i suoi appunti, la sua lista clienti, il suo modo di lavorare. Quando qualcuno si ammala o lascia, le informazioni spariscono." },
        { emoji: "📊", title: "Investor update sul fatturato costruiti a mano", description: "Gli investitori chiedono pipeline, forecast e conversion rate. Tu li costruisci manualmente da Excel ogni mese. Ci vuole mezza giornata." },
      ]}
      features={[
        { icon: Rocket, color: "bg-blue-500", title: "Pipeline scalabile", description: "Progetta il processo commerciale ideale per il tuo ICP. Stage personalizzabili, probabilità di chiusura e forecast automatico." },
        { icon: Workflow, color: "bg-violet-500", title: "Automazioni workflow", description: "Sequenze di follow-up, notifiche team, spostamenti automatici di stage. Il processo gira da solo mentre il team si concentra sulle conversazioni." },
        { icon: BarChart3, color: "bg-rose-500", title: "Report per investor update", description: "Pipeline value, win rate, ACV medio, velocity — metriche SaaS-ready aggiornate in tempo reale. Investor update in 10 minuti." },
        { icon: Zap, color: "bg-amber-500", title: "AI Assistant", description: "Bozze email personalizzate, analisi opportunità e suggerimenti deal — AI integrata nel piano Pro per accelerare il ciclo di vendita." },
      ]}
      stats={[
        { value: "0€", label: "Piano Starter" },
        { value: "AI", label: "Assistant incluso Pro" },
        { value: "Illimitate", label: "Pipeline nel Pro" },
        { value: "API", label: "Integrazioni aperte" },
      ]}
      faqs={[
        { q: "Pipely è adatto per una startup in fase early-stage con 2-3 persone?", a: "Assolutamente. Il piano Starter gratuito è perfetto per early-stage: nessun costo, setup immediato, e costruisci fin dall'inizio un processo commerciale documentato che scala con te." },
        { q: "L'AI Assistant è incluso nel piano gratuito?", a: "L'AI Assistant è disponibile nel piano Pro (€29/mese). Il piano Starter include tutte le funzionalità base senza AI." },
        { q: "Pipely supporta il team di vendita con accessi multipli?", a: "Sì. Il piano Pro include multi-utente con ruoli differenziati: Admin, Manager, Sales e Viewer. Puoi aggiungere tutto il team commerciale." },
        { q: "Posso estrarre le metriche per gli investor report?", a: "Sì. La sezione Report di Pipely mostra pipeline value, win rate, conversion per stage, deal velocity e forecast. Puoi esportare i dati in CSV per elaborazioni personalizzate." },
      ]}
      cta={{
        title: "Costruisci le fondamenta commerciali della tua startup",
        description: "Un processo scalabile vale più di 10 deal chiusi a caso. Inizia con il piano gratuito.",
      }}
    />
  );
}
