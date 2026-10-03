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
export const pageSchema = z
  .object({
    search: z.string().trim().max(200).optional(),
    page: z.number().int().min(1).max(10000).default(1),
    perPage: z.number().int().min(1).max(50).default(25),
  })
  .strict();
export const contactsSchema = pageSchema.extend({ companyId: id.optional() });
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
    email: z.string().email().max(254).optional(),
    phone: z.string().trim().max(50).optional(),
    jobTitle: z.string().trim().max(100).optional(),
    companyId: id.optional(),
    ownerId: id.optional(),
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
