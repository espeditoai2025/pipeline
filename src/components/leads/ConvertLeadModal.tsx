/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState, useEffect } from "react";
import { ArrowRightCircle, Loader2, UserPlus, Building2, ChevronDown, Package } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetBody, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { convertLead } from "@/server/actions/leads";
import { getProducts } from "@/server/actions/products";
import type { Lead } from "@/types/contacts";
import type { Product } from "@/types/products";

type Props = {
  open: boolean;
  onClose: () => void;
  lead: Lead | null;
  onConverted: (leadId: string, dealId: string) => void;
};

const inputCls = "w-full rounded-lg border border-[var(--crm-neutral-200)] bg-white dark:bg-white/5 px-3 py-2.5 text-sm text-[var(--crm-neutral-900)] dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] focus:border-transparent transition-colors";

export function ConvertLeadModal({ open, onClose, lead, onConverted }: Props) {
  const [dealTitle, setDealTitle] = useState("");
  const [dealValue, setDealValue] = useState(0);
  const [createContact, setCreateContact] = useState(false);
  const [contactFirstName, setContactFirstName] = useState("");
  const [contactLastName, setContactLastName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [createCompany, setCreateCompany] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companySector, setCompanySector] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [addProduct, setAddProduct] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [productQuantity, setProductQuantity] = useState(1);
  const [productUnitPrice, setProductUnitPrice] = useState<number | "">("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    getProducts().then((list) => setProducts(list)).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!lead) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setDealTitle(lead.title);
    setDealValue(0);
    setCreateContact(!lead.contactId);
    // Pre-fill contact from lead data
    const d = (lead.data ?? {}) as Record<string, string>;
    const nameParts = (d.contactName ?? lead.title).split(" ");
    setContactFirstName(nameParts[0] ?? "");
    setContactLastName(nameParts.slice(1).join(" "));
    setContactEmail(lead.email ?? "");
    setContactPhone(lead.phone ?? "");
    /* eslint-enable react-hooks/set-state-in-effect */
    // Pre-fill company from lead data (Lead Finder candidates store these)
    const hasCompanyData = !!(d.companyName ?? d.website ?? d.sector);
    setCreateCompany(hasCompanyData);
    setCompanyName(d.companyName ?? lead.title);
    setCompanyWebsite(d.website ?? "");
    setCompanySector(d.sector ?? "");
    setCompanySize(d.companySize ?? "");
  }, [lead]);

  if (!lead) return null;

  const scoreColor = lead.score >= 70 ? "var(--crm-success)" : lead.score >= 40 ? "var(--crm-warning)" : "var(--crm-danger)";

  async function handleConvert() {
    if (!lead || !dealTitle.trim()) return;
    setLoading(true);
    const res = await convertLead(lead.id, {
      dealTitle: dealTitle.trim(),
      dealValue,
      currency: "EUR",
      createContact: createContact && !lead.contactId,
      contactFirstName: contactFirstName.trim(),
      contactLastName: contactLastName.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      createCompany,
      companyName: companyName.trim(),
      companyWebsite: companyWebsite.trim(),
      companySector: companySector.trim(),
      companySize: companySize.trim(),
      productId: addProduct && productId ? productId : undefined,
      productQuantity: productQuantity,
      productUnitPrice: productUnitPrice !== "" ? productUnitPrice : undefined,
    });
    setLoading(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      const parts: string[] = [];
      if (res.companyId) parts.push("azienda");
      if (res.contactId) parts.push("contatto");
      parts.push("affare");
      toast.success(`Lead convertito: ${parts.join(", ")} creat${parts.length > 1 ? "i" : "o"}!`);
      onConverted(lead.id, res.dealId!);
      onClose();
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Converti lead</SheetTitle>
        </SheetHeader>

        <SheetBody>
          <div className="space-y-5">

            {/* Lead preview */}
            <div className="rounded-xl border border-[var(--crm-neutral-100)] p-4 bg-[var(--crm-neutral-50)] dark:bg-white/5 space-y-2">
              <p className="text-sm font-semibold">{lead.title}</p>
              <div className="flex items-center gap-3 text-xs text-[var(--crm-neutral-500)]">
                {lead.source && <span>📍 {lead.source}</span>}
                {lead.email && <span>✉ {lead.email}</span>}
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-[var(--crm-neutral-200)] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${lead.score}%`, backgroundColor: scoreColor }} />
                </div>
                <span className="text-xs font-bold" style={{ color: scoreColor }}>{lead.score}</span>
              </div>
            </div>

            {/* Deal */}
            <div className="space-y-3">
              <p className="text-sm font-semibold">Affare da creare</p>
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--crm-neutral-600)]">Titolo affare *</label>
                <input value={dealTitle} onChange={(e) => setDealTitle(e.target.value)} className={inputCls} placeholder={lead.title} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--crm-neutral-600)]">Valore (€)</label>
                <input
                  type="number" min={0} step={100}
                  value={dealValue}
                  onChange={(e) => setDealValue(parseFloat(e.target.value) || 0)}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Create contact toggle */}
            {!lead.contactId && (
              <div>
                <button
                  type="button"
                  onClick={() => setCreateContact((v) => !v)}
                  className="flex items-center gap-2 text-sm font-medium text-[var(--crm-primary)] hover:underline"
                >
                  <UserPlus className="h-4 w-4" />
                  {createContact ? "Non creare contatto" : "Crea anche un contatto"}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${createContact ? "rotate-180" : ""}`} />
                </button>

                {createContact && (
                  <div className="mt-3 space-y-3 rounded-xl border border-[var(--crm-neutral-100)] p-4 bg-[var(--crm-neutral-50)] dark:bg-white/5">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1 text-[var(--crm-neutral-600)]">Nome *</label>
                        <input value={contactFirstName} onChange={(e) => setContactFirstName(e.target.value)} className={inputCls} placeholder="Mario" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 text-[var(--crm-neutral-600)]">Cognome</label>
                        <input value={contactLastName} onChange={(e) => setContactLastName(e.target.value)} className={inputCls} placeholder="Rossi" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-[var(--crm-neutral-600)]">Email</label>
                      <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={inputCls} placeholder="mario@acme.it" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-[var(--crm-neutral-600)]">Telefono</label>
                      <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={inputCls} placeholder="+39 02 1234567" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {lead.contactId && (
              <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 px-3 py-2 text-xs text-green-700">
                ✓ Già collegato a un contatto — l'affare verrà associato automaticamente.
              </div>
            )}

            {/* Create company toggle */}
            <div>
              <button
                type="button"
                onClick={() => setCreateCompany((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium text-[var(--crm-primary)] hover:underline"
              >
                <Building2 className="h-4 w-4" />
                {createCompany ? "Non creare azienda" : "Crea anche un'azienda"}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${createCompany ? "rotate-180" : ""}`} />
              </button>

              {createCompany && (
                <div className="mt-3 space-y-3 rounded-xl border border-[var(--crm-neutral-100)] p-4 bg-[var(--crm-neutral-50)] dark:bg-white/5">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[var(--crm-neutral-600)]">Nome azienda *</label>
                    <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputCls} placeholder="Acme Srl" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[var(--crm-neutral-600)]">Sito web</label>
                    <input value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} className={inputCls} placeholder="www.acme.it" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-[var(--crm-neutral-600)]">Settore</label>
                      <input value={companySector} onChange={(e) => setCompanySector(e.target.value)} className={inputCls} placeholder="es. Tecnologia" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-[var(--crm-neutral-600)]">Dimensione</label>
                      <select value={companySize} onChange={(e) => setCompanySize(e.target.value)} className={inputCls}>
                        <option value="">—</option>
                        <option value="1-10">1–10</option>
                        <option value="11-50">11–50</option>
                        <option value="51-200">51–200</option>
                        <option value="201-1000">201–1000</option>
                        <option value="1000+">1000+</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Add product toggle */}
            <div>
              <button
                type="button"
                onClick={() => setAddProduct((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium text-[var(--crm-primary)] hover:underline"
              >
                <Package className="h-4 w-4" />
                {addProduct ? "Non aggiungere prodotto" : "Aggiungi un prodotto all'affare"}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${addProduct ? "rotate-180" : ""}`} />
              </button>

              {addProduct && (
                <div className="mt-3 space-y-3 rounded-xl border border-[var(--crm-neutral-100)] p-4 bg-[var(--crm-neutral-50)] dark:bg-white/5">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[var(--crm-neutral-600)]">Prodotto</label>
                    <select
                      value={productId}
                      onChange={(e) => {
                        setProductId(e.target.value);
                        const p = products.find((x) => x.id === e.target.value);
                        if (p) setProductUnitPrice(p.unitPrice);
                      }}
                      className={inputCls}
                    >
                      <option value="">— Seleziona prodotto —</option>
                      {products.filter((p) => p.isActive !== false).map((p) => (
                        <option key={p.id} value={p.id}>{p.name}{p.code ? ` (${p.code})` : ""}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-[var(--crm-neutral-600)]">Quantità</label>
                      <input
                        type="number" min={1} step={1}
                        value={productQuantity}
                        onChange={(e) => setProductQuantity(parseInt(e.target.value) || 1)}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-[var(--crm-neutral-600)]">Prezzo unitario (€)</label>
                      <input
                        type="number" min={0} step={0.01}
                        value={productUnitPrice}
                        onChange={(e) => setProductUnitPrice(parseFloat(e.target.value) || 0)}
                        className={inputCls}
                        placeholder="dal prodotto"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* What happens */}
            <div className="rounded-lg border border-[var(--crm-neutral-100)] p-3 text-xs text-[var(--crm-neutral-500)] space-y-1">
              <p className="font-semibold text-[var(--crm-neutral-700)]">Operazioni:</p>
              {createCompany && companyName.trim() && <p>• Crea un'azienda: {companyName.trim()}</p>}
              {createContact && !lead.contactId && <p>• Crea un nuovo contatto e lo collega all'affare{createCompany ? " e all'azienda" : ""}</p>}
              <p>• Crea un affare nel primo stage della pipeline predefinita</p>
              {addProduct && productId && <p>• Aggiungi prodotto all'affare (q.tà {productQuantity}{productUnitPrice !== "" ? `, €${productUnitPrice}` : ""})</p>}
              <p>• Segna il lead come "Convertito"</p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Annulla</Button>
              <Button
                type="button"
                disabled={loading || !dealTitle.trim()}
                className="flex-1 bg-[var(--crm-success)] hover:bg-[var(--crm-success)]/90 text-white"
                onClick={handleConvert}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRightCircle className="h-4 w-4 mr-2" />}
                Converti
              </Button>
            </div>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
