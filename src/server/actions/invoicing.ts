"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { featureAccess, featureError } from "@/lib/feature-access";
import { CrmError } from "@/lib/crm-transaction";
import { ficConfigured, ficConnection, ficRequest, ficCompanySchema, ficVatSchema, ficDocumentSchema, FicError, type FicDocument } from "@/lib/fatture-in-cloud";
import { invoiceExportInputSchema, type InvoiceExportInput, type InvoiceExportPreview, type InvoiceExportStatus } from "@/lib/invoicing-schema";
import { normalizeItalianVat } from "@/lib/company-autofill";
import { checkFeature } from "@/lib/plan";

const idSchema = z.string().min(1).max(100);
const payloadSchema = z.object({ previewId: z.uuid(), version: z.string(), expires: z.number(), request: z.object({ data: z.record(z.string(), z.unknown()), options: z.object({ fix_payments: z.boolean() }) }) });
const itemSchema = z.object({ description: z.string(), quantity: z.number().positive(), unitPrice: z.number().nonnegative(), discount: z.number().min(0).max(100), taxRate: z.number().min(0).max(100) });
function statusDto(row: { documentId: number | null; status: string; remoteNumber: string | null; eInvoiceStatus: string | null; remoteTotal: Prisma.Decimal | null; error: string | null; updatedAt: Date }): InvoiceExportStatus {
  return { documentId: row.documentId, status: row.status, remoteNumber: row.remoteNumber, eInvoiceStatus: row.eInvoiceStatus, remoteTotal: row.remoteTotal ? Number(row.remoteTotal) : null, error: row.error, updatedAt: row.updatedAt.toISOString() };
}
async function ensureTxPermission(tx: Prisma.TransactionClient, orgId: string, userId: string) {
  const user = await tx.user.findFirst({ where: { id: userId, organizationId: orgId, role: { in: ["OWNER", "ADMIN", "MANAGER", "SALES"] } }, include: { organization: { select: { plan: true } } } });
  if (!user || checkFeature(user.organization.plan, "invoicing")) throw new CrmError("Permesso o piano non più disponibile.");
}

