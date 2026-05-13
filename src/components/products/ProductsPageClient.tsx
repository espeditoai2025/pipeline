"use client";

import { useState } from "react";
import { Package, Plus } from "lucide-react";
import { ProductsTable } from "./ProductsTable";
import { ProductForm } from "./ProductForm";
import { Button } from "@/components/ui/button";
import type { Product } from "@/types/products";

type Props = {
  initialProducts: Product[];
};

export function ProductsPageClient({ initialProducts }: Props) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const activeCount = products.filter((p) => p.isActive).length;

  function handleSaved(saved: Product) {
    setProducts((prev) =>
      editing ? prev.map((p) => p.id === saved.id ? saved : p) : [saved, ...prev]
    );
    setFormOpen(false);
    setEditing(null);
  }

  function handleEdit(p: Product) {
    setEditing(p);
    setFormOpen(true);
  }

  function handleDeleted(id: string) {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  function handleToggled(id: string, isActive: boolean) {
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, isActive } : p));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--crm-primary)]/10">
            <Package className="h-5 w-5 text-[var(--crm-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Prodotti</h1>
            <p className="text-sm text-[var(--crm-neutral-500)]">
              {activeCount} attivi · {products.length} totali
            </p>
          </div>
        </div>

        <Button
          className="bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white"
          onClick={() => { setEditing(null); setFormOpen(true); }}
        >
          <Plus className="h-4 w-4 mr-1.5" /> Nuovo prodotto
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Prodotti totali", value: products.length },
          { label: "Attivi",          value: activeCount },
          { label: "Categorie",       value: new Set(products.map((p) => p.category)).size },
          { label: "Valute",          value: new Set(products.map((p) => p.currency)).size },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] px-4 py-3 text-center">
            <p className="text-2xl font-bold text-[var(--crm-primary)]">{s.value}</p>
            <p className="text-xs text-[var(--crm-neutral-500)] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--crm-neutral-200)] p-12 text-center">
          <Package className="h-8 w-8 text-[var(--crm-neutral-300)] mx-auto mb-3" />
          <p className="text-sm font-medium text-[var(--crm-neutral-500)]">Nessun prodotto nel catalogo</p>
          <p className="text-xs text-[var(--crm-neutral-400)] mt-1">Aggiungi prodotti o servizi per associarli agli affari</p>
          <Button
            size="sm"
            className="mt-4 bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white"
            onClick={() => { setEditing(null); setFormOpen(true); }}
          >
            <Plus className="h-4 w-4 mr-1.5" /> Aggiungi prodotto
          </Button>
        </div>
      ) : (
        <ProductsTable
          products={products}
          onEdit={handleEdit}
          onDeleted={handleDeleted}
          onToggled={handleToggled}
        />
      )}

      <ProductForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        product={editing}
        onSaved={handleSaved}
      />
    </div>
  );
}
