"use client";

import { X } from "lucide-react";
import type { DealFilters } from "@/types/deals";

type Owner = { id: string; name: string | null; email: string };

type Props = {
  filters: DealFilters;
  owners: Owner[];
  onChange: (f: DealFilters) => void;
};

export function FilterBar({ filters, owners, onChange }: Props) {
  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <input
        type="text"
        value={filters.search ?? ""}
        onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
        placeholder="Cerca affare…"
        className="h-8 rounded-lg border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] w-40"
      />

      {/* Owner filter */}
      <select
        value={filters.ownerId ?? ""}
        onChange={(e) => onChange({ ...filters, ownerId: e.target.value || undefined })}
        className="h-8 rounded-lg border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] px-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)]"
      >
        <option value="">Tutti i commerciali</option>
        {owners.map((o) => (
          <option key={o.id} value={o.id}>{o.name ?? o.email}</option>
        ))}
      </select>

      {/* Min value */}
      <input
        type="number"
        value={filters.minValue ?? ""}
        onChange={(e) => onChange({ ...filters, minValue: e.target.value ? Number(e.target.value) : undefined })}
        placeholder="Min €"
        className="h-8 w-24 rounded-lg border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] px-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)]"
      />

      {/* Max value */}
      <input
        type="number"
        value={filters.maxValue ?? ""}
        onChange={(e) => onChange({ ...filters, maxValue: e.target.value ? Number(e.target.value) : undefined })}
        placeholder="Max €"
        className="h-8 w-24 rounded-lg border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] px-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)]"
      />

      {/* Due date */}
      <input
        type="date"
        value={filters.dueBefore ?? ""}
        onChange={(e) => onChange({ ...filters, dueBefore: e.target.value || undefined })}
        className="h-8 rounded-lg border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] px-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)]"
        title="Chiusura entro"
      />

      {/* Clear all */}
      {activeCount > 0 && (
        <button
          onClick={() => onChange({})}
          className="flex items-center gap-1 rounded-lg border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] h-8 px-2 text-xs text-[var(--crm-neutral-500)] hover:text-[var(--crm-danger)] hover:border-[var(--crm-danger)] transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          Rimuovi filtri ({activeCount})
        </button>
      )}
    </div>
  );
}