export async function getInvoicingSettings() {
  try {
    const { orgId, role, plan } = await featureAccess();
    const connection = await db.invoicingConnection.findUnique({ where: { organizationId: orgId }, select: { companyId: true, companyName: true, companyVat: true } });
    return { data: { configured: ficConfigured(), connected: Boolean(connection), connection, canManage: ["OWNER", "ADMIN"].includes(role), available: !checkFeature(plan, "invoicing") } };
  } catch (error) { return { error: featureError(error) }; }
}
export async function listInvoicingCompanies() {
  try {
    const { orgId } = await featureAccess("integrations", "invoicing");
    const { token } = await ficConnection(orgId);
    const raw = await ficRequest<unknown>(token, "/user/companies");
    const companies = z.object({ data: z.object({ companies: z.array(ficCompanySchema) }) }).parse(raw).data.companies;
    return { data: companies.filter(row => row.type !== "accountant").map(row => ({ id: row.id, name: row.name, vatNumber: row.vat_number ?? "" })) };
  } catch (error) { return { error: featureError(error) }; }
}
export async function selectInvoicingCompany(companyId: number) {
  try {
    const { orgId } = await featureAccess("integrations", "invoicing");
    if (!z.number().int().positive().safeParse(companyId).success) throw new CrmError("Azienda non valida");
    const companies = await listInvoicingCompanies(); if (companies.error) throw new CrmError(companies.error);
    const company = companies.data?.find(row => row.id === companyId); if (!company) throw new CrmError("Azienda non autorizzata da Fatture in Cloud.");
    const org = await db.organization.findUniqueOrThrow({ where: { id: orgId }, select: { vatNumber: true } });
    if (!org.vatNumber || !company.vatNumber || normalizeItalianVat(org.vatNumber) !== normalizeItalianVat(company.vatNumber)) throw new CrmError("La partita IVA in Impostazioni → Organizzazione deve coincidere con l’azienda Fatture in Cloud.");
    await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT "organizationId" FROM "InvoicingConnection" WHERE "organizationId" = ${orgId} FOR UPDATE`;
      if (await tx.invoiceExport.count({ where: { organizationId: orgId, companyId: { not: companyId } } })) throw new CrmError("Sono presenti documenti collegati a un’altra azienda Fatture in Cloud. Ricollega l’azienda originaria.");
      await tx.invoicingConnection.update({ where: { organizationId: orgId }, data: { companyId, companyName: company.name, companyVat: company.vatNumber } });
    });
    revalidatePath("/settings/invoicing"); return { ok: true };
  } catch (error) { return { error: featureError(error) }; }
}
export async function disconnectInvoicing() {
  try {
    const { orgId } = await featureAccess("integrations");
    await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT "organizationId" FROM "InvoicingConnection" WHERE "organizationId" = ${orgId} FOR UPDATE`;
      if (await tx.invoiceExport.count({ where: { organizationId: orgId, status: { in: ["CREATING", "SENDING"] } } })) throw new CrmError("Attendi il completamento delle operazioni in corso.");
      await tx.invoicingConnection.deleteMany({ where: { organizationId: orgId } });
    });
    revalidatePath("/settings/invoicing"); return { ok: true };
  } catch (error) { return { error: featureError(error) }; }
}
export async function getInvoiceExport(invoiceId: string) {
  try {
    const { orgId } = await featureAccess();
    const row = await db.invoiceExport.findFirst({ where: { invoiceId: idSchema.parse(invoiceId), organizationId: orgId } });
    return { data: row ? statusDto(row) : null };
  } catch (error) { return { error: featureError(error) }; }
}
export async function getInvoiceVatOptions() {
  try {
    const { orgId } = await featureAccess("write", "invoicing");
    const connection = await ficConnection(orgId); if (!connection.companyId) throw new CrmError("Seleziona l’azienda Fatture in Cloud nelle impostazioni.");
    const raw = await ficRequest<unknown>(connection.token, "/c/" + connection.companyId + "/info/vat_types");
    const rows = z.object({ data: z.array(ficVatSchema) }).parse(raw).data;
    return { data: rows.filter(row => !row.is_disabled && row.e_invoice !== false) };
  } catch (error) { return { error: featureError(error) }; }
}

