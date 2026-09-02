"use server";

import { revalidatePath } from "next/cache";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function getIds(session: Session | null) {
  const user = session?.user as { organizationId?: string; id?: string } | undefined;
  return { orgId: user?.organizationId ?? null, userId: user?.id ?? null };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type InvoiceItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
  subtotal: number;
  tax: number;
  total: number;
};

export type InvoiceListItem = {
  id: string;
  number: string;
  status: string;
  recipientName: string;
  recipientVat: string | null;
  total: number;
  currency: string;
  issueDate: string;
  dueDate: string | null;
  paidAt: string | null;
  dealTitle: string | null;
};

export type InvoiceDetail = InvoiceListItem & {
  senderName: string;
  senderVat: string;
  senderAddress: string | null;
  senderCity: string | null;
  senderCountry: string;
  recipientSdi: string | null;
  recipientAddress: string | null;
  recipientCity: string | null;
  recipientCountry: string;
  subtotal: number;
  taxAmount: number;
  items: InvoiceItem[];
  notes: string | null;
  paymentMethod: string | null;
  paymentTerms: string | null;
  dealId: string | null;
  createdAt: string;
};

// ─── List ─────────────────────────────────────────────────────────────────────

export async function getInvoices(): Promise<InvoiceListItem[]> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return [];

  const rows = await db.invoice.findMany({
    where: { organizationId: orgId },
    include: { deal: { select: { title: true } } },
    orderBy: [{ year: "desc" }, { progressive: "desc" }],
  });

  return rows.map((r) => ({
    id: r.id,
    number: r.number,
    status: r.status,
    recipientName: r.recipientName,
    recipientVat: r.recipientVat,
    total: Number(r.total),
    currency: r.currency,
    issueDate: r.issueDate.toISOString(),
    dueDate: r.dueDate?.toISOString() ?? null,
    paidAt: r.paidAt?.toISOString() ?? null,
    dealTitle: r.deal?.title ?? null,
  }));
}

// ─── Detail ───────────────────────────────────────────────────────────────────

export async function getInvoiceDetail(id: string): Promise<InvoiceDetail | null> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return null;

  const inv = await db.invoice.findFirst({
    where: { id, organizationId: orgId },
    include: { deal: { select: { title: true } } },
  });
  if (!inv) return null;

  return {
    id: inv.id,
    number: inv.number,
    status: inv.status,
    senderName: inv.senderName,
    senderVat: inv.senderVat,
    senderAddress: inv.senderAddress,
    senderCity: inv.senderCity,
    senderCountry: inv.senderCountry,
    recipientName: inv.recipientName,
    recipientVat: inv.recipientVat,
    recipientSdi: inv.recipientSdi,
    recipientAddress: inv.recipientAddress,
    recipientCity: inv.recipientCity,
    recipientCountry: inv.recipientCountry,
    subtotal: Number(inv.subtotal),
    taxAmount: Number(inv.taxAmount),
    total: Number(inv.total),
    currency: inv.currency,
    issueDate: inv.issueDate.toISOString(),
    dueDate: inv.dueDate?.toISOString() ?? null,
    paidAt: inv.paidAt?.toISOString() ?? null,
    items: inv.items as unknown as InvoiceItem[],
    notes: inv.notes,
    paymentMethod: inv.paymentMethod,
    paymentTerms: inv.paymentTerms,
    dealId: inv.dealId,
    dealTitle: inv.deal?.title ?? null,
    createdAt: inv.createdAt.toISOString(),
  };
}

// ─── Create from Deal ─────────────────────────────────────────────────────────

export type CreateInvoiceInput = {
  dealId: string;
  recipientName: string;
  recipientVat: string;
  recipientSdi?: string;
  recipientAddress?: string;
  recipientCity?: string;
  paymentMethod?: string;
  paymentTerms?: string;
  dueDate?: string;
  notes?: string;
};

