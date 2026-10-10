// Public HTTP checks only: no credentials, tools/call, CRM writes or fixtures.
const endpoint = "https://www.pipely.it/api/mcp";
const checks = [];
const probes = [
  { name: "missingBearerPost", method: "POST", expected: 401 },
  { name: "missingBearerGet", method: "GET", expected: 401 },
  {
    name: "invalidBearer",
    method: "POST",
    expected: 401,
    headers: { Authorization: "Bearer invalid-fixture" },
  },
  {
    name: "untrustedOrigin",
    method: "POST",
    expected: 403,
    headers: { Origin: "https://untrusted.example.test" },
  },
  {
    name: "allowedPreflight",
    method: "OPTIONS",
    expected: 204,
    headers: { Origin: "https://www.pipely.it" },
  },
];
try {
  for (const probe of probes) {
    const response = await fetch(endpoint, {
      method: probe.method,
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        ...probe.headers,
      },
      ...(probe.method === "POST" && {
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
      }),
    });
    const cache = response.headers.get("cache-control") ?? "";
    const cors = response.headers.get("access-control-allow-origin");
    const passed =
      response.status === probe.expected &&
      !response.headers.has("location") &&
      cache.includes("no-store") &&
      cors !== "*" &&
      (probe.name !== "allowedPreflight" || cors === "https://www.pipely.it");
    checks.push({
      name: probe.name,
      expected: probe.expected,
      status: response.status,
      cache,
      cors,
      passed,
    });
    await response.body?.cancel();
  }
  process.stdout.write(
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        endpoint,
        crmCalls: 0,
        syntheticFixtures: false,
        checks,
      },
      null,
      2,
    ) + "\n",
  );
  if (checks.some((check) => !check.passed)) process.exitCode = 1;
} catch {
  console.error("Controlli HTTP non completati; nessun dato CRM o credenziale utilizzato.");
  process.exitCode = 1;
}
