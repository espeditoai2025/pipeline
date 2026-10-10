import { createHash } from "crypto";
import { db } from "@/lib/db";
import { CrmError } from "@/lib/crm-transaction";
import { write } from "./crm";
import { assertRefs, assertVersion, jsonRecord, lockOrg, nextVersion, omit } from "./operations";
import type { McpContext } from "./auth";
import type { z } from "zod";
import type * as s from "./schemas";

export async function upsertMcpExternalEvent(
  c: McpContext,
  input: z.infer<typeof s.externalEventWriteSchema>,
) {
  return write(
    c,
    "pipely_upsert_external_event",
    input,
    async (tx) => {
      await lockOrg(tx, c.organizationId);
      await assertRefs(tx, c.organizationId, input);
      const identityKey =
        input.kind === "PCSMAIL"
          ? createHash("sha256")
              .update(
                JSON.stringify([
                  input.source,
                  input.account,
                  input.mailbox,
                  input.uidValidity,
                  input.uid,
                ]),
              )
              .digest("hex")
          : input.kind === "SMS"
            ? createHash("sha256")
                .update(
                  JSON.stringify([
                    input.kind,
                    input.source,
                    input.smsAccountId,
                    input.externalId,
                    input.recipient,
                  ]),
                )
                .digest("hex")
            : null;
      const before = await tx.externalEvent.findFirst({
        where: {
          organizationId: c.organizationId,
          source: input.source,
          externalId: input.externalId,
        },
      });
      if (identityKey) {
        const sameMessage = await tx.externalEvent.findFirst({
          where: {
            organizationId: c.organizationId,
            identityKey,
            ...(before && { id: { not: before.id } }),
          },
        });
        if (sameMessage)
          throw new CrmError(
            `Messaggio già collegato all'evento ${sameMessage.id}; usa il suo ID esterno, nessuna fusione automatica`,
          );
      }
      const fields = omit(input, "requestId", "expectedUpdatedAt", "smsAccountId");
      const data = {
        ...fields,
        ...(input.kind === "SMS" && { account: input.smsAccountId }),
        occurredAt: new Date(input.occurredAt),
        identityKey,
      };
      if (before) {
        if (before.kind !== input.kind || before.identityKey !== identityKey)
          throw new CrmError("L'identità dell'evento non può cambiare");
        if (input.expectedUpdatedAt) assertVersion(before, input.expectedUpdatedAt);
        const unchanged = Object.entries(data).every(([key, value]) => {
          const prev = before[key as keyof typeof before];
          return value instanceof Date
            ? prev instanceof Date && value.getTime() === prev.getTime()
            : value === prev;
        });
        if (unchanged)
          return {
            entityType: "externalEvent",
            id: before.id,
            unchanged: true,
            updatedAt: before.updatedAt.toISOString(),
            record: jsonRecord(before),
          };
        assertVersion(before, input.expectedUpdatedAt);
      } else if (input.expectedUpdatedAt) throw new CrmError("L'evento non esiste ancora");
      const row = before
        ? await tx.externalEvent.update({
            where: { id: before.id },
            data: { ...data, updatedAt: nextVersion(before) },
          })
        : await tx.externalEvent.create({ data: { ...data, organizationId: c.organizationId } });
      await tx.externalEventRevision.create({
        data: { eventId: row.id, snapshot: jsonRecord(row), actorId: c.userId },
      });
      return {
        entityType: "externalEvent",
        id: row.id,
        updatedAt: row.updatedAt.toISOString(),
        record: jsonRecord(row),
      };
    },
    { wakeEffects: false },
  );
}
export async function listMcpExternalEvents(
  c: McpContext,
  input: z.infer<typeof s.externalEventsReadSchema>,
) {
  const where = {
    organizationId: c.organizationId,
    ...(input.source && { source: input.source }),
    ...(input.companyId && { companyId: input.companyId }),
    ...(input.contactId && { contactId: input.contactId }),
    ...(input.kind && { kind: input.kind }),
  };
  const [data, total] = await Promise.all([
    db.externalEvent.findMany({
      where,
      take: input.perPage,
      skip: (input.page - 1) * input.perPage,
      orderBy: [{ occurredAt: "desc" }, { id: "asc" }],
      include: { revisions: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 10 } },
    }),
    db.externalEvent.count({ where }),
  ]);
  return {
    data,
    meta: { total, page: input.page, perPage: input.perPage },
    instructions:
      "Eventi PCSMail, GoBus e SMS deduplicati senza note, attività, webhook o invii. SENT_CONFIRMED attesta l'invio, non la consegna; DELIVERED richiede evidenza del provider SMS. LINK_CLICKED non prova una conversione. Eventi e revoche non modificano consensi o esclusioni: quelle SMS restano nel provider e nel registro del canale, separate dalle email. Per SMS account è l'ID dell'account provider. Solo metadati e riferimenti: niente corpi, allegati, chiavi o dati passeggeri.",
  };
}
