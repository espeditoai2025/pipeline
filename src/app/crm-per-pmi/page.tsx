/* eslint-disable react/no-unescaped-entities */
import type { Metadata } from "next";
import { Briefcase, Users, Workflow, Zap } from "lucide-react";
import { LandingPage } from "@/components/marketing/LandingPage";

export const metadata: Metadata = {
  title: "CRM per PMI Italiane — Semplice, Completo, in Italiano | Pipely",
  description: "Il CRM pensato per le piccole e medie imprese italiane. Pipeline Kanban, contatti, automazioni e AI Assistant. Gratis per sempre nel piano Starter.",
  alternates: { canonical: "https://www.pipely.it/crm-per-pmi" },
  openGraph: {
    title: "CRM per PMI Italiane — Semplice, Completo, in Italiano | Pipely",
    description: "Il CRM pensato per le piccole e medie imprese italiane. Pipeline Kanban, automazioni reali e AI integrata. Inizia gratis, nessuna carta di credito.",
    url: "https://www.pipely.it/crm-per-pmi",
    images: [{ url: "https://www.pipely.it/opengraph-image", width: 1200, height: 630, alt: "Pipely CRM — Il CRM italiano con AI e automazioni" }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "CRM per PMI Italiane — Pipely",
  description: "Il CRM pensato per le piccole e medie imprese italiane.",
  url: "https://www.pipely.it/crm-per-pmi",
  isPartOf: { "@id": "https://www.pipely.it/#website" },
};

export default function CrmPerPmiPage() {
  return (
    <LandingPage
      jsonLd={jsonLd}
      hero={{
        badge: "CRM per PMI · 100% in italiano",
        h1: <>"CRM per PMI Italiane —{" "}<span className="bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">Semplice, Completo, in Italiano</span>"</>,
        tagline: "Il CRM che cresce con la tua piccola impresa.",
        description: "Pipely è il software CRM progettato per le PMI italiane. Gestisci clienti, trattative e follow-up senza complessità inutili, a partire da 0€.",
      }}
      painPoints={[
        { emoji: "📋", title: "Clienti sparsi su Excel e email", description: "I dati dei tuoi clienti sono in fogli diversi, email, carta e testa. Impossibile avere una visione completa e collaborare con il team." },
        { emoji: "🔔", title: "Perdi clienti per mancanza di follow-up", description: "Le trattative cadono nel vuoto perché non c'è un sistema che ricordi al team di ricontattare. Opportunità perse ogni mese." },
        { emoji: "⏰", title: "Troppo tempo in attività manuali", description: "Email di promemoria, aggiornamenti a mano, report da costruire da zero. Ore sprecate che potrebbero andare alle vendite." },
      ]}
      features={[
        { icon: Briefcase, color: "bg-blue-500", title: "Pipeline Kanban", description: "Visualizza tutte le trattative in corso per stage. Trascina le card, vedi i valori e assegna i responsabili a colpo d'occhio." },
        { icon: Users, color: "bg-violet-500", title: "Database clienti unificato", description: "Tutti i tuoi contatti e aziende in un posto: storico interazioni, affari collegati, attività pianificate." },
        { icon: Workflow, color: "bg-fuchsia-500", title: "Automazioni follow-up", description: "Crea workflow che mandano email, creano attività e notificano il team automaticamente. Nessun cliente dimenticato." },
        { icon: Zap, color: "bg-amber-500", title: "Import da Excel/CSV", description: "Porta i tuoi dati esistenti in Pipely in pochi minuti con l'import guidato. Rilevamento colonne automatico." },
      ]}
      stats={[
        { value: "0€", label: "Piano Starter" },
        { value: "5 min", label: "Setup iniziale" },
        { value: "100%", label: "In italiano" },
        { value: "12+", label: "Moduli integrati" },
      ]}
      faqs={[
        { q: "Pipely è adatto a una piccola impresa con pochi dipendenti?", a: "Assolutamente. Pipely è stato pensato esattamente per questo: team da 1 a 50 persone che hanno bisogno di organizzare i clienti senza la complessità di sistemi enterprise. Il piano Starter è gratuito per sempre." },
        { q: "Quanto tempo ci vuole per impostare il CRM?", a: "Meno di 5 minuti. Crei l'account, configuri la pipeline con i tuoi stage di vendita e inizi ad aggiungere contatti. Puoi anche importare il tuo Excel esistente in pochi click." },
        { q: "Il mio team deve essere tech per usarlo?", a: "No. Pipely è stato progettato per essere intuitivo anche per chi non ha esperienza con i CRM. L'interfaccia è semplice, tutto è in italiano e abbiamo una guida interna per ogni funzionalità." },
        { q: "Posso provarlo senza impegno?", a: "Sì. Il piano Starter è gratuito per sempre, non richiede la carta di credito e non ha scadenza. Puoi testare tutte le funzionalità base senza alcun rischio." },
        { q: "Cosa succede ai miei dati se decido di smettere?", a: "I tuoi dati sono sempre tuoi. Puoi esportarli in qualsiasi momento in formato CSV direttamente dalle impostazioni, prima di chiudere l'account." },
      ]}
      cta={{
        title: "Pronto a far crescere la tua PMI?",
        description: "Unisciti alle PMI italiane che usano Pipely per chiudere più affari. Gratis per sempre nel piano Starter.",
      }}
    />
  );
}
