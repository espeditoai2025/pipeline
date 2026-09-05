import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const model = () => ({ findFirst: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn(), create: vi.fn(), createMany: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn() });
  return {
    auth: vi.fn(), webhook: vi.fn(), workflow: vi.fn(), revalidate: vi.fn(),
    db: { contact: model(), company: model(), deal: model(), pipeline: model(), stage: model(), activity: model(), organization: model(), $transaction: vi.fn() },
  };
});
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/server/actions/webhooks", () => ({ dispatchWebhook: mocks.webhook }));
vi.mock("@/lib/workflow-engine", () => ({ runWorkflows: mocks.workflow }));

import { createActivity, updateActivity } from "@/server/actions/activities";
import { createContact, importContacts, mergeContacts } from "@/server/actions/contacts";
import { createDeal, moveDeal, updateDeal, updateDealsStatus } from "@/server/actions/deals";
import { getDailyFocus } from "@/server/actions/daily-focus";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "user-a", organizationId: "org-a" } });
  mocks.webhook.mockResolvedValue(undefined);
  mocks.workflow.mockResolvedValue(undefined);
  for (const model of [mocks.db.company, mocks.db.contact, mocks.db.deal, mocks.db.pipeline, mocks.db.stage, mocks.db.activity]) {
    model.findFirst.mockResolvedValue(null);
    model.findMany.mockResolvedValue([]);
    model.count.mockResolvedValue(0);
  }
  mocks.db.organization.findUnique.mockResolvedValue({ plan: "STARTER" });
  mocks.db.$transaction.mockImplementation(async (callback) => callback(mocks.db));
});

describe("isolamento dei dati nelle operazioni CRM", () => {
  it("nega attività con contatto esterno prima di salvare o inviare webhook", async () => {
    const result = await createActivity({ type: "CALL", subject: "Richiamo", contactId: "foreign" });
    expect(result.error).toMatch(/Contatto non disponibile/);
    expect(mocks.db.contact.findFirst).toHaveBeenCalledWith({ where: { id: "foreign", organizationId: "org-a" }, select: { id: true } });
    expect(mocks.db.activity.create).not.toHaveBeenCalled();
    expect(mocks.webhook).not.toHaveBeenCalled();
  });
  it("nega collegamenti a un'azienda esterna nei contatti", async () => {
    expect((await createContact({ firstName: "Mario", companyId: "foreign" })).error).toMatch(/Azienda non disponibile/);
    expect(mocks.db.contact.create).not.toHaveBeenCalled();
  });
  it("nega creazione di affari con una fase fuori dalla pipeline selezionata", async () => {
    mocks.db.pipeline.findFirst.mockResolvedValue({ id: "pipeline-a" });
    const result = await createDeal({ title: "Progetto", value: 100, currency: "EUR", pipelineId: "pipeline-a", stageId: "foreign-stage" });
    expect(result.error).toMatch(/Fase non disponibile/);
    expect(mocks.db.stage.findFirst).toHaveBeenCalledWith({ where: { id: "foreign-stage", pipelineId: "pipeline-a", pipeline: { organizationId: "org-a" } }, select: { id: true } });
    expect(mocks.db.deal.create).not.toHaveBeenCalled();
  });
  it("rileva lo spostamento concorrente senza sovrascrivere la fase", async () => {
    mocks.db.deal.findFirst.mockResolvedValue({ pipelineId: "pipeline-a", stageId: "current" });
    expect((await moveDeal({ dealId: "deal-a", oldStageId: "stale", newStageId: "next" })).error).toMatch(/già stato spostato/);
    expect(mocks.db.deal.update).not.toHaveBeenCalled();
  });
  it("non riscrive la data di chiusura né ripete automazioni per un affare già vinto", async () => {
    mocks.db.deal.findFirst.mockResolvedValue({ status: "WON", stageId: "s1", pipelineId: "p1", value: 100 });
    mocks.db.deal.update.mockResolvedValue({ id: "deal-a", title: "Progetto", ownerId: "user-a", value: 100, contactId: null });
    expect(await updateDeal({ id: "deal-a", status: "WON", title: "Nuovo titolo" })).toEqual({ ok: true });
    expect(mocks.db.deal.update.mock.calls[0]![0].data.closedAt).toBeUndefined();
    expect(mocks.workflow).not.toHaveBeenCalled();
    expect(mocks.webhook.mock.calls.every(call => call[1] !== "deal.won")).toBe(true);
  });
  it("rifiuta stati arbitrari ricevuti via RPC", async () => {
    const result = await updateDealsStatus(["deal-a"], "DELETED" as "OPEN");
    expect(result.error).toBe("Stato non valido");
    expect(mocks.db.deal.updateMany).not.toHaveBeenCalled();
  });
  it("permette di rimuovere data prevista e contatto dal modulo affare", async () => {
    mocks.db.deal.findFirst.mockResolvedValue({ status: "OPEN", stageId: "s1", pipelineId: "p1", value: 100 });
    mocks.db.deal.update.mockResolvedValue({ id: "deal-a", title: "Progetto", ownerId: "user-a", value: 100, contactId: null });
    expect(await updateDeal({ id: "deal-a", expectedClose: "", contactId: null })).toEqual({ ok: true });
    expect(mocks.db.deal.update.mock.calls[0]![0].data).toMatchObject({ expectedClose: null, contactId: null });
  });
  it("non riapre affari eliminati né altera chiusure già nello stato richiesto", async () => {
    mocks.db.deal.updateMany.mockResolvedValue({ count: 1 });
    await updateDealsStatus(["deal-a"], "WON");
    expect(mocks.db.deal.updateMany.mock.calls[0]![0].where).toEqual({ id: { in: ["deal-a"] }, organizationId: "org-a", status: { notIn: ["WON", "DELETED"] } });
  });
  it("rifiuta date senza fuso e durate frazionarie", async () => {
    expect((await createActivity({ type: "CALL", subject: "Richiamo", dueDate: "2026-09-05T09:30" })).error).toMatch(/Data non valida/);
    expect((await createActivity({ type: "CALL", subject: "Richiamo", duration: 2.5 })).error).not.toBeNull();
    expect(mocks.db.activity.create).not.toHaveBeenCalled();
  });
  it("mantiene i collegamenti non modificati aggiornando un'attività dal dettaglio contatto", async () => {
    mocks.db.contact.findFirst.mockResolvedValue({ id: "contact-a" });
    mocks.db.activity.update.mockResolvedValue({ id: "a", type: "CALL", subject: "Richiamo", organizationId: "org-a", userId: "user-a", user: { id: "user-a", name: "Mario", email: "mario@example.it" }, createdAt: new Date(), dueDate: null, contactId: "contact-a", dealId: "deal-a" });
    const result = await updateActivity({ id: "a", type: "CALL", subject: "Richiamo", contactId: "contact-a" });
    expect(result.error).toBeNull();
    expect(mocks.db.activity.update.mock.calls[0]![0].data.dealId).toBeUndefined();
    expect(mocks.db.activity.update.mock.calls[0]![0].data.duration).toBeUndefined();
    await updateActivity({ id: "a", type: "CALL", subject: "Richiamo", duration: null });
    expect(mocks.db.activity.update.mock.calls[1]![0].data.duration).toBeNull();
  });
});

