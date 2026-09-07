// Solo conteggi aggregati. Non invoca il CRM, non invia email, non modifica righe.
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local", quiet: true });
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString || !process.env.DATABASE_CA_CERT) {
  console.error("Servono connessione DB e CA verificata; controllo non eseguito.");
  process.exit(1);
}
const parsed = new URL(connectionString);
for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) parsed.searchParams.delete(key);
const client = new pg.Client({
  connectionString: parsed.toString(),
  ssl: { ca: process.env.DATABASE_CA_CERT.replace(/\\n/g, "\n"), rejectUnauthorized: true },
  connectionTimeoutMillis: 10000,
});
try {
  await client.connect();
  await client.query("BEGIN READ ONLY");
  await client.query("SET LOCAL statement_timeout = '10000ms'");
  const queries = {
    workflows: 'SELECT count(*)::int AS total, count(*) FILTER (WHERE "isActive")::int AS active FROM "Workflow"',
    executions: `SELECT status, count(*)::int AS total, count(*) FILTER (WHERE payload->>'entityId' = 'test')::int AS manual_validations FROM "WorkflowExecution" GROUP BY status`,
    queue: 'SELECT count(*)::int AS total, count(*) FILTER (WHERE "resumeAt" <= now())::int AS due FROM "WorkflowQueue"',
    plans: 'SELECT plan, count(*)::int AS organizations FROM "Organization" GROUP BY plan',
    smtp: 'SELECT count(*)::int AS total, count(*) FILTER (WHERE "isVerified")::int AS verified FROM "SmtpConfig"',
    subscriptions: 'SELECT count(*) FILTER (WHERE "stripeSubscriptionId" IS NOT NULL)::int AS subscriptions, count(*) FILTER (WHERE "stripeSubscriptionId" IS NOT NULL AND "stripeCurrentPeriodEnd" IS NULL)::int AS missing_period_end FROM "Organization"',
    campaigns: 'SELECT status, count(*)::int AS total FROM "EmailCampaign" GROUP BY status',
  };
  const result = { checkedAt: new Date().toISOString() };
  for (const [label, query] of Object.entries(queries)) result[label] = (await client.query(query)).rows;
  await client.query("ROLLBACK");
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  // Non mostra URL, credenziali o valori delle righe in caso di errore.
  console.error(JSON.stringify({ readOnlyCheckError: error.code || error.name }));
  process.exitCode = 1;
} finally {
  await client.end();
}
