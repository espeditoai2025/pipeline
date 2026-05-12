"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { addProductToDeal, removeProductFromDeal, getDealProducts } from "@/server/actions/products";
import { MOCK_PRODUCTS } from "@/lib/mock-products";
import type { DealProduct } from "@/types/products";

const inputCls = "rounded-lg border border-[var(--crm-neutral-100)] px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--crm-primary)]";

function formatPrice(n: number, currency: string) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(n);
}

type Props = { dealId: string };

export function DealProductsManager({ dealId }: Props) {
  const [rows, setRows] = useState<DealProduct[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedProductId, setSelectedProductId] = useState("");
  const [qty, setQty] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [note, setNote] = useState("");

  useEffect(() => {
    getDealProducts(dealId).then((r) => { if (r.data) setRows(r.data); });
  }, [dealId]);

  const selectedProduct = MOCK_PRODUCTS.find((p) => p.id === selectedProductId);
  const activeProducts = MOCK_PRODUCTS.filter((p) => p.isActive);

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  const grandSubtotal = rows.reduce((s, r) => s + r.subtotal, 0);
  const grandTax = grandTotal - grandSubtotal;

  async function handleAdd() {
    if (!selectedProductId || qty < 1) {
      toast.error("Seleziona un prodotto e una quantità valida");
      return;
    }
    setSaving(true);
    const product = MOCK_PRODUCTS.find((p) => p.id === selectedProductId)!;
    const res = await addProductToDeal({
      dealId,
      productId: selectedProductId,
      quantity: qty,
      unitPrice: product.unitPrice,
      discount,
      taxRate: product.taxRate,
      currency: product.currency,
      note: note || undefined,
    });
    setSaving(false);
    if (res.error) { toast.error(res.error); return; }
    setRows((prev) => [...prev, res.data!]);
    toast.success("Prodotto aggiunto");
    setAddOpen(false);
    setSelectedProductId("");
    setQty(1);
    setDiscount(0);
    setNote("");
  }

  async function handleRemove(id: string) {
    const res = await removeProductFromDeal(id);
    if (res.error) { toast.error(res.error); return; }
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast.success("Prodotto rimosso");
  }

  const previewSubtotal = selectedProduct
    ? selectedProduct.unitPrice * qty * (1 - discount / 100)
    : 0;
  const previewTotal = selectedProduct
    ? previewSubtotal * (1 + selectedProduct.taxRate / 100)
    : 0;

  return (
    <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-[var(--crm-primary)]" />
          Prodotti ({rows.length})
          {rows.length > 0 && (
            <span className="text-xs text-[var(--crm-neutral-500)] font-normal">
              · Totale: {formatPrice(grandTotal, "EUR")}
            </span>
          )}
        </div>
        {expanded ? <ChevronDown className="h-4 w-4 text-[var(--crm-neutral-400)]" /> : <ChevronRight className="h-4 w-4 text-[var(--crm-neutral-400)]" />}
      </button>

      {expanded && (
        <div className="border-t border-[var(--crm-neutral-100)]">
          {/* Product rows */}
          {rows.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-[var(--crm-neutral-50)] dark:bg-white/5">
                <tr>
                  <th className="px-4 py-2 text-left text-xs text-[var(--crm-neutral-500)] font-medium">Prodotto</th>
                  <th className="px-2 py-2 text-right text-xs text-[var(--crm-neutral-500)] font-medium">Qtà</th>
                  <th className="px-2 py-2 text-right text-xs text-[var(--crm-neutral-500)] font-medium">Prezzo unit.</th>
                  <th className="px-2 py-2 text-right text-xs text-[var(--crm-neutral-500)] font-medium">Sconto</th>
                  <th className="px-2 py-2 text-right text-xs text-[var(--crm-neutral-500)] font-medium">Subtotale</th>
                  <th className="px-2 py-2 text-right text-xs text-[var(--crm-neutral-500)] font-medium">Totale (IVA inc.)</th>
                  <th className="px-2 py-2 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--crm-neutral-100)]">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5">
                    <td className="px-4 py-2">
                      <p className="font-medium">{row.product.name}</p>
                      <p className="text-xs text-[var(--crm-neutral-500)]">{row.product.code}{row.note ? ` · ${row.note}` : ""}</p>
                    </td>
                    <td className="px-2 py-2 text-right">{row.quantity} {row.product.unit}</td>
                    <td className="px-2 py-2 text-right">{formatPrice(row.unitPrice, row.currency)}</td>
                    <td className="px-2 py-2 text-right">{row.discount > 0 ? `${row.discount}%` : "—"}</td>
                    <td className="px-2 py-2 text-right">{formatPrice(row.subtotal, row.currency)}</td>
                    <td className="px-2 py-2 text-right font-semibold">{formatPrice(row.total, row.currency)}</td>
                    <td className="px-2 py-2">
                      <button
                        className="p-1 rounded hover:bg-red-50 text-[var(--crm-neutral-400)] hover:text-[var(--crm-danger)]"
                        onClick={() => handleRemove(row.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-[var(--crm-neutral-100)] bg-[var(--crm-neutral-50)] dark:bg-white/5">
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-xs text-[var(--crm-neutral-500)]">
                    Imponibile: {formatPrice(grandSubtotal, "EUR")} · IVA: {formatPrice(grandTax, "EUR")}
                  </td>
                  <td colSpan={2} className="px-2 py-2 text-right font-bold text-sm">
                    {formatPrice(grandTotal, "EUR")}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          ) : (
            <div className="px-4 py-6 text-center text-sm text-[var(--crm-neutral-400)]">
              Nessun prodotto aggiunto all&apos;affare
            </div>
          )}

          {/* Add product panel */}
          {addOpen ? (
            <div className="border-t border-[var(--crm-neutral-100)] px-4 py-3 space-y-3">
              <p className="text-xs font-semibold text-[var(--crm-neutral-600)]">Aggiungi prodotto</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs text-[var(--crm-neutral-500)] mb-1">Prodotto *</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className={`${inputCls} w-full`}
                  >
                    <option value="">Seleziona prodotto...</option>
                    {activeProducts.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.code}) — {formatPrice(p.unitPrice, p.currency)}/{p.unit}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-[var(--crm-neutral-500)] mb-1">Quantità</label>
                  <input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} className={`${inputCls} w-full`} />
                </div>

                <div>
                  <label className="block text-xs text-[var(--crm-neutral-500)] mb-1">Sconto %</label>
                  <input type="number" min={0} max={100} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className={`${inputCls} w-full`} />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs text-[var(--crm-neutral-500)] mb-1">Note</label>
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note opzionali..." className={`${inputCls} w-full`} />
                </div>
              </div>

              {selectedProduct && (
                <div className="rounded-lg bg-[var(--crm-primary)]/5 border border-[var(--crm-primary)]/20 px-3 py-2 text-xs space-y-0.5">
                  <p>Imponibile: <span className="font-semibold">{formatPrice(previewSubtotal, selectedProduct.currency)}</span></p>
                  <p>Totale (IVA {selectedProduct.taxRate}%): <span className="font-bold">{formatPrice(previewTotal, selectedProduct.currency)}</span></p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  className="flex-1 rounded-lg border border-[var(--crm-neutral-100)] px-3 py-1.5 text-sm hover:bg-[var(--crm-neutral-50)] transition-colors"
                  onClick={() => { setAddOpen(false); setSelectedProductId(""); setQty(1); setDiscount(0); setNote(""); }}
                >
                  Annulla
                </button>
                <button
                  disabled={saving || !selectedProductId}
                  className="flex-1 rounded-lg bg-[var(--crm-primary)] text-white px-3 py-1.5 text-sm hover:bg-[var(--crm-primary-dark)] disabled:opacity-50 transition-colors"
                  onClick={handleAdd}
                >
                  {saving ? "..." : "Aggiungi"}
                </button>
              </div>
            </div>
          ) : (
            <div className="border-t border-[var(--crm-neutral-100)] px-4 py-2">
              <button
                className="flex items-center gap-1.5 text-xs text-[var(--crm-primary)] hover:text-[var(--crm-primary-dark)] font-medium transition-colors"
                onClick={() => setAddOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" /> Aggiungi prodotto
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
