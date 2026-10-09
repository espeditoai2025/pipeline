import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { assertContactCapacity, crmTransaction, CrmError } from "@/lib/crm-transaction";
import { validateCrmReferences } from "@/lib/crm-references";
import { assertMcpWrite, type McpContext } from "./auth";
import { assertContactEmailAvailable, write } from "./crm";
import { companyFields, contactUpdateFields } from "./schemas";
import type {
  externalRecordSchema,
  importBatchSchema,
  syncCompanySchema,
  syncContactSchema,
  upsertCompanySchema,
  upsertContactSchema,
} from "./schemas";

type Entry = z.infer<typeof importBatchSchema>["entries"][number];
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
const vat = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .replace(/^IT(?=\d{11}$)/, "");

async function companyConflicts(
  tx: Prisma.TransactionClient,
  orgId: string,
  data: z.infer<typeof syncCompanySchema>,
  exceptId?: string,
) {
  if (!data.email && !data.vatNumber) return;
  const matches = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Company" WHERE "organizationId" = ${orgId} AND id <> ${exceptId ?? ""}
    AND ((lower(btrim(email)) = ${data.email ?? ""} AND ${!!data.email})
      OR (regexp_replace(upper(regexp_replace("vatNumber", '[^a-zA-Z0-9]', '', 'g')), '^IT(?=[0-9]{11}$)', '') = ${data.vatNumber ? vat(data.vatNumber) : ""} AND ${!!data.vatNumber})) LIMIT 1`;
  if (matches.length)
    throw new CrmError(
      `Conflitto partita IVA/email con l'azienda ${matches[0]!.id}; nessuna unione automatica`,
    );
}

export async function getMcpExternalRecord(
  context: McpContext,
  input: z.infer<typeof externalRecordSchema>,
) {
  const where = {
    organizationId: context.organizationId,
    externalSource: input.externalSource,
    externalId: input.externalId,
  };
  const record =
    input.kind === "company"
      ? await db.company.findFirst({ where })
      : await db.contact.findFirst({ where });
  return { record };
}

async function upsertEntry(
  tx: Prisma.TransactionClient,
  context: McpContext,
  entry: Entry,
  dryRun: boolean,
) {
  const where = {
    organizationId: context.organizationId,
    externalSource: entry.data.externalSource,
    externalId: entry.data.externalId,
  };
  const before =
    entry.kind === "company"
      ? await tx.company.findFirst({ where })
      : await tx.contact.findFirst({ where });
  const fields = entry.kind === "company" ? companyFields : contactUpdateFields;
  const data = Object.fromEntries(
    Object.keys(fields)
      .filter((field) => entry.data[field as keyof typeof entry.data] !== undefined)
      .map((field) => {
        const value = (entry.data as Record<string, unknown>)[field];
        return [field, value === "" ? null : value];
      }),
  );
  const unchanged =
    before &&
    Object.entries(data).every(
      ([key, value]) => (before as unknown as Record<string, unknown>)[key] === value,
    );
  if (
    before &&
    entry.data.expectedUpdatedAt &&
    new Date(entry.data.expectedUpdatedAt).getTime() !== before.updatedAt.getTime()
  )
    throw new CrmError("Versione obsoleta: rileggi il record prima di aggiornare");
  if (unchanged)
    return { status: "unchanged", kind: entry.kind, id: before.id, record: json(before) };
  if (
    before &&
    (!entry.data.expectedUpdatedAt ||
      new Date(entry.data.expectedUpdatedAt).getTime() !== before.updatedAt.getTime())
  )
    throw new CrmError("Versione mancante o obsoleta: rileggi il record prima di aggiornare");
  if (!before && entry.data.expectedUpdatedAt) throw new CrmError("Record esterno non disponibile");
  if (entry.kind === "company") {
    if (!before && !entry.data.name) throw new CrmError("Nome obbligatorio per una nuova azienda");
    await companyConflicts(tx, context.organizationId, entry.data, before?.id);
  } else {
    if (!before && !entry.data.firstName)
      throw new CrmError("Nome obbligatorio per un nuovo contatto");
    const referenceError = await validateCrmReferences(context.organizationId, entry.data, tx);
    if (referenceError) throw new CrmError(referenceError);
    await assertContactEmailAvailable(tx, context.organizationId, entry.data.email, before?.id);
    if (!before) await assertContactCapacity(tx, context.organizationId);
  }
  const status = before ? "updated" : "created";
  if (dryRun)
    return {
      status: `would_${status}`,
      kind: entry.kind,
      id: before?.id ?? null,
      changes: json(data),
    };
  const updatedAt = new Date(Math.max(Date.now(), (before?.updatedAt.getTime() ?? 0) + 1));
  let record;
  if (entry.kind === "company") {
    const companyData = data as Partial<z.infer<typeof syncCompanySchema>>;
    record = before
      ? await tx.company.update({
          where: { id: before.id, organizationId: context.organizationId },
          data: { ...companyData, updatedAt },
        })
      : await tx.company.create({
          data: { ...companyData, name: entry.data.name!, organizationId: context.organizationId },
        });
  } else {
    const contactData = data as Partial<z.infer<typeof syncContactSchema>>;
    record = before
      ? await tx.contact.update({
          where: { id: before.id, organizationId: context.organizationId },
          data: { ...contactData, updatedAt },
        })
      : await tx.contact.create({
          data: {
            ...contactData,
            firstName: entry.data.firstName!,
            ownerId: entry.data.ownerId ?? context.userId,
            organizationId: context.organizationId,
          },
        });
  }
  return { status, kind: entry.kind, id: record.id, record: json(record) };
}

