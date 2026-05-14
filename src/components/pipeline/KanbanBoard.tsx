"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { moveDeal } from "@/server/actions/deals";
import type { Deal, Pipeline, Stage } from "@/types/deals";
import { StageColumn } from "./StageColumn";
import { DealCardDragOverlay } from "./DealCard";

type Props = {
  pipeline: Pipeline;
  onDealClick?: (deal: Deal) => void;
};

export function KanbanBoard({ pipeline, onDealClick }: Props) {
  const [stages, setStages] = useState<Stage[]>(pipeline.stages);
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function findStageByDealId(dealId: string) {
    return stages.find((s) => s.deals.some((d) => d.id === dealId));
  }

  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    const deal = stages.flatMap((s) => s.deals).find((d) => d.id === active.id);
    setActiveDeal(deal ?? null);
  }, [stages]);

  const handleDragEnd = useCallback(async ({ active, over }: DragEndEvent) => {
    setActiveDeal(null);
    if (!over) return;

    const dealId = String(active.id);
    const targetId = String(over.id);

    const sourceStage = findStageByDealId(dealId);
    if (!sourceStage) return;

    // over can be a stage id or another deal id
    const targetStage =
      stages.find((s) => s.id === targetId) ??
      stages.find((s) => s.deals.some((d) => d.id === targetId));

    if (!targetStage || sourceStage.id === targetStage.id) return;

    const deal = sourceStage.deals.find((d) => d.id === dealId)!;

    // Optimistic update
    setStages((prev) =>
      prev.map((s) => {
        if (s.id === sourceStage.id) {
          return {
            ...s,
            deals: s.deals.filter((d) => d.id !== dealId),
            totalValue: s.totalValue - deal.value,
          };
        }
        if (s.id === targetStage.id) {
          return {
            ...s,
            deals: [...s.deals, { ...deal, stageId: targetStage.id }],
            totalValue: s.totalValue + deal.value,
          };
        }
        return s;
      }),
    );

    // Server action
    const result = await moveDeal({
      dealId,
      newStageId: targetStage.id,
      oldStageId: sourceStage.id,
    });

    if (result.error) {
      // Rollback
      setStages(pipeline.stages);
      toast.error(`Errore: ${result.error}`);
    } else {
      toast.success(`Affare spostato in "${targetStage.name}"`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stages, pipeline.stages]);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="w-full flex gap-4 overflow-x-auto pb-4" data-testid="kanban-board">
        {stages.map((stage) => (
          <StageColumn key={stage.id} stage={stage} onDealClick={onDealClick} />
        ))}
      </div>

      <DragOverlay>
        {activeDeal ? <DealCardDragOverlay deal={activeDeal} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
