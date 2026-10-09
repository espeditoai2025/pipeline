import { z } from "zod";

const id = z.string().trim().min(1).max(128);
const text = (max: number) => z.string().trim().min(1).max(max);
const requestId = z
  .string()
  .regex(/^[a-zA-Z0-9_-]{8,100}$/)
  .describe(
    "Identificativo univoco della scrittura, ad esempio UUID. Mantieni lo stesso valore e gli stessi dati quando riprovi dopo un timeout.",
  );
const dateTime = z.string().datetime({ offset: true });
const expectedUpdatedAt = dateTime.describe(
  "Versione updatedAt letta dal CRM. Rileggi il record se nel frattempo è cambiato.",
);
const optionalCompanyText = (max: number) => z.string().trim().max(max).nullable().optional();
const optionalCompanyUrl = z.string().trim().url().max(2000).nullable().optional();
const normalizedEmail = z.string().trim().toLowerCase().email().max(254);
const optionalCompanyEmail = normalizedEmail.nullable().optional();
const externalSource = z.string().trim().toLowerCase().min(1).max(100);
const externalId = z.string().trim().min(1).max(200);
const externalFields = {
  externalSource: externalSource.nullable().optional(),
  externalId: externalId.nullable().optional(),
  operationalEmail: optionalCompanyEmail,
};
const validExternalPair = (value: { externalSource?: string | null; externalId?: string | null }) =>
  (value.externalSource === undefined && value.externalId === undefined) ||
  (value.externalSource === null && value.externalId === null) ||
  (typeof value.externalSource === "string" && typeof value.externalId === "string");
export const companyFields = {
  name: text(300),
  website: optionalCompanyUrl,
  industry: optionalCompanyText(200),
  size: optionalCompanyText(100),
  address: optionalCompanyText(500),
  city: optionalCompanyText(200),
  country: optionalCompanyText(100),
  email: optionalCompanyEmail,
  phone: optionalCompanyText(50),
  vatNumber: optionalCompanyText(50),
  description: optionalCompanyText(10000),
  linkedinUrl: optionalCompanyUrl,
  referentName: optionalCompanyText(200),
  referentRole: optionalCompanyText(200),
  referentEmail: optionalCompanyEmail,
  referentPhone: optionalCompanyText(50),
  ...externalFields,
};
export const createCompanySchema = z
  .object({ requestId, ...companyFields })
  .strict()
  .refine(validExternalPair, "Specifica externalSource ed externalId insieme");
export const updateCompanySchema = z
  .object(companyFields)
  .partial()
  .extend({
    requestId,
    id,
    expectedUpdatedAt,
  })
  .strict()
  .refine(validExternalPair, "Specifica externalSource ed externalId insieme")
  .refine(
    (value) =>
      Object.keys(companyFields).some(
        (field) => value[field as keyof typeof companyFields] !== undefined,
      ),
    "Specifica almeno una modifica",
  );
export const completeActivitySchema = z.object({ requestId, id }).strict();
export const recipientPolicyReadSchema = z.object({ address: normalizedEmail }).strict();
export const recipientPolicyWriteSchema = z
  .object({
    requestId,
    address: normalizedEmail,
    status: z.enum(["DO_NOT_CONTACT", "PERMANENT_BOUNCE", "SUSPENDED", "CLEARED"]),
    reason: text(1000),
    source: text(200),
    effectiveAt: dateTime,
    suspendedUntil: dateTime.nullable().optional(),
    expectedUpdatedAt: expectedUpdatedAt.optional(),
    verification: text(2000).optional(),
  })
  .strict()
  .refine(
    (value) => value.status !== "CLEARED" || !!value.verification,
    "La rimozione del blocco richiede evidenza verificata; non rappresenta un consenso marketing",
  )
  .refine(
    (value) => value.status === "SUSPENDED" || !value.suspendedUntil,
    "La scadenza è ammessa solo per una sospensione",
  )
  .refine(
    (value) =>
      !value.suspendedUntil || new Date(value.suspendedUntil) > new Date(value.effectiveAt),
    "La scadenza deve seguire la data di efficacia",
  );
export const pageSchema = z
  .object({
    search: z.string().trim().max(200).optional(),
    page: z.number().int().min(1).max(10000).default(1),
    perPage: z.number().int().min(1).max(50).default(25),
  })
  .strict();
export const companiesSchema = pageSchema.extend({
  externalSource: externalSource.optional(),
  externalId: externalId.optional(),
});
export const contactsSchema = companiesSchema.extend({ companyId: id.optional() });
export const dealsSchema = pageSchema.extend({
  status: z.enum(["OPEN", "WON", "LOST"]).optional(),
  pipelineId: id.optional(),
});
export const activitiesSchema = pageSchema.extend({
  completed: z.boolean().optional(),
  contactId: id.optional(),
  dealId: id.optional(),
});
export const recordSchema = z
  .object({ kind: z.enum(["contact", "company", "deal", "activity"]), id })
  .strict();
