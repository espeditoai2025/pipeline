import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withApiKeyRateLimit, withAuthRateLimit } from "@/lib/rate-limit";
import { CrmError } from "@/lib/crm-transaction";
import type { Prisma } from "@/generated/prisma/client";

export type McpContext = {
  organizationId: string;
  tokenId: string;
  userId: string;
  canWrite: boolean;
};
export const hashMcpKey = (key: string) => createHash("sha256").update(key).digest("hex");

export async function authenticateMcpToken(req: NextRequest): Promise<McpContext | NextResponse> {
  const raw = /^Bearer (pip_mcp_[a-f0-9]{64})$/i.exec(req.headers.get("authorization") ?? "")?.[1];
  const token = raw
    ? await db.mcpToken.findUnique({
        where: { keyHash: hashMcpKey(raw) },
        include: { creator: { select: { id: true, role: true, organizationId: true } } },
      })
    : null;
  if (!token || token.revokedAt || token.expiresAt <= new Date()) {
    const limited = await withAuthRateLimit(req);
    return (
      limited ??
      NextResponse.json(
        { error: "Chiave MCP assente, scaduta o revocata" },
        { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="Pipely MCP"' } },
      )
    );
  }
  if (
    token.creator.organizationId !== token.organizationId ||
    !["OWNER", "ADMIN"].includes(token.creator.role)
  ) {
    return NextResponse.json(
      { error: "Permessi del creatore della chiave revocati" },
      { status: 403 },
    );
  }
  const limited = await withApiKeyRateLimit("mcp:" + token.id);
  if (limited) return limited;
  await db.mcpToken.updateMany({
    where: { id: token.id, revokedAt: null },
    data: { lastUsedAt: new Date() },
  });
  return {
    organizationId: token.organizationId,
    tokenId: token.id,
    userId: token.createdBy,
    canWrite: token.canWrite,
  };
}

/** Lock the credential before deduplication and recheck live permissions in the write transaction. */
export async function assertMcpWrite(tx: Prisma.TransactionClient, context: McpContext) {
  await tx.$queryRaw`SELECT id FROM "McpToken" WHERE id = ${context.tokenId} FOR UPDATE`;
  const token = await tx.mcpToken.findUnique({
    where: { id: context.tokenId },
    include: { creator: { select: { role: true, organizationId: true } } },
  });
  if (
    !token ||
    !token.canWrite ||
    token.revokedAt ||
    token.expiresAt <= new Date() ||
    token.organizationId !== context.organizationId ||
    token.createdBy !== context.userId ||
    token.creator.organizationId !== context.organizationId ||
    !["OWNER", "ADMIN"].includes(token.creator.role)
  ) {
    throw new CrmError(
      "La chiave non autorizza questa scrittura. Verifica scadenza, revoca e permessi.",
    );
  }
}
