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
  segment: text(200).optional(),
});
export const contactsSchema = companiesSchema.extend({ companyId: id.optional() });
export const dealsSchema = pageSchema.extend({
  status: z.enum(["OPEN", "WON", "LOST"]).optional(),
  pipelineId: id.optional(),
  isTest: z.boolean().optional(),
});
export const activitiesSchema = pageSchema.extend({
  completed: z.boolean().optional(),
  contactId: id.optional(),
  dealId: id.optional(),
  companyId: id.optional(),
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
    isTest: z.boolean().optional(),
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
    companyId: id.optional(),
  })
  .strict();
export const createNoteSchema = z
  .object({ requestId, content: text(10000), ...links, companyId: id.optional() })
  .strict()
  .refine(
    (value) => !!value.contactId || !!value.dealId || !!value.companyId,
    "Collega la nota a un contatto, azienda o trattativa",
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
    acceptanceEvidence: text(2000).optional(),
    isTest: z.boolean().optional(),
  })
  .strict()
  .refine(
    (value) =>
      [
        value.title,
        value.value,
        value.status,
        value.stageId,
        value.lostReason,
        value.acceptanceEvidence,
        value.isTest,
      ].some((field) => field !== undefined),
    "Specifica almeno una modifica",
  );
export const updateActivitySchema = z
  .object({
    requestId,
    id,
    expectedUpdatedAt,
    subject: text(300).optional(),
    type: createActivitySchema.shape.type.optional(),
    notes: z.string().trim().max(10000).nullable().optional(),
    dueDate: dateTime.nullable().optional(),
    duration: z.number().int().min(0).max(10080).nullable().optional(),
    contactId: id.nullable().optional(),
    dealId: id.nullable().optional(),
    companyId: id.nullable().optional(),
  })
  .strict()
  .refine(
    (v) => Object.keys(v).some((k) => !["requestId", "id", "expectedUpdatedAt"].includes(k)),
    "Specifica una modifica",
  );
export const reopenActivitySchema = z
  .object({ requestId, id, expectedUpdatedAt, reason: text(1000) })
  .strict();
export const customFieldsReadSchema = z
  .object({ entityType: z.enum(["company", "contact", "deal"]) })
  .strict();
export const customFieldWriteSchema = z
  .object({
    requestId,
    id: id.optional(),
    expectedUpdatedAt: expectedUpdatedAt.optional(),
    entityType: z.enum(["company", "contact", "deal"]),
    name: text(200),
    fieldType: z.enum(["text", "number", "date", "boolean", "select", "multiselect"]),
    options: z.array(text(200)).max(100).optional(),
    isRequired: z.boolean().default(false),
  })
  .strict()
  .refine(
    (v) => !["select", "multiselect"].includes(v.fieldType) || !!v.options?.length,
    "Specifica le opzioni",
  );
export const customValuesWriteSchema = z
  .object({
    requestId,
    entityType: z.enum(["company", "contact", "deal"]),
    id,
    expectedUpdatedAt,
    values: z
      .array(z.object({ fieldId: id, value: z.string().max(10000).nullable() }).strict())
      .min(1)
      .max(100),
  })
  .strict()
  .refine(
    (v) => new Set(v.values.map((x) => x.fieldId)).size === v.values.length,
    "Campi duplicati",
  );
export const pipelineWriteSchema = z
  .object({
    requestId,
    id: id.optional(),
    expectedUpdatedAt: expectedUpdatedAt.optional(),
    name: text(200),
    isDefault: z.boolean().optional(),
    stages: z
      .array(
        z
          .object({
            id: id.optional(),
            name: text(200),
            probability: z.number().int().min(0).max(100),
          })
          .strict(),
      )
      .min(1)
      .max(50),
  })
  .strict();
