import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { db, startDatabase, closeDatabase } from "./database";
import type { WorkflowStep } from "@/types/workflows";
const m = vi.hoisted(() => ({ auth: vi.fn(), mail: vi.fn(), event: vi.fn(), retrieve: vi.fn() }));
vi.mock("@/lib/db", async () => await import("./database"));
vi.mock("@/lib/auth", () => ({ auth: m.auth }));
vi.mock("@/lib/mailer", () => ({ sendOrgMail: m.mail }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/workflow-wake", () => ({ wakeWorkflows: vi.fn() }));
vi.mock("@/lib/webhook-delivery", () => ({ dispatchWebhook: vi.fn(async () => {}) }));
vi.mock("@/lib/api-auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api-auth")>()),
  authenticateApiKey: vi.fn(async () => ({ organizationId: "a", apiKeyId: "test" })),
}));
vi.mock("@/lib/stripe", () => ({
  STRIPE_PRO_PRICE_ID: "price-pro",
  getStripe: () => ({
    webhooks: { constructEvent: m.event },
    subscriptions: { retrieve: m.retrieve },
  }),
}));
import { crmTransaction } from "@/lib/crm-transaction";
import { enqueueWorkflows, type WorkflowPayload } from "@/lib/workflow-events";
import { processWorkflowQueue, enqueueOverdueActivities } from "@/lib/workflow-engine";
import {
  createWorkflow,
  updateWorkflow,
  toggleWorkflow,
  testWorkflow,
  resumeWorkflowJob,
  getWorkflowLogs,
} from "@/server/actions/workflows";
import { createContact, importContacts } from "@/server/actions/contacts";
import { createLead, convertLead, importLeads } from "@/server/actions/leads";
import { createDeal, updateDeal, updateDealsStatus, moveDeal } from "@/server/actions/deals";
import { createPipeline } from "@/server/actions/pipeline";
import { sendEmail, saveDraft } from "@/server/actions/emails";
import { toggleProductActive } from "@/server/actions/products";
import { getReportData } from "@/server/actions/reports";
import { POST as stripeWebhook } from "@/app/api/stripe/webhook/route";
import { inviteTeamMember } from "@/server/actions/settings";
import { POST as apiContact } from "@/app/api/v1/contacts/route";
import { POST as apiDeal } from "@/app/api/v1/deals/route";
import { POST as apiLead } from "@/app/api/v1/leads/route";
import { PATCH as apiUpdateDeal } from "@/app/api/v1/deals/[id]/route";
const notify: WorkflowStep = {
  id: "notify",
  action: { type: "SEND_NOTIFICATION", message: "Ciao {{nome}}" },
};
const input = { name: "Prova", trigger: { type: "DEAL_CREATED" as const }, steps: [notify] };
const payload: WorkflowPayload = {
  trigger: "DEAL_CREATED",
  orgId: "a",
  dealId: "deal",
  dealTitle: "Progetto",
  ownerId: "owner",
  stageId: "stage",
  contactId: "contact",
};
beforeAll(startDatabase);
afterAll(closeDatabase);
beforeEach(async () => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  await db.$executeRawUnsafe('ALTER TABLE "Activity" DROP CONSTRAINT IF EXISTS "test_failure"');
  await db.$executeRawUnsafe(
    'ALTER TABLE "WorkflowQueue" DROP CONSTRAINT IF EXISTS "test_queue_failure"',
  );
  await db.$executeRawUnsafe(
    'ALTER TABLE "ProcessedStripeEvent" DROP CONSTRAINT IF EXISTS "test_marker_failure"',
  );
  await db.email.deleteMany({ where: { organizationId: "a" } });
  await db.organization.deleteMany({ where: { id: { in: ["a", "b"] } } });
  await db.processedStripeEvent.deleteMany();
  await db.organization.createMany({
    data: [
      { id: "a", name: "Studio", slug: "studio", plan: "PRO", stripeCustomerId: "cus-a" },
      { id: "b", name: "Esterno", slug: "esterno", plan: "PRO" },
    ],
  });
  await db.user.createMany({
    data: [
      { id: "owner", organizationId: "a", email: "owner@example.test", role: "OWNER" },
      { id: "second", organizationId: "a", email: "second@example.test", role: "SALES" },
      { id: "external", organizationId: "b", email: "external@example.test", role: "OWNER" },
    ],
  });
  await db.pipeline.createMany({
    data: [
      { id: "pipeline", name: "Vendite", organizationId: "a" },
      { id: "external-pipeline", name: "Esterno", organizationId: "b" },
    ],
  });
  await db.stage.createMany({
    data: [
      { id: "stage", name: "Nuovo", pipelineId: "pipeline", position: 0 },
      { id: "next", name: "Proposta", pipelineId: "pipeline", position: 1 },
      { id: "external-stage", name: "Esterno", pipelineId: "external-pipeline", position: 0 },
    ],
  });
  await db.contact.createMany({
    data: [
      {
        id: "contact",
        firstName: "Mario",
        email: "mario@example.test",
        organizationId: "a",
        ownerId: "owner",
      },
      { id: "external-contact", firstName: "Esterno", organizationId: "b", ownerId: "external" },
    ],
  });
  await db.deal.create({
    data: {
      id: "deal",
      title: "Progetto",
      value: 100,
      organizationId: "a",
      pipelineId: "pipeline",
      stageId: "stage",
      ownerId: "owner",
      contactId: "contact",
    },
  });
  await db.emailTemplate.create({
    data: {
      id: "template",
      name: "Benvenuto",
      category: "generale",
      subject: "Ciao {{nome}}",
      body: "<p>{{email}}</p>",
      organizationId: "a",
    },
  });
  m.auth.mockResolvedValue({
    user: { id: "owner", organizationId: "a", role: "OWNER", email: "owner@example.test" },
  });
  m.mail.mockResolvedValue({ ok: true, via: "resend" });
});
async function workflow(steps: WorkflowStep[] = [notify], trigger: object = input.trigger) {
  return db.workflow.create({
    data: { ...input, steps, trigger, organizationId: "a", isActive: true },
  });
}
async function enqueue(event = payload, key = "test") {
  return crmTransaction((tx) => enqueueWorkflows(tx, event, key));
}
async function job() {
  return db.workflowQueue.findFirstOrThrow({ where: { orgId: "a" } });
}
describe("migrazione e motore con PostgreSQL locale", () => {
  it("preserva le attese precedenti e distingue le vecchie validazioni", async () => {
    expect(await db.workflowQueue.findUnique({ where: { id: "legacy-job" } })).toMatchObject({
      status: "PAUSED",
      eventKey: "legacy:legacy-job",
      steps: expect.any(Array),
    });
    expect(
      (await db.workflowExecution.findUnique({ where: { id: "legacy-validation" } }))?.status,
    ).toBe("VALIDATION");
  });
  it("invia email tramite provider simulato e registra esecuzione e storico reali", async () => {
    await workflow([
      { id: "mail", action: { type: "SEND_EMAIL", templateId: "template", to: "contact" } },
    ]);
    await enqueue();
    await processWorkflowQueue({ orgId: "a" });
    expect(m.mail).toHaveBeenCalledWith(
      "a",
      expect.objectContaining({
        to: "mario@example.test",
        subject: "Ciao Mario",
        idempotencyKey: expect.any(String),
      }),
    );
    expect((await job()).status).toBe("SUCCESS");
    expect(await db.email.count({ where: { organizationId: "a" } })).toBe(1);
    expect(await db.workflowExecution.count({ where: { status: "SUCCESS" } })).toBe(1);
  });
  it("conserva e ferma l'invio incerto senza ripeterlo automaticamente", async () => {
    await workflow([
      { id: "mail", action: { type: "SEND_EMAIL", templateId: "template", to: "contact" } },
    ]);
    m.mail.mockResolvedValue({ ok: false, error: "Timeout" });
    await enqueue();
    await processWorkflowQueue({ orgId: "a" });
    await processWorkflowQueue({ orgId: "a" });
    expect(await job()).toMatchObject({ status: "FAILED", emailInFlight: true, stepIndex: 0 });
    expect(m.mail).toHaveBeenCalledTimes(1);
    expect((await resumeWorkflowJob((await job()).id)).error).toBeTruthy();
    expect((await getWorkflowLogs())[0]).toMatchObject({
      status: "FAILED",
      error: expect.stringContaining("Timeout"),
      logs: expect.arrayContaining([expect.stringContaining("Timeout")]),
    });
  });
  it("non presenta destinatari assenti come invii riusciti", async () => {
    await db.contact.update({ where: { id: "contact" }, data: { email: null } });
    await workflow([
      { id: "mail", action: { type: "SEND_EMAIL", templateId: "template", to: "contact" } },
    ]);
    await enqueue();
    await processWorkflowQueue({ orgId: "a" });
    expect((await job()).status).toBe("SKIPPED");
    expect(m.mail).not.toHaveBeenCalled();
  });
  it("attende e riprende la configurazione salvata senza ripetere azioni", async () => {
    const wf = await workflow([
      notify,
      { id: "wait", action: { type: "WAIT", days: 1 } },
      {
        id: "task",
        action: { type: "CREATE_ACTIVITY", activityType: "TASK", subject: "Richiamo", dueDays: 0 },
      },
    ]);
    await enqueue();
    await processWorkflowQueue({ orgId: "a" });
    expect(await job()).toMatchObject({ status: "PAUSED", stepIndex: 2 });
    expect(await db.notification.count()).toBe(1);
    await db.workflow.update({ where: { id: wf.id }, data: { steps: [notify] } });
    await db.workflowQueue.update({
      where: { id: (await job()).id },
      data: { resumeAt: new Date(0) },
    });
    await processWorkflowQueue({ orgId: "a" });
    expect((await job()).status).toBe("SUCCESS");
    expect(await db.activity.count()).toBe(1);
    expect(await db.notification.count()).toBe(1);
  });
  it("due worker e due eventi identici producono una sola esecuzione", async () => {
    await workflow();
    await enqueue();
    await enqueue();
    await Promise.all([processWorkflowQueue({ orgId: "a" }), processWorkflowQueue({ orgId: "a" })]);
    expect(await db.notification.count()).toBe(1);
    expect(await db.workflowQueue.count({ where: { orgId: "a" } })).toBe(1);
  });
  it("riprende dopo un errore transitorio dal checkpoint persistito", async () => {
    await workflow([
      notify,
      {
        id: "task",
        action: { type: "CREATE_ACTIVITY", activityType: "TASK", subject: "Prova", dueDays: 0 },
      },
    ]);
    await db.$executeRawUnsafe(
      `ALTER TABLE "Activity" ADD CONSTRAINT "test_failure" CHECK (subject <> 'Prova')`,
    );
    await enqueue();
    await processWorkflowQueue({ orgId: "a" });
    expect(await job()).toMatchObject({ status: "PENDING", stepIndex: 1 });
    await db.$executeRawUnsafe('ALTER TABLE "Activity" DROP CONSTRAINT "test_failure"');
    await db.workflowQueue.update({
      where: { id: (await job()).id },
      data: { resumeAt: new Date(0) },
    });
    await processWorkflowQueue({ orgId: "a" });
    expect(await db.notification.count()).toBe(1);
    expect(await db.activity.count()).toBe(1);
  });
  it("sospende la coda dopo downgrade e impedisce modifica, test, attivazione e ripresa", async () => {
    const wf = await workflow();
    await enqueue();
    await db.organization.update({ where: { id: "a" }, data: { plan: "STARTER" } });
    await processWorkflowQueue({ orgId: "a" });
    expect((await job()).status).toBe("SUSPENDED");
    expect(await db.notification.count()).toBe(0);
    for (const result of [
      await createWorkflow(input),
      await updateWorkflow({ ...input, id: wf.id }),
      await toggleWorkflow(wf.id, true),
      await testWorkflow(wf.id),
      await resumeWorkflowJob((await job()).id),
    ])
      expect(result.error).toBeTruthy();
  });
  it("blocca riferimenti esterni sia nel salvataggio sia a runtime", async () => {
    const step: WorkflowStep = {
      id: "move",
      action: { type: "UPDATE_DEAL_STAGE", stageId: "external-stage" },
    };
    expect((await createWorkflow({ ...input, steps: [step] })).error).toBeTruthy();
    await workflow([step]);
    await enqueue();
    await processWorkflowQueue({ orgId: "a" });
    expect((await job()).status).toBe("FAILED");
    expect((await db.deal.findUniqueOrThrow({ where: { id: "deal" } })).stageId).toBe("stage");
  });
  it("salta la fase di un'altra pipeline della stessa organizzazione senza fermare i passi successivi", async () => {
    // La validazione al salvataggio non lega la fase a una pipeline quando il trigger non filtra
    // per fase: la stessa automazione incontra legittimamente affari di un'altra pipeline.
    await db.pipeline.create({ data: { id: "pipeline-2", name: "Assistenza", organizationId: "a" } });
    await db.stage.create({
      data: { id: "stage-2", name: "Presa in carico", pipelineId: "pipeline-2", position: 0 },
    });
    const move: WorkflowStep = {
      id: "move",
      action: { type: "UPDATE_DEAL_STAGE", stageId: "stage-2" },
    };
    await workflow([move, notify]);
    await enqueue();
    await processWorkflowQueue({ orgId: "a" });
    expect((await job()).status).not.toBe("FAILED");
    // Il punto della correzione: prima l'errore definitivo impediva per sempre i passi successivi.
    expect(await db.notification.count()).toBeGreaterThan(0);
    expect((await db.deal.findUniqueOrThrow({ where: { id: "deal" } })).stageId).toBe("stage");
  });
  it("validare non esegue azioni e non incrementa i contatori", async () => {
    const wf = await workflow();
    expect((await testWorkflow(wf.id)).stepsRun).toBe(1);
    expect(await db.workflowExecution.count({ where: { workflowId: wf.id } })).toBe(0);
    expect(await db.notification.count()).toBe(0);
  });
  it("assegna i lead nuovi e usa il nuovo responsabile nei passi successivi", async () => {
    await workflow(
      [
        { id: "assign", action: { type: "ASSIGN_OWNER", userId: "second" } },
        { id: "mail", action: { type: "SEND_EMAIL", templateId: "template", to: "owner" } },
      ],
      { type: "LEAD_CREATED" },
    );
    const lead = await createLead({
      title: "Studio Rossi",
      email: "studio@example.test",
      score: 50,
      status: "NEW",
    });
    expect(lead.error).toBeNull();
    await processWorkflowQueue({ orgId: "a" });
    expect((await db.lead.findUniqueOrThrow({ where: { id: lead.data!.id } })).ownerId).toBe(
      "second",
    );
    expect(m.mail).toHaveBeenCalledWith(
      "a",
      expect.objectContaining({ to: "second@example.test", subject: "Ciao Studio Rossi" }),
    );
  });
  it("emette una scadenza una volta, serve oltre 50 record e rileva una nuova scadenza", async () => {
    await workflow([notify], { type: "ACTIVITY_OVERDUE" });
    await db.activity.createMany({
      data: Array.from({ length: 55 }, (_, i) => ({
        id: `act-${i}`,
        subject: "Scaduta",
        type: "TASK" as const,
        organizationId: "a",
        userId: "owner",
        dueDate: new Date(Date.now() - 100000),
      })),
    });
    expect(await enqueueOverdueActivities()).toBe(50);
    expect(await enqueueOverdueActivities()).toBe(5);
    expect(await enqueueOverdueActivities()).toBe(0);
    await db.activity.update({
      where: { id: "act-0" },
      data: { dueDate: new Date(Date.now() - 1000) },
    });
    expect(await enqueueOverdueActivities()).toBe(1);
    expect(await db.workflowQueue.count({ where: { orgId: "a" } })).toBe(56);
  });
});

