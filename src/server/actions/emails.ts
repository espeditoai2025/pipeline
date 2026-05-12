"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { MOCK_EMAIL_TEMPLATES } from "@/lib/mock-emails";
import type { EmailMessage, EmailTemplate } from "@/types/emails";

const composeSchema = z.object({
  to: z.string().email("Email destinatario non valida"),
  cc: z.string().optional(),
  subject: z.string().min(1, "Oggetto obbligatorio"),
  body: z.string().min(1, "Corpo email obbligatorio"),
  dealId: z.string().optional(),
  dealTitle: z.string().optional(),
  contactId: z.string().optional(),
  contactName: z.string().optional(),
});

const templateSchema = z.object({
  name: z.string().min(1, "Nome obbligatorio"),
  subject: z.string().min(1, "Oggetto obbligatorio"),
  body: z.string().min(1, "Corpo obbligatorio"),
  category: z.string().min(1, "Categoria obbligatoria"),
});

export async function sendEmail(input: z.infer<typeof composeSchema>): Promise<{ data: EmailMessage | null; error: string | null }> {
  const session = await auth();
  if (!session) return { data: null, error: "Non autorizzato" };

  const parsed = composeSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  // TODO: integrate real email provider (Resend, SendGrid, etc.)
  const message: EmailMessage = {
    id: `msg-${Date.now()}`,
    threadId: `thread-${Date.now()}`,
    subject: parsed.data.subject,
    body: parsed.data.body,
    from: session.user?.email ?? "",
    fromName: session.user?.name ?? "",
    to: [parsed.data.to],
    cc: parsed.data.cc ? [parsed.data.cc] : [],
    status: "SENT",
    tracking: "SENT",
    openedAt: null,
    clickedAt: null,
    sentAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    dealId: parsed.data.dealId || null,
    dealTitle: parsed.data.dealTitle || null,
    contactId: parsed.data.contactId || null,
    contactName: parsed.data.contactName || null,
  };

  revalidatePath("/emails");
  return { data: message, error: null };
}

export async function saveDraft(input: z.infer<typeof composeSchema>): Promise<{ data: EmailMessage | null; error: string | null }> {
  const session = await auth();
  if (!session) return { data: null, error: "Non autorizzato" };

  const parsed = composeSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  // TODO: real DB insert
  const message: EmailMessage = {
    id: `msg-draft-${Date.now()}`,
    threadId: `thread-draft-${Date.now()}`,
    subject: parsed.data.subject,
    body: parsed.data.body,
    from: session.user?.email ?? "",
    fromName: session.user?.name ?? "",
    to: [parsed.data.to],
    cc: parsed.data.cc ? [parsed.data.cc] : [],
    status: "DRAFT",
    tracking: "NONE",
    openedAt: null,
    clickedAt: null,
    sentAt: null,
    createdAt: new Date().toISOString(),
    dealId: parsed.data.dealId || null,
    dealTitle: parsed.data.dealTitle || null,
    contactId: parsed.data.contactId || null,
    contactName: parsed.data.contactName || null,
  };

  revalidatePath("/emails");
  return { data: message, error: null };
}

export async function createTemplate(input: z.infer<typeof templateSchema>): Promise<{ data: EmailTemplate | null; error: string | null }> {
  const session = await auth();
  if (!session) return { data: null, error: "Non autorizzato" };

  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  // TODO: real DB insert
  const template: EmailTemplate = {
    id: `tpl-${Date.now()}`,
    name: parsed.data.name,
    subject: parsed.data.subject,
    body: parsed.data.body,
    category: parsed.data.category,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  revalidatePath("/emails");
  return { data: template, error: null };
}

export async function updateTemplate(input: z.infer<typeof templateSchema> & { id: string }): Promise<{ data: EmailTemplate | null; error: string | null }> {
  const session = await auth();
  if (!session) return { data: null, error: "Non autorizzato" };

  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  const existing = MOCK_EMAIL_TEMPLATES.find((t) => t.id === input.id);
  if (!existing) return { data: null, error: "Template non trovato" };

  // TODO: real DB update
  const updated: EmailTemplate = {
    ...existing,
    name: parsed.data.name,
    subject: parsed.data.subject,
    body: parsed.data.body,
    category: parsed.data.category,
    updatedAt: new Date().toISOString(),
  };

  revalidatePath("/emails");
  return { data: updated, error: null };
}

export async function deleteTemplate(id: string): Promise<{ error: string | null }> {
  const session = await auth();
  if (!session) return { error: "Non autorizzato" };

  // TODO: real DB delete
  revalidatePath("/emails");
  return { error: null };
}
