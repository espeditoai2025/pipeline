/**
 * Rate limiting via Upstash Redis.
 * Falls back silently (allow-all) if UPSTASH_REDIS_REST_URL is not set,
 * so the app works locally without Redis configured.
 */

import { NextRequest, NextResponse } from "next/server";

type RateLimiter = {
  limit: (identifier: string) => Promise<{ success: boolean; remaining: number; reset: number }>;
};

// Lazy-init so we don't crash at import time if env vars are missing.
let _authLimiter: RateLimiter | null = null;
let _apiLimiter: RateLimiter | null = null;
let _initialized = false;

async function getLimiters(): Promise<{ auth: RateLimiter; api: RateLimiter }> {
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
      } catch {
        // Redis unavailable — fail open
      }
    }
  }

  const noop: RateLimiter = {
    limit: async () => ({ success: true, remaining: 999, reset: 0 }),
  };

  return { auth: _authLimiter ?? noop, api: _apiLimiter ?? noop };
}

/** Returns the real client IP from Vercel/proxy headers. */
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

/** Applies auth rate limit. Returns a 429 response if exceeded, else null. */
export async function withAuthRateLimit(
  req: NextRequest,
): Promise<NextResponse | null> {
  const { auth } = await getLimiters();
  const ip = getClientIp(req);
  const { success, remaining, reset } = await auth.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: "Troppe richieste. Riprova tra qualche minuto." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  return null; // not limited
}

/** Applies general API rate limit. */
export async function withApiRateLimit(
  req: NextRequest,
): Promise<NextResponse | null> {
  const { api } = await getLimiters();
  const ip = getClientIp(req);
  const { success, remaining, reset } = await api.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: "Limite richieste raggiunto. Riprova tra qualche minuto." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  return null;
}
