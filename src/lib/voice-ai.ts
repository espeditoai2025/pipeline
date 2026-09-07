import { db } from "@/lib/db";
import { CrmError } from "@/lib/crm-transaction";
import { todayInItaly } from "@/lib/invoice-utils";
import { checkFeature } from "@/lib/plan";
import { voiceMimeTypes } from "@/lib/voice";

export async function reserveVoiceAi(orgId: string) {
  const plan = await db.organization.findUniqueOrThrow({ where: { id: orgId }, select: { plan: true } });
  const error = checkFeature(plan.plan, "ai"); if (error) throw new CrmError(error);
  // One atomic increment, shared by transcription and command interpretation.
  const rows = await db.$queryRaw<{ calls: number }[]>`
    INSERT INTO "AiUsageDay" ("organizationId", "day", "calls") VALUES (${orgId}, ${todayInItaly()}, 1)
    ON CONFLICT ("organizationId", "day") DO UPDATE SET "calls" = "AiUsageDay"."calls" + 1
    WHERE "AiUsageDay"."calls" < 50 RETURNING "calls"
  `;
  if (!rows.length) throw new CrmError("Raggiunte le 50 elaborazioni giornaliere per trascrizioni e comandi. Riprova domani.");
}

export async function transcribeAudio(audio: Uint8Array, mimeType: string) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new CrmError("Trascrizione non configurata. La nota resta salvata e puoi scrivere il testo manualmente.");
  const form = new FormData();
  form.set("file", new Blob([new Uint8Array(audio)], { type: mimeType }), "nota." + voiceMimeTypes[mimeType]);
  form.set("model", process.env.OPENROUTER_TRANSCRIPTION_MODEL || "openai/whisper-large-v3");
  form.set("language", "it");
  form.set("response_format", "json");
  let response: Response;
  try { response = await fetch("https://openrouter.ai/api/v1/audio/transcriptions", { method: "POST", headers: { Authorization: "Bearer " + key }, body: form, signal: AbortSignal.timeout(60000), cache: "no-store", redirect: "error" }); }
  catch { throw new CrmError("Trascrizione non completata. La registrazione è al sicuro: riprova più tardi."); }
  if (!response.ok) throw new CrmError("Servizio di trascrizione non disponibile (" + response.status + "). La nota resta salvata.");
  const result = await response.json();
  if (typeof result.text !== "string" || !result.text.trim() || result.text.length > 12000) throw new CrmError("Nessun testo utilizzabile riconosciuto. Ascolta la nota o riprova.");
  return result.text.trim();
}
