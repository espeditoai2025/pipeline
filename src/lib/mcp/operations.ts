import { db } from "@/lib/db";
import { CrmError, assertPipelineCapacity } from "@/lib/crm-transaction";
import { validateCrmReferences } from "@/lib/crm-references";
import type { Prisma } from "@/generated/prisma/client";
import type { McpContext } from "./auth";
import { write } from "./crm";
import { z } from "zod";
import type * as s from "./schemas";

export const jsonRecord = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonObject;
export function omit<T extends object, K extends keyof T>(value: T, ...keys: K[]): Omit<T, K> {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !keys.includes(key as K)),
  ) as Omit<T, K>;
}
export function assertVersion(before: { updatedAt: Date }, expected?: string) {
  if (!expected || before.updatedAt.getTime() !== new Date(expected).getTime())
    throw new CrmError("Versione obsoleta o assente: rileggi il record prima della modifica");
}
export const nextVersion = (before: { updatedAt: Date }) =>
  new Date(Math.max(Date.now(), before.updatedAt.getTime() + 1));
export async function lockOrg(tx: Prisma.TransactionClient, orgId: string) {
  await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${orgId} FOR UPDATE`;
}
export async function assertRefs(
  tx: Prisma.TransactionClient,
  org: string,
  refs: Parameters<typeof validateCrmReferences>[1],
) {
  const error = await validateCrmReferences(org, refs, tx);
  if (error) throw new CrmError(error);
}

export async function updateMcpActivity(
  c: McpContext,
  input: z.infer<typeof s.updateActivitySchema>,
) {
  return write(
    c,
    "pipely_update_activity",
    input,
    async (tx) => {
      const before = await tx.activity.findFirst({
        where: { id: input.id, organizationId: c.organizationId },
      });
      if (!before) throw new CrmError("Attività non disponibile");
      assertVersion(before, input.expectedUpdatedAt);
      await assertRefs(tx, c.organizationId, input);
      const { dueDate, ...fields } = omit(input, "requestId", "id", "expectedUpdatedAt");
      const row = await tx.activity.update({
        where: { id: before.id },
        data: {
          ...fields,
          ...(dueDate !== undefined && {
            dueDate: dueDate ? new Date(dueDate) : null,
            workflowOverdueAt: null,
          }),
          updatedAt: nextVersion(before),
        },
      });
      await tx.activityEvent.create({
        data: { activityId: row.id, action: "UPDATED", actorId: c.userId },
      });
      return {
        entityType: "activity",
        id: row.id,
        updatedAt: row.updatedAt.toISOString(),
        record: jsonRecord(row),
      };
    },
    { wakeEffects: false },
  );
}
export async function reopenMcpActivity(
  c: McpContext,
  input: z.infer<typeof s.reopenActivitySchema>,
) {
  return write(
    c,
    "pipely_reopen_activity",
    input,
    async (tx) => {
      const before = await tx.activity.findFirst({
        where: { id: input.id, organizationId: c.organizationId },
      });
      if (!before) throw new CrmError("Attività non disponibile");
      assertVersion(before, input.expectedUpdatedAt);
      if (!before.completedAt) throw new CrmError("L'attività è già aperta");
      await tx.activityEvent.create({
        data: {
          activityId: before.id,
          action: "REOPENED",
          actorId: c.userId,
          completedAt: before.completedAt,
          reason: input.reason,
        },
      });
      const row = await tx.activity.update({
        where: { id: before.id },
        data: {
          completedAt: null,
          firstCompletedAt: before.firstCompletedAt ?? before.completedAt,
          workflowOverdueAt: null,
          updatedAt: nextVersion(before),
        },
      });
      return {
        entityType: "activity",
        id: row.id,
        updatedAt: row.updatedAt.toISOString(),
        record: jsonRecord(row),
      };
    },
    { wakeEffects: false },
  );
}
export async function listMcpCustomFields(
  c: McpContext,
  input: z.infer<typeof s.customFieldsReadSchema>,
) {
  return {
    fields: await db.customField.findMany({
      where: { organizationId: c.organizationId, entityType: input.entityType },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: 100,
    }),
  };
}
export async function saveMcpCustomField(
  c: McpContext,
  input: z.infer<typeof s.customFieldWriteSchema>,
) {
  return write(
    c,
    "pipely_save_custom_field",
    input,
    async (tx) => {
      await lockOrg(tx, c.organizationId);
      const before = input.id
        ? await tx.customField.findFirst({
            where: { id: input.id, organizationId: c.organizationId },
          })
        : null;
      if (input.id && !before) throw new CrmError("Campo non disponibile");
      if (before) {
        assertVersion(before, input.expectedUpdatedAt);
        if (before.fieldType !== input.fieldType || before.entityType !== input.entityType)
          throw new CrmError("Tipo del campo e tipo di entità non possono cambiare");
        if (input.options && ["select", "multiselect"].includes(before.fieldType)) {
          const values = await tx.customFieldValue.findMany({
            where: { fieldId: before.id },
            select: { value: true },
          });
          if (
            values.some((v) =>
              (before.fieldType === "multiselect"
                ? (JSON.parse(v.value) as string[])
                : [v.value]
              ).some((x) => !input.options!.includes(x)),
            )
          )
            throw new CrmError("Le opzioni rimuoverebbero valori già presenti");
        }
      }
      const duplicate = await tx.customField.findFirst({
        where: {
          organizationId: c.organizationId,
          entityType: input.entityType,
          name: { equals: input.name, mode: "insensitive" },
          ...(before && { id: { not: before.id } }),
        },
      });
      if (duplicate) throw new CrmError("Esiste già un campo con questo nome");
      const data = {
        name: input.name,
        entityType: input.entityType,
        fieldType: input.fieldType,
        options: input.options,
        isRequired: input.isRequired,
      };
      const row = before
        ? await tx.customField.update({
            where: { id: before.id },
            data: { ...data, updatedAt: nextVersion(before) },
          })
        : await tx.customField.create({ data: { ...data, organizationId: c.organizationId } });
      return {
        entityType: "customField",
        id: row.id,
        updatedAt: row.updatedAt.toISOString(),
        record: jsonRecord(row),
      };
    },
    { wakeEffects: false },
  );
}
export async function setMcpCustomValues(
  c: McpContext,
  input: z.infer<typeof s.customValuesWriteSchema>,
) {
  return write(
    c,
    "pipely_set_custom_values",
    input,
    async (tx) => {
      await lockOrg(tx, c.organizationId);
      await assertRefs(tx, c.organizationId, { [`${input.entityType}Id`]: input.id });
      const where = { id: input.id, organizationId: c.organizationId };
      const parent =
        input.entityType === "company"
          ? await tx.company.findFirst({ where })
          : input.entityType === "contact"
            ? await tx.contact.findFirst({ where })
            : await tx.deal.findFirst({ where });
      if (!parent) throw new CrmError("Record non disponibile");
      assertVersion(parent, input.expectedUpdatedAt);
      for (const entry of input.values) {
        const field = await tx.customField.findFirst({
          where: {
            id: entry.fieldId,
            organizationId: c.organizationId,
            entityType: input.entityType,
          },
        });
        if (!field) throw new CrmError("Campo non disponibile per questo tipo di record");
        if (entry.value === null && field.isRequired) throw new CrmError("Il campo è obbligatorio");
        const options = field.options as string[] | null;
        if (entry.value !== null) {
          if (field.fieldType === "boolean" && !["true", "false"].includes(entry.value))
            throw new CrmError("Valore booleano non valido");
          if (field.isRequired && !entry.value.trim())
            throw new CrmError("Il campo è obbligatorio");
          if (
            field.fieldType === "number" &&
            (!entry.value.trim() || !Number.isFinite(Number(entry.value)))
          )
            throw new CrmError("Numero non valido");
          if (field.fieldType === "date" && !z.string().date().safeParse(entry.value).success)
            throw new CrmError("Data non valida");
          if (field.fieldType === "select" && !options?.includes(entry.value))
            throw new CrmError("Opzione non valida");
          if (field.fieldType === "multiselect") {
            let parsed: unknown;
            try {
              parsed = JSON.parse(entry.value);
            } catch {
              throw new CrmError("Lista opzioni non valida");
            }
            if (
              !Array.isArray(parsed) ||
              parsed.some((v) => typeof v !== "string" || !options?.includes(v))
            )
              throw new CrmError("Opzioni non valide");
          }
        }
        const key = `${input.entityType}Id`;
        await tx.customFieldValue.deleteMany({ where: { fieldId: field.id, [key]: input.id } });
        if (entry.value !== null)
          await tx.customFieldValue.create({
            data: { fieldId: field.id, [key]: input.id, value: entry.value },
          });
      }
      const version = nextVersion(parent);
      if (input.entityType === "company")
        await tx.company.update({ where, data: { updatedAt: version } });
      else if (input.entityType === "contact")
        await tx.contact.update({ where, data: { updatedAt: version } });
      else await tx.deal.update({ where, data: { updatedAt: version } });
      return { entityType: input.entityType, id: input.id, updatedAt: version.toISOString() };
    },
    { wakeEffects: false },
  );
}
export async function saveMcpPipeline(c: McpContext, input: z.infer<typeof s.pipelineWriteSchema>) {
  return write(
    c,
    "pipely_save_pipeline",
    input,
    async (tx) => {
      await lockOrg(tx, c.organizationId);
      const before = input.id
        ? await tx.pipeline.findFirst({
            where: { id: input.id, organizationId: c.organizationId },
            include: { stages: true },
          })
        : null;
      if (input.id && !before) throw new CrmError("Pipeline non disponibile");
      if (before) assertVersion(before, input.expectedUpdatedAt);
      else if (input.expectedUpdatedAt) throw new CrmError("La pipeline non esiste");
      const position = before
        ? before.position
        : await assertPipelineCapacity(tx, c.organizationId);
      const existingIds = new Set(before?.stages.map((x) => x.id) ?? []);
      const suppliedIds = input.stages.flatMap((x) => (x.id ? [x.id] : []));
      if (
        new Set(suppliedIds).size !== suppliedIds.length ||
        suppliedIds.some((x) => !existingIds.has(x))
      )
        throw new CrmError("Fasi duplicate o appartenenti a un'altra pipeline");
      const removed = [...existingIds].filter((x) => !suppliedIds.includes(x));
      if (removed.length && (await tx.deal.count({ where: { stageId: { in: removed } } })))
        throw new CrmError("Non puoi rimuovere una fase con trattative");
      if (input.isDefault)
        await tx.pipeline.updateMany({
          where: { organizationId: c.organizationId, isDefault: true },
          data: { isDefault: false },
        });
      const row = before
        ? await tx.pipeline.update({
            where: { id: before.id },
            data: { name: input.name, isDefault: input.isDefault, updatedAt: nextVersion(before) },
          })
        : await tx.pipeline.create({
            data: {
              name: input.name,
              isDefault: input.isDefault ?? position === 0,
              position,
              organizationId: c.organizationId,
            },
          });
      if (removed.length)
        await tx.stage.deleteMany({ where: { id: { in: removed }, pipelineId: row.id } });
      for (const [index, stage] of input.stages.entries()) {
        if (stage.id)
          await tx.stage.update({
            where: { id: stage.id },
            data: { name: stage.name, probability: stage.probability, position: index },
          });
        else
          await tx.stage.create({
            data: {
              name: stage.name,
              probability: stage.probability,
              position: index,
              pipelineId: row.id,
            },
          });
      }
      return {
        entityType: "pipeline",
        id: row.id,
        updatedAt: row.updatedAt.toISOString(),
        record: jsonRecord(
          await tx.pipeline.findUnique({
            where: { id: row.id },
            include: { stages: { orderBy: { position: "asc" } } },
          }),
        ),
      };
    },
    { wakeEffects: false },
  );
}
