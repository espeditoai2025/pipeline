"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { MOCK_LEADS } from "@/lib/mock-contacts";
import type { Lead, LeadStatus } from "@/types/contacts";

const leadSchema = z.object({
  title: z.string().min(1, "Titolo obbligatorio"),
  source: z.string().optional(),
  score: z.number().min(0).max(100),
  status: z.enum(["NEW", "WORKING", "NURTURING", "CONVERTED", "DISQUALIFIED"]),
  data: z.record(z.string(), z.unknown()).optional(),
});

export async function createLead(input: z.infer<typeof leadSchema>): Promise<{ data: Lead | null; error: string | null }> {
  const session = await auth();
  if (!session) return { data: null, error: "Non autorizzato" };

  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  // TODO: real DB insert
  const lead: Lead = {
    id: `lead-${Date.now()}`,
    title: parsed.data.title,
    source: parsed.data.source || null,
    score: parsed.data.score,
    status: parsed.data.status as LeadStatus,
    data: (parsed.data.data ?? {}) as Record<string, unknown>,
    organizationId: "org-1",
    convertedDealId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  revalidatePath("/leads");
  return { data: lead, error: null };
}

export async function updateLead(input: z.infer<typeof leadSchema> & { id: string }): Promise<{ data: Lead | null; error: string | null }> {
  const session = await auth();
  if (!session) return { data: null, error: "Non autorizzato" };

  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  const existing = MOCK_LEADS.find((l) => l.id === input.id);
  if (!existing) return { data: null, error: "Lead non trovato" };

  // TODO: real DB update
  const updated: Lead = {
    ...existing,
    title: parsed.data.title,
    source: parsed.data.source || null,
    score: parsed.data.score,
    status: parsed.data.status as LeadStatus,
    data: (parsed.data.data ?? existing.data) as Record<string, unknown>,
    updatedAt: new Date().toISOString(),
  };

  revalidatePath("/leads");
  return { data: updated, error: null };
}

export async function deleteLead(id: string): Promise<{ error: string | null }> {
  const session = await auth();
  if (!session) return { error: "Non autorizzato" };

  // TODO: real DB delete
  revalidatePath("/leads");
  return { error: null };
}

export async function convertLead(id: string, dealTitle: string): Promise<{ dealId: string | null; error: string | null }> {
  const session = await auth();
  if (!session) return { dealId: null, error: "Non autorizzato" };

  const lead = MOCK_LEADS.find((l) => l.id === id);
  if (!lead) return { dealId: null, error: "Lead non trovato" };
  if (lead.status === "CONVERTED") return { dealId: null, error: "Lead già convertito" };

  // TODO: real DB transaction — create deal + update lead status
  const dealId = `deal-${Date.now()}`;
  revalidatePath("/leads");
  revalidatePath("/deals");
  return { dealId, error: null };
}
