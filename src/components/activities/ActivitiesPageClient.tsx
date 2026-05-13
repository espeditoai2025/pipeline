"use client";

import { Activity as ActivityIcon } from "lucide-react";
import { ActivitiesTable } from "./ActivitiesTable";
import type { Activity } from "@/types/activities";

type Props = {
  initialActivities: Activity[];
};

export function ActivitiesPageClient({ initialActivities }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--crm-primary)]/10">
          <ActivityIcon className="h-5 w-5 text-[var(--crm-primary)]" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Attività</h1>
          <p className="text-sm text-[var(--crm-neutral-500)]">
            {initialActivities.length} attività totali
          </p>
        </div>
      </div>

      <ActivitiesTable initialActivities={initialActivities} />
    </div>
  );
}
