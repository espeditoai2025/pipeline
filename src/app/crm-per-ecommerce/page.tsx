import type { Metadata } from "next";
import { ShoppingCart, Mail, Users, BarChart3 } from "lucide-react";
import { LandingPage } from "@/components/marketing/LandingPage";

export const metadata: Metadata = {
  title: "CRM per E-commerce — Clienti, Ordini e Campagne Email | Pipely",
  description: "Il CRM italiano per e-commerce. Gestisci clienti B2B, campagne email con tracking e pipeline ordini. Gratis nel piano Starter.",
  alternates: { canonical: "https://www.pipely.it/crm-per-ecommerce" },
  openGraph: {
    title: "CRM per E-commerce — Clienti, Ordini e Campagne Email | Pipely",
    description: "CRM per e-commerce italiani: clienti B2B, email marketing con tracking e pipeline vendite. Inizia gratis.",
    url: "https://www.pipely.it/crm-per-ecommerce",
    images: [{ url: "https://www.pipely.it/opengraph-image", width: 1200, height: 630, alt: "Pipely CRM — Il CRM italiano con AI e automazioni" }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "CRM per E-commerce — Pipely",
      description: "CRM per e-commerce: clienti B2B, email marketing e pipeline vendite.",
      url: "https://www.pipely.it/crm-per-ecommerce",
      isPartOf: { "@id": "https://www.pipely.it/#website" },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://www.pipely.it" },
        { "@type": "ListItem", position: 2, name: "CRM per E-commerce", item: "https://www.pipely.it/crm-per-ecommerce" },
      ],
    },
  ],
};

export default function CrmEcommercePage() {
  return (
    <LandingPage
      jsonLd={jsonLd}
      hero={{
        badge: "CRM per E-commerce · Email Marketing Integrato",
        h1: <>CRM per E-commerce —{" "}<span className="bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">Clienti, Ordini e Campagne Email</span></>,
        tagline: "Dal primo ordine al cliente fedele: tutto in un unico CRM.",
        description: "Pipely è il CRM italiano per e-commerce B2B e negozi online. Gestisci i tuoi clienti wholesale, invia campagne email mirate e traccia le trattative di riordino — tutto integrato.",
      }}
      painPoints={[
        { emoji: "🛒", title: "Clienti wholesale senza gestione strutturata", description: "I tuoi rivenditori B2B hanno esigenze diverse: sconti personalizzati, ordini ricorrenti, account manager dedicato. Gestirli come un cliente qualsiasi non funziona." },
        { emoji: "📧", title: "Email promozionali senza segmentazione", description: "Invii la stessa newsletter a tutti — nuovi clienti, clienti fedeli, prospect. Il tasso di apertura è basso e le conversioni deludono." },
        { emoji: "🔄", title: "Riordini non proattivi", description: "I tuoi clienti abituali potrebbero riordinare prima se qualcuno li contattasse al momento giusto. Ma non c'è un sistema che ti ricordi chi riordinare e quando." },
      ]}
      features={[
        { icon: ShoppingCart, color: "bg-blue-500", title: "Pipeline ordini B2B", description: "Traccia trattative wholesale, ordini in corso e rinnovi. Ogni cliente con il suo valore annuo, storico e data del prossimo ricontatto." },
        { icon: Mail, color: "bg-teal-500", title: "Email marketing con tracking", description: "Campagne email segmentate per tipo cliente, con tracking aperture e click. Saprai esattamente chi ha letto cosa e quando." },
        { icon: Users, color: "bg-violet-500", title: "Database clienti B2B", description: "Aziende, referenti, storico ordini e comunicazioni: tutto nel profilo del cliente. Nessun contesto perso tra un ordine e l'altro." },
        { icon: BarChart3, color: "bg-rose-500", title: "Analisi clienti e LTV", description: "Report su frequenza acquisti, valore medio ordine e clienti a rischio abbandono. Prioritizza il tempo sul 20% che genera l'80% del fatturato." },
      ]}
      stats={[
        { value: "0€", label: "Piano Starter" },
        { value: "Email", label: "Marketing integrato" },
        { value: "100%", label: "In italiano" },
        { value: "Tracking", label: "Aperture e click" },
      ]}
      faqs={[
        { q: "Pipely è adatto per un e-commerce B2C o solo B2B?", a: "Pipely è ottimizzato per la gestione di clienti B2B (rivenditori, grossisti, account chiave). Per B2C puro con volumi molto alti, uno strumento di marketing automation dedicato potrebbe essere più appropriato." },
        { q: "Posso inviare campagne email direttamente da Pipely?", a: "Sì. Con il piano Pro puoi creare campagne email con un editor, segmentare le liste per categoria cliente, e monitorare aperture e click in tempo reale." },
        { q: "Posso importare i clienti dal mio e-commerce (Shopify, WooCommerce)?", a: "Puoi esportare i clienti dal tuo e-commerce in CSV e importarli in Pipely con il wizard guidato. Per sincronizzazione automatica, puoi usare Zapier o l'API di Pipely." },
        { q: "Come gestisco gli sconti e le condizioni personalizzate per ogni cliente?", a: "Puoi aggiungere note personalizzate e campi custom al profilo di ogni cliente per tracciare le condizioni commerciali specifiche (sconto, pagamento, listino)." },
      ]}
      cta={{
        title: "Trasforma i tuoi clienti in clienti fedeli",
        description: "CRM gratuito per e-commerce italiani. Email marketing, pipeline B2B e tracking inclusi.",
      }}
    />
  );
}
