import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import pg from "pg";

const label = process.argv[2];
if (!label || !/^[a-z0-9-]{1,40}$/.test(label)) throw new Error("Provide the backup label");
const backupDir = path.resolve("backups");
const manifest = JSON.parse(await fs.readFile(path.join(backupDir, `release-20260907-${label}-manifest.json`), "utf8"));
if (manifest.file !== `pipely-prod-20260907-pre-${label}.dump`) throw new Error("Unexpected archive path");
const digest = createHash("sha256").update(await fs.readFile(path.join(backupDir, manifest.file))).digest("hex");
if (digest !== manifest.sha256) throw new Error("Archive checksum mismatch");
const name = `pipely-rehearse-${label}`;
const password = randomBytes(24).toString("hex");
const env = { ...process.env, POSTGRES_PASSWORD: password };
function docker(args) {
  const r = spawnSync("docker", args, { env, encoding: "utf8", windowsHide: true, timeout: 60000, maxBuffer: 1024 * 1024 });
  if (r.status !== 0) throw new Error(`Docker operation failed: ${r.stderr?.slice(0, 1000)}`);
  return r.stdout;
}
let started = false;
let client;
try {
  docker(["run", "--detach", "--name", name, "--env", "POSTGRES_PASSWORD", "--env", "POSTGRES_DB=pipely_restore", "--publish", "127.0.0.1:55439:5432", "--mount", `type=bind,source=${backupDir},target=/backup,readonly`, "postgres:17-alpine"]);
  started = true;
  for (let attempt = 0; attempt < 15; attempt++) {
    const ready = spawnSync("docker", ["exec", name, "pg_isready", "-U", "postgres"], { encoding: "utf8", windowsHide: true, timeout: 3000 });
    if (ready.status === 0) break;
    if (attempt === 14) throw new Error("Temporary PostgreSQL not ready");
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  docker(["exec", name, "pg_restore", "--exit-on-error", "--no-owner", "--no-privileges", "-U", "postgres", "-d", "pipely_restore", `/backup/${manifest.file}`]);
  client = new pg.Client({ host: "127.0.0.1", port: 55439, user: "postgres", password, database: "pipely_restore", ssl: false, connectionTimeoutMillis: 5000 });
  await client.connect();
  const applied = new Set(manifest.migrations.filter(m => m.finished_at && !m.rolled_back_at).map(m => m.migration_name));
  const migrations = (await fs.readdir("prisma/migrations", { withFileTypes: true })).filter(f => f.isDirectory() && !applied.has(f.name)).map(f => f.name).sort();
  await client.query("BEGIN");
  for (const migration of migrations) await client.query(await fs.readFile(path.join("prisma/migrations", migration, "migration.sql"), "utf8"));
  await client.query("COMMIT");
  const differences = [];
  for (const [table, before] of Object.entries(manifest.counts)) {
    const after = Number((await client.query(`SELECT count(*) FROM public."${table.replaceAll('"', '""')}"`)).rows[0].count);
    if (after !== before) differences.push({ table, before, after });
  }
  if (differences.length) throw new Error("Record counts changed during migration rehearsal");
  const tableCount = Number((await client.query("SELECT count(*) FROM pg_tables WHERE schemaname='public'")).rows[0].count);
  const result = { checkedAt: new Date().toISOString(), restoredArchiveSha256: digest, appliedToCopy: migrations, originalTables: Object.keys(manifest.counts).length, tablesAfter: tableCount, originalCountsPreserved: true };
  await fs.writeFile(path.join(backupDir, `rehearsal-${label}.json`), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await client?.end();
  if (started) docker(["rm", "--force", "--volumes", name]);
}
