import Link from "next/link";
import { Telescope, Plus, CheckCircle2, Clock, XCircle, AlertCircle, ChevronRight } from "lucide-react";
import { getSearches } from "@/server/actions/lead-finder";
import { auth } from "@/lib/auth";
import { getOrgPlan, checkFeature } from "@/lib/plan";
import { UpgradeModal } from "@/components/shared/UpgradeModal";
import type { LeadFinderSearch } from "@/types/lead-finder";

function StatusBadge({ status }: { status: LeadFinderSearch["status"] }) {
  const cfg = {
    PENDING: { label: "In attesa", icon: Clock, cls: "bg-[var(--crm-neutral-100)] dark:bg-white/10 text-[var(--crm-neutral-600)] dark:text-[var(--crm-neutral-300)]" },
    RUNNING: { label: "In corso…", icon: Clock, cls: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" },
    DONE:    { label: "Completata", icon: CheckCircle2, cls: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300" },
    FAILED:  { label: "Errore", icon: XCircle, cls: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300" },
  }[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.cls}`}>
      <Icon className="h-3 w-3" /> {cfg.label}
    </span>
  );
}

function SearchCard({ search }: { search: LeadFinderSearch & { _count: { candidates: number } } }) {
  const tags = [search.sector, search.location, search.companySize, search.keywords].filter(Boolean);
  return (
    <Link href={`/lead-finder/${search.id}`}
      className="group block rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-5 hover:border-[var(--crm-primary)]/40 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-[var(--crm-neutral-900)] dark:text-white group-hover:text-[var(--crm-primary)] transition-colors truncate">
              {search.name}
            </h3>
            <StatusBadge status={search.status} />
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.map((t) => (
                <span key={t} className="rounded-full bg-[var(--crm-neutral-100)] dark:bg-white/10 px-2 py-0.5 text-xs text-[var(--crm-neutral-600)] dark:text-[var(--crm-neutral-300)]">
                  {t}
                </span>
              ))}
            </div>
          )}
          <p className="text-xs text-[var(--crm-neutral-400)] mt-2">
            {search._count.candidates} candidat{search._count.candidates === 1 ? "o" : "i"} ·{" "}
            {new Date(search.createdAt).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-[var(--crm-neutral-300)] group-hover:text-[var(--crm-primary)] shrink-0 transition-colors mt-1" />
      </div>
    </Link>
  );
}

export default async function LeadFinderPage() {
  const session = await auth();
  const orgId = (session?.user as { organizationId?: string } | undefined)?.organizationId;

  if (!orgId) return null;

  const plan = await getOrgPlan(orgId);
  const planError = checkFeature(plan, "ai");

  if (planError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--crm-primary)]/10">
            <Telescope className="h-5 w-5 text-[var(--crm-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--crm-neutral-900)] dark:text-white">Lead Finder AI</h1>
            <p className="text-xs text-[var(--crm-neutral-500)]">Trova nuovi clienti con l'intelligenza artificiale</p>
          </div>
        </div>
        <div className="rounded-xl border border-amber-200 dark:border-amber-700/40 bg-amber-50 dark:bg-amber-900/20 p-6 flex items-start gap-4">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Funzione disponibile dal piano PRO</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Il Lead Finder AI richiede il piano PRO. Passa a PRO per accedere alla ricerca automatica di lead qualificati.
            </p>
            <Link href="/settings/billing" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-medium text-white hover:bg-amber-700 transition-colors">
              Passa a PRO →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { data: searches } = await getSearches();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--crm-primary)]/10">
            <Telescope className="h-5 w-5 text-[var(--crm-primary)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[var(--crm-neutral-900)] dark:text-white">Lead Finder AI</h1>
              <span className="rounded-full bg-[var(--crm-primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--crm-primary)]">PRO</span>
            </div>
            <p className="text-xs text-[var(--crm-neutral-500)]">Trova nuovi clienti con l'intelligenza artificiale</p>
          </div>
        </div>
        <Link href="/lead-finder/new"
          className="flex items-center gap-1.5 rounded-xl bg-[var(--crm-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--crm-primary-dark)] transition-colors">
          <Plus className="h-4 w-4" /> Nuova ricerca
        </Link>
      </div>

      {/* Empty state */}
      {(!searches || searches.length === 0) ? (
        <div className="rounded-xl border border-dashed border-[var(--crm-neutral-200)] dark:border-white/10 p-16 text-center">
          <Telescope className="h-10 w-10 text-[var(--crm-neutral-300)] mx-auto mb-4" />
          <h3 className="text-sm font-semibold text-[var(--crm-neutral-700)] dark:text-white mb-1">Nessuna ricerca ancora</h3>
          <p className="text-xs text-[var(--crm-neutral-500)] mb-6 max-w-xs mx-auto">
            Crea la tua prima ricerca: definisci il cliente ideale e l'AI genererà un elenco di aziende candidate da valutare.
          </p>
          <Link href="/lead-finder/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--crm-primary)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--crm-primary-dark)] transition-colors">
            <Plus className="h-4 w-4" /> Crea prima ricerca
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {searches.map((s) => <SearchCard key={s.id} search={s} />)}
        </div>
      )}
    </div>
  );
}
