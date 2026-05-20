"use client";

import { useState, useTransition } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type SortingState,
  type RowSelectionState,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown, ChevronUp, Trash2, Trophy, X as LostIcon, RotateCcw, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { deleteDeals, updateDealsStatus } from "@/server/actions/deals";
import { TablePagination } from "@/components/shared/TablePagination";
import type { Deal } from "@/types/deals";

const helper = createColumnHelper<Deal>();

function formatEur(v: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}
function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("it-IT");
}

type Props = { deals: Deal[]; onDealClick?: (deal: Deal) => void };

export function DealsListView({ deals, onDealClick }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isBulkDeleting, startBulkDelete] = useTransition();
  const [isBulkUpdating, startBulkUpdate] = useTransition();

  const columns = [
    helper.display({
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          className="h-3.5 w-3.5 rounded border-[var(--crm-neutral-300)] accent-[var(--crm-primary)] cursor-pointer"
          checked={table.getIsAllPageRowsSelected()}
          ref={(el) => { if (el) el.indeterminate = table.getIsSomePageRowsSelected(); }}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          aria-label="Seleziona tutti"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="h-3.5 w-3.5 rounded border-[var(--crm-neutral-300)] accent-[var(--crm-primary)] cursor-pointer"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          onClick={(e) => e.stopPropagation()}
          aria-label="Seleziona"
        />
      ),
    }),
    helper.accessor("title", {
      header: "Affare",
      cell: (i) => (
        <span className="font-medium text-[var(--crm-neutral-900)] dark:text-white">{i.getValue()}</span>
      ),
    }),
    helper.accessor("value", {
      header: "Valore",
      cell: (i) => <span className="font-semibold text-[var(--crm-primary)]">{formatEur(i.getValue())}</span>,
    }),
    helper.accessor((row) => row.contact ? `${row.contact.firstName} ${row.contact.lastName ?? ""}`.trim() : row.company?.name ?? "—", {
      id: "contactName",
      header: "Contatto / Azienda",
    }),
    helper.accessor((row) => row.owner.name ?? row.owner.email, {
      id: "ownerName",
      header: "Commerciale",
    }),
    helper.accessor("expectedClose", {
      header: "Chiusura prevista",
      cell: (i) => formatDate(i.getValue()),
    }),
    helper.accessor("daysInStage", {
      header: "Giorni in stage",
      cell: (i) => {
        const v = i.getValue();
        return (
          <span className={v >= 14 ? "font-medium text-[var(--crm-rotting)]" : ""}>{v}g</span>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: deals,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k]);
  const isBusy = isBulkDeleting || isBulkUpdating;

  function handleBulkDelete() {
    if (!confirm(`Eliminare ${selectedIds.length} affari selezionati?`)) return;
    startBulkDelete(async () => {
      const { count, error } = await deleteDeals(selectedIds);
      if (error) { toast.error(error); return; }
      setRowSelection({});
      toast.success(`${count} affare/i eliminat${count === 1 ? "o" : "i"}`);
    });
  }

  function handleBulkStatus(status: "OPEN" | "WON" | "LOST") {
    const label = status === "WON" ? "Vinto" : status === "LOST" ? "Perso" : "Aperto";
    startBulkUpdate(async () => {
      const { count, error } = await updateDealsStatus(selectedIds, status);
      if (error) { toast.error(error); return; }
      setRowSelection({});
      toast.success(`${count} affare/i contrassegnat${count === 1 ? "o" : "i"} come "${label}"`);
    });
  }

  return (
    <div className="space-y-3">
      {/* Bulk actions toolbar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--crm-neutral-200)] dark:border-white/10 bg-[var(--crm-neutral-50)] dark:bg-white/5 px-4 py-2.5">
          <span className="text-sm font-medium text-[var(--crm-neutral-700)] dark:text-white">
            {selectedIds.length} affare/i selezionat{selectedIds.length === 1 ? "o" : "i"}
          </span>

          <button
            onClick={() => handleBulkStatus("WON")}
            disabled={isBusy}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors"
          >
            {isBulkUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trophy className="h-3.5 w-3.5" />}
            Segna Vinto
          </button>

          <button
            onClick={() => handleBulkStatus("LOST")}
            disabled={isBusy}
            className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors"
          >
            <LostIcon className="h-3.5 w-3.5" />
            Segna Perso
          </button>

          <button
            onClick={() => handleBulkStatus("OPEN")}
            disabled={isBusy}
            className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Riapri
          </button>

          <button
            onClick={handleBulkDelete}
            disabled={isBusy}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 px-3 py-1.5 text-xs font-medium text-white transition-colors"
          >
            {isBulkDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Elimina
          </button>

          <button
            onClick={() => setRowSelection({})}
            className="ml-auto flex items-center gap-1 text-xs text-[var(--crm-neutral-500)] hover:text-[var(--crm-danger)] hover:underline"
          >
            <X className="h-3.5 w-3.5" /> Deseleziona
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e]">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--crm-neutral-100)] dark:border-white/10">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.id !== "select" ? header.column.getToggleSortingHandler() : undefined}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--crm-neutral-500)] cursor-pointer select-none hover:text-[var(--crm-neutral-900)] dark:hover:text-white"
                  >
                    <span className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.id !== "select" && (
                        header.column.getIsSorted() === "asc" ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : header.column.getIsSorted() === "desc" ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center">
                  <p className="text-sm text-[var(--crm-neutral-500)]">Nessun affare trovato con i filtri selezionati</p>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onDealClick?.(row.original)}
                  className="border-b border-[var(--crm-neutral-100)] dark:border-white/10 last:border-0 hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 cursor-pointer transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-[var(--crm-neutral-900)] dark:text-white/80">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <TablePagination table={table} totalLabel="affari" />
    </div>
  );
}