export const gobusProfileReadSchema = z.object({ companyId: id }).strict();
export const gobusProfileWriteSchema = z
  .object({
    requestId,
    companyId: id,
    expectedUpdatedAt: expectedUpdatedAt.optional(),
    source: externalSource,
    segment: optionalCompanyText(200),
    companyType: optionalCompanyText(200),
    verificationStatus: z.enum(["UNVERIFIED", "VERIFIED", "REJECTED"]).optional(),
    lifecycle: z.enum(["PROSPECT", "TRIAL", "CUSTOMER", "INACTIVE"]).optional(),
    basePlan: optionalCompanyText(200),
    trialUpgrade: optionalCompanyText(200),
    trialEndsAt: dateTime.nullable().optional(),
    activatedAt: dateTime.nullable().optional(),
    firstServiceAt: dateTime.nullable().optional(),
    nextAction: optionalCompanyText(1000),
    isTest: z.boolean().optional(),
    feeAmount: z.number().finite().min(0).max(1e12).nullable().optional(),
    feeCurrency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional(),
    feePeriod: z.enum(["MONTH", "QUARTER", "YEAR", "ONE_OFF"]).nullable().optional(),
    feeVat: z.enum(["INCLUDED", "EXCLUDED", "EXEMPT", "UNKNOWN"]).optional(),
    feeSource: optionalCompanyText(200),
    feeVerifiedAt: dateTime.nullable().optional(),
    feeEvidence: optionalCompanyText(2000),
  })
  .strict();
export const gobusReportSchema = z
  .object({ source: externalSource.optional(), segment: text(200).optional() })
  .strict();
export const effectsSchema = z
  .object({
    operation: z.enum([
      "create_contact",
      "update_contact",
      "create_company",
      "update_company",
      "create_deal",
      "update_deal",
      "create_activity",
      "complete_activity",
      "create_note",
      "upsert_company",
      "upsert_contact",
      "import_batch",
    ]),
  })
  .strict();
