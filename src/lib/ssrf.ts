/**
 * SSRF guard utilities.
 *
 * Server-side fetches toward user-controlled URLs (outgoing webhooks, lead
 * enrichment scraping) must not be allowed to reach internal/loopback/
 * cloud-metadata addresses. These helpers resolve the host via DNS and reject
 * any URL that points at a private/reserved IP range.
 */

import { lookup } from "dns/promises";
import { isIP } from "net";

/** Returns true if the given IPv4/IPv6 string is private, loopback, link-local or otherwise non-public. */
export function isPrivateIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) return isPrivateV4(ip);
  if (v === 6) return isPrivateV6(ip);
  return true; // not a valid IP → treat as unsafe
}

function isPrivateV4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return true;
  const [a, b] = parts as [number, number, number, number];
  if (a === 0) return true;                         // 0.0.0.0/8
  if (a === 10) return true;                        // 10.0.0.0/8 private
  if (a === 127) return true;                       // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true;          // 169.254.0.0/16 link-local (incl. 169.254.169.254 metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
  if (a === 192 && b === 168) return true;          // 192.168.0.0/16 private
  if (a === 192 && b === 0) return true;            // 192.0.0.0/24 IETF protocol assignments
  if (a === 100 && b >= 64 && b <= 127) return true;// 100.64.0.0/10 CGNAT
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 benchmarking
  if (a >= 224) return true;                        // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved
  return false;
}

function isPrivateV6(ip: string): boolean {
  const addr = ip.toLowerCase().split("%")[0]!; // strip zone id
  if (addr === "::1" || addr === "::") return true;       // loopback / unspecified
  if (addr.startsWith("fe80")) return true;               // link-local fe80::/10
  if (addr.startsWith("fc") || addr.startsWith("fd")) return true; // ULA fc00::/7
  // IPv4-mapped (::ffff:a.b.c.d) → check the embedded v4
  const mapped = addr.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateV4(mapped[1]!);
  return false;
}

export type SsrfOptions = {
  /** Require https scheme (default true). */
  requireHttps?: boolean;
};

/**
 * Validates that `rawUrl` is a public http(s) URL whose host resolves only to
 * public IP addresses. Throws an Error if not. Returns the parsed URL.
 */
export async function assertPublicUrl(rawUrl: string, opts: SsrfOptions = {}): Promise<URL> {
  const { requireHttps = true } = opts;

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("URL non valido");
  }

  if (requireHttps) {
    if (url.protocol !== "https:") throw new Error("Solo URL https sono consentiti");
  } else if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Solo URL http/https sono consentiti");
  }

  const host = url.hostname;

  // If host is already a literal IP, validate it directly.
  if (isIP(host)) {
    if (isPrivateIp(host)) throw new Error("URL verso indirizzo IP privato/riservato non consentito");
    return url;
  }

  // Resolve all A/AAAA records; reject if ANY is private (defense in depth).
  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    throw new Error("Risoluzione DNS fallita");
  }
  if (addresses.length === 0) throw new Error("Host non risolvibile");
  for (const { address } of addresses) {
    if (isPrivateIp(address)) {
      throw new Error("URL verso indirizzo interno/privato non consentito");
    }
  }

  return url;
}

/** Boolean variant: true if safe, false otherwise (never throws). */
export async function isPublicUrl(rawUrl: string, opts?: SsrfOptions): Promise<boolean> {
  try {
    await assertPublicUrl(rawUrl, opts);
    return true;
  } catch {
    return false;
  }
}

/**
 * fetch() wrapper that follows redirects manually, re-validating each hop with
 * assertPublicUrl. Prevents redirect-based SSRF (a public URL that 30x-redirects
 * to an internal/metadata address). Use for any fetch toward a user-controlled URL.
 */
export async function safeFetch(
  rawUrl: string,
  init: RequestInit = {},
  opts: SsrfOptions & { maxRedirects?: number } = {},
): Promise<Response> {
  const { maxRedirects = 3, requireHttps = false } = opts;
  let current = rawUrl;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertPublicUrl(current, { requireHttps });
    const res = await fetch(current, { ...init, redirect: "manual" });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return res;
      current = new URL(location, current).toString();
      continue;
    }
    return res;
  }

  throw new Error("Troppi redirect");
}
