"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { crmPermissionError } from "@/lib/crm-permissions";
import { crmTransaction, CrmError } from "@/lib/crm-transaction";
import { db } from "@/lib/db";
import { hashMcpKey } from "@/lib/mcp/auth";
import { createTokenSchema } from "@/lib/mcp/schemas";
import type { z } from "zod";

export type McpSettingsData = {
  tokens: {
    id: string;
    name: string;
    prefix: string;
    canWrite: boolean;
    createdAt: string;
    expiresAt: string;
    revokedAt: string | null;
    lastUsedAt: string | null;
  }[];
  operations: {
    id: string;
    tokenName: string;
    tool: string;
    requestId: string;
    createdAt: string;
    result: { id: string; entityType: string };
  }[];
};
async function manager() {
  const session = await auth();
  const user = session?.user as { id?: string; organizationId?: string } | undefined;
  if (!user?.id || !user.organizationId || (await crmPermissionError(session, "integrations")))
    return null;
  return { organizationId: user.organizationId, userId: user.id };
}
export async function getMcpSettings(): Promise<{ data: McpSettingsData | null; error?: string }> {
  const context = await manager();
  if (!context)
    return {
      data: null,
      error: "Solo proprietari e amministratori possono gestire le connessioni MCP.",
    };
  const [tokens, operations] = await Promise.all([
    db.mcpToken.findMany({
      where: { organizationId: context.organizationId },
      orderBy: [
        { revokedAt: { sort: "asc", nulls: "first" } },
        { expiresAt: "desc" },
        { createdAt: "desc" },
      ],
      take: 100,
      select: {
        id: true,
        name: true,
        prefix: true,
        canWrite: true,
        createdAt: true,
        expiresAt: true,
        revokedAt: true,
        lastUsedAt: true,
      },
    }),
    db.mcpOperation.findMany({
      where: { organizationId: context.organizationId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        tool: true,
        requestId: true,
        result: true,
        createdAt: true,
        token: { select: { name: true } },
      },
    }),
  ]);
  return {
    data: {
      tokens: tokens.map((token) => ({
        ...token,
        createdAt: token.createdAt.toISOString(),
        expiresAt: token.expiresAt.toISOString(),
        revokedAt: token.revokedAt?.toISOString() ?? null,
        lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
      })),
      operations: operations.map((operation) => ({
        id: operation.id,
        tokenName: operation.token.name,
        tool: operation.tool,
        requestId: operation.requestId,
        createdAt: operation.createdAt.toISOString(),
        result: operation.result as { id: string; entityType: string },
      })),
    },
  };
}
export async function createMcpToken(
  input: z.input<typeof createTokenSchema>,
): Promise<{ key?: string; error?: string }> {
  const context = await manager();
  if (!context) return { error: "Non autorizzato" };
  const parsed = createTokenSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  const raw = `pip_mcp_${randomBytes(32).toString("hex")}`;
  try {
    await crmTransaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${context.organizationId} FOR UPDATE`;
      const creator = await tx.user.findFirst({
        where: {
          id: context.userId,
          organizationId: context.organizationId,
          role: { in: ["OWNER", "ADMIN"] },
        },
        select: { id: true },
      });
      if (!creator) throw new CrmError("Non autorizzato");
      const count = await tx.mcpToken.count({
        where: {
          organizationId: context.organizationId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      if (count >= 10)
        throw new CrmError(
          "Hai già 10 connessioni MCP attive. Revoca una chiave prima di crearne un'altra.",
        );
      await tx.mcpToken.create({
        data: {
          name: parsed.data.name,
          canWrite: parsed.data.canWrite,
          expiresAt: new Date(Date.now() + parsed.data.expiresInDays * 86400000),
          keyHash: hashMcpKey(raw),
          prefix: raw.slice(0, 16),
          organizationId: context.organizationId,
          createdBy: context.userId,
        },
      });
    });
    revalidatePath("/settings/mcp");
    return { key: raw };
  } catch (error) {
    return {
      error: error instanceof CrmError ? error.message : "Impossibile creare la chiave MCP",
    };
  }
}
export async function revokeMcpToken(id: string): Promise<{ error?: string }> {
  const context = await manager();
  if (!context || typeof id !== "string" || !id || id.length > 128)
    return { error: "Non autorizzato" };
  const revoked = await db.mcpToken.updateMany({
    where: { id, organizationId: context.organizationId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (!revoked.count) return { error: "Chiave non disponibile o già revocata" };
  revalidatePath("/settings/mcp");
  return {};
}
