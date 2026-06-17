/**
 * Rate limiting via Upstash Redis.
 *
 * If UPSTASH_REDIS_REST_URL/TOKEN are not configured the limiter falls back to
 * allow-all so local development works without Redis — but in PRODUCTION this
 * fallback is logged loudly (fail-loud) so a misconfiguration that silently
 * disables throttling on auth/API endpoints is visible.
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

type RateLimiter = {
  limit: (identifier: string) => Promise<{ success: boolean; remaining: number; reset: number }>;
};

// Lazy-init so we don't crash at import time if env vars are missing.
let _authLimiter: RateLimiter | null = null;
let _apiLimiter: RateLimiter | null = null;
let _keyLimiter: RateLimiter | null = null;
let _initialized = false;
let _warnedNoRedis = false;

async function getLimiters(): Promise<{ auth: RateLimiter; api: RateLimiter; key: RateLimiter }> {
  if (!_initialized) {
    _initialized = true;
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (url && token) {
      try {
        const { Redis } = await import("@upstash/redis");
        const { Ratelimit } = await import("@upstash/ratelimit");
        const redis = new Redis({ url, token });

        // Auth endpoints: 10 requests per minute per IP
        _authLimiter = new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(10, "1 m"),
          prefix: "pipely:rl:auth",
        });

        // General API: 60 requests per minute per IP
        _apiLimiter = new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(60, "1 m"),
          prefix: "pipely:rl:api",
        });

        // Public REST API (per API key): 120 requests per minute
        _keyLimiter = new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(120, "1 m"),
          prefix: "pipely:rl:key",
        });
      } catch (err) {
        logger.error("rate-limit", "Inizializzazione Upstash fallita: rate limiting disattivato", { error: String(err) });
      }
    }
  }

  if ((!_authLimiter || !_apiLimiter) && !_warnedNoRedis) {
    _warnedNoRedis = true;
    if (process.env.NODE_ENV === "production") {
      logger.error("rate-limit", "UPSTASH non configurato in produzione: rate limiting DISATTIVO su auth/API (fail-open)");
    }
  }

  const noop: RateLimiter = {
    limit: async () => ({ success: true, remaining: 999, reset: 0 }),
  };

  return { auth: _authLimiter ?? noop, api: _apiLimiter ?? noop, key: _keyLimiter ?? noop };
}

/** Returns the real client IP from Vercel/proxy headers. */
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function tooMany(message: string, reset: number): NextResponse {
  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, Math.ceil((reset - Date.now()) / 1000))),
        "X-RateLimit-Remaining": "0",
      },
    },
  );
}

/** Applies auth rate limit (per IP). Returns a 429 response if exceeded, else null. */
export async function withAuthRateLimit(req: NextRequest): Promise<NextResponse | null> {
  const { auth } = await getLimiters();
  const { success, reset } = await auth.limit(getClientIp(req));
  if (!success) return tooMany("Troppe richieste. Riprova tra qualche minuto.", reset);
  return null;
}

/** Applies general API rate limit (per IP). */
export async function withApiRateLimit(req: NextRequest): Promise<NextResponse | null> {
  const { api } = await getLimiters();
  const { success, reset } = await api.limit(getClientIp(req));
  if (!success) return tooMany("Limite richieste raggiunto. Riprova tra qualche minuto.", reset);
  return null;
}

/**
 * Applies the public REST API rate limit keyed by API key id (not IP, which is
 * spoofable). Returns a 429 response if exceeded, else null.
 */
export async function withApiKeyRateLimit(apiKeyId: string): Promise<NextResponse | null> {
  const { key } = await getLimiters();
  const { success, reset } = await key.limit(apiKeyId);
  if (!success) return tooMany("Limite richieste API raggiunto. Riprova tra poco.", reset);
  return null;
}
