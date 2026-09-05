"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateCrmReferences } from "@/lib/crm-references";
import { dispatchWebhook } from "@/server/actions/webhooks";
import type { Activity, ActivityType } from "@/types/activities";

function getOrgId(s: Session | null) {
  return (s?.user as { organizationId?: string } | undefined)?.organizationId ?? null;
}

function refreshActivityPages() {
  revalidatePath("/activities");
  revalidatePath("/dashboard");
  revalidatePath("/deals/[id]", "page");
  revalidatePath("/contacts/[id]", "page");
}

function mapActivity(a: {
  id: string; type: string; subject: string; notes: string | null;
  dueDate: Date | null; completedAt: Date | null; duration: number | null;
  organizationId: string; userId: string;
  user: { id: string; name: string | null; email: string };
  dealId: string | null; deal?: { title: string } | null;
  contactId: string | null; contact?: { firstName: string; lastName: string | null } | null;
  createdAt: Date;
}): Activity {
  return {
    id: a.id,
    type: a.type as ActivityType,
    subject: a.subject,
    notes: a.notes ?? null,
    dueDate: a.dueDate?.toISOString() ?? null,
    completedAt: a.completedAt?.toISOString() ?? null,
    duration: a.duration ?? null,
    organizationId: a.organizationId,
    userId: a.userId,
    user: { id: a.user.id, name: a.user.name, email: a.user.email },
    dealId: a.dealId ?? null,
    dealTitle: a.deal ? a.deal.title : null,
    contactId: a.contactId ?? null,
    contactName: a.contact ? `${a.contact.firstName} ${a.contact.lastName ?? ""}`.trim() : null,
    createdAt: a.createdAt.toISOString(),
  };
}

export async function getActivities(): Promise<Activity[]> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return [];

  const rows = await db.activity.findMany({
    where: { organizationId: orgId },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    include: {
      user: { select: { id: true, name: true, email: true } },
      deal: { select: { title: true } },
      contact: { select: { firstName: true, lastName: true } },
    },
  });

  return rows.map(mapActivity);
}

const activitySchema = z.object({
  type: z.enum(["CALL", "MEETING", "EMAIL", "TASK", "DEADLINE", "LUNCH"]),
  subject: z.string().trim().min(1, "Oggetto obbligatorio").max(300),
  notes: z.string().optional(),
  dueDate: z.string().datetime({ offset: true, message: "Data non valida: specifica anche il fuso orario" }).or(z.literal("")).optional(),
  duration: z.number().int().min(0).max(10080).nullable().optional(),
  dealId: z.string().optional(),
  dealTitle: z.string().optional(),
  contactId: z.string().optional(),
  contactName: z.string().optional(),
});

export async function createActivity(input: z.infer<typeof activitySchema>): Promise<{ data: Activity | null; error: string | null }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!session || !orgId) return { data: null, error: "Non autorizzato" };

  const parsed = activitySchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  try {
    const referenceError = await validateCrmReferences(orgId, parsed.data);
    if (referenceError) return { data: null, error: referenceError };
    const row = await db.activity.create({
      data: {
        type: parsed.data.type,
        subject: parsed.data.subject,
        notes: parsed.data.notes || null,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        duration: parsed.data.duration ?? null,
        organizationId: orgId,
        userId: session.user!.id!,
        dealId: parsed.data.dealId || null,
        contactId: parsed.data.contactId || null,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        deal: { select: { title: true } },
        contact: { select: { firstName: true, lastName: true } },
      },
    });

    refreshActivityPages();
    dispatchWebhook(orgId, "activity.created", { id: row.id, type: row.type, subject: row.subject, dueDate: row.dueDate?.toISOString() ?? null }).catch(() => {});
    return { data: mapActivity(row), error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Errore durante la creazione" };
  }
}

export async function updateActivity(input: z.infer<typeof activitySchema> & { id: string }): Promise<{ data: Activity | null; error: string | null }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!session || !orgId) return { data: null, error: "Non autorizzato" };

  const parsed = activitySchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  try {
    const referenceError = await validateCrmReferences(orgId, parsed.data);
    if (referenceError) return { data: null, error: referenceError };
    const row = await db.activity.update({
      where: { id: input.id, organizationId: orgId },
      data: {
        type: parsed.data.type,
        subject: parsed.data.subject,
        notes: parsed.data.notes || null,
        dueDate: parsed.data.dueDate === undefined ? undefined : parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        duration: parsed.data.duration,
        dealId: parsed.data.dealId === undefined ? undefined : parsed.data.dealId || null,
        contactId: parsed.data.contactId === undefined ? undefined : parsed.data.contactId || null,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        deal: { select: { title: true } },
        contact: { select: { firstName: true, lastName: true } },
      },
    });

    refreshActivityPages();
    return { data: mapActivity(row), error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Errore durante l'aggiornamento" };
  }
}

export async function completeActivity(id: string): Promise<{ error: string | null }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  try {
    const row = await db.activity.update({
      where: { id, organizationId: orgId },
      data: { completedAt: new Date() },
    });
    refreshActivityPages();
    dispatchWebhook(orgId, "activity.completed", { id: row.id, type: row.type, subject: row.subject }).catch(() => {});
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Errore" };
  }
}

export async function deleteActivity(id: string): Promise<{ error: string | null }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  try {
    await db.activity.delete({ where: { id, organizationId: orgId } });
    refreshActivityPages();
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Errore durante l'eliminazione" };
  }
}
