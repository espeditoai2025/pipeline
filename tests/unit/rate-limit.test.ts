import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

// Il limitatore protegge login, registrazione e reset password. Due proprietà
// contano più delle altre: deve bloccare oltre la soglia, e non deve mai far
// cadere la richiesta se Redis non risponde (altrimenti un guasto del
// limitatore renderebbe inaccessibile l'autenticazione).
const state = vi.hoisted(() => ({
  calls: [] as Array<{ prefix: string; id: string }>,
  behaviour: "allow" as "allow" | "deny" | "throw",
  logs: [] as string[],
}));

vi.mock("@upstash/redis", () => ({ Redis: class { constructor(_: unknown) {} } }));
vi.mock("@upstash/ratelimit", () => {
  class Ratelimit {
    prefix: string;
    constructor(opts: { prefix: string }) { this.prefix = opts.prefix; }
    static slidingWindow = (n: number, w: string) => ({ n, w });
    async limit(id: string) {
      state.calls.push({ prefix: this.prefix, id });
      if (state.behaviour === "throw") throw new Error("ECONNREFUSED");
      return { success: state.behaviour === "allow", remaining: 0, reset: Date.now() + 30_000 };
    }
  }
  return { Ratelimit };
});
vi.mock("@/lib/logger", () => ({
  logger: { error: (_m: string, msg: string) => state.logs.push(msg), warn: () => {}, info: () => {} },
}));

const req = (ip: string) => ({ headers: new Headers({ "x-forwarded-for": `${ip}, 10.0.0.1` }) }) as unknown as NextRequest;

beforeEach(() => {
  vi.resetModules();
  state.calls = [];
  state.behaviour = "allow";
  state.logs = [];
  vi.stubEnv("KV_REST_API_URL", "https://redis.esempio.upstash.io");
  vi.stubEnv("KV_REST_API_TOKEN", "token-di-prova");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
});

describe("limitatore di richieste", () => {
  it("si attiva anche con i nomi creati dall'integrazione Vercel (KV_REST_API_*)", async () => {
    const { withAuthRateLimit } = await import("@/lib/rate-limit");
    await expect(withAuthRateLimit(req("1.2.3.4"))).resolves.toBeNull();
    expect(state.calls).toEqual([{ prefix: "pipely:rl:auth", id: "1.2.3.4" }]);
  });

  it("blocca con 429 e indica quando riprovare", async () => {
    state.behaviour = "deny";
    const { withAuthRateLimit } = await import("@/lib/rate-limit");
    const res = await withAuthRateLimit(req("1.2.3.4"));
    expect(res?.status).toBe(429);
    expect(Number(res!.headers.get("Retry-After"))).toBeGreaterThan(0);
    await expect(res!.json()).resolves.toMatchObject({ error: expect.stringMatching(/troppe richieste/i) });
  });

  it("se Redis non risponde lascia passare invece di rompere l'autenticazione", async () => {
    state.behaviour = "throw";
    const { withAuthRateLimit } = await import("@/lib/rate-limit");
    await expect(withAuthRateLimit(req("1.2.3.4"))).resolves.toBeNull();
    expect(state.logs.join(" ")).toMatch(/non raggiungibile \(auth\)/);
  });

  it("usa il primo indirizzo di x-forwarded-for, non l'intera catena di proxy", async () => {
    const { withApiRateLimit } = await import("@/lib/rate-limit");
    await withApiRateLimit(req("203.0.113.9"));
    expect(state.calls[0]).toEqual({ prefix: "pipely:rl:api", id: "203.0.113.9" });
  });

  it("limita le API pubbliche per chiave, non per indirizzo IP (falsificabile)", async () => {
    const { withApiKeyRateLimit } = await import("@/lib/rate-limit");
    await withApiKeyRateLimit("key_abc");
    expect(state.calls[0]).toEqual({ prefix: "pipely:rl:key", id: "key_abc" });
  });

  it("senza credenziali lascia passare e in produzione lo segnala come errore", async () => {
    vi.stubEnv("KV_REST_API_URL", "");
    vi.stubEnv("KV_REST_API_TOKEN", "");
    vi.stubEnv("NODE_ENV", "production");
    const { withAuthRateLimit } = await import("@/lib/rate-limit");
    await expect(withAuthRateLimit(req("1.2.3.4"))).resolves.toBeNull();
    expect(state.calls).toHaveLength(0);
    expect(state.logs.join(" ")).toMatch(/rate limiting DISATTIVO/);
  });
});
