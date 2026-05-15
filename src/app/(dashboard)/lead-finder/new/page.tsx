import Link from "next/link";
import { ChevronLeft, Telescope, Lightbulb } from "lucide-react";
import { SearchForm } from "@/components/lead-finder/SearchForm";
import { getLeadFinderInfo } from "@/server/actions/lead-finder";

export default async function NewLeadFinderPage() {
  const info = await getLeadFinderInfo();

  return (
    <div className="max-w-2xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-[var(--crm-neutral-500)]">
        <Link href="/lead-finder" className="flex items-center gap-1 hover:text-[var(--crm-primary)] transition-colors">
          <ChevronLeft className="h-3.5 w-3.5" /> Lead Finder
        </Link>
        <span>/</span>
        <span className="text-[var(--crm-neutral-900)] dark:text-white">Nuova ricerca</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--crm-primary)]/10">
          <Telescope className="h-5 w-5 text-[var(--crm-primary)]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--crm-neutral-900)] dark:text-white">Nuova ricerca lead</h1>
          <p className="text-xs text-[var(--crm-neutral-500)]">Definisci il target e l'AI genererà una lista di candidati</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 px-4 py-3">
        <Lightbulb className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
          Più dettagliata è la descrizione del cliente ideale, più precisi saranno i candidati generati dall'AI.
          I risultati sono suggerimenti AI — verifica sempre i dati prima di approvare un candidato.
        </p>
      </div>

      {/* Form */}
      <div className="rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-6">
        <SearchForm maxResultsLimit={info.maxResults} isStarter={info.perDay !== null} />
      </div>
    </div>
  );
}
