import type { Metadata } from "next";
import { Home, Users, Bell, BarChart3 } from "lucide-react";
import { LandingPage } from "@/components/marketing/LandingPage";

export const metadata: Metadata = {
  title: "CRM per Agenzie Immobiliari — Gestisci Immobili e Clienti | Pipely",
  description: "Il CRM per agenzie immobiliari italiane. Pipeline trattative, database acquirenti e venditori, follow-up automatici. Gratis nel piano Starter.",
  alternates: { canonical: "https://www.pipely.it/crm-per-agenzie-immobiliari" },
  openGraph: {
    title: "CRM per Agenzie Immobiliari — Gestisci Immobili e Clienti | Pipely",
    description: "Il CRM pensato per agenti e agenzie immobiliari italiane. Pipeline compravendite, contatti e automazioni. Inizia gratis.",
    url: "https://www.pipely.it/crm-per-agenzie-immobiliari",
    images: [{ url: "https://www.pipely.it/opengraph-image", width: 1200, height: 630, alt: "Pipely CRM — Il CRM italiano con AI e automazioni" }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "CRM per Agenzie Immobiliari — Pipely",
  description: "Il CRM per agenti immobiliari italiani. Pipeline, clienti e follow-up.",
  url: "https://www.pipely.it/crm-per-agenzie-immobiliari",
  isPartOf: { "@id": "https://www.pipely.it/#website" },
};

export default function CrmAgenzeImmobiliariPage() {
  return (
    <LandingPage
      jsonLd={jsonLd}
      hero={{
        badge: "CRM per Agenzie Immobiliari · 100% in italiano",
        h1: <>CRM per Agenzie Immobiliari —{" "}<span className="bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">Gestisci Immobili e Clienti</span></>,
        tagline: "Più trattative chiuse, meno caos nel portafoglio.",
        description: "Pipely è il CRM italiano per agenti immobiliari. Gestisci acquirenti, venditori, affitti e compravendite in una pipeline chiara. Dal primo contatto alla firma.",
      }}
      painPoints={[
        { emoji: "🏠", title: "Acquirenti e immobili senza sistema", description: "I dati degli acquirenti, i profili immobili e le trattative in corso sono sparsi tra email, fogli e agende. Impossibile avere una visione completa." },
        { emoji: "⏰", title: "Trattative che si raffreddano per mancanza di follow-up", description: "Un acquirente serio non sente nulla da due settimane. Ha visitato altri immobili e potrebbe comprare altrove. Un follow-up mancato è una provvigione persa." },
        { emoji: "📊", title: "Nessuna visibilità sul valore del portafoglio", description: "Quante trattative aperte hai? Qual è il valore totale? Quante sono bloccate? Senza pipeline, impossibile rispondere e pianificare l'attività." },
      ]}
      features={[
        { icon: Home, color: "bg-blue-500", title: "Pipeline compravendite", description: "Stage personalizzabili: dalla ricerca immobile alla proposta, dalla firma preliminare al rogito. Ogni affare ha il suo valore e data di chiusura." },
        { icon: Users, color: "bg-violet-500", title: "Database acquirenti e venditori", description: "Profili separati per acquirenti (con preferenze e budget) e venditori (con immobili associati). Tutto collegato." },
        { icon: Bell, color: "bg-amber-500", title: "Automazioni follow-up", description: "Se un acquirente non senti da 7 giorni, il CRM crea automaticamente un promemoria di contatto. Nessuna opportunità dimenticata." },
        { icon: BarChart3, color: "bg-rose-500", title: "Report provvigioni", description: "Valori delle trattative, forecast mensile e tasso di conversione aggiornati in tempo reale. Pianifica l'attività su dati reali." },
      ]}
      stats={[
        { value: "0€", label: "Piano Starter" },
        { value: "Pipeline", label: "Multipla" },
        { value: "100%", label: "In italiano" },
        { value: "Mobile", label: "In agenzia e fuori" },
      ]}
      faqs={[
        { q: "Posso gestire sia compravendite che affitti con Pipely?", a: "Sì. Puoi creare pipeline separate per compravendite e affitti, ognuna con i propri stage personalizzati. I contatti possono essere taggati per tipologia (acquirente, venditore, locatario, proprietario)." },
        { q: "Posso usare Pipely anche in mobilità, ad esempio durante le visite?", a: "Sì. Pipely funziona su qualsiasi browser mobile. Puoi aggiungere note dopo una visita, aggiornare lo stato della trattativa e creare attività di follow-up direttamente dallo smartphone." },
        { q: "Come gestisco gli immobili con più acquirenti interessati?", a: "Per ogni acquirente interessato a un immobile crei un affare separato in pipeline. In questo modo puoi tracciare lo stato di ciascun negoziato indipendentemente." },
        { q: "Il piano gratuito ha limiti sul numero di trattative?", a: "Il piano Starter di Pipely include 1 pipeline con trattative illimitate. Per pipeline multiple (es. vendita + affitti) è richiesto il piano Pro." },
      ]}
      cta={{
        title: "Inizia a gestire il tuo portafoglio immobiliare",
        description: "Unisciti agli agenti immobiliari italiani che usano Pipely per chiudere più trattative. Piano Starter gratuito per sempre.",
      }}
    />
  );
}
