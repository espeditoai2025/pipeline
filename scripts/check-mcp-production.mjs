// Creates and removes only its own synthetic organization; never sends messages.
import dotenv from "dotenv";
import pg from "pg";
import fs from "node:fs/promises";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

if (process.argv[2] !== "--synthetic-fixture") throw new Error("Use --synthetic-fixture");
const reportPath = process.argv[3] ?? "docs/MCP-PRODUZIONE-GOBUS-OPERATIVITA-2026-10-09.json";
if (
  !/^docs\/MCP-PRODUZIONE(?:-CONTATTI|-GOBUS(?:-OPERATIVITA)?)?-\d{4}-\d{2}-\d{2}\.json$/.test(
    reportPath,
  )
)
  throw new Error("Use a dated MCP report under docs");
dotenv.config({ path: ".env.local", quiet: true });
const origin = "https://www.pipely.it";
const id = `mcp-smoke-${randomUUID()}`;
const userId = `${id}-owner`,
  tokenId = `${id}-token`;
const raw = `pip_mcp_${randomBytes(32).toString("hex")}`;
const keyHash = createHash("sha256").update(raw).digest("hex");
const connection = new URL(process.env.DIRECT_URL);
for (const name of ["sslmode", "sslcert", "sslkey", "sslrootcert"])
  connection.searchParams.delete(name);
