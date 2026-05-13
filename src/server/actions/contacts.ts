"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Contact, Company } from "@/types/contacts";

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
    organizationId: c.organizationId,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    _count: { contacts: c._count.contacts, deals: c._count.deals },
  }));
}

// ── SCHEMAS ─────────────────────────────────────────────────────────────────

const contactSchema = z.object({
  firstName: z.string().min(1, "Nome obbligatorio"),
  lastName: z.string().optional(),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  companyId: z.string().optional(),
});

const companySchema = z.object({
  name: z.string().min(1, "Nome obbligatorio"),
  website: z.string().url("URL non valido").optional().or(z.literal("")),
  industry: z.string().optional(),
  size: z.string().optional(),
  address: z.string().optional(),
});

// ── CONTACTS CRUD ────────────────────────────────────────────────────────────

export async function createContact(input: z.infer<typeof contactSchema>): Promise<{ data: Contact | null; error: string | null }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!session || !orgId) return { data: null, error: "Non autorizzato" };

  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  try {
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
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Errore durante l'eliminazione" };
  }
}

export async function importContacts(rows: Array<{ firstName: string; lastName?: string; email?: string; phone?: string; jobTitle?: string; companyName?: string }>): Promise<{ imported: number; duplicates: number; error: string | null }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!session || !orgId) return { imported: 0, duplicates: 0, error: "Non autorizzato" };

  const existingEmails = new Set(
    (await db.contact.findMany({ where: { organizationId: orgId }, select: { email: true } }))
      .map((c) => c.email?.toLowerCase())
      .filter(Boolean) as string[]
  );

  let imported = 0;
  let duplicates = 0;

  for (const row of rows) {
    const emailLower = row.email?.toLowerCase();
    if (emailLower && existingEmails.has(emailLower)) {
      duplicates++;
    } else {
      await db.contact.create({
        data: {
          firstName: row.firstName,
          lastName: row.lastName || null,
          email: row.email || null,
          phone: row.phone || null,
          jobTitle: row.jobTitle || null,
          organizationId: orgId,
          ownerId: session.user!.id!,
        },
      });
      if (emailLower) existingEmails.add(emailLower);
      imported++;
    }
  }

  revalidatePath("/contacts");
  return { imported, duplicates, error: null };
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
        organizationId: orgId,
      },
    });

    revalidatePath("/companies");
    return {
      data: {
        id: row.id,
        name: row.name,
        website: row.website ?? null,
        industry: row.industry ?? null,
        size: row.size ?? null,
        address: row.address ?? null,
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
      },
      include: { _count: { select: { contacts: true, deals: true } } },
    });

    revalidatePath("/companies");
    return {
      data: {
        id: row.id,
        name: row.name,
        website: row.website ?? null,
        industry: row.industry ?? null,
        size: row.size ?? null,
        address: row.address ?? null,
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
