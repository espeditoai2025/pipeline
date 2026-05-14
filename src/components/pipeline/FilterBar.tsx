"use client";

import { useState } from "react";
import { X, SlidersHorizontal, ChevronDown, ChevronUp, Search } from "lucide-react";
import type { DealFilters, Stage } from "@/types/deals";

type Owner = { id: string; name: string | null; email: string };

type Props = {
  filters: DealFilters;
  owners: Owner[];
  stages: Stage[];
  onChange: (f: DealFilters) => void;
};

const inputCls =
  "h-8 rounded-lg border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] px-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] transition-colors";

export function FilterBar({ filters, owners, stages, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);

  const activeFilters = Object.entries(filters).filter(([, v]) => v !== undefined && v !== "");
  const activeCount = activeFilters.length;

  function clear(key: keyof DealFilters) {
    const next = { ...filters };
    delete next[key];
    onChange(next);
  }

  function clearAll() {
    onChange({});
  }

  const FILTER_LABELS: Partial<Record<keyof DealFilters, (v: string) => string>> = {
    ownerId: (v) => owners.find((o) => o.id === v)?.name ?? v,
    stageId: (v) => stages.find((s) => s.id === v)?.name ?? v,
    minValue: (v) => `≥ €${Number(v).toLocaleString("it-IT")}`,
    maxValue: (v) => `≤ €${Number(v).toLocaleString("it-IT")}`,
    dueAfter: (v) => `Dal ${new Date(v).toLocaleDateString("it-IT")}`,
    dueBefore: (v) => `Entro ${new Date(v).toLocaleDateString("it-IT")}`,
    search: (v) => `"${v}"`,
  };

  return (
    <div className="space-y-2">
      {/* Top row: search + toggle */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--crm-neutral-400)] pointer-events-none" />
          <input
            type="text"
            value={filters.search ?? ""}
            onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
            placeholder="Cerca affare, contatto, azienda…"
            className={`${inputCls} pl-8 w-56`}
          />
          {filters.search && (
            <button
              onClick={() => clear("search")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--crm-neutral-400)] hover:text-[var(--crm-neutral-700)]"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Toggle advanced */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className={`flex items-center gap-1.5 h-8 rounded-lg border px-3 text-sm transition-colors ${
            expanded || activeCount > (filters.search ? 1 : 0)
              ? "border-[var(--crm-primary)] bg-[var(--crm-primary)]/5 text-[var(--crm-primary)]"
              : "border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] text-[var(--crm-neutral-500)] hover:text-[var(--crm-neutral-800)]"
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtri
          {activeCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--crm-primary)] text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {/* Clear all */}
        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 h-8 rounded-lg border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] px-2 text-xs text-[var(--crm-neutral-500)] hover:text-[var(--crm-danger)] hover:border-[var(--crm-danger)] transition-colors"
          >
            <X className="h-3 w-3" /> Rimuovi tutti
          </button>
        )}
      </div>

      {/* Advanced filter panel */}
      {expanded && (
        <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Owner */}
            <div>
              <label className="block text-xs font-medium text-[var(--crm-neutral-500)] mb-1">Commerciale</label>
              <select
                value={filters.ownerId ?? ""}
                onChange={(e) => onChange({ ...filters, ownerId: e.target.value || undefined })}
                className={`${inputCls} w-full`}
              >
                <option value="">Tutti</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>{o.name ?? o.email}</option>
                ))}
              </select>
            </div>

            {/* Stage */}
            <div>
              <label className="block text-xs font-medium text-[var(--crm-neutral-500)] mb-1">Stage</label>
              <select
                value={filters.stageId ?? ""}
                onChange={(e) => onChange({ ...filters, stageId: e.target.value || undefined })}
                className={`${inputCls} w-full`}
              >
                <option value="">Tutti gli stage</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Min value */}
            <div>
              <label className="block text-xs font-medium text-[var(--crm-neutral-500)] mb-1">Valore min (€)</label>
              <input
                type="number"
                min={0}
                value={filters.minValue ?? ""}
                onChange={(e) => onChange({ ...filters, minValue: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="es. 1000"
                className={`${inputCls} w-full`}
              />
            </div>

            {/* Max value */}
            <div>
              <label className="block text-xs font-medium text-[var(--crm-neutral-500)] mb-1">Valore max (€)</label>
              <input
                type="number"
                min={0}
                value={filters.maxValue ?? ""}
                onChange={(e) => onChange({ ...filters, maxValue: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="es. 50000"
                className={`${inputCls} w-full`}
              />
            </div>

            {/* Due after */}
            <div>
              <label className="block text-xs font-medium text-[var(--crm-neutral-500)] mb-1">Chiusura dal</label>
              <input
                type="date"
                value={filters.dueAfter ?? ""}
                onChange={(e) => onChange({ ...filters, dueAfter: e.target.value || undefined })}
                className={`${inputCls} w-full`}
              />
            </div>

            {/* Due before */}
            <div>
              <label className="block text-xs font-medium text-[var(--crm-neutral-500)] mb-1">Chiusura entro</label>
              <input
                type="date"
                value={filters.dueBefore ?? ""}
                onChange={(e) => onChange({ ...filters, dueBefore: e.target.value || undefined })}
                className={`${inputCls} w-full`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {activeCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {(Object.entries(filters) as [keyof DealFilters, string][])
            .filter(([, v]) => v !== undefined && v !== "")
            .map(([key, val]) => {
              const labelFn = FILTER_LABELS[key];
              const label = labelFn ? labelFn(String(val)) : String(val);
              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 rounded-full bg-[var(--crm-primary)]/10 border border-[var(--crm-primary)]/20 text-[var(--crm-primary)] text-xs px-2.5 py-0.5 font-medium"
                >
                  {label}
                  <button onClick={() => clear(key)} className="hover:text-[var(--crm-primary-dark)]">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
        </div>
      )}
    </div>
  );
}
