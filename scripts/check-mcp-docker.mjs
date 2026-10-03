// Dedicated empty PostgreSQL fixture. No production configuration is read.
import { spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import pg from "pg";

const name = `pipely-mcp-test-${randomUUID()}`;
const password = randomBytes(24).toString("hex");
const env = { ...process.env, POSTGRES_PASSWORD: password };
let containerId;
function docker(args) {
  const result = spawnSync("docker", args, {
    env,
    encoding: "utf8",
    windowsHide: true,
    timeout: 60000,
  });
  if (result.status !== 0)
    throw new Error(`Docker operation failed: ${result.stderr?.slice(0, 500)}`);
  return result.stdout.trim();
}
try {
  containerId = docker([
    "run",
    "--detach",
    "--name",
    name,
    "--env",
    "POSTGRES_PASSWORD",
    "--env",
    "POSTGRES_DB=pipely_review_fixture",
    "--publish",
    "127.0.0.1:55440:5432",
    "postgres:17-alpine",
  ]);
  if (!/^[a-f0-9]{64}$/.test(containerId)) throw new Error("Unexpected container identity");
  const connectionString = `postgresql://postgres:${password}@127.0.0.1:55440/pipely_review_fixture`;
  for (let attempt = 0; attempt < 20; attempt++) {
    const client = new pg.Client({ connectionString, connectionTimeoutMillis: 2000 });
    try {
      await client.connect();
      await client.query("SELECT 1");
      await client.end();
      break;
    } catch {
      await client.end().catch(() => {});
      if (attempt === 19) throw new Error("Fixture PostgreSQL not ready");
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  const tests = spawnSync(
    process.execPath,
    [
      "node_modules/vitest/vitest.mjs",
      "run",
      "--config",
      "vitest.integration.config.ts",
      "tests/integration/mcp.test.ts",
    ],
    {
      env: { ...process.env, PIPELY_TEST_DATABASE_URL: connectionString },
      encoding: "utf8",
      windowsHide: true,
      timeout: 180000,
      maxBuffer: 4 * 1024 * 1024,
    },
  );
  process.stdout.write(tests.stdout ?? "");
  process.stderr.write(tests.stderr ?? "");
  if (tests.status !== 0) throw new Error("MCP PostgreSQL fixture tests failed");
} finally {
  if (containerId && /^[a-f0-9]{64}$/.test(containerId))
    docker(["rm", "--force", "--volumes", containerId]);
}
