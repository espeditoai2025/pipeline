// Synthetic audio only; does not read or mutate CRM records.
import { config } from "dotenv";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
config({ path: ".env.local", quiet: true });

async function main() {
  if (!process.argv.includes("--synthetic-audio")) throw new Error("Explicit --synthetic-audio required");
  const file = join(process.env.TEMP ?? "/tmp", "pipely-voice-smoke.wav");
  const bytes = await readFile(file);
  if (bytes.length < 1000 || bytes.length > 500000) throw new Error("Unexpected synthetic audio size");
  const { transcribeAudio } = await import("../src/lib/voice-ai");
  const text = await transcribeAudio(bytes, "audio/wav");
  const matched = /richiama/i.test(text) && /cliente/i.test(text) && /domani/i.test(text) && /dieci|10/i.test(text);
  const result = { checkedAt: new Date().toISOString(), model: process.env.OPENROUTER_TRANSCRIPTION_MODEL || "openai/whisper-large-v3", source: "Sintesi vocale locale, frase di test senza dati personali", expected: "Richiama il cliente domani alle dieci.", transcript: text, matched, audioBytes: bytes.length };
  await writeFile("docs/FUNZIONALITA-2026-09-07-trascrizione.json", JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result));
  if (!matched) process.exitCode = 1;
}
main().catch(() => { console.error("Prova di trascrizione non completata. Verificare la configurazione del provider."); process.exitCode = 1; });
