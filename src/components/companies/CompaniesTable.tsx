"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, Pencil, Trash2, Plus, Globe, Users, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteCompany } from "@/server/actions/contacts";
import { CompanyForm } from "./CompanyForm";
import { TablePagination } from "@/components/shared/TablePagination";
import type { Company } from "@/types/contacts";

type Props = {
  initialCompanies: Company[];
};

const col = createColumnHelper<Company>();

export function CompaniesTable({ initialCompanies }: Props) {
  const [companies, setCompanies] = useState(initialCompanies);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const columns = useMemo(() => [
    col.accessor("name", {
      header: ({ column }) => (
        <button className="flex items-center gap-1 hover:text-[var(--crm-primary)]" onClick={() => column.toggleSorting()}>
          Azienda <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-[var(--crm-primary)]/10 text-[var(--crm-primary)] flex items-center justify-center flex-shrink-0">
            <Briefcase className="h-4 w-4" />
          </div>
          <div>
            <a href={`/companies/${row.original.id}`} className="font-medium text-sm hover:text-[var(--crm-primary)] hover:underline">{row.original.name}</a>
            {row.original.address && <p className="text-xs text-[var(--crm-neutral-500)]">{row.original.address}</p>}
          </div>
        </div>
      ),
    }),
    col.accessor("industry", {
      header: "Settore",
      cell: ({ getValue }) => getValue()
        ? <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-[var(--crm-primary)]/10 text-[var(--crm-primary)]">{getValue()}</span>
        : <span className="text-[var(--crm-neutral-400)] text-sm">—</span>,
    }),
    col.accessor("size", {
      header: "Dimensioni",
      cell: ({ getValue }) => getValue()
        ? <span className="text-sm">{getValue()} dipendenti</span>
        : <span className="text-[var(--crm-neutral-400)] text-sm">—</span>,
    }),
    col.accessor("website", {
      header: "Sito web",
      cell: ({ getValue }) => getValue() ? (
        <a href={getValue()!} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-[var(--crm-primary)] hover:underline">
          <Globe className="h-3 w-3" />{getValue()!.replace(/^https?:\/\//, "")}
        </a>
      ) : <span className="text-[var(--crm-neutral-400)] text-sm">—</span>,
    }),
    col.accessor((row) => row._count?.contacts ?? 0, {
      id: "contacts",
      header: ({ column }) => (
        <button className="flex items-center gap-1 hover:text-[var(--crm-primary)]" onClick={() => column.toggleSorting()}>
          <Users className="h-3 w-3" /> Contatti <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ getValue }) => <span className="text-sm">{getValue()}</span>,
    }),
    col.accessor((row) => row._count?.deals ?? 0, {
      id: "deals",
      header: ({ column }) => (
        <button className="flex items-center gap-1 hover:text-[var(--crm-primary)]" onClick={() => column.toggleSorting()}>
          Affari <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ getValue }) => <span className="text-sm">{getValue()}</span>,
    }),
    col.display({
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 justify-end">
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
              if (!confirm(`Eliminare ${row.original.name}?`)) return;
              setDeletingId(row.original.id);
              const res = await deleteCompany(row.original.id);
              setDeletingId(null);
              if (res.error) { toast.error(res.error); return; }
              setCompanies((prev) => prev.filter((c) => c.id !== row.original.id));
              toast.success("Azienda eliminata");
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    }),
  ], [deletingId]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: companies,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Cerca aziende..."
          className="rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] w-full sm:w-64"
        />
        <Button
          size="sm"
          className="bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white"
          onClick={() => { setEditing(null); setFormOpen(true); }}
        >
          <Plus className="h-4 w-4 mr-1.5" /> Nuova azienda
        </Button>
      </div>

      <div className="rounded-xl border border-[var(--crm-neutral-100)] overflow-x-auto bg-white dark:bg-[#1a1a2e]">
        <table className="w-full min-w-[600px]">
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
                <td colSpan={columns.length} className="px-4 py-16 text-center">
                  {globalFilter ? (
                    <div className="space-y-1">
                      <p className="text-sm text-[var(--crm-neutral-500)]">Nessuna azienda corrisponde a &quot;{globalFilter}&quot;</p>
                      <button onClick={() => setGlobalFilter("")} className="text-xs text-[var(--crm-primary)] hover:underline">Cancella ricerca</button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-[var(--crm-neutral-600)]">Nessuna azienda ancora</p>
                      <p className="text-xs text-[var(--crm-neutral-400)]">Aggiungi la tua prima azienda per organizzare i contatti.</p>
                      <Button size="sm" className="mt-2 bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white" onClick={() => { setEditing(null); setFormOpen(true); }}>
                        <Plus className="h-4 w-4 mr-1.5" /> Nuova azienda
                      </Button>
                    </div>
                  )}
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

      <TablePagination table={table} totalLabel="aziende" />

      <CompanyForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        company={editing}
        onSaved={(saved) => {
          setCompanies((prev) =>
            editing ? prev.map((c) => c.id === saved.id ? saved : c) : [saved, ...prev]
          );
        }}
      />
    </div>
  );
}
