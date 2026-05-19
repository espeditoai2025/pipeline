import type { Metadata } from "next";
import { Shield, RefreshCw, Bell, Users } from "lucide-react";
import { LandingPage } from "@/components/marketing/LandingPage";

export const metadata: Metadata = {
  title: "CRM per Agenti Assicurativi — Rinnovi, Lead e Follow-up | Pipely",
  description: "Il CRM per agenti assicurativi italiani. Gestisci polizze, rinnovi, lead e follow-up in modo automatico. Piano Starter gratuito.",
  alternates: { canonical: "https://www.pipely.it/crm-per-assicuratori" },
  openGraph: {
    title: "CRM per Agenti Assicurativi — Rinnovi, Lead e Follow-up | Pipely",
    description: "Il CRM pensato per agenti e broker assicurativi italiani. Rinnovi automatici, pipeline polizze e follow-up. Inizia gratis.",
    url: "https://www.pipely.it/crm-per-assicuratori",
    images: [{ url: "https://www.pipely.it/opengraph-image", width: 1200, height: 630, alt: "Pipely CRM — Il CRM italiano con AI e automazioni" }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "CRM per Agenti Assicurativi — Pipely",
      description: "Il CRM per agenti assicurativi italiani. Rinnovi, pipeline polizze e follow-up.",
      url: "https://www.pipely.it/crm-per-assicuratori",
      isPartOf: { "@id": "https://www.pipely.it/#website" },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://www.pipely.it" },
        { "@type": "ListItem", position: 2, name: "CRM per Assicuratori", item: "https://www.pipely.it/crm-per-assicuratori" },
      ],
    },
  ],
};

export default function CrmAssicuratoriPage() {
  return (
    <LandingPage
      jsonLd={jsonLd}
      hero={{
        badge: "CRM per Assicuratori · 100% in italiano",
        h1: <>CRM per Agenti Assicurativi —{" "}<span className="bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">Rinnovi, Lead e Follow-up</span></>,
        tagline: "Più polizze emesse, zero rinnovi dimenticati.",
        description: "Pipely è il CRM italiano per agenti e broker assicurativi. Gestisci il portafoglio clienti, i rinnovi in scadenza e i lead in acquisizione in un'unica piattaforma.",
      }}
      painPoints={[
        { emoji: "🔄", title: "Rinnovi polizze che scadono senza preavviso", description: "Un cliente non rinnova la polizza RC auto perché nessuno lo ha ricontattato in tempo. Il premio è andato alla concorrenza." },
        { emoji: "📋", title: "Lead da campagne non gestiti sistematicamente", description: "Le richieste di preventivo arrivano da sito, comparatori e passaparola. Senza un sistema centralizzato, molti lead si perdono o vengono gestiti troppo tardi." },
        { emoji: "📊", title: "Nessuna visibilità su premi in scadenza", description: "Non sai quanti premi scadono nei prossimi 30 giorni, quanto valgono e quali clienti devi ricontattare prioritariamente." },
      ]}
      features={[
        { icon: Shield, color: "bg-blue-500", title: "Pipeline polizze", description: "Stage personalizzabili per ogni tipo di polizza: vita, auto, casa, infortuni. Ogni pratica con il suo valore e data di scadenza." },
        { icon: RefreshCw, color: "bg-green-500", title: "Gestione rinnovi", description: "Attività automatiche 30 giorni prima della scadenza di ogni polizza. Non perdi mai un rinnovo per distrazione." },
        { icon: Bell, color: "bg-amber-500", title: "Automazioni follow-up", description: "Workflow che si attivano automaticamente: nuovi lead, preventivi inviati, scadenze imminenti. Il CRM lavora per te." },
        { icon: Users, color: "bg-violet-500", title: "Portafoglio clienti completo", description: "Storico polizze, note, preferenze e comunicazioni: tutto nel profilo di ogni cliente. Mai più partire da zero ad ogni telefonata." },
      ]}
      stats={[
        { value: "0€", label: "Piano Starter" },
        { value: "Auto", label: "Promemoria rinnovi" },
        { value: "100%", label: "In italiano" },
        { value: "5 min", label: "Setup" },
      ]}
      faqs={[
        { q: "Posso impostare promemoria automatici per le scadenze delle polizze?", a: "Sì. Puoi creare attività ricorrenti con scadenza e automazioni che generano promemoria automatici X giorni prima della scadenza di ogni polizza." },
        { q: "Posso gestire sia rami vita che rami danni con Pipely?", a: "Puoi creare pipeline separate per i diversi rami assicurativi, ognuna con i propri stage e processi. I clienti possono avere più polizze collegate al loro profilo." },
        { q: "Pipely funziona anche per broker assicurativi con più mandanti?", a: "Sì. Puoi usare tag e categorie per distinguere i clienti per mandante o ramo. Le pipeline sono completamente personalizzabili." },
        { q: "Il piano gratuito è sufficiente per iniziare?", a: "Il piano Starter include 1 pipeline, contatti illimitati e funzionalità base. È ideale per testare lo strumento e per agenti singoli con un portafoglio gestibile." },
      ]}
      cta={{
        title: "Gestisci il tuo portafoglio assicurativo con Pipely",
        description: "Zero rinnovi dimenticati, più lead convertiti. Piano Starter gratuito per sempre.",
      }}
    />
  );
}
