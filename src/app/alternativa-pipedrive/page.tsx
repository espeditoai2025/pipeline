import type { Metadata } from "next";
import { ComparisonPage } from "@/components/marketing/ComparisonPage";

export const metadata: Metadata = {
  title: "Alternativa a Pipedrive — CRM Italiano con AI | Pipely",
  description: "Cerchi un'alternativa italiana a Pipedrive? Pipely aggiunge AI Assistant e email marketing integrato a un prezzo inferiore, con interfaccia e supporto 100% in italiano.",
  alternates: { canonical: "https://www.pipely.it/alternativa-pipedrive" },
  openGraph: {
    title: "Alternativa a Pipedrive — CRM Italiano con AI | Pipely",
    description: "Pipely vs Pipedrive: AI integrata, email marketing nativo e supporto italiano a 29€/mese. Il confronto completo.",
    url: "https://www.pipely.it/alternativa-pipedrive",
    images: [{ url: "https://www.pipely.it/opengraph-image", width: 1200, height: 630, alt: "Pipely CRM — Il CRM italiano con AI e automazioni" }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "Alternativa a Pipedrive — Pipely CRM Italiano",
      url: "https://www.pipely.it/alternativa-pipedrive",
      isPartOf: { "@id": "https://www.pipely.it/#website" },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://www.pipely.it" },
        { "@type": "ListItem", position: 2, name: "Alternativa a Pipedrive", item: "https://www.pipely.it/alternativa-pipedrive" },
      ],
    },
  ],
};

export default function AlternativaPipedrivePage() {
  return (
    <ComparisonPage
      jsonLd={jsonLd}
      competitor="Pipedrive"
      hero={{
        h1: "Alternativa a Pipedrive: CRM Italiano con AI",
        description: "Pipedrive è un ottimo CRM, ma non ha AI integrata, l'email marketing richiede add-on a pagamento e il supporto è in inglese. Pipely offre tutto questo nel piano Pro a 29€/mese, con supporto e interfaccia 100% in italiano.",
      }}
      summary={{
        pipely: [
          "Piano gratuito per sempre, Pro a 29€/mese",
          "AI Assistant integrato nel piano Pro",
          "Email marketing nativo senza add-on",
          "Interfaccia e supporto 100% in italiano",
          "Automazioni reali incluse nel Pro",
          "Lead management con score e conversione",
        ],
        competitor: [
          "Nessun piano gratuito, Essential da €14,90/utente/mese",
          "AI disponibile solo come add-on a pagamento",
          "Email marketing solo con Campaigns add-on (+€16/mese)",
          "Interfaccia in inglese, supporto in inglese",
          "Automazioni limitate nei piani base",
          "Lead inbox separato dalla pipeline principale",
        ],
      }}
      rows={[
        { feature: "Piano gratuito", pipely: "Sì, per sempre", competitor: "No (solo trial 14gg)" },
        { feature: "Prezzo partenza", pipely: "0€", competitor: "€14,90/utente/mese" },
        { feature: "Pipeline Kanban", pipely: true, competitor: true },
        { feature: "Lead management", pipely: true, competitor: true },
        { feature: "Email marketing integrato", pipely: true, competitor: "Add-on +€16/mese" },
        { feature: "Tracking aperture email", pipely: true, competitor: "Con Campaigns add-on" },
        { feature: "AI Assistant", pipely: "Pro (29€/mese)", competitor: "Add-on a pagamento" },
        { feature: "Automazioni workflow", pipely: true, competitor: "Piano Advanced+" },
        { feature: "SMTP personalizzato", pipely: true, competitor: "Piano Professional" },
        { feature: "Interfaccia in italiano", pipely: true, competitor: false },
        { feature: "Supporto in italiano", pipely: true, competitor: false },
        { feature: "Import CSV/Excel", pipely: true, competitor: true },
        { feature: "Catalogo prodotti", pipely: true, competitor: true },
      ]}
      advantages={[
        "Piano gratuito per sempre: Pipedrive non ha un piano gratuito, Pipely sì",
        "AI Assistant incluso nel Pro: in Pipedrive è un add-on separato a pagamento",
        "Email marketing nativo: in Pipedrive richiede l'add-on Campaigns, in Pipely è incluso",
        "Prezzo piatto: 29€/mese per tutto il team, non per utente come Pipedrive",
        "100% italiano: interfaccia, supporto e documentazione nella tua lingua",
        "Nessun add-on nascosto: tutto incluso nel piano Pro senza sorprese in bolletta",
      ]}
      faqs={[
        { q: "Posso importare i dati da Pipedrive?", a: "Sì. Pipedrive permette l'export in CSV di contatti, aziende, trattative e attività. Puoi importare contatti e aziende direttamente in Pipely in pochi minuti. Per le trattative, è necessario ricrearle manualmente o contattarci per assistenza alla migrazione." },
        { q: "Pipely ha la vista Kanban come Pipedrive?", a: "Sì. Pipely ha la stessa vista Kanban con drag & drop tra stage. Puoi configurare gli stage come vuoi, impostare la probabilità di chiusura e il rotting (avviso per deal fermi da troppo tempo)." },
        { q: "Il prezzo di 29€ è per utente o per account?", a: "È per account (organizzazione), non per utente. Puoi invitare tutto il tuo team senza costi aggiuntivi per sede. Pipedrive invece fattura per utente." },
        { q: "Pipely ha l'app mobile?", a: "Pipely è ottimizzato per mobile via browser e funziona su qualsiasi smartphone. Un'app nativa per iOS e Android è in roadmap." },
      ]}
    />
  );
}
