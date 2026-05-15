"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Check, ArrowRight, Loader2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { setCrmMode } from "@/server/actions/crm-mode";
import { CRM_MODES, type CrmModeId } from "@/types/crm-modes";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PipelyWordmark, PipelyWordmarkDark } from "@/components/shared/PipelyLogo";

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; badge: string; pill: string }> = {
  blue:   { bg: "bg-blue-50",   border: "border-blue-400",   text: "text-blue-700",   badge: "bg-blue-100 text-blue-700",   pill: "bg-blue-600" },
  orange: { bg: "bg-orange-50", border: "border-orange-400", text: "text-orange-700", badge: "bg-orange-100 text-orange-700", pill: "bg-orange-600" },
  teal:   { bg: "bg-teal-50",   border: "border-teal-400",   text: "text-teal-700",   badge: "bg-teal-100 text-teal-700",   pill: "bg-teal-600" },
  rose:   { bg: "bg-rose-50",   border: "border-rose-400",   text: "text-rose-700",   badge: "bg-rose-100 text-rose-700",   pill: "bg-rose-600" },
};

function getColors(color: string) {
  return COLOR_MAP[color] ?? COLOR_MAP["blue"]!;
}

export function SetupWizard() {
  const [selected, setSelected] = useState<CrmModeId | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    if (!selected) return;
    startTransition(async () => {
      const res = await setCrmMode(selected);
      if (res.error) { toast.error(res.error); return; }
      router.push("/dashboard");
    });
  }

  return (
    <div className="w-full max-w-5xl">
      {/* Logo */}
      <div className="flex justify-center mb-8">
        <PipelyWordmark className="dark:hidden h-8" />
        <PipelyWordmarkDark className="hidden dark:block h-8" />
      </div>

      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold text-[var(--crm-neutral-900)] dark:text-white">
          Scegli il setup del tuo CRM
        </h1>
        <p className="text-sm text-[var(--crm-neutral-500)] mt-2 max-w-xl mx-auto leading-relaxed">
          Seleziona la modalità più adatta al tuo settore. Adatta terminologia, pipeline e funzionalità al tuo lavoro.
          <br />
          <span className="font-semibold text-[var(--crm-neutral-700)]">La scelta è definitiva — per un setup diverso registra una nuova organizzazione.</span>
        </p>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 items-stretch">
        {(Object.values(CRM_MODES) as (typeof CRM_MODES)[CrmModeId][]).map((mode) => {
          const colors = getColors(mode.color);
          const isSelected = selected === mode.id;
          const isVertical = mode.id !== "CLASSIC";
          const readyFeatures = mode.features.filter(f => !f.startsWith("🔧"));
          const soonFeatures = mode.features.filter(f => f.startsWith("🔧")).map(f => f.replace("🔧 ", ""));

          return (
            <button
              key={mode.id}
              onClick={() => setSelected(mode.id)}
              className={cn(
                "relative flex flex-col text-left rounded-2xl border-2 p-5 transition-all shadow-sm hover:shadow-md",
                isSelected
                  ? cn(colors.border, colors.bg)
                  : "border-[var(--crm-neutral-200)] bg-white dark:bg-white/5 hover:border-[var(--crm-neutral-300)]",
              )}
            >
              {/* Status badge — top right */}
              {isSelected ? (
                <span className={cn("absolute top-3 right-3 flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5", colors.badge)}>
                  <Check className="h-3 w-3" /> Selezionato
                </span>
              ) : isVertical ? (
                <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-semibold bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
                  <Clock className="h-3 w-3" /> In sviluppo
                </span>
              ) : (
                <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-semibold bg-green-100 text-green-700 rounded-full px-2 py-0.5">
                  <CheckCircle2 className="h-3 w-3" /> Disponibile
                </span>
              )}

              {/* Emoji + name */}
              <div className="mb-3 pr-24">
                <span className="text-3xl block mb-2">{mode.emoji}</span>
                <p className="text-base font-bold text-[var(--crm-neutral-900)] dark:text-white leading-tight">{mode.name}</p>
                <span className={cn("inline-block mt-1 text-[10px] font-semibold rounded-full px-2 py-0.5", colors.badge)}>
                  {mode.category}
                </span>
              </div>

              {/* Description */}
              <p className="text-xs text-[var(--crm-neutral-500)] mb-4 leading-relaxed">{mode.description}</p>

              {/* Ready features */}
              <ul className="space-y-1.5 flex-1">
                {readyFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-[var(--crm-neutral-700)]">
                    <CheckCircle2 className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", colors.text)} />
                    {f}
                  </li>
                ))}
              </ul>

              {/* Coming soon features */}
              {soonFeatures.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-px flex-1 bg-[var(--crm-neutral-100)]" />
                    <span className="text-[9px] font-semibold text-amber-600 uppercase tracking-wide">Prossimamente</span>
                    <div className="h-px flex-1 bg-[var(--crm-neutral-100)]" />
                  </div>
                  <ul className="space-y-1">
                    {soonFeatures.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-xs text-[var(--crm-neutral-400)] italic">
                        <Clock className="h-3 w-3 mt-0.5 shrink-0 text-amber-400" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Terminology */}
              <div className="mt-4 pt-3 border-t border-[var(--crm-neutral-100)] space-y-1">
                <p className="text-[10px] text-[var(--crm-neutral-500)]">
                  Affare <span className="text-[var(--crm-neutral-400)]">→</span>{" "}
                  <span className={cn("font-bold", colors.text)}>{mode.dealLabel}</span>
                </p>
                <p className="text-[10px] text-[var(--crm-neutral-500)]">
                  Lead <span className="text-[var(--crm-neutral-400)]">→</span>{" "}
                  <span className={cn("font-bold", colors.text)}>{mode.leadLabel}</span>
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* CTA */}
      <div className="flex flex-col items-center gap-3">
        <Button
          size="lg"
          onClick={handleConfirm}
          disabled={!selected || pending}
          className="min-w-56 gap-2"
        >
          {pending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Configurazione in corso...</>
          ) : selected ? (
            <>{CRM_MODES[selected].emoji} Inizia con {CRM_MODES[selected].name} <ArrowRight className="h-4 w-4" /></>
          ) : (
            "Seleziona una modalità per continuare"
          )}
        </Button>
        <p className="text-xs text-[var(--crm-neutral-400)]">
          Puoi registrare una nuova organizzazione in qualsiasi momento per usare un setup diverso
        </p>
      </div>
    </div>
  );
}
