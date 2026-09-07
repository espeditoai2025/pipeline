// Explicit production read-only backup; restore and migration rehearsal target only a local container.
import dotenv from "dotenv";
import pg from "pg";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";

dotenv.config({ path: ".env.local", quiet: true });
const action = process.argv[2];
if (!["backup", "verify"].includes(action)) throw new Error("Use backup or verify");
const label = process.argv[3] ?? "workflow";
if (!/^[a-z0-9-]{1,40}$/.test(label)) throw new Error("Invalid backup label");
const backupDir = path.resolve("backups");
const dumpName = `pipely-prod-20260907-pre-${label}.dump`;
const manifestName = label === "workflow" ? "release-20260907-manifest.json" : `release-20260907-${label}-manifest.json`;
const connection = new URL(process.env.DIRECT_URL);
if (!process.env.DATABASE_CA_CERT) throw new Error("Verified CA required");
const ca = process.env.DATABASE_CA_CERT.replace(/\\n/g, "\n");
for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"])
  connection.searchParams.delete(key);
const client = new pg.Client({
  connectionString: connection.toString(),
  ssl: { ca, rejectUnauthorized: true },
  connectionTimeoutMillis: 10000,
});
function docker(args, env = process.env, input) {
  const result = spawnSync("docker", args, {
    env,
    input,
    encoding: "utf8",
    timeout: 600000,
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.status !== 0)
    throw new Error(`Docker failed (${result.status}): ${result.stderr?.slice(0, 1500)}`);
  return result.stdout;
}
try {
  await client.connect();
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  await client.query("SET LOCAL statement_timeout = '15000ms'");
  const migrations = (
    await client.query(
      'SELECT migration_name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY started_at',
    )
  ).rows;
  const pending = migrations.filter((m) => !m.finished_at && !m.rolled_back_at);
  if (pending.length) throw new Error("Unresolved failed production migration");
  for (const m of migrations.filter((m) => m.finished_at && !m.rolled_back_at)) {
    const sql = await fs.readFile(
      path.join("prisma/migrations", m.migration_name, "migration.sql"),
    );
    const text = sql.toString("utf8");
    const hashes = [text, text.replaceAll("\r\n", "\n"), text.replace(/\r?\n/g, "\r\n")].map(
      (value) => createHash("sha256").update(value).digest("hex"),
    );
    if (!hashes.includes(m.checksum))
      throw new Error(`Migration checksum mismatch: ${m.migration_name}`);
  }
  const workflows = (
    await client.query(
      'SELECT count(*)::int AS total, count(*) FILTER (WHERE "isActive")::int AS active FROM "Workflow"',
    )
  ).rows[0];
  const queue = Number((await client.query('SELECT count(*) FROM "WorkflowQueue"')).rows[0].count);
  const tables = (
    await client.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename",
    )
  ).rows.map((r) => r.tablename);
  const counts = {};
  for (const table of tables)
    counts[table] = Number(
      (await client.query(`SELECT count(*) FROM public."${table.replaceAll('"', '""')}"`)).rows[0]
        .count,
    );
  await client.query("ROLLBACK");
  if (action === "backup") {
    await fs.mkdir(backupDir, { recursive: true });
    try {
      await fs.access(path.join(backupDir, dumpName));
      throw new Error("Backup already exists; refusing to overwrite");
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    await fs.writeFile(path.join(backupDir, "database-ca.pem"), ca);
    const env = {
      ...process.env,
      PGHOST: connection.hostname,
      PGHOSTADDR: (await lookup(connection.hostname, { family: 4 })).address,
      PGCONNECT_TIMEOUT: "15",
      PGPORT: connection.port || "5432",
      PGUSER: decodeURIComponent(connection.username),
      PGPASSWORD: decodeURIComponent(connection.password),
      PGDATABASE: connection.pathname.slice(1),
      PGSSLMODE: "verify-full",
      PGSSLROOTCERT: "/backup/database-ca.pem",
    };
    const args = [
      "run",
      "--rm",
      "--name",
      `pipely-release-backup-20260907-${label}`,
      "--mount",
      `type=bind,source=${backupDir},target=/backup`,
    ];
    for (const key of [
      "PGHOST",
      "PGHOSTADDR",
      "PGCONNECT_TIMEOUT",
      "PGPORT",
      "PGUSER",
      "PGPASSWORD",
      "PGDATABASE",
      "PGSSLMODE",
      "PGSSLROOTCERT",
    ])
      args.push("-e", key);
    args.push(
      "postgres:17-alpine",
      "pg_dump",
      "--schema=public",
      "--no-owner",
      "--no-privileges",
      "--format=custom",
      `--file=/backup/${dumpName}`,
      "--lock-wait-timeout=15000",
    );
    docker(args, env);
    const dump = await fs.readFile(path.join(backupDir, dumpName));
    const toc = docker([
      "run",
      "--rm",
      "--mount",
      `type=bind,source=${backupDir},target=/backup,readonly`,
      "postgres:17-alpine",
      "pg_restore",
      "--list",
      `/backup/${dumpName}`,
    ]);
    const manifest = {
      checkedAt: new Date().toISOString(),
      scope: "public CRM schema; Supabase managed schemas excluded",
      file: dumpName,
      bytes: dump.length,
      sha256: createHash("sha256").update(dump).digest("hex"),
      migrations,
      workflows,
      queue,
      counts,
      tableDataEntries: toc.split("\n").filter((l) => l.includes("TABLE DATA")).length,
    };
    await fs.writeFile(
      path.join(backupDir, manifestName),
      JSON.stringify(manifest, null, 2),
    );
    process.stdout.write(
      JSON.stringify({
        file: dumpName,
        bytes: manifest.bytes,
        sha256: manifest.sha256,
        tables: tables.length,
        tableDataEntries: manifest.tableDataEntries,
        workflows,
        queue,
        appliedMigrations: migrations.length,
      }) + "\n",
    );
  } else {
    const before = JSON.parse(
      await fs.readFile(path.join(backupDir, manifestName), "utf8"),
    );
    const changed = Object.entries(before.counts)
      .filter(([table, count]) => counts[table] !== count)
      .map(([table, count]) => ({ table, before: count, after: counts[table] }));
    process.stdout.write(
      JSON.stringify({
        checkedAt: new Date().toISOString(),
        appliedMigrations: migrations.map((m) => m.migration_name),
        workflows,
        queue,
        countChanges: changed,
      }) + "\n",
    );
  }
} finally {
  await client.end();
}