describe("importazione e unione", () => {
  it("valida tutte le righe sul server prima di scrivere", async () => {
    const result = await importContacts([{ firstName: "Mario" }, { firstName: " " }]);
    expect(result).toMatchObject({ imported: 0, error: "Riga 3: Nome obbligatorio" });
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });
  it("calcola il limite del piano sui nuovi contatti dopo aver escluso i duplicati", async () => {
    mocks.db.contact.findMany.mockResolvedValue(Array.from({ length: 499 }, (_, i) => ({ email: `user${i}@example.it` })));
    mocks.db.contact.createMany.mockResolvedValue({ count: 1 });
    const result = await importContacts([{ firstName: "Esistente", email: "USER0@example.it", companyName: "Non creare" }, { firstName: "Nuovo", email: "new@example.it" }]);
    expect(result).toMatchObject({ imported: 1, duplicates: 1, companies: 0, error: null });
    expect(mocks.db.company.create).not.toHaveBeenCalled();
    expect(mocks.db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable", timeout: 30000 });
  });
  it("non crea aziende quando il piano ha esaurito i contatti", async () => {
    mocks.db.contact.findMany.mockResolvedValue(Array.from({ length: 500 }, (_, i) => ({ email: `${i}@example.it` })));
    expect((await importContacts([{ firstName: "Nuovo", companyName: "Studio" }])).error).toMatch(/limite di 500/);
    expect(mocks.db.company.create).not.toHaveBeenCalled();
    expect(mocks.db.contact.createMany).not.toHaveBeenCalled();
  });
  it("recupera una collisione transazionale con un messaggio di riprova", async () => {
    mocks.db.$transaction.mockRejectedValue({ code: "P2034" });
    expect(await importContacts([{ firstName: "Mario" }])).toMatchObject({ imported: 0, error: expect.stringContaining("Riprova") });
  });
  it("impedisce l'unione con sé stesso e i dati malformati", async () => {
    expect((await mergeContacts("a", "a", {})).error).toMatch(/se stesso/);
    expect((await mergeContacts("a", "b", { firstName: " " })).error).toBeTruthy();
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });
});

describe("La tua giornata", () => {
  it("non interroga il database senza sessione", async () => {
    mocks.auth.mockResolvedValue(null);
    expect(await getDailyFocus()).toBeNull();
    expect(mocks.db.activity.findMany).not.toHaveBeenCalled();
  });
  it("limita liste e contatori all'utente e alla sua organizzazione", async () => {
    const result = await getDailyFocus();
    expect(result).toMatchObject({ overdueCount: 0, todayCount: 0, followUpCount: 0, activities: [], deals: [] });
    for (const [query] of mocks.db.activity.findMany.mock.calls) {
      expect(query.where).toMatchObject({ organizationId: "org-a", userId: "user-a", completedAt: null });
      expect(query.take).toBe(4);
    }
    const query = mocks.db.deal.findMany.mock.calls[0]![0];
    expect(query.where).toMatchObject({ organizationId: "org-a", ownerId: "user-a", status: "OPEN", activities: { none: { organizationId: "org-a", completedAt: null, dueDate: { gte: expect.any(Date) } } } });
    expect(query.take).toBe(5);
  });
});