export async function prepareInvoiceExport(input: InvoiceExportInput): Promise<{ data?: InvoiceExportPreview; error?: string }> {
  try {
    const { orgId, userId } = await featureAccess("write", "invoicing");
    const parsed = invoiceExportInputSchema.safeParse(input); if (!parsed.success) throw new CrmError(parsed.error.issues[0]?.message ?? "Dati fiscali non validi");
    const fields = parsed.data;
    const invoice = await db.invoice.findFirst({ where: { id: fields.invoiceId, organizationId: orgId, status: "DRAFT", paidAmount: 0 } });
    if (!invoice) throw new CrmError("Puoi collegare solo una bozza senza incassi.");
    if (invoice.currency !== "EUR" || !["IT", "Italia"].includes(invoice.recipientCountry)) throw new CrmError("Questa integrazione gestisce fatture ordinarie italiane in EUR. Gestisci gli altri casi direttamente in Fatture in Cloud.");
    const connection = await ficConnection(orgId); if (!connection.companyId) throw new CrmError("Seleziona l’azienda Fatture in Cloud.");
    if (!connection.companyVat || normalizeItalianVat(connection.companyVat) !== normalizeItalianVat(invoice.senderVat)) throw new CrmError("La partita IVA emittente della bozza non coincide con l’azienda collegata.");
    const info = await ficRequest<{ data: { vat_types_list: unknown[]; default_values?: Record<string, unknown> } }>(connection.token, "/c/" + connection.companyId + "/issued_documents/info?type=invoice");
    const defaults = info.data.default_values ?? {};
    if (["rivalsa", "cassa", "withholding_tax", "other_withholding_tax"].some(key => Number(defaults[key] ?? 0) !== 0)) throw new CrmError("Il profilo Fatture in Cloud applica casse o ritenute: completa questo documento nel gestionale, per mantenere corretti i calcoli fiscali.");
    const vats = z.array(ficVatSchema).parse(info.data.vat_types_list);
    const items = z.array(itemSchema).min(1).max(200).parse(invoice.items);
    if (fields.vatIds.length !== items.length) throw new CrmError("Seleziona l’aliquota per ogni riga.");
    const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const data = {
      type: "invoice", e_invoice: true, date: invoice.issueDate.toISOString().slice(0, 10), numeration: fields.numeration,
      subject: "Pipely:" + invoice.id, visible_subject: invoice.number,
      entity: { name: fields.recipientName, vat_number: fields.vatNumber, tax_code: fields.taxCode, address_street: fields.address, address_postal_code: fields.postalCode, address_city: fields.city, address_province: fields.province, country: "Italia", country_iso: "IT", ei_code: fields.sdiCode || "0000000", certified_email: fields.pec },
      currency: { id: "EUR", exchange_rate: "1.00000" }, language: { code: "it", name: "Italiano" }, use_gross_prices: false,
      rivalsa: 0, cassa: 0, cassa2: 0, withholding_tax: 0, other_withholding_tax: 0, stamp_duty: 0, use_split_payment: false,
      ei_data: { payment_method: fields.paymentCode }, notes: escapeHtml(invoice.notes ?? ""),
      items_list: items.map((item, index) => {
        const vat = vats.find(row => row.id === fields.vatIds[index]);
        if (!vat || vat.is_disabled || vat.e_invoice === false || vat.value !== item.taxRate || (vat.value === 0 && !vat.ei_type)) throw new CrmError("Aliquota o natura IVA non compatibile alla riga " + (index + 1));
        // Zero VAT may require stamp duty / special fiscal treatment absent from the CRM model.
        if (vat.value === 0) throw new CrmError("Le righe senza IVA richiedono la verifica di natura e bollo: completa questa fattura nel gestionale.");
        return { name: escapeHtml(item.description), qty: item.quantity, net_price: item.unitPrice, discount: item.discount, vat: { id: vat.id }, apply_withholding_taxes: false, stock: false };
      }),
      payments_list: [{ amount: Number(invoice.total), due_date: (invoice.dueDate ?? invoice.issueDate).toISOString().slice(0, 10), status: "not_paid" }],
    };
    const request = { data, options: { fix_payments: false } };
    const totalsRaw = await ficRequest<unknown>(connection.token, "/c/" + connection.companyId + "/issued_documents/totals", "POST", request);
    const totals = z.object({ data: z.object({ amount_gross: z.number(), amount_net: z.number(), amount_vat: z.number() }) }).parse(totalsRaw).data;
    if (!new Prisma.Decimal(totals.amount_gross).toDecimalPlaces(2).eq(invoice.total) || !new Prisma.Decimal(totals.amount_net).toDecimalPlaces(2).eq(invoice.subtotal) || !new Prisma.Decimal(totals.amount_vat).toDecimalPlaces(2).eq(invoice.taxAmount)) throw new CrmError("I totali calcolati da Fatture in Cloud differiscono dalla bozza. Correggi importi e aliquote prima di procedere.");
    const previewId = randomUUID();
    const payload = { previewId, version: invoice.updatedAt.toISOString(), expires: Date.now() + 600000, request };
    await db.$transaction(async tx => {
      await ensureTxPermission(tx, orgId, userId);
      await tx.$queryRaw`SELECT "organizationId" FROM "InvoicingConnection" WHERE "organizationId" = ${orgId} FOR UPDATE`;
      const currentConnection = await tx.invoicingConnection.findUnique({ where: { organizationId: orgId } });
      if (currentConnection?.companyId !== connection.companyId) throw new CrmError("Collegamento cambiato. Riprova.");
      await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${invoice.id} AND "organizationId" = ${orgId} FOR UPDATE`;
      const current = await tx.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
      if (current.updatedAt.getTime() !== invoice.updatedAt.getTime() || current.status !== "DRAFT") throw new CrmError("Bozza modificata. Ricarica la pagina.");
      const old = await tx.invoiceExport.findUnique({ where: { invoiceId: invoice.id } });
      if (old && (old.documentId || !["PREPARED", "FAILED"].includes(old.status))) throw new CrmError("Documento già collegato o operazione da verificare. Aggiorna lo stato.");
      await tx.invoiceExport.upsert({ where: { invoiceId: invoice.id }, create: { invoiceId: invoice.id, organizationId: orgId, companyId: connection.companyId!, status: "PREPARED", payload: payload as Prisma.InputJsonValue }, update: { status: "PREPARED", payload: payload as Prisma.InputJsonValue, error: null } });
    });
    return { data: { previewId, invoiceId: invoice.id, company: connection.companyName ?? "Azienda collegata", recipient: fields.recipientName, total: Number(invoice.total), currency: invoice.currency } };
  } catch (error) { return { error: featureError(error) }; }
}

async function saveRemoteDocument(invoiceId: string, orgId: string, document: FicDocument) {
  return db.$transaction(async tx => {
    const previous = await tx.invoiceExport.findUniqueOrThrow({ where: { invoiceId, organizationId: orgId } });
    const stillUncertain = ["UNKNOWN", "SENDING"].includes(previous.status) && previous.documentId !== null && document.ei_status === "not_sent";
    // Un invio confermato non torna mai indietro. Dopo un invio riuscito il gestionale puo'
    // riportare ancora ei_status "not_sent" finche' la sua coda non aggiorna il documento:
    // riportare la riga a CREATED riaprirebbe il pulsante di invio e la fattura partirebbe
    // allo SdI una seconda volta.
    const alreadySent = previous.status === "SENT";
    const sent = ["attempt", "sent", "pending", "processing", "not_delivered", "accepted", "rejected", "no_response", "manual_accepted", "manual_rejected"].includes(document.ei_status ?? "");
    const row = await tx.invoiceExport.update({ where: { invoiceId, organizationId: orgId }, data: { documentId: document.id, remoteNumber: String(document.number) + (document.numeration ?? ""), remoteTotal: document.amount_gross, eInvoiceStatus: document.ei_status ?? null, status: alreadySent ? "SENT" : stillUncertain ? "UNKNOWN" : "CREATED", error: stillUncertain ? "Il precedente invio resta incerto. Attendi l’aggiornamento del gestionale prima di procedere." : null } });
    const fiscal = z.object({ name: z.string(), vat_number: z.string(), tax_code: z.string(), address_street: z.string(), address_city: z.string(), ei_code: z.string(), certified_email: z.string() }).parse(payloadSchema.parse(previous.payload).request.data.entity);
    if (!previous.documentId) await tx.invoice.updateMany({ where: { id: invoiceId, organizationId: orgId, status: "DRAFT" }, data: { recipientName: fiscal.name, recipientVat: fiscal.vat_number || fiscal.tax_code, recipientAddress: fiscal.address_street, recipientCity: fiscal.address_city, recipientSdi: fiscal.certified_email || fiscal.ei_code } });
    if (sent) await tx.invoice.updateMany({ where: { id: invoiceId, organizationId: orgId, status: "DRAFT" }, data: { status: "SENT" } });
    return row;
  });
}
export async function createInvoiceInCloud(invoiceId: string, previewId: string) {
  try {
    const { orgId, userId } = await featureAccess("write", "invoicing"); idSchema.parse(invoiceId); z.uuid().parse(previewId);
    const connection = await ficConnection(orgId);
    const payload = await db.$transaction(async tx => {
      await ensureTxPermission(tx, orgId, userId);
      await tx.$queryRaw`SELECT "organizationId" FROM "InvoicingConnection" WHERE "organizationId" = ${orgId} FOR UPDATE`;
      if ((await tx.invoicingConnection.findUnique({ where: { organizationId: orgId } }))?.companyId !== connection.companyId) throw new CrmError("Collegamento cambiato. Riprova.");
      await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${invoiceId} AND "organizationId" = ${orgId} FOR UPDATE`;
      const row = await tx.invoiceExport.findFirst({ where: { invoiceId, organizationId: orgId } });
      if (!row || row.companyId !== connection.companyId) throw new CrmError("Anteprima non disponibile");
      if (row.documentId) return null;
      const prepared = payloadSchema.parse(row.payload);
      if (row.status !== "PREPARED" || prepared.previewId !== previewId || prepared.expires < Date.now()) throw new CrmError("Anteprima scaduta, sostituita o operazione già avviata. Aggiorna lo stato.");
      const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, organizationId: orgId, status: "DRAFT", updatedAt: new Date(prepared.version) } });
      if (!invoice) throw new CrmError("Bozza cambiata dopo l’anteprima. Ricarica la pagina.");
      await tx.invoiceExport.update({ where: { invoiceId }, data: { status: "CREATING", error: null } });
      return prepared;
    });
    if (!payload) return { ok: true };
    try {
      const response = await ficRequest<{ data: unknown }>(connection.token, "/c/" + connection.companyId + "/issued_documents", "POST", payload.request);
      const parsed = ficDocumentSchema.safeParse(response.data);
      if (!parsed.success) throw new FicError("Documento creato con risposta incompleta. Riconcilia lo stato prima di procedere.", true);
      if (parsed.data.subject !== "Pipely:" + invoiceId || parsed.data.currency.id !== "EUR") throw new FicError("Risposta del gestionale non coerente. Riconcilia il documento.", true);
      await saveRemoteDocument(invoiceId, orgId, parsed.data);
    } catch (error) {
      await db.invoiceExport.updateMany({ where: { invoiceId, organizationId: orgId, status: "CREATING" }, data: { status: error instanceof FicError && !error.uncertain ? "FAILED" : "UNKNOWN", error: featureError(error) } });
      throw error;
    }
    revalidatePath("/invoices/" + invoiceId); return { ok: true };
  } catch (error) { return { error: featureError(error) }; }
}

