"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { MOCK_ACTIVITIES } from "@/lib/mock-activities";
import type { Activity, ActivityType } from "@/types/activities";

const activitySchema = z.object({
  type: z.enum(["CALL", "MEETING", "EMAIL", "TASK", "DEADLINE", "LUNCH"]),
  subject: z.string().min(1, "Oggetto obbligatorio"),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
  duration: z.number().min(0).optional(),
  dealId: z.string().optional(),
  dealTitle: z.string().optional(),
  contactId: z.string().optional(),
  contactName: z.string().optional(),
});

export async function createActivity(input: z.infer<typeof activitySchema>): Promise<{ data: Activity | null; error: string | null }> {
  const session = await auth();
  if (!session) return { data: null, error: "Non autorizzato" };

  const parsed = activitySchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  const userId = session.user?.id ?? "";
  // TODO: real DB insert
  const activity: Activity = {
    id: `act-${Date.now()}`,
    type: parsed.data.type as ActivityType,
    subject: parsed.data.subject,
    notes: parsed.data.notes || null,
    dueDate: parsed.data.dueDate || null,
    completedAt: null,
    duration: parsed.data.duration ?? null,
    organizationId: "org-1",
    userId,
    user: { id: userId, name: session.user?.name ?? null, email: session.user?.email ?? "" },
    dealId: parsed.data.dealId || null,
    dealTitle: parsed.data.dealTitle || null,
    contactId: parsed.data.contactId || null,
    contactName: parsed.data.contactName || null,
    createdAt: new Date().toISOString(),
  };

  revalidatePath("/activities");
  return { data: activity, error: null };
}

export async function updateActivity(input: z.infer<typeof activitySchema> & { id: string }): Promise<{ data: Activity | null; error: string | null }> {
  const session = await auth();
  if (!session) return { data: null, error: "Non autorizzato" };

  const parsed = activitySchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  const existing = MOCK_ACTIVITIES.find((a) => a.id === input.id);
  if (!existing) return { data: null, error: "Attività non trovata" };

  // TODO: real DB update
  const updated: Activity = {
    ...existing,
    type: parsed.data.type as ActivityType,
    subject: parsed.data.subject,
    notes: parsed.data.notes || null,
    dueDate: parsed.data.dueDate || null,
    duration: parsed.data.duration ?? null,
    dealId: parsed.data.dealId || null,
    dealTitle: parsed.data.dealTitle || null,
    contactId: parsed.data.contactId || null,
    contactName: parsed.data.contactName || null,
  };

  revalidatePath("/activities");
  return { data: updated, error: null };
}

export async function completeActivity(id: string): Promise<{ error: string | null }> {
  const session = await auth();
  if (!session) return { error: "Non autorizzato" };

  // TODO: real DB update
  revalidatePath("/activities");
  return { error: null };
}

export async function deleteActivity(id: string): Promise<{ error: string | null }> {
  const session = await auth();
  if (!session) return { error: "Non autorizzato" };

  // TODO: real DB delete
  revalidatePath("/activities");
  return { error: null };
}
