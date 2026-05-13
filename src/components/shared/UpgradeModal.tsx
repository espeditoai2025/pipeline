"use client";

import { X, Zap, Check } from "lucide-react";
import { PRO_FEATURES, PRO_PRICING } from "@/lib/plan-client";

interface UpgradeModalProps {
  message: string;
  onClose: () => void;
}

export function UpgradeModal({ message, onClose }: UpgradeModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden">
        {/* gradient header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Passa a Pro</h2>
              <p className="text-xs text-white/70">Sblocca tutte le funzionalità</p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-amber-300 bg-amber-900/30 border border-amber-800/50 rounded-lg px-4 py-3">
            {message}
          </p>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Piano Pro include:
            </p>
            <ul className="space-y-2">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-300">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl bg-slate-800 border border-white/5 p-4 flex items-baseline gap-1.5">
            <span className="text-sm line-through text-slate-500 mr-1">{PRO_PRICING.monthlyFull}</span>
            <span className="text-3xl font-bold text-white">{PRO_PRICING.monthly}</span>
            <span className="text-sm text-slate-400">/mese</span>
            <span className="ml-auto text-xs text-slate-500">oppure {PRO_PRICING.yearly}/anno ({PRO_PRICING.yearlyNote})</span>
          </div>

          <a
            href="mailto:support@pipely.it?subject=Upgrade%20a%20Pro"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 px-4 py-3 text-sm font-semibold text-white transition-all"
          >
            <Zap className="h-4 w-4" />
            Contattaci per l&apos;upgrade
          </a>
          <button
            onClick={onClose}
            className="w-full text-center text-xs text-slate-500 hover:text-slate-300 transition-colors py-1"
          >
            Continua con il piano Starter
          </button>
        </div>
      </div>
    </div>
  );
}
