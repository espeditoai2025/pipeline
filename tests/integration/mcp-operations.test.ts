import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db, startDatabase, closeDatabase } from "./database";
vi.mock("@/lib/db", async () => await import("./database"));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/lib/workflow-wake", () => ({ wakeWorkflows: vi.fn() }));
import * as crm from "@/lib/mcp/crm";
import * as ops from "@/lib/mcp/operations";
import * as gobus from "@/lib/mcp/gobus";
import * as effects from "@/lib/mcp/effects";
import * as events from "@/lib/mcp/external-events";
import * as s from "@/lib/mcp/schemas";
const org = "ops-a",
  companyId = "ops-company-a";
const context = {
  organizationId: org,
  userId: "ops-owner-a",
  tokenId: "ops-token-a",
  canWrite: true,
};
beforeAll(startDatabase);
afterAll(closeDatabase);
beforeEach(async () => {
  await db.organization.deleteMany({ where: { id: { in: ["ops-a", "ops-b"] } } });
  for (const suffix of ["a", "b"]) {
    await db.organization.create({
      data: { id: `ops-${suffix}`, slug: `ops-${suffix}`, name: "Fixture", plan: "PRO" },
    });
    await db.user.create({
      data: {
        id: `ops-owner-${suffix}`,
        email: `ops-${suffix}@example.test`,
        organizationId: `ops-${suffix}`,
        role: "OWNER",
      },
    });
    await db.mcpToken.create({
      data: {
        id: `ops-token-${suffix}`,
        organizationId: `ops-${suffix}`,
        createdBy: `ops-owner-${suffix}`,
        name: "Fixture",
        keyHash: `ops-hash-${suffix}`,
        prefix: "fixture",
        canWrite: true,
        expiresAt: new Date("2035-01-01"),
      },
    });
    await db.company.create({
      data: {
        id: `ops-company-${suffix}`,
        organizationId: `ops-${suffix}`,
        name: "Trasporti",
        externalSource: "gobus",
        externalId: "35",
      },
    });
    await db.contact.create({
      data: {
        id: `ops-contact-${suffix}`,
        organizationId: `ops-${suffix}`,
        ownerId: `ops-owner-${suffix}`,
        firstName: "Referente",
        companyId: `ops-company-${suffix}`,
      },
    });
    await db.pipeline.create({
      data: {
        id: `ops-pipeline-${suffix}`,
        organizationId: `ops-${suffix}`,
        name: "Vendite",
        stages: { create: { id: `ops-stage-${suffix}`, name: "Proposta", position: 0 } },
      },
    });
  }
});
describe("operatività GoBus via MCP", () => {
  it("ripianifica e riapre conservando completamenti storici, con retry/versione e isolamento", async () => {
    const activity = await crm.createMcpActivity(
      context,
      s.createActivitySchema.parse({
        requestId: "activity-create",
        type: "TASK",
        subject: "Verificare",
        companyId,
      }),
    );
    const update = await ops.updateMcpActivity(
      context,
      s.updateActivitySchema.parse({
        requestId: "activity-update",
        id: activity.id,
        expectedUpdatedAt: activity.updatedAt,
        dueDate: "2030-10-10T09:00:00Z",
        notes: "Da verificare",
      }),
    );
    expect(await db.activity.count({ where: { organizationId: org } })).toBe(1);
    await expect(
      ops.updateMcpActivity(
        context,
        s.updateActivitySchema.parse({
          requestId: "activity-stale",
          id: activity.id,
          expectedUpdatedAt: activity.updatedAt,
          notes: "Obsoleto",
        }),
      ),
    ).rejects.toThrow("Versione");
    await expect(
      ops.updateMcpActivity(
        context,
        s.updateActivitySchema.parse({
          requestId: "activity-outside",
          id: activity.id,
          expectedUpdatedAt: update.updatedAt,
          companyId: "ops-company-b",
        }),
      ),
    ).rejects.toThrow("organizzazione");
    const completed = await crm.completeMcpActivity(context, {
      requestId: "activity-complete",
      id: activity.id,
    });
    const again = await crm.completeMcpActivity(context, {
      requestId: "activity-again",
      id: activity.id,
    });
    expect(again.completedAt).toBe(completed.completedAt);
    const row = await db.activity.findUniqueOrThrow({ where: { id: activity.id } });
    const reopen = s.reopenActivitySchema.parse({
      requestId: "activity-reopen",
      id: activity.id,
      expectedUpdatedAt: row.updatedAt.toISOString(),
      reason: "Nuova verifica richiesta",
    });
    await ops.reopenMcpActivity(context, reopen);
    expect((await ops.reopenMcpActivity(context, reopen)).replayed).toBe(true);
    const opened = await db.activity.findUniqueOrThrow({ where: { id: activity.id } });
    expect(opened.completedAt).toBeNull();
    expect(opened.firstCompletedAt?.toISOString()).toBe(completed.completedAt);
    const history = await db.activityEvent.findMany({ where: { activityId: activity.id } });
    expect(history.map((x) => x.action).sort()).toEqual(["COMPLETED", "REOPENED", "UPDATED"]);
    expect(history.find((x) => x.action === "REOPENED")?.completedAt?.toISOString()).toBe(
      completed.completedAt,
    );
    expect(
      (await crm.getMcpRecord(context, { kind: "activity", id: activity.id })).events,
    ).toHaveLength(3);
  });
  it("salva una nota aziendale anche senza contatto commerciale e rifiuta associazioni esterne", async () => {
    const note = s.createNoteSchema.parse({
      requestId: "company-note",
      companyId,
      content: "Esclusione verificata: consultare stato recapito",
    });
    const made = await crm.createMcpNote(context, note);
    expect((await crm.createMcpNote(context, note)).id).toBe(made.id);
    expect(
      (await crm.getMcpRecord(context, { kind: "company", id: companyId })).recentNotes[0]?.id,
    ).toBe(made.id);
    await expect(
      crm.createMcpNote(
        context,
        s.createNoteSchema.parse({
          ...note,
          requestId: "foreign-note",
          contactId: "ops-contact-b",
        }),
      ),
    ).rejects.toThrow("organizzazione");
  });
  it("gestisce campi con valori parziali, validazione, versione e isolamento", async () => {
    const one = await ops.saveMcpCustomField(
      context,
      s.customFieldWriteSchema.parse({
        requestId: "field-first",
        entityType: "company",
        name: "Stato verifica",
        fieldType: "select",
        options: ["Verificato", "Da verificare"],
      }),
    );
    const two = await ops.saveMcpCustomField(
      context,
      s.customFieldWriteSchema.parse({
        requestId: "field-second",
        entityType: "company",
        name: "ID GoBus",
        fieldType: "text",
      }),
    );
    const company = await db.company.findUniqueOrThrow({ where: { id: companyId } });
    const values = await ops.setMcpCustomValues(
      context,
      s.customValuesWriteSchema.parse({
        requestId: "field-values",
        entityType: "company",
        id: companyId,
        expectedUpdatedAt: company.updatedAt.toISOString(),
        values: [
          { fieldId: one.id, value: "Verificato" },
          { fieldId: two.id, value: "35" },
        ],
      }),
    );
    await ops.setMcpCustomValues(
      context,
      s.customValuesWriteSchema.parse({
        requestId: "field-partial",
        entityType: "company",
        id: companyId,
        expectedUpdatedAt: values.updatedAt,
        values: [{ fieldId: two.id, value: "36" }],
      }),
    );
    expect(
      (await crm.getMcpRecord(context, { kind: "company", id: companyId })).customValues,
    ).toEqual(
      expect.arrayContaining([
        { fieldId: one.id, value: "Verificato" },
        { fieldId: two.id, value: "36" },
      ]),
    );
    await expect(
      ops.saveMcpCustomField(
        context,
        s.customFieldWriteSchema.parse({
          requestId: "remove-option",
          id: one.id,
          expectedUpdatedAt: one.updatedAt,
          entityType: "company",
          name: "Stato verifica",
          fieldType: "select",
          options: ["Da verificare"],
        }),
      ),
    ).rejects.toThrow("valori già presenti");
    await expect(
      ops.setMcpCustomValues(
        context,
        s.customValuesWriteSchema.parse({
          requestId: "foreign-value",
          entityType: "company",
          id: "ops-company-b",
          expectedUpdatedAt: values.updatedAt,
          values: [{ fieldId: one.id, value: "Verificato" }],
        }),
      ),
    ).rejects.toThrow("organizzazione");
    expect((await ops.listMcpCustomFields(context, { entityType: "company" })).fields).toHaveLength(
      2,
    );
  });
  it("gestisce pipeline rispettando versione, fasi usate, quota e confini dell'organizzazione", async () => {
    const made = await ops.saveMcpPipeline(
      context,
      s.pipelineWriteSchema.parse({
        requestId: "new-pipeline",
        name: "GoBus",
        stages: [
          { name: "Verifica", probability: 10 },
          { name: "Accettazione", probability: 90 },
        ],
      }),
    );
    expect((await crm.listMcpPipelines(context)).pipelines).toHaveLength(2);
    const pipeline = await db.pipeline.findUniqueOrThrow({
      where: { id: made.id },
      include: { stages: true },
    });
    const stage = pipeline.stages[0]!;
    await db.deal.create({
      data: {
        title: "Proposta",
        organizationId: org,
        ownerId: context.userId,
        pipelineId: pipeline.id,
        stageId: stage.id,
      },
    });
    await expect(
      ops.saveMcpPipeline(
        context,
        s.pipelineWriteSchema.parse({
          requestId: "remove-used-stage",
          id: made.id,
          expectedUpdatedAt: made.updatedAt,
          name: "GoBus",
          stages: [{ id: pipeline.stages[1]!.id, name: "Accettazione", probability: 100 }],
        }),
      ),
    ).rejects.toThrow("fase con trattative");
    await expect(
      ops.saveMcpPipeline(
        context,
        s.pipelineWriteSchema.parse({
          requestId: "foreign-stage",
          id: made.id,
          expectedUpdatedAt: made.updatedAt,
          name: "GoBus",
          stages: [{ id: "ops-stage-b", name: "Esterno", probability: 100 }],
        }),
      ),
    ).rejects.toThrow("altra pipeline");
    await db.organization.update({ where: { id: org }, data: { plan: "STARTER" } });
    await expect(
      ops.saveMcpPipeline(
        context,
        s.pipelineWriteSchema.parse({
          requestId: "over-quota-pipeline",
          name: "Altra",
          stages: [{ name: "Nuovo", probability: 10 }],
        }),
      ),
    ).rejects.toThrow();
  });
  it("separa Pro 49 e prova Enterprise, esclude prove/test e offerte dal canone e invalida vecchie verifiche", async () => {
    const profile = await gobus.setMcpGobusProfile(
      context,
      s.gobusProfileWriteSchema.parse({
        requestId: "gobus-profile",
        companyId,
        source: "gobus",
        segment: "operatori",
        lifecycle: "CUSTOMER",
        verificationStatus: "VERIFIED",
        basePlan: "Pro",
        trialUpgrade: "Enterprise",
        trialEndsAt: "2030-10-30T00:00:00Z",
        feeAmount: 49,
        feeCurrency: "EUR",
        feePeriod: "MONTH",
        feeVat: "EXCLUDED",
        feeSource: "contratto",
        feeEvidence: "Accettazione verificata",
        feeVerifiedAt: "2026-10-01T00:00:00Z",
      }),
    );
    const offer = await crm.createMcpDeal(
      context,
      s.createDealSchema.parse({
        requestId: "molinari-offer",
        title: "Proposta Molinari",
        value: 40,
        companyId,
        pipelineId: "ops-pipeline-a",
        stageId: "ops-stage-a",
      }),
    );
    await expect(
      crm.updateMcpDeal(
        context,
        s.updateDealSchema.parse({
          requestId: "won-without-proof",
          id: offer.id,
          expectedUpdatedAt: offer.updatedAt,
          status: "WON",
        }),
      ),
    ).rejects.toThrow("evidenza di accettazione");
    let report = await gobus.getMcpGobusReport(context, {});
    expect(report.payingCompanies).toBe(1);
    expect(report.verifiedContractedRecurring[0]?.amount).toBe(49);
    expect(report.acceptedOffers.count).toBe(0);
    expect(report.reconciledReceipts).toBeNull();
    expect(
      (
        await crm.listMcpCompanies(context, s.companiesSchema.parse({ segment: "operatori" }))
      ).data.map((x) => x.id),
    ).toEqual([companyId]);
    const changed = await gobus.setMcpGobusProfile(
      context,
      s.gobusProfileWriteSchema.parse({
        requestId: "price-change",
        companyId,
        source: "gobus",
        expectedUpdatedAt: profile.updatedAt,
        feeAmount: 99,
      }),
    );
    expect(
      (await gobus.getMcpGobusProfile(context, { companyId })).profile?.feeVerifiedAt,
    ).toBeNull();
    expect((await gobus.getMcpGobusReport(context, {})).payingCompanies).toBe(0);
    await gobus.setMcpGobusProfile(
      context,
      s.gobusProfileWriteSchema.parse({
        requestId: "trial-status",
        companyId,
        source: "gobus",
        expectedUpdatedAt: changed.updatedAt,
        lifecycle: "TRIAL",
        feeAmount: 49,
        feeSource: "contratto",
        feeEvidence: "Verificato",
        feeVerifiedAt: "2026-10-01T00:00:00Z",
      }),
    );
    report = await gobus.getMcpGobusReport(context, {});
    expect(report.trials).toBe(1);
    expect(report.payingCompanies).toBe(0);
    const current = (await gobus.getMcpGobusProfile(context, { companyId })).profile!;
    await gobus.setMcpGobusProfile(
      context,
      s.gobusProfileWriteSchema.parse({
        requestId: "test-status",
        companyId,
        source: "gobus",
        expectedUpdatedAt: current.updatedAt.toISOString(),
        lifecycle: "CUSTOMER",
        isTest: true,
      }),
    );
    expect((await gobus.getMcpGobusReport(context, {})).totalCompanies).toBe(0);
    await expect(
      gobus.setMcpGobusProfile(
        context,
        s.gobusProfileWriteSchema.parse({
          requestId: "cross-org-profile",
          companyId: "ops-company-b",
          source: "gobus",
        }),
      ),
    ).rejects.toThrow("organizzazione");
  });
  it("legge effetti senza segreti e distingue email possibili da import senza invii", async () => {
    await db.workflow.create({
      data: {
        organizationId: org,
        name: "Benvenuto",
        isActive: true,
        triggerOnImport: true,
        trigger: { type: "CONTACT_CREATED", secret: "hidden-trigger-secret" },
        steps: [
          {
            id: "mail",
            action: {
              type: "SEND_EMAIL",
              to: "contact",
              templateId: "template",
              secret: "hidden-action-secret",
            },
          },
        ],
      },
    });
    await db.webhook.create({
      data: {
        organizationId: org,
        name: "Hook",
        url: "https://user:secret@example.test/private-token?key=hidden-query-secret",
        secret: "hidden-signing-secret",
        events: ["contact.created"],
      },
    });
    const config = await effects.listMcpAutomationEffects(context);
    const encoded = JSON.stringify(config);
    expect(encoded).not.toContain("hidden");
    expect(encoded).not.toContain("private-token");
    expect(config.webhooks[0]?.destinationOrigin).toBe("https://example.test");
    expect(
      (await effects.predictMcpEffects(context, { operation: "create_contact" })).maySendEmail,
    ).toBe(true);
    const silent = await effects.predictMcpEffects(context, { operation: "import_batch" });
    expect(silent.maySendEmail).toBe(false);
    expect(silent.possibleWebhooks).toEqual([]);
    expect(silent.possibleWorkflows).toEqual([]);
  });
  it("deduplica eventi PCSMail, conserva revisioni, isola organizzazioni e rifiuta dati integrali", async () => {
    const input = s.externalEventWriteSchema.parse({
      requestId: "mail-event",
      source: "pcsmail",
      externalId: "message-123",
      kind: "PCSMAIL",
      state: "UNCERTAIN",
      direction: "OUTBOUND",
      occurredAt: "2026-10-01T10:00:00Z",
      companyId,
      account: "Info@Pipely.it",
      mailbox: "Sent",
      uidValidity: "17",
      uid: "35",
      messageId: "<message-123@example.test>",
      recipient: " Client@example.test ",
      recipientVerified: true,
      messageRef: "pcsmail:17:35",
    });
    const made = await events.upsertMcpExternalEvent(context, input);
    const repeat = await events.upsertMcpExternalEvent(context, {
      ...input,
      requestId: "mail-repeat",
    });
    expect(repeat.id).toBe(made.id);
    expect(repeat.unchanged).toBe(true);
    await expect(
      events.upsertMcpExternalEvent(context, {
        ...input,
        requestId: "mail-identity-conflict",
        externalId: "different-id",
      }),
    ).rejects.toThrow("già collegato");
    await expect(
      events.upsertMcpExternalEvent(context, {
        ...input,
        requestId: "mail-state-stale",
        state: "SENT_CONFIRMED",
        evidence: "Ricevuta provider verificata",
      }),
    ).rejects.toThrow("Versione");
    const confirmed = await events.upsertMcpExternalEvent(context, {
      ...input,
      requestId: "mail-confirmed",
      state: "SENT_CONFIRMED",
      expectedUpdatedAt: made.updatedAt,
      evidence: "Ricevuta provider verificata",
    });
    expect(
      (
        await events.upsertMcpExternalEvent(context, {
          ...input,
          requestId: "mail-confirmed",
          state: "SENT_CONFIRMED",
          expectedUpdatedAt: made.updatedAt,
          evidence: "Ricevuta provider verificata",
        })
      ).replayed,
    ).toBe(true);
    const listed = await events.listMcpExternalEvents(
      context,
      s.externalEventsReadSchema.parse({ companyId }),
    );
    expect(listed.data).toHaveLength(1);
    expect(listed.data[0]?.revisions).toHaveLength(2);
    expect(listed.data[0]?.state).toBe("SENT_CONFIRMED");
    expect(confirmed.updatedAt).not.toBe(made.updatedAt);
    expect(
      s.externalEventWriteSchema.safeParse({ ...input, body: "Corpo non ammesso", attachments: [] })
        .success,
    ).toBe(false);
    expect(
      s.externalEventWriteSchema.safeParse({ ...input, state: "SENT_CONFIRMED" }).success,
    ).toBe(false);
    const other = {
      organizationId: "ops-b",
      userId: "ops-owner-b",
      tokenId: "ops-token-b",
      canWrite: true,
    };
    expect(
      (
        await events.upsertMcpExternalEvent(other, {
          ...input,
          requestId: "other-tenant-mail",
          companyId: "ops-company-b",
        })
      ).id,
    ).not.toBe(made.id);
    expect(await db.note.count({ where: { companyId } })).toBe(0);
    expect(await db.activity.count({ where: { organizationId: org } })).toBe(0);
    expect(await db.recipientPolicy.count({ where: { organizationId: org } })).toBe(0);
    expect(await db.workflowQueue.count({ where: { orgId: org } })).toBe(0);
  });
  it("richiede evidenze GoBus e non duplica eventi, note o attività nei retry", async () => {
    const input = s.externalEventWriteSchema.parse({
      requestId: "first-service",
      source: "gobus",
      externalId: "first-35",
      kind: "GOBUS",
      state: "FIRST_SERVICE",
      direction: "NONE",
      occurredAt: "2026-10-01T10:00:00Z",
      companyId,
      evidence: "Primo servizio verificato nel sistema GoBus",
    });
    const first = await events.upsertMcpExternalEvent(context, input);
    expect(
      (await events.upsertMcpExternalEvent(context, { ...input, requestId: "repeat-service" })).id,
    ).toBe(first.id);
    expect(s.externalEventWriteSchema.safeParse({ ...input, evidence: undefined }).success).toBe(
      false,
    );
    expect(await db.externalEventRevision.count({ where: { eventId: first.id } })).toBe(1);
    expect(await db.note.count({ where: { companyId } })).toBe(0);
    expect(await db.activity.count({ where: { organizationId: org } })).toBe(0);
  });
});
