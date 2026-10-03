import { createMcpHandler } from "@modelcontextprotocol/server";
import { NextRequest, NextResponse } from "next/server";
import { authenticateMcpToken } from "./auth";
import { createPipelyMcpServer } from "./server";
import { logger } from "@/lib/logger";

const MAX_BODY = 64 * 1024;
function allowedOrigins() {
  const values = [
    "https://www.pipely.it",
    "https://pipely.it",
    process.env.AUTH_URL,
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    ...(process.env.MCP_ALLOWED_ORIGINS ?? "").split(","),
  ];
  if (process.env.NODE_ENV !== "production")
    values.push("http://localhost:3000", "http://127.0.0.1:3000");
  return new Set(
    values.filter(Boolean).flatMap((value) => {
      try {
        const url = new URL(value!.trim());
        return url.protocol === "https:" ||
          (process.env.NODE_ENV !== "production" &&
            ["localhost", "127.0.0.1"].includes(url.hostname))
          ? [url.origin]
          : [];
      } catch {
        return [];
      }
    }),
  );
}
function checkOrigin(req: NextRequest): boolean {
  const allowed = allowedOrigins();
  const origin = req.headers.get("origin");
  if (origin && !allowed.has(origin)) return false;
  const host = req.headers.get("host") ?? new URL(req.url).host;
  return [...allowed].some((value) => new URL(value).host === host);
}
function finish(req: NextRequest, response: Response): Response {
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Vary", "Origin");
  const origin = req.headers.get("origin");
  if (origin && allowedOrigins().has(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set(
      "Access-Control-Expose-Headers",
      "WWW-Authenticate, Retry-After, MCP-Protocol-Version",
    );
  }
  return response;
}
async function readBody(req: NextRequest) {
  const length = Number(req.headers.get("content-length"));
  if (length > MAX_BODY) throw new RangeError("body too large");
  if (!req.body) return new Uint8Array();
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY) {
        await reader.cancel();
        throw new RangeError("body too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}
export async function handleMcpRequest(req: NextRequest): Promise<Response> {
  if (!checkOrigin(req))
    return finish(
      req,
      NextResponse.json({ error: "Host o Origin non consentito" }, { status: 403 }),
    );
  if (req.method === "OPTIONS")
    return finish(
      req,
      new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
          "Access-Control-Allow-Headers":
            "Authorization, Content-Type, Accept, MCP-Protocol-Version, Mcp-Method, Mcp-Name, Mcp-Session-Id, Last-Event-ID",
          "Access-Control-Max-Age": "600",
        },
      }),
    );
  try {
    const context = await authenticateMcpToken(req);
    if (context instanceof NextResponse) return finish(req, context);
    if (req.method !== "POST")
      return finish(req, new Response(null, { status: 405, headers: { Allow: "POST, OPTIONS" } }));
    const bytes = await readBody(req);
    // A single call per HTTP request keeps the per-key limit meaningful.
    try {
      if (Array.isArray(JSON.parse(new TextDecoder().decode(bytes))))
        return finish(
          req,
          NextResponse.json({ error: "Invia una sola richiesta MCP per volta" }, { status: 400 }),
        );
    } catch {
      /* The SDK returns the protocol's parse error. */
    }
    const boundedRequest = new Request(req.url, {
      method: "POST",
      headers: req.headers,
      body: bytes,
    });
    const handler = createMcpHandler(() => createPipelyMcpServer(context));
    try {
      return finish(req, await handler.fetch(boundedRequest));
    } finally {
      await handler.close();
    }
  } catch (error) {
    if (error instanceof RangeError)
      return finish(
        req,
        NextResponse.json({ error: "Richiesta troppo grande (massimo 64 KB)" }, { status: 413 }),
      );
    logger.error("mcp", "Richiesta MCP non completata", {
      errorType: error instanceof Error ? error.name : "unknown",
    });
    return finish(
      req,
      NextResponse.json({ error: "Servizio temporaneamente non disponibile" }, { status: 500 }),
    );
  }
}
