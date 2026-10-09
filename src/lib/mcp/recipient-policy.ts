import type { z } from "zod";
import { db } from "@/lib/db";
import { CrmError } from "@/lib/crm-transaction";
import type { Prisma } from "@/generated/prisma/client";
import type { McpContext } from "./auth";
import type { recipientPolicyReadSchema, recipientPolicyWriteSchema } from "./schemas";
import { write } from "./crm";

export async function getMcpRecipientPolicy(
  context: McpContext,
  input: z.infer<typeof recipientPolicyReadSchema>,
) {
  return {
    policy: await db.recipientPolicy.findUnique({
      where: {
        organizationId_address: { organizationId: context.organizationId, address: input.address },
      },
      include: { events: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 30 } },
    }),
    instructions:
      "Nessuna esclusione registrata non prova il consenso. Non contattare e sospensione bloccano campagne e workflow; gli invii manuali restano disponibili. Un rimbalzo permanente blocca ogni invio al recapito. CLEARED non rappresenta un consenso e non reiscrive alle liste.",
  };
}

export async function setMcpRecipientPolicy(
  context: McpContext,
  input: z.infer<typeof recipientPolicyWriteSchema>,
) {
  return write(
    context,
    "pipely_set_recipient_policy",
    input,
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${context.organizationId} FOR UPDATE`;
      if (new Date(input.effectiveAt).getTime() > Date.now() + 60_000)
        throw new CrmError("La data dello stato non può essere futura");
      const key = { organizationId: context.organizationId, address: input.address };
      const before = await tx.recipientPolicy.findUnique({
        where: { organizationId_address: key },
      });
      if (
        before &&
        (!input.expectedUpdatedAt ||
          before.updatedAt.getTime() !== new Date(input.expectedUpdatedAt).getTime())
      )
        throw new CrmError("Lo stato del recapito è cambiato: rileggilo prima di modificarlo");
      if (!before && input.expectedUpdatedAt)
        throw new CrmError("Stato del recapito non disponibile");
      const state = {
        status: input.status,
        reason: input.reason,
        source: input.source,
        effectiveAt: new Date(input.effectiveAt),
        suspendedUntil: input.suspendedUntil ? new Date(input.suspendedUntil) : null,
        verification: input.verification ?? null,
      };
      const policy = await tx.recipientPolicy.upsert({
        where: { organizationId_address: key },
        create: { ...key, ...state },
        update: {
          ...state,
          updatedAt: new Date(Math.max(Date.now(), (before?.updatedAt.getTime() ?? 0) + 1)),
        },
      });
      await tx.recipientPolicyEvent.create({
        data: { policyId: policy.id, ...state, actorId: context.userId },
      });
      return {
        id: policy.id,
        entityType: "recipient_policy",
        updatedAt: policy.updatedAt.toISOString(),
        record: JSON.parse(JSON.stringify(policy)) as Prisma.InputJsonObject,
      };
    },
    { wakeEffects: false },
  );
}
