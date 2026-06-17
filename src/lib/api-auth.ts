import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withApiKeyRateLimit } from "@/lib/rate-limit";

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

  // Per-key rate limit (keyed by API key id, not the spoofable client IP).
  const limited = await withApiKeyRateLimit(apiKey.id);
  if (limited) return limited;

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

/**
 * Verifies that a set of foreign-key ids all belong to the given organization,
 * preventing cross-tenant FK injection (M1) from API request bodies.
 * Returns a 422 NextResponse if any id is invalid/foreign, else null.
 */
export async function validateOrgForeignKeys(
  organizationId: string,
  refs: {
    contactId?: string | null;
    companyId?: string | null;
    ownerId?: string | null;
    pipelineId?: string | null;
    stageId?: string | null;
  },
): Promise<NextResponse | null> {
  const checks: Promise<{ ok: boolean; field: string }>[] = [];

  if (refs.contactId) checks.push(db.contact.findFirst({ where: { id: refs.contactId, organizationId }, select: { id: true } }).then((r) => ({ ok: !!r, field: "contactId" })));
  if (refs.companyId) checks.push(db.company.findFirst({ where: { id: refs.companyId, organizationId }, select: { id: true } }).then((r) => ({ ok: !!r, field: "companyId" })));
  if (refs.ownerId) checks.push(db.user.findFirst({ where: { id: refs.ownerId, organizationId }, select: { id: true } }).then((r) => ({ ok: !!r, field: "ownerId" })));
  if (refs.pipelineId) checks.push(db.pipeline.findFirst({ where: { id: refs.pipelineId, organizationId }, select: { id: true } }).then((r) => ({ ok: !!r, field: "pipelineId" })));
  if (refs.stageId) checks.push(db.stage.findFirst({ where: { id: refs.stageId, pipeline: { organizationId } }, select: { id: true } }).then((r) => ({ ok: !!r, field: "stageId" })));

  const results = await Promise.all(checks);
  const invalid = results.find((r) => !r.ok);
  if (invalid) {
    return NextResponse.json({ error: `Invalid ${invalid.field}: not found in your organization` }, { status: 422 });
  }
  return null;
}

/** Helper: parse pagination params */
export function parsePagination(req: NextRequest): { page: number; perPage: number; skip: number } {
  const url = req.nextUrl;
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("per_page")) || 25));
  return { page, perPage, skip: (page - 1) * perPage };
}
