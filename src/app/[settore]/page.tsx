import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Users,
  Workflow,
  Zap,
  Mail,
  BarChart3,
  Briefcase,
} from "lucide-react";
import { SETTORI, getSettore } from "@/lib/settori-data";
import { LandingPage } from "@/components/marketing/LandingPage";

export const dynamicParams = false;

export function generateStaticParams() {
  return SETTORI.map((s) => ({ settore: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ settore: string }>;
}): Promise<Metadata> {
  const { settore } = await params;
  const data = getSettore(settore);
  if (!data) return {};
  return {
    title: `${data.h1} | Pipely`,
    description: data.description,
    alternates: { canonical: `https://www.pipely.it/${data.slug}` },
    openGraph: {
      title: data.h1,
      description: data.description,
      url: `https://www.pipely.it/${data.slug}`,
      images: [{ url: "https://www.pipely.it/opengraph-image", width: 1200, height: 630, alt: "Pipely CRM — Il CRM italiano con AI e automazioni" }],
    },
  };
}

const COMMON_FEATURES = [
  { icon: Briefcase, color: "bg-blue-500", title: "Pipeline Kanban", description: "Visualizza tutte le trattative in corso per stage. Trascina le card e vedi i valori in tempo reale." },
  { icon: Users, color: "bg-violet-500", title: "Database clienti", description: "Tutti i tuoi contatti e aziende in un posto: storico, affari collegati, attività pianificate." },
  { icon: Workflow, color: "bg-fuchsia-500", title: "Automazioni", description: "Workflow che mandano email, creano attività e notificano il team automaticamente." },
  { icon: Zap, color: "bg-amber-500", title: "Import da Excel", description: "Porta i tuoi dati in Pipely in pochi minuti con l'import guidato da CSV o Excel." },
  { icon: Mail, color: "bg-teal-500", title: "Email marketing", description: "Campagne email con tracking aperture e click direttamente integrate nel CRM." },
  { icon: BarChart3, color: "bg-rose-500", title: "Report e analytics", description: "Forecast automatico, tasso di conversione, pipeline value: sempre aggiornati." },
];

export default async function SettorePage({
  params,
}: {
  params: Promise<{ settore: string }>;
}) {
  const { settore } = await params;
  const data = getSettore(settore);
  if (!data) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: data.h1,
    description: data.description,
    url: `https://www.pipely.it/${data.slug}`,
    isPartOf: { "@id": "https://www.pipely.it/#website" },
  };

  return (
    <LandingPage
      jsonLd={jsonLd}
      hero={{
        badge: data.badge,
        h1: (
          <>
            {data.h1.split(":")[0]}
            {data.h1.includes(":") && (
              <>
                :{" "}
                <span className="bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
                  {data.h1.split(":").slice(1).join(":").trim()}
                </span>
              </>
            )}
          </>
        ),
        tagline: data.tagline,
        description: data.description,
      }}
      painPoints={data.painPoints}
      features={COMMON_FEATURES}
      stats={data.stats}
      faqs={data.faqs}
      cta={{
        title: `Prova Pipely gratis per ${data.nome}`,
        description: `Unisciti ai professionisti italiani del settore ${data.nome.toLowerCase()} che usano Pipely. Piano Starter gratuito per sempre.`,
      }}
    />
  );
}
