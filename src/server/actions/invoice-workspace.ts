"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { invoiceFilters, paymentSchema, todayInItaly, type InvoiceFilter, type RecordPaymentInput } from "@/lib/invoice-utils";
import { InvoiceError, lockInvoice, refreshInvoiceBalance, roundMoney } from "@/lib/invoice-payments";
import type { InvoiceListItem } from "./invoices";

async function actor() {
  const user = (await auth())?.user as { organizationId?: string; id?: string; role?: string } | undefined;
  return { orgId: user?.organizationId, userId: user?.id, canWrite: ["OWNER", "ADMIN", "MANAGER", "SALES"].includes(user?.role ?? "") };
}
function refresh(id: string) {
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/settings");
}
function failure(error: unknown) {
  return { error: error instanceof InvoiceError ? error.message : "Operazione non riuscita. Riprova: lo stesso invio non viene registrato due volte." };
}

export async function recordInvoicePayment(input: RecordPaymentInput) {
  const { orgId, userId, canWrite } = await actor();
  if (!orgId || !userId || !canWrite) return { error: "Non autorizzato" };
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  const data = parsed.data;
  if (data.paidOn > todayInItaly()) return { error: "La data di incasso non può essere futura" };
  try {
    await db.$transaction(async tx => {
      const inv = await lockInvoice(tx, data.invoiceId, orgId);
      const amount = new Prisma.Decimal(data.amount);
      if (amount.lte(0) || !roundMoney(amount, inv.currency).eq(amount)) throw new InvoiceError("Importo o numero di decimali non valido per questa valuta");
      const paidAt = new Date(`${data.paidOn}T12:00:00Z`);
      const reference = data.reference || null;
      const previous = await tx.invoicePayment.findUnique({ where: { organizationId_requestId: { organizationId: orgId, requestId: data.requestId } } });
      if (previous) {
        if (previous.voidedAt) throw new InvoiceError("Questo incasso è stato annullato. Apri una nuova registrazione.");
        if (previous.invoiceId !== inv.id || !previous.amount.eq(amount) || previous.paidAt.getTime() !== paidAt.getTime() || previous.method !== data.method || previous.reference !== reference) throw new InvoiceError("Invio già utilizzato per un altro movimento. Riapri il modulo.");
        return;
      }
      if (inv.status !== "SENT") throw new InvoiceError("Registra incassi solo per fatture inviate con un saldo aperto");
      const balance = roundMoney(inv.total.sub(inv.paidAmount), inv.currency);
      if (amount.gt(balance)) throw new InvoiceError("L'importo supera il saldo residuo. Aggiorna la fattura.");
      await tx.invoicePayment.create({ data: { invoiceId: inv.id, organizationId: orgId, requestId: data.requestId, amount, paidAt, method: data.method, reference, createdById: userId } });
      await refreshInvoiceBalance(tx, inv);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
    refresh(data.invoiceId);
    return { error: null };
  } catch (error) { return failure(error); }
}

export async function voidInvoicePayment(input: { invoiceId: string; paymentId: string; reason: string }) {
  const { orgId, userId, canWrite } = await actor();
  if (!orgId || !userId || !canWrite) return { error: "Non autorizzato" };
  const parsed = z.object({ invoiceId: z.string().min(1).max(100), paymentId: z.string().min(1).max(100), reason: z.string().trim().min(5, "Indica il motivo della rettifica (almeno 5 caratteri)").max(500) }).safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  const data = parsed.data;
  try {
    await db.$transaction(async tx => {
      const inv = await lockInvoice(tx, data.invoiceId, orgId);
      const payment = await tx.invoicePayment.findFirst({ where: { id: data.paymentId, invoiceId: inv.id, organizationId: orgId } });
      if (!payment) throw new InvoiceError("Incasso non trovato");
      if (payment.voidedAt) return;
      await tx.invoicePayment.update({ where: { id: payment.id }, data: { voidedAt: new Date(), voidedById: userId, voidReason: data.reason } });
      await refreshInvoiceBalance(tx, inv);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
    refresh(data.invoiceId);
    return { error: null };
  } catch (error) { return failure(error); }
}

export async function updateInvoiceDueDate(input: { invoiceId: string; dueDate: string }) {
  const { orgId, canWrite } = await actor();
  if (!orgId || !canWrite) return { error: "Non autorizzato" };
  const parsed = z.object({ invoiceId: z.string().min(1).max(100), dueDate: z.iso.date({ error: "Scadenza non valida" }) }).safeParse(input);
  if (!parsed.success) return { error: "Scadenza non valida" };
  try {
    await db.$transaction(async tx => {
      const inv = await lockInvoice(tx, input.invoiceId, orgId);
      if (!["DRAFT", "SENT"].includes(inv.status)) throw new InvoiceError("La scadenza si modifica solo per bozze o fatture aperte");
      await tx.invoice.update({ where: { id: inv.id }, data: { dueDate: new Date(`${input.dueDate}T00:00:00Z`) } });
    });
    refresh(input.invoiceId);
    return { error: null };
  } catch (error) { return failure(error); }
}

export type InvoiceWorkspace = {
  rows: InvoiceListItem[]; count: number; page: number; pages: number; canWrite: boolean;
  summary: { currency: string; outstanding: number; overdue: number; received: number; openCount: number; overdueCount: number }[];
};
export async function getInvoiceWorkspace(input: { q?: string; filter?: InvoiceFilter; page?: number } = {}): Promise<InvoiceWorkspace> {
  const { orgId, canWrite } = await actor();
  const empty = { rows: [], count: 0, page: 1, pages: 1, canWrite: false, summary: [] };
  if (!orgId) return empty;
  const parsed = z.object({ q: z.string().trim().max(100).default(""), filter: z.enum(invoiceFilters).default("all"), page: z.number().int().min(1).max(100000).default(1) }).safeParse(input);
  if (!parsed.success) return empty;
  const { q, filter } = parsed.data;
  // Due dates are calendar dates stored at UTC midnight, evaluated against the Italian day.
  const today = new Date(`${todayInItaly()}T00:00:00Z`);
  const nextWeek = new Date(today.getTime() + 7 * 86400000);
  const base = { organizationId: orgId };
  const where: Prisma.InvoiceWhereInput = {
    ...base,
    ...(q && { OR: [{ number: { contains: q, mode: "insensitive" } }, { recipientName: { contains: q, mode: "insensitive" } }, { recipientVat: { contains: q, mode: "insensitive" } }] }),
    ...(filter === "overdue" ? { status: "SENT", dueDate: { lt: today } }
      : filter === "due" ? { status: "SENT", dueDate: { gte: today, lt: nextWeek } }
      : filter === "partial" ? { status: "SENT", paidAmount: { gt: 0 } }
      : filter !== "all" ? { status: filter } : {}),
  };
  return db.$transaction(async tx => {
    const count = await tx.invoice.count({ where });
    const pages = Math.max(1, Math.ceil(count / 25));
    const page = Math.min(parsed.data.page, pages);
    const rows = await tx.invoice.findMany({ where, skip: (page - 1) * 25, take: 25, include: { deal: { select: { title: true } } }, orderBy: filter === "overdue" || filter === "due" ? [{ dueDate: "asc" }, { id: "asc" }] : [{ year: "desc" }, { progressive: "desc" }] });
    const sums = await tx.invoice.groupBy({ by: ["currency", "status"], where: { ...base, status: { in: ["SENT", "PAID"] } }, _sum: { total: true, paidAmount: true }, _count: { _all: true } });
    const overdue = await tx.invoice.groupBy({ by: ["currency"], where: { ...base, status: "SENT", dueDate: { lt: today } }, _sum: { total: true, paidAmount: true }, _count: { _all: true } });
    const summary = new Map<string, InvoiceWorkspace["summary"][number]>();
    for (const s of sums) {
      const row = summary.get(s.currency) ?? { currency: s.currency, outstanding: 0, overdue: 0, received: 0, openCount: 0, overdueCount: 0 };
      row.received = Number(new Prisma.Decimal(row.received).add(s._sum.paidAmount ?? 0));
      if (s.status === "SENT") { row.outstanding = Number((s._sum.total ?? new Prisma.Decimal(0)).sub(s._sum.paidAmount ?? 0)); row.openCount = s._count._all; }
      summary.set(s.currency, row);
    }
    for (const s of overdue) {
      const row = summary.get(s.currency);
      if (row) { row.overdue = Number((s._sum.total ?? new Prisma.Decimal(0)).sub(s._sum.paidAmount ?? 0)); row.overdueCount = s._count._all; }
    }
    return { rows: rows.map(r => ({ id: r.id, number: r.number, status: r.status, recipientName: r.recipientName, recipientVat: r.recipientVat, total: Number(r.total), paidAmount: Number(r.paidAmount), balance: Number(roundMoney(r.total.sub(r.paidAmount), r.currency)), currency: r.currency, issueDate: r.issueDate.toISOString(), dueDate: r.dueDate?.toISOString() ?? null, paidAt: r.paidAt?.toISOString() ?? null, dealTitle: r.deal?.title ?? null })), count, page, pages, canWrite, summary: [...summary.values()].sort((a, b) => a.currency.localeCompare(b.currency)) };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
