"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DealForm } from "@/components/pipeline/DealForm";
import type { Deal, Stage } from "@/types/deals";

type Props = {
  deal: Deal;
  stages: Stage[];
  pipelineId: string;
};

export function DealDetailActions({ deal, stages, pipelineId }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-1.5 text-xs"
      >
        <Pencil className="h-3.5 w-3.5" /> Modifica
      </Button>
      <DealForm
        open={open}
        onClose={() => setOpen(false)}
        deal={deal}
        stages={stages}
        pipelineId={pipelineId}
        defaultStageId={deal.stageId}
      />
    </>
  );
}