describe("mutazioni, limiti e veridicità dei dati", () => {
  it("esegue gli eventi di creazione, modifica multipla e modifica in blocco", async () => {
    for (const type of [
      "DEAL_CREATED",
      "DEAL_STAGE_CHANGED",
      "DEAL_WON",
      "DEAL_LOST",
      "DEAL_VALUE_CHANGED",
    ])
      await workflow([notify], { type });
    const created = await createDeal({
      title: "Nuovo",
      value: 10,
      currency: "EUR",
      pipelineId: "pipeline",
      stageId: "stage",
    });
    expect(created.error).toBeUndefined();
    expect((await updateDeal({ id: "deal", status: "WON", value: 200 })).ok).toBe(true);
    expect((await updateDealsStatus(["deal"], "LOST")).count).toBe(1);
    const newDeal = await db.deal.findFirstOrThrow({ where: { title: "Nuovo" } });
    expect(
      (await moveDeal({ dealId: newDeal.id, oldStageId: "stage", newStageId: "next" })).ok,
    ).toBe(true);
    expect(await db.workflowQueue.count({ where: { orgId: "a" } })).toBe(5);
  });
  it("importa senza avviare email salvo consenso esplicito nella configurazione", async () => {
    const wf = await workflow([notify], { type: "CONTACT_CREATED" });
    expect((await importContacts([{ firstName: "Anna" }])).error).toBeNull();
    expect(await db.workflowQueue.count({ where: { orgId: "a" } })).toBe(0);
    await db.workflow.update({ where: { id: wf.id }, data: { triggerOnImport: true } });
    expect((await importContacts([{ firstName: "Carla" }])).imported).toBe(1);
    expect(await db.workflowQueue.count({ where: { orgId: "a" } })).toBe(1);
    await workflow([notify], { type: "LEAD_CREATED" });
    expect((await importLeads([{ title: "Importato" }])).created).toBe(1);
    expect(await db.workflowQueue.count({ where: { orgId: "a" } })).toBe(1);
  });
  it("rollback della modifica CRM quando non è possibile salvare il suo evento", async () => {
    await workflow([notify], { type: "CONTACT_CREATED" });
    await db.$executeRawUnsafe(
      `ALTER TABLE "WorkflowQueue" ADD CONSTRAINT "test_queue_failure" CHECK ("orgId" <> 'a')`,
    );
    expect((await createContact({ firstName: "Non salvare" })).error).toBeTruthy();
    expect(await db.contact.count({ where: { firstName: "Non salvare" } })).toBe(0);
    await db.$executeRawUnsafe('ALTER TABLE "WorkflowQueue" DROP CONSTRAINT "test_queue_failure"');
  });
  it("nega scritture al Viewer anche quando il token dichiara ancora OWNER", async () => {
    await db.user.update({ where: { id: "owner" }, data: { role: "VIEWER" } });
    expect((await createContact({ firstName: "Vietato" })).error).toBeTruthy();
    expect((await createWorkflow(input)).error).toBeTruthy();
    expect((await inviteTeamMember("new@example.test", "ADMIN")).error).toBeTruthy();
  });
  it("non permette di invitare un altro Owner", async () => {
    expect((await inviteTeamMember("new@example.test", "OWNER")).error).toBeTruthy();
    expect(await db.invitation.count()).toBe(0);
  });
  it("non collega email a contatti esterni e persiste lo stato attivo del prodotto", async () => {
    expect(
      (
        await sendEmail({
          to: "test@example.test",
          subject: "Prova",
          body: "Ciao",
          contactId: "external-contact",
        })
      ).error,
    ).toBeTruthy();
    expect(m.mail).not.toHaveBeenCalled();
    expect(
      (
        await saveDraft({
          to: "test@example.test",
          subject: "Prova",
          body: "Ciao",
          contactId: "external-contact",
        })
      ).error,
    ).toBeTruthy();
    await db.product.create({
      data: { id: "product", name: "Consulenza", unitPrice: 100, organizationId: "a" },
    });
    expect((await toggleProductActive("product", false)).error).toBeUndefined();
    expect((await db.product.findUniqueOrThrow({ where: { id: "product" } })).isActive).toBe(false);
  });
  it("rispetta l'ultimo posto contatto e l'unica pipeline anche con richieste simultanee", async () => {
    await db.organization.update({ where: { id: "a" }, data: { plan: "STARTER" } });
    await db.contact.createMany({
      data: Array.from({ length: 498 }, (_, i) => ({
        firstName: `C${i}`,
        organizationId: "a",
        ownerId: "owner",
      })),
    });
    const outcomes = await Promise.all([
      createContact({ firstName: "Ultimo A" }),
      createContact({ firstName: "Ultimo B" }),
    ]);
    expect(outcomes.filter((r) => r.error === null)).toHaveLength(1);
    expect(await db.contact.count({ where: { organizationId: "a" } })).toBe(500);
    expect((await createPipeline("Seconda")).error).toBeTruthy();
  });
  it("separa le valute e usa le chiusure del periodo senza includere gli eliminati", async () => {
    const now = new Date();
    const old = new Date(now.getTime() - 200 * 86400000);
    await db.deal.update({
      where: { id: "deal" },
      data: { createdAt: old, closedAt: now, status: "WON" },
    });
    for (const [id, status, currency, value] of [
      ["lost", "LOST", "EUR", 200],
      ["usd", "WON", "USD", 9000],
      ["deleted", "DELETED", "EUR", 99999],
      ["open", "OPEN", "EUR", 300],
    ] as const)
      await db.deal.create({
        data: {
          id,
          status,
          currency,
          value,
          title: id,
          createdAt: old,
          closedAt: status === "OPEN" ? null : now,
          organizationId: "a",
          ownerId: "owner",
          pipelineId: "pipeline",
          stageId: "stage",
        },
      });
    const eur = await getReportData("30d", "EUR");
    const usd = await getReportData("30d", "USD");
    expect(eur?.kpis).toMatchObject({
      wonValue: 100,
      wonDeals: 1,
      lostDeals: 1,
      convRate: 50,
      openDeals: 1,
      totalValue: 300,
    });
    expect(eur?.funnel[0]?.count).toBe(1);
    expect(usd?.kpis.wonValue).toBe(9000);
  });
  it("la conversione rispetta quota, prodotti dell'organizzazione ed esecuzione unica", async () => {
    await db.lead.create({
      data: { id: "lead", title: "Studio", data: {}, organizationId: "a", ownerId: "owner" },
    });
    const conversion = {
      dealTitle: "Contratto",
      dealValue: 100,
      currency: "EUR",
      createContact: true,
      contactFirstName: "Laura",
      createCompany: false,
      productQuantity: 1,
    };
    await db.product.create({
      data: { id: "foreign-product", name: "Esterno", unitPrice: 100, organizationId: "b" },
    });
    expect(
      (
        await convertLead("lead", {
          ...conversion,
          productId: "foreign-product",
          productUnitPrice: 1,
        })
      ).error,
    ).toMatch(/Prodotto non disponibile/);
    await db.organization.update({ where: { id: "a" }, data: { plan: "STARTER" } });
    await db.contact.createMany({
      data: Array.from({ length: 499 }, (_, i) => ({
        firstName: `C${i}`,
        organizationId: "a",
        ownerId: "owner",
      })),
    });
    expect((await convertLead("lead", conversion)).error).toMatch(/limite di 500/);
    expect((await db.lead.findUniqueOrThrow({ where: { id: "lead" } })).status).toBe("NEW");
    await db.organization.update({ where: { id: "a" }, data: { plan: "PRO" } });
    await workflow([notify], { type: "DEAL_CREATED" });
    await workflow([notify], { type: "CONTACT_CREATED" });
    const results = await Promise.all([
      convertLead("lead", conversion),
      convertLead("lead", conversion),
    ]);
    expect(results.filter((r) => r.error === null)).toHaveLength(1);
    expect(await db.deal.count({ where: { title: "Contratto" } })).toBe(1);
    expect(await db.workflowQueue.count({ where: { orgId: "a" } })).toBe(2);
  });
  it("API e interfaccia emettono gli stessi eventi e rifiutano riferimenti esterni", async () => {
    for (const type of [
      "DEAL_CREATED",
      "CONTACT_CREATED",
      "LEAD_CREATED",
      "DEAL_STAGE_CHANGED",
      "DEAL_WON",
      "DEAL_VALUE_CHANGED",
    ])
      await workflow([notify], { type });
    const request = (body: object) =>
      new NextRequest("http://localhost/api/v1/test", {
        method: "POST",
        body: JSON.stringify(body),
      });
    expect((await apiContact(request({ firstName: "API" }))).status).toBe(201);
    expect((await apiLead(request({ title: "Lead API", ownerId: "external" }))).status).toBe(422);
    expect((await apiLead(request({ title: "Lead API" }))).status).toBe(201);
    expect(
      (await apiDeal(request({ title: "Deal API", stageId: "stage", pipelineId: "pipeline" })))
        .status,
    ).toBe(201);
    expect(
      (
        await apiUpdateDeal(request({ stageId: "next", status: "WON", value: 600 }), {
          params: Promise.resolve({ id: "deal" }),
        })
      ).status,
    ).toBe(200);
    expect(await db.workflowQueue.count({ where: { orgId: "a" } })).toBe(6);
  });
  it("conserva filtri e rifiuta azioni incomplete, destinazioni e identificatori duplicati", async () => {
    for (const steps of [
      [{ id: "a", action: { type: "UPDATE_DEAL_STAGE", stageId: "" } }],
      [notify, notify],
      [{ id: "a", action: { type: "WAIT", days: 0 } }],
      [{ id: "a", action: { type: "SEND_EMAIL", templateId: "template", to: "invalid" } }],
    ])
      expect(
        (await createWorkflow({ ...input, steps } as Parameters<typeof createWorkflow>[0])).error,
      ).toBeTruthy();
    const result = await createWorkflow({
      ...input,
      trigger: { type: "DEAL_STAGE_CHANGED", fromStageId: "stage", toStageId: "next" },
    });
    expect(result.data?.trigger).toMatchObject({ fromStageId: "stage", toStageId: "next" });
    await toggleWorkflow(result.data!.id, true);
    await enqueue({
      ...payload,
      trigger: "DEAL_STAGE_CHANGED",
      fromStageId: "next",
      toStageId: "stage",
    });
    expect(await db.workflowQueue.count({ where: { orgId: "a" } })).toBe(0);
    await enqueue({
      ...payload,
      trigger: "DEAL_STAGE_CHANGED",
      fromStageId: "stage",
      toStageId: "next",
    });
    expect(await db.workflowQueue.count({ where: { orgId: "a" } })).toBe(1);
  });
  it("recupera una lease scaduta ma ferma un invio email interrotto", async () => {
    await workflow();
    await enqueue();
    await db.workflowQueue.update({
      where: { id: (await job()).id },
      data: { status: "RUNNING", lockedUntil: new Date(0), lockToken: "old" },
    });
    await processWorkflowQueue({ orgId: "a" });
    expect(await db.notification.count()).toBe(1);
    await enqueue(payload, "second");
    const pending = await db.workflowQueue.findFirstOrThrow({
      where: { status: "PENDING", orgId: "a" },
    });
    await db.workflowQueue.update({
      where: { id: pending.id },
      data: { status: "RUNNING", lockedUntil: new Date(0), lockToken: "old", emailInFlight: true },
    });
    await processWorkflowQueue({ orgId: "a" });
    expect((await db.workflowQueue.findUniqueOrThrow({ where: { id: pending.id } })).status).toBe(
      "FAILED",
    );
    expect(await db.notification.count()).toBe(1);
  });
});

