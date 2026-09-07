// Explicit, temporary production fixture. Never impersonates an existing CRM user.
import dotenv from "dotenv";
import pg from "pg";
import { hash } from "bcryptjs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
if (!process.argv.includes("--synthetic-fixture")) throw new Error("Explicit --synthetic-fixture required");
dotenv.config({ path: ".env.local", quiet: true });
const origin = "https://www.pipely.it";
const orgId = "release-voice-smoke-20260907";
const userId = orgId + "-user";
const contactId = orgId + "-contact";
const u = new URL(process.env.DIRECT_URL);
for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) u.searchParams.delete(key);
const client = new pg.Client({ connectionString: u.toString(), ssl: { ca: process.env.DATABASE_CA_CERT.replace(/\\n/g, "\n"), rejectUnauthorized: true }, connectionTimeoutMillis: 10000 });
const audio = await readFile(join(process.env.TEMP, "pipely-voice-smoke.wav"));
assert(audio.length > 1000 && audio.length < 500000 && audio.toString("ascii", 0, 4) === "RIFF");
const password = randomUUID() + randomUUID();
const passwordHash = await hash(password, 10);
let created = false;
const checks = [];
try {
  await client.connect();
  await client.query("BEGIN");
  assert.equal(Number((await client.query('SELECT count(*) FROM "Organization" WHERE id=$1 OR slug=$1', [orgId])).rows[0].count), 0);
  await client.query('INSERT INTO "Organization" (id,name,slug,plan,"updatedAt") VALUES ($1,$2,$1,\'PRO\',now())', [orgId, "Collaudo vocale temporaneo"]);
  await client.query('INSERT INTO "User" (id,email,name,role,"organizationId","passwordHash") VALUES ($1,$2,$3,\'OWNER\',$4,$5)', [userId, "voice-smoke-20260907@example.invalid", "Collaudo temporaneo", orgId, passwordHash]);
  await client.query('INSERT INTO "Contact" (id,"firstName","organizationId","ownerId","updatedAt") VALUES ($1,$2,$3,$4,now())', [contactId, "Contatto sintetico", orgId, userId]);
  await client.query("COMMIT"); created = true;
  const cookieJar = new Map();
  async function request(path, init = {}) {
    const response = await fetch(origin + path, { ...init, headers: { ...init.headers, cookie: [...cookieJar].map(([key, value]) => key + "=" + value).join("; "), origin }, redirect: "manual", signal: AbortSignal.timeout(90000) });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";")[0]; const separator = pair.indexOf("=");
      cookieJar.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
    return response;
  }
  const csrf = await (await request("/api/auth/csrf")).json();
  assert.equal(typeof csrf.csrfToken, "string");
  const signedIn = await request("/api/auth/callback/credentials", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Auth-Return-Redirect": "1" }, body: new URLSearchParams({ email: "voice-smoke-20260907@example.invalid", password, csrfToken: csrf.csrfToken, callbackUrl: origin + "/voice" }) });
  assert.equal(signedIn.status, 200, "Temporary account login");
  assert([...cookieJar.keys()].some(name => name.includes("session-token")), "Session cookie missing");
  for (const path of ["/voice", "/settings/invoicing"]) {
    const response = await request(path); const html = await response.text();
    assert.equal(response.status, 200, path + " redirect: " + response.headers.get("location"));
    assert(html.includes(path === "/voice" ? "Note vocali e comandi" : "attivato dal gestore"));
    checks.push({ path, status: response.status });
  }
  const id = randomUUID(); const form = new FormData();
  form.set("id", id); form.set("title", "Collaudo sintetico temporaneo"); form.set("duration", "5"); form.set("contactId", contactId); form.set("dealId", ""); form.set("audio", new Blob([audio], { type: "audio/wav" }), "synthetic.wav");
  const uploaded = await request("/api/voice", { method: "POST", body: form });
  assert.equal(uploaded.status, 200, "Voice upload: " + JSON.stringify(await uploaded.json()));
  checks.push({ operation: "upload", status: uploaded.status });
  const downloaded = await request("/api/voice/" + id);
  assert.equal(downloaded.status, 200); assert(Buffer.from(await downloaded.arrayBuffer()).equals(audio));
  checks.push({ operation: "private audio download", identical: true, cache: downloaded.headers.get("cache-control") });
  const transcribed = await request("/api/voice/" + id + "/transcribe", { method: "POST" }); const result = await transcribed.json();
  assert.equal(transcribed.status, 200, "Transcription failed");
  assert(/richiama/i.test(result.text) && /cliente/i.test(result.text) && /domani/i.test(result.text) && /dieci|10/i.test(result.text));
  checks.push({ operation: "production transcription", text: result.text });
  const replay = await request("/api/voice/" + id + "/transcribe", { method: "POST" });
  assert.equal(replay.status, 200);
  const usage = Number((await client.query('SELECT sum(calls) FROM "AiUsageDay" WHERE "organizationId"=$1', [orgId])).rows[0].sum);
  assert.equal(usage, 1); checks.push({ operation: "cached transcription", providerCalls: usage });
} finally {
  if (created) {
    await client.query('DELETE FROM "Organization" WHERE id=$1 AND slug=$1', [orgId]);
    assert.equal(Number((await client.query('SELECT count(*) FROM "VoiceNote" WHERE "organizationId"=$1', [orgId])).rows[0].count), 0);
  } else await client.query("ROLLBACK").catch(() => {});
  await client.end();
}
const report = { checkedAt: new Date().toISOString(), origin, source: "Account e contatto temporanei, registrazione sintetica; nessun dato cliente", fixtureRemoved: created, checks };
await writeFile("docs/VOCE-PRODUZIONE-2026-09-07.json", JSON.stringify(report, null, 2));
process.stdout.write(JSON.stringify(report) + "\n");