export async function createInvoiceFromDeal(
  input: CreateInvoiceInput,
): Promise<{ data: { id: string; number: string } | null; error: string | null }> {
  const session = await auth();
  const { orgId, userId } = getIds(session);
  if (!orgId || !userId) return { data: null, error: "Non autorizzato" };

  // Load deal with products + org
  const deal = await db.deal.findFirst({
    where: { id: input.dealId, organizationId: orgId },
    include: {
      organization: {
        select: { name: true, vatNumber: true, address: true, city: true, country: true },
      },
      products: {
        include: { product: { select: { name: true, code: true, unit: true, taxRate: true } } },
      },
    },
  });

  if (!deal) return { data: null, error: "Affare non trovato" };
  if (deal.products.length === 0) return { data: null, error: "Aggiungi almeno un prodotto all'affare" };
  if (!deal.organization.vatNumber) return { data: null, error: "Configura la P.IVA della tua azienda nelle impostazioni" };
  if (!input.recipientVat && !input.recipientName) return { data: null, error: "Inserisci il nome e la P.IVA del destinatario" };

  // Calculate items
  const items: InvoiceItem[] = deal.products.map((p) => {
    const unitPrice = Number(p.unitPrice);
    const discount = Number(p.discount);
    const taxRate = Number(p.product.taxRate);
    const subtotal = p.quantity * unitPrice * (1 - discount / 100);
    const tax = subtotal * (taxRate / 100);
    return {
      description: `${p.product.name}${p.product.code ? ` (${p.product.code})` : ""} — ${p.quantity} ${p.product.unit}`,
      quantity: p.quantity,
      unitPrice,
      taxRate,
      discount,
      subtotal,
      tax,
      total: subtotal + tax,
    };
  });

  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const taxAmount = items.reduce((s, i) => s + i.tax, 0);
  const total = subtotal + taxAmount;

  const year = new Date().getFullYear();

  // Shared invoice payload (everything except the per-year progressive number).
  const baseData = {
    senderName: deal.organization.name,
    senderVat: deal.organization.vatNumber,
    senderAddress: deal.organization.address,
    senderCity: deal.organization.city,
    senderCountry: deal.organization.country ?? "IT",
    recipientName: input.recipientName,
    recipientVat: input.recipientVat || null,
    recipientSdi: input.recipientSdi || null,
    recipientAddress: input.recipientAddress || null,
    recipientCity: input.recipientCity || null,
    subtotal,
    taxAmount,
    total,
    items: items as Parameters<typeof db.invoice.create>[0]["data"]["items"],
    notes: input.notes || null,
    paymentMethod: input.paymentMethod || null,
    paymentTerms: input.paymentTerms || null,
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
    dealId: deal.id,
    organizationId: orgId,
    createdById: userId,
  };

  // The progressive number is read-then-written, so two concurrent invoices can
  // collide on @@unique([organizationId, year, progressive]). Retry on the
  // resulting P2002 with a freshly recomputed progressive instead of crashing.
  let invoice: { id: string; number: string } | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const lastInvoice = await db.invoice.findFirst({
      where: { organizationId: orgId, year },
      orderBy: { progressive: "desc" },
      select: { progressive: true },
    });
    const progressive = (lastInvoice?.progressive ?? 0) + 1;
    const number = `FT-${year}/${String(progressive).padStart(3, "0")}`;

    try {
      invoice = await db.invoice.create({
        data: { number, year, progressive, ...baseData },
        select: { id: true, number: true },
      });
      break;
    } catch (e) {
      if ((e as { code?: string }).code === "P2002" && attempt < 4) continue;
      return { data: null, error: "Errore nella numerazione della fattura. Riprova." };
    }
  }

  if (!invoice) return { data: null, error: "Impossibile generare un numero fattura univoco. Riprova." };

  revalidatePath("/settings");
  return { data: { id: invoice.id, number: invoice.number }, error: null };
}

