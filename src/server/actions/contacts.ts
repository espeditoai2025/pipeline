"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { contactInputSchema, contactImportSchema, deduplicateContactImport, type ContactImportRow } from "@/lib/contact-import";
import { validateCrmReferences } from "@/lib/crm-references";
import { mergeContactRecords, mergeContactSchema, type MergeContactOverrides } from "@/lib/merge-contacts";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Contact, Company } from "@/types/contacts";
import { getOrgPlan, checkContactLimit } from "@/lib/plan";
import { runWorkflows } from "@/lib/workflow-engine";
import { dispatchWebhook } from "@/server/actions/webhooks";

function getOrgId(s: Session | null) {
  return (s?.user as { organizationId?: string } | undefined)?.organizationId ?? null;
}

// ── READ ────────────────────────────────────────────────────────────────────

export async function getContacts(): Promise<Contact[]> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return [];

  const rows = await db.contact.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      company: { select: { id: true, name: true } },
      _count: { select: { deals: true } },
    },
  });

  return rows.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName ?? null,
    email: c.email ?? null,
    phone: c.phone ?? null,
    jobTitle: c.jobTitle ?? null,
    organizationId: c.organizationId,
    ownerId: c.ownerId,
    owner: { id: c.owner.id, name: c.owner.name, email: c.owner.email },
    companyId: c.companyId ?? null,
    company: c.company ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    _count: { deals: c._count.deals },
  }));
}

export async function getCompanies(): Promise<Company[]> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return [];

  const rows = await db.company.findMany({
    where: { organizationId: orgId },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { contacts: true, deals: true } },
    },
  });

  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    website: c.website ?? null,
    industry: c.industry ?? null,
    size: c.size ?? null,
    address: c.address ?? null,
    city: c.city ?? null,
    country: c.country ?? null,
    email: c.email ?? null,
    phone: c.phone ?? null,
    vatNumber: c.vatNumber ?? null,
    description: c.description ?? null,
    linkedinUrl: c.linkedinUrl ?? null,
    referentName: c.referentName ?? null,
    referentRole: c.referentRole ?? null,
    referentEmail: c.referentEmail ?? null,
    referentPhone: c.referentPhone ?? null,
    organizationId: c.organizationId,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    _count: { contacts: c._count.contacts, deals: c._count.deals },
  }));
}

export async function getCompanyDetail(id: string) {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return null;

  const c = await db.company.findFirst({
    where: { id, organizationId: orgId },
    include: {
      contacts: {
        orderBy: { createdAt: "desc" },
        select: { id: true, firstName: true, lastName: true, email: true, phone: true, jobTitle: true },
      },
      deals: {
        where: { status: { not: "DELETED" } },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, value: true, currency: true, status: true, stage: { select: { name: true } } },
      },
    },
  });

  if (!c) return null;

  return {
    id: c.id,
    name: c.name,
    website: c.website ?? null,
    industry: c.industry ?? null,
    size: c.size ?? null,
    address: c.address ?? null,
    city: c.city ?? null,
    country: c.country ?? null,
    email: c.email ?? null,
    phone: c.phone ?? null,
    vatNumber: c.vatNumber ?? null,
    description: c.description ?? null,
    linkedinUrl: c.linkedinUrl ?? null,
    referentName: c.referentName ?? null,
    referentRole: c.referentRole ?? null,
    referentEmail: c.referentEmail ?? null,
    referentPhone: c.referentPhone ?? null,
    organizationId: c.organizationId,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    contacts: c.contacts.map((ct) => ({
      id: ct.id,
      firstName: ct.firstName,
      lastName: ct.lastName ?? null,
      email: ct.email ?? null,
      phone: ct.phone ?? null,
      jobTitle: ct.jobTitle ?? null,
    })),
    deals: c.deals.map((d) => ({
      id: d.id,
      title: d.title,
      value: Number(d.value),
      currency: d.currency,
      status: d.status as string,
      stageName: d.stage?.name ?? null,
    })),
  };
}

