"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Check, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { setCrmMode } from "@/server/actions/crm-mode";
import { CRM_MODES, type CrmModeId } from "@/types/crm-modes";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PipelyWordmark, PipelyWordmarkDark } from "@/components/shared/PipelyLogo";

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  blue:   { bg: "bg-blue-50",   border: "border-blue-400",   text: "text-blue-700",   badge: "bg-blue-100 text-blue-700" },
  indigo: { bg: "bg-indigo-50", border: "border-indigo-400", text: "text-indigo-700", badge: "bg-indigo-100 text-indigo-700" },
  violet: { bg: "bg-violet-50", border: "border-violet-400", text: "text-violet-700", badge: "bg-violet-100 text-violet-700" },
  green:  { bg: "bg-green-50",  border: "border-green-400",  text: "text-green-700",  badge: "bg-green-100 text-green-700" },
  amber:  { bg: "bg-amber-50",  border: "border-amber-400",  text: "text-amber-700",  badge: "bg-amber-100 text-amber-700" },
  cyan:   { bg: "bg-cyan-50",   border: "border-cyan-400",   text: "text-cyan-700",   badge: "bg-cyan-100 text-cyan-700" },
  orange: { bg: "bg-orange-50", border: "border-orange-400", text: "text-orange-700", badge: "bg-orange-100 text-orange-700" },
  teal:   { bg: "bg-teal-50",   border: "border-teal-400",   text: "text-teal-700",   badge: "bg-teal-100 text-teal-700" },
  rose:   { bg: "bg-rose-50",   border: "border-rose-400",   text: "text-rose-700",   badge: "bg-rose-100 text-rose-700" },
};

function getColors(color: string): { bg: string; border: string; text: string; badge: string } {
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
    <div className="w-full max-w-4xl">
      {/* Logo */}
      <div className="flex justify-center mb-8">
        <PipelyWordmark className="dark:hidden h-8" />
        <PipelyWordmarkDark className="hidden dark:block h-8" />
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[var(--crm-neutral-900)] dark:text-white">
          Scegli il setup del tuo CRM
        </h1>
        <p className="text-sm text-[var(--crm-neutral-500)] mt-2 max-w-lg mx-auto">
          Seleziona la modalità più adatta al tuo settore. Personalizza terminologia e funzionalità.
          <span className="font-medium text-[var(--crm-neutral-700)]"> Non potrai cambiarlo in seguito.</span>
        </p>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {(Object.values(CRM_MODES) as (typeof CRM_MODES)[CrmModeId][]).map((mode) => {
          const colors = getColors(mode.color);
          const isSelected = selected === mode.id;
          const isVertical = mode.id !== "CLASSIC";

          return (
            <button
              key={mode.id}
              onClick={() => setSelected(mode.id)}
              className={cn(
                "relative text-left rounded-2xl border-2 p-5 transition-all shadow-sm hover:shadow-md",
                isSelected
                  ? cn("border-2", colors.border, colors.bg)
                  : "border-[var(--crm-neutral-200)] bg-white dark:bg-white/5 hover:border-[var(--crm-neutral-300)]",
              )}
            >
              {isSelected && (
                <span className={cn("absolute top-3 right-3 rounded-full p-0.5", colors.text)}>
                  <Check className="h-4 w-4" />
                </span>
              )}
              {isVertical && !isSelected && (
                <span className="absolute top-3 right-3 text-[9px] font-semibold bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5">
                  In sviluppo
                </span>
              )}

              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{mode.emoji}</span>
                <div>
                  <p className="text-sm font-bold text-[var(--crm-neutral-900)] dark:text-white leading-tight">{mode.name}</p>
                  <span className={cn("text-[10px] font-medium rounded-full px-1.5 py-0.5", colors.badge)}>{mode.category}</span>
                </div>
              </div>

              <p className="text-xs text-[var(--crm-neutral-500)] mb-4 leading-relaxed">{mode.description}</p>

              <ul className="space-y-1.5">
                {mode.features.map((f) => {
                  const isComingSoon = f.startsWith("🔧");
                  const label = isComingSoon ? f.replace("🔧 ", "") : f;
                  return (
                    <li key={f} className={cn(
                      "flex items-start gap-1.5 text-xs",
                      isComingSoon ? "text-[var(--crm-neutral-400)] italic" : "text-[var(--crm-neutral-600)]",
                    )}>
                      <CheckCircle2 className={cn("h-3 w-3 mt-0.5 shrink-0", isComingSoon ? "text-amber-400" : colors.text)} />
                      {label}
                    </li>
                  );
                })}
              </ul>

              <p className="mt-4 text-[10px] text-[var(--crm-neutral-400)] border-t border-[var(--crm-neutral-100)] pt-3">
                Affare → <span className="font-semibold">{mode.dealLabel}</span>
                <span className="mx-1">·</span>
                Lead → <span className="font-semibold">{mode.leadLabel}</span>
              </p>
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
          className="min-w-48 gap-2"
        >
          {pending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Configurazione in corso...</>
          ) : (
            <>
              {selected ? `Inizia con ${CRM_MODES[selected].name}` : "Seleziona una modalità"}
              {selected && <ArrowRight className="h-4 w-4" />}
            </>
          )}
        </Button>
        <p className="text-xs text-[var(--crm-neutral-400)]">
          Puoi sempre registrare una nuova organizzazione per usare un setup diverso
        </p>
      </div>
    </div>
  );
}
