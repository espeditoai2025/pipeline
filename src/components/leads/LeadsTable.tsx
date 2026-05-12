"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, Pencil, Trash2, Plus, ArrowRightCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteLead } from "@/server/actions/leads";
import { LeadForm } from "./LeadForm";
import { ConvertLeadModal } from "./ConvertLeadModal";
import type { Lead, LeadStatus } from "@/types/contacts";

type Props = {
  initialLeads: Lead[];
};

const STATUS_CONFIG: Record<LeadStatus, { label: string; className: string }> = {
  NEW: { label: "Nuovo", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  WORKING: { label: "In lavorazione", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  NURTURING: { label: "Nurturing", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  CONVERTED: { label: "Convertito", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  DISQUALIFIED: { label: "Non qualificato", className: "bg-[var(--crm-neutral-100)] text-[var(--crm-neutral-500)]" },
};

const col = createColumnHelper<Lead>();

export function LeadsTable({ initialLeads }: Props) {
  const [leads, setLeads] = useState(initialLeads);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "">("");
  const [formOpen, setFormOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [converting, setConverting] = useState<Lead | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredLeads = useMemo(() =>
    leads.filter((l) => !statusFilter || l.status === statusFilter),
    [leads, statusFilter]
  );

  const columns = useMemo(() => [
    col.accessor("title", {
      header: ({ column }) => (
        <button className="flex items-center gap-1 hover:text-[var(--crm-primary)]" onClick={() => column.toggleSorting()}>
          Titolo <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ getValue }) => <span className="font-medium text-sm">{getValue()}</span>,
    }),
    col.accessor("source", {
      header: "Sorgente",
      cell: ({ getValue }) => getValue()
        ? <span className="text-sm">{getValue()}</span>
        : <span className="text-[var(--crm-neutral-400)] text-sm">—</span>,
    }),
    col.accessor("score", {
      header: ({ column }) => (
        <button className="flex items-center gap-1 hover:text-[var(--crm-primary)]" onClick={() => column.toggleSorting()}>
          Score <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ getValue }) => {
        const v = getValue();
        const color = v >= 70 ? "var(--crm-success)" : v >= 40 ? "var(--crm-warning)" : "var(--crm-danger)";
        return (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 rounded-full bg-[var(--crm-neutral-200)] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${v}%`, backgroundColor: color }} />
            </div>
            <span className="text-sm font-semibold" style={{ color }}>{v}</span>
          </div>
        );
      },
    }),
    col.accessor("status", {
      header: "Stato",
      cell: ({ getValue }) => {
        const cfg = STATUS_CONFIG[getValue()];
        return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>{cfg.label}</span>;
      },
    }),
    col.accessor("createdAt", {
      header: ({ column }) => (
        <button className="flex items-center gap-1 hover:text-[var(--crm-primary)]" onClick={() => column.toggleSorting()}>
          Data <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ getValue }) => <span className="text-sm text-[var(--crm-neutral-500)]">{new Date(getValue()).toLocaleDateString("it-IT")}</span>,
    }),
    col.display({
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 justify-end">
          {row.original.status !== "CONVERTED" && (
            <button
              title="Converti in affare"
              className="p-1.5 rounded hover:bg-green-50 text-[var(--crm-neutral-500)] hover:text-[var(--crm-success)]"
              onClick={() => { setConverting(row.original); setConvertOpen(true); }}
            >
              <ArrowRightCircle className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            className="p-1.5 rounded hover:bg-[var(--crm-neutral-100)] text-[var(--crm-neutral-500)]"
            onClick={() => { setEditing(row.original); setFormOpen(true); }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            className="p-1.5 rounded hover:bg-red-50 text-[var(--crm-neutral-500)] hover:text-[var(--crm-danger)]"
            disabled={deletingId === row.original.id}
            onClick={async () => {
              if (!confirm(`Eliminare il lead "${row.original.title}"?`)) return;
              setDeletingId(row.original.id);
              const res = await deleteLead(row.original.id);
              setDeletingId(null);
              if (res.error) { toast.error(res.error); return; }
              setLeads((prev) => prev.filter((l) => l.id !== row.original.id));
              toast.success("Lead eliminato");
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    }),
  ], [deletingId]);

  const table = useReactTable({
    data: filteredLeads,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-3 flex-wrap">
          <input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Cerca lead..."
            className="rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] w-56"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "")}
            className="rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)]"
          >
            <option value="">Tutti gli stati</option>
            {Object.entries(STATUS_CONFIG).map(([v, { label }]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
        </div>
        <Button
          size="sm"
          className="bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white"
          onClick={() => { setEditing(null); setFormOpen(true); }}
        >
          <Plus className="h-4 w-4 mr-1.5" /> Nuovo lead
        </Button>
      </div>

      <div className="rounded-xl border border-[var(--crm-neutral-100)] overflow-hidden bg-white dark:bg-[#1a1a2e]">
        <table className="w-full">
          <thead className="bg-[var(--crm-neutral-50)] dark:bg-[#0f0f1a]">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-4 py-3 text-left text-xs font-semibold text-[var(--crm-neutral-600)] uppercase tracking-wide">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-[var(--crm-neutral-400)] text-sm">
                  Nessun lead trovato
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-t border-[var(--crm-neutral-100)] hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[var(--crm-neutral-500)]">{table.getFilteredRowModel().rows.length} lead</p>

      <LeadForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        lead={editing}
        onSaved={(saved) => {
          setLeads((prev) =>
            editing ? prev.map((l) => l.id === saved.id ? saved : l) : [saved, ...prev]
          );
        }}
      />

      <ConvertLeadModal
        open={convertOpen}
        onClose={() => { setConvertOpen(false); setConverting(null); }}
        lead={converting}
        onConverted={(leadId, dealId) => {
          setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, status: "CONVERTED" as LeadStatus, convertedDealId: dealId } : l));
        }}
      />
    </div>
  );
}