const links = { contactId: id.optional(), dealId: id.optional() };
export const createContactSchema = z
  .object({
    requestId,
    firstName: text(100),
    lastName: z.string().trim().max(100).optional(),
    email: normalizedEmail.optional(),
    phone: z.string().trim().max(50).optional(),
    jobTitle: z.string().trim().max(100).optional(),
    companyId: id.optional(),
    ownerId: id.optional(),
    ...externalFields,
  })
  .strict()
  .refine(validExternalPair, "Specifica externalSource ed externalId insieme");
export const contactUpdateFields = {
  firstName: text(100).optional(),
  lastName: z.string().trim().max(100).nullable().optional(),
  email: optionalCompanyEmail,
  phone: z.string().trim().max(50).nullable().optional(),
  jobTitle: z.string().trim().max(100).nullable().optional(),
  companyId: id.nullable().optional(),
  ownerId: id.optional(),
  ...externalFields,
};
export const updateContactSchema = z
  .object({ requestId, id, expectedUpdatedAt, ...contactUpdateFields })
  .strict()
  .refine(validExternalPair, "Specifica externalSource ed externalId insieme")
  .refine(
    (value) =>
      Object.keys(contactUpdateFields).some(
        (field) => value[field as keyof typeof contactUpdateFields] !== undefined,
      ),
    "Specifica almeno una modifica",
  );
const syncMetadata = {
  externalSource,
  externalId,
  expectedUpdatedAt: expectedUpdatedAt.optional(),
};
export const syncCompanySchema = z
  .object({ ...companyFields })
  .partial()
  .extend(syncMetadata)
  .strict();
export const syncContactSchema = z.object(contactUpdateFields).extend(syncMetadata).strict();
export const upsertCompanySchema = syncCompanySchema.extend({ requestId }).strict();
export const upsertContactSchema = syncContactSchema.extend({ requestId }).strict();
export const externalRecordSchema = z
  .object({ kind: z.enum(["company", "contact"]), externalSource, externalId })
  .strict();
export const importBatchSchema = z
  .object({
    requestId,
    dryRun: z.boolean().default(true),
    withoutSends: z
      .literal(true)
      .default(true)
      .describe("L'importazione non accoda workflow o webhook e non avvia invii"),
    entries: z
      .array(
        z.discriminatedUnion("kind", [
          z.object({ kind: z.literal("company"), data: syncCompanySchema }).strict(),
          z.object({ kind: z.literal("contact"), data: syncContactSchema }).strict(),
        ]),
      )
      .min(1)
      .max(100),
  })
  .strict();
export const createDealSchema = z
  .object({
    requestId,
    title: text(300),
    value: z.number().finite().min(0).max(1e12).default(0),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .default("EUR"),
    pipelineId: id,
    stageId: id,
    expectedClose: z.string().date().or(dateTime).optional(),
    contactId: id.optional(),
    companyId: id.optional(),
    ownerId: id.optional(),
  })
  .strict();
export const createActivitySchema = z
  .object({
    requestId,
    type: z.enum(["CALL", "MEETING", "EMAIL", "TASK", "DEADLINE", "LUNCH"]),
    subject: text(300),
    notes: z.string().trim().max(10000).optional(),
    dueDate: dateTime.optional(),
    duration: z.number().int().min(0).max(10080).optional(),
    ...links,
  })
  .strict();
export const createNoteSchema = z
  .object({ requestId, content: text(10000), ...links })
  .strict()
  .refine(
    (value) => !!value.contactId || !!value.dealId,
    "Collega la nota a un contatto o a una trattativa",
  );
export const updateDealSchema = z
  .object({
    requestId,
    id,
    expectedUpdatedAt: dateTime.describe(
      "Versione updatedAt letta da pipely_get_record o pipely_list_deals. Rileggi il record se nel frattempo è cambiato.",
    ),
    title: text(300).optional(),
    value: z.number().finite().min(0).max(1e12).optional(),
    status: z.enum(["OPEN", "WON", "LOST"]).optional(),
    stageId: id.optional(),
    lostReason: z.string().trim().max(1000).optional(),
  })
  .strict()
  .refine(
    (value) =>
      [value.title, value.value, value.status, value.stageId, value.lostReason].some(
        (field) => field !== undefined,
      ),
    "Specifica almeno una modifica",
  );
export const createTokenSchema = z
  .object({
    name: text(80),
    canWrite: z.boolean().default(false),
    expiresInDays: z.number().int().min(1).max(365).default(90),
  })
  .strict();
