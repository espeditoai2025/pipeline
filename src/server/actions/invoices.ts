"use server";

import { revalidatePath } from "next/cache";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { createInvoiceSchema, defaultInvoiceDueDate, todayInItaly } from "@/lib/invoice-utils";
import { InvoiceError, lockInvoice, roundMoney } from "@/lib/invoice-payments";

function getIds(session: Session | null) {
  const user = session?.user as { organizationId?: string; id?: string; role?: string } | undefined;
  return { orgId: user?.organizationId ?? null, userId: user?.id ?? null, canWrite: ["OWNER", "ADMIN", "MANAGER", "SALES"].includes(user?.role ?? "") };
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
  paidAmount: number;
  balance: number;
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
  payments: { id: string; amount: number; paidAt: string; method: string; reference: string | null; createdBy: string; createdAt: string; voidedAt: string | null; voidReason: string | null; voidedBy: string | null }[];
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
    paidAmount: Number(r.paidAmount),
    balance: Number(roundMoney(r.total.sub(r.paidAmount), r.currency)),
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
    include: { deal: { select: { title: true } }, payments: { orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }], include: { createdBy: { select: { name: true } }, voidedBy: { select: { name: true } } } } },
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
    paidAmount: Number(inv.paidAmount),
    balance: Number(roundMoney(inv.total.sub(inv.paidAmount), inv.currency)),
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
    payments: inv.payments.map(p => ({ id: p.id, amount: Number(p.amount), paidAt: p.paidAt.toISOString(), method: p.method, reference: p.reference, createdBy: p.createdBy.name ?? "Utente", createdAt: p.createdAt.toISOString(), voidedAt: p.voidedAt?.toISOString() ?? null, voidReason: p.voidReason, voidedBy: p.voidedBy?.name ?? null })),
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
  const { orgId, userId, canWrite } = getIds(session);
  if (!orgId || !userId || !canWrite) return { data: null, error: "Non autorizzato" };
  const parsed = createInvoiceSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  input = parsed.data;

  // Load deal with products + org
  const deal = await db.deal.findFirst({
    where: { id: input.dealId, organizationId: orgId, status: { not: "DELETED" } },
    include: {
      organization: {
        select: { name: true, vatNumber: true, address: true, city: true, country: true },
      },
      products: {
        include: { product: { select: { name: true, code: true, unit: true, taxRate: true, currency: true, organizationId: true } } },
      },
    },
  });

  if (!deal) return { data: null, error: "Affare non trovato" };
  if (deal.products.length === 0) return { data: null, error: "Aggiungi almeno un prodotto all'affare" };
  if (!deal.organization.vatNumber) return { data: null, error: "Configura la P.IVA della tua azienda nelle impostazioni" };
  if (!/^[A-Z]{3}$/.test(deal.currency)) return { data: null, error: "Valuta dell'affare non valida" };
  if (deal.products.some(p => p.product.organizationId !== orgId || p.product.currency !== deal.currency)) return { data: null, error: "Verifica i prodotti: devono appartenere alla tua azienda e avere la stessa valuta dell'affare" };
  if (deal.products.some(p => p.quantity <= 0 || new Prisma.Decimal(p.unitPrice).lt(0) || new Prisma.Decimal(p.discount).lt(0) || new Prisma.Decimal(p.discount).gt(100) || new Prisma.Decimal(p.product.taxRate).lt(0) || new Prisma.Decimal(p.product.taxRate).gt(100))) return { data: null, error: "Quantità, prezzi, sconti o aliquote dei prodotti non validi" };

  // Calculate items
  const items: InvoiceItem[] = deal.products.map((p) => {
    const unitPrice = Number(p.unitPrice);
    const discount = Number(p.discount);
    const taxRate = Number(p.product.taxRate);
    const subtotal = Number(roundMoney(new Prisma.Decimal(p.unitPrice).mul(p.quantity).mul(new Prisma.Decimal(1).sub(new Prisma.Decimal(p.discount).div(100))), deal.currency));
    const tax = Number(roundMoney(new Prisma.Decimal(subtotal).mul(taxRate).div(100), deal.currency));
    return {
      description: `${p.product.name}${p.product.code ? ` (${p.product.code})` : ""} — ${p.quantity} ${p.product.unit}`,
      quantity: p.quantity,
      unitPrice,
      taxRate,
      discount,
      subtotal,
      tax,
      total: Number(new Prisma.Decimal(subtotal).add(tax)),
    };
  });

  const subtotal = items.reduce((s, i) => s.add(i.subtotal), new Prisma.Decimal(0));
  const taxAmount = items.reduce((s, i) => s.add(i.tax), new Prisma.Decimal(0));
  const total = subtotal.add(taxAmount);
  if (total.lte(0) || total.gte("1000000000000")) return { data: null, error: "Il totale deve essere positivo e inferiore a mille miliardi" };

  const year = Number(todayInItaly().slice(0, 4));

  // Shared invoice payload (everything except the per-year progressive number).
  const baseData = {
    issueDate: new Date(`${todayInItaly()}T00:00:00Z`),
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
    currency: deal.currency,
    items: items as Parameters<typeof db.invoice.create>[0]["data"]["items"],
    notes: input.notes || null,
    paymentMethod: input.paymentMethod || null,
    paymentTerms: input.paymentTerms || null,
    dueDate: new Date(`${input.dueDate || defaultInvoiceDueDate(input.paymentTerms ?? "30gg")}T00:00:00Z`),
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
  revalidatePath("/invoices");
  revalidatePath(`/deals/${deal.id}`);
  return { data: { id: invoice.id, number: invoice.number }, error: null };
}

