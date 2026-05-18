"use client";

import { useState } from "react";
import { Zap, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UpgradeBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  if (dismissed) return null;

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json() as { url?: string };
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-500/10 dark:border-blue-500/30 px-4 py-3 mb-6">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600">
        <Zap className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">Sei sul piano Starter gratuito</p>
        <p className="text-xs text-blue-700 dark:text-blue-400">Passa a Pro per contatti illimitati, AI, automazioni e Lead Finder senza limiti.</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          onClick={handleUpgrade}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Passa a Pro — 29€/mese"}
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
          aria-label="Chiudi"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
