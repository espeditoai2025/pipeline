"use client";

import { useState, useMemo, useTransition } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type RowSelectionState,
} from "@tanstack/react-table";
import { ArrowUpDown, Pencil, Trash2, Plus, ArrowRightCircle, Loader2, Mail, Phone, X, Download, Upload, ChevronDown, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { deleteLead, deleteLeads, updateLeadStatus, enrichLead } from "@/server/actions/leads";
import { LeadForm } from "./LeadForm";
import { ConvertLeadModal } from "./ConvertLeadModal";
import { LeadImportModal } from "./LeadImportModal";
import { TablePagination } from "@/components/shared/TablePagination";
import type { Lead, LeadStatus } from "@/types/contacts";

type Props = { initialLeads: Lead[] };

const STATUS_CONFIG: Record<LeadStatus, { label: string; className: string }> = {
  NEW:          { label: "Nuovo",           className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  WORKING:      { label: "In lavorazione",  className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  NURTURING:    { label: "Nurturing",       className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  CONVERTED:    { label: "Convertito",      className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  DISQUALIFIED: { label: "Non qualificato", className: "bg-[var(--crm-neutral-100)] text-[var(--crm-neutral-500)]" },
};

const SOURCES = ["Website", "LinkedIn", "Referral", "Evento", "Email Marketing", "Ads", "Cold Call", "Altro"];

const col = createColumnHelper<Lead>();

export function LeadsTable({ initialLeads }: Props) {
  const [leads, setLeads] = useState(initialLeads);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "">("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [converting, setConverting] = useState<Lead | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isBulkDeleting, startBulkDelete] = useTransition();
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState<{ done: number; total: number; found: number } | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const filteredLeads = useMemo(() =>
    leads.filter((l) =>
      (!statusFilter || l.status === statusFilter) &&
      (!sourceFilter || l.source === sourceFilter)
    ),
    [leads, statusFilter, sourceFilter]
  );

  async function handleStatusChange(id: string, status: LeadStatus) {
    setUpdatingStatusId(id);
    const res = await updateLeadStatus(id, status);
    setUpdatingStatusId(null);
    if (res.error) { toast.error(res.error); return; }
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status } : l));
  }

  const columns = useMemo(() => [
    col.display({
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
          aria-label="Seleziona"
        />
      ),
    }),
    col.accessor("title", {
      header: ({ column }) => (
        <button className="flex items-center gap-1 hover:text-[var(--crm-primary)]" onClick={() => column.toggleSorting()}>
          Titolo <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => (
        <a href={`/leads/${row.original.id}`} className="font-medium text-sm hover:text-[var(--crm-primary)] hover:underline">
          {row.original.title}
        </a>
      ),
    }),
    col.accessor("email", {
      header: () => <span className="flex items-center gap-1"><Mail className="h-3 w-3" />Email</span>,
      cell: ({ getValue }) => {
        const v = getValue();
        return v
          ? <a href={`mailto:${v}`} className="text-xs text-[var(--crm-primary)] hover:underline truncate max-w-[160px] block" title={v}>{v}</a>
          : <span className="text-[var(--crm-neutral-400)] text-sm">—</span>;
      },
    }),
    col.accessor("phone", {
      header: () => <span className="flex items-center gap-1"><Phone className="h-3 w-3" />Telefono</span>,
      cell: ({ getValue }) => {
        const v = getValue();
        return v
          ? <a href={`tel:${v}`} className="text-xs text-[var(--crm-neutral-700)] dark:text-white hover:underline">{v}</a>
          : <span className="text-[var(--crm-neutral-400)] text-sm">—</span>;
      },
    }),
    col.accessor("source", {
      header: "Sorgente",
      cell: ({ getValue }) => getValue()
        ? <span className="text-xs rounded-full bg-[var(--crm-neutral-100)] px-2 py-0.5">{getValue()}</span>
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
      cell: ({ row }) => {
        const id = row.original.id;
        const status = row.original.status;
        return (
          <div className="relative">
            {updatingStatusId === id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--crm-neutral-400)]" />
            ) : (
              <select
                value={status}
                onChange={(e) => handleStatusChange(id, e.target.value as LeadStatus)}
                className={`text-xs font-medium rounded-full px-2 py-0.5 border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--crm-primary)] ${STATUS_CONFIG[status].className}`}
              >
                {Object.entries(STATUS_CONFIG).map(([v, { label }]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
            )}
          </div>
        );
      },
    }),
    col.display({
      id: "owner",
      header: "Responsabile",
      cell: ({ row }) => {
        const owner = row.original.owner;
        if (!owner) return <span className="text-xs text-[var(--crm-neutral-400)]">—</span>;
        return (
          <div className="flex items-center gap-1.5">
            <div className="h-5 w-5 rounded-full bg-[var(--crm-primary)]/10 flex items-center justify-center text-[9px] font-bold text-[var(--crm-primary)] flex-shrink-0">
              {(owner.name ?? owner.email).charAt(0).toUpperCase()}
            </div>
            <span className="text-xs truncate max-w-[80px]">{owner.name ?? owner.email}</span>
          </div>
        );
      },
    }),
    col.accessor("createdAt", {
      header: ({ column }) => (
        <button className="flex items-center gap-1 hover:text-[var(--crm-primary)]" onClick={() => column.toggleSorting()}>
          Data <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ getValue }) => <span className="text-xs text-[var(--crm-neutral-500)]">{new Date(getValue()).toLocaleDateString("it-IT")}</span>,
    }),
    col.display({
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end">
          {row.original.status !== "CONVERTED" && (
            <button
              title="Converti"
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
              if (!confirm(`Eliminare "${row.original.title}"?`)) return;
              setDeletingId(row.original.id);
              const res = await deleteLead(row.original.id);
              setDeletingId(null);
              if (res.error) { toast.error(res.error); return; }
              setLeads((prev) => prev.filter((l) => l.id !== row.original.id));
              toast.success("Lead eliminato");
            }}
          >
            {deletingId === row.original.id
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      ),
    }),
  ], [deletingId, updatingStatusId]);

  const table = useReactTable({
    data: filteredLeads,
    columns,
    state: { sorting, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
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

  async function handleBulkEnrich() {
    if (isEnriching) return;
    const ids = [...selectedIds];
    setIsEnriching(true);
    setEnrichProgress({ done: 0, total: ids.length, found: 0 });
    let found = 0;
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i]!;
      const result = await enrichLead(id);
      if (!result.error && (result.email || result.phone)) {
        found++;
        setLeads((prev) => prev.map((l) => l.id === id ? {
          ...l,
          email: result.email ?? l.email,
          phone: result.phone ?? l.phone,
        } : l));
      }
      setEnrichProgress({ done: i + 1, total: ids.length, found });
    }
    setIsEnriching(false);
    setEnrichProgress(null);
    setRowSelection({});
    toast.success(`Aggiornamento completato: ${found}/${ids.length} lead arricchit${found === 1 ? "o" : "i"}`);
  }

  function handleBulkDelete() {
    if (!confirm(`Eliminare definitivamente ${selectedIds.length} lead selezionati? L'operazione non è reversibile.`)) return;
    startBulkDelete(async () => {
      const { count, error } = await deleteLeads(selectedIds);
      if (error) { toast.error(error); return; }
      setLeads((prev) => prev.filter((l) => !selectedIds.includes(l.id)));
      setRowSelection({});
      toast.success(`${count} lead eliminat${count === 1 ? "o" : "i"}`);
    });
  }

  function exportLeads(format: "csv" | "xlsx") {
    const toExport = selectedIds.length > 0
      ? filteredLeads.filter((l) => selectedIds.includes(l.id))
      : table.getFilteredRowModel().rows.map((r) => r.original);

    const rows = toExport.map((l) => ({
      "Nome": l.title,
      "Email": l.email ?? "",
      "Telefono": l.phone ?? "",
      "Sorgente": l.source ?? "",
      "Stato": STATUS_CONFIG[l.status]?.label ?? l.status,
      "Score": l.score,
      "Note": l.notes ?? "",
      "Settore": (l.data as Record<string, unknown>)?.sector ?? "",
      "Località": (l.data as Record<string, unknown>)?.location ?? "",
      "Sito Web": (l.data as Record<string, unknown>)?.website ?? "",
      "P.IVA": (l.data as Record<string, unknown>)?.piva ?? "",
      "ATECO": (l.data as Record<string, unknown>)?.ateco ?? "",
      "Dipendenti": (l.data as Record<string, unknown>)?.nDipendenti ?? "",
      "Forma Giuridica": (l.data as Record<string, unknown>)?.formaGiuridica ?? "",
      "Anno Fondazione": (l.data as Record<string, unknown>)?.annoFondazione ?? "",
      "Data Creazione": new Date(l.createdAt).toLocaleDateString("it-IT"),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lead");
    XLSX.writeFile(wb, format === "csv" ? "lead.csv" : "lead.xlsx", { bookType: format });
    setExportMenuOpen(false);
    toast.success(`${rows.length} lead esportati`);
  }

  const activeFilters = [statusFilter, sourceFilter].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Bulk action toolbar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--crm-neutral-200)] dark:border-white/10 bg-[var(--crm-neutral-50)] dark:bg-white/5 px-4 py-2.5">
          <span className="text-sm font-medium text-[var(--crm-neutral-700)] dark:text-white">
            {selectedIds.length} lead selezionat{selectedIds.length === 1 ? "o" : "i"}
          </span>

          {/* Aggiorna info bulk */}
          <button
            onClick={handleBulkEnrich}
            disabled={isEnriching || isBulkDeleting}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--crm-primary)]/30 bg-[var(--crm-primary)]/10 hover:bg-[var(--crm-primary)]/20 disabled:opacity-50 px-3 py-1.5 text-xs font-medium text-[var(--crm-primary)] transition-colors"
          >
            {isEnriching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {enrichProgress
              ? `${enrichProgress.done}/${enrichProgress.total} — ${enrichProgress.found} trovati`
              : "Aggiorna info"}
          </button>

          {/* Elimina */}
          <button
            onClick={handleBulkDelete}
            disabled={isBulkDeleting || isEnriching}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 px-3 py-1.5 text-xs font-medium text-white transition-colors"
          >
            {isBulkDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Elimina selezionati
          </button>

          <button
            onClick={() => setRowSelection({})}
            disabled={isEnriching}
            className="ml-auto flex items-center gap-1 text-xs text-[var(--crm-neutral-500)] hover:text-[var(--crm-danger)] hover:underline disabled:opacity-40"
          >
            <X className="h-3.5 w-3.5" /> Deseleziona
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap items-center">
          <input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Cerca lead..."
            className="rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] w-48"
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
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)]"
          >
            <option value="">Tutte le sorgenti</option>
            {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {activeFilters > 0 && (
            <button
              onClick={() => { setStatusFilter(""); setSourceFilter(""); setGlobalFilter(""); }}
              className="text-xs text-[var(--crm-neutral-500)] hover:text-[var(--crm-danger)] underline"
            >
              Rimuovi filtri ({activeFilters})
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Import */}
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--crm-neutral-200)] dark:border-white/10 px-3 py-2 text-sm font-medium hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 transition-colors"
          >
            <Upload className="h-3.5 w-3.5" /> Importa
          </button>

          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--crm-neutral-200)] dark:border-white/10 px-3 py-2 text-sm font-medium hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Esporta
              {selectedIds.length > 0 && <span className="rounded-full bg-[var(--crm-primary)]/10 text-[var(--crm-primary)] px-1.5 text-xs font-semibold">{selectedIds.length}</span>}
              <ChevronDown className="h-3.5 w-3.5 text-[var(--crm-neutral-400)]" />
            </button>
            {exportMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setExportMenuOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] shadow-lg overflow-hidden">
                  <button
                    onClick={() => exportLeads("csv")}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5 text-[var(--crm-neutral-500)]" /> Esporta CSV
                  </button>
                  <button
                    onClick={() => exportLeads("xlsx")}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 transition-colors border-t border-[var(--crm-neutral-100)] dark:border-white/10"
                  >
                    <Download className="h-3.5 w-3.5 text-emerald-500" /> Esporta XLSX
                  </button>
                </div>
              </>
            )}
          </div>

          <Button
            size="sm"
            className="bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white"
            onClick={() => { setEditing(null); setFormOpen(true); }}
          >
            <Plus className="h-4 w-4 mr-1.5" /> Nuovo lead
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--crm-neutral-100)] overflow-hidden bg-white dark:bg-[#1a1a2e]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
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
                    {globalFilter || statusFilter || sourceFilter ? (
                      <div className="space-y-1">
                        <p className="text-sm text-[var(--crm-neutral-500)]">Nessun lead trovato con i filtri attivi</p>
                        <button onClick={() => { setGlobalFilter(""); setStatusFilter(""); setSourceFilter(""); }} className="text-xs text-[var(--crm-primary)] hover:underline">Rimuovi tutti i filtri</button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-[var(--crm-neutral-600)]">Nessun lead ancora</p>
                        <p className="text-xs text-[var(--crm-neutral-400)]">Crea o importa i tuoi primi lead per iniziare la pipeline.</p>
                        <div className="flex items-center justify-center gap-2 mt-2">
                          <Button size="sm" className="bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white" onClick={() => { setEditing(null); setFormOpen(true); }}>
                            <Plus className="h-4 w-4 mr-1.5" /> Nuovo lead
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
                            <Upload className="h-4 w-4 mr-1.5" /> Importa
                          </Button>
                        </div>
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
      </div>

      <TablePagination table={table} totalLabel="lead" />

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

      <LeadImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => { setImportOpen(false); window.location.reload(); }}
      />
    </div>
  );
}
