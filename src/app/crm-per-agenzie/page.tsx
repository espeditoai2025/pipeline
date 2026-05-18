import type { Metadata } from "next";
import { Users, Briefcase, Workflow, BarChart3 } from "lucide-react";
import { LandingPage } from "@/components/marketing/LandingPage";

export const metadata: Metadata = {
  title: "CRM per Agenzie e Studi Professionali — Pipely",
  description: "Il CRM per agenzie di comunicazione, studi di consulenza e professionisti. Gestisci clienti multipli, trattative e automazioni in un unico strumento italiano.",
  alternates: { canonical: "https://www.pipely.it/crm-per-agenzie" },
  openGraph: {
    title: "CRM per Agenzie e Studi Professionali — Pipely",
    description: "CRM italiano per agenzie e studi professionali. Pipeline Kanban, gestione multi-cliente, automazioni e AI. Inizia gratis.",
    url: "https://www.pipely.it/crm-per-agenzie",
    images: [{ url: "https://www.pipely.it/opengraph-image", width: 1200, height: 630, alt: "Pipely CRM — Il CRM italiano con AI e automazioni" }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "CRM per Agenzie e Studi Professionali — Pipely",
  url: "https://www.pipely.it/crm-per-agenzie",
  isPartOf: { "@id": "https://www.pipely.it/#website" },
};

export default function CrmPerAgenzePage() {
  return (
    <LandingPage
      jsonLd={jsonLd}
      hero={{
        badge: "CRM per agenzie · Made in Italy",
        h1: <>CRM per{" "}<span className="bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">Agenzie e Studi Professionali</span></>,
        tagline: "Gestisci ogni cliente come se fosse l'unico.",
        description: "Pipely è il CRM pensato per agenzie di comunicazione, studi di consulenza, agenzie immobiliari e professionisti che gestiscono più clienti contemporaneamente.",
      }}
      painPoints={[
        { emoji: "🔀", title: "Difficile tenere separati i clienti", description: "Con più clienti attivi allo stesso tempo, è facile confondere informazioni, scadenze e contatti. Serve un sistema che tenga tutto separato e ordinato." },
        { emoji: "📊", title: "Nessuna visione delle trattative in corso", description: "Non sai quante proposte hai inviato, quante sono in attesa di risposta, quante sono state vinte. Ogni aggiornamento richiede email manuali." },
        { emoji: "🤝", title: "Il team non è allineato", description: "Account, commerciali e PM lavorano su strumenti diversi. Nessuno sa esattamente a che punto è ogni trattativa o chi ha l'ultimo contatto con il cliente." },
      ]}
      features={[
        { icon: Briefcase, color: "bg-blue-500", title: "Pipeline multi-cliente", description: "Una pipeline dedicata per ogni linea di business o tipo di servizio. Tieni separati i flussi senza confusione." },
        { icon: Users, color: "bg-violet-500", title: "Anagrafica clienti completa", description: "Ogni cliente con storico completo: contatti, referenti aziendali, attività passate e trattative aperte o chiuse." },
        { icon: Workflow, color: "bg-fuchsia-500", title: "Automazioni post-proposta", description: "Workflow automatici per follow-up post-invio proposta, promemoria scadenze e notifiche al team responsabile." },
        { icon: BarChart3, color: "bg-orange-500", title: "Report performance", description: "Tasso di chiusura, valore medio delle trattative, tempo medio di risposta. KPI in tempo reale per migliorare il processo." },
      ]}
      stats={[
        { value: "0€", label: "Per iniziare" },
        { value: "∞", label: "Contatti nel piano Pro" },
        { value: "100%", label: "In italiano" },
        { value: "Real", label: "Automazioni" },
      ]}
      faqs={[
        { q: "Posso gestire più clienti/aziende sullo stesso account?", a: "Sì. Pipely ti permette di creare più pipeline separate, ognuna con i propri stage, e di associare ogni affare al contatto o azienda corretta. Puoi gestire decine di clienti attivi in modo ordinato." },
        { q: "Posso assegnare trattative a collaboratori o account manager specifici?", a: "Sì. Ogni affare, contatto e lead può essere assegnato a un membro del team. Puoi anche filtrare le trattative per responsabile per vedere il carico di lavoro di ciascuno." },
        { q: "Come faccio a non perdere le scadenze delle proposte?", a: "Crei un workflow: quando un affare entra nello stage 'Proposta inviata', parte automaticamente un task con scadenza a 5 giorni per il follow-up. Nessuna scadenza dimenticata." },
        { q: "Pipely si integra con i tool che già uso?", a: "Pipely supporta SMTP personalizzato (Gmail, Outlook, Aruba) per inviare email dai tuoi account esistenti. Per integrazioni avanzate con altri strumenti, il piano Enterprise include API dedicata." },
      ]}
      cta={{
        title: "Porta la tua agenzia al livello successivo",
        description: "Gestisci clienti, proposte e trattative in un unico CRM italiano. Gratis per sempre nel piano Starter.",
      }}
    />
  );
}
