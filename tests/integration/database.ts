import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { readdir, readFile } from "node:fs/promises";
import pg from "pg";

// Never reads DATABASE_URL or .env.local. In-memory PostgreSQL on loopback only.
const localUrl = process.env.PIPELY_TEST_DATABASE_URL;
if (localUrl) {
  const parsed = new URL(localUrl);
  if (parsed.hostname !== "127.0.0.1" || parsed.pathname !== "/pipely_review_fixture") {
    throw new Error("Integration tests require the dedicated local fixture database");
  }
}
const postgres = localUrl ? null : new PGlite();
const server = postgres
  ? new PGLiteSocketServer({ db: postgres, host: "127.0.0.1", port: 0 })
  : null;
const setup = localUrl ? new pg.Client({ connectionString: localUrl }) : null;
async function executeSql(sql: string) {
  if (setup) await setup.query(sql);
  else await postgres!.exec(sql);
}
let client: PrismaClient;
export const db = new Proxy({} as PrismaClient, {
  get(_target, key) {
    const value = Reflect.get(client, key);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
export async function startDatabase() {
  await setup?.connect();
  const migrations = (await readdir("prisma/migrations", { withFileTypes: true }))
    .filter((f) => f.isDirectory())
    .map((f) => f.name)
    .sort();
  for (const migration of migrations) {
    if (migration === "20260907090000_workflow_reliability") {
      await executeSql(`INSERT INTO "Organization" (id,name,slug,"updatedAt") VALUES ('legacy-org','Legacy','legacy',now());
        INSERT INTO "Workflow" (id,name,trigger,steps,"organizationId","updatedAt") VALUES ('legacy-wf','Legacy','{"type":"DEAL_CREATED"}','[{"id":"s","action":{"type":"SEND_NOTIFICATION","message":"Legacy"}}]','legacy-org',now());
        INSERT INTO "WorkflowQueue" (id,"workflowId","stepIndex",payload,"orgId","ownerId","resumeAt") VALUES ('legacy-job','legacy-wf',0,'{}','legacy-org','owner',now());
        INSERT INTO "WorkflowExecution" (id,"workflowId",status,payload,logs) VALUES ('legacy-validation','legacy-wf','SUCCESS','{"entityId":"test"}',ARRAY[]::jsonb[]);`);
    }
    await executeSql(await readFile(`prisma/migrations/${migration}/migration.sql`, "utf8"));
  }
  await server?.start();
  client = new PrismaClient({
    adapter: new PrismaPg({
      connectionString:
        localUrl ?? `postgresql://postgres:postgres@${server!.getServerConn()}/postgres`,
      ssl: false,
      max: localUrl ? 8 : 1,
    }),
  });
}
export async function closeDatabase() {
  await client?.$disconnect();
  await setup?.end();
  await server?.stop();
  await postgres?.close();
}
