import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { db, startDatabase, closeDatabase } from "./database";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), chat: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/db", async () => await import("./database"));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/openrouter", () => ({ chatCompletion: mocks.chat }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/workflow-wake", () => ({ wakeWorkflows: vi.fn() }));
vi.mock("@/lib/webhook-delivery", () => ({ dispatchWebhook: vi.fn(async () => {}) }));
vi.mock("@/lib/rate-limit", () => ({ withApiKeyRateLimit: vi.fn(async () => null) }));
import { prepareCrmCommand, executeCrmCommand } from "@/server/actions/crm-commands";
import { findCompanySuggestions } from "@/server/actions/company-autofill";
import { listVoiceNotes, saveVoiceTranscript, deleteVoiceNote, updateVoiceNoteDetails } from "@/server/actions/voice";
import { POST as uploadVoice } from "@/app/api/voice/route";
import { GET as audioDownload } from "@/app/api/voice/[id]/route";
import { POST as transcription } from "@/app/api/voice/[id]/transcribe/route";
import { POST as oauthConnect } from "@/app/api/integrations/fatture-in-cloud/connect/route";
import { GET as oauthCallback } from "@/app/api/integrations/fatture-in-cloud/callback/route";
import { prepareInvoiceExport, createInvoiceInCloud, sendInvoiceToSdi, refreshInvoiceExport, selectInvoicingCompany, getInvoicingSettings } from "@/server/actions/invoicing";
import { deleteInvoice, updateInvoiceStatus } from "@/server/actions/invoices";
import { sealIntegration, openIntegration } from "@/lib/integration-crypto";
import { crmTransaction } from "@/lib/crm-transaction";
import { mergeContactRecords } from "@/lib/merge-contacts";
import { todayInItaly } from "@/lib/invoice-utils";
import type { InvoiceExportInput } from "@/lib/invoicing-schema";

const orgId = "features-a", userId = "features-owner";
const vat = "12345678903";
const remote = { id: 100, type: "invoice", number: 8, numeration: "/P", amount_gross: 122, amount_net: 100, amount_vat: 22, currency: { id: "EUR" }, subject: "Pipely:features-invoice", ei_status: "not_sent", e_invoice: true, entity: { vat_number: vat, tax_code: "" } };
const exportInput: InvoiceExportInput = { invoiceId: "features-invoice", recipientName: "Studio Cliente", vatNumber: vat, taxCode: "", address: "Via Roma 10", city: "Milano", postalCode: "20100", province: "MI", sdiCode: "0000000", pec: "", paymentCode: "MP05", numeration: "/P", vatIds: [1] };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
function fetchResponse(url: string, init?: RequestInit) {
  if (url.endsWith("/oauth/token")) return json({ access_token: "a/refreshed", refresh_token: "r/refreshed", expires_in: 86400 });
  if (url.includes("/user/companies")) return json({ data: { companies: [{ id: 10, name: "Studio Emittente", vat_number: vat, type: "company" }] } });
  if (url.includes("/issued_documents/info")) return json({ data: { vat_types_list: [{ id: 1, value: 22, e_invoice: true }], default_values: {} } });
  if (url.endsWith("/issued_documents/totals")) return json({ data: { amount_gross: 122, amount_net: 100, amount_vat: 22 } });
  if (url.includes("xml_verify")) return json({ data: { success: true } });
  if (url.endsWith("/e_invoice/send")) return json({ data: { name: "sent", date: "2026-09-07" } });
  if (url.endsWith("/issued_documents") && init?.method === "POST") return json({ data: remote });
  if (url.includes("/issued_documents/100")) return json({ data: remote });
  if (url.includes("/issued_documents?")) return json({ data: [remote] });
  if (url.includes("/audio/transcriptions")) return json({ text: "Richiama il cliente domani alle dieci." });
  throw new Error("Unexpected fixture request " + url);
}
beforeAll(startDatabase);
afterAll(async () => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); await closeDatabase(); });
beforeEach(async () => {
  vi.clearAllMocks(); vi.stubGlobal("fetch", mocks.fetch); mocks.fetch.mockImplementation(fetchResponse);
  vi.stubEnv("INTEGRATIONS_ENCRYPTION_KEY", "fixture-integration-secret-with-more-than-32-chars");
  vi.stubEnv("OPENROUTER_API_KEY", "fixture-no-real-provider");
  vi.stubEnv("FIC_CLIENT_ID", "fixture-client"); vi.stubEnv("FIC_CLIENT_SECRET", "fixture-secret"); vi.stubEnv("FIC_REDIRECT_URI", "http://localhost/api/integrations/fatture-in-cloud/callback");
  await db.note.deleteMany({ where: { authorId: userId } });
  await db.organization.deleteMany({ where: { id: { in: [orgId, "features-b"] } } });
  await db.organization.createMany({ data: [{ id: orgId, name: "Studio Emittente", slug: orgId, plan: "PRO", vatNumber: vat }, { id: "features-b", name: "Esterno", slug: "features-b", plan: "PRO" }] });
  await db.user.createMany({ data: [{ id: userId, email: "features-owner@example.test", organizationId: orgId, role: "OWNER" }, { id: "features-other", email: "features-other@example.test", organizationId: "features-b", role: "OWNER" }, { id: "features-sales", email: "features-sales@example.test", organizationId: orgId, role: "SALES" }] });
  await db.pipeline.create({ data: { id: "features-pipeline", name: "Vendite", organizationId: orgId } });
  await db.stage.createMany({ data: [{ id: "features-stage", name: "Nuovo", pipelineId: "features-pipeline", position: 0 }, { id: "features-next", name: "Proposta", pipelineId: "features-pipeline", position: 1 }] });
  await db.deal.create({ data: { id: "features-deal", title: "Consulenza Rossi", organizationId: orgId, ownerId: userId, pipelineId: "features-pipeline", stageId: "features-stage", value: 100 } });
  await db.contact.create({ data: { id: "features-contact", firstName: "Rossi", organizationId: orgId, ownerId: userId } });
  await db.invoice.create({ data: { id: "features-invoice", number: "FT-2026/001", year: 2026, progressive: 1, organizationId: orgId, createdById: userId, senderName: "Studio", senderVat: vat, recipientName: "Studio Cliente", recipientVat: vat, total: 122, subtotal: 100, taxAmount: 22, items: [{ description: "Consulenza", quantity: 1, unitPrice: 100, discount: 0, taxRate: 22, subtotal: 100, tax: 22, total: 122 }], issueDate: new Date("2026-09-07"), dueDate: new Date("2026-10-07") } });
  await db.invoicingConnection.create({ data: { organizationId: orgId, accessToken: sealIntegration("a/fixture", "fic:" + orgId), companyId: 10, companyName: "Studio", companyVat: vat } });
  mocks.auth.mockResolvedValue({ user: { id: userId, organizationId: orgId, role: "OWNER" } });
  mocks.chat.mockResolvedValue(JSON.stringify({ actions: [{ type: "CREATE_NOTE", content: "Cliente interessato" }, { type: "CREATE_ACTIVITY", subject: "Richiamare Rossi", activityType: "CALL", dueLocal: "2030-09-08T10:00", notes: "" }, { type: "UPDATE_DEAL", status: "WON", value: 4000 }] }));
});
async function previewCommand() { const result = await prepareCrmCommand({ kind: "deal", targetId: "features-deal", text: "Aggiungi nota cliente interessato, richiama Rossi l’8 settembre 2030 alle 10, segna vinto a 4000 euro" }); expect(result.error).toBeUndefined(); return result.data!; }
async function preparedExport() { const result = await prepareInvoiceExport(exportInput); expect(result.error).toBeUndefined(); return result.data!; }
async function createdExport() { const preview = await preparedExport(); expect(await createInvoiceInCloud(preview.invoiceId, preview.previewId)).toEqual({ ok: true }); return preview; }
function upload(id = "cbf124a9-2219-45e3-9835-4876b75c41b1", linkedId = "features-deal", kind: "deal" | "contact" = "deal") {
  const form = new FormData(); form.set("id", id); form.set("title", "Incontro Rossi"); form.set("duration", "15"); form.set("dealId", kind === "deal" ? linkedId : ""); form.set("contactId", kind === "contact" ? linkedId : ""); form.set("audio", new Blob([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0, 0, 0, 0, 0])], { type: "audio/webm" }), "nota.webm");
  return uploadVoice(new NextRequest("http://localhost/api/voice", { method: "POST", body: form, headers: { origin: "http://localhost" } }));
}
describe("comandi CRM confermati", () => {
  it("anteprima senza modifiche, esecuzione atomica e ripetizione senza duplicati", async () => {
    const preview = await previewCommand(); expect(await db.note.count({ where: { authorId: userId } })).toBe(0);
    const [one, two] = await Promise.all([executeCrmCommand(preview.id), executeCrmCommand(preview.id)]);
    expect(one.ok).toBe(true); expect(two.ok).toBe(true);
    expect(await db.note.count({ where: { authorId: userId } })).toBe(1);
    expect(await db.activity.count({ where: { organizationId: orgId } })).toBe(1);
    expect((await db.deal.findUniqueOrThrow({ where: { id: "features-deal" } })).status).toBe("WON");
    expect((await db.activity.findFirstOrThrow({ where: { organizationId: orgId } })).dueDate?.toISOString()).toBe("2030-09-08T08:00:00.000Z");
  });
  it("rifiuta anteprime obsolete senza scritture parziali", async () => {
    const preview = await previewCommand();
    await db.deal.update({ where: { id: "features-deal" }, data: { title: "Modificato" } });
    expect((await executeCrmCommand(preview.id)).error).toContain("cambiato");
    expect(await db.note.count({ where: { authorId: userId } })).toBe(0);
  });
  it("ricontrolla ruolo revocato e downgrade del piano dopo l’anteprima", async () => {
    const preview = await previewCommand();
    await db.user.update({ where: { id: userId }, data: { role: "VIEWER" } });
    expect((await executeCrmCommand(preview.id)).error).toBeTruthy();
    await db.user.update({ where: { id: userId }, data: { role: "OWNER" } });
    await db.organization.update({ where: { id: orgId }, data: { plan: "STARTER" } });
    expect((await executeCrmCommand(preview.id)).error).toContain("Pro");
  });
  it("nega esecuzione e destinazioni di altre organizzazioni", async () => {
    const preview = await previewCommand(); mocks.auth.mockResolvedValue({ user: { id: "features-other", organizationId: "features-b", role: "OWNER" } });
    expect((await executeCrmCommand(preview.id)).error).toBeTruthy();
    expect((await prepareCrmCommand({ kind: "deal", targetId: "features-deal", text: "Segna vinto" })).error).toBeTruthy();
  });
  it("applica quota AI e rifiuta modifiche fuori ambito", async () => {
    mocks.chat.mockResolvedValue(JSON.stringify({ actions: [{ type: "DELETE_COMPANY", id: "x" }] }));
    expect((await prepareCrmCommand({ kind: "deal", targetId: "features-deal", text: "elimina tutto" })).error).toContain("ambiguo");
    await db.aiUsageDay.update({ where: { organizationId_day: { organizationId: orgId, day: todayInItaly() } }, data: { calls: 50 } });
    expect((await prepareCrmCommand({ kind: "deal", targetId: "features-deal", text: "segna vinto" })).error).toContain("50");
  });
  it("accoda le automazioni conseguenti alle modifiche del comando", async () => {
    await db.workflow.create({ data: { name: "Vinto", organizationId: orgId, isActive: true, trigger: { type: "DEAL_WON" }, steps: [{ id: "notify", action: { type: "SEND_NOTIFICATION", message: "Vinto" } }] } });
    const preview = await previewCommand(); await executeCrmCommand(preview.id);
    expect(await db.workflowQueue.count({ where: { orgId } })).toBe(1);
  });
});
describe("note vocali e dati locali", () => {
  it("salva e restituisce audio privato senza duplicare un upload ripetuto", async () => {
    expect((await upload()).status).toBe(200); expect((await upload()).status).toBe(200);
    expect((await listVoiceNotes()).data).toHaveLength(1);
    const audio = await audioDownload(new Request("http://localhost"), { params: Promise.resolve({ id: "cbf124a9-2219-45e3-9835-4876b75c41b1" }) });
    expect(audio.status).toBe(200); expect(audio.headers.get("cache-control")).toContain("no-store"); expect((await audio.arrayBuffer()).byteLength).toBe(12);
  });
  it("nega upload collegato ad altri record e lettura di audio esterno", async () => {
    expect((await upload(undefined, "foreign-deal")).status).toBe(400); await upload();
    mocks.auth.mockResolvedValue({ user: { id: "features-other", organizationId: "features-b", role: "OWNER" } });
    expect((await audioDownload(new Request("http://localhost"), { params: Promise.resolve({ id: "cbf124a9-2219-45e3-9835-4876b75c41b1" }) })).status).toBe(404);
    expect((await listVoiceNotes()).data).toEqual([]);
  });
  it("trascrive una sola volta e lascia disponibile la nota in caso di errore", async () => {
    await upload(); const id = "cbf124a9-2219-45e3-9835-4876b75c41b1";
    const request = () => new NextRequest("http://localhost/api/voice/" + id + "/transcribe", { method: "POST", headers: { origin: "http://localhost" } });
    mocks.fetch.mockRejectedValueOnce(new Error("temporary provider failure"));
    expect((await transcription(request(), { params: Promise.resolve({ id }) })).status).toBe(400);
    const failedNote = await db.voiceNote.findUniqueOrThrow({ where: { id } });
    expect(failedNote.transcribingAt).toBeNull(); expect(failedNote.transcript).toBe(""); expect(failedNote.audio.byteLength).toBeGreaterThan(0);
    mocks.fetch.mockClear();
    expect((await transcription(request(), { params: Promise.resolve({ id }) })).status).toBe(200);
    expect((await transcription(request(), { params: Promise.resolve({ id }) })).status).toBe(200);
    expect(mocks.fetch.mock.calls.filter(([url]) => String(url).includes("transcriptions"))).toHaveLength(1);
    expect((await saveVoiceTranscript(id, "Testo corretto")).ok).toBe(true);
    expect((await listVoiceNotes()).data?.[0]?.transcript).toBe("Testo corretto");
    expect((await deleteVoiceNote(id)).ok).toBe(true);
  });
  it("rispetta il limite Starter e non consente trascrizione AI", async () => {
    await db.organization.update({ where: { id: orgId }, data: { plan: "STARTER" } });
    for (let i = 0; i < 10; i++) expect((await upload(crypto.randomUUID())).status).toBe(200);
    expect((await upload()).status).toBe(400);
    const id = (await listVoiceNotes()).data![0]!.id;
    const response = await transcription(new NextRequest("http://localhost/api/voice/" + id + "/transcribe", { method: "POST", headers: { origin: "http://localhost" } }), { params: Promise.resolve({ id }) });
    expect((await response.json()).error).toContain("Pro"); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("autocompleta dalla sola organizzazione senza chiamate esterne", async () => {
    await db.company.createMany({ data: [{ name: "Studio A", vatNumber: "IT 123.456.789-03", organizationId: orgId }, { name: "Segreto B", vatNumber: vat, organizationId: "features-b" }] });
    const result = await findCompanySuggestions(vat); expect(result.data).toHaveLength(1); expect(result.data?.[0]?.fields.name).toBe("Studio A"); expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
describe("conservazione e collegamenti delle note vocali", () => {
  it("rinomina e ricollega senza alterare audio e trascrizione, con permessi e organizzazione correnti", async () => {
    await upload(); const id = "cbf124a9-2219-45e3-9835-4876b75c41b1";
    await saveVoiceTranscript(id, "Testo conservato");
    const before = await db.voiceNote.findUniqueOrThrow({ where: { id } });
    expect((await updateVoiceNoteDetails({ id, title: "Titolo corretto", kind: "contact", targetId: "features-contact" })).ok).toBe(true);
    const after = await db.voiceNote.findUniqueOrThrow({ where: { id } });
    expect(after.contactId).toBe("features-contact"); expect(after.dealId).toBeNull(); expect(after.audio).toEqual(before.audio); expect(after.transcript).toBe(before.transcript);
    expect((await listVoiceNotes()).data?.[0]?.targetName).toBe("Rossi");
    expect((await updateVoiceNoteDetails({ id, title: "Non applicare", kind: "contact", targetId: "missing-or-foreign" })).error).toBeTruthy();
    mocks.auth.mockResolvedValue({ user: { id: "features-sales", organizationId: orgId, role: "SALES" } });
    expect((await updateVoiceNoteDetails({ id, title: "Non consentito", kind: "none", targetId: "" })).error).toBeTruthy();
    expect((await db.voiceNote.findUniqueOrThrow({ where: { id } })).title).toBe("Titolo corretto");
  });
  it("trasferisce la nota al contatto principale durante un’unione", async () => {
    const id = "cbf124a9-2219-45e3-9835-4876b75c41b1";
    await db.contact.create({ data: { id: "features-duplicate", firstName: "Duplicato", organizationId: orgId, ownerId: userId } });
    await upload(id, "features-duplicate", "contact");
    await crmTransaction(tx => mergeContactRecords(tx, orgId, userId, "features-contact", "features-duplicate", {}));
    expect(await db.contact.findUnique({ where: { id: "features-duplicate" } })).toBeNull();
    expect((await db.voiceNote.findUniqueOrThrow({ where: { id } })).contactId).toBe("features-contact");
    expect((await listVoiceNotes()).data?.[0]?.targetName).toBe("Rossi");
  });
  it("conserva la registrazione se il contatto viene eliminato e rifiuta riferimenti inesistenti", async () => {
    const id = "cbf124a9-2219-45e3-9835-4876b75c41b1";
    await upload(id, "features-contact", "contact");
    await db.contact.delete({ where: { id: "features-contact" } });
    const note = await db.voiceNote.findUniqueOrThrow({ where: { id } });
    expect(note.contactId).toBeNull(); expect(note.audio.byteLength).toBeGreaterThan(0);
    await expect(db.$transaction(tx => tx.voiceNote.update({ where: { id }, data: { contactId: "does-not-exist" } }))).rejects.toThrow();
  });
  it("non propone comandi sull’affare eliminato e conserva l’audio anche dopo rimozione definitiva", async () => {
    await upload(); const id = "cbf124a9-2219-45e3-9835-4876b75c41b1";
    await db.deal.update({ where: { id: "features-deal" }, data: { status: "DELETED" } });
    expect((await listVoiceNotes()).data?.[0]?.dealId).toBeNull();
    expect((await updateVoiceNoteDetails({ id, title: "Nota", kind: "deal", targetId: "features-deal" })).error).toBeTruthy();
    await db.deal.delete({ where: { id: "features-deal" } });
    expect((await db.voiceNote.findUniqueOrThrow({ where: { id } })).dealId).toBeNull();
  });
});

describe("fatturazione Fatture in Cloud", () => {
  it("confronta i totali prima della creazione e invia soltanto dopo un secondo comando", async () => {
    const preview = await preparedExport(); expect(mocks.fetch.mock.calls.some(([url]) => String(url).endsWith("/e_invoice/send"))).toBe(false);
    await createInvoiceInCloud(preview.invoiceId, preview.previewId); await createInvoiceInCloud(preview.invoiceId, preview.previewId);
    expect(mocks.fetch.mock.calls.filter(([url]) => String(url).endsWith("/issued_documents"))).toHaveLength(1);
    expect((await sendInvoiceToSdi(preview.invoiceId)).ok).toBe(true);
    expect((await sendInvoiceToSdi(preview.invoiceId)).error).toBeTruthy();
    expect((await db.invoice.findUniqueOrThrow({ where: { id: preview.invoiceId } })).status).toBe("SENT");
  });
  it("congela la creazione incerta e riconcilia il documento esistente", async () => {
    const preview = await preparedExport();
    mocks.fetch.mockImplementation((url: string, init?: RequestInit) => url.endsWith("/issued_documents") ? Promise.reject(new Error("connection lost")) : fetchResponse(url, init));
    expect((await createInvoiceInCloud(preview.invoiceId, preview.previewId)).error).toBeTruthy();
    expect((await db.invoiceExport.findUniqueOrThrow({ where: { invoiceId: preview.invoiceId } })).status).toBe("UNKNOWN");
    expect((await createInvoiceInCloud(preview.invoiceId, preview.previewId)).error).toBeTruthy();
    expect((await refreshInvoiceExport(preview.invoiceId)).ok).toBe(true);
    expect((await db.invoiceExport.findUniqueOrThrow({ where: { invoiceId: preview.invoiceId } })).documentId).toBe(100);
  });
  it("non reinvia automaticamente un invio incerto ancora non visibile al provider", async () => {
    const preview = await createdExport();
    mocks.fetch.mockImplementation((url: string, init?: RequestInit) => url.endsWith("/e_invoice/send") ? Promise.reject(new Error("lost response")) : fetchResponse(url, init));
    expect((await sendInvoiceToSdi(preview.invoiceId)).error).toBeTruthy();
    await refreshInvoiceExport(preview.invoiceId);
    expect((await db.invoiceExport.findUniqueOrThrow({ where: { invoiceId: preview.invoiceId } })).status).toBe("UNKNOWN");
    expect((await sendInvoiceToSdi(preview.invoiceId)).error).toBeTruthy();
  });
  it("non invia un XML non valido e non annulla una fattura già creata nel gestionale", async () => {
    const preview = await createdExport();
    mocks.fetch.mockImplementation((url: string, init?: RequestInit) => url.includes("xml_verify") ? json({ data: { success: false } }) : fetchResponse(url, init));
    expect((await sendInvoiceToSdi(preview.invoiceId)).error).toContain("validazione");
    expect(mocks.fetch.mock.calls.some(([url]) => String(url).endsWith("/e_invoice/send"))).toBe(false);
    expect((await deleteInvoice(preview.invoiceId)).error).toBeTruthy();
    expect((await updateInvoiceStatus(preview.invoiceId, "SENT")).error).toBeTruthy();
  });
  it("blocca un totale discordante, il cambio di azienda e i permessi revocati", async () => {
    mocks.fetch.mockImplementation((url: string, init?: RequestInit) => url.endsWith("/totals") ? json({ data: { amount_gross: 123, amount_net: 100, amount_vat: 23 } }) : fetchResponse(url, init));
    expect((await prepareInvoiceExport(exportInput)).error).toContain("differiscono");
    expect(await db.invoiceExport.count({ where: { organizationId: orgId } })).toBe(0);
    expect((await selectInvoicingCompany(99)).error).toBeTruthy();
    await db.user.update({ where: { id: userId }, data: { role: "VIEWER" } });
    expect((await prepareInvoiceExport(exportInput)).error).toBeTruthy();
  });
  it("rifiuta piani insufficienti e non espone i token nelle impostazioni", async () => {
    expect(JSON.stringify(await getInvoicingSettings())).not.toContain("accessToken");
    await db.organization.update({ where: { id: orgId }, data: { plan: "STARTER" } });
    expect((await prepareInvoiceExport(exportInput)).error).toContain("Pro");
  });
  it("non sostituisce il collegamento OAuth durante la creazione di una fattura", async () => {
    await preparedExport();
    await db.invoiceExport.update({ where: { invoiceId: exportInput.invoiceId }, data: { status: "CREATING" } });
    const before = await db.invoicingConnection.findUniqueOrThrow({ where: { organizationId: orgId } });
    const response = await oauthConnect(new NextRequest("http://localhost/api/integrations/fatture-in-cloud/connect", { method: "POST", headers: { origin: "http://localhost" } }));
    const authUrl = new URL((await response.json()).url);
    const cookie = response.cookies.get("pipely_fic_oauth")!.value;
    const callback = await oauthCallback(new NextRequest("http://localhost/api/integrations/fatture-in-cloud/callback?code=c/test&state=" + authUrl.searchParams.get("state"), { headers: { cookie: "pipely_fic_oauth=" + cookie } }));
    expect(callback.headers.get("location")).toContain("connection=error");
    expect((await db.invoicingConnection.findUniqueOrThrow({ where: { organizationId: orgId } })).accessToken).toBe(before.accessToken);
  });
  it("valida stato OAuth, appartenenza e memorizza solo token cifrati", async () => {
    const response = await oauthConnect(new NextRequest("http://localhost/api/integrations/fatture-in-cloud/connect", { method: "POST", headers: { origin: "http://localhost" } }));
    expect(response.status).toBe(200);
    const authUrl = new URL((await response.json()).url); const cookie = response.cookies.get("pipely_fic_oauth")!.value;
    const invalid = await oauthCallback(new NextRequest("http://localhost/api/integrations/fatture-in-cloud/callback?code=c/test&state=bad", { headers: { cookie: "pipely_fic_oauth=" + cookie } }));
    expect(invalid.headers.get("location")).toContain("connection=error"); expect(mocks.fetch).not.toHaveBeenCalled();
    const valid = await oauthCallback(new NextRequest("http://localhost/api/integrations/fatture-in-cloud/callback?code=c/test&state=" + authUrl.searchParams.get("state"), { headers: { cookie: "pipely_fic_oauth=" + cookie } }));
    expect(valid.headers.get("location")).toContain("connection=success");
    const stored = await db.invoicingConnection.findUniqueOrThrow({ where: { organizationId: orgId } }); expect(stored.accessToken).not.toBe("a/refreshed"); expect(openIntegration(stored.accessToken, "fic:" + orgId)).toBe("a/refreshed");
  });
});
