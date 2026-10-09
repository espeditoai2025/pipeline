import type { Prisma } from "@/generated/prisma/client";
import { CrmError } from "@/lib/crm-transaction";

/** Shared by the UI and MCP: repeated completion preserves the timestamp and audit history. */
export async function completeActivityRecord(
  tx: Prisma.TransactionClient,
  organizationId: string,
  id: string,
  actorId: string,
) {
  const before = await tx.activity.findFirst({ where: { id, organizationId } });
  if (!before) throw new CrmError("Attività non disponibile nella tua organizzazione");
  if (before.completedAt) return { row: before, alreadyCompleted: true };
  const completedAt = new Date();
  const row = await tx.activity.update({
    where: { id, organizationId },
    data: {
      completedAt,
      firstCompletedAt: before.firstCompletedAt ?? completedAt,
      updatedAt: new Date(Math.max(Date.now(), before.updatedAt.getTime() + 1)),
    },
  });
  await tx.activityEvent.create({
    data: { activityId: id, action: "COMPLETED", actorId, completedAt },
  });
  return { row, alreadyCompleted: false };
}
