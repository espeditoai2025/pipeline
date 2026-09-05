import { z } from "zod";

export const paymentMethods = { bonifico: "Bonifico", carta: "Carta", contanti: "Contanti", assegno: "Assegno", rid: "SDD", altro: "Altro" } as const;
export const invoiceFilters = ["all", "overdue", "due", "partial", "DRAFT", "SENT", "PAID", "CANCELLED"] as const;
export type InvoiceFilter = typeof invoiceFilters[number];
export function todayInItaly(now = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function defaultInvoiceDueDate(terms: string, today = todayInItaly()) {
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + ({ immediato: 0, "30gg": 30, "60gg": 60, "90gg": 90 }[terms] ?? 30));
  return date.toISOString().slice(0, 10);
}
export function currencyDigits(currency: string) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
}
export function invoiceMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(amount);
}
export function invoiceDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("it-IT", { timeZone: "UTC", dateStyle: "medium" }).format(new Date(value)) : "Non impostata";
}
export const paymentSchema = z.object({
  invoiceId: z.string().min(1).max(100),
  requestId: z.uuid(),
  amount: z.string().trim().regex(/^\d{1,12}([.,]\d{1,4})?$/, "Inserisci un importo positivo, senza separatori delle migliaia").transform(value => value.replace(",", ".")),
  paidOn: z.iso.date({ error: "Data non valida" }),
  method: z.enum(["bonifico", "carta", "contanti", "assegno", "rid", "altro"]),
  reference: z.string().trim().max(250).optional(),
});
export type RecordPaymentInput = z.input<typeof paymentSchema>;
export const createInvoiceSchema = z.object({
  dealId: z.string().min(1).max(100),
  recipientName: z.string().trim().min(1, "Inserisci il nome del destinatario").max(200),
  recipientVat: z.string().trim().max(32).default(""),
  recipientSdi: z.string().trim().max(254).optional(),
  recipientAddress: z.string().trim().max(200).optional(),
  recipientCity: z.string().trim().max(100).optional(),
  paymentMethod: z.enum(["bonifico", "carta", "contanti", "assegno", "rid", "altro"]).optional(),
  paymentTerms: z.enum(["immediato", "30gg", "60gg", "90gg"]).default("30gg"),
  dueDate: z.union([z.iso.date({ error: "Scadenza non valida" }), z.literal("")]).optional(),
  notes: z.string().trim().max(2000).optional(),
});
