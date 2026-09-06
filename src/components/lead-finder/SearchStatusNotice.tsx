"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play, RefreshCw, XCircle } from "lucide-react";
import { runSearch } from "@/server/actions/lead-finder";
import type { LeadFinderSearchStatus } from "@/types/lead-finder";

type Props = { searchId: string; status: LeadFinderSearchStatus; error: string | null };

/** Shows the live state of a search: auto-refresh while running, restart when pending or failed. */
export function SearchStatusNotice({ searchId, status, error }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  // The server marks a search stale after ten minutes, so this loop always terminates.
  useEffect(() => {
    if (status !== "RUNNING") return;
    const timer = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(timer);
  }, [status, router]);

  if (status === "DONE") return null;

  if (status === "RUNNING") {
    return (
      <div role="status" className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 dark:border-blue-800/40 dark:bg-blue-900/20">
        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-blue-500" />
        <div>
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Ricerca in corso</p>
          <p className="mt-0.5 text-xs text-blue-600 dark:text-blue-400">
            Interroghiamo Google Maps, il registro CCIAA e il web: può richiedere qualche minuto. La pagina si aggiorna da sola.
          </p>
        </div>
      </div>
    );
  }

  const failed = status === "FAILED";
  function start() {
    startTransition(async () => {
      setActionError(null);
      try {
        const { error: err } = await runSearch(searchId);
        if (err) { setActionError(err); return; }
      } catch {
        setActionError("Connessione interrotta durante la ricerca. Ricarica la pagina tra qualche istante.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div role={failed ? "alert" : "status"} className={`rounded-xl border px-4 py-3 ${failed ? "border-red-200 bg-red-50 dark:border-red-700/40 dark:bg-red-900/20" : "border-amber-100 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/20"}`}>
      <div className="flex flex-wrap items-start gap-3">
        <XCircle className={`mt-0.5 h-4 w-4 shrink-0 ${failed ? "text-red-500" : "text-amber-500"}`} />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${failed ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300"}`}>
            {failed ? "Ricerca fallita" : "Ricerca non ancora avviata"}
          </p>
          {failed && error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
          {!failed && <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">La ricerca è stata creata ma non è partita. Avviala quando vuoi.</p>}
          {actionError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{actionError}</p>}
        </div>
        <button
          type="button"
          onClick={start}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--crm-primary)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--crm-primary-dark)] disabled:opacity-60"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : failed ? <RefreshCw className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {isPending ? "Ricerca in corso…" : failed ? "Riprova" : "Avvia ricerca"}
        </button>
      </div>
    </div>
  );
}