// ─── Update Status ────────────────────────────────────────────────────────────

export async function updateInvoiceStatus(
  id: string,
  status: "DRAFT" | "SENT" | "PAID" | "CANCELLED",
): Promise<{ error: string | null }> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return { error: "Non autorizzato" };

  const inv = await db.invoice.findFirst({ where: { id, organizationId: orgId }, select: { id: true } });
  if (!inv) return { error: "Fattura non trovata" };

  await db.invoice.update({
    where: { id },
    data: {
      status,
      ...(status === "PAID" && { paidAt: new Date() }),
      ...(status !== "PAID" && { paidAt: null }),
    },
  });

  revalidatePath("/settings");
  return { error: null };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteInvoice(id: string): Promise<{ error: string | null }> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return { error: "Non autorizzato" };

  const inv = await db.invoice.findFirst({ where: { id, organizationId: orgId }, select: { id: true, status: true } });
  if (!inv) return { error: "Fattura non trovata" };
  if (inv.status === "SENT" || inv.status === "PAID") return { error: "Non puoi eliminare una fattura già inviata o pagata" };

  await db.invoice.delete({ where: { id } });
  revalidatePath("/settings");
  return { error: null };
}

// ─── Generate FatturaPA XML ───────────────────────────────────────────────────

export async function generateFatturaPAXml(id: string): Promise<{ xml: string | null; filename: string | null; error: string | null }> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return { xml: null, filename: null, error: "Non autorizzato" };

  const inv = await db.invoice.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!inv) return { xml: null, filename: null, error: "Fattura non trovata" };

  const items = inv.items as unknown as InvoiceItem[];
  const senderVatClean = inv.senderVat.replace(/\s/g, "").replace(/^IT/i, "");
  const recipientVatClean = (inv.recipientVat ?? "").replace(/\s/g, "").replace(/^IT/i, "");

  const formatDate = (d: Date) => d.toISOString().split("T")[0];
  const formatAmount = (n: number | bigint) => Number(n).toFixed(2);

  // Codice destinatario: SDI code or default "0000000"
  const codDest = inv.recipientSdi && inv.recipientSdi.length === 7
    ? inv.recipientSdi
    : "0000000";

  // PEC (if recipientSdi looks like email)
  const pecDest = inv.recipientSdi && inv.recipientSdi.includes("@")
    ? inv.recipientSdi
    : "";

  const dettaglioLinee = items.map((item, i) => `
        <DettaglioLinee>
          <NumeroLinea>${i + 1}</NumeroLinea>
          <Descrizione>${escapeXml(item.description)}</Descrizione>
          <Quantita>${formatAmount(item.quantity)}</Quantita>
          <PrezzoUnitario>${formatAmount(item.unitPrice)}</PrezzoUnitario>
          ${item.discount > 0 ? `<ScontoMaggiorazione><Tipo>SC</Tipo><Percentuale>${formatAmount(item.discount)}</Percentuale></ScontoMaggiorazione>` : ""}
          <PrezzoTotale>${formatAmount(item.subtotal)}</PrezzoTotale>
          <AliquotaIVA>${formatAmount(item.taxRate)}</AliquotaIVA>
        </DettaglioLinee>` ).join("");

  // Group tax rates for DatiRiepilogo
  const taxGroups = new Map<number, { subtotal: number; tax: number }>();
  for (const item of items) {
    const existing = taxGroups.get(item.taxRate) ?? { subtotal: 0, tax: 0 };
    existing.subtotal += item.subtotal;
    existing.tax += item.tax;
    taxGroups.set(item.taxRate, existing);
  }

  const datiRiepilogo = Array.from(taxGroups.entries()).map(([rate, vals]) => `
        <DatiRiepilogo>
          <AliquotaIVA>${formatAmount(rate)}</AliquotaIVA>
          <ImponibileImporto>${formatAmount(vals.subtotal)}</ImponibileImporto>
          <Imposta>${formatAmount(vals.tax)}</Imposta>
          <EsigibilitaIVA>I</EsigibilitaIVA>
        </DatiRiepilogo>`).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" versione="FPR12" xsi:schemaLocation="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2 http://www.fatturapa.gov.it/export/fatturazione/sdi/fatturapa/v1.2/Schema_del_file_xml_FatturaPA_versione_1.2.xsd">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente>
        <IdPaese>IT</IdPaese>
        <IdCodice>${senderVatClean}</IdCodice>
      </IdTrasmittente>
      <ProgressivoInvio>${String(inv.progressive).padStart(5, "0")}</ProgressivoInvio>
      <FormatoTrasmissione>FPR12</FormatoTrasmissione>
      <CodiceDestinatario>${codDest}</CodiceDestinatario>${pecDest ? `
      <PECDestinatario>${escapeXml(pecDest)}</PECDestinatario>` : ""}
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>${senderVatClean}</IdCodice>
        </IdFiscaleIVA>
        <Anagrafica>
          <Denominazione>${escapeXml(inv.senderName)}</Denominazione>
        </Anagrafica>
        <RegimeFiscale>RF01</RegimeFiscale>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${escapeXml(inv.senderAddress ?? "Via non specificata")}</Indirizzo>
        <CAP>00000</CAP>
        <Comune>${escapeXml(inv.senderCity ?? "Non specificato")}</Comune>
        <Nazione>${inv.senderCountry}</Nazione>
      </Sede>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>${recipientVatClean ? `
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>${recipientVatClean}</IdCodice>
        </IdFiscaleIVA>` : `
        <CodiceFiscale>${escapeXml(inv.recipientVat ?? "")}</CodiceFiscale>`}
        <Anagrafica>
          <Denominazione>${escapeXml(inv.recipientName)}</Denominazione>
        </Anagrafica>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${escapeXml(inv.recipientAddress ?? "Via non specificata")}</Indirizzo>
        <CAP>00000</CAP>
        <Comune>${escapeXml(inv.recipientCity ?? "Non specificato")}</Comune>
        <Nazione>${inv.recipientCountry}</Nazione>
      </Sede>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento>
        <Divisa>${inv.currency}</Divisa>
        <Data>${formatDate(inv.issueDate)}</Data>
        <Numero>${escapeXml(inv.number)}</Numero>
        <ImportoTotaleDocumento>${formatAmount(Number(inv.total))}</ImportoTotaleDocumento>${inv.notes ? `
        <Causale>${escapeXml(inv.notes)}</Causale>` : ""}
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>${dettaglioLinee}${datiRiepilogo}
    </DatiBeniServizi>${inv.paymentMethod ? `
    <DatiPagamento>
      <CondizioniPagamento>${inv.paymentTerms === "immediato" ? "TP02" : "TP01"}</CondizioniPagamento>
      <DettaglioPagamento>
        <ModalitaPagamento>${paymentCode(inv.paymentMethod)}</ModalitaPagamento>
        <ImportoPagamento>${formatAmount(Number(inv.total))}</ImportoPagamento>${inv.dueDate ? `
        <DataScadenzaPagamento>${formatDate(inv.dueDate)}</DataScadenzaPagamento>` : ""}
      </DettaglioPagamento>
    </DatiPagamento>` : ""}
  </FatturaElettronicaBody>
</p:FatturaElettronica>`;

  const filename = `IT${senderVatClean}_${String(inv.progressive).padStart(5, "0")}.xml`;

  return { xml, filename, error: null };
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function paymentCode(method: string): string {
  switch (method.toLowerCase()) {
    case "bonifico": return "MP05";
    case "carta": return "MP08";
    case "contanti": return "MP01";
    case "assegno": return "MP02";
    case "rid": return "MP09";
    case "sepa": return "MP05";
    default: return "MP05";
  }
}