export async function getContactDetail(id: string) {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return null;

  const contact = await db.contact.findFirst({
    where: { id, organizationId: orgId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      company: { select: { id: true, name: true, website: true, industry: true } },
      deals: {
        orderBy: { createdAt: "desc" },
        include: { stage: { select: { id: true, name: true } } },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      customValues: { include: { field: true } },
      notes: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!contact) return null;

  return {
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName ?? null,
    email: contact.email ?? null,
    phone: contact.phone ?? null,
    jobTitle: contact.jobTitle ?? null,
    organizationId: contact.organizationId,
    ownerId: contact.ownerId,
    owner: contact.owner,
    companyId: contact.companyId ?? null,
    company: contact.company ?? null,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
    deals: contact.deals.map((d) => ({
      id: d.id,
      title: d.title,
      value: Number(d.value),
      currency: d.currency,
      status: d.status,
      stageName: d.stage?.name ?? null,
      expectedClose: d.expectedClose?.toISOString() ?? null,
    })),
    activities: contact.activities.map((a) => ({
      id: a.id,
      type: a.type,
      subject: a.subject,
      notes: a.notes ?? null,
      dueDate: a.dueDate?.toISOString() ?? null,
      completedAt: a.completedAt?.toISOString() ?? null,
      duration: a.duration ?? null,
      user: a.user,
      dealId: a.dealId ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
    customValues: contact.customValues.map((v) => ({
      fieldId: v.fieldId,
      fieldName: v.field.name,
      fieldType: v.field.fieldType,
      value: v.value,
    })),
    notes: contact.notes.map((n) => ({
      id: n.id,
      content: n.content,
      authorId: n.authorId,
      createdAt: n.createdAt.toISOString(),
    })),
  };
}

export async function createContactNote(contactId: string, content: string): Promise<{ ok?: boolean; error?: string }> {
  const session = await auth();
  const orgId = getOrgId(session);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!orgId || !userId) return { error: "Non autorizzato" };

  if (!content.trim()) return { error: "Il contenuto della nota non può essere vuoto" };

  const contact = await db.contact.findFirst({ where: { id: contactId, organizationId: orgId }, select: { id: true } });
  if (!contact) return { error: "Contatto non trovato" };

  await db.note.create({ data: { content: content.trim(), contactId, authorId: userId } });
  revalidatePath(`/contacts/${contactId}`);
  return { ok: true };
}

// ── SCHEMAS ─────────────────────────────────────────────────────────────────

const contactSchema = contactInputSchema;

const companySchema = z.object({
  name: z.string().min(1, "Nome obbligatorio"),
  website: z.string().url("URL non valido").optional().or(z.literal("")),
  industry: z.string().optional(),
  size: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  phone: z.string().optional(),
  vatNumber: z.string().optional(),
  description: z.string().optional(),
  linkedinUrl: z.string().url("URL non valido").optional().or(z.literal("")),
  referentName: z.string().optional(),
  referentRole: z.string().optional(),
  referentEmail: z.string().email("Email referente non valida").optional().or(z.literal("")),
  referentPhone: z.string().optional(),
});

// ── CONTACTS CRUD ────────────────────────────────────────────────────────────

export async function createContact(input: z.infer<typeof contactSchema>): Promise<{ data: Contact | null; error: string | null }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!session || !orgId) return { data: null, error: "Non autorizzato" };

  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  const plan = await getOrgPlan(orgId);
  const currentCount = await db.contact.count({ where: { organizationId: orgId } });
  const limitError = checkContactLimit(plan, currentCount);
  if (limitError) return { data: null, error: limitError };

  try {
    const referenceError = await validateCrmReferences(orgId, parsed.data);
    if (referenceError) return { data: null, error: referenceError };
    const row = await db.contact.create({
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName || null,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        jobTitle: parsed.data.jobTitle || null,
        companyId: parsed.data.companyId || null,
        organizationId: orgId,
        ownerId: session.user!.id!,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        company: { select: { id: true, name: true } },
      },
    });

    revalidatePath("/contacts");
    runWorkflows({
      trigger: "CONTACT_CREATED",
      orgId, contactId: row.id,
      contactName: `${row.firstName} ${row.lastName ?? ""}`.trim(),
      contactEmail: row.email ?? undefined,
      ownerId: row.ownerId,
    }).catch(console.error);
    dispatchWebhook(orgId, "contact.created", { id: row.id, firstName: row.firstName, lastName: row.lastName, email: row.email }).catch(() => {});
    return {
      data: {
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName ?? null,
        email: row.email ?? null,
        phone: row.phone ?? null,
        jobTitle: row.jobTitle ?? null,
        organizationId: row.organizationId,
        ownerId: row.ownerId,
        owner: { id: row.owner.id, name: row.owner.name, email: row.owner.email },
        companyId: row.companyId ?? null,
        company: row.company ?? null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        _count: { deals: 0 },
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Errore durante la creazione" };
  }
}

export async function updateContact(input: z.infer<typeof contactSchema> & { id: string }): Promise<{ data: Contact | null; error: string | null }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!session || !orgId) return { data: null, error: "Non autorizzato" };

  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  try {
    const referenceError = await validateCrmReferences(orgId, parsed.data);
    if (referenceError) return { data: null, error: referenceError };
    const row = await db.contact.update({
      where: { id: input.id, organizationId: orgId },
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName || null,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        jobTitle: parsed.data.jobTitle || null,
        companyId: parsed.data.companyId || null,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        company: { select: { id: true, name: true } },
        _count: { select: { deals: true } },
      },
    });

    revalidatePath("/contacts");
    dispatchWebhook(orgId, "contact.updated", { id: row.id, firstName: row.firstName, lastName: row.lastName, email: row.email }).catch(() => {});
    return {
      data: {
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName ?? null,
        email: row.email ?? null,
        phone: row.phone ?? null,
        jobTitle: row.jobTitle ?? null,
        organizationId: row.organizationId,
        ownerId: row.ownerId,
        owner: { id: row.owner.id, name: row.owner.name, email: row.owner.email },
        companyId: row.companyId ?? null,
        company: row.company ?? null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        _count: { deals: row._count.deals },
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Errore durante l'aggiornamento" };
  }
}

export async function deleteContact(id: string): Promise<{ error: string | null }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  try {
    await db.contact.delete({ where: { id, organizationId: orgId } });
    revalidatePath("/contacts");
    dispatchWebhook(orgId, "contact.deleted", { id }).catch(() => {});
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Errore durante l'eliminazione" };
  }
}

export async function mergeContacts(
  primaryId: string,
  duplicateId: string,
  overrides: MergeContactOverrides,
): Promise<{ error: string | null }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId || !session?.user?.id) return { error: "Non autorizzato" };
  if (!primaryId || !duplicateId) return { error: "Contatto non valido" };
  if (primaryId === duplicateId) return { error: "Non puoi unire un contatto con se stesso" };
  const parsed = mergeContactSchema.safeParse(overrides);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  try {
    await db.$transaction(
      (tx) => mergeContactRecords(tx, orgId, session.user!.id!, primaryId, duplicateId, parsed.data),
      { isolationLevel: "Serializable" },
    );
    revalidatePath("/contacts");
    revalidatePath("/contacts/[id]", "page");
    revalidatePath("/companies/[id]", "page");
    revalidatePath("/deals");
    revalidatePath("/deals/[id]", "page");
    revalidatePath("/leads");
    revalidatePath("/leads/[id]", "page");
    revalidatePath("/emails");
    revalidatePath("/activities");
    revalidatePath("/dashboard");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Errore durante l'unione" };
  }
}

