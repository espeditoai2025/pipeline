const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Defaults: an empty env var counts as unset, so a blank OPENROUTER_MODEL never reaches the API.
// Assistant and email drafts: multilingual, cheap, current on OpenRouter. Override with OPENROUTER_MODEL.
export const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || "google/gemini-3.8-flash";
// Lead Finder needs a web-search model. Override with OPENROUTER_MODEL_LEADFINDER.
export const LEADFINDER_MODEL = process.env.OPENROUTER_MODEL_LEADFINDER || "perplexity/sonar";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type ReasoningEffort = "minimal" | "low" | "medium" | "high";

export type ChatOptions = {
  maxTokens?: number;
  temperature?: number;
  model?: string;
  /** Per-attempt timeout; web-search models can take a minute on large batches. */
  timeoutMs?: number;
  /** Extra attempts after the first one, used only for rate limits, 5xx and network errors. */
  retries?: number;
  /**
   * Thinking budget for reasoning models. Their hidden reasoning counts against max_tokens: at the
   * default effort Gemini Flash spent 2000+ tokens thinking about a 17-row scoring task and the visible
   * JSON was cut off. "low" keeps structured tasks complete and cheap; models without reasoning ignore it.
   */
  reasoningEffort?: ReasoningEffort;
};

type OpenRouterResponse = {
  choices?: { message?: { content?: string }; finish_reason?: string }[];
  usage?: { completion_tokens?: number; completion_tokens_details?: { reasoning_tokens?: number } };
  error?: { message?: string; code?: number | string };
};

export class OpenRouterError extends Error {
  constructor(message: string, readonly status: number | null, readonly retryable: boolean) {
    super(message);
    this.name = "OpenRouterError";
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function chatCompletion(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY non configurata");

  const model = options?.model ?? DEFAULT_MODEL;
  const maxTokens = options?.maxTokens ?? 600;
  const body = JSON.stringify({
    model,
    messages,
    max_tokens: maxTokens,
    temperature: options?.temperature ?? 0.7,
    reasoning: { effort: options?.reasoningEffort ?? "low" },
  });
  const attempts = 1 + Math.max(0, options?.retries ?? 1);
  const timeoutMs = options?.timeoutMs ?? 60_000;

  let lastError: OpenRouterError | null = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) await sleep(600 * 2 ** (attempt - 1));
    try {
      const res = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://pipely.app",
          "X-Title": "Pipely CRM",
        },
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });
      const text = await res.text();
      let json: OpenRouterResponse | null = null;
      try { json = JSON.parse(text) as OpenRouterResponse; } catch { json = null; }

      if (res.ok && json && !json.error) {
        const choice = json.choices?.[0];
        if (choice?.finish_reason === "length") {
          const reasoning = json.usage?.completion_tokens_details?.reasoning_tokens ?? 0;
          console.warn(`[openrouter] risposta di ${model} troncata a ${maxTokens} token (${reasoning} di ragionamento): alza maxTokens o riduci il lotto`);
        }
        return choice?.message?.content?.trim() ?? "";
      }

      const message = json?.error?.message ?? `OpenRouter error ${res.status}`;
      lastError = new OpenRouterError(message, res.status, res.status === 429 || res.status >= 500);
    } catch (err) {
      if (err instanceof OpenRouterError) throw err;
      const reason = err instanceof Error ? err.message : String(err);
      const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
      lastError = new OpenRouterError(timedOut ? `OpenRouter: nessuna risposta entro ${Math.round(timeoutMs / 1000)}s` : `OpenRouter: ${reason}`, null, true);
    }
    if (!lastError.retryable) throw lastError;
  }
  throw lastError ?? new Error("OpenRouter: errore sconosciuto");
}