export async function refreshInvoiceExport(invoiceId: string) {
  try {
    const { orgId } = await featureAccess("write", "invoicing"); idSchema.parse(invoiceId);
    const row = await db.invoiceExport.findFirst({ where: { invoiceId, organizationId: orgId } });
    if (!row) throw new CrmError("Nessun documento collegato");
    if (["CREATING", "SENDING"].includes(row.status) && row.updatedAt.getTime() > Date.now() - 120000) throw new CrmError("Operazione ancora in corso. Attendi prima di aggiornare.");
    const connection = await ficConnection(orgId); if (connection.companyId !== row.companyId) throw new CrmError("Ricollega l’azienda originaria.");
    let documentId = row.documentId;
    if (!documentId) {
      const query = new URLSearchParams({ type: "invoice", q: "subject = 'Pipely:" + invoiceId.replace(/'/g, "") + "'", fieldset: "detailed", per_page: "10" });
      const response = await ficRequest<{ data: unknown[] }>(connection.token, "/c/" + row.companyId + "/issued_documents?" + query);
      const matches = z.array(ficDocumentSchema).parse(response.data).filter(document => document.subject === "Pipely:" + invoiceId);
      if (matches.length !== 1) throw new CrmError(matches.length > 1 ? "Più documenti trovati: verifica in Fatture in Cloud." : "Documento non trovato. Verifica in Fatture in Cloud: la creazione resta bloccata per evitare duplicati.");
      documentId = matches[0]!.id;
    }
    const response = await ficRequest<{ data: unknown }>(connection.token, "/c/" + row.companyId + "/issued_documents/" + documentId + "?fieldset=detailed");
    const document = ficDocumentSchema.parse(response.data);
    if (document.subject !== "Pipely:" + invoiceId) throw new CrmError("Il documento non corrisponde alla fattura Pipely.");
    await saveRemoteDocument(invoiceId, orgId, document);
    revalidatePath("/invoices/" + invoiceId); return { ok: true };
  } catch (error) { return { error: featureError(error) }; }
}

export async function sendInvoiceToSdi(invoiceId: string) {
  try {
    const { orgId, userId } = await featureAccess("write", "invoicing"); idSchema.parse(invoiceId);
    const connection = await ficConnection(orgId);
    const row = await db.$transaction(async tx => {
      await ensureTxPermission(tx, orgId, userId);
      await tx.$queryRaw`SELECT "organizationId" FROM "InvoicingConnection" WHERE "organizationId" = ${orgId} FOR UPDATE`;
      if ((await tx.invoicingConnection.findUnique({ where: { organizationId: orgId } }))?.companyId !== connection.companyId) throw new CrmError("Collegamento cambiato");
      await tx.$queryRaw`SELECT "invoiceId" FROM "InvoiceExport" WHERE "invoiceId" = ${invoiceId} AND "organizationId" = ${orgId} FOR UPDATE`;
      const row = await tx.invoiceExport.findFirst({ where: { invoiceId, organizationId: orgId } });
      if (!row?.documentId || row.companyId !== connection.companyId || row.status !== "CREATED" || row.eInvoiceStatus !== "not_sent") throw new CrmError("Documento non inviabile. Aggiorna lo stato o correggilo in Fatture in Cloud.");
      const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, organizationId: orgId, status: { not: "CANCELLED" } } });
      if (!invoice || !row.remoteTotal?.eq(invoice.total)) throw new CrmError("Totali non coerenti. Verifica il documento nel gestionale.");
      await tx.invoiceExport.update({ where: { invoiceId }, data: { status: "SENDING", error: null } });
      return row;
    });
    let sendStarted = false;
    try {
      const base = "/c/" + row.companyId + "/issued_documents/" + row.documentId;
      const remote = ficDocumentSchema.parse((await ficRequest<{ data: unknown }>(connection.token, base + "?fieldset=detailed")).data);
      const invoice = await db.invoice.findUniqueOrThrow({ where: { id: invoiceId, organizationId: orgId } });
      if (remote.subject !== "Pipely:" + invoiceId || remote.ei_status !== "not_sent" || !remote.e_invoice || remote.currency.id !== "EUR" || !new Prisma.Decimal(remote.amount_gross).eq(invoice.total) || !new Prisma.Decimal(remote.amount_net).eq(invoice.subtotal) || !new Prisma.Decimal(remote.amount_vat).eq(invoice.taxAmount)) throw new CrmError("Il documento è cambiato nel gestionale o non è più inviabile. Aggiorna lo stato.");
      const exportedPayload = payloadSchema.parse(row.payload);
      const recipient = z.object({ vat_number: z.string(), tax_code: z.string() }).parse(exportedPayload.request.data.entity);
      if (normalizeItalianVat(remote.entity?.vat_number ?? "") !== recipient.vat_number || (remote.entity?.tax_code ?? "").toUpperCase() !== recipient.tax_code) throw new CrmError("Il destinatario nel gestionale è cambiato. Verifica il documento prima di inviarlo.");
      const verified = await ficRequest<{ data?: { success?: boolean } }>(connection.token, base + "/e_invoice/xml_verify");
      if (verified.data?.success !== true) throw new CrmError("Il tracciato non supera la validazione. Correggilo in Fatture in Cloud.");
      await featureAccess("write", "invoicing");
      sendStarted = true;
      const sent = await ficRequest<{ data?: { name?: string; date?: string } }>(connection.token, base + "/e_invoice/send", "POST", {});
      if (!sent.data || (!sent.data.name && !sent.data.date)) throw new FicError("Invio non confermato dal servizio: aggiorna lo stato.", true);
      await db.$transaction(async tx => {
        await tx.invoiceExport.update({ where: { invoiceId }, data: { status: "SENT", eInvoiceStatus: "pending", error: null } });
        await tx.invoice.updateMany({ where: { id: invoiceId, organizationId: orgId, status: "DRAFT" }, data: { status: "SENT" } });
      });
    } catch (error) {
      const uncertain = sendStarted && (!(error instanceof FicError) || error.uncertain);
      await db.invoiceExport.updateMany({ where: { invoiceId, organizationId: orgId, status: "SENDING" }, data: { status: uncertain ? "UNKNOWN" : "CREATED", error: featureError(error) } });
      throw error;
    }
    revalidatePath("/invoices/" + invoiceId); return { ok: true };
  } catch (error) { return { error: featureError(error) }; }
}
