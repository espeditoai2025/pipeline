import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export type ApiContext = {
  organizationId: string;
  apiKeyId: string;
};

function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Authenticate an API request using Bearer token (API key).
 * Returns the org context or a 401 JSON response.
 */
export async function authenticateApiKey(
  req: NextRequest,
): Promise<ApiContext | NextResponse> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header. Use: Bearer <api_key>" },
      { status: 401 },
    );
  }

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey.startsWith("pip_live_")) {
    return NextResponse.json(
      { error: "Invalid API key format" },
      { status: 401 },
    );
  }

  const keyHash = hashKey(rawKey);
  const apiKey = await db.apiKey.findUnique({
    where: { keyHash },
    select: { id: true, organizationId: true, expiresAt: true },
  });

  if (!apiKey) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return NextResponse.json({ error: "API key expired" }, { status: 401 });
  }

  // Update lastUsedAt (fire-and-forget)
  db.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return {
    organizationId: apiKey.organizationId,
    apiKeyId: apiKey.id,
  };
}

/** Helper: parse pagination params */
export function parsePagination(req: NextRequest): { page: number; perPage: number; skip: number } {
  const url = req.nextUrl;
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("per_page")) || 25));
  return { page, perPage, skip: (page - 1) * perPage };
}
