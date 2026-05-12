"use client";

import { useState, useMemo } from "react";
import { createColumnHelper, useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, flexRender, type SortingState } from "@tanstack/react-table";
import { ArrowUpDown, Pencil, Trash2, ToggleLeft, ToggleRight, Package } from "lucide-react";
import { toast } from "sonner";
import { deleteProduct, toggleProductActive } from "@/server/actions/products";
import type { Product, ProductCategory } from "@/types/products";

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  SOFTWARE: "Software", HARDWARE: "Hardware", SERVICE: "Servizio",
  SUPPORT: "Supporto", LICENSE: "Licenza", OTHER: "Altro",
};

const CATEGORY_COLORS: Record<ProductCategory, string> = {
  SOFTWARE: "bg-blue-100 text-blue-700",
  HARDWARE: "bg-orange-100 text-orange-700",
  SERVICE:  "bg-purple-100 text-purple-700",
  SUPPORT:  "bg-yellow-100 text-yellow-700",
  LICENSE:  "bg-green-100 text-green-700",
  OTHER:    "bg-gray-100 text-gray-600",
};

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(price);
}

const helper = createColumnHelper<Product>();

type Props = {
  products: Product[];
  onEdit: (p: Product) => void;
  onDeleted: (id: string) => void;
  onToggled: (id: string, isActive: boolean) => void;
};

export function ProductsTable({ products, onEdit, onDeleted, onToggled }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo(() => [
    helper.accessor("name", {
      header: ({ column }) => (
        <button className="flex items-center gap-1 hover:text-[var(--crm-primary)]" onClick={() => column.toggleSorting()}>
          Prodotto <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.name}</p>
          <p className="text-xs text-[var(--crm-neutral-500)]">{row.original.code}</p>
        </div>
      ),
    }),
    helper.accessor("category", {
      header: "Categoria",
      cell: ({ getValue }) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[getValue()]}`}>
          {CATEGORY_LABELS[getValue()]}
        </span>
      ),
    }),
    helper.accessor("unitPrice", {
      header: ({ column }) => (
        <button className="flex items-center gap-1 hover:text-[var(--crm-primary)]" onClick={() => column.toggleSorting()}>
          Prezzo <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-sm font-medium">
          {formatPrice(row.original.unitPrice, row.original.currency)}
          <span className="text-[var(--crm-neutral-400)] font-normal"> / {row.original.unit}</span>
        </span>
      ),
    }),
    helper.accessor("taxRate", {
      header: "IVA",
      cell: ({ getValue }) => <span className="text-sm">{getValue()}%</span>,
    }),
    helper.accessor("isActive", {
      header: "Stato",
      cell: ({ row }) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${row.original.isActive ? "bg-green-100 text-green-700" : "bg-[var(--crm-neutral-100)] text-[var(--crm-neutral-500)]"}`}>
          {row.original.isActive ? "Attivo" : "Inattivo"}
        </span>
      ),
    }),
    helper.display({
      id: "actions",
      cell: ({ row }) => <RowActions product={row.original} onEdit={onEdit} onDeleted={onDeleted} onToggled={onToggled} />,
    }),
  ], [onEdit, onDeleted, onToggled]);

  const table = useReactTable({
    data: products,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-3">
      <input
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        placeholder="Cerca prodotto o codice..."
        className="w-full max-w-xs rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)]"
      />

      <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--crm-neutral-100)] bg-[var(--crm-neutral-50)] dark:bg-white/5">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-4 py-3 text-left text-xs font-medium text-[var(--crm-neutral-500)] whitespace-nowrap">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-[var(--crm-neutral-100)]">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-[var(--crm-neutral-400)]">
                  <Package className="h-8 w-8 mx-auto mb-2 text-[var(--crm-neutral-300)]" />
                  Nessun prodotto trovato
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 transition-colors">
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

      <p className="text-xs text-[var(--crm-neutral-500)]">{table.getFilteredRowModel().rows.length} prodotti</p>
    </div>
  );
}

function RowActions({ product, onEdit, onDeleted, onToggled }: {
  product: Product;
  onEdit: (p: Product) => void;
  onDeleted: (id: string) => void;
  onToggled: (id: string, isActive: boolean) => void;
}) {
  async function handleToggle() {
    const res = await toggleProductActive(product.id, !product.isActive);
    if (res.error) { toast.error(res.error); return; }
    onToggled(product.id, !product.isActive);
    toast.success(product.isActive ? "Prodotto disattivato" : "Prodotto attivato");
  }

  async function handleDelete() {
    if (!confirm(`Eliminare "${product.name}"?`)) return;
    const res = await deleteProduct(product.id);
    if (res.error) { toast.error(res.error); return; }
    onDeleted(product.id);
    toast.success("Prodotto eliminato");
  }

  return (
    <div className="flex items-center gap-1">
      <button
        title={product.isActive ? "Disattiva" : "Attiva"}
        className="p-1.5 rounded hover:bg-[var(--crm-neutral-100)] text-[var(--crm-neutral-500)]"
        onClick={handleToggle}
      >
        {product.isActive
          ? <ToggleRight className="h-4 w-4 text-[var(--crm-success)]" />
          : <ToggleLeft className="h-4 w-4" />}
      </button>
      <button
        className="p-1.5 rounded hover:bg-[var(--crm-neutral-100)] text-[var(--crm-neutral-500)]"
        onClick={() => onEdit(product)}
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        className="p-1.5 rounded hover:bg-red-50 text-[var(--crm-neutral-500)] hover:text-[var(--crm-danger)]"
        onClick={handleDelete}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
