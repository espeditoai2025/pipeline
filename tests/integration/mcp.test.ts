import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { db, startDatabase, closeDatabase } from "./database";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  after: vi.fn(),
  wake: vi.fn(),
  rate: vi.fn(async () => null),
}));
vi.mock("@/lib/db", async () => await import("./database"));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", async (original) => ({
  ...(await original<typeof import("next/server")>()),
  after: mocks.after,
}));
vi.mock("@/lib/workflow-wake", () => ({ wakeWorkflows: mocks.wake }));
vi.mock("@/lib/rate-limit", () => ({
  withApiKeyRateLimit: mocks.rate,
  withAuthRateLimit: vi.fn(async () => null),
}));
import { handleMcpRequest } from "@/lib/mcp/http";
import { hashMcpKey } from "@/lib/mcp/auth";
import { getMcpSettings, createMcpToken, revokeMcpToken } from "@/server/actions/mcp";
import { authenticateApiKey } from "@/lib/api-auth";

const orgId = "mcp-org-a",
  userId = "mcp-owner-a";
const key = "pip_mcp_" + "a".repeat(64);
const url = "http://localhost:3000/api/mcp";
const clients: Client[] = [];
const receipt = (result: unknown) =>
  (
    result as {
      structuredContent: {
        id: string;
        replayed: boolean;
        updatedAt: string;
        completedAt: string;
        alreadyCompleted: boolean;
      };
    }
  ).structuredContent;
