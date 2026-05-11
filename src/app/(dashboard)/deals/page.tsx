"use client";

import { useState, useMemo } from "react";
import { LayoutGrid, List, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";
import { DealsListView } from "@/components/pipeline/DealsListView";
import { FilterBar } from "@/components/pipeline/FilterBar";
import { DealForm } from "@/components/pipeline/DealForm";
import { MOCK_PIPELINE } from "@/lib/mock-data";
import type { Deal, DealFilters, Stage } from "@/types/deals";

type ViewMode = "kanban" | "list";

const OWNERS = [
  { id: "owner-1", name: "Mario Rossi", email: "owner@acme.com" },
  { id: "sales-1", name: "Giulia Bianchi", email: "sales@acme.com" },
];

export default function DealsPage() {
  const [view, setView] = useState<ViewMode>("kanban");
  const [filters, setFilters] = useState<DealFilters>({});
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [newDealStageId, setNewDealStageId] = useState<string | undefined>();
  const [formOpen, setFormOpen] = useState(false);

  const pipeline = MOCK_PIPELINE;

  const filteredPipeline = useMemo(() => {
    if (!Object.values(filters).some(Boolean)) return pipeline;
    return {
      ...pipeline,
      stages: pipeline.stages.map((stage: Stage) => ({
        ...stage,
        deals: stage.deals.filter((d: Deal) => {
          if (filters.ownerId && d.ownerId !== filters.ownerId) return false;
          if (filters.search && !d.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
          if (filters.minValue !== undefined && d.value < filters.minValue) return false;
          if (filters.maxValue !== undefined && d.value > filters.maxValue) return false;
          if (filters.dueBefore && d.expectedClose && d.expectedClose > filters.dueBefore) return false;
          return true;
        }),
      })),
    };
  }, [pipeline, filters]);

  const allDeals = useMemo(
    () => filteredPipeline.stages.flatMap((s: Stage) => s.deals),
    [filteredPipeline],
  );

  function openNewDeal(stageId?: string) {
    setSelectedDeal(null);
    setNewDealStageId(stageId);
    setFormOpen(true);
  }

  function openEditDeal(deal: Deal) {
    setSelectedDeal(deal);
    setFormOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--crm-neutral-900)] dark:text-white">
            Affari
          </h1>
          <p className="text-sm text-[var(--crm-neutral-500)] mt-0.5">
            {allDeals.length} affare{allDeals.length !== 1 ? "i" : ""} —{" "}
            <span className="font-medium">{pipeline.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-[var(--crm-neutral-100)] dark:border-white/10 p-0.5 bg-white dark:bg-[#1a1a2e]">
            {(["kanban", "list"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  view === v
                    ? "bg-[var(--crm-primary)] text-white"
                    : "text-[var(--crm-neutral-500)] hover:text-[var(--crm-neutral-900)] dark:hover:text-white",
                )}
              >
                {v === "kanban" ? <LayoutGrid className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
                {v === "kanban" ? "Kanban" : "Lista"}
              </button>
            ))}
          </div>
          <Button
            onClick={() => openNewDeal()}
            className="bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white h-8 px-3 text-xs"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Nuovo affare
          </Button>
        </div>
      </div>

      <FilterBar filters={filters} owners={OWNERS} onChange={setFilters} />

      {view === "kanban" ? (
        <KanbanBoard pipeline={filteredPipeline} onDealClick={openEditDeal} />
      ) : (
        <DealsListView deals={allDeals} onDealClick={openEditDeal} />
      )}

      <DealForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        deal={selectedDeal}
        stages={pipeline.stages}
        pipelineId={pipeline.id}
        defaultStageId={newDealStageId}
      />
    </div>
  );
}
