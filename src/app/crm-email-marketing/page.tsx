import type { Metadata } from "next";
import { Megaphone, Mail, MousePointerClick, Workflow } from "lucide-react";
import { LandingPage } from "@/components/marketing/LandingPage";

export const metadata: Metadata = {
  title: "CRM con Email Marketing Integrato — Pipely",
  description: "CRM italiano con email marketing integrato. Crea campagne, traccia aperture e click, automatizza i follow-up direttamente dal tuo CRM. Gratis nel piano Starter.",
  alternates: { canonical: "https://www.pipely.it/crm-email-marketing" },
  openGraph: {
    title: "CRM con Email Marketing Integrato — Pipely",
    description: "CRM italiano con campagne email, tracking aperture e click, SMTP personalizzato e automazioni. Tutto integrato, zero integrazioni esterne.",
    url: "https://www.pipely.it/crm-email-marketing",
    images: [{ url: "https://www.pipely.it/opengraph-image", width: 1200, height: 630, alt: "Pipely CRM — Il CRM italiano con AI e automazioni" }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "CRM con Email Marketing Integrato — Pipely",
  url: "https://www.pipely.it/crm-email-marketing",
  isPartOf: { "@id": "https://www.pipely.it/#website" },
};

export default function CrmEmailMarketingPage() {
  return (
    <LandingPage
      jsonLd={jsonLd}
      hero={{
        badge: "CRM + Email Marketing · Tutto in uno",
        h1: <>CRM con{" "}<span className="bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">Email Marketing Integrato</span></>,
        tagline: "Vendi e comunica dallo stesso strumento.",
        description: "Pipely unisce CRM e email marketing in un'unica piattaforma italiana. Crea campagne, automatizza follow-up e traccia chi apre le tue email — senza strumenti separati.",
      }}
      painPoints={[
        { emoji: "🔗", title: "CRM e email marketing su strumenti diversi", description: "Usi un CRM per le trattative e uno strumento separato per le email. I dati non si sincronizzano, perdi tempo a fare copia-incolla e perdi contesto." },
        { emoji: "📊", title: "Non sai chi ha letto le tue email", description: "Invii newsletter o follow-up email senza sapere chi le ha aperte, chi ha cliccato e chi le ha ignorate. Impossibile fare nurturing efficace." },
        { emoji: "⚙️", title: "Follow-up manuali che non scalano", description: "Ogni follow-up richiede un'azione manuale. Con molti contatti, è impossibile personalizzare e mandare al momento giusto senza un sistema automatico." },
      ]}
      features={[
        { icon: Megaphone, color: "bg-sky-500", title: "Campagne email", description: "Crea campagne con template personalizzati, variabili {{nome}} e {{email}}. Invia a liste segmentate dal tuo CRM." },
        { icon: MousePointerClick, color: "bg-teal-500", title: "Tracking aperture e click", description: "Pixel di tracking su ogni email. Sai esattamente chi ha aperto, quante volte e su quali link ha cliccato." },
        { icon: Mail, color: "bg-indigo-500", title: "SMTP personalizzato", description: "Collega Gmail, Aruba, Libero o qualsiasi provider SMTP. Le email partono dal tuo dominio, non da indirizzi generici." },
        { icon: Workflow, color: "bg-fuchsia-500", title: "Automazioni email", description: "Workflow che inviano email automaticamente: benvenuto ai nuovi contatti, follow-up dopo X giorni, nurturing per i lead." },
      ]}
      stats={[
        { value: "0€", label: "Piano Starter" },
        { value: "100%", label: "SMTP tuo dominio" },
        { value: "Real", label: "Tracking pixel" },
        { value: "∞", label: "Automazioni nel Pro" },
      ]}
      faqs={[
        { q: "Devo usare uno strumento separato per le email?", a: "No. Pipely ha il modulo email marketing integrato nel CRM. Crei le liste dai tuoi contatti, progetti le campagne e le invii — tutto nello stesso posto dove gestisci le trattative." },
        { q: "Posso inviare email dal mio indirizzo aziendale?", a: "Sì. Pipely supporta la configurazione SMTP personalizzata: collega il tuo account Gmail, Outlook, Aruba, Libero o qualsiasi server SMTP. Le email arrivano dal tuo dominio." },
        { q: "Come funziona il tracking delle aperture?", a: "Pipely inserisce automaticamente un pixel 1×1 invisibile nelle email inviate. Ogni apertura viene registrata con data, ora e (se disponibile) dispositivo. I click vengono tracciati con redirect." },
        { q: "Posso segmentare le liste per inviare a un sottoinsieme di contatti?", a: "Sì. Puoi creare liste manuali o importarle da CSV. Le liste vengono gestite nella sezione Email del CRM e puoi inviare campagne a liste specifiche." },
        { q: "Le automazioni email funzionano anche per i lead?", a: "Sì. Puoi creare un workflow che invia automaticamente un'email di follow-up quando un lead entra in stato 'Nurturing', oppure quando un affare avanza a un determinato stage." },
      ]}
      cta={{
        title: "CRM e email marketing, finalmente insieme",
        description: "Smetti di gestire strumenti separati. Pipely li unisce in un'unica piattaforma italiana.",
      }}
    />
  );
}
