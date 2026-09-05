import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  db: { contact: { findFirst: vi.fn(), update: vi.fn() }, company: { findFirst: vi.fn() }, deal: { findFirst: vi.fn(), update: vi.fn() }, stage: { findFirst: vi.fn() }, pipeline: { findFirst: vi.fn() } },
}));
vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/lib/api-auth", () => ({ authenticateApiKey: mocks.authenticate }));
import { PATCH as patchContact } from "@/app/api/v1/contacts/[id]/route";
import { PATCH as patchDeal } from "@/app/api/v1/deals/[id]/route";

const request = (body: unknown) => new NextRequest("http://localhost/api/v1/test/id", { method: "PATCH", body: JSON.stringify(body) });
const params = { params: Promise.resolve({ id: "id" }) };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.authenticate.mockResolvedValue({ organizationId: "org-a" });
  mocks.db.contact.findFirst.mockResolvedValue({ id: "id" });
  mocks.db.company.findFirst.mockResolvedValue(null);
  mocks.db.stage.findFirst.mockResolvedValue(null);
  mocks.db.pipeline.findFirst.mockResolvedValue({ id: "pipeline-a" });
  mocks.db.deal.findFirst.mockResolvedValue({ id: "id", pipelineId: "pipeline-a", status: "WON" });
  mocks.db.deal.update.mockResolvedValue({ id: "id", title: "Consulenza", value: 100, status: "OPEN", currency: "EUR", stageId: "s", updatedAt: new Date() });
});
describe("API pubbliche dei contatti e degli affari", () => {
  it("rifiuta un'azienda esterna nella PATCH di un contatto", async () => {
    const response = await patchContact(request({ companyId: "foreign" }), params);
    expect(response.status).toBe(422);
    expect(mocks.db.contact.update).not.toHaveBeenCalled();
    expect(mocks.db.company.findFirst.mock.calls[0]![0].where).toEqual({ id: "foreign", organizationId: "org-a" });
  });
  it("rifiuta una fase di un'altra pipeline", async () => {
    const response = await patchDeal(request({ stageId: "foreign" }), params);
    expect(response.status).toBe(422);
    expect(mocks.db.deal.update).not.toHaveBeenCalled();
    expect(mocks.db.stage.findFirst.mock.calls[0]![0].where).toMatchObject({ pipelineId: "pipeline-a", pipeline: { organizationId: "org-a" } });
  });
  it("rimuove closedAt e lostReason quando viene riaperto un affare", async () => {
    expect((await patchDeal(request({ status: "OPEN" }), params)).status).toBe(200);
    expect(mocks.db.deal.update.mock.calls[0]![0]).toMatchObject({ where: { id: "id", organizationId: "org-a", status: "WON" }, data: { closedAt: null, lostReason: null } });
  });
  it("mantiene la chiusura di un affare già vinto", async () => {
    expect((await patchDeal(request({ status: "WON" }), params)).status).toBe(200);
    expect(mocks.db.deal.update.mock.calls[0]![0].data).not.toHaveProperty("closedAt");
  });
  it("risponde 422 a date non valide prima di interrogare i dati dell'affare", async () => {
    expect((await patchDeal(request({ expectedClose: "non-data" }), params)).status).toBe(422);
    expect(mocks.db.deal.findFirst).not.toHaveBeenCalled();
  });
});
