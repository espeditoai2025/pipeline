import { describe, expect, it, vi } from "vitest";
import type { Prisma } from "@/generated/prisma/client";
vi.mock("@/lib/db", () => ({ db: {} }));
import { mergeContactRecords } from "@/lib/merge-contacts";

function fixture() {
  const base = { firstName: "Mario", lastName: "Rossi", email: "mario@example.it", phone: null, jobTitle: null, companyId: null, ownerId: "user-a", createdAt: new Date("2026-01-01"), organizationId: "org-a" };
  const primary = { ...base, id: "a", tags: [], customValues: [{ id: "p1", fieldId: "conflict", value: "Primario", field: { name: "Settore" } }, { id: "p2", fieldId: "empty", value: "", field: { name: "Zona" } }] };
  const duplicate = { ...base, id: "b", phone: "021234", tags: [{ id: "tag-a" }], customValues: [
    { id: "d1", fieldId: "conflict", value: "Alternativo", field: { name: "Settore" } },
    { id: "d2", fieldId: "empty", value: "Milano", field: { name: "Zona" } },
    { id: "d3", fieldId: "new", value: "Consulenza", field: { name: "Servizio" } },
  ] };
  const related = () => ({ updateMany: vi.fn().mockResolvedValue({ count: 1 }) });
  const tx = {
    contact: { findFirst: vi.fn().mockResolvedValueOnce(primary).mockResolvedValueOnce(duplicate), update: vi.fn(), delete: vi.fn() },
    customFieldValue: { update: vi.fn() },
    note: { ...related(), create: vi.fn() },
    deal: related(), activity: related(), email: related(), lead: related(),
    company: { findFirst: vi.fn().mockResolvedValue(null) },
  };
  return { tx, client: tx as unknown as Prisma.TransactionClient };
}

describe("fusione con conservazione dello storico", () => {
  it("recupera campi mancanti, tag e relazioni; archivia i valori in conflitto", async () => {
    const { tx, client } = fixture();
    await mergeContactRecords(client, "org-a", "user-a", "a", "b", {});
    expect(tx.customFieldValue.update).toHaveBeenCalledWith({ where: { id: "p2" }, data: { value: "Milano" } });
    expect(tx.customFieldValue.update).toHaveBeenCalledWith({ where: { id: "d3" }, data: { contactId: "a" } });
    expect(tx.customFieldValue.update).not.toHaveBeenCalledWith(expect.objectContaining({ where: { id: "p1" } }));
    expect(tx.note.create.mock.calls[0]![0].data.content).toContain("Alternativo");
    expect(tx.note.create.mock.calls[0]![0].data.content).toContain("Primario");
    expect(tx.contact.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "a", organizationId: "org-a" }, data: expect.objectContaining({ phone: "021234", tags: { connect: [{ id: "tag-a" }] } }) }));
    for (const model of [tx.deal, tx.activity, tx.email, tx.lead]) expect(model.updateMany).toHaveBeenCalledWith({ where: { contactId: "b", organizationId: "org-a" }, data: { contactId: "a" } });
    expect(tx.contact.delete).toHaveBeenCalledWith({ where: { id: "b", organizationId: "org-a" } });
    expect(tx.contact.delete.mock.invocationCallOrder[0]).toBeGreaterThan(tx.note.create.mock.invocationCallOrder[0]!);
  });
  it("accetta l'esplicita rimozione di un valore opzionale mantenendo lo storico", async () => {
    const { tx, client } = fixture();
    await mergeContactRecords(client, "org-a", "user-a", "a", "b", { email: null, phone: null });
    expect(tx.contact.update.mock.calls[0]![0].data).toMatchObject({ email: null, phone: null });
    expect(tx.note.create.mock.calls[0]![0].data.content).toContain("021234");
  });
  it("non modifica né elimina contatti estranei al tenant", async () => {
    const { tx, client } = fixture();
    tx.contact.findFirst.mockReset().mockResolvedValue(null);
    await expect(mergeContactRecords(client, "org-a", "user-a", "a", "b", {})).rejects.toThrow("Contatto non trovato");
    expect(tx.contact.delete).not.toHaveBeenCalled();
    expect(tx.note.create).not.toHaveBeenCalled();
  });
  it("rifiuta l'azienda esterna selezionata come override prima delle scritture", async () => {
    const { tx, client } = fixture();
    await expect(mergeContactRecords(client, "org-a", "user-a", "a", "b", { companyId: "foreign" })).rejects.toThrow(/Azienda non disponibile/);
    expect(tx.contact.delete).not.toHaveBeenCalled();
    expect(tx.note.create).not.toHaveBeenCalled();
  });
});
