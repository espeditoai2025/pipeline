import type { Metadata } from "next";
import { Briefcase, TrendingUp, Workflow, Sparkles } from "lucide-react";
import { LandingPage } from "@/components/marketing/LandingPage";

export const metadata: Metadata = {
  title: "CRM Commerciale per Reti di Vendita — Pipely",
  description: "CRM commerciale per team di vendita italiani. Pipeline Kanban, forecast revenue, automazioni follow-up e AI Assistant. Chiudi più affari, gestisci la rete commerciale.",
  alternates: { canonical: "https://www.pipely.it/crm-commerciale" },
  openGraph: {
    title: "CRM Commerciale per Reti di Vendita — Pipely",
    description: "CRM commerciale italiano con pipeline Kanban, forecast AI, automazioni e tracking. Ottimizza la tua rete di vendita.",
    url: "https://www.pipely.it/crm-commerciale",
    images: [{ url: "https://www.pipely.it/opengraph-image", width: 1200, height: 630, alt: "Pipely CRM — Il CRM italiano con AI e automazioni" }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "CRM Commerciale per Reti di Vendita — Pipely",
      url: "https://www.pipely.it/crm-commerciale",
      isPartOf: { "@id": "https://www.pipely.it/#website" },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://www.pipely.it" },
        { "@type": "ListItem", position: 2, name: "CRM Commerciale", item: "https://www.pipely.it/crm-commerciale" },
      ],
    },
  ],
};

export default function CrmCommercialePage() {
  return (
    <LandingPage
      jsonLd={jsonLd}
      hero={{
        badge: "CRM Commerciale · Vendite più veloci",
        h1: <>CRM Commerciale per{" "}<span className="bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">Reti di Vendita Italiane</span></>,
        tagline: "Ogni commerciale sa cosa fare. Ogni affare avanza.",
        description: "Pipely è il CRM commerciale che dà al tuo team di vendita visibilità completa su ogni trattativa, automatizza i follow-up e ti mostra in tempo reale dove si trovano i tuoi numeri.",
      }}
      painPoints={[
        { emoji: "📉", title: "Non sai dove sono i tuoi numeri", description: "Quanti affari hai in pipeline? Qual è la previsione di chiusura del mese? Senza un CRM, questi dati richiedono ore di raccolta manuale." },
        { emoji: "🔕", title: "I commerciali dimenticano i follow-up", description: "Le trattative si bloccano perché nessuno ricontatta il cliente al momento giusto. Opportunità perse ogni settimana per mancanza di sistema." },
        { emoji: "👥", title: "Il team lavora in silos", description: "Ogni commerciale ha i suoi fogli, le sue email, le sue note. Quando qualcuno è assente, i dati del cliente sono irraggiungibili." },
      ]}
      features={[
        { icon: Briefcase, color: "bg-blue-500", title: "Pipeline di vendita Kanban", description: "Visualizza tutte le trattative per stage. Trascina le card, vedi i valori, i responsabili e le date di chiusura in un colpo d'occhio." },
        { icon: TrendingUp, color: "bg-emerald-500", title: "Forecast revenue", description: "Previsione revenue ponderata per probabilità di chiusura. Sai sempre quanto è realisticamente atteso questo mese." },
        { icon: Workflow, color: "bg-fuchsia-500", title: "Automazioni commerciali", description: "Follow-up automatici, notifiche al responsabile, creazione task dopo ogni stage. Nessuna trattativa ferma senza un'azione." },
        { icon: Sparkles, color: "bg-pink-500", title: "AI per deal a rischio", description: "L'AI di Pipely identifica gli affari fermi da troppo tempo e suggerisce le azioni prioritarie per sbloccarli." },
      ]}
      stats={[
        { value: "29€", label: "Piano Pro/mese" },
        { value: "∞", label: "Pipeline nel Pro" },
        { value: "AI", label: "Forecast integrato" },
        { value: "Real", label: "Automazioni" },
      ]}
      faqs={[
        { q: "Pipely supporta un team commerciale di più persone?", a: "Sì. Puoi invitare tutti i tuoi commerciali, assegnare loro le trattative e monitorare le performance individuali. Il responsabile vendite ha visibilità su tutto il team." },
        { q: "Come funziona il forecast revenue?", a: "Ogni affare ha un valore e uno stage con una probabilità di chiusura. Pipely calcola automaticamente la revenue ponderata: es. un affare da €10.000 allo stage 'Proposta' (50%) conta €5.000 nel forecast." },
        { q: "Posso tracciare da dove vengono i miei lead?", a: "Sì. Ogni lead ha un campo Fonte (sito web, LinkedIn, eventi, referral, ads...). Puoi filtrare e capire quali canali portano i lead con il tasso di conversione più alto." },
        { q: "Come gestisco i prodotti/servizi negli affari?", a: "In Pipely puoi aggiungere prodotti dal tuo catalogo direttamente all'affare, con quantità e prezzo. Il totale si calcola automaticamente, IVA inclusa se configurata." },
      ]}
      cta={{
        title: "Trasforma il tuo team commerciale",
        description: "Pipeline chiara, forecast preciso, zero opportunità perse. Inizia gratis oggi.",
      }}
    />
  );
}
