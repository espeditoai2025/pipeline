"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronRight, X, Layers, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { setCrmMode } from "@/server/actions/crm-mode";
import { CRM_MODES, type CrmModeId } from "@/types/crm-modes";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  blue:   { bg: "bg-blue-50 dark:bg-blue-900/20",   border: "border-blue-200 dark:border-blue-700",   text: "text-blue-700 dark:text-blue-300",   badge: "bg-blue-100 text-blue-700" },
  indigo: { bg: "bg-indigo-50 dark:bg-indigo-900/20", border: "border-indigo-200 dark:border-indigo-700", text: "text-indigo-700 dark:text-indigo-300", badge: "bg-indigo-100 text-indigo-700" },
  violet: { bg: "bg-violet-50 dark:bg-violet-900/20", border: "border-violet-200 dark:border-violet-700", text: "text-violet-700 dark:text-violet-300", badge: "bg-violet-100 text-violet-700" },
  green:  { bg: "bg-green-50 dark:bg-green-900/20",  border: "border-green-200 dark:border-green-700",  text: "text-green-700 dark:text-green-300",  badge: "bg-green-100 text-green-700" },
  amber:  { bg: "bg-amber-50 dark:bg-amber-900/20",  border: "border-amber-200 dark:border-amber-700",  text: "text-amber-700 dark:text-amber-300",  badge: "bg-amber-100 text-amber-700" },
  cyan:   { bg: "bg-cyan-50 dark:bg-cyan-900/20",    border: "border-cyan-200 dark:border-cyan-700",    text: "text-cyan-700 dark:text-cyan-300",    badge: "bg-cyan-100 text-cyan-700" },
  orange: { bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-200 dark:border-orange-700", text: "text-orange-700 dark:text-orange-300", badge: "bg-orange-100 text-orange-700" },
  teal:   { bg: "bg-teal-50 dark:bg-teal-900/20",    border: "border-teal-200 dark:border-teal-700",    text: "text-teal-700 dark:text-teal-300",    badge: "bg-teal-100 text-teal-700" },
  rose:   { bg: "bg-rose-50 dark:bg-rose-900/20",    border: "border-rose-200 dark:border-rose-700",    text: "text-rose-700 dark:text-rose-300",    badge: "bg-rose-100 text-rose-700" },
};

function getColors(color: string): { bg: string; border: string; text: string; badge: string } {
  return COLOR_MAP[color] ?? COLOR_MAP["blue"]!;
}

type Props = { currentMode: CrmModeId };

export function VerticalModePicker({ currentMode }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CrmModeId>(currentMode);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const active = CRM_MODES[currentMode];
  const activeColors = getColors(active.color);

  function handleSave() {
    if (selected === currentMode) { setOpen(false); return; }
    startTransition(async () => {
      const res = await setCrmMode(selected);
      if (res.error) { toast.error(res.error); return; }
      toast.success(`Setup CRM cambiato: ${CRM_MODES[selected].name}`);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      {/* ── Compact banner ─────────────────────────── */}
      <div className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-2.5",
        activeColors.bg, activeColors.border,
      )}>
        <Layers className={cn("h-4 w-4 shrink-0", activeColors.text)} />
        <span className="text-sm font-medium text-[var(--crm-neutral-700)] dark:text-white flex-1">
          <span className={cn("font-semibold", activeColors.text)}>{active.emoji} {active.name}</span>
          <span className="text-[var(--crm-neutral-500)] ml-2 hidden sm:inline">— {active.hint}</span>
        </span>
        <button
          onClick={() => { setSelected(currentMode); setOpen(true); }}
          className={cn(
            "flex items-center gap-1 text-xs font-medium rounded-lg px-2.5 py-1 transition-colors",
            activeColors.badge, "hover:opacity-80",
          )}
        >
          Cambia setup
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* ── Modal overlay ───────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div
            className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#1a1a2e] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-[#1a1a2e] border-b border-[var(--crm-neutral-100)] dark:border-white/10 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-[var(--crm-neutral-900)] dark:text-white">Scegli il setup del tuo CRM</h2>
                <p className="text-xs text-[var(--crm-neutral-500)] mt-0.5">Personalizza la terminologia e le funzioni suggerite per il tuo settore</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-[var(--crm-neutral-100)] dark:hover:bg-white/10 transition-colors">
                <X className="h-4 w-4 text-[var(--crm-neutral-500)]" />
              </button>
            </div>

            {/* Grid */}
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(Object.values(CRM_MODES) as (typeof CRM_MODES)[CrmModeId][]).map((mode) => {
                const colors = getColors(mode.color);
                const isSelected = selected === mode.id;
                const isVertical = mode.id !== "CLASSIC";
                return (
                  <button
                    key={mode.id}
                    onClick={() => setSelected(mode.id)}
                    className={cn(
                      "relative text-left rounded-xl border-2 p-4 transition-all",
                      isSelected
                        ? cn(colors.border, colors.bg)
                        : "border-[var(--crm-neutral-100)] dark:border-white/10 hover:border-[var(--crm-neutral-200)] dark:hover:border-white/20 bg-white dark:bg-white/5",
                    )}
                  >
                    {isSelected && (
                      <span className="absolute top-3 right-3">
                        <Check className={cn("h-4 w-4", colors.text)} />
                      </span>
                    )}
                    {isVertical && !isSelected && (
                      <span className="absolute top-3 right-3 text-[9px] font-semibold bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5">
                        In sviluppo
                      </span>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{mode.emoji}</span>
                      <div>
                        <p className="text-sm font-semibold text-[var(--crm-neutral-900)] dark:text-white leading-tight">{mode.name}</p>
                        <span className={cn("text-[10px] font-medium rounded-full px-1.5 py-0.5", colors.badge)}>{mode.category}</span>
                      </div>
                    </div>
                    <p className="text-xs text-[var(--crm-neutral-500)] mb-3 leading-relaxed">{mode.description}</p>
                    <ul className="space-y-1">
                      {mode.features.map((f) => {
                        const isComingSoon = f.startsWith("🔧");
                        const label = isComingSoon ? f.replace("🔧 ", "") : f;
                        return (
                          <li key={f} className={cn(
                            "flex items-start gap-1.5 text-xs",
                            isComingSoon
                              ? "text-[var(--crm-neutral-400)] italic"
                              : "text-[var(--crm-neutral-600)] dark:text-[var(--crm-neutral-400)]",
                          )}>
                            <CheckCircle2 className={cn("h-3 w-3 mt-0.5 shrink-0", isComingSoon ? "text-amber-400" : colors.text)} />
                            {label}
                          </li>
                        );
                      })}
                    </ul>
                    <p className="mt-3 text-[10px] text-[var(--crm-neutral-400)]">
                      Affare → <span className="font-medium">{mode.dealLabel}</span>
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-[#1a1a2e] border-t border-[var(--crm-neutral-100)] dark:border-white/10 px-6 py-4 flex items-center justify-between gap-3">
              <p className="text-xs text-[var(--crm-neutral-500)]">
                Il setup può essere cambiato in qualsiasi momento da qui o dalle Impostazioni
              </p>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Annulla</Button>
                <Button size="sm" onClick={handleSave} disabled={pending}>
                  {pending ? "Salvataggio..." : "Applica setup"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
