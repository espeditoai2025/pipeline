import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { createInvoiceSchema, defaultInvoiceDueDate, paymentSchema, todayInItaly } from "@/lib/invoice-utils";
import { roundMoney } from "@/lib/invoice-payments";

const mocks = vi.hoisted(() => {
  const model = () => ({ findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), aggregate: vi.fn(), groupBy: vi.fn(), count: vi.fn() });
  return { auth: vi.fn(), revalidate: vi.fn(), db: { invoice: model(), invoicePayment: model(), deal: model(), $queryRaw: vi.fn(), $transaction: vi.fn() } };
});
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { getInvoiceWorkspace, recordInvoicePayment, updateInvoiceDueDate, voidInvoicePayment } from "@/server/actions/invoice-workspace";
import { createInvoiceFromDeal, deleteInvoice, generateFatturaPAXml, updateInvoiceStatus } from "@/server/actions/invoices";

const decimal = (n: string | number) => new Prisma.Decimal(n);
const invoice = (status = "SENT", paidAmount = "0") => ({ id: "inv-a", organizationId: "org-a", status, total: decimal(122), paidAmount: decimal(paidAmount), currency: "EUR", number: "FT-2026/001", recipientName: "Studio Rossi", recipientVat: null, issueDate: new Date("2026-09-01"), dueDate: new Date("2026-09-04"), paidAt: null, deal: null });
const input = { invoiceId: "inv-a", requestId: "09116623-6160-4cce-9dc5-b64e0f2532ff", amount: "40,50", paidOn: "2026-09-05", method: "bonifico" as const, reference: "Acconto" };
const priorPayment = () => ({ id: "p1", invoiceId: "inv-a", organizationId: "org-a", amount: decimal("40.50"), paidAt: new Date("2026-09-05T12:00:00Z"), method: "bonifico", reference: "Acconto", voidedAt: null });

beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-05T21:00:00Z"));
  mocks.auth.mockResolvedValue({ user: { id: "user-a", organizationId: "org-a", role: "SALES" } });
  mocks.db.$transaction.mockImplementation(async callback => callback(mocks.db));
  mocks.db.$queryRaw.mockResolvedValue([{ id: "inv-a" }]);
  mocks.db.invoice.findFirst.mockResolvedValue(invoice());
  mocks.db.invoicePayment.findUnique.mockResolvedValue(null);
  mocks.db.invoicePayment.aggregate.mockResolvedValue({ _sum: { amount: decimal("40.50") }, _max: { paidAt: new Date("2026-09-05T12:00:00Z") } });
});
afterEach(() => vi.useRealTimers());