if (!process.env.DATABASE_CA_CERT) throw new Error("Verified CA required");
const database = new pg.Client({
  connectionString: connection.toString(),
  ssl: { ca: process.env.DATABASE_CA_CERT.replace(/\\n/g, "\n"), rejectUnauthorized: true },
  connectionTimeoutMillis: 15000,
});
const client = new Client({ name: "pipely-production-smoke", version: "1.0.0" });
const proof = {
  checkedAt: new Date().toISOString(),
  endpoint: `${origin}/api/mcp`,
  syntheticFixture: true,
  checks: {},
  removed: false,
};
let created = false;
let phase = "connect database";
function assert(condition, label) {
  if (!condition) throw new Error(label);
  proof.checks[label] = true;
}
const value = (result) => result.structuredContent;
try {
  await database.connect();
  phase = "create isolated fixture";
  await database.query("BEGIN");
  await database.query(
    'INSERT INTO "Organization" (id,name,slug,plan,"updatedAt") VALUES ($1,$2,$1,$3,now())',
    [id, "Synthetic MCP verification", "STARTER"],
  );
  await database.query(
    'INSERT INTO "User" (id,email,name,role,"organizationId") VALUES ($1,$2,$3,$4,$5)',
    [userId, `${id}@example.test`, "Synthetic MCP owner", "OWNER", id],
  );
  await database.query(
    'INSERT INTO "McpToken" (id,name,"keyHash",prefix,"canWrite","organizationId","createdBy","expiresAt") VALUES ($1,$2,$3,$4,true,$5,$6,now()+interval \'1 hour\')',
    [tokenId, "Synthetic MCP agent", keyHash, raw.slice(0, 16), id, userId],
  );
  created = true;
  await database.query("COMMIT");
  phase = "HTTP MCP client";
  await client.connect(
    new StreamableHTTPClientTransport(new URL(`${origin}/api/mcp`), {
      authProvider: { token: async () => raw },
    }),
  );
  assert((await client.listTools()).tools.length === 35, "officialClient35Tools");
  const context = await client.callTool({ name: "pipely_get_context", arguments: {} });
  assert(value(context)?.organization?.id === id, "isolatedTenant");
  const input = { requestId: randomUUID(), firstName: "Cliente sintetico MCP" };
  const first = await client.callTool({ name: "pipely_create_contact", arguments: input });
  const repeated = await client.callTool({ name: "pipely_create_contact", arguments: input });
  assert(
    !!value(first)?.id &&
      !value(first).replayed &&
      value(repeated)?.id === value(first).id &&
      value(repeated).replayed,
    "idempotentContactCreation",
  );
  const note = await client.callTool({
    name: "pipely_create_note",
    arguments: {
      requestId: randomUUID(),
      contactId: value(first).id,
      content: "Nota di verifica sintetica",
    },
  });
  assert(!!value(note)?.id, "noteCreated");
  const record = await client.callTool({
    name: "pipely_get_record",
    arguments: { kind: "contact", id: value(first).id },
  });
  assert(value(record)?.recentNotes?.length === 1, "noteReadBack");
  const companyInput = {
    requestId: randomUUID(),
    name: "Azienda sintetica MCP",
    city: "Roma",
    phone: "0000000000",
    referentName: "Referente sintetico",
  };
  const company = await client.callTool({ name: "pipely_create_company", arguments: companyInput });
  const companyRetry = await client.callTool({
    name: "pipely_create_company",
    arguments: companyInput,
  });
  assert(
    !!value(company)?.id &&
      value(companyRetry)?.id === value(company).id &&
      value(companyRetry).replayed,
    "idempotentCompanyCreation",
  );
  const companyUpdate = {
    requestId: randomUUID(),
    id: value(company).id,
    expectedUpdatedAt: value(company).updatedAt,
    city: "Milano",
    phone: null,
  };
  const updated = await client.callTool({
    name: "pipely_update_company",
    arguments: companyUpdate,
  });
  const updatedRetry = await client.callTool({
    name: "pipely_update_company",
    arguments: companyUpdate,
  });
  const companyRecord = await client.callTool({
    name: "pipely_get_record",
    arguments: { kind: "company", id: value(company).id },
  });
  assert(
    value(updated)?.id === value(company).id &&
      value(updatedRetry)?.replayed &&
      value(companyRecord)?.data?.city === "Milano" &&
      value(companyRecord).data.phone === null &&
      value(companyRecord).data.referentName === companyInput.referentName,
    "partialCompanyUpdateAndRetry",
  );
  const stale = await client.callTool({
    name: "pipely_update_company",
    arguments: { ...companyUpdate, requestId: randomUUID(), city: "Torino" },
  });
  assert(stale.isError, "staleCompanyVersionRejected");
  const contactUpdate = {
    requestId: randomUUID(),
    id: value(first).id,
    expectedUpdatedAt: value(record).data.updatedAt,
    companyId: value(company).id,
  };
  const contactLinked = await client.callTool({
    name: "pipely_update_contact",
    arguments: contactUpdate,
  });
  const contactRetry = await client.callTool({
    name: "pipely_update_contact",
    arguments: contactUpdate,
  });
  const linkedContacts = await client.callTool({
    name: "pipely_list_contacts",
    arguments: { companyId: value(company).id },
  });
  assert(
    value(contactLinked)?.id === value(first).id &&
      value(contactRetry)?.replayed &&
      value(linkedContacts)?.data?.length === 1 &&
      value(linkedContacts).data[0].id === value(first).id &&
      value(linkedContacts).data[0].firstName === input.firstName,
    "existingContactLinkedAndRetry",
  );
  const staleContact = await client.callTool({
    name: "pipely_update_contact",
    arguments: { ...contactUpdate, requestId: randomUUID(), companyId: null },
  });
  assert(staleContact.isError, "staleContactVersionRejected");
  const contactUnlinked = await client.callTool({
    name: "pipely_update_contact",
    arguments: {
      ...contactUpdate,
      requestId: randomUUID(),
      expectedUpdatedAt: value(contactLinked).updatedAt,
      companyId: null,
    },
  });
  const unlinkedRecord = await client.callTool({
    name: "pipely_get_record",
    arguments: { kind: "contact", id: value(first).id },
  });
  assert(
    value(contactUnlinked)?.id === value(first).id &&
      value(unlinkedRecord)?.data?.companyId === null,
    "contactCompanyRemoved",
  );
  const activity = await client.callTool({
    name: "pipely_create_activity",
    arguments: {
      requestId: randomUUID(),
      subject: "Attività sintetica MCP",
      type: "TASK",
      contactId: value(first).id,
    },
  });
  assert(!!value(activity)?.id, "activityCreated");
  const completionInput = { requestId: randomUUID(), id: value(activity).id };
  const completion = await client.callTool({
    name: "pipely_complete_activity",
    arguments: completionInput,
  });
  const completionRetry = await client.callTool({
    name: "pipely_complete_activity",
    arguments: completionInput,
  });
  const completedAgain = await client.callTool({
    name: "pipely_complete_activity",
    arguments: { ...completionInput, requestId: randomUUID() },
  });
  const activityRecord = await client.callTool({
    name: "pipely_get_record",
    arguments: { kind: "activity", id: value(activity).id },
  });
  assert(
    !!value(completion)?.completedAt &&
      value(completionRetry)?.replayed &&
      value(completedAgain)?.alreadyCompleted &&
      value(completedAgain).completedAt === value(completion).completedAt &&
      value(activityRecord)?.data?.completedAt === value(completion).completedAt,
    "activityCompletionPreservesDate",
  );
  const syncInput = {
    requestId: randomUUID(),
    externalSource: " GoBus ",
    externalId: " smoke-company ",
    name: "GoBus sintetico",
  };
  const syncCompany = await client.callTool({
    name: "pipely_upsert_company",
    arguments: syncInput,
  });
  const syncRetry = await client.callTool({ name: "pipely_upsert_company", arguments: syncInput });
  const external = await client.callTool({
    name: "pipely_get_external_record",
    arguments: { kind: "company", externalSource: "gobus", externalId: "smoke-company" },
  });
  assert(
    value(syncCompany)?.id &&
      value(syncRetry)?.replayed &&
      value(external)?.record?.id === value(syncCompany).id,
    "permanentExternalIdentityAndRetry",
  );
  const batch = {
    requestId: randomUUID(),
    entries: [
      {
        kind: "contact",
        data: {
          externalSource: "gobus",
          externalId: "smoke-contact",
          firstName: "Contatto GoBus sintetico",
          companyId: value(syncCompany).id,
        },
      },
    ],
  };
  const preview = await client.callTool({ name: "pipely_import_batch", arguments: batch });
  assert(
    value(preview)?.dryRun && value(preview)?.results?.[0]?.status === "would_created",
    "importDryRun",
  );
  const imported = await client.callTool({
    name: "pipely_import_batch",
    arguments: { ...batch, dryRun: false },
  });
  const importedAgain = await client.callTool({
    name: "pipely_import_batch",
    arguments: { ...batch, requestId: randomUUID(), dryRun: false },
  });
  assert(
    value(imported)?.results?.[0]?.id &&
      value(importedAgain)?.results?.[0]?.id === value(imported).results[0].id &&
      value(importedAgain).results[0].status === "unchanged",
    "repeatImportPreservesIds",
  );
  const policyInput = {
    requestId: randomUUID(),
    address: " SMOKE@EXAMPLE.TEST ",
    status: "DO_NOT_CONTACT",
    reason: "Esclusione sintetica",
    source: "gobus-fixture",
    effectiveAt: new Date().toISOString(),
  };
  const policy = await client.callTool({
    name: "pipely_set_recipient_policy",
    arguments: policyInput,
  });
  const policyRetry = await client.callTool({
    name: "pipely_set_recipient_policy",
    arguments: policyInput,
  });
  const policyRead = await client.callTool({
    name: "pipely_get_recipient_policy",
    arguments: { address: "smoke@example.test" },
  });
  assert(
    value(policy)?.id &&
      value(policyRetry)?.replayed &&
      value(policyRead)?.policy?.status === "DO_NOT_CONTACT" &&
      value(policyRead).policy.events.length === 1,
    "structuredRecipientPolicyAndRetry",
  );
  const unverifiedClear = await client.callTool({
    name: "pipely_set_recipient_policy",
    arguments: {
      ...policyInput,
      requestId: randomUUID(),
      status: "CLEARED",
      expectedUpdatedAt: value(policy).updatedAt,
    },
  });
  assert(unverifiedClear.isError, "unverifiedPolicyClearRejected");
  phase = "GoBus operational tools";
  const activityRead = await client.callTool({
    name: "pipely_get_record",
    arguments: { kind: "activity", id: value(activity).id },
  });
  const rescheduled = await client.callTool({
    name: "pipely_update_activity",
    arguments: {
      requestId: randomUUID(),
      id: value(activity).id,
      expectedUpdatedAt: value(activityRead).data.updatedAt,
      subject: "Verifica sintetica ripianificata",
      dueDate: "2030-10-09T09:00:00Z",
      companyId: value(company).id,
    },
  });
  const reopenArgs = {
    requestId: randomUUID(),
    id: value(activity).id,
    expectedUpdatedAt: value(rescheduled).updatedAt,
    reason: "Riapertura sintetica",
  };
  const reopened = await client.callTool({ name: "pipely_reopen_activity", arguments: reopenArgs });
  const reopenedRetry = await client.callTool({
    name: "pipely_reopen_activity",
    arguments: reopenArgs,
  });
  const activityHistory = await client.callTool({
    name: "pipely_get_record",
    arguments: { kind: "activity", id: value(activity).id },
  });
  assert(
    value(reopened)?.record?.completedAt === null &&
      value(reopenedRetry)?.replayed &&
      value(activityHistory)?.events?.some(
        (e) => e.action === "REOPENED" && e.completedAt === value(completion).completedAt,
      ),
    "activityRescheduleAndAuditedReopen",
  );
  const companyNote = await client.callTool({
    name: "pipely_create_note",
    arguments: {
      requestId: randomUUID(),
      companyId: value(company).id,
      content: "Nota aziendale sintetica",
    },
  });
  const companyRead = await client.callTool({
    name: "pipely_get_record",
    arguments: { kind: "company", id: value(company).id },
  });
  assert(
    value(companyNote)?.id &&
      value(companyRead)?.recentNotes?.some((n) => n.id === value(companyNote).id),
    "companyNoteWithoutCommercialContact",
  );
  const field = await client.callTool({
    name: "pipely_save_custom_field",
    arguments: {
      requestId: randomUUID(),
      entityType: "company",
      name: "ID GoBus sintetico",
      fieldType: "text",
    },
  });
  const fields = await client.callTool({
    name: "pipely_list_custom_fields",
    arguments: { entityType: "company" },
  });
  const customValues = await client.callTool({
    name: "pipely_set_custom_values",
    arguments: {
      requestId: randomUUID(),
      id: value(company).id,
      entityType: "company",
      expectedUpdatedAt: value(companyRead).data.updatedAt,
      values: [{ fieldId: value(field).id, value: "synthetic-35" }],
    },
  });
  const customRead = await client.callTool({
    name: "pipely_get_record",
    arguments: { kind: "company", id: value(company).id },
  });
  assert(
    value(customValues)?.id &&
      value(fields)?.fields?.length === 1 &&
      value(customRead)?.customValues?.[0]?.value === "synthetic-35",
    "versionedCustomFieldsAndValues",
  );
  const pipeline = await client.callTool({
    name: "pipely_save_pipeline",
    arguments: {
      requestId: randomUUID(),
      name: "GoBus sintetico",
      stages: [{ name: "Verifica", probability: 10 }],
    },
  });
  const profile = await client.callTool({
    name: "pipely_set_gobus_profile",
    arguments: {
      requestId: randomUUID(),
      companyId: value(company).id,
      source: "gobus",
      lifecycle: "CUSTOMER",
      verificationStatus: "VERIFIED",
      basePlan: "Pro",
      trialUpgrade: "Enterprise",
      trialEndsAt: "2030-10-30T00:00:00Z",
      feeAmount: 49,
      feePeriod: "MONTH",
      feeVat: "EXCLUDED",
      feeSource: "synthetic",
      feeVerifiedAt: new Date(Date.now() - 60000).toISOString(),
      feeEvidence: "Verifica sintetica",
      isTest: true,
    },
  });
  const profileRead = await client.callTool({
    name: "pipely_get_gobus_profile",
    arguments: { companyId: value(company).id },
  });
  const report = await client.callTool({ name: "pipely_get_gobus_report", arguments: {} });
  assert(
    value(profile)?.id &&
      Number(value(profileRead)?.profile?.feeAmount) === 49 &&
      value(report)?.payingCompanies === 0 &&
      value(report)?.totalCompanies === 0 &&
      value(report)?.reconciledReceipts === null,
    "gobusProfileKeepsBaseFeeAndExcludesTests",
  );
  const offer = await client.callTool({
    name: "pipely_create_deal",
    arguments: {
      requestId: randomUUID(),
      title: "Proposta sintetica 40",
      value: 40,
      companyId: value(company).id,
      pipelineId: value(pipeline).id,
      stageId: value(pipeline).record.stages[0].id,
      isTest: true,
    },
  });
  const wonWithoutProof = await client.callTool({
    name: "pipely_update_deal",
    arguments: {
      requestId: randomUUID(),
      id: value(offer).id,
      expectedUpdatedAt: value(offer).updatedAt,
      status: "WON",
    },
  });
  assert(
    value(pipeline)?.id && value(offer)?.id && wonWithoutProof.isError,
    "pipelineAndAcceptanceEvidence",
  );
  const automationConfig = await client.callTool({
    name: "pipely_list_automation_effects",
    arguments: {},
  });
  const prediction = await client.callTool({
    name: "pipely_predict_effects",
    arguments: { operation: "import_batch" },
  });
  assert(
    value(automationConfig)?.automationsEnabled === false &&
      value(prediction)?.maySendEmail === false &&
      value(prediction)?.possibleWebhooks?.length === 0,
    "automationVisibilityAndSilentImportPrediction",
  );
  const eventInput = {
    requestId: randomUUID(),
    source: "gobus",
    externalId: "synthetic-first-service",
    kind: "GOBUS",
    state: "FIRST_SERVICE",
    direction: "NONE",
    occurredAt: new Date().toISOString(),
    companyId: value(company).id,
    evidence: "Evento sintetico verificato",
    isTest: true,
  };
  const externalEvent = await client.callTool({
    name: "pipely_upsert_external_event",
    arguments: eventInput,
  });
  const sameEvent = await client.callTool({
    name: "pipely_upsert_external_event",
    arguments: { ...eventInput, requestId: randomUUID() },
  });
  const eventList = await client.callTool({
    name: "pipely_list_external_events",
    arguments: { companyId: value(company).id },
  });
  assert(
    value(externalEvent)?.id &&
      value(sameEvent)?.id === value(externalEvent).id &&
      value(sameEvent)?.unchanged &&
      value(eventList)?.data?.length === 1 &&
      value(eventList).data[0].revisions.length === 1,
    "externalEventsDeduplicateWithoutExtraRevisions",
  );
  const counts = await database.query(
    'SELECT (SELECT count(*) FROM "Contact" WHERE "organizationId"=$1)::int AS contacts, (SELECT count(*) FROM "Company" WHERE "organizationId"=$1)::int AS companies, (SELECT count(*) FROM "Activity" WHERE "organizationId"=$1)::int AS activities, (SELECT count(*) FROM "McpOperation" WHERE "organizationId"=$1)::int AS operations, (SELECT count(*) FROM "WorkflowQueue" WHERE "orgId"=$1)::int AS workflows',
    [id],
  );
  assert(
    counts.rows[0].contacts === 2 &&
      counts.rows[0].companies === 2 &&
      counts.rows[0].activities === 1 &&
      counts.rows[0].operations === 23 &&
      counts.rows[0].workflows === 0,
    "databaseReceiptsAndStarterPolicy",
  );
  await database.query('UPDATE "McpToken" SET "canWrite"=false WHERE id=$1', [tokenId]);
  assert((await client.listTools()).tools.length === 15, "liveReadOnlyScope");
  await database.query('UPDATE "McpToken" SET "revokedAt"=now() WHERE id=$1', [tokenId]);
  const rejected = await fetch(`${origin}/api/mcp`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${raw}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: '{"jsonrpc":"2.0","id":1,"method":"tools/list"}',
    redirect: "manual",
  });
  assert(
    rejected.status === 401 && rejected.headers.get("cache-control")?.includes("no-store"),
    "revocationAndNoStore",
  );
  const unauthorized = await fetch(`${origin}/api/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: "{}",
    redirect: "manual",
  });
  assert(unauthorized.status === 401, "bearerAuthWithoutLoginRedirect");
} catch (error) {
  process.exitCode = 1;
  proof.failedPhase = phase;
  proof.errorType = error?.name ?? "Error";
  proof.error =
    error instanceof Error
      ? error.message.slice(0, 300).replaceAll(raw, "[redacted]")
      : "Unknown error";
} finally {
  await client.close().catch(() => {});
  await database.query("ROLLBACK").catch(() => {});
  if (created) {
    await database.query('DELETE FROM "Organization" WHERE id=$1 AND slug=$1', [id]);
    const remaining = await database.query(
      'SELECT count(*)::int AS count FROM "Organization" WHERE id=$1',
      [id],
    );
    proof.removed = remaining.rows[0].count === 0;
  }
  await database.end();
  await fs.writeFile(reportPath, JSON.stringify(proof, null, 2) + "\n");
  console.log(JSON.stringify(proof));
}
