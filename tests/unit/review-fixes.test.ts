import { describe, expect, it } from "vitest";
import { isRecordId } from "@/lib/record-id";
import { planAfterSubscription } from "@/app/api/stripe/webhook/route";
import { workflowStepSchema } from "@/lib/workflow-schema";

// Difetti trovati dalla revisione multi-agente su ba67b0e..HEAD e corretti.
// Ogni test qui blocca il ritorno di uno di quelli confermati.

describe("identificatori che arrivano dal client", () => {
  it("accetta solo stringhe non vuote di lunghezza ragionevole", () => {
    expect(isRecordId("cmtp0000abcd")).toBe(true);
    expect(isRecordId("")).toBe(false);
    expect(isRecordId("x".repeat(101))).toBe(false);
    expect(isRecordId(undefined)).toBe(false);
    expect(isRecordId(null)).toBe(false);
    expect(isRecordId(42)).toBe(false);
  });

  it("rifiuta i filtri Prisma travestiti da id, che allargherebbero la cancellazione", () => {
    // Il caso reale: deleteMany({ where: { id: { not: "" }, organizationId } }) cancella
    // ogni riga dell'organizzazione invece della singola richiesta.
    expect(isRecordId({ not: "" })).toBe(false);
    expect(isRecordId({ contains: "" })).toBe(false);
    expect(isRecordId({ in: ["a", "b"] })).toBe(false);
    expect(isRecordId(["a", "b"])).toBe(false);
  });
});

describe("piano dopo un evento di abbonamento Stripe", () => {
  it("non declassa mai un cliente ENTERPRISE, nemmeno quando l'abbonamento finisce", () => {
    expect(planAfterSubscription("ENTERPRISE", false)).toBe("ENTERPRISE");
    expect(planAfterSubscription("ENTERPRISE", true)).toBe("ENTERPRISE");
  });

  it("promuove a PRO con abbonamento attivo e riporta a STARTER quando decade", () => {
    expect(planAfterSubscription("STARTER", true)).toBe("PRO");
    expect(planAfterSubscription("PRO", true)).toBe("PRO");
    expect(planAfterSubscription("PRO", false)).toBe("STARTER");
    expect(planAfterSubscription("STARTER", false)).toBe("STARTER");
  });
});

describe("passi di automazione salvati da versioni precedenti del builder", () => {
  const email = { id: "s1", action: { type: "SEND_EMAIL", templateId: "tpl_1", to: "contact" } };
  const legacyOwner = { id: "s2", action: { type: "ASSIGN_OWNER", userId: "" } };
  const legacyStage = { id: "s3", action: { type: "UPDATE_DEAL_STAGE", stageId: "" } };

  it("il passo incompleto non supera la validazione, quello valido si", () => {
    expect(workflowStepSchema.safeParse(email).success).toBe(true);
    expect(workflowStepSchema.safeParse(legacyOwner).success).toBe(false);
    expect(workflowStepSchema.safeParse(legacyStage).success).toBe(false);
  });

  it("validati uno per uno, i passi buoni restano eseguibili accanto a quelli rotti", () => {
    // È la differenza che conta: con la validazione in blocco dell'intero array il job
    // falliva prima di eseguire anche solo il primo passo valido.
    const steps = [email, legacyOwner, email];
    const perStep = steps.map((s) => workflowStepSchema.safeParse(s));
    expect(perStep.filter((p) => p.success)).toHaveLength(2);
    expect(perStep.some((p) => p.success)).toBe(true);

    const inBlocco = workflowStepSchema.array().min(1).max(30).safeParse(steps);
    expect(inBlocco.success).toBe(false);
  });
});
