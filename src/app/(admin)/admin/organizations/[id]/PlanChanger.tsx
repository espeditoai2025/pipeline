"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Check, Loader2 } from "lucide-react";
import { updateOrgPlan } from "@/server/actions/admin";
import type { AdminPlan } from "@/server/actions/admin";

const PLANS: { value: AdminPlan; label: string; description: string; color: string }[] = [
  {
    value: "STARTER",
    label: "Starter",
    description: "Gratuito · 1 pipeline · 500 contatti",
    color: "text-slate-300",
  },
  {
    value: "PRO",
    label: "Pro",
    description: "€29/mese · Pipeline illimitate · AI + automazioni",
    color: "text-emerald-400",
  },
  {
    value: "ENTERPRISE",
    label: "Enterprise",
    description: "Custom · Tutto di Pro + SLA 99.5% + SSO",
    color: "text-amber-400",
  },
];


export function PlanChanger({ orgId, currentPlan }: { orgId: string; currentPlan: string }) {
  const canonical = (["STARTER", "PRO", "ENTERPRISE"].includes(currentPlan)
    ? currentPlan
    : "STARTER") as AdminPlan;

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<AdminPlan>(canonical);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSelect(plan: AdminPlan) {
    if (plan === selected) { setOpen(false); return; }
    setOpen(false);
    setFeedback(null);
    startTransition(async () => {
      const res = await updateOrgPlan(orgId, plan);
      if (res.error) {
        setFeedback(`Errore: ${res.error}`);
      } else {
        setSelected(plan);
        setFeedback("Piano aggiornato con successo.");
        setTimeout(() => setFeedback(null), 3000);
      }
    });
  }

  const current = PLANS.find((p) => p.value === selected)!;

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Piano</p>

      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          disabled={isPending}
          className="flex items-center gap-2.5 rounded-lg bg-slate-800 border border-white/10 px-4 py-2.5 text-sm hover:bg-slate-700 transition-colors disabled:opacity-60 w-full sm:w-auto"
        >
          {isPending
            ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            : <span className={`text-sm font-semibold ${current.color}`}>{current.label}</span>
          }
          <span className="text-xs text-slate-500 hidden sm:inline">{current.description}</span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-500 ml-auto sm:ml-2" />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-full mt-1.5 z-20 w-80 rounded-xl bg-slate-800 border border-white/10 shadow-2xl overflow-hidden">
              {PLANS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => handleSelect(p.value)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors text-left"
                >
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${p.color}`}>{p.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{p.description}</p>
                  </div>
                  {selected === p.value && <Check className="h-4 w-4 text-emerald-400 shrink-0" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {feedback && (
        <p className={`text-xs ${feedback.startsWith("Errore") ? "text-red-400" : "text-emerald-400"}`}>
          {feedback}
        </p>
      )}

      <p className="text-xs text-slate-600 max-w-xs">
        Il cambio piano è immediato. In futuro questa operazione sarà automatizzata tramite Stripe / PayPal.
      </p>
    </div>
  );
}
