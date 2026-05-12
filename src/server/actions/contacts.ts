"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { MOCK_CONTACTS, MOCK_COMPANIES } from "@/lib/mock-contacts";
import type { Contact, Company } from "@/types/contacts";

// ---- schemas ----

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

// ---- contacts ----

export async function createContact(input: z.infer<typeof contactSchema>): Promise<{ data: Contact | null; error: string | null }> {
  const session = await auth();
  if (!session) return { data: null, error: "Non autorizzato" };

  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  const userId = session.user?.id ?? "";
  const company = parsed.data.companyId ? MOCK_COMPANIES.find((c) => c.id === parsed.data.companyId) ?? null : null;

  // TODO: real DB insert
  const contact: Contact = {
    id: `cnt-${Date.now()}`,
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName ?? null,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    jobTitle: parsed.data.jobTitle || null,
    organizationId: "org-1",
    ownerId: userId,
    owner: { id: userId, name: session.user?.name ?? null, email: session.user?.email ?? "" },
    companyId: parsed.data.companyId || null,
    company: company ? { id: company.id, name: company.name } : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { deals: 0 },
  };

  revalidatePath("/contacts");
  return { data: contact, error: null };
}

export async function updateContact(input: z.infer<typeof contactSchema> & { id: string }): Promise<{ data: Contact | null; error: string | null }> {
  const session = await auth();
  if (!session) return { data: null, error: "Non autorizzato" };

  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  const existing = MOCK_CONTACTS.find((c) => c.id === input.id);
  if (!existing) return { data: null, error: "Contatto non trovato" };

  const company = parsed.data.companyId ? MOCK_COMPANIES.find((c) => c.id === parsed.data.companyId) ?? null : null;

  // TODO: real DB update
  const updated: Contact = {
    ...existing,
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName ?? null,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    jobTitle: parsed.data.jobTitle || null,
    companyId: parsed.data.companyId || null,
    company: company ? { id: company.id, name: company.name } : null,
    updatedAt: new Date().toISOString(),
  };

  revalidatePath("/contacts");
  return { data: updated, error: null };
}

export async function deleteContact(id: string): Promise<{ error: string | null }> {
  const session = await auth();
  if (!session) return { error: "Non autorizzato" };

  // TODO: real DB delete
  revalidatePath("/contacts");
  return { error: null };
}

export async function importContacts(rows: Array<{ firstName: string; lastName?: string; email?: string; phone?: string; jobTitle?: string; companyName?: string }>): Promise<{ imported: number; duplicates: number; error: string | null }> {
  const session = await auth();
  if (!session) return { imported: 0, duplicates: 0, error: "Non autorizzato" };

  const existingEmails = new Set(MOCK_CONTACTS.map((c) => c.email?.toLowerCase()).filter(Boolean));
  let imported = 0;
  let duplicates = 0;

  for (const row of rows) {
    if (row.email && existingEmails.has(row.email.toLowerCase())) {
      duplicates++;
    } else {
      imported++;
      if (row.email) existingEmails.add(row.email.toLowerCase());
    }
  }

  // TODO: real bulk insert
  revalidatePath("/contacts");
  return { imported, duplicates, error: null };
}

// ---- companies ----

export async function createCompany(input: z.infer<typeof companySchema>): Promise<{ data: Company | null; error: string | null }> {
  const session = await auth();
  if (!session) return { data: null, error: "Non autorizzato" };

  const parsed = companySchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  // TODO: real DB insert
  const company: Company = {
    id: `co-${Date.now()}`,
    name: parsed.data.name,
    website: parsed.data.website || null,
    industry: parsed.data.industry || null,
    size: parsed.data.size || null,
    address: parsed.data.address || null,
    organizationId: "org-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { contacts: 0, deals: 0 },
  };

  revalidatePath("/companies");
  return { data: company, error: null };
}

export async function updateCompany(input: z.infer<typeof companySchema> & { id: string }): Promise<{ data: Company | null; error: string | null }> {
  const session = await auth();
  if (!session) return { data: null, error: "Non autorizzato" };

  const parsed = companySchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  const existing = MOCK_COMPANIES.find((c) => c.id === input.id);
  if (!existing) return { data: null, error: "Azienda non trovata" };

  // TODO: real DB update
  const updated: Company = {
    ...existing,
    name: parsed.data.name,
    website: parsed.data.website || null,
    industry: parsed.data.industry || null,
    size: parsed.data.size || null,
    address: parsed.data.address || null,
    updatedAt: new Date().toISOString(),
  };

  revalidatePath("/companies");
  return { data: updated, error: null };
}

export async function deleteCompany(id: string): Promise<{ error: string | null }> {
  const session = await auth();
  if (!session) return { error: "Non autorizzato" };

  // TODO: real DB delete
  revalidatePath("/companies");
  return { error: null };
}
