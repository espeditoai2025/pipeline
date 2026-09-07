import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ transaction: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { $transaction: mocks.transaction } }));
import { crmTransaction } from "@/lib/crm-transaction";

beforeEach(() => { mocks.transaction.mockReset(); });

it.each([
  { code: "P2034" },
  { code: "P2010", meta: { code: "40001" } },
  { code: "P2010", meta: { driverAdapterError: { cause: { originalCode: "40001" } } } },
  { code: "P2010", meta: { driverAdapterError: { cause: { originalCode: "40P01" } } } },
])("ripete l’intera transazione dopo un conflitto riconosciuto: %j", async failure => {
  const work = vi.fn();
  mocks.transaction.mockRejectedValueOnce(failure).mockResolvedValueOnce("done");
  expect(await crmTransaction(work)).toBe("done");
  expect(mocks.transaction).toHaveBeenCalledTimes(2);
  expect(mocks.transaction).toHaveBeenLastCalledWith(work, expect.objectContaining({ isolationLevel: "Serializable" }));
});

it("non ripete errori SQL di validazione o errori di rete", async () => {
  for (const failure of [{ code: "P2010", meta: { code: "23505" } }, { code: "P1001" }]) {
    mocks.transaction.mockReset().mockRejectedValue(failure);
    await expect(crmTransaction(vi.fn())).rejects.toBe(failure);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  }
});

it("limita a tre i tentativi anche se il conflitto persiste", async () => {
  const failure = { code: "P2034" };
  mocks.transaction.mockRejectedValue(failure);
  await expect(crmTransaction(vi.fn())).rejects.toBe(failure);
  expect(mocks.transaction).toHaveBeenCalledTimes(3);
});