describe("date e importi fatture", () => {
  it("interpreta la virgola italiana, rifiuta migliaia, esponenti e date impossibili", () => {
    expect(paymentSchema.parse(input).amount).toBe("40.50");
    for (const amount of ["-1", "1.000,20", "1e3", "NaN", "1,23456"]) expect(paymentSchema.safeParse({ ...input, amount }).success).toBe(false);
    expect(paymentSchema.safeParse({ ...input, paidOn: "2026-02-30" }).success).toBe(false);
  });
  it("usa il giorno italiano e calcola scadenze attraverso mese, anno e ora legale", () => {
    expect(todayInItaly(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
    expect(defaultInvoiceDueDate("30gg", "2026-03-15")).toBe("2026-04-14");
    expect(defaultInvoiceDueDate("60gg", "2026-12-15")).toBe("2027-02-13");
    expect(defaultInvoiceDueDate("immediato", "2026-09-05")).toBe("2026-09-05");
  });
  it("arrotonda senza errori binari e rispetta i decimali della valuta", () => {
    expect(roundMoney("1.005", "EUR").toString()).toBe("1.01");
    expect(roundMoney("1.005", "JPY").toString()).toBe("1");
    expect(roundMoney("1.005", "KWD").toString()).toBe("1.005");
    expect(createInvoiceSchema.safeParse({ dealId: "a", recipientName: "  " }).success).toBe(false);
  });
});

describe("incassi protetti e saldo", () => {
  it("nega scritture ai soli lettori prima di accedere al database", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-a", organizationId: "org-a", role: "VIEWER" } });
    expect((await recordInvoicePayment(input)).error).toBe("Non autorizzato");
    expect((await voidInvoicePayment({ invoiceId: "inv-a", paymentId: "p1", reason: "Errato" })).error).toBe("Non autorizzato");
    expect((await updateInvoiceDueDate({ invoiceId: "inv-a", dueDate: "2026-10-01" })).error).toBe("Non autorizzato");
    expect((await updateInvoiceStatus("inv-a", "SENT")).error).toBe("Non autorizzato");
    expect((await deleteInvoice("inv-a")).error).toBe("Non autorizzato");
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });
  it("blocca la riga solo nell'organizzazione autorizzata e rifiuta fatture esterne", async () => {
    mocks.db.$queryRaw.mockResolvedValue([]);
    expect((await recordInvoicePayment(input)).error).toBe("Fattura non trovata");
    const args = mocks.db.$queryRaw.mock.calls[0]!;
    expect(args.slice(1)).toEqual(["inv-a", "org-a"]);
    expect(args[0].join("")).toContain("FOR UPDATE");
    expect(mocks.db.invoicePayment.create).not.toHaveBeenCalled();
  });
  it.each(["0", "0.001", "122.01"])("rifiuta importo %s senza movimento", async amount => {
    expect((await recordInvoicePayment({ ...input, amount })).error).toBeTruthy();
    expect(mocks.db.invoicePayment.create).not.toHaveBeenCalled();
  });
  it("rifiuta date future e documenti non aperti", async () => {
    expect((await recordInvoicePayment({ ...input, paidOn: "2026-09-06" })).error).toMatch(/futura/);
    for (const status of ["DRAFT", "CANCELLED", "PAID"]) {
      mocks.db.invoice.findFirst.mockResolvedValue(invoice(status));
      expect((await recordInvoicePayment(input)).error).toMatch(/saldo aperto/);
    }
    expect(mocks.db.invoicePayment.create).not.toHaveBeenCalled();
  });
  it("registra un acconto, autore e riferimento senza segnare il saldo", async () => {
    expect(await recordInvoicePayment(input)).toEqual({ error: null });
    const saved = mocks.db.invoicePayment.create.mock.calls[0]![0].data;
    expect(saved).toMatchObject({ invoiceId: "inv-a", organizationId: "org-a", requestId: input.requestId, createdById: "user-a", reference: "Acconto" });
    expect(saved.amount.toString()).toBe("40.5");
    expect(mocks.db.invoice.update.mock.calls[0]![0].data).toMatchObject({ status: "SENT", paidAt: null });
    expect(mocks.revalidate).toHaveBeenCalledWith("/invoices/inv-a");
  });
  it("chiude al saldo e conserva la data dell'ultimo incasso effettivo", async () => {
    const paidAt = new Date("2026-09-04T12:00:00Z");
    mocks.db.invoicePayment.aggregate.mockResolvedValue({ _sum: { amount: decimal(122) }, _max: { paidAt } });
    expect((await recordInvoicePayment({ ...input, amount: "122", paidOn: "2026-09-04" })).error).toBeNull();
    expect(mocks.db.invoice.update.mock.calls[0]![0].data).toMatchObject({ status: "PAID", paidAt });
  });
  it("ricontrolla il residuo aggiornato invece di fidarsi del modulo", async () => {
    mocks.db.invoice.findFirst.mockResolvedValue(invoice("SENT", "120"));
    expect((await recordInvoicePayment(input)).error).toMatch(/saldo residuo/);
    expect(mocks.db.invoicePayment.create).not.toHaveBeenCalled();
  });
  it("il retry identico è idempotente anche dopo il saldo", async () => {
    mocks.db.invoice.findFirst.mockResolvedValue(invoice("PAID", "122"));
    mocks.db.invoicePayment.findUnique.mockResolvedValue(priorPayment());
    expect(await recordInvoicePayment(input)).toEqual({ error: null });
    expect(mocks.db.invoicePayment.create).not.toHaveBeenCalled();
    expect(mocks.db.invoice.update).not.toHaveBeenCalled();
  });
  it("non riutilizza una chiave con dati diversi o su un movimento annullato", async () => {
    mocks.db.invoicePayment.findUnique.mockResolvedValue(priorPayment());
    expect((await recordInvoicePayment({ ...input, amount: "30" })).error).toMatch(/altro movimento/);
    mocks.db.invoicePayment.findUnique.mockResolvedValue({ ...priorPayment(), voidedAt: new Date() });
    expect((await recordInvoicePayment(input)).error).toMatch(/annullato/);
    expect(mocks.db.invoicePayment.create).not.toHaveBeenCalled();
  });
  it("la rettifica conserva motivo e autore, riaprendo il residuo", async () => {
    mocks.db.invoice.findFirst.mockResolvedValue(invoice("PAID", "122"));
    mocks.db.invoicePayment.findFirst.mockResolvedValue(priorPayment());
    mocks.db.invoicePayment.aggregate.mockResolvedValue({ _sum: { amount: decimal("81.5") }, _max: { paidAt: new Date() } });
    expect((await voidInvoicePayment({ invoiceId: "inv-a", paymentId: "p1", reason: "Registrazione duplicata" })).error).toBeNull();
    expect(mocks.db.invoicePayment.findFirst).toHaveBeenCalledWith({ where: { id: "p1", invoiceId: "inv-a", organizationId: "org-a" } });
    expect(mocks.db.invoicePayment.update.mock.calls[0]![0].data).toMatchObject({ voidReason: "Registrazione duplicata", voidedById: "user-a", voidedAt: expect.any(Date) });
    expect(mocks.db.invoice.update.mock.calls[0]![0].data).toMatchObject({ status: "SENT", paidAt: null });
    expect(mocks.db.invoicePayment.delete).not.toHaveBeenCalled();
  });
  it("non rettifica incassi di altri documenti e richiede un motivo", async () => {
    mocks.db.invoicePayment.findFirst.mockResolvedValue(null);
    expect((await voidInvoicePayment({ invoiceId: "inv-a", paymentId: "foreign", reason: "Errato" })).error).toBe("Incasso non trovato");
    expect((await voidInvoicePayment({ invoiceId: "inv-a", paymentId: "p1", reason: " " })).error).toBeTruthy();
    expect(mocks.db.invoicePayment.update).not.toHaveBeenCalled();
  });
  it("impedisce pagamento senza movimento e cancellazione di documenti inviati", async () => {
    expect((await updateInvoiceStatus("inv-a", "PAID")).error).toMatch(/registra un incasso/);
    expect((await updateInvoiceStatus("inv-a", "CANCELLED")).error).toMatch(/Solo una bozza/);
    expect((await deleteInvoice("inv-a")).error).toMatch(/soltanto una bozza/);
    expect(mocks.db.invoice.update).not.toHaveBeenCalled();
  });
  it("annulla una bozza senza riutilizzarne il progressivo", async () => {
    mocks.db.invoice.findFirst.mockResolvedValue(invoice("DRAFT"));
    expect((await deleteInvoice("inv-a")).error).toBeNull();
    expect(mocks.db.invoice.update).toHaveBeenCalledWith({ where: { id: "inv-a" }, data: { status: "CANCELLED" } });
    expect(mocks.db.invoice.delete).not.toHaveBeenCalled();
  });
});

describe("scadenzario e creazione", () => {
  it("pagina lato server e separa valute e saldi nelle somme", async () => {
    mocks.db.invoice.count.mockResolvedValue(26);
    mocks.db.invoice.findMany.mockResolvedValue([invoice()]);
    mocks.db.invoice.groupBy.mockResolvedValueOnce([
      { currency: "EUR", status: "SENT", _sum: { total: decimal(122), paidAmount: decimal(40) }, _count: { _all: 1 } },
      { currency: "USD", status: "PAID", _sum: { total: decimal(300), paidAmount: decimal(300) }, _count: { _all: 1 } },
    ]).mockResolvedValueOnce([{ currency: "EUR", _sum: { total: decimal(122), paidAmount: decimal(40) }, _count: { _all: 1 } }]);
    const result = await getInvoiceWorkspace({ q: "Rossi", filter: "overdue", page: 99 });
    expect(result).toMatchObject({ count: 26, pages: 2, page: 2, summary: [
      { currency: "EUR", outstanding: 82, received: 40, overdue: 82 }, { currency: "USD", outstanding: 0, received: 300, overdue: 0 },
    ] });
    expect(mocks.db.invoice.findMany.mock.calls[0]![0]).toMatchObject({ skip: 25, take: 25, where: { organizationId: "org-a", status: "SENT", dueDate: { lt: new Date("2026-09-05") } } });
  });
  it("non esporta XML con valori fiscali inventati", async () => {
    const result = await generateFatturaPAXml("inv-a");
    expect(result.xml).toBeNull(); expect(result.error).toMatch(/dati fiscali completi/);
  });
  it("valida dati lato server prima di caricare l'affare", async () => {
    expect((await createInvoiceFromDeal({ dealId: "a", recipientName: " ", recipientVat: "" })).error).toBeTruthy();
    expect(mocks.db.deal.findFirst).not.toHaveBeenCalled();
  });
  it("conserva la valuta dell'affare, arrotonda righe e IVA e propone la scadenza", async () => {
    mocks.db.deal.findFirst.mockResolvedValue({ id: "deal-a", currency: "USD", organization: { name: "Studio", vatNumber: "IT123" }, products: [{ quantity: 3, unitPrice: decimal("0.335"), discount: decimal(0), product: { name: "Servizio", unit: "ore", taxRate: decimal(22), currency: "USD", organizationId: "org-a" } }] });
    mocks.db.invoice.findFirst.mockResolvedValue({ progressive: 4 });
    mocks.db.invoice.create.mockResolvedValue({ id: "inv-new", number: "FT-2026/005" });
    const result = await createInvoiceFromDeal({ dealId: "deal-a", recipientName: " Cliente ", recipientVat: "" });
    expect(result.error).toBeNull();
    const data = mocks.db.invoice.create.mock.calls[0]![0].data;
    expect(data.currency).toBe("USD"); expect(data.total.toString()).toBe("1.23");
    expect(data.recipientName).toBe("Cliente"); expect(data.dueDate).toEqual(new Date("2026-10-05"));
    expect(mocks.db.deal.findFirst.mock.calls[0]![0].where).toMatchObject({ organizationId: "org-a", status: { not: "DELETED" } });
  });
  it("rifiuta prodotti in valuta diversa", async () => {
    mocks.db.deal.findFirst.mockResolvedValue({ id: "deal-a", currency: "USD", organization: { vatNumber: "123" }, products: [{ product: { currency: "EUR", organizationId: "org-a" } }] });
    expect((await createInvoiceFromDeal({ dealId: "deal-a", recipientName: "Cliente", recipientVat: "" })).error).toMatch(/stessa valuta/);
    expect(mocks.db.invoice.create).not.toHaveBeenCalled();
  });
});