// ─── Update Status ────────────────────────────────────────────────────────────

export async function updateInvoiceStatus(
  id: string,
  status: "DRAFT" | "SENT" | "PAID" | "CANCELLED",
): Promise<{ error: string | null }> {
  const session = await auth();
  const { orgId, canWrite } = getIds(session);
  if (!orgId || !canWrite) return { error: "Non autorizzato" };
  if (!["SENT", "CANCELLED"].includes(status)) return { error: "Per segnare una fattura pagata registra un incasso" };
  try {
    await db.$transaction(async tx => {
      const inv = await lockInvoice(tx, id, orgId);
      if (inv.status === status) return;
      // Cancellation here only discards a draft; sent documents retain history.
      if (inv.status !== "DRAFT") throw new InvoiceError("Solo una bozza può essere segnata come inviata o annullata");
      await tx.invoice.update({ where: { id }, data: { status } });
    });
    revalidatePath("/settings");
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${id}`);
    return { error: null };
  } catch (error) {
    return { error: error instanceof InvoiceError ? error.message : "Aggiornamento non riuscito. Riprova." };
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteInvoice(id: string): Promise<{ error: string | null }> {
  const session = await auth();
  const { orgId, canWrite } = getIds(session);
  if (!orgId || !canWrite) return { error: "Non autorizzato" };
  try {
    await db.$transaction(async tx => {
      const inv = await lockInvoice(tx, id, orgId);
      if (inv.status !== "DRAFT") throw new InvoiceError("Puoi eliminare soltanto una bozza");
      // Keep the progressive reserved, including when this is the latest draft.
      await tx.invoice.update({ where: { id }, data: { status: "CANCELLED" } });
    });
    revalidatePath("/settings");
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${id}`);
    return { error: null };
  } catch (error) {
    return { error: error instanceof InvoiceError ? error.message : "Annullamento non riuscito. Riprova." };
  }
}

// The previous exporter guessed RF01, CAP 00000 and missing addresses.
// No XML may be emitted until fiscal data and schema validation are implemented.
export async function generateFatturaPAXml(id: string): Promise<{ xml: string | null; filename: string | null; error: string | null }> {
  const { orgId } = getIds(await auth());
  if (!orgId) return { xml: null, filename: null, error: "Non autorizzato" };
  const invoice = await db.invoice.findFirst({ where: { id, organizationId: orgId }, select: { id: true } });
  return { xml: null, filename: null, error: invoice
    ? "Esportazione XML non disponibile: mancano dati fiscali completi e validazione del tracciato. Completa l'emissione nel tuo servizio di fatturazione."
    : "Fattura non trovata" };
}
