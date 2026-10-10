// Read-only metadata probe. Never calls CRM tools or creates credentials/fixtures.
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

const envName = process.argv[2];
if (!envName || !/^[A-Z_][A-Z0-9_]*$/i.test(envName)) {
  console.error(
    "Indica il nome della variabile ambiente che contiene la chiave MCP già configurata.",
  );
  process.exit(1);
}
const token = process.env[envName];
if (!token || !/^pip_mcp_[a-f0-9]{64}$/i.test(token)) {
  console.error(
    "La variabile richiesta non contiene una chiave MCP Pipely valida; nessuna richiesta effettuata.",
  );
  process.exit(1);
}
const client = new Client({ name: "pipely-readonly-discovery", version: "1.0.0" });
try {
  await client.connect(
    new StreamableHTTPClientTransport(new URL("https://www.pipely.it/api/mcp"), {
      authProvider: { token: async () => token },
    }),
    { timeout: 15000 },
  );
  const catalog = [];
  let cursor;
  do {
    const page = await client.listTools(cursor ? { cursor } : {}, { timeout: 15000 });
    catalog.push(...page.tools);
    cursor = page.nextCursor;
  } while (cursor);
  const watched = [
    "pipely_predict_effects",
    "pipely_update_contact",
    "pipely_update_activity",
    "pipely_import_batch",
    "pipely_upsert_external_event",
  ];
  const eventSchema = catalog.find((tool) => tool.name === "pipely_upsert_external_event")
    ?.inputSchema.properties;
  const historySchema = catalog.find((tool) => tool.name === "pipely_list_external_events")
    ?.inputSchema.properties;
  process.stdout.write(
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        endpoint: "https://www.pipely.it/api/mcp",
        server: client.getServerVersion(),
        count: catalog.length,
        predictionOperations:
          catalog.find((tool) => tool.name === "pipely_predict_effects")?.inputSchema.properties
            ?.operation?.enum ?? [],
        readOnly: catalog.filter((tool) => tool.annotations?.readOnlyHint === true).length,
        names: catalog.map((tool) => tool.name).sort(),
        externalEvents: {
          kinds: eventSchema?.kind?.enum ?? [],
          states: eventSchema?.state?.enum ?? [],
          smsAccountId: !!eventSchema?.smsAccountId,
          recipient: eventSchema?.recipient ?? null,
          historyKinds: historySchema?.kind?.enum ?? [],
        },
        fields: Object.fromEntries(
          catalog
            .filter((tool) => watched.includes(tool.name))
            .map((tool) => [tool.name, Object.keys(tool.inputSchema.properties ?? {})]),
        ),
      },
      null,
      2,
    ) + "\n",
  );
} catch {
  // Never echo transport errors: these can contain credential-bearing requests.
  console.error(
    "Discovery non completata. Verificare endpoint, disponibilità della credenziale e permessi senza stampare token o header.",
  );
  process.exitCode = 1;
} finally {
  await client.close().catch(() => {});
}
