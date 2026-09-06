import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, AlertTriangle, Telescope, MapPin, Building2, Users, Tag, Lightbulb } from "lucide-react";
import { getCandidates } from "@/server/actions/lead-finder";
import { CandidatesTable } from "@/components/lead-finder/CandidatesTable";
import { SearchStatusNotice } from "@/components/lead-finder/SearchStatusNotice";

type Props = { params: Promise<{ searchId: string }> };

export default async function SearchResultsPage({ params }: Props) {
  const { searchId } = await params;
  const { data, error } = await getCandidates(searchId);

  if (error || !data) notFound();

  const { search, candidates } = data;

  const tags = [
    search.sector && { icon: Tag, label: search.sector },
    search.location && { icon: MapPin, label: search.location },
    search.companySize && { icon: Users, label: `${search.companySize} dip.` },
    search.keywords && { icon: Building2, label: search.keywords },
  ].filter(Boolean) as { icon: React.ElementType; label: string }[];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-[var(--crm-neutral-500)]">
        <Link href="/lead-finder" className="flex items-center gap-1 hover:text-[var(--crm-primary)] transition-colors">
          <ChevronLeft className="h-3.5 w-3.5" /> Lead Finder
        </Link>
        <span>/</span>
        <span className="text-[var(--crm-neutral-900)] dark:text-white truncate">{search.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--crm-primary)]/10 shrink-0">
            <Telescope className="h-5 w-5 text-[var(--crm-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--crm-neutral-900)] dark:text-white">{search.name}</h1>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {tags.map(({ icon: Icon, label }) => (
                  <span key={label} className="flex items-center gap-1 rounded-full bg-[var(--crm-neutral-100)] dark:bg-white/10 px-2 py-0.5 text-xs text-[var(--crm-neutral-600)] dark:text-[var(--crm-neutral-300)]">
                    <Icon className="h-3 w-3" /> {label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI disclaimer */}
      <div className="flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 px-4 py-3">
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
          <strong>Candidati generati dall&apos;AI.</strong> I dati (email, sito, referente) sono suggerimenti basati sui criteri di ricerca — possono contenere imprecisioni.
          Verifica sempre le informazioni prima di approvare un candidato e importarlo nella tua pipeline.
        </p>
      </div>

      {/* Ideal customer if present */}
      {search.idealCustomer && (
        <div className="flex items-start gap-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 px-4 py-3">
          <Lightbulb className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Descrizione cliente ideale usata:</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">{search.idealCustomer}</p>
          </div>
        </div>
      )}

      {/* Stato ricerca: aggiornamento automatico mentre gira, riavvio se fallita o mai partita */}
      <SearchStatusNotice searchId={searchId} status={search.status} error={search.error} />

      {/* Candidates table */}
      <CandidatesTable candidates={candidates} searchId={searchId} />
    </div>
  );
}