export async function importContacts(rows: ContactImportRow[]): Promise<{ imported: number; duplicates: number; companies?: number; error: string | null }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!session?.user?.id || !orgId) return { imported: 0, duplicates: 0, error: "Non autorizzato" };
  const parsed = contactImportSchema.safeParse(rows);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const row = typeof issue?.path[0] === "number" ? `Riga ${issue.path[0] + 2}: ` : "";
    return { imported: 0, duplicates: 0, error: `${row}${issue?.message ?? "Dati non validi"}` };
  }

  try {
    const plan = await getOrgPlan(orgId);
    const result = await db.$transaction(async (tx) => {
      const existing = await tx.contact.findMany({ where: { organizationId: orgId }, select: { email: true } });
      const { contacts, duplicates } = deduplicateContactImport(parsed.data, existing.map((contact) => contact.email));
      if (!contacts.length) return { imported: 0, duplicates, companies: 0 };
      const limitError = checkContactLimit(plan, existing.length, contacts.length);
      if (limitError) throw new Error(limitError);

      const names = [...new Set(contacts.map((row) => row.companyName).filter((name): name is string => !!name))];
      const companies = names.length ? await tx.company.findMany({
        where: { organizationId: orgId, OR: names.map((name) => ({ name: { equals: name, mode: "insensitive" as const } })) },
        select: { id: true, name: true },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }) : [];
      const cache = new Map<string, string>();
      for (const company of companies) {
        const key = company.name.trim().toLowerCase();
        if (!cache.has(key)) cache.set(key, company.id);
      }
      for (const name of names) {
        const key = name.toLowerCase();
        if (!cache.has(key)) {
          const company = await tx.company.create({ data: { name, organizationId: orgId }, select: { id: true } });
          cache.set(key, company.id);
        }
      }
      await tx.contact.createMany({ data: contacts.map((row) => ({
        firstName: row.firstName, lastName: row.lastName || null, email: row.email || null,
        phone: row.phone || null, jobTitle: row.jobTitle || null,
        companyId: row.companyName ? cache.get(row.companyName.toLowerCase())! : null,
        organizationId: orgId, ownerId: session.user!.id!,
      })) });
      return { imported: contacts.length, duplicates, companies: cache.size };
    }, { isolationLevel: "Serializable", timeout: 30_000 });
    revalidatePath("/contacts");
    revalidatePath("/companies");
    revalidatePath("/dashboard");
    return { ...result, error: null };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2034") {
      return { imported: 0, duplicates: 0, error: "I contatti sono stati modificati durante l'importazione. Riprova: nessun dato è stato importato." };
    }
    return { imported: 0, duplicates: 0, error: error instanceof Error ? error.message : "Importazione non riuscita. Nessun dato è stato importato." };
  }
}

