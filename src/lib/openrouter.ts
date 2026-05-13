const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Default: cheap & multilingual. Override with OPENROUTER_MODEL env var.
export const DEFAULT_MODEL = process.env.OPENROUTER_MODEL ?? "google/gemini-flash-1.5-8b";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type OpenRouterResponse = {
  choices: { message: { content: string } }[];
  error?: { message: string };
};

export async function chatCompletion(
  messages: ChatMessage[],
  options?: { maxTokens?: number; temperature?: number; model?: string }
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY non configurata");

  const res = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://pipely.app",
      "X-Title": "Pipely CRM",
    },
    body: JSON.stringify({
      model: options?.model ?? DEFAULT_MODEL,
      messages,
      max_tokens: options?.maxTokens ?? 600,
      temperature: options?.temperature ?? 0.7,
    }),
  });

  const json = (await res.json()) as OpenRouterResponse;

  if (!res.ok || json.error) {
    throw new Error(json.error?.message ?? `OpenRouter error ${res.status}`);
  }

  return json.choices[0]?.message?.content?.trim() ?? "";
}
