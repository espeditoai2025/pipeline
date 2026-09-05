// Deterministic browser fixtures. No authentication, database or external integration is loaded.
import type { Activity } from "@/types/activities";
import type { Contact } from "@/types/contacts";
import type { MergeContactOverrides } from "@/lib/merge-contacts";
import type { ContactImportRow } from "@/lib/contact-import";
import type { InvoiceDetail } from "@/server/actions/invoices";
import type { RecordPaymentInput } from "@/lib/invoice-utils";

export const contacts: Contact[] = ["a", "b", "c"].map((id, index) => ({
  id, firstName: "Mario", lastName: "Rossi", email: "mario@example.it", phone: index ? "0212345" : null,
  jobTitle: null, companyId: null, company: null, organizationId: "test-org", ownerId: "test-user",
  owner: { id: "test-user", name: "Utente Test", email: "test@example.it" },
  createdAt: "2026-09-05T08:00:00.000Z", updatedAt: "2026-09-05T08:00:00.000Z",
}));
export const fixture = { completed: false, planned: false, mergeCount: 0 };
export const getContacts = async () => contacts;
export const getDealsForSelect = async () => [{ id: "deal-1", title: "Consulenza sito web", value: 1200, currency: "EUR" }];
export const completeActivity = async (_id: string) => { fixture.completed = true; return { error: null }; };
export const deleteActivity = async (_id: string) => ({ error: null });
export const syncActivityToGoogleCalendar = async (_activity: Activity) => ({ error: null });
export const createActivity = async (input: Partial<Activity>) => {
  fixture.planned = !!input.dealId && !!input.dueDate;
  return { error: null, data: { id: "new", ...input } as Activity };
};
export const updateActivity = createActivity;
export const mergeContacts = async (_a: string, _b: string, _overrides: MergeContactOverrides) => {
  fixture.mergeCount++;
  return { error: null };
};
export const importContacts = async (rows: ContactImportRow[]) => ({ imported: rows.length, duplicates: 0, companies: 0, error: null });

export const fixtureInvoice: InvoiceDetail = {
  id: "inv-test", number: "FT-2026/012", status: "SENT", recipientName: "Studio Rossi", recipientVat: "IT01234567890",
  total: 1220, paidAmount: 0, balance: 1220, currency: "EUR", issueDate: "2026-09-01T00:00:00Z", dueDate: "2026-09-04T00:00:00Z", paidAt: null,
  dealId: "deal-1", dealTitle: "Consulenza sito web", senderName: "Studio Test", senderVat: "IT01234567890", senderAddress: null, senderCity: "Milano", senderCountry: "IT",
  recipientSdi: null, recipientAddress: "Via Roma 1", recipientCity: "Milano", recipientCountry: "IT", subtotal: 1000, taxAmount: 220,
  items: [{ description: "Consulenza sito web — 10 ore", quantity: 10, unitPrice: 100, taxRate: 22, discount: 0, subtotal: 1000, tax: 220, total: 1220 }],
  notes: "Acconto alla conferma, saldo alla consegna.", paymentMethod: "bonifico", paymentTerms: "30gg", createdAt: "2026-09-01T10:00:00Z", payments: [],
};
function fixtureBalance() {
  fixtureInvoice.paidAmount = fixtureInvoice.payments.filter(p => !p.voidedAt).reduce((sum, p) => sum + p.amount, 0);
  fixtureInvoice.balance = fixtureInvoice.total - fixtureInvoice.paidAmount;
  fixtureInvoice.status = fixtureInvoice.balance ? "SENT" : "PAID";
}
export const recordInvoicePayment = async (input: RecordPaymentInput) => {
  const amount = Number(input.amount.replace(",", "."));
  if (amount > fixtureInvoice.balance) return { error: "L'importo supera il saldo residuo. Aggiorna la fattura." };
  fixtureInvoice.payments.push({ id: input.requestId, amount, paidAt: `${input.paidOn}T12:00:00Z`, method: input.method, reference: input.reference ?? null, createdBy: "Utente Test", createdAt: new Date().toISOString(), voidedAt: null, voidReason: null, voidedBy: null });
  fixtureBalance(); return { error: null };
};
export const voidInvoicePayment = async (input: { paymentId: string; reason: string }) => {
  const p = fixtureInvoice.payments.find(p => p.id === input.paymentId)!;
  p.voidedAt = new Date().toISOString(); p.voidReason = input.reason; p.voidedBy = "Utente Test";
  fixtureBalance(); return { error: null };
};
export const updateInvoiceDueDate = async (input: { dueDate: string }) => { fixtureInvoice.dueDate = `${input.dueDate}T00:00:00Z`; return { error: null }; };
export const updateInvoiceStatus = async (_id: string, status: string) => { fixtureInvoice.status = status; return { error: null }; };
export const createInvoiceFromDeal = async (_input: unknown) => { fixtureInvoice.status = "DRAFT"; return { data: { id: fixtureInvoice.id, number: fixtureInvoice.number }, error: null }; };