// ── COMPANIES CRUD ───────────────────────────────────────────────────────────

export async function createCompany(input: z.infer<typeof companySchema>): Promise<{ data: Company | null; error: string | null }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!session || !orgId) return { data: null, error: "Non autorizzato" };

  const parsed = companySchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  try {
    const row = await db.company.create({
      data: {
        name: parsed.data.name,
        website: parsed.data.website || null,
        industry: parsed.data.industry || null,
        size: parsed.data.size || null,
        address: parsed.data.address || null,
        city: parsed.data.city || null,
        country: parsed.data.country || null,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        vatNumber: parsed.data.vatNumber || null,
        description: parsed.data.description || null,
        linkedinUrl: parsed.data.linkedinUrl || null,
        referentName: parsed.data.referentName || null,
        referentRole: parsed.data.referentRole || null,
        referentEmail: parsed.data.referentEmail || null,
        referentPhone: parsed.data.referentPhone || null,
        organizationId: orgId,
      },
    });

    revalidatePath("/companies");
    dispatchWebhook(orgId, "company.created", { id: row.id, name: row.name, vatNumber: row.vatNumber }).catch(() => {});
    return {
      data: {
        id: row.id,
        name: row.name,
        website: row.website ?? null,
        industry: row.industry ?? null,
        size: row.size ?? null,
        address: row.address ?? null,
        city: row.city ?? null,
        country: row.country ?? null,
        email: row.email ?? null,
        phone: row.phone ?? null,
        vatNumber: row.vatNumber ?? null,
        description: row.description ?? null,
        linkedinUrl: row.linkedinUrl ?? null,
        referentName: row.referentName ?? null,
        referentRole: row.referentRole ?? null,
        referentEmail: row.referentEmail ?? null,
        referentPhone: row.referentPhone ?? null,
        organizationId: row.organizationId,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        _count: { contacts: 0, deals: 0 },
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Errore durante la creazione" };
  }
}

export async function updateCompany(input: z.infer<typeof companySchema> & { id: string }): Promise<{ data: Company | null; error: string | null }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!session || !orgId) return { data: null, error: "Non autorizzato" };

  const parsed = companySchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  try {
    const row = await db.company.update({
      where: { id: input.id, organizationId: orgId },
      data: {
        name: parsed.data.name,
        website: parsed.data.website || null,
        industry: parsed.data.industry || null,
        size: parsed.data.size || null,
        address: parsed.data.address || null,
        city: parsed.data.city || null,
        country: parsed.data.country || null,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        vatNumber: parsed.data.vatNumber || null,
        description: parsed.data.description || null,
        linkedinUrl: parsed.data.linkedinUrl || null,
        referentName: parsed.data.referentName || null,
        referentRole: parsed.data.referentRole || null,
        referentEmail: parsed.data.referentEmail || null,
        referentPhone: parsed.data.referentPhone || null,
      },
      include: { _count: { select: { contacts: true, deals: true } } },
    });

    revalidatePath("/companies");
    dispatchWebhook(orgId, "company.updated", { id: row.id, name: row.name, vatNumber: row.vatNumber }).catch(() => {});
    return {
      data: {
        id: row.id,
        name: row.name,
        website: row.website ?? null,
        industry: row.industry ?? null,
        size: row.size ?? null,
        address: row.address ?? null,
        city: row.city ?? null,
        country: row.country ?? null,
        email: row.email ?? null,
        phone: row.phone ?? null,
        vatNumber: row.vatNumber ?? null,
        description: row.description ?? null,
        linkedinUrl: row.linkedinUrl ?? null,
        referentName: row.referentName ?? null,
        referentRole: row.referentRole ?? null,
        referentEmail: row.referentEmail ?? null,
        referentPhone: row.referentPhone ?? null,
        organizationId: row.organizationId,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        _count: { contacts: row._count.contacts, deals: row._count.deals },
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Errore durante l'aggiornamento" };
  }
}

export async function deleteCompany(id: string): Promise<{ error: string | null }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  try {
    await db.company.delete({ where: { id, organizationId: orgId } });
    revalidatePath("/companies");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Errore durante l'eliminazione" };
  }
}