export async function upsertMcpCompany(
  context: McpContext,
  input: z.infer<typeof upsertCompanySchema>,
) {
  return write(
    context,
    "pipely_upsert_company",
    input,
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${context.organizationId} FOR UPDATE`;
      const outcome = await upsertEntry(tx, context, { kind: "company", data: input }, false);
      return { ...outcome, id: outcome.id!, entityType: "company" };
    },
    { wakeEffects: false },
  );
}
export async function upsertMcpContact(
  context: McpContext,
  input: z.infer<typeof upsertContactSchema>,
) {
  return write(
    context,
    "pipely_upsert_contact",
    input,
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${context.organizationId} FOR UPDATE`;
      const outcome = await upsertEntry(tx, context, { kind: "contact", data: input }, false);
      return { ...outcome, id: outcome.id!, entityType: "contact" };
    },
    { wakeEffects: false },
  );
}

async function runBatch(
  tx: Prisma.TransactionClient,
  context: McpContext,
  input: z.infer<typeof importBatchSchema>,
) {
  await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${context.organizationId} FOR UPDATE`;
  const results: Prisma.InputJsonObject[] = [];
  const planned = new Set<string>();
  const emailKeys = new Set<string>();
  const vatKeys = new Set<string>();
  let plannedNewContacts = 0;
  for (const [index, entry] of input.entries.entries()) {
    const identity = JSON.stringify([entry.kind, entry.data.externalSource, entry.data.externalId]);
    if (planned.has(identity)) {
      results.push({
        index,
        kind: entry.kind,
        status: "conflict",
        error: "ID esterno ripetuto nello stesso lotto",
      });
      continue;
    }
    planned.add(identity);
    if (!input.dryRun) await tx.$executeRawUnsafe("SAVEPOINT pipely_import_entry");
    try {
      const emailKey = entry.data.email ? JSON.stringify([entry.kind, entry.data.email]) : null;
      const vatKey =
        entry.kind === "company" && entry.data.vatNumber ? vat(entry.data.vatNumber) : null;
      if (
        input.dryRun &&
        ((emailKey && emailKeys.has(emailKey)) || (vatKey && vatKeys.has(vatKey)))
      )
        throw new CrmError("Conflitto email/partita IVA con un'altra voce del lotto");
      const outcome = await upsertEntry(tx, context, entry, input.dryRun);
      if (input.dryRun && outcome.status === "would_created" && entry.kind === "contact") {
        await assertContactCapacity(tx, context.organizationId, plannedNewContacts + 1);
        plannedNewContacts++;
      }
      if (emailKey) emailKeys.add(emailKey);
      if (vatKey) vatKeys.add(vatKey);
      results.push(
        json({
          index,
          externalSource: entry.data.externalSource,
          externalId: entry.data.externalId,
          ...outcome,
        }),
      );
      if (!input.dryRun) await tx.$executeRawUnsafe("RELEASE SAVEPOINT pipely_import_entry");
    } catch (error) {
      if (!input.dryRun) {
        await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT pipely_import_entry");
        await tx.$executeRawUnsafe("RELEASE SAVEPOINT pipely_import_entry");
      }
      // Retry serialization failures across the entire batch, including the receipt.
      if (!(error instanceof CrmError)) throw error;
      results.push({
        index,
        kind: entry.kind,
        externalSource: entry.data.externalSource,
        externalId: entry.data.externalId,
        status: "conflict",
        error: error.message,
      });
    }
  }
  return {
    id: input.requestId,
    entityType: "crm_import",
    dryRun: input.dryRun,
    withoutSends: true,
    results,
    conflicts: results.filter((value) => value.status === "conflict").length,
    effects: { workflows: 0, webhooks: 0, emails: 0 },
  };
}

export async function importMcpBatch(
  context: McpContext,
  input: z.infer<typeof importBatchSchema>,
) {
  if (input.dryRun)
    return crmTransaction(async (tx) => {
      await assertMcpWrite(tx, context);
      return runBatch(tx, context, input);
    });
  return write(context, "pipely_import_batch", input, (tx) => runBatch(tx, context, input), {
    wakeEffects: false,
  });
}
