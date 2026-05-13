"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie, X, Check } from "lucide-react";

const STORAGE_KEY = "pipely_cookie_consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) setVisible(true);
    } catch {
      // localStorage non disponibile (SSR o privacy mode)
    }
  }, []);

  function saveChoice(accepted: boolean) {
    try {
      localStorage.setItem(STORAGE_KEY, accepted ? "accepted" : "declined");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Consenso cookie"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 md:bottom-6 md:left-auto md:right-6 md:max-w-sm"
    >
      <div className="rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/60 p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100">
            <Cookie className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">Utilizziamo i cookie</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Usiamo cookie tecnici essenziali per il funzionamento del servizio. Nessun cookie
              di profilazione o pubblicità.{" "}
              <Link href="/cookie" className="text-blue-600 hover:underline">
                Cookie Policy
              </Link>
              {" · "}
              <Link href="/privacy" className="text-blue-600 hover:underline">
                Privacy
              </Link>
            </p>
          </div>
          <button
            onClick={() => saveChoice(false)}
            className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Chiudi"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => saveChoice(false)}
            className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Solo necessari
          </button>
          <button
            onClick={() => saveChoice(true)}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Check className="h-3.5 w-3.5" />
            Accetta
          </button>
        </div>
      </div>
    </div>
  );
}