describe("Stripe: transazioni e ordine degli eventi", () => {
  function setupStripe() {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "test-secret");
    const subscription = {
      id: "sub-current",
      customer: "cus-a",
      status: "active",
      metadata: { organizationId: "a" },
      items: { data: [{ price: { id: "price-pro" }, current_period_end: 1800000000 }] },
    };
    m.event.mockReturnValue({
      id: "evt-test",
      type: "customer.subscription.updated",
      data: { object: subscription },
    });
    m.retrieve.mockResolvedValue(subscription);
    return subscription;
  }
  const request = () =>
    new NextRequest("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "test" },
      body: "test",
    });
  it("registra l'evento soltanto insieme al piano e consente il retry dopo errore", async () => {
    setupStripe();
    await db.organization.update({ where: { id: "a" }, data: { plan: "STARTER" } });
    m.retrieve.mockRejectedValueOnce(new Error("Stripe temporaneamente offline"));
    expect((await stripeWebhook(request())).status).toBe(500);
    expect(await db.processedStripeEvent.count()).toBe(0);
    expect((await stripeWebhook(request())).status).toBe(200);
    expect(await db.processedStripeEvent.count()).toBe(1);
    expect(await db.organization.findUnique({ where: { id: "a" } })).toMatchObject({
      plan: "PRO",
      stripeCurrentPeriodEnd: new Date(1800000000000),
    });
    expect(await (await stripeWebhook(request())).json()).toMatchObject({ duplicate: true });
  });
  it("annulla anche la modifica piano se fallisce il marker finale", async () => {
    setupStripe();
    await db.organization.update({ where: { id: "a" }, data: { plan: "STARTER" } });
    await db.$executeRawUnsafe(
      `ALTER TABLE "ProcessedStripeEvent" ADD CONSTRAINT "test_marker_failure" CHECK (id <> 'evt-test')`,
    );
    expect((await stripeWebhook(request())).status).toBe(500);
    expect((await db.organization.findUniqueOrThrow({ where: { id: "a" } })).plan).toBe("STARTER");
    await db.$executeRawUnsafe(
      'ALTER TABLE "ProcessedStripeEvent" DROP CONSTRAINT "test_marker_failure"',
    );
  });
  it("ignora la cancellazione di un vecchio abbonamento e rifiuta prezzi ignoti", async () => {
    const subscription = setupStripe();
    await db.organization.update({
      where: { id: "a" },
      data: { stripeSubscriptionId: "sub-current" },
    });
    m.event.mockReturnValueOnce({
      id: "old",
      type: "customer.subscription.deleted",
      data: { object: { ...subscription, id: "sub-old", status: "canceled" } },
    });
    expect((await stripeWebhook(request())).status).toBe(200);
    expect(m.retrieve).not.toHaveBeenCalled();
    m.retrieve.mockResolvedValue({
      ...subscription,
      items: { data: [{ price: { id: "unknown" } }] },
    });
    expect((await stripeWebhook(request())).status).toBe(500);
    expect(await db.processedStripeEvent.findUnique({ where: { id: "evt-test" } })).toBeNull();
  });
});
