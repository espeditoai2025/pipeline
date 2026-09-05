import { Prisma } from "@/generated/prisma/client";
import { currencyDigits } from "@/lib/invoice-utils";

export class InvoiceError extends Error {}
export const roundMoney = (value: Prisma.Decimal | string | number, currency: string) => new Prisma.Decimal(value).toDecimalPlaces(currencyDigits(currency), Prisma.Decimal.ROUND_HALF_UP);

// Every writer of invoice state uses the same tenant-scoped row lock. This
// serializes payments, reversals, cancellation and deletion of the document.
export async function lockInvoice(tx: Prisma.TransactionClient, id: string, organizationId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Invoice" WHERE "id" = ${id} AND "organizationId" = ${organizationId} FOR UPDATE`;
  if (!rows.length) throw new InvoiceError("Fattura non trovata");
  const invoice = await tx.invoice.findFirst({ where: { id, organizationId } });
  if (!invoice) throw new InvoiceError("Fattura non trovata");
  return invoice;
}

export async function refreshInvoiceBalance(tx: Prisma.TransactionClient, invoice: { id: string; total: Prisma.Decimal; currency: string }) {
  const payments = await tx.invoicePayment.aggregate({ where: { invoiceId: invoice.id, voidedAt: null }, _sum: { amount: true }, _max: { paidAt: true } });
  const paidAmount = payments._sum.amount ?? new Prisma.Decimal(0);
  const settled = roundMoney(invoice.total.sub(paidAmount), invoice.currency).lte(0);
  await tx.invoice.update({ where: { id: invoice.id }, data: { paidAmount, status: settled ? "PAID" : "SENT", paidAt: settled ? payments._max.paidAt : null } });
}
