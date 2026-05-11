"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, Flame, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Deal } from "@/types/deals";

type Props = {
  deal: Deal;
  isOverlay?: boolean;
  onClick?: (deal: Deal) => void;
};

function formatEur(v: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}

export function DealCard({ deal, isOverlay = false, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
    data: { type: "deal", deal },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isRotting = deal.daysInStage > 0 && deal.daysInStage >= (14); // simplified check

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick?.(deal)}
      data-testid={`deal-card-${deal.id}`}
      className={cn(
        "group relative rounded-lg border bg-white dark:bg-[#1e2235] p-3 shadow-sm cursor-grab active:cursor-grabbing select-none transition-all",
        isDragging && "opacity-40 ring-2 ring-[var(--crm-primary)]",
        isOverlay && "shadow-xl rotate-1 cursor-grabbing",
        isRotting
          ? "border-[var(--crm-rotting)] dark:border-orange-500/60"
          : "border-[var(--crm-neutral-100)] dark:border-white/10",
        "hover:shadow-md hover:border-[var(--crm-primary)]/40",
      )}
    >
      {/* Rotting indicator */}
      {isRotting && (
        <span className="absolute top-2 right-2 flex items-center gap-0.5 text-[10px] font-semibold text-[var(--crm-rotting)]">
          <Flame className="h-3 w-3" />
          {deal.daysInStage}g
        </span>
      )}

      {/* Title */}
      <p className="text-sm font-medium text-[var(--crm-neutral-900)] dark:text-white leading-snug pr-6 line-clamp-2">
        {deal.title}
      </p>

      {/* Value */}
      <p className="mt-1.5 text-sm font-semibold text-[var(--crm-primary)]">
        {formatEur(deal.value)}
      </p>

      {/* Footer: contact/owner + due date */}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--crm-primary)] text-[9px] font-bold text-white">
            {(deal.owner.name ?? deal.owner.email)[0]?.toUpperCase()}
          </div>
          <span className="truncate text-xs text-[var(--crm-neutral-500)]">
            {deal.contact
              ? `${deal.contact.firstName} ${deal.contact.lastName ?? ""}`.trim()
              : deal.company?.name ?? deal.owner.name}
          </span>
        </div>
        {deal.expectedClose && (
          <span className="flex shrink-0 items-center gap-0.5 text-[11px] text-[var(--crm-neutral-500)]">
            <CalendarDays className="h-3 w-3" />
            {formatDate(deal.expectedClose)}
          </span>
        )}
      </div>
    </div>
  );
}

/** Ghost card shown while dragging over a column */
export function DealCardDragOverlay({ deal }: { deal: Deal }) {
  return <DealCard deal={deal} isOverlay />;
}
