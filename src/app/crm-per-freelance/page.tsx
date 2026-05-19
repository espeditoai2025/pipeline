import type { Metadata } from "next";
import { Briefcase, FileText, Clock, Zap } from "lucide-react";
import { LandingPage } from "@/components/marketing/LandingPage";

export const metadata: Metadata = {
  title: "CRM per Freelance e Liberi Professionisti Italiani | Pipely",
  description: "Il CRM per freelance italiani. Gestisci clienti, preventivi e follow-up senza complessità. Piano Starter gratuito per sempre, nessuna carta di credito.",
  alternates: { canonical: "https://www.pipely.it/crm-per-freelance" },
  openGraph: {
    title: "CRM per Freelance e Liberi Professionisti Italiani | Pipely",
    description: "Il CRM semplice e gratuito per freelance italiani. Clienti, preventivi e follow-up in un unico posto. Inizia gratis.",
    url: "https://www.pipely.it/crm-per-freelance",
    images: [{ url: "https://www.pipely.it/opengraph-image", width: 1200, height: 630, alt: "Pipely CRM — Il CRM italiano con AI e automazioni" }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "CRM per Freelance — Pipely",
      description: "Il CRM semplice per freelance italiani. Clienti, preventivi e follow-up.",
      url: "https://www.pipely.it/crm-per-freelance",
      isPartOf: { "@id": "https://www.pipely.it/#website" },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://www.pipely.it" },
        { "@type": "ListItem", position: 2, name: "CRM per Freelance", item: "https://www.pipely.it/crm-per-freelance" },
      ],
    },
  ],
};

export default function CrmFreelancePage() {
  return (
    <LandingPage
      jsonLd={jsonLd}
      hero={{
        badge: "CRM per Freelance · Gratis per sempre",
        h1: <>CRM per Freelance —{" "}<span className="bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">Clienti e Preventivi Organizzati</span></>,
        tagline: "Concentrati sul lavoro che sai fare meglio.",
        description: "Pipely è il CRM gratuito per freelance e liberi professionisti italiani. Tieni traccia dei clienti, dei preventivi aperti e dei follow-up — senza complessità inutili.",
      }}
      painPoints={[
        { emoji: "💼", title: "Preventivi inviati e poi dimenticati", description: "Hai mandato una proposta a un potenziale cliente. Due settimane dopo non l'hai ricontattato. Il lavoro è andato a qualcun altro che ha fatto follow-up." },
        { emoji: "📋", title: "Clienti e progetti confusi tra loro", description: "Tieni i dati dei clienti nelle email, le note sui progetti in un quaderno e i preventivi in cartelle diverse. Quando cerchi un'informazione, perdi minuti preziosi." },
        { emoji: "📊", title: "Nessuna visione sul fatturato potenziale", description: "Hai 5 preventivi aperti. Qual è il loro valore totale? Quale ha più probabilità di chiudersi? Senza pipeline, impossibile pianificare." },
      ]}
      features={[
        { icon: Briefcase, color: "bg-blue-500", title: "Pipeline preventivi", description: "Stage personalizzabili: Contatto → Preventivo → Trattativa → Confermato. Ogni progetto con valore e data di consegna attesa." },
        { icon: FileText, color: "bg-violet-500", title: "Schede cliente complete", description: "Storico interazioni, note di progetto, preventivi precedenti e prossime azioni: tutto nel profilo di ogni cliente." },
        { icon: Clock, color: "bg-amber-500", title: "Follow-up automatici", description: "Imposta un'automazione e il CRM crea automaticamente un promemoria di follow-up dopo X giorni dall'invio del preventivo." },
        { icon: Zap, color: "bg-teal-500", title: "Setup in 5 minuti", description: "Nessuna configurazione tecnica, nessun team IT. Crei l'account, aggiungi i tuoi clienti e inizi immediatamente." },
      ]}
      stats={[
        { value: "0€", label: "Per sempre" },
        { value: "1", label: "Utente — perfetto" },
        { value: "100%", label: "In italiano" },
        { value: "5 min", label: "Setup" },
      ]}
      faqs={[
        { q: "Un CRM è utile anche per un freelance singolo?", a: "Assolutamente. Un freelance con 5-10 clienti attivi e 5-10 preventivi aperti ha esattamente le stesse esigenze di un team commerciale in miniatura: non dimenticare follow-up, sapere cosa vale la propria pipeline, tenere il contesto di ogni cliente a portata di mano." },
        { q: "Il piano Starter è davvero gratuito per sempre?", a: "Sì. Il piano Starter di Pipely è gratuito senza scadenza temporale. Include 1 pipeline, contatti illimitati e le funzionalità base. Non è richiesta nessuna carta di credito." },
        { q: "Posso usarlo per gestire sia i clienti nuovi che quelli ricorrenti?", a: "Sì. Puoi differenziare con tag o pipeline separate. I clienti ricorrenti li gestisci come contatti con storico, mentre le nuove opportunità seguono il processo di pipeline." },
        { q: "Pipely funziona bene da smartphone?", a: "Sì. L'interfaccia è ottimizzata per mobile. Puoi aggiornare stati, aggiungere note e rispondere velocemente ai follow-up anche quando sei fuori ufficio." },
      ]}
      cta={{
        title: "Il tuo CRM gratuito ti aspetta",
        description: "Inizia a lavorare in modo più organizzato. Piano Starter gratuito per sempre, nessuna carta di credito.",
      }}
    />
  );
}
