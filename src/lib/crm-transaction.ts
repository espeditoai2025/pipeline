import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { checkContactLimit, checkPipelineLimit } from "@/lib/plan";

export class CrmError extends Error {}

function isTransactionConflict(error: unknown) {
  const failure = error as {
    code?: string;
    meta?: { code?: string; driverAdapterError?: { cause?: { originalCode?: string } } };
  } | null;
  if (failure?.code === "P2034") return true;
  // Prisma's PostgreSQL adapter wraps conflicts from $queryRaw (including
  // SELECT FOR UPDATE) in P2010 instead of P2034. Retry the whole transaction.
  const sqlState = failure?.meta?.code ?? failure?.meta?.driverAdapterError?.cause?.originalCode;
  return failure?.code === "P2010" && (sqlState === "40001" || sqlState === "40P01");
}

/** Count, validate and write within one serializable transaction; retry serialization conflicts. */
export async function crmTransaction<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(work, { isolationLevel: "Serializable", timeout: 30000 });
    } catch (error) {
      if (attempt < 2 && isTransactionConflict(error)) continue;
      throw error;
    }
  }
}

export async function assertContactCapacity(
  tx: Prisma.TransactionClient,
  orgId: string,
  adding = 1,
) {
  const org = await tx.organization.findUnique({ where: { id: orgId }, select: { plan: true } });
  if (!org) throw new CrmError("Organizzazione non disponibile");
  const count = await tx.contact.count({ where: { organizationId: orgId } });
  const error = checkContactLimit(org.plan, count, adding);
  if (error) throw new CrmError(error);
}

export async function assertPipelineCapacity(tx: Prisma.TransactionClient, orgId: string) {
  const org = await tx.organization.findUnique({ where: { id: orgId }, select: { plan: true } });
  if (!org) throw new CrmError("Organizzazione non disponibile");
  const count = await tx.pipeline.count({ where: { organizationId: orgId } });
  const error = checkPipelineLimit(org.plan, count);
  if (error) throw new CrmError(error);
  return count;
}
