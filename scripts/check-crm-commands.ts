import { config } from "dotenv";
import { writeFile } from "node:fs/promises";
import { strict as assert } from "node:assert";
async function main() {
if (!process.argv.includes("--synthetic-examples")) throw new Error("Use --synthetic-examples to call the AI provider with six fictional examples");
config({ path: ".env.local", quiet: true });
const { chatCompletion, DEFAULT_MODEL } = await import("../src/lib/openrouter");
const { crmCommandMessages } = await import("../src/lib/crm-command-prompt");
const { crmProposalSchema } = await import("../src/lib/crm-command-schema");
const now = new Date("2026-09-07T08:00:00Z");
const context = { kind: "deal" as const, id: "synthetic-deal", name: "Progetto di collaudo", version: now.toISOString(), currency: "EUR", stages: [{ id: "synthetic-new", name: "Nuovo" }, { id: "synthetic-proposal", name: "Proposta" }] };
const scenarios = [
  { name: "nota", text: "Aggiungi una nota: incontro positivo.", expected: { type: "CREATE_NOTE", content: "incontro positivo." } },
  { name: "data relativa italiana", text: "Crea un'attività per chiamare il cliente domani alle dieci.", expected: { type: "CREATE_ACTIVITY", activityType: "CALL", dueLocal: "2026-09-08T10:00" } },
  { name: "stato e importo italiano", text: "Segna questo affare come vinto con un valore di 1.250 euro.", expected: { type: "UPDATE_DEAL", status: "WON", value: 1250 } },
  { name: "fase della pipeline", text: "Sposta l'affare nella fase Proposta.", expected: { type: "UPDATE_DEAL", stageId: "synthetic-proposal" } },
  { name: "eliminazione fuori ambito", text: "Elimina tutti i clienti dal CRM.", expected: null },
  { name: "destinatario diverso", text: "Aggiungi la nota incontro positivo sull'affare di Bianchi, non su Progetto di collaudo.", expected: null },
];
const results = [];
for (const scenario of scenarios) {
  let result: unknown = null;
  let error: string | null = null;
  try {
    const raw = await chatCompletion(crmCommandMessages(scenario.text, context, now), { maxTokens: 2200, temperature: 0, retries: 0, timeoutMs: 45000 });
    const json = JSON.parse(raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
    result = json;
    if (!scenario.expected) assert.deepEqual(json, { actions: [] });
    else {
      const parsed = crmProposalSchema.parse(json);
      assert.equal(parsed.actions.length, 1);
      for (const [key, value] of Object.entries(scenario.expected)) {
        const actual = (parsed.actions[0] as Record<string, unknown>)[key];
        assert.deepEqual(typeof actual === "string" && key === "content" ? actual.toLowerCase() : actual, value);
      }
    }
  } catch (caught) { error = caught instanceof Error ? caught.message.slice(0, 600) : "Provider check failed"; }
  results.push({ name: scenario.name, input: scenario.text, passed: error === null, output: result, error });
  process.stdout.write(JSON.stringify({ name: scenario.name, passed: error === null }) + "\n");
}
const report = { checkedAt: new Date().toISOString(), model: DEFAULT_MODEL, source: "Sei esempi sintetici; nessuna lettura o modifica del database CRM", clock: now.toISOString(), passed: results.filter(r => r.passed).length, total: results.length, results };
await writeFile("docs/COMANDI-AI-2026-09-07.json", JSON.stringify(report, null, 2));
if (report.passed !== report.total) process.exitCode = 1;

}
main().catch(() => { console.error("Collaudo AI non completato: verificare il rapporto e la configurazione."); process.exitCode = 1; });
