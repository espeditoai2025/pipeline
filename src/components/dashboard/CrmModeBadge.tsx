"use client";

import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { CRM_MODES, type CrmModeId } from "@/types/crm-modes";

const COLOR_MAP: Record<string, { bg: string; border: string; text: string }> = {
  blue:   { bg: "bg-blue-50 dark:bg-blue-900/20",   border: "border-blue-200 dark:border-blue-700",   text: "text-blue-700 dark:text-blue-300" },
  orange: { bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-200 dark:border-orange-700", text: "text-orange-700 dark:text-orange-300" },
  teal:   { bg: "bg-teal-50 dark:bg-teal-900/20",   border: "border-teal-200 dark:border-teal-700",   text: "text-teal-700 dark:text-teal-300" },
  rose:   { bg: "bg-rose-50 dark:bg-rose-900/20",   border: "border-rose-200 dark:border-rose-700",   text: "text-rose-700 dark:text-rose-300" },
};

function getColors(color: string) {
  return COLOR_MAP[color] ?? COLOR_MAP["blue"]!;
}

type Props = { currentMode: CrmModeId };

export function CrmModeBadge({ currentMode }: Props) {
  const mode = CRM_MODES[currentMode];
  const colors = getColors(mode.color);

  return (
    <div className={cn(
      "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 w-fit",
      colors.bg, colors.border,
    )}>
      <Layers className={cn("h-3.5 w-3.5 shrink-0", colors.text)} />
      <span className={cn("text-xs font-semibold", colors.text)}>
        {mode.emoji} {mode.name}
      </span>
      <span className="text-xs text-[var(--crm-neutral-400)]">— {mode.hint}</span>
    </div>
  );
}
