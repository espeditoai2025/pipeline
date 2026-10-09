import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db, startDatabase, closeDatabase } from "./database";
const mocks = vi.hoisted(() => ({ send: vi.fn(), smtp: vi.fn(), auth: vi.fn() }));
vi.mock("@/lib/db", async () => await import("./database"));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/workflow-wake", () => ({ wakeWorkflows: vi.fn() }));
vi.mock("@/lib/resend", () => ({
  resend: { emails: { send: mocks.send } },
  FROM_DEFAULT: "Fixture <fixture@example.test>",
}));
vi.mock("@/lib/smtp-send", () => ({ sendViaSMTP: mocks.smtp }));
import { sendOrgMail } from "@/lib/mailer";
import { deliverCampaign } from "@/lib/campaign-sender";
import { enqueueWorkflows } from "@/lib/workflow-events";
import { processWorkflowQueue } from "@/lib/workflow-engine";
import { crmTransaction } from "@/lib/crm-transaction";
import { importContacts } from "@/server/actions/contacts";
import { importLeads } from "@/server/actions/leads";
import { importContactsToList } from "@/server/actions/campaigns";
const orgId = "policy-org",
  userId = "policy-owner",
  address = "cliente@example.test";
beforeAll(startDatabase);
afterAll(async () => {
  vi.unstubAllEnvs();
  await closeDatabase();
});
beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubEnv("AUTH_SECRET", "fixture-policy-secret");
  await db.organization.deleteMany({ where: { id: { in: [orgId, "policy-other"] } } });
  await db.organization.createMany({
    data: [
      { id: orgId, name: "Policy", slug: orgId, plan: "PRO" },
      { id: "policy-other", name: "Other", slug: "policy-other", plan: "PRO" },
    ],
  });
  await db.user.create({
    data: { id: userId, email: "owner@example.test", organizationId: orgId, role: "OWNER" },
  });
  await db.contact.create({
    data: {
      id: "policy-contact",
      firstName: "Cliente",
      email: address,
      organizationId: orgId,
      ownerId: userId,
    },
  });
  await db.emailList.create({ data: { id: "policy-list", name: "Lista", organizationId: orgId } });
  await db.emailListContact.create({
    data: { id: "policy-list-contact", listId: "policy-list", email: address },
  });
  mocks.auth.mockResolvedValue({ user: { id: userId, organizationId: orgId, role: "OWNER" } });
  mocks.send.mockResolvedValue({ data: { id: "synthetic-provider-receipt" }, error: null });
  mocks.smtp.mockResolvedValue({ ok: true });
});
async function suppress(
  status: "DO_NOT_CONTACT" | "PERMANENT_BOUNCE" | "SUSPENDED" = "DO_NOT_CONTACT",
  organizationId = orgId,
) {
  return db.recipientPolicy.create({
    data: {
      organizationId,
      address,
      status,
      reason: "Verificato",
      source: "fixture",
      effectiveAt: new Date(),
    },
  });
}
const mail = { to: " CLIENTE@EXAMPLE.TEST ", subject: "Fixture", html: "<p>Fixture</p>" };
describe("esclusioni applicate al punto di invio", () => {
  it("blocca marketing e copie prima di Resend/SMTP, anche con canale già risolto", async () => {
    await suppress();
    for (const channel of ["resend", "smtp"] as const) {
      expect(await sendOrgMail(orgId, mail, channel)).toMatchObject({ ok: false, blocked: true });
      expect(
        await sendOrgMail(
          orgId,
          { ...mail, to: "altro@example.test", cc: [" CLIENTE@EXAMPLE.TEST "] },
          channel,
        ),
      ).toMatchObject({ ok: false, blocked: true });
    }
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.smtp).not.toHaveBeenCalled();
  });
  it("il blocco marketing non impedisce invii manuali o assistenza; un bounce blocca anche quelli", async () => {
    await suppress();
    expect(await sendOrgMail(orgId, { ...mail, purpose: "MANUAL" }, "resend")).toMatchObject({
      ok: true,
    });
    expect(await sendOrgMail(orgId, { ...mail, purpose: "SUPPORT" }, "resend")).toMatchObject({
      ok: true,
    });
    await db.recipientPolicy.updateMany({
      where: { organizationId: orgId },
      data: { status: "PERMANENT_BOUNCE" },
    });
    expect(await sendOrgMail(orgId, { ...mail, purpose: "MANUAL" }, "resend")).toMatchObject({
      blocked: true,
    });
    expect(mocks.send).toHaveBeenCalledTimes(2);
  });
  it("isola organizzazioni, mantiene i blocchi dopo reimport e non reiscrive i disiscritti", async () => {
    await suppress("DO_NOT_CONTACT", "policy-other");
    expect(await sendOrgMail(orgId, mail, "resend")).toMatchObject({ ok: true });
    await suppress();
    await db.emailListContact.update({
      where: { id: "policy-list-contact" },
      data: { unsubscribed: true },
    });
    expect(
      await importContactsToList("policy-list", [{ email: " CLIENTE@EXAMPLE.TEST " }]),
    ).toMatchObject({ data: { added: 0, skipped: 1 } });
    expect(
      (await db.emailListContact.findUniqueOrThrow({ where: { id: "policy-list-contact" } }))
        .unsubscribed,
    ).toBe(true);
    await db.recipientPolicy.updateMany({
      where: { organizationId: orgId },
      data: { status: "CLEARED", verification: "Correzione" },
    });
    expect(
      await sendOrgMail(orgId, { ...mail, listContactId: "policy-list-contact" }, "resend"),
    ).toMatchObject({ blocked: true });
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
  it("una campagna già programmata consulta l'esclusione al momento dell'invio", async () => {
    const campaign = await db.emailCampaign.create({
      data: {
        name: "Programmata",
        subject: "Fixture",
        body: "Ciao",
        listId: "policy-list",
        organizationId: orgId,
        status: "SCHEDULED",
        scheduledAt: new Date(Date.now() - 1000),
      },
    });
    await suppress();
    expect(await deliverCampaign(campaign.id, orgId)).toMatchObject({
      sent: 0,
      failed: 0,
      suppressed: 1,
    });
    expect(mocks.send).not.toHaveBeenCalled();
    expect(await db.campaignDelivery.count({ where: { campaignId: campaign.id } })).toBe(0);
  });
  it("un workflow già accodato salta l'invio e non lascia un esito incerto", async () => {
    await db.emailTemplate.create({
      data: {
        id: "policy-template",
        name: "Fixture",
        category: "fixture",
        subject: "Fixture",
        body: "Ciao",
        organizationId: orgId,
      },
    });
    const workflow = await db.workflow.create({
      data: {
        name: "Fixture",
        organizationId: orgId,
        isActive: true,
        trigger: { type: "CONTACT_CREATED" },
        steps: [
          {
            id: "send",
            action: { type: "SEND_EMAIL", to: "contact", templateId: "policy-template" },
          },
        ],
      },
    });
    await crmTransaction((tx) =>
      enqueueWorkflows(
        tx,
        {
          trigger: "CONTACT_CREATED",
          orgId,
          contactId: "policy-contact",
          contactName: "Cliente",
          contactEmail: address,
          ownerId: userId,
        },
        "policy-event",
      ),
    );
    await suppress();
    await processWorkflowQueue({ orgId, limit: 20 });
    const job = await db.workflowQueue.findFirstOrThrow({ where: { workflowId: workflow.id } });
    expect(job).toMatchObject({ status: "SKIPPED", emailInFlight: false, stepIndex: 1 });
    expect(job.logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "SEND_EMAIL", status: "SKIPPED" }),
      ]),
    );
    expect(mocks.send).not.toHaveBeenCalled();
    expect(await db.email.count({ where: { organizationId: orgId } })).toBe(0);
  });
  it("non invia se la lettura del blocco fallisce e gestisce le sospensioni scadute", async () => {
    const policy = await suppress("SUSPENDED");
    expect(await sendOrgMail(orgId, mail, "resend")).toMatchObject({ blocked: true });
    await db.recipientPolicy.update({
      where: { id: policy.id },
      data: { suspendedUntil: new Date(Date.now() - 1000) },
    });
    expect(await sendOrgMail(orgId, mail, "resend")).toMatchObject({ ok: true });
    const failure = vi
      .spyOn(db.recipientPolicy, "findMany")
      .mockRejectedValueOnce(new Error("Unavailable"));
    expect(await sendOrgMail(orgId, mail, "resend")).toMatchObject({
      ok: false,
      error: expect.stringContaining("verificare"),
    });
    failure.mockRestore();
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
});
describe("importazioni senza duplicati né invii", () => {
  it("contatti: preserva ID esterno ed email anche nei reimport concorrenti", async () => {
    const rows = [
      {
        firstName: "GoBus",
        email: " GOBUS@EXAMPLE.TEST ",
        externalSource: " GoBus ",
        externalId: " 123 ",
      },
    ];
    const results = await Promise.all([importContacts(rows), importContacts(rows)]);
    expect(results.every((value) => value.error === null)).toBe(true);
    expect(results.map((value) => value.imported).sort()).toEqual([0, 1]);
    const record = await db.contact.findFirstOrThrow({
      where: { externalSource: "gobus", externalId: "123", organizationId: orgId },
    });
    expect(record.email).toBe("gobus@example.test");
    expect(await importContacts([{ ...rows[0]!, email: "altro@example.test" }])).toMatchObject({
      imported: 0,
      duplicates: 1,
    });
    expect(await db.workflowQueue.count({ where: { orgId } })).toBe(0);
  });
  it("lead e liste email: normalizza maiuscole/spazi e non duplica esistenti o righe del file", async () => {
    const rows = [
      { title: "Uno", email: " LEAD@EXAMPLE.TEST " },
      { title: "Duplicato", email: "lead@example.test" },
    ];
    expect(await importLeads(rows)).toMatchObject({ created: 1, skipped: 1, error: null });
    expect(await importLeads(rows)).toMatchObject({ created: 0, skipped: 2, error: null });
    const listRows = [{ email: " NEW@EXAMPLE.TEST " }, { email: "new@example.test" }];
    expect(await importContactsToList("policy-list", listRows)).toMatchObject({
      data: { added: 1, skipped: 1 },
    });
    expect(await importContactsToList("policy-list", listRows)).toMatchObject({
      data: { added: 0, skipped: 2 },
    });
    expect(await db.workflowQueue.count({ where: { orgId } })).toBe(0);
  });
});
