import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { contactInputSchema } from "@/lib/contact-import";
import { validateCrmReferences } from "@/lib/crm-references";

export const mergeContactSchema = contactInputSchema.partial().extend({
  lastName: contactInputSchema.shape.lastName.nullable(),
  email: contactInputSchema.shape.email.nullable(),
  phone: contactInputSchema.shape.phone.nullable(),
  jobTitle: contactInputSchema.shape.jobTitle.nullable(),
  companyId: contactInputSchema.shape.companyId.nullable(),
});
export type MergeContactOverrides = z.infer<typeof mergeContactSchema>;

/** Must run inside a serializable transaction, including both reads and the final delete. */
export async function mergeContactRecords(
  tx: Prisma.TransactionClient,
  organizationId: string,
  authorId: string,
  primaryId: string,
  duplicateId: string,
  overrides: MergeContactOverrides,
) {
  const include = {
    tags: { where: { organizationId }, select: { id: true } },
    customValues: { where: { field: { organizationId, entityType: "contact" } }, include: { field: { select: { name: true } } } },
  };
  const [primary, duplicate] = await Promise.all([
    tx.contact.findFirst({ where: { id: primaryId, organizationId }, include }),
    tx.contact.findFirst({ where: { id: duplicateId, organizationId }, include }),
  ]);
  if (!primary || !duplicate) throw new Error("Contatto non trovato");

  const choose = (key: keyof MergeContactOverrides) => overrides[key] !== undefined
    ? overrides[key] || null
    : primary[key] || duplicate[key] || null;
  const companyId = choose("companyId");
  const referenceError = await validateCrmReferences(organizationId, { companyId }, tx);
  if (referenceError) throw new Error(referenceError);

  // The note keeps the source values, including conflicting custom fields and overwritten details.
  const snapshot = (contact: typeof primary) => ({
    id: contact.id, firstName: contact.firstName, lastName: contact.lastName,
    email: contact.email, phone: contact.phone, jobTitle: contact.jobTitle,
    companyId: contact.companyId, ownerId: contact.ownerId, createdAt: contact.createdAt,
    customFields: contact.customValues.map((value) => ({ field: value.field.name, value: value.value })),
  });
  await tx.note.create({ data: {
    contactId: primaryId, authorId,
    content: `Storico unione contatti\nDati prima dell'unione:\n${JSON.stringify({ principale: snapshot(primary), duplicato: snapshot(duplicate) }, null, 2)}`,
  } });

  const primaryValues = new Map(primary.customValues.map((value) => [value.fieldId, value]));
  for (const value of duplicate.customValues) {
    const existing = primaryValues.get(value.fieldId);
    if (!existing) {
      await tx.customFieldValue.update({ where: { id: value.id }, data: { contactId: primaryId } });
      primaryValues.set(value.fieldId, value);
    } else if (!existing.value.trim() && value.value.trim()) {
      await tx.customFieldValue.update({ where: { id: existing.id }, data: { value: value.value } });
      primaryValues.set(value.fieldId, { ...existing, value: value.value });
    }
  }

  await tx.deal.updateMany({ where: { contactId: duplicateId, organizationId }, data: { contactId: primaryId } });
  await tx.activity.updateMany({ where: { contactId: duplicateId, organizationId }, data: { contactId: primaryId } });
  await tx.email.updateMany({ where: { contactId: duplicateId, organizationId }, data: { contactId: primaryId } });
  await tx.lead.updateMany({ where: { contactId: duplicateId, organizationId }, data: { contactId: primaryId } });
  await tx.note.updateMany({ where: { contactId: duplicateId, contact: { organizationId } }, data: { contactId: primaryId } });
  await tx.contact.update({
    where: { id: primaryId, organizationId },
    data: {
      firstName: choose("firstName") ?? primary.firstName,
      lastName: choose("lastName"), email: choose("email"), phone: choose("phone"),
      jobTitle: choose("jobTitle"), companyId,
      tags: { connect: duplicate.tags.map(({ id }) => ({ id })) },
    },
  });
  await tx.contact.delete({ where: { id: duplicateId, organizationId } });
}
