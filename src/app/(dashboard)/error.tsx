"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sentry catturerà l'errore automaticamente via instrumentation.ts
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
        <AlertTriangle className="h-7 w-7 text-red-500" />
      </div>
      <div className="space-y-2 max-w-sm">
        <h2 className="text-lg font-semibold text-[var(--crm-neutral-900)] dark:text-white">
          Qualcosa è andato storto
        </h2>
        <p className="text-sm text-[var(--crm-neutral-500)]">
          Si è verificato un errore imprevisto. Riprova o contatta il supporto se il problema persiste.
        </p>
        {error.digest && (
          <p className="text-xs font-mono text-[var(--crm-neutral-400)]">
            Codice errore: {error.digest}
          </p>
        )}
      </div>
      <Button onClick={reset} variant="outline" className="gap-2">
        <RefreshCw className="h-4 w-4" /> Riprova
      </Button>
    </div>
  );
}