const text = (result: unknown) => JSON.stringify(result);
async function rpcBody(response: Response) {
  const value = await response.text();
  return JSON.parse(
    value.startsWith("event:")
      ? value
          .split("\n")
          .find((line) => line.startsWith("data: "))!
          .slice(6)
      : value,
  );
}
async function connect(raw = key) {
  const client = new Client({ name: "pipely-fixture", version: "1.0" });
  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: { headers: { Authorization: `Bearer ${raw}` } },
    fetch: async (input, init) => handleMcpRequest(new NextRequest(new Request(input, init))),
  });
  await client.connect(transport);
  clients.push(client);
  return client;
}
function request(
  method = "POST",
  body: string = '{"jsonrpc":"2.0","id":1,"method":"tools/list"}',
  headers: Record<string, string> = {},
) {
  return new NextRequest(url, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...headers,
    },
    ...(method === "POST" ? { body } : {}),
  });
}
const contactInput = {
  requestId: "contact-request-1",
  firstName: "Mario",
  email: "mario@example.test",
};
beforeAll(startDatabase);
afterAll(async () => {
  for (const client of clients) await client.close();
  vi.unstubAllEnvs();
  await closeDatabase();
});
beforeEach(async () => {
  for (const client of clients.splice(0)) await client.close();
  vi.clearAllMocks();
  mocks.rate.mockResolvedValue(null);
  vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
  vi.stubEnv("MCP_ALLOWED_ORIGINS", "");
  await db.organization.deleteMany({ where: { id: { in: [orgId, "mcp-org-b"] } } });
  await db.organization.createMany({
    data: [
      { id: orgId, name: "Studio MCP", slug: orgId, plan: "PRO" },
      { id: "mcp-org-b", name: "Esterno", slug: "mcp-org-b", plan: "PRO" },
    ],
  });
  await db.user.createMany({
    data: [
      { id: userId, email: "mcp-owner-a@example.test", role: "OWNER", organizationId: orgId },
      {
        id: "mcp-owner-b",
        email: "mcp-owner-b@example.test",
        role: "OWNER",
        organizationId: "mcp-org-b",
      },
    ],
  });
  await db.mcpToken.create({
    data: {
      id: "mcp-token",
      name: "Fixture agent",
      keyHash: hashMcpKey(key),
      prefix: key.slice(0, 16),
      canWrite: true,
      organizationId: orgId,
      createdBy: userId,
      expiresAt: new Date(Date.now() + 86400000),
    },
  });
  for (const [suffix, org, owner] of [
    ["a", orgId, userId],
    ["b", "mcp-org-b", "mcp-owner-b"],
  ]) {
    await db.pipeline.create({
      data: { id: `mcp-pipeline-${suffix}`, name: "Vendite", organizationId: org! },
    });
    await db.stage.create({
      data: {
        id: `mcp-stage-${suffix}`,
        name: "Nuovo",
        position: 0,
        pipelineId: `mcp-pipeline-${suffix}`,
      },
    });
    await db.contact.create({
      data: {
        id: `mcp-contact-${suffix}`,
        firstName: suffix === "a" ? "Anna" : "Segreto",
        organizationId: org!,
        ownerId: owner!,
      },
    });
    await db.company.create({
      data: {
        id: `mcp-company-${suffix}`,
        name: suffix === "a" ? "Studio Anna" : "Azienda segreta",
        organizationId: org!,
      },
    });
    await db.deal.create({
      data: {
        id: `mcp-deal-${suffix}`,
        title: suffix === "a" ? "Consulenza" : "Trattativa segreta",
        value: 100,
        organizationId: org!,
        ownerId: owner!,
        pipelineId: `mcp-pipeline-${suffix}`,
        stageId: `mcp-stage-${suffix}`,
      },
    });
  }
  await db.workflow.create({
    data: {
      id: "mcp-workflow",
      name: "On contact",
      organizationId: orgId,
      trigger: { type: "CONTACT_CREATED" },
      steps: [],
      isActive: true,
    },
  });
  await db.webhook.create({
    data: {
      id: "mcp-hook",
      name: "Fixture",
      url: "https://example.test/never-deliver",
      secret: "fixture",
      organizationId: orgId,
      events: [
        "contact.created",
        "contact.updated",
        "deal.created",
        "deal.updated",
        "deal.won",
        "activity.created",
        "activity.completed",
        "company.created",
        "company.updated",
      ],
    },
  });
  mocks.auth.mockResolvedValue({ user: { id: userId, organizationId: orgId, role: "OWNER" } });
});
describe("connessioni e autenticazione MCP", () => {
  it("mantiene visibili le chiavi attive anche con oltre 100 chiavi storiche", async () => {
    await db.mcpToken.createMany({
      data: Array.from({ length: 105 }, (_, index) => ({
        name: `Historical ${index}`,
        keyHash: hashMcpKey(`historical-${index}`),
        prefix: "pip_mcp_fixture",
        canWrite: false,
        organizationId: orgId,
        createdBy: userId,
        expiresAt: new Date(0),
        revokedAt: new Date(),
        createdAt: new Date(Date.now() + index),
      })),
    });
    const settings = await getMcpSettings();
    expect(settings.data?.tokens).toHaveLength(100);
    expect(settings.data?.tokens.some((token) => token.id === "mcp-token")).toBe(true);
  });
  it("crea una chiave di sola lettura, salva solo l'hash e non rivela segreti nell'elenco", async () => {
    const created = await createMcpToken({ name: "Nuovo agente" });
    expect(created.key).toMatch(/^pip_mcp_[a-f0-9]{64}$/);
    const stored = await db.mcpToken.findUniqueOrThrow({
      where: { keyHash: hashMcpKey(created.key!) },
    });
    expect(stored.canWrite).toBe(false);
    const settings = await getMcpSettings();
    expect(text(settings)).not.toContain(created.key);
    expect(text(settings)).not.toContain(stored.keyHash);
    const client = await connect(created.key);
    expect((await client.listTools()).tools).toHaveLength(15);
    for (const name of [
      "pipely_create_company",
      "pipely_update_company",
      "pipely_update_contact",
      "pipely_complete_activity",
    ]) {
      const denied = await client.callTool({ name, arguments: {} }).catch((error) => error);
      expect(text(denied)).not.toContain('"replayed":false');
    }
  });
  it("nega la gestione dopo una variazione del ruolo anche con una sessione OWNER precedente", async () => {
    await db.user.update({ where: { id: userId }, data: { role: "VIEWER" } });
    expect((await createMcpToken({ name: "Negato" })).error).toBeTruthy();
    expect((await getMcpSettings()).data).toBeNull();
    expect((await revokeMcpToken("mcp-token")).error).toBeTruthy();
    expect((await handleMcpRequest(request())).status).toBe(403);
  });
  it("isola gestione e revoca fra organizzazioni", async () => {
    mocks.auth.mockResolvedValue({
      user: { id: "mcp-owner-b", organizationId: "mcp-org-b", role: "OWNER" },
    });
    expect((await getMcpSettings()).data?.tokens).toHaveLength(0);
    expect((await revokeMcpToken("mcp-token")).error).toBeTruthy();
    expect(
      (await db.mcpToken.findUniqueOrThrow({ where: { id: "mcp-token" } })).revokedAt,
    ).toBeNull();
  });
  it("scadenza e revoca invalidano immediatamente la chiave", async () => {
    await db.mcpToken.update({ where: { id: "mcp-token" }, data: { expiresAt: new Date(0) } });
    expect((await handleMcpRequest(request())).status).toBe(401);
    await db.mcpToken.update({
      where: { id: "mcp-token" },
      data: { expiresAt: new Date(Date.now() + 86400000) },
    });
    expect(await revokeMcpToken("mcp-token")).toEqual({});
    expect((await handleMcpRequest(request())).status).toBe(401);
  });
  it("non consente alle chiavi MCP di acquisire i permessi REST", async () => {
    expect(((await authenticateApiKey(request())) as Response).status).toBe(401);
    expect(
      (
        await handleMcpRequest(
          request("POST", undefined, { Authorization: "Bearer pip_live_invalid" }),
        )
      ).status,
    ).toBe(401);
  });
  it("limita le chiavi attive a 10, consentendo di sostituire quelle scadute", async () => {
    for (let i = 0; i < 9; i++)
      expect((await createMcpToken({ name: `Agent ${i}` })).key).toBeTruthy();
    expect((await createMcpToken({ name: "Undicesima" })).error).toContain("10");
    await db.mcpToken.update({ where: { id: "mcp-token" }, data: { expiresAt: new Date(0) } });
    expect((await createMcpToken({ name: "Sostituzione" })).key).toBeTruthy();
  });
  it("rispetta il rate limit per chiave senza trasformarlo in errore del protocollo", async () => {
    mocks.rate.mockResolvedValueOnce(
      new NextResponse(null, { status: 429, headers: { "Retry-After": "60" } }) as never,
    );
    const response = await handleMcpRequest(request());
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
  });
});
describe("trasporto HTTP e compatibilità", () => {
  it("CORS solo per origini autorizzate e nessun redirect a login", async () => {
    const preflight = await handleMcpRequest(
      request("OPTIONS", undefined, { Origin: "http://localhost:3000" }),
    );
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
    expect(
      (await handleMcpRequest(request("POST", undefined, { Origin: "https://evil.test" }))).status,
    ).toBe(403);
    expect((await handleMcpRequest(request("POST", undefined, { Host: "evil.test" }))).status).toBe(
      403,
    );
    const unauthorized = await handleMcpRequest(request("POST", undefined, { Authorization: "" }));
    expect(unauthorized.status).toBe(401);
    expect(unauthorized.headers.get("Location")).toBeNull();
    expect(unauthorized.headers.get("WWW-Authenticate")).toContain("Bearer");
    expect(unauthorized.headers.get("Cache-Control")).toContain("no-store");
  });
  it("supporta il protocollo 2025 con initialize e tools/list stateless", async () => {
    const initialize = await handleMcpRequest(
      request(
        "POST",
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-11-25",
            capabilities: {},
            clientInfo: { name: "legacy", version: "1" },
          },
        }),
      ),
    );
    expect(initialize.status).toBe(200);
    expect((await rpcBody(initialize)).result.protocolVersion).toBe("2025-11-25");
    const listed = await handleMcpRequest(
      request("POST", undefined, { "MCP-Protocol-Version": "2025-11-25" }),
    );
    expect(listed.status).toBe(200);
    expect((await rpcBody(listed)).result.tools).toHaveLength(35);
    expect((await handleMcpRequest(request("GET"))).status).toBe(405);
    expect((await handleMcpRequest(request("DELETE"))).status).toBe(405);
  });
  it("rifiuta JSON non valido e body oltre 64 KB anche senza Content-Length", async () => {
    expect((await handleMcpRequest(request("POST", "{"))).status).toBe(400);
    expect((await handleMcpRequest(request("POST", " ".repeat(65537)))).status).toBe(413);
    expect(
      (await handleMcpRequest(request("POST", "{}", { "Content-Length": "65537" }))).status,
    ).toBe(413);
    expect(
      (await handleMcpRequest(request("POST", '[{"jsonrpc":"2.0","id":1,"method":"tools/list"}]')))
        .status,
    ).toBe(400);
  });
});
describe("tool CRM attraverso il client MCP ufficiale", () => {
  it("elenca 35 tool e consulta solo l'organizzazione della chiave", async () => {
    const client = await connect();
    expect((await client.listTools()).tools).toHaveLength(35);
    const context = await client.callTool({ name: "pipely_get_context", arguments: {} });
    expect(text(context)).toContain("Studio MCP");
    for (const tool of [
      "pipely_list_contacts",
      "pipely_list_companies",
      "pipely_list_deals",
      "pipely_list_pipelines",
      "pipely_list_activities",
    ]) {
      const output = await client.callTool({ name: tool, arguments: {} });
      expect(text(output)).not.toContain("segreta");
      expect(text(output)).not.toContain("mcp-org-b");
    }
    expect(
      (
        await client.callTool({
          name: "pipely_get_record",
          arguments: { kind: "contact", id: "mcp-contact-b" },
        })
      ).isError,
    ).toBe(true);
  });
  it("le chiavi di lettura non espongono né eseguono tool di scrittura", async () => {
    await db.mcpToken.update({ where: { id: "mcp-token" }, data: { canWrite: false } });
    const client = await connect();
    expect((await client.listTools()).tools).toHaveLength(15);
    const outcome = await client
      .callTool({ name: "pipely_create_contact", arguments: contactInput })
      .catch((error) => error);
    expect(text(outcome)).not.toContain('"replayed":false');
    expect(await db.contact.count({ where: { organizationId: orgId } })).toBe(1);
  });
  it("ricerca e paginazione funzionano e input fuori limite non passano", async () => {
    const client = await connect();
    const output = await client.callTool({
      name: "pipely_list_contacts",
      arguments: { search: "anna", perPage: 1 },
    });
    expect(text(output)).toContain("mcp-contact-a");
    for (const args of [{ perPage: 51 }, { page: 1.5 }, { organizationId: "mcp-org-b" }]) {
      const failure = await client
        .callTool({ name: "pipely_list_contacts", arguments: args })
        .catch((error) => error);
      expect(text(failure)).not.toContain("mcp-contact-b");
      expect(text(failure)).not.toContain('"data"');
    }
  });
  it("creazione e retry generano un solo contatto, evento e ricevuta", async () => {
    const client = await connect();
    const one = await client.callTool({ name: "pipely_create_contact", arguments: contactInput });
    const two = await client.callTool({ name: "pipely_create_contact", arguments: contactInput });
    expect(receipt(one).replayed).toBe(false);
    expect(receipt(two)).toMatchObject({ id: receipt(one).id, replayed: true });
    expect(await db.contact.count({ where: { organizationId: orgId } })).toBe(2);
    expect(await db.mcpOperation.count({ where: { organizationId: orgId } })).toBe(1);
    expect(await db.workflowQueue.count({ where: { orgId } })).toBe(1);
    expect(await db.webhookDelivery.count({ where: { webhookId: "mcp-hook" } })).toBe(1);
    expect(mocks.wake).toHaveBeenCalledTimes(1);
    expect(mocks.after).toHaveBeenCalledTimes(1);
    const mismatch = await client.callTool({
      name: "pipely_create_contact",
      arguments: { ...contactInput, firstName: "Diverso" },
    });
    expect(mismatch.isError).toBe(true);
  });
  it("collega tre contatti esistenti alle aziende anche a quota Starter piena", async () => {
    await db.organization.update({ where: { id: orgId }, data: { plan: "STARTER" } });
    await db.contact.createMany({
      data: Array.from({ length: 499 }, (_, index) => ({
        id: `mcp-existing-${index}`,
        firstName: `Cliente ${index}`,
        email: `cliente-${index}@example.test`,
        organizationId: orgId,
        ownerId: userId,
      })),
    });
    const client = await connect();
    for (const id of ["mcp-contact-a", "mcp-existing-0", "mcp-existing-1"]) {
      const record = (
        await client.callTool({
          name: "pipely_get_record",
          arguments: { kind: "contact", id },
        })
      ).structuredContent as { data: { updatedAt: string } };
      expect(
        (
          await client.callTool({
            name: "pipely_update_contact",
            arguments: {
              requestId: `link-${id}`,
              id,
              expectedUpdatedAt: record.data.updatedAt,
              companyId: "mcp-company-a",
            },
          })
        ).isError,
      ).not.toBe(true);
    }
    const listed = (
      await client.callTool({
        name: "pipely_list_contacts",
        arguments: { companyId: "mcp-company-a" },
      })
    ).structuredContent as { data: { id: string }[] };
    expect(listed.data.map((row) => row.id).sort()).toEqual([
      "mcp-contact-a",
      "mcp-existing-0",
      "mcp-existing-1",
    ]);
    expect(await db.contact.count({ where: { organizationId: orgId } })).toBe(500);
    expect((await db.contact.findUniqueOrThrow({ where: { id: "mcp-existing-0" } })).email).toBe(
      "cliente-0@example.test",
    );
    expect(await db.workflowQueue.count({ where: { orgId } })).toBe(0);
    expect(await db.webhookDelivery.count({ where: { event: "contact.updated" } })).toBe(3);
  });
  it("aggiorna parzialmente il contatto e ripete la ricevuta senza duplicare eventi", async () => {
    const client = await connect();
    const before = await db.contact.update({
      where: { id: "mcp-contact-a" },
      data: { lastName: "Rossi", email: "anna@example.test", phone: "123", jobTitle: "CEO" },
    });
    const input = {
      requestId: "contact-update-1",
      id: before.id,
      expectedUpdatedAt: before.updatedAt.toISOString(),
      companyId: "mcp-company-a",
      phone: null,
    };
    const first = receipt(
      await client.callTool({ name: "pipely_update_contact", arguments: input }),
    );
    expect(first).toMatchObject({ id: before.id, entityType: "contact", replayed: false });
    expect(new Date(first.updatedAt).getTime()).toBeGreaterThan(before.updatedAt.getTime());
    const row = await db.contact.findUniqueOrThrow({ where: { id: before.id } });
    expect(row).toMatchObject({
      firstName: "Anna",
      lastName: "Rossi",
      email: "anna@example.test",
      jobTitle: "CEO",
      ownerId: userId,
      companyId: "mcp-company-a",
      phone: null,
    });
    expect(
      receipt(await client.callTool({ name: "pipely_update_contact", arguments: input })),
    ).toEqual({ ...first, replayed: true });
    expect(
      (
        await client.callTool({
          name: "pipely_update_contact",
          arguments: { ...input, companyId: null },
        })
      ).isError,
    ).toBe(true);
    expect(await db.mcpOperation.count({ where: { organizationId: orgId } })).toBe(1);
    expect(await db.webhookDelivery.count({ where: { event: "contact.updated" } })).toBe(1);
    expect(await db.workflowQueue.count({ where: { orgId } })).toBe(0);
    const delivery = await db.webhookDelivery.findFirstOrThrow({
      where: { event: "contact.updated" },
    });
    expect(delivery.payload).toMatchObject({
      id: row.id,
      companyId: row.companyId,
      ownerId: userId,
    });
  });
  it("riassegna azienda e responsabile e può rimuovere azienda e recapiti", async () => {
    const client = await connect();
    await db.user.create({
      data: { id: "mcp-member-a", email: "member@example.test", organizationId: orgId },
    });
    await db.company.create({
      data: { id: "mcp-company-other", name: "Seconda azienda", organizationId: orgId },
    });
    const before = await db.contact.update({
      where: { id: "mcp-contact-a" },
      data: { companyId: "mcp-company-a", email: "anna@example.test", lastName: "Rossi" },
    });
    const updated = receipt(
      await client.callTool({
        name: "pipely_update_contact",
        arguments: {
          requestId: "contact-reassign-1",
          id: before.id,
          expectedUpdatedAt: before.updatedAt.toISOString(),
          firstName: "Annamaria",
          companyId: "mcp-company-other",
          ownerId: "mcp-member-a",
        },
      }),
    );
    expect(await db.contact.findUniqueOrThrow({ where: { id: before.id } })).toMatchObject({
      firstName: "Annamaria",
      companyId: "mcp-company-other",
      ownerId: "mcp-member-a",
    });
    expect(
      (
        await client.callTool({
          name: "pipely_update_contact",
          arguments: {
            requestId: "contact-unlink-1",
            id: before.id,
            expectedUpdatedAt: updated.updatedAt,
            companyId: null,
            email: null,
            lastName: "   ",
            jobTitle: null,
          },
        })
      ).isError,
    ).not.toBe(true);
    expect(await db.contact.findUniqueOrThrow({ where: { id: before.id } })).toMatchObject({
      companyId: null,
      email: null,
      lastName: null,
      jobTitle: null,
      ownerId: "mcp-member-a",
    });
  });
  it("nega contatti e riferimenti esterni o mancanti senza scritture parziali", async () => {
    const client = await connect();
    const before = await db.contact.findUniqueOrThrow({ where: { id: "mcp-contact-a" } });
    const common = {
      requestId: "contact-forbidden-1",
      id: before.id,
      expectedUpdatedAt: before.updatedAt.toISOString(),
      firstName: "Modificata",
    };
    for (const extra of [
      { id: "mcp-contact-b" },
      { id: "missing-contact" },
      { companyId: "mcp-company-b" },
      { companyId: "missing-company" },
      { ownerId: "mcp-owner-b" },
      { ownerId: "missing-owner" },
    ]) {
      expect(
        (
          await client.callTool({
            name: "pipely_update_contact",
            arguments: { ...common, ...extra },
          })
        ).isError,
      ).toBe(true);
    }
    expect(await db.contact.findUniqueOrThrow({ where: { id: before.id } })).toEqual(before);
    expect(await db.mcpOperation.count({ where: { organizationId: orgId } })).toBe(0);
    expect(await db.webhookDelivery.count({ where: { webhookId: "mcp-hook" } })).toBe(0);
  });
  it("rifiuta versioni obsolete, aggiornamenti vuoti e campi invalidi o di sistema", async () => {
    const client = await connect();
    const before = await db.contact.findUniqueOrThrow({ where: { id: "mcp-contact-a" } });
    const common = {
      requestId: "contact-invalid-1",
      id: before.id,
      expectedUpdatedAt: before.updatedAt.toISOString(),
    };
    for (const extra of [
      {},
      { firstName: " " },
      { firstName: null },
      { firstName: "x".repeat(101) },
      { email: "non-email" },
      { phone: "x".repeat(51) },
      { ownerId: null },
      { companyId: "" },
      { companyId: "mcp-company-a", organizationId: "mcp-org-b" },
      { companyId: "mcp-company-a", updatedAt: "2030-01-01T00:00:00Z" },
      { companyId: "mcp-company-a", expectedUpdatedAt: "invalid" },
    ]) {
      expect(
        (
          await client.callTool({
            name: "pipely_update_contact",
            arguments: { ...common, ...extra },
          })
        ).isError,
      ).toBe(true);
    }
    await db.contact.update({
      where: { id: before.id },
      data: {
        firstName: "Nuova",
        updatedAt: new Date(before.updatedAt.getTime() + 1000),
      },
    });
    expect(
      (
        await client.callTool({
          name: "pipely_update_contact",
          arguments: { ...common, companyId: "mcp-company-a" },
        })
      ).isError,
    ).toBe(true);
    expect((await db.contact.findUniqueOrThrow({ where: { id: before.id } })).companyId).toBeNull();
    expect(await db.mcpOperation.count({ where: { organizationId: orgId } })).toBe(0);
    expect(await db.webhookDelivery.count({ where: { webhookId: "mcp-hook" } })).toBe(0);
  });
  it("due aggiornamenti concorrenti non sovrascrivono la stessa versione del contatto", async () => {
    const client = await connect();
    const before = await db.contact.findUniqueOrThrow({ where: { id: "mcp-contact-a" } });
    const outcomes = await Promise.all(
      ["Prima", "Seconda"].map((firstName) =>
        client.callTool({
          name: "pipely_update_contact",
          arguments: {
            requestId: `contact-race-${firstName}`,
            id: before.id,
            expectedUpdatedAt: before.updatedAt.toISOString(),
            firstName,
          },
        }),
      ),
    );
    expect(outcomes.filter((result) => result.isError)).toHaveLength(1);
    expect(await db.mcpOperation.count({ where: { organizationId: orgId } })).toBe(1);
    expect(await db.webhookDelivery.count({ where: { event: "contact.updated" } })).toBe(1);
  });
  it("restituisce il contatto aggiornato e rifiuta collisioni email senza perdere relazioni", async () => {
    const client = await connect();
    const before = await db.contact.findUniqueOrThrow({ where: { id: "mcp-contact-a" } });
    await db.note.create({
      data: { contactId: before.id, authorId: userId, content: "Nota da conservare" },
    });
    await db.activity.create({
      data: {
        contactId: before.id,
        userId,
        organizationId: orgId,
        subject: "Richiamare",
        type: "CALL",
      },
    });
    await db.contact.create({
      data: {
        firstName: "Altro",
        email: " COLLISION@EXAMPLE.TEST ",
        organizationId: orgId,
        ownerId: userId,
      },
    });
    const common = { id: before.id, expectedUpdatedAt: before.updatedAt.toISOString() };
    expect(
      (
        await client.callTool({
          name: "pipely_update_contact",
          arguments: {
            ...common,
            requestId: "collision-contact-1",
            email: "collision@example.test",
          },
        })
      ).isError,
    ).toBe(true);
    const result = await client.callTool({
      name: "pipely_update_contact",
      arguments: { ...common, requestId: "record-contact-1", companyId: "mcp-company-a" },
    });
    expect(result.structuredContent).toMatchObject({
      record: { id: before.id, companyId: "mcp-company-a" },
    });
    expect(await db.note.count({ where: { contactId: before.id } })).toBe(1);
    expect(await db.activity.count({ where: { contactId: before.id } })).toBe(1);
  });
  it("sincronizza tramite ID esterno stabile, mantiene gli ID e isola le organizzazioni", async () => {
    const client = await connect();
    const common = {
      externalSource: " GoBus ",
      externalId: " 42 ",
      name: "Azienda GoBus",
      operationalEmail: " OPERATIVO@EXAMPLE.TEST ",
    };
    const first = await client.callTool({
      name: "pipely_upsert_company",
      arguments: { ...common, requestId: "sync-company-1" },
    });
    const second = await client.callTool({
      name: "pipely_upsert_company",
      arguments: { ...common, requestId: "sync-company-2" },
    });
    expect(second.structuredContent).toMatchObject({ id: receipt(first).id, status: "unchanged" });
    const looked = await client.callTool({
      name: "pipely_get_external_record",
      arguments: { kind: "company", externalSource: "GoBus", externalId: "42" },
    });
    expect(looked.structuredContent).toMatchObject({
      record: {
        id: receipt(first).id,
        externalSource: "gobus",
        externalId: "42",
        operationalEmail: "operativo@example.test",
      },
    });
    await db.company.create({
      data: {
        name: "Esterno",
        externalSource: "gobus",
        externalId: "42",
        organizationId: "mcp-org-b",
      },
    });
    expect(
      (
        await client.callTool({
          name: "pipely_upsert_company",
          arguments: { ...common, requestId: "sync-company-stale", name: "Sovrascritta" },
        })
      ).isError,
    ).toBe(true);
    expect(await db.webhookDelivery.count()).toBe(0);
    expect(mocks.wake).not.toHaveBeenCalled();
    expect(mocks.after).not.toHaveBeenCalled();
  });
  it("importa lo stesso lotto senza duplicati e recupera la ricevuta dopo un retry", async () => {
    const client = await connect();
    const input = {
      requestId: "batch-sync-1",
      dryRun: false,
      entries: [
        {
          kind: "company",
          data: { externalSource: "gobus", externalId: "company-1", name: "GoBus Uno" },
        },
        {
          kind: "contact",
          data: {
            externalSource: "gobus",
            externalId: "contact-1",
            firstName: "Mario",
            email: " MARIO@EXAMPLE.TEST ",
          },
        },
      ],
    };
    const first = await client.callTool({ name: "pipely_import_batch", arguments: input });
    const repeated = await client.callTool({ name: "pipely_import_batch", arguments: input });
    expect(repeated.structuredContent).toMatchObject({
      ...(first.structuredContent as Record<string, unknown>),
      replayed: true,
    });
    const second = await client.callTool({
      name: "pipely_import_batch",
      arguments: { ...input, requestId: "batch-sync-2" },
    });
    const rows = (first.structuredContent as { results: { id: string }[] }).results;
    expect(second.structuredContent).toMatchObject({
      results: rows.map((row) => ({ id: row.id, status: "unchanged" })),
    });
    expect(await db.contact.count({ where: { organizationId: orgId } })).toBe(2);
    expect(await db.company.count({ where: { organizationId: orgId } })).toBe(2);
    expect(await db.workflowQueue.count({ where: { orgId } })).toBe(0);
    expect(await db.webhookDelivery.count()).toBe(0);
    expect(mocks.wake).not.toHaveBeenCalled();
    expect(mocks.after).not.toHaveBeenCalled();
  });
  it("dry-run e conflitti per voce non attivano workflow o webhook", async () => {
    const client = await connect();
    await db.company.update({
      where: { id: "mcp-company-a" },
      data: { vatNumber: "IT12345678901", email: " UFFICIO@EXAMPLE.TEST " },
    });
    const entries = [
      {
        kind: "company",
        data: {
          externalSource: "gobus",
          externalId: "duplicate-vat",
          name: "Altra",
          vatNumber: "12345678901",
        },
      },
      {
        kind: "company",
        data: {
          externalSource: "gobus",
          externalId: "duplicate-email",
          name: "Altra",
          email: "ufficio@example.test",
        },
      },
      {
        kind: "contact",
        data: { externalSource: "gobus", externalId: "valid", firstName: "Nuovo" },
      },
      {
        kind: "contact",
        data: {
          externalSource: "gobus",
          externalId: "foreign",
          firstName: "Esterno",
          companyId: "mcp-company-b",
        },
      },
    ];
    const input = { requestId: "dry-batch-1", entries };
    expect(
      (await client.callTool({ name: "pipely_import_batch", arguments: input })).structuredContent,
    ).toMatchObject({
      dryRun: true,
      conflicts: 3,
      results: [
        { status: "conflict" },
        { status: "conflict" },
        { status: "would_created" },
        { status: "conflict" },
      ],
    });
    expect(await db.mcpOperation.count()).toBe(0);
    expect(await db.contact.count({ where: { organizationId: orgId } })).toBe(1);
    expect(
      (
        await client.callTool({
          name: "pipely_import_batch",
          arguments: { ...input, dryRun: false },
        })
      ).structuredContent,
    ).toMatchObject({ conflicts: 3 });
    expect(await db.contact.count({ where: { organizationId: orgId } })).toBe(2);
    expect(await db.workflowQueue.count({ where: { orgId } })).toBe(0);
    expect(await db.webhookDelivery.count()).toBe(0);
  });
  it("gestisce esclusioni strutturate con storico, versione e retry senza trasformarle in consensi", async () => {
    const client = await connect();
    const input = {
      requestId: "policy-write-1",
      address: " CLIENTE@EXAMPLE.TEST ",
      status: "DO_NOT_CONTACT",
      reason: "Rifiuto commerciale",
      source: "GoBus",
      effectiveAt: new Date().toISOString(),
    };
    const created = await client.callTool({
      name: "pipely_set_recipient_policy",
      arguments: input,
    });
    expect(created.isError).not.toBe(true);
    const repeat = await client.callTool({ name: "pipely_set_recipient_policy", arguments: input });
    expect(receipt(repeat)).toMatchObject({ ...receipt(created), replayed: true });
    expect(await db.recipientPolicyEvent.count()).toBe(1);
    const read = await client.callTool({
      name: "pipely_get_recipient_policy",
      arguments: { address: "Cliente@Example.Test" },
    });
    expect(read.structuredContent).toMatchObject({
      policy: {
        address: "cliente@example.test",
        status: "DO_NOT_CONTACT",
        events: [{ reason: input.reason }],
      },
    });
    expect(
      (
        await client.callTool({
          name: "pipely_set_recipient_policy",
          arguments: {
            ...input,
            requestId: "policy-clear-1",
            status: "CLEARED",
            expectedUpdatedAt: receipt(created).updatedAt,
          },
        })
      ).isError,
    ).toBe(true);
    expect(
      (
        await client.callTool({
          name: "pipely_set_recipient_policy",
          arguments: {
            ...input,
            requestId: "policy-clear-2",
            status: "CLEARED",
            verification: "Correzione verificata",
          },
        })
      ).isError,
    ).toBe(true);
    expect(await db.recipientPolicyEvent.count()).toBe(1);
    expect(mocks.wake).not.toHaveBeenCalled();
  });
  it("due richieste simultanee con lo stesso identificativo producono una scrittura", async () => {
    const client = await connect();
    const outcomes = await Promise.all([
      client.callTool({ name: "pipely_create_contact", arguments: contactInput }),
      client.callTool({ name: "pipely_create_contact", arguments: contactInput }),
    ]);
    expect(outcomes.map((outcome) => receipt(outcome).replayed).sort()).toEqual([false, true]);
    expect(await db.mcpOperation.count({ where: { organizationId: orgId } })).toBe(1);
  });
  it("non permette riferimenti a record esterni e non salva ricevute parziali", async () => {
    const client = await connect();
    for (const [name, args] of [
      ["pipely_create_contact", { ...contactInput, companyId: "mcp-company-b" }],
      [
        "pipely_create_deal",
        {
          requestId: "foreign-request",
          title: "Negato",
          pipelineId: "mcp-pipeline-a",
          stageId: "mcp-stage-b",
        },
      ],
      [
        "pipely_create_note",
        { requestId: "foreign-note", content: "Negato", contactId: "mcp-contact-b" },
      ],
      [
        "pipely_create_activity",
        { requestId: "foreign-activity", subject: "Negato", type: "TASK", dealId: "mcp-deal-b" },
      ],
    ] as const) {
      expect((await client.callTool({ name, arguments: args })).isError).toBe(true);
    }
    expect(await db.mcpOperation.count({ where: { organizationId: orgId } })).toBe(0);
    expect(await db.webhookDelivery.count({ where: { webhookId: "mcp-hook" } })).toBe(0);
  });
  it("Starter consente MCP ma rispetta la quota contatti e non esegue automazioni Pro", async () => {
    await db.organization.update({ where: { id: orgId }, data: { plan: "STARTER" } });
    const client = await connect();
    const created = await client.callTool({
      name: "pipely_create_contact",
      arguments: contactInput,
    });
    expect(created.isError).not.toBe(true);
    expect(await db.workflowQueue.count({ where: { orgId } })).toBe(0);
    await db.contact.createMany({
      data: Array.from({ length: 498 }, (_, index) => ({
        firstName: `Fixture ${index}`,
        organizationId: orgId,
        ownerId: userId,
      })),
    });
    const rejected = await client.callTool({
      name: "pipely_create_contact",
      arguments: { ...contactInput, requestId: "over-quota-request" },
    });
    expect(rejected.isError).toBe(true);
    expect(text(rejected)).toContain("500");
    expect(await db.contact.count({ where: { organizationId: orgId } })).toBe(500);
  });
  it("crea trattativa, attività e nota e aggiorna senza inviare email direttamente", async () => {
    const client = await connect();
    const deal = await client.callTool({
      name: "pipely_create_deal",
      arguments: {
        requestId: "new-deal-request",
        title: "Consulenza",
        value: 20.5,
        currency: "USD",
        pipelineId: "mcp-pipeline-a",
        stageId: "mcp-stage-a",
        contactId: "mcp-contact-a",
      },
    });
    const dealId = receipt(deal).id;
    const activity = await client.callTool({
      name: "pipely_create_activity",
      arguments: {
        requestId: "activity-request",
        type: "EMAIL",
        subject: "Promemoria",
        dueDate: "2030-10-03T10:00:00+02:00",
        dealId,
      },
    });
    expect(receipt(activity).id).toBeTruthy();
    const note = await client.callTool({
      name: "pipely_create_note",
      arguments: { requestId: "note-request", content: "Cliente interessato", dealId },
    });
    expect(receipt(note).id).toBeTruthy();
    const changed = await client.callTool({
      name: "pipely_update_deal",
      arguments: {
        requestId: "update-request",
        id: dealId,
        expectedUpdatedAt: receipt(deal).updatedAt,
        status: "WON",
        acceptanceEvidence: "Accettazione cliente verificata nella fixture",
        value: 30,
      },
    });
    expect(receipt(changed).id).toBe(dealId);
    const row = await db.deal.findUniqueOrThrow({ where: { id: dealId } });
    expect(row.status).toBe("WON");
    expect(row.closedAt).not.toBeNull();
    expect(row.currency).toBe("USD");
    const record = await client.callTool({
      name: "pipely_get_record",
      arguments: { kind: "deal", id: dealId },
    });
    expect(text(record)).toContain("Cliente interessato");
    expect(await db.mcpOperation.count({ where: { organizationId: orgId } })).toBe(4);
    expect(await db.webhookDelivery.count({ where: { webhookId: "mcp-hook" } })).toBe(4);
    expect((await getMcpSettings()).data?.operations).toHaveLength(4);
  });
  it("crea l'anagrafica aziendale completa e deduplica record e webhook nei retry", async () => {
    const client = await connect();
    const input = {
      requestId: "company-create-1",
      name: "Studio Rossi",
      website: "https://example.test",
      industry: "Consulenza",
      size: "1-10",
      address: "Via Roma 1",
      city: "Roma",
      country: "Italia",
      email: "info@example.test",
      phone: "+390612345",
      vatNumber: "IT12345678901",
      description: "Studio professionale",
      linkedinUrl: "https://linkedin.com/company/example",
      referentName: "Mario Rossi",
      referentRole: "Titolare",
      referentEmail: "mario@example.test",
      referentPhone: "+3933312345",
    };
    const first = receipt(
      await client.callTool({ name: "pipely_create_company", arguments: input }),
    );
    const retry = receipt(
      await client.callTool({ name: "pipely_create_company", arguments: input }),
    );
    expect(first.replayed).toBe(false);
    expect(retry).toMatchObject({ id: first.id, updatedAt: first.updatedAt, replayed: true });
    const { requestId, ...fields } = input;
    expect(await db.company.findUniqueOrThrow({ where: { id: first.id } })).toMatchObject({
      ...fields,
      organizationId: orgId,
    });
    expect(await db.company.count({ where: { organizationId: orgId } })).toBe(2);
    expect(await db.mcpOperation.count({ where: { organizationId: orgId } })).toBe(1);
    expect(await db.webhookDelivery.count({ where: { event: "company.created" } })).toBe(1);
    const detail = await client.callTool({
      name: "pipely_get_record",
      arguments: { kind: "company", id: first.id },
    });
    expect(text(detail)).toContain(input.referentEmail);
    expect(text(detail)).toContain(input.description);
    expect(
      (
        await client.callTool({
          name: "pipely_create_company",
          arguments: { ...input, name: "Diversa" },
        })
      ).isError,
    ).toBe(true);
    expect(requestId).toBeTruthy();
  });
  it("aggiorna solo i campi indicati, cancella con null e ripete la ricevuta originale", async () => {
    const client = await connect();
    const before = await db.company.update({
      where: { id: "mcp-company-a" },
      data: { city: "Roma", phone: "123", referentEmail: "anna@example.test" },
    });
    const input = {
      requestId: "company-update-1",
      id: before.id,
      expectedUpdatedAt: before.updatedAt.toISOString(),
      phone: null,
      city: "Milano",
    };
    const first = receipt(
      await client.callTool({ name: "pipely_update_company", arguments: input }),
    );
    expect(first.updatedAt).not.toBe(input.expectedUpdatedAt);
    const row = await db.company.findUniqueOrThrow({ where: { id: before.id } });
    expect(row).toMatchObject({
      name: before.name,
      city: "Milano",
      phone: null,
      referentEmail: before.referentEmail,
    });
    expect(
      receipt(await client.callTool({ name: "pipely_update_company", arguments: input })),
    ).toMatchObject({ ...first, replayed: true });
    expect(await db.webhookDelivery.count({ where: { event: "company.updated" } })).toBe(1);
  });
  it("rifiuta aziende esterne, versioni obsolete e aggiornamenti vuoti senza ricevute", async () => {
    const client = await connect();
    const before = await db.company.findUniqueOrThrow({ where: { id: "mcp-company-a" } });
    await db.company.update({
      where: { id: before.id },
      data: { name: "Aggiornata", updatedAt: new Date(before.updatedAt.getTime() + 1000) },
    });
    const input = {
      requestId: "company-stale-1",
      id: before.id,
      expectedUpdatedAt: before.updatedAt.toISOString(),
      city: "Milano",
    };
    expect(
      (await client.callTool({ name: "pipely_update_company", arguments: input })).isError,
    ).toBe(true);
    expect(
      (
        await client.callTool({
          name: "pipely_update_company",
          arguments: { ...input, id: "mcp-company-b" },
        })
      ).isError,
    ).toBe(true);
    expect(
      (
        await client.callTool({
          name: "pipely_update_company",
          arguments: {
            requestId: "company-empty-1",
            id: before.id,
            expectedUpdatedAt: input.expectedUpdatedAt,
          },
        })
      ).isError,
    ).toBe(true);
    expect(await db.mcpOperation.count({ where: { organizationId: orgId } })).toBe(0);
    expect(await db.webhookDelivery.count({ where: { webhookId: "mcp-hook" } })).toBe(0);
    expect((await db.company.findUniqueOrThrow({ where: { id: before.id } })).city).toBeNull();
  });
  it("non accetta dati aziendali invalidi o campi di sistema dal client", async () => {
    const client = await connect();
    for (const extra of [
      { name: "   " },
      { name: "x".repeat(301) },
      { email: "non-email" },
      { website: "non-url" },
      { referentEmail: "non-email" },
      { organizationId: "mcp-org-b" },
      { updatedAt: "2030-01-01T00:00:00Z" },
    ]) {
      expect(
        (
          await client.callTool({
            name: "pipely_create_company",
            arguments: { requestId: "company-invalid-1", name: "Studio", ...extra },
          })
        ).isError,
      ).toBe(true);
    }
    expect(await db.company.count({ where: { organizationId: orgId } })).toBe(1);
    expect(await db.mcpOperation.count({ where: { organizationId: orgId } })).toBe(0);
  });
  it("due aggiornamenti concorrenti non sovrascrivono la stessa versione aziendale", async () => {
    const client = await connect();
    const before = await db.company.findUniqueOrThrow({ where: { id: "mcp-company-a" } });
    const common = { id: before.id, expectedUpdatedAt: before.updatedAt.toISOString() };
    const outcomes = await Promise.all(
      ["Roma", "Milano"].map((city) =>
        client.callTool({
          name: "pipely_update_company",
          arguments: { ...common, city, requestId: `company-race-${city}` },
        }),
      ),
    );
    expect(outcomes.filter((r) => r.isError)).toHaveLength(1);
    expect(await db.mcpOperation.count({ where: { organizationId: orgId } })).toBe(1);
    expect(await db.webhookDelivery.count({ where: { event: "company.updated" } })).toBe(1);
  });
  it("completa un'attività una sola volta e conserva la data anche con un nuovo requestId", async () => {
    const client = await connect();
    const activity = await db.activity.create({
      data: {
        type: "TASK",
        subject: "Richiamare",
        userId,
        organizationId: orgId,
        contactId: "mcp-contact-a",
      },
    });
    const input = { id: activity.id, requestId: "activity-complete-1" };
    const first = receipt(
      await client.callTool({ name: "pipely_complete_activity", arguments: input }),
    );
    expect(first).toMatchObject({ id: activity.id, alreadyCompleted: false, replayed: false });
    expect(first.completedAt).toBeTruthy();
    expect(
      receipt(await client.callTool({ name: "pipely_complete_activity", arguments: input })),
    ).toMatchObject({ ...first, replayed: true });
    const again = receipt(
      await client.callTool({
        name: "pipely_complete_activity",
        arguments: { ...input, requestId: "activity-complete-2" },
      }),
    );
    expect(again).toMatchObject({ completedAt: first.completedAt, alreadyCompleted: true });
    expect(
      (
        await db.activity.findUniqueOrThrow({ where: { id: activity.id } })
      ).completedAt?.toISOString(),
    ).toBe(first.completedAt);
    expect(await db.webhookDelivery.count({ where: { event: "activity.completed" } })).toBe(1);
    expect(await db.workflowQueue.count({ where: { orgId } })).toBe(0);
    const listed = await client.callTool({
      name: "pipely_list_activities",
      arguments: { completed: true },
    });
    expect(text(listed)).toContain(activity.id);
    expect(
      text(
        await client.callTool({ name: "pipely_list_activities", arguments: { completed: false } }),
      ),
    ).not.toContain(activity.id);
  });
  it("completamenti concorrenti da chiavi diverse producono un unico evento", async () => {
    const secondKey = "pip_mcp_" + "b".repeat(64);
    await db.mcpToken.create({
      data: {
        name: "Secondo agente",
        keyHash: hashMcpKey(secondKey),
        prefix: secondKey.slice(0, 16),
        canWrite: true,
        organizationId: orgId,
        createdBy: userId,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    const activity = await db.activity.create({
      data: { type: "CALL", subject: "Chiamare", userId, organizationId: orgId },
    });
    const first = await connect(),
      second = await connect(secondKey);
    const outcomes = await Promise.all(
      [first, second].map((client, i) =>
        client.callTool({
          name: "pipely_complete_activity",
          arguments: { id: activity.id, requestId: `complete-concurrent-${i}` },
        }),
      ),
    );
    expect(outcomes.every((r) => !r.isError)).toBe(true);
    expect(outcomes.map((r) => receipt(r).alreadyCompleted).sort()).toEqual([false, true]);
    expect(receipt(outcomes[0]).completedAt).toBe(receipt(outcomes[1]).completedAt);
    expect(await db.webhookDelivery.count({ where: { event: "activity.completed" } })).toBe(1);
  });
  it("completa in Starter ma non può concludere attività di altre organizzazioni", async () => {
    await db.organization.update({ where: { id: orgId }, data: { plan: "STARTER" } });
    const client = await connect();
    const own = await db.activity.create({
      data: { type: "TASK", subject: "Propria", userId, organizationId: orgId },
    });
    const foreign = await db.activity.create({
      data: {
        type: "TASK",
        subject: "Esterna",
        userId: "mcp-owner-b",
        organizationId: "mcp-org-b",
      },
    });
    for (const id of [foreign.id, "missing-activity"]) {
      expect(
        (
          await client.callTool({
            name: "pipely_complete_activity",
            arguments: { id, requestId: "complete-forbidden-1" },
          })
        ).isError,
      ).toBe(true);
    }
    expect(await db.mcpOperation.count({ where: { organizationId: orgId } })).toBe(0);
    expect(
      receipt(
        await client.callTool({
          name: "pipely_complete_activity",
          arguments: { id: own.id, requestId: "complete-starter-1" },
        }),
      ).completedAt,
    ).toBeTruthy();
    const company = await client.callTool({
      name: "pipely_create_company",
      arguments: { requestId: "company-starter-1", name: "Microimpresa" },
    });
    expect(company.isError).not.toBe(true);
    expect(
      (await db.activity.findUniqueOrThrow({ where: { id: foreign.id } })).completedAt,
    ).toBeNull();
    expect(await db.workflowQueue.count({ where: { orgId } })).toBe(0);
  });
  it("blocca versioni vecchie, trattative eliminate e aggiornamenti di altre organizzazioni", async () => {
    const client = await connect();
    const before = await db.deal.findUniqueOrThrow({ where: { id: "mcp-deal-a" } });
    await db.deal.update({
      where: { id: before.id },
      data: { title: "Modificata", updatedAt: new Date(before.updatedAt.getTime() + 1000) },
    });
    const input = {
      requestId: "stale-request",
      id: before.id,
      expectedUpdatedAt: before.updatedAt.toISOString(),
      value: 999,
    };
    expect((await client.callTool({ name: "pipely_update_deal", arguments: input })).isError).toBe(
      true,
    );
    await db.deal.update({ where: { id: before.id }, data: { status: "DELETED" } });
    expect(
      (
        await client.callTool({
          name: "pipely_get_record",
          arguments: { kind: "deal", id: before.id },
        })
      ).isError,
    ).toBe(true);
    expect(
      (
        await client.callTool({
          name: "pipely_update_deal",
          arguments: { ...input, id: "mcp-deal-b" },
        })
      ).isError,
    ).toBe(true);
    expect(await db.mcpOperation.count({ where: { organizationId: orgId } })).toBe(0);
  });
});
