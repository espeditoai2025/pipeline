import type { Metadata } from "next";
import { ComparisonPage } from "@/components/marketing/ComparisonPage";

export const metadata: Metadata = {
  title: "Alternativa a HubSpot — CRM Italiano Pipely",
  description: "Cerchi un'alternativa italiana a HubSpot? Pipely offre pipeline Kanban, AI Assistant, automazioni e email marketing a 29€/mese invece di centinaia. Inizia gratis.",
  alternates: { canonical: "https://www.pipely.it/alternativa-hubspot" },
  openGraph: {
    title: "Alternativa a HubSpot — CRM Italiano Pipely",
    description: "Pipely vs HubSpot: confronto completo tra il CRM italiano e HubSpot. Funzionalità simili, costo 10x inferiore, 100% in italiano.",
    url: "https://www.pipely.it/alternativa-hubspot",
    images: [{ url: "https://www.pipely.it/opengraph-image", width: 1200, height: 630, alt: "Pipely CRM — Il CRM italiano con AI e automazioni" }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "Alternativa a HubSpot — Pipely CRM Italiano",
      url: "https://www.pipely.it/alternativa-hubspot",
      isPartOf: { "@id": "https://www.pipely.it/#website" },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://www.pipely.it" },
        { "@type": "ListItem", position: 2, name: "Alternativa a HubSpot", item: "https://www.pipely.it/alternativa-hubspot" },
      ],
    },
  ],
};

export default function AlternativaHubspotPage() {
  return (
    <ComparisonPage
      jsonLd={jsonLd}
      competitor="HubSpot"
      hero={{
        h1: "Alternativa a HubSpot: Pipely CRM Italiano",
        description: "HubSpot è potente ma costoso, complesso e progettato per il mercato anglofono. Pipely offre le stesse funzionalità essenziali a un costo 10x inferiore, con supporto e interfaccia 100% in italiano.",
      }}
      summary={{
        pipely: [
          "Piano gratuito per sempre, Pro a 29€/mese",
          "Interfaccia 100% in italiano",
          "Setup in meno di 5 minuti",
          "AI Assistant integrato nel piano Pro",
          "Automazioni reali senza limiti nel Pro",
          "Supporto italiano dal lunedì al venerdì",
        ],
        competitor: [
          "Piano gratuito limitato, Professional da €890/mese",
          "Interfaccia in inglese (localizzazione parziale)",
          "Onboarding complesso, curva di apprendimento alta",
          "AI disponibile solo nei piani Enterprise",
          "Automazioni limitate nei piani base",
          "Supporto in inglese nei piani standard",
        ],
      }}
      rows={[
        { feature: "Piano gratuito", pipely: "Sì, per sempre", competitor: "Sì (molto limitato)" },
        { feature: "Prezzo piano avanzato", pipely: "29€/mese", competitor: "Da €890/mese" },
        { feature: "Pipeline Kanban", pipely: true, competitor: true },
        { feature: "Contatti illimitati", pipely: "Pro", competitor: "A pagamento" },
        { feature: "Email marketing", pipely: true, competitor: true },
        { feature: "Tracking aperture email", pipely: true, competitor: true },
        { feature: "Automazioni workflow", pipely: true, competitor: "Piano Pro+" },
        { feature: "AI Assistant", pipely: "Pro (29€/mese)", competitor: "Enterprise (centinaia €/mese)" },
        { feature: "SMTP personalizzato", pipely: true, competitor: "Piano Professional" },
        { feature: "Interfaccia in italiano", pipely: true, competitor: false },
        { feature: "Supporto in italiano", pipely: true, competitor: false },
        { feature: "Import CSV/Excel", pipely: true, competitor: true },
        { feature: "Catalogo prodotti", pipely: true, competitor: "Piano Professional" },
      ]}
      advantages={[
        "Costo fino a 30x inferiore: Pipely Pro costa 29€/mese vs centinaia di euro per HubSpot Professional",
        "100% in italiano: interfaccia, documentazione e supporto nella tua lingua, senza barriere linguistiche",
        "Setup in 5 minuti: nessun onboarding complesso, nessun consulente necessario per partire",
        "AI Assistant incluso nel piano Pro a 29€: in HubSpot richiede piani Enterprise da centinaia di euro",
        "Pensato per PMI italiane: processi semplificati, senza funzionalità enterprise che non ti servono",
        "Supporto umano in italiano: rispondiamo in meno di 24 ore dal lunedì al venerdì",
      ]}
      faqs={[
        { q: "Posso migrare da HubSpot a Pipely?", a: "Sì. Puoi esportare i tuoi contatti da HubSpot in formato CSV e importarli in Pipely in pochi minuti. Il processo di migrazione richiede generalmente meno di un'ora per i dati di contatti e aziende." },
        { q: "Pipely ha tutte le funzionalità di HubSpot?", a: "Pipely copre le funzionalità essenziali usate dall'85% delle PMI: pipeline, contatti, email marketing, automazioni e AI. Non ha alcune funzionalità enterprise di HubSpot (come CMS avanzato o service hub), ma per la maggior parte dei team di vendita italiani è più che sufficiente." },
        { q: "Il piano Pro da 29€ include tutto?", a: "Sì. Il piano Pro include pipeline illimitate, contatti illimitati, AI Assistant, automazioni workflow, email marketing con tracking, SMTP personalizzato e supporto prioritario. Nessun modulo extra a pagamento." },
        { q: "Come funziona il piano gratuito?", a: "Il piano Starter è gratuito per sempre e include 1 pipeline, fino a 500 contatti, calendario attività e import CSV. Puoi passare a Pro in qualsiasi momento senza perdere dati." },
      ]}
    />
  );
}
