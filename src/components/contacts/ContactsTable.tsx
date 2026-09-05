"use client";

import { useState, useMemo, useCallback } from "react";
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
import { ArrowUpDown, Pencil, Trash2, Plus, Upload, Building2, Mail, Phone, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteContact, getContacts } from "@/server/actions/contacts";
import { ContactForm } from "./ContactForm";
import { ImportCSVModal } from "./ImportCSVModal";
import { MergeDuplicatesModal } from "./MergeDuplicatesModal";
import { TablePagination } from "@/components/shared/TablePagination";
import type { Contact, Company, DuplicateGroup } from "@/types/contacts";

type Props = {
  initialContacts: Contact[];
  companies: Company[];
};

function findDuplicates(contacts: Contact[]): DuplicateGroup[] {
  const emailGroups = new Map<string, Contact[]>();
  for (const c of contacts) {
    if (!c.email) continue;
    const key = c.email.trim().toLowerCase();
    if (!key) continue;
    if (!emailGroups.has(key)) emailGroups.set(key, []);
    emailGroups.get(key)!.push(c);
  }
  return Array.from(emailGroups.entries())
    .filter(([, g]) => g.length > 1)
    .map(([key, contacts]) => ({ key, contacts }));
}

const col = createColumnHelper<Contact>();

export function ContactsTable({ initialContacts, companies }: Props) {
  const [contacts, setContacts] = useState(initialContacts);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [mergeOpen, setMergeOpen] = useState(false);

  const duplicates = useMemo(() => findDuplicates(contacts), [contacts]);

  const refreshContacts = useCallback(async () => {
    const fresh = await getContacts();
    setContacts(fresh);
  }, []);

  const columns = useMemo(() => [
    col.accessor((row) => `${row.firstName} ${row.lastName ?? ""}`, {
      id: "name",
      header: ({ column }) => (
        <button className="flex items-center gap-1 hover:text-[var(--crm-primary)]" onClick={() => column.toggleSorting()}>
          Nome <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-[var(--crm-primary)] text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
            {row.original.firstName[0]}{row.original.lastName?.[0] ?? ""}
          </div>
          <div>
            <a href={`/contacts/${row.original.id}`} className="font-medium text-sm hover:text-[var(--crm-primary)] hover:underline">
              {row.original.firstName} {row.original.lastName}
            </a>
            {row.original.jobTitle && <p className="text-xs text-[var(--crm-neutral-500)]">{row.original.jobTitle}</p>}
          </div>
        </div>
      ),
    }),
    col.accessor("email", {
      header: "Email",
      cell: ({ getValue }) => getValue() ? (
        <a href={`mailto:${getValue()}`} className="flex items-center gap-1 text-sm text-[var(--crm-primary)] hover:underline">
          <Mail className="h-3 w-3" />{getValue()}
        </a>
      ) : <span className="text-[var(--crm-neutral-400)] text-sm">—</span>,
    }),
    col.accessor("phone", {
      header: "Telefono",
      cell: ({ getValue }) => getValue() ? (
        <span className="flex items-center gap-1 text-sm">
          <Phone className="h-3 w-3 text-[var(--crm-neutral-400)]" />{getValue()}
        </span>
      ) : <span className="text-[var(--crm-neutral-400)] text-sm">—</span>,
    }),
    col.accessor("company", {
      header: "Azienda",
      cell: ({ getValue }) => {
        const c = getValue();
        return c ? (
          <span className="flex items-center gap-1 text-sm">
            <Building2 className="h-3 w-3 text-[var(--crm-neutral-400)]" />{c.name}
          </span>
        ) : <span className="text-[var(--crm-neutral-400)] text-sm">—</span>;
      },
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
              if (!confirm(`Eliminare ${row.original.firstName} ${row.original.lastName ?? ""}?`)) return;
              setDeletingId(row.original.id);
              const res = await deleteContact(row.original.id);
              setDeletingId(null);
              if (res.error) { toast.error(res.error); return; }
              setContacts((prev) => prev.filter((c) => c.id !== row.original.id));
              toast.success("Contatto eliminato");
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
    data: contacts,
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
      {duplicates.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 p-4">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
          <div className="text-sm flex-1">
            <p className="font-medium text-yellow-800 dark:text-yellow-400">
              {duplicates.length} {duplicates.length === 1 ? "duplicato rilevato" : "duplicati rilevati"}
            </p>
            <p className="text-yellow-700 dark:text-yellow-500 text-xs mt-0.5">
              {duplicates.map((d) => d.key).join(", ")}
            </p>
          </div>
          <button
            onClick={() => setMergeOpen(true)}
            className="flex-shrink-0 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 text-xs font-medium transition-colors"
          >
            Unisci duplicati
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Cerca contatti..."
          className="rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] w-full sm:w-64"
        />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-1.5" /> Importa CSV
          </Button>
          <Button
            size="sm"
            className="bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white"
            onClick={() => { setEditing(null); setFormOpen(true); }}
          >
            <Plus className="h-4 w-4 mr-1.5" /> Nuovo contatto
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--crm-neutral-100)] overflow-x-auto bg-white dark:bg-[#1a1a2e]">
        <table className="w-full min-w-[640px]">
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
                      <p className="text-sm text-[var(--crm-neutral-500)]">Nessun contatto corrisponde a &quot;{globalFilter}&quot;</p>
                      <button onClick={() => setGlobalFilter("")} className="text-xs text-[var(--crm-primary)] hover:underline">Cancella ricerca</button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-[var(--crm-neutral-600)]">Nessun contatto ancora</p>
                      <p className="text-xs text-[var(--crm-neutral-400)]">Crea il tuo primo contatto per iniziare a gestire le relazioni.</p>
                      <Button size="sm" className="mt-2 bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white" onClick={() => { setEditing(null); setFormOpen(true); }}>
                        <Plus className="h-4 w-4 mr-1.5" /> Nuovo contatto
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

      <TablePagination table={table} totalLabel="contatti" />

      <ContactForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        contact={editing}
        companies={companies}
        onSaved={(saved) => {
          setContacts((prev) =>
            editing ? prev.map((c) => c.id === saved.id ? saved : c) : [saved, ...prev]
          );
        }}
      />

      <ImportCSVModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={refreshContacts}
      />

      {mergeOpen && <MergeDuplicatesModal
        open={mergeOpen}
        onClose={() => setMergeOpen(false)}
        duplicates={duplicates}
        onMerged={refreshContacts}
      />}
    </div>
  );
}
