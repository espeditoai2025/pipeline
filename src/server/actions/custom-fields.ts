"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Session } from "next-auth";
import type { CustomField, CustomFieldValue, EntityType, FieldType } from "@/types/custom-fields";

function getOrgId(s: Session | null) {
  return (s?.user as { organizationId?: string } | undefined)?.organizationId ?? null;
}

/**
 * Verifica che l'entità parent (deal/contact/company) appartenga all'org.
 * Le `CustomFieldValue` non hanno `organizationId` proprio, quindi lo scoping
 * per tenant DEVE risalire al parent — altrimenti IDOR cross-tenant.
 */
async function parentBelongsToOrg(
  entityType: EntityType,
  entityId: string,
  orgId: string,
): Promise<boolean> {
  if (entityType === "deal") {
    return !!(await db.deal.findFirst({ where: { id: entityId, organizationId: orgId }, select: { id: true } }));
  }
  if (entityType === "contact") {
    return !!(await db.contact.findFirst({ where: { id: entityId, organizationId: orgId }, select: { id: true } }));
  }
  return !!(await db.company.findFirst({ where: { id: entityId, organizationId: orgId }, select: { id: true } }));
}

// ── READ ────────────────────────────────────────────────────────────────────

export async function getCustomFields(entityType: EntityType): Promise<CustomField[]> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return [];

  const rows = await db.customField.findMany({
    where: { organizationId: orgId, entityType },
    orderBy: { name: "asc" },
  });

  return rows.map((r) => ({
    id: r.id,
    organizationId: r.organizationId,
    entityType: r.entityType as EntityType,
    name: r.name,
    fieldType: r.fieldType as FieldType,
    options: r.options ? (r.options as string[]) : null,
    isRequired: r.isRequired,
  }));
}

export async function getCustomFieldValues(
  entityId: string,
  entityType: EntityType
): Promise<CustomFieldValue[]> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return [];
  if (!(await parentBelongsToOrg(entityType, entityId, orgId))) return [];

  const idKey = `${entityType}Id` as "dealId" | "contactId" | "companyId";

  const rows = await db.customFieldValue.findMany({
    where: { [idKey]: entityId },
  });

  return rows.map((r) => ({
    id: r.id,
    fieldId: r.fieldId,
    dealId: r.dealId,
    contactId: r.contactId,
    companyId: r.companyId,
    value: r.value,
  }));
}

// ── CREATE / UPDATE ─────────────────────────────────────────────────────────

export async function createCustomField(data: {
  entityType: EntityType;
  name: string;
  fieldType: FieldType;
  options?: string[];
  isRequired?: boolean;
}): Promise<{ field?: CustomField; error?: string }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autenticato" };

  const row = await db.customField.create({
    data: {
      organizationId: orgId,
      entityType: data.entityType,
      name: data.name.trim(),
      fieldType: data.fieldType,
      options: data.options && data.options.length > 0 ? data.options : undefined,
      isRequired: data.isRequired ?? false,
    },
  });

  return {
    field: {
      id: row.id,
      organizationId: row.organizationId,
      entityType: row.entityType as EntityType,
      name: row.name,
      fieldType: row.fieldType as FieldType,
      options: row.options ? (row.options as string[]) : null,
      isRequired: row.isRequired,
    },
  };
}

export async function updateCustomField(
  id: string,
  data: { name?: string; options?: string[]; isRequired?: boolean }
): Promise<{ error?: string }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autenticato" };

  const existing = await db.customField.findFirst({ where: { id, organizationId: orgId } });
  if (!existing) return { error: "Campo non trovato" };

  await db.customField.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.options !== undefined && { options: data.options }),
      ...(data.isRequired !== undefined && { isRequired: data.isRequired }),
    },
  });

  return {};
}

export async function deleteCustomField(id: string): Promise<{ error?: string }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autenticato" };

  const existing = await db.customField.findFirst({ where: { id, organizationId: orgId } });
  if (!existing) return { error: "Campo non trovato" };

  await db.customField.delete({ where: { id } });
  return {};
}

// ── SAVE VALUES ─────────────────────────────────────────────────────────────

export async function saveCustomFieldValues(
  entityId: string,
  entityType: EntityType,
  values: { fieldId: string; value: string }[]
): Promise<{ error?: string }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autenticato" };

  // Scoping tenant: l'entità parent deve appartenere all'org (IDOR guard).
  if (!(await parentBelongsToOrg(entityType, entityId, orgId))) {
    return { error: "Non trovato" };
  }

  const idKey = `${entityType}Id` as "dealId" | "contactId" | "companyId";

  // Accetta solo fieldId che appartengono all'org per il tipo di entità corretto.
  const validFields = await db.customField.findMany({
    where: { organizationId: orgId, entityType, id: { in: values.map((v) => v.fieldId) } },
    select: { id: true },
  });
  const validIds = new Set(validFields.map((f) => f.id));

  const safeValues = values.filter((v) => v.value !== "" && validIds.has(v.fieldId));

  await db.$transaction([
    db.customFieldValue.deleteMany({ where: { [idKey]: entityId } }),
    db.customFieldValue.createMany({
      data: safeValues.map((v) => ({ fieldId: v.fieldId, [idKey]: entityId, value: v.value })),
    }),
  ]);

  return {};
}
