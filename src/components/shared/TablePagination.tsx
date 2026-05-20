"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { Table } from "@tanstack/react-table";

type Props<T> = {
  table: Table<T>;
  totalLabel?: string;
};

export function TablePagination<T>({ table, totalLabel = "risultati" }: Props<T>) {
  const pageCount = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex;
  const totalRows = table.getFilteredRowModel().rows.length;

  if (totalRows <= table.getState().pagination.pageSize) {
    return (
      <p className="text-xs text-[var(--crm-neutral-500)]">
        {totalRows} {totalLabel}
      </p>
    );
  }

  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <p className="text-xs text-[var(--crm-neutral-500)]">
        {totalRows} {totalLabel} — Pagina {currentPage + 1} di {pageCount}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
          className="p-1.5 rounded-md border border-[var(--crm-neutral-200)] text-[var(--crm-neutral-500)] hover:bg-[var(--crm-neutral-50)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="p-1.5 rounded-md border border-[var(--crm-neutral-200)] text-[var(--crm-neutral-500)] hover:bg-[var(--crm-neutral-50)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="px-2 text-xs font-medium text-[var(--crm-neutral-700)]">
          {currentPage + 1} / {pageCount}
        </span>
        <button
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="p-1.5 rounded-md border border-[var(--crm-neutral-200)] text-[var(--crm-neutral-500)] hover:bg-[var(--crm-neutral-50)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => table.setPageIndex(pageCount - 1)}
          disabled={!table.getCanNextPage()}
          className="p-1.5 rounded-md border border-[var(--crm-neutral-200)] text-[var(--crm-neutral-500)] hover:bg-[var(--crm-neutral-50)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
