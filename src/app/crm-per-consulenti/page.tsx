import type { Metadata } from "next";
import { Users, Calendar, Briefcase, Package } from "lucide-react";
import { LandingPage } from "@/components/marketing/LandingPage";

export const metadata: Metadata = {
  title: "CRM per Consulenti e Liberi Professionisti — Pipely",
  description: "Il CRM per consulenti, freelance e liberi professionisti italiani. Gestisci clienti, proposte, scadenze e follow-up senza burocrazia. Gratis nel piano Starter.",
  alternates: { canonical: "https://www.pipely.it/crm-per-consulenti" },
  openGraph: {
    title: "CRM per Consulenti e Liberi Professionisti — Pipely",
    description: "CRM semplice per consulenti e freelance italiani. Gestisci clienti, trattative e attività. Inizia gratis, nessuna carta di credito.",
    url: "https://www.pipely.it/crm-per-consulenti",
    images: [{ url: "https://www.pipely.it/opengraph-image", width: 1200, height: 630, alt: "Pipely CRM — Il CRM italiano con AI e automazioni" }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "CRM per Consulenti e Liberi Professionisti — Pipely",
      url: "https://www.pipely.it/crm-per-consulenti",
      isPartOf: { "@id": "https://www.pipely.it/#website" },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://www.pipely.it" },
        { "@type": "ListItem", position: 2, name: "CRM per Consulenti", item: "https://www.pipely.it/crm-per-consulenti" },
      ],
    },
  ],
};

export default function CrmPerConsulentiPage() {
  return (
    <LandingPage
      jsonLd={jsonLd}
      hero={{
        badge: "CRM per freelance e consulenti",
        h1: <>CRM per{" "}<span className="bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">Consulenti e Liberi Professionisti</span></>,
        tagline: "Meno admin, più consulenze.",
        description: "Pipely ti permette di gestire clienti, proposte e follow-up in modo semplice, senza l'overhead dei CRM enterprise. Pensato per chi lavora da solo o in piccoli team.",
      }}
      painPoints={[
        { emoji: "🗂️", title: "Troppo tempo in admin e burocrazia", description: "Come libero professionista, ogni ora che passi a gestire fogli, email e promemoria è un'ora che non fatturi. Il CRM giusto riduce questo overhead drasticamente." },
        { emoji: "💸", title: "Proposte che non si trasformano in contratti", description: "Invii una proposta e poi la perdi nel flusso. Senza un sistema di follow-up, molte trattative muoiono in silenzio prima di diventare lavoro." },
        { emoji: "📅", title: "Scadenze e appuntamenti sparsi ovunque", description: "Calendario Google, note sul telefono, email. Ogni strumento diverso. Un CRM centralizza tutto: attività, scadenze e clienti in un posto solo." },
      ]}
      features={[
        { icon: Briefcase, color: "bg-blue-500", title: "Pipeline proposte", description: "Traccia ogni proposta dalla prima conversazione alla firma. Sai sempre in che fase si trova ogni cliente potenziale." },
        { icon: Users, color: "bg-violet-500", title: "Rubrica clienti avanzata", description: "Ogni cliente con storico completo: email scambiate, attività svolte, proposte inviate e contratti chiusi." },
        { icon: Calendar, color: "bg-emerald-500", title: "Calendario attività", description: "Pianifica chiamate, meeting e task. Imposta promemoria automatici per non dimenticare nessun follow-up." },
        { icon: Package, color: "bg-amber-500", title: "Catalogo servizi", description: "Inserisci i tuoi servizi con i relativi prezzi e aggiungili direttamente alle proposte/affari." },
      ]}
      stats={[
        { value: "0€", label: "Piano Starter" },
        { value: "5 min", label: "Per iniziare" },
        { value: "1", label: "Posto solo per tutti" },
        { value: "100%", label: "In italiano" },
      ]}
      faqs={[
        { q: "Pipely è adatto per un singolo consulente (non un team)?", a: "Assolutamente. Molti utenti usano Pipely da soli come sistema personale per gestire clienti e trattative. Il piano Starter gratuito è perfetto per iniziare." },
        { q: "Posso usarlo per tracciare le proposte che invio?", a: "Sì. La pipeline Kanban è perfetta per questo: crea uno stage 'Proposta inviata', uno 'In attesa', uno 'Accettata' e uno 'Persa'. Hai sempre chiaro lo stato di ogni cliente." },
        { q: "Posso configurare il mio listino prezzi?", a: "Sì. Il catalogo prodotti di Pipely ti permette di inserire i tuoi servizi con prezzi, IVA e descrizione. Poi puoi aggiungerli agli affari/proposte con la quantità corretta." },
        { q: "Funziona da mobile?", a: "Sì. Pipely è responsive e funziona da qualsiasi browser su smartphone e tablet. Puoi aggiungere note, aggiornare lo stato di un affare e consultare i contatti anche in mobilità." },
      ]}
      cta={{
        title: "Lavora meno sull'admin, fattura di più",
        description: "Inizia a organizzare clienti e trattative con Pipely. Gratis per sempre nel piano Starter.",
      }}
    />
  );
}
