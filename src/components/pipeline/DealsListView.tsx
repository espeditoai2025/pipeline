"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import { ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";
import type { Deal } from "@/types/deals";

const helper = createColumnHelper<Deal>();

function formatEur(v: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}
function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("it-IT");
}

const columns = [
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

type Props = { deals: Deal[]; onDealClick?: (deal: Deal) => void };

export function DealsListView({ deals, onDealClick }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data: deals,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e]">
      <table className="w-full text-sm">
        <thead className="border-b border-[var(--crm-neutral-100)] dark:border-white/10">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--crm-neutral-500)] cursor-pointer select-none hover:text-[var(--crm-neutral-900)] dark:hover:text-white"
                >
                  <span className="flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === "asc" ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : header.column.getIsSorted() === "desc" ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
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
          ))}
        </tbody>
      </table>

      {deals.length === 0 && (
        <div className="py-12 text-center text-sm text-[var(--crm-neutral-500)]">
          Nessun affare trovato con i filtri selezionati
        </div>
      )}
    </div>
  );
}
