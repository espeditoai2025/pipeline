// Deterministic browser fixtures. No authentication, database or external integration is loaded.
import type { Activity } from "@/types/activities";
import type { Contact } from "@/types/contacts";
import type { MergeContactOverrides } from "@/lib/merge-contacts";
import type { ContactImportRow } from "@/lib/contact-import";
import type { InvoiceDetail } from "@/server/actions/invoices";
import type { RecordPaymentInput } from "@/lib/invoice-utils";
import type { Workflow, WorkflowLog } from "@/types/workflows";
export const fixtureWorkflow: Workflow = { id: "wf", name: "Ricontatto", description: "", isActive: true, triggerOnImport: false, trigger: { type: "DEAL_STAGE_CHANGED", fromStageId: "stage", toStageId: "next" }, steps: [{ id: "one", action: { type: "SEND_NOTIFICATION", message: "Ricontatta il cliente" } }], executionCount: 0, lastRunAt: null, organizationId: "test-org", createdAt: "2026-09-01T08:00:00Z", updatedAt: "2026-09-01T08:00:00Z" };
export const getWorkflowChoices = async () => ({ stages: [{ id: "stage", pipelineId: "p", name: "Vendite · Nuovo" }, { id: "next", pipelineId: "p", name: "Vendite · Proposta" }], users: [{ id: "user", name: "Maria Rossi" }] });
export const getTemplates = async () => [{ id: "template", name: "Benvenuto", category: "generale", subject: "Ciao", body: "Ciao", usageCount: 0, createdAt: "2026-09-01T08:00:00Z", updatedAt: "2026-09-01T08:00:00Z" }];
export const updateWorkflow = async (input: Partial<Workflow>) => ({ data: { ...fixtureWorkflow, ...input }, error: null });
export const createWorkflow = updateWorkflow;
export const fixtureLogs: WorkflowLog[] = [{ id: "log", queueId: "queue", workflowId: "wf", workflowName: "Richiamo cliente", status: "FAILED", trigger: "DEAL_CREATED", entityType: "deal", entityId: "deal", entityLabel: "Consulenza", stepsExecuted: 1, error: "Invio interrotto: esito incerto", emailInFlight: true, executedAt: "2026-09-01T08:00:00Z", logs: ["Azione 1 · SUCCESS · Notifica creata", "Azione 2 · FAILED · Timeout email"] }];
export const resumeWorkflowJob = async (_id: string, confirmed: boolean) => { document.documentElement.dataset.resumed = String(confirmed); return { error: null }; };

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

// Voice / invoicing UI fixtures: server behaviour is tested separately on PostgreSQL.
export const findCompanySuggestions = async () => ({ data: [{ source: 'Azienda già in Pipely: Studio Cliente', fields: { name: 'Studio Cliente', vatNumber: '12345678903', city: 'Milano' }, warnings: [] }] });
export const listVoiceNotes = async () => ({ data: [] });
export const saveVoiceTranscript = async () => ({ ok: true });
export const deleteVoiceNote = async () => ({ ok: true });
export const searchVoiceTargets = async () => ({ data: [{ id: 'deal-1', kind: 'deal' as const, name: 'Consulenza Rossi' }] });
export const prepareCrmCommand = async () => ({ data: { id: 'command-1', targetName: 'Consulenza Rossi', actions: ['Aggiorna affare: stato Vinto', 'Crea attività: Richiama Rossi domani alle 10:00'], expiresAt: new Date(Date.now() + 600000).toISOString() } });
export const executeCrmCommand = async () => { document.documentElement.dataset.commands = String(Number(document.documentElement.dataset.commands ?? 0) + 1); return { ok: true, message: 'Comando eseguito: 2 operazioni.' }; };
export const getInvoicingSettings = async () => ({ data: { configured: true, connected: true, connection: { companyId: 10, companyName: 'Studio Emittente', companyVat: '12345678903' }, canManage: true, available: true } });
export const listInvoicingCompanies = async () => ({ data: [{ id: 10, name: 'Studio Emittente', vatNumber: '12345678903' }] });
export const selectInvoicingCompany = async () => ({ ok: true });
export const disconnectInvoicing = async () => ({ ok: true });
let cloudStatus: import('@/lib/invoicing-schema').InvoiceExportStatus | null = null;
export const getInvoiceExport = async () => ({ data: cloudStatus });
export const getInvoiceVatOptions = async () => ({ data: [{ id: 1, value: 22, e_invoice: true, description: 'IVA ordinaria' }] });
export const prepareInvoiceExport = async (input: import('@/lib/invoicing-schema').InvoiceExportInput) => { document.documentElement.dataset.invoicePreview = JSON.stringify(input); return { data: { invoiceId: 'inv-test', previewId: '00000000-0000-4000-a000-000000000001', recipient: input.recipientName, company: 'Studio Emittente', total: 1220, currency: 'EUR' } }; };
export const createInvoiceInCloud = async () => { document.documentElement.dataset.invoiceCreated = 'true'; cloudStatus = { documentId: 100, remoteNumber: '8/P', status: 'CREATED', eInvoiceStatus: 'not_sent', remoteTotal: 1220, error: null, updatedAt: new Date().toISOString() }; return { ok: true }; };
export const refreshInvoiceExport = async () => ({ ok: true });
export const sendInvoiceToSdi = async () => { document.documentElement.dataset.invoiceSent = 'true'; cloudStatus = { ...cloudStatus!, status: 'SENT', eInvoiceStatus: 'pending' }; return { ok: true }; };
