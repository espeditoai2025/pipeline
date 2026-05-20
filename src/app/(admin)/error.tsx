"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
      <AlertTriangle className="h-8 w-8 text-red-500" />
      <div>
        <h2 className="font-semibold">Errore pannello admin</h2>
        {error.digest && <p className="text-xs text-gray-400 font-mono mt-1">{error.digest}</p>}
      </div>
      <Button onClick={reset} variant="outline" size="sm" className="gap-2">
        <RefreshCw className="h-3.5 w-3.5" /> Riprova
      </Button>
    </div>
  );
}