export const externalEventWriteSchema = z
  .object({
    requestId,
    source: externalSource,
    externalId,
    expectedUpdatedAt: expectedUpdatedAt.optional(),
    kind: z.enum(["PCSMAIL", "GOBUS", "SMS"]),
    state: z.enum([
      "DRAFT",
      "SENT_CONFIRMED",
      "UNCERTAIN",
      "BOUNCE",
      "REPLY_RECEIVED",
      "REGISTERED",
      "FIRST_SERVICE",
      "TRIAL",
      "SUBSCRIPTION",
      "SUPPORT_REQUEST",
      "DELIVERED",
      "DELIVERY_FAILED",
      "OPT_OUT",
      "LINK_CLICKED",
    ]),
    direction: z.enum(["INBOUND", "OUTBOUND", "NONE"]),
    occurredAt: dateTime,
    companyId: id.nullable().optional(),
    contactId: id.nullable().optional(),
    recipient: normalizedEmail
      .or(
        z
          .string()
          .trim()
          .regex(/^\+[1-9]\d{7,14}$/, "Numero internazionale E.164 non valido"),
      )
      .nullable()
      .optional(),
    recipientVerified: z.boolean().default(false),
    account: normalizedEmail.optional(),
    smsAccountId: text(200).optional(),
    mailbox: text(200).optional(),
    uidValidity: z
      .string()
      .regex(/^[1-9]\d{0,19}$/)
      .optional(),
    uid: z
      .string()
      .regex(/^[1-9]\d{0,19}$/)
      .optional(),
    messageId: text(998).optional(),
    messageRef: text(1000).optional(),
    evidence: text(2000).optional(),
    isTest: z.boolean().optional(),
  })
  .strict()
  .superRefine((v, c) => {
    const fail = (message: string) => c.addIssue({ code: "custom", message });
    const mail = ["DRAFT", "SENT_CONFIRMED", "UNCERTAIN", "BOUNCE", "REPLY_RECEIVED"].includes(
      v.state,
    );
    const gobus = [
      "REGISTERED",
      "FIRST_SERVICE",
      "TRIAL",
      "SUBSCRIPTION",
      "SUPPORT_REQUEST",
    ].includes(v.state);
    const sms = [
      "DRAFT",
      "SENT_CONFIRMED",
      "UNCERTAIN",
      "REPLY_RECEIVED",
      "DELIVERED",
      "DELIVERY_FAILED",
      "OPT_OUT",
      "LINK_CLICKED",
    ].includes(v.state);
    if (
      (v.kind === "PCSMAIL" && !mail) ||
      (v.kind === "GOBUS" && !gobus) ||
      (v.kind === "SMS" && !sms)
    )
      fail("Stato incompatibile con la fonte");
    if (v.kind !== "SMS" && v.recipient && !normalizedEmail.safeParse(v.recipient).success)
      fail("Questo canale richiede un indirizzo email");
    if (v.kind !== "SMS" && v.smsAccountId) fail("smsAccountId è ammesso soltanto per SMS");
    if (v.kind === "SMS") {
      if (v.source !== "smshosting") fail("La fonte SMS deve essere smshosting");
      if (
        !v.smsAccountId ||
        !v.recipient ||
        !/^\+[1-9]\d{7,14}$/.test(v.recipient) ||
        v.direction === "NONE"
      )
        fail("SMS: servono account provider, destinatario E.164 e direzione");
      if ([v.account, v.mailbox, v.uidValidity, v.uid].some(Boolean))
        fail("Gli identificativi IMAP non sono ammessi per SMS");
      if (
        ["SENT_CONFIRMED", "DELIVERED", "DELIVERY_FAILED", "OPT_OUT", "LINK_CLICKED"].includes(
          v.state,
        ) &&
        !v.evidence
      )
        fail("L'esito SMS richiede un riferimento di evidenza del provider");
      if (
        ["SENT_CONFIRMED", "DELIVERED", "DELIVERY_FAILED", "LINK_CLICKED"].includes(v.state) &&
        !v.messageId
      )
        fail("L'esito SMS richiede l'ID del messaggio nel provider");
      if (
        ["DELIVERED", "DELIVERY_FAILED", "LINK_CLICKED"].includes(v.state) &&
        v.direction !== "OUTBOUND"
      )
        fail("Esiti e click SMS richiedono OUTBOUND");
    }
    if (
      v.kind === "PCSMAIL" &&
      (!v.account || !v.mailbox || !v.uidValidity || !v.uid || v.direction === "NONE")
    )
      fail("Servono account, mailbox, UIDVALIDITY, UID e direzione");
    if (v.recipientVerified && !v.recipient) fail("Manca il destinatario verificato");
    if (v.kind === "GOBUS" && (!v.evidence || v.direction !== "NONE" || !v.companyId))
      fail("Evento GoBus: servono azienda, evidenza verificata e direzione NONE");
    if (
      v.kind === "GOBUS" &&
      [v.account, v.mailbox, v.uidValidity, v.uid, v.messageId, v.messageRef].some(Boolean)
    )
      fail("I riferimenti di posta sono ammessi solo per PCSMail");
    if (v.kind === "PCSMAIL" && v.source !== "pcsmail")
      fail("La fonte PCSMail deve essere pcsmail");
    if (v.state === "REPLY_RECEIVED" && v.direction !== "INBOUND")
      fail("Una risposta ricevuta è INBOUND");
    if (["DRAFT", "SENT_CONFIRMED"].includes(v.state) && v.direction !== "OUTBOUND")
      fail("Bozza/invio richiedono OUTBOUND");
    if (v.state === "SENT_CONFIRMED" && !v.evidence)
      fail(
        "L'invio confermato richiede una ricevuta verificata; Inviati da solo non prova la consegna",
      );
  });
export const externalEventsReadSchema = pageSchema.extend({
  source: externalSource.optional(),
  companyId: id.optional(),
  contactId: id.optional(),
  kind: z.enum(["PCSMAIL", "GOBUS", "SMS"]).optional(),
});
export const createTokenSchema = z
  .object({
    name: text(80),
    canWrite: z.boolean().default(false),
    expiresInDays: z.number().int().min(1).max(365).default(90),
  })
  .strict();
