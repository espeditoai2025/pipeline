"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import type { Deal, Stage } from "@/types/deals";
import { DealCard } from "./DealCard";

type Props = {
  stage: Stage;
  onDealClick?: (deal: Deal) => void;
};

function formatEur(v: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

export function StageColumn({ stage, onDealClick }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id, data: { type: "stage", stage } });

  return (
    <div
      className="flex w-64 shrink-0 flex-col rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-[var(--crm-neutral-50)] dark:bg-[#161b2d]"
      data-testid={`stage-column-${stage.id}`}
    >
      {/* Column header */}
      <div className="flex items-start justify-between gap-2 rounded-t-xl bg-white dark:bg-[#1a1a2e] px-3 py-2.5 border-b border-[var(--crm-neutral-100)] dark:border-white/10">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-[var(--crm-neutral-900)] dark:text-white">
              {stage.name}
            </span>
            <span className="shrink-0 rounded-full bg-[var(--crm-neutral-100)] dark:bg-white/10 px-1.5 py-0.5 text-[11px] font-medium text-[var(--crm-neutral-500)] dark:text-white/60">
              {stage.deals.length}
            </span>
          </div>
          <p className="mt-0.5 text-xs font-medium text-[var(--crm-primary)]">
            {formatEur(stage.totalValue)}
          </p>
        </div>
        <span className="shrink-0 rounded-md bg-[var(--crm-primary)]/10 px-1.5 py-0.5 text-[11px] font-semibold text-[var(--crm-primary)]">
          {stage.probability}%
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-1 flex-col gap-2 p-2 transition-colors min-h-20",
          isOver && "bg-[var(--crm-primary)]/5 rounded-b-xl",
        )}
      >
        <SortableContext items={stage.deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          {stage.deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} onClick={onDealClick} />
          ))}
        </SortableContext>

        {stage.deals.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-[var(--crm-neutral-100)] dark:border-white/10 py-6 text-xs text-[var(--crm-neutral-500)]">
            Trascina qui
          </div>
        )}
      </div>
    </div>
  );
}
