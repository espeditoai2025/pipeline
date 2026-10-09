// Creates and removes only its own synthetic organization; never sends messages.
import dotenv from "dotenv";
import pg from "pg";
import fs from "node:fs/promises";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

if (process.argv[2] !== "--synthetic-fixture") throw new Error("Use --synthetic-fixture");
const reportPath = process.argv[3] ?? "docs/MCP-PRODUZIONE-CONTATTI-2026-10-09.json";
if (!/^docs\/MCP-PRODUZIONE(?:-CONTATTI)?-\d{4}-\d{2}-\d{2}\.json$/.test(reportPath))
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
  assert((await client.listTools()).tools.length === 16, "officialClient16Tools");
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
  const counts = await database.query(
    'SELECT (SELECT count(*) FROM "Contact" WHERE "organizationId"=$1)::int AS contacts, (SELECT count(*) FROM "Company" WHERE "organizationId"=$1)::int AS companies, (SELECT count(*) FROM "Activity" WHERE "organizationId"=$1)::int AS activities, (SELECT count(*) FROM "McpOperation" WHERE "organizationId"=$1)::int AS operations, (SELECT count(*) FROM "WorkflowQueue" WHERE "orgId"=$1)::int AS workflows',
    [id],
  );
  assert(
    counts.rows[0].contacts === 1 &&
      counts.rows[0].companies === 1 &&
      counts.rows[0].activities === 1 &&
      counts.rows[0].operations === 9 &&
      counts.rows[0].workflows === 0,
    "databaseReceiptsAndStarterPolicy",
  );
  await database.query('UPDATE "McpToken" SET "canWrite"=false WHERE id=$1', [tokenId]);
  assert((await client.listTools()).tools.length === 7, "liveReadOnlyScope");
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
