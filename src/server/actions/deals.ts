"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { runWorkflows } from "@/lib/workflow-engine";
import { dispatchWebhook } from "@/server/actions/webhooks";

function getOrgId(session: Session | null) {
  return (session?.user as { organizationId?: string } | undefined)?.organizationId ?? null;
}

const moveSchema = z.object({
  dealId: z.string(),
  newStageId: z.string(),
  oldStageId: z.string(),
});

export async function moveDeal(input: z.infer<typeof moveSchema>) {
  const session = await auth();
  if (!session) return { error: "Non autorizzato" };

  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) return { error: "Input non valido" };

  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  const { dealId, newStageId } = parsed.data;

  try {
    const deal = await db.deal.update({
      where: { id: dealId, organizationId: orgId },
      data: { stageId: newStageId, updatedAt: new Date() },
      select: { id: true, title: true, ownerId: true, contactId: true },
    });
    revalidatePath("/deals");
    runWorkflows({
      trigger: "DEAL_STAGE_CHANGED",
      orgId, dealId, dealTitle: deal.title,
      fromStageId: parsed.data.oldStageId, toStageId: newStageId,
      ownerId: deal.ownerId, contactId: deal.contactId ?? undefined,
    }).catch(console.error);
    dispatchWebhook(orgId, "deal.stage_changed", { dealId, title: deal.title, fromStageId: parsed.data.oldStageId, toStageId: newStageId }).catch(() => {});
    return { ok: true };
  } catch {
    return { error: "Errore durante lo spostamento dell'affare" };
  }
}

const updateSchema = z.object({
  id: z.string(),
  title: z.string().min(1).optional(),
  value: z.number().min(0).optional(),
  currency: z.string().optional(),
  stageId: z.string().optional(),
  expectedClose: z.string().nullable().optional(),
  status: z.enum(["OPEN", "WON", "LOST"]).optional(),
  lostReason: z.string().nullable().optional(),
  contactId: z.string().nullable().optional(),
  companyId: z.string().nullable().optional(),
});

export async function updateDeal(input: z.infer<typeof updateSchema>) {
  const session = await auth();
  if (!session) return { error: "Non autorizzato" };

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { error: "Input non valido" };

  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  const { id, expectedClose, status, ...rest } = parsed.data;

  try {
    const prev = await db.deal.findUnique({ where: { id, organizationId: orgId }, select: { value: true, title: true, ownerId: true, contactId: true } });

    const updated = await db.deal.update({
      where: { id, organizationId: orgId },
      data: {
        ...rest,
        expectedClose: expectedClose ? new Date(expectedClose) : expectedClose === null ? null : undefined,
        status: status ?? undefined,
        closedAt: status === "WON" || status === "LOST" ? new Date() : status === "OPEN" ? null : undefined,
        updatedAt: new Date(),
      },
      select: { id: true, title: true, value: true, ownerId: true, contactId: true },
    });

    revalidatePath("/deals");

    const base = { orgId, dealId: updated.id, dealTitle: updated.title, ownerId: updated.ownerId, contactId: updated.contactId ?? undefined };
    if (status === "WON") {
      runWorkflows({ trigger: "DEAL_WON", ...base, dealValue: Number(updated.value) }).catch(console.error);
      dispatchWebhook(orgId, "deal.won", { id: updated.id, title: updated.title, value: Number(updated.value) }).catch(() => {});
    } else if (status === "LOST") {
      runWorkflows({ trigger: "DEAL_LOST", ...base }).catch(console.error);
      dispatchWebhook(orgId, "deal.lost", { id: updated.id, title: updated.title }).catch(() => {});
    } else if (rest.value !== undefined && prev && Number(rest.value) !== Number(prev.value)) {
      runWorkflows({ trigger: "DEAL_VALUE_CHANGED", ...base, newValue: Number(updated.value) }).catch(console.error);
    }
    dispatchWebhook(orgId, "deal.updated", { id: updated.id, title: updated.title, value: Number(updated.value) }).catch(() => {});

    return { ok: true };
  } catch {
    return { error: "Errore durante l'aggiornamento" };
  }
}

const createSchema = z.object({
  title: z.string().min(1),
  value: z.number().min(0),
  currency: z.string().default("EUR"),
  stageId: z.string(),
  pipelineId: z.string(),
  expectedClose: z.string().optional(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
});

export async function createDeal(input: z.infer<typeof createSchema>) {
  const session = await auth();
  if (!session) return { error: "Non autorizzato" };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { error: "Input non valido" };

  const orgId = getOrgId(session);
  const ownerId = session.user?.id;
  if (!orgId || !ownerId) return { error: "Non autorizzato" };

  const { expectedClose, ...rest } = parsed.data;

  try {
    const deal = await db.deal.create({
      data: {
        ...rest,
        organizationId: orgId,
        ownerId,
        expectedClose: expectedClose ? new Date(expectedClose) : undefined,
      },
    });
    revalidatePath("/deals");
    runWorkflows({
      trigger: "DEAL_CREATED",
      orgId, dealId: deal.id, dealTitle: deal.title, dealValue: Number(deal.value),
      ownerId, stageId: deal.stageId, contactId: deal.contactId ?? undefined,
    }).catch(console.error);
    dispatchWebhook(orgId, "deal.created", { id: deal.id, title: deal.title, value: Number(deal.value), stageId: deal.stageId }).catch(() => {});
    return { ok: true, id: deal.id };
  } catch {
    return { error: "Errore durante la creazione" };
  }
}

export async function deleteDeal(dealId: string) {
  const session = await auth();
  if (!session) return { error: "Non autorizzato" };

  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  try {
    const deal = await db.deal.update({
      where: { id: dealId, organizationId: orgId },
      data: { status: "DELETED" },
    });
    revalidatePath("/deals");
    dispatchWebhook(orgId, "deal.deleted", { id: deal.id, title: deal.title }).catch(() => {});
    return { ok: true };
  } catch {
    return { error: "Errore durante l'eliminazione" };
  }
}

export async function getDealDetail(id: string) {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return null;

  const deal = await db.deal.findFirst({
    where: { id, organizationId: orgId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      company: { select: { id: true, name: true, website: true } },
      stage: { select: { id: true, name: true, position: true } },
      activities: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      customValues: { include: { field: true } },
      notes: { orderBy: { createdAt: "desc" }, take: 20 },
      products: { include: { product: { select: { id: true, name: true, code: true, unit: true } } }, orderBy: { id: "asc" } },
    },
  });

  if (!deal) return null;

  return {
    id: deal.id,
    title: deal.title,
    value: Number(deal.value),
    currency: deal.currency,
    status: deal.status,
    expectedClose: deal.expectedClose?.toISOString() ?? null,
    closedAt: deal.closedAt?.toISOString() ?? null,
    lostReason: deal.lostReason ?? null,
    stageId: deal.stageId,
    pipelineId: deal.pipelineId,
    organizationId: deal.organizationId,
    ownerId: deal.ownerId,
    owner: deal.owner,
    contact: deal.contact
      ? { id: deal.contact.id, firstName: deal.contact.firstName, lastName: deal.contact.lastName ?? null, email: deal.contact.email ?? null, phone: deal.contact.phone ?? null }
      : null,
    company: deal.company ?? null,
    stage: deal.stage ? { id: deal.stage.id, name: deal.stage.name, position: deal.stage.position } : null,
    createdAt: deal.createdAt.toISOString(),
    updatedAt: deal.updatedAt.toISOString(),
    activities: deal.activities.map((a) => ({
      id: a.id,
      type: a.type,
      subject: a.subject,
      notes: a.notes ?? null,
      dueDate: a.dueDate?.toISOString() ?? null,
      completedAt: a.completedAt?.toISOString() ?? null,
      duration: a.duration ?? null,
      user: a.user,
      contactId: a.contactId ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
    customValues: deal.customValues.map((v) => ({
      fieldId: v.fieldId,
      fieldName: v.field.name,
      fieldType: v.field.fieldType,
      value: v.value,
    })),
    notes: deal.notes.map((n) => ({
      id: n.id,
      content: n.content,
      authorId: n.authorId,
      createdAt: n.createdAt.toISOString(),
    })),
    products: deal.products.map((p) => ({
      id: p.id,
      quantity: p.quantity,
      unitPrice: Number(p.unitPrice),
      discount: Number(p.discount),
      product: p.product,
    })),
  };
}

export async function createDealNote(dealId: string, content: string): Promise<{ ok?: boolean; error?: string }> {
  const session = await auth();
  const orgId = getOrgId(session);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!orgId || !userId) return { error: "Non autorizzato" };
  if (!content.trim()) return { error: "Il contenuto della nota non può essere vuoto" };

  const deal = await db.deal.findFirst({ where: { id: dealId, organizationId: orgId }, select: { id: true } });
  if (!deal) return { error: "Affare non trovato" };

  await db.note.create({ data: { content: content.trim(), dealId, authorId: userId } });
  revalidatePath(`/deals/${dealId}`);
  return { ok: true };
}

export async function updateNote(noteId: string, content: string): Promise<{ ok?: boolean; error?: string }> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { error: "Non autorizzato" };
  if (!content.trim()) return { error: "Il contenuto della nota non può essere vuoto" };

  const note = await db.note.findFirst({ where: { id: noteId, authorId: userId } });
  if (!note) return { error: "Nota non trovata" };

  await db.note.update({ where: { id: noteId }, data: { content: content.trim() } });
  if (note.dealId) revalidatePath(`/deals/${note.dealId}`);
  if (note.contactId) revalidatePath(`/contacts/${note.contactId}`);
  return { ok: true };
}

export async function deleteNote(noteId: string): Promise<{ ok?: boolean; error?: string }> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { error: "Non autorizzato" };

  const note = await db.note.findFirst({ where: { id: noteId, authorId: userId } });
  if (!note) return { error: "Nota non trovata" };

  await db.note.delete({ where: { id: noteId } });
  if (note.dealId) revalidatePath(`/deals/${note.dealId}`);
  if (note.contactId) revalidatePath(`/contacts/${note.contactId}`);
  return { ok: true };
}

export async function deleteDeals(ids: string[]): Promise<{ count: number; error?: string }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { count: 0, error: "Non autorizzato" };
  if (!ids.length) return { count: 0 };

  try {
    // Risolvi prima i deal realmente eliminabili: gli eventi webhook vanno
    // emessi solo per cancellazioni effettive, non per id arbitrari del client.
    const toDelete = await db.deal.findMany({
      where: { id: { in: ids }, organizationId: orgId, status: { not: "DELETED" } },
      select: { id: true, title: true },
    });
    const result = await db.deal.updateMany({
      where: { id: { in: toDelete.map((d) => d.id) } },
      data: { status: "DELETED" },
    });
    revalidatePath("/deals");
    for (const d of toDelete) {
      dispatchWebhook(orgId, "deal.deleted", { id: d.id, title: d.title }).catch(() => {});
    }
    return { count: result.count };
  } catch {
    return { count: 0, error: "Errore durante l'eliminazione" };
  }
}

export async function updateDealsStatus(
  ids: string[],
  status: "OPEN" | "WON" | "LOST",
): Promise<{ count: number; error?: string }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { count: 0, error: "Non autorizzato" };
  if (!ids.length) return { count: 0 };

  try {
    const result = await db.deal.updateMany({
      where: { id: { in: ids }, organizationId: orgId },
      data: {
        status,
        closedAt: status === "WON" || status === "LOST" ? new Date() : null,
        updatedAt: new Date(),
      },
    });
    revalidatePath("/deals");
    return { count: result.count };
  } catch {
    return { count: 0, error: "Errore durante l'aggiornamento" };
  }
}

export async function getDealsForSelect(): Promise<{ id: string; title: string; value: number; currency: string }[]> {
  const session = await auth();
  if (!session) return [];

  const orgId = getOrgId(session);
  if (!orgId) return [];

  try {
    const deals = await db.deal.findMany({
      where: { organizationId: orgId, status: "OPEN" },
      select: { id: true, title: true, value: true, currency: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    return deals.map((d) => ({ ...d, value: Number(d.value) }));
  } catch {
    return [];
  }
}

// ---------- QUOTE DATA ----------

export type QuoteData = {
  deal: {
    id: string;
    title: string;
    currency: string;
    expectedClose: string | null;
    createdAt: string;
  };
  organization: {
    name: string;
    vatNumber: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    phone: string | null;
    website: string | null;
  };
  contact: { firstName: string; lastName: string | null; email: string | null; phone: string | null } | null;
  company: { name: string; website: string | null } | null;
  items: {
    name: string;
    code: string | null;
    quantity: number;
    unit: string;
    unitPrice: number;
    discount: number;
    taxRate: number;
    subtotal: number;
    tax: number;
    total: number;
  }[];
  totals: { subtotal: number; tax: number; total: number };
};

export async function getQuoteData(dealId: string): Promise<{ data: QuoteData | null; error: string | null }> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { data: null, error: "Non autorizzato" };

  const deal = await db.deal.findFirst({
    where: { id: dealId, organizationId: orgId },
    include: {
      organization: {
        select: { name: true, vatNumber: true, address: true, city: true, country: true, phone: true, website: true },
      },
      contact: { select: { firstName: true, lastName: true, email: true, phone: true } },
      company: { select: { name: true, website: true } },
      products: {
        include: { product: { select: { name: true, code: true, unit: true, taxRate: true } } },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!deal) return { data: null, error: "Affare non trovato" };
  if (deal.products.length === 0) return { data: null, error: "Aggiungi almeno un prodotto all'affare prima di generare il preventivo" };

  const items = deal.products.map((p) => {
    const unitPrice = Number(p.unitPrice);
    const discount = Number(p.discount);
    const taxRate = Number(p.product.taxRate);
    const subtotal = p.quantity * unitPrice * (1 - discount / 100);
    const tax = subtotal * (taxRate / 100);
    return {
      name: p.product.name,
      code: p.product.code,
      quantity: p.quantity,
      unit: p.product.unit,
      unitPrice,
      discount,
      taxRate,
      subtotal,
      tax,
      total: subtotal + tax,
    };
  });

  const totals = items.reduce(
    (acc, i) => ({ subtotal: acc.subtotal + i.subtotal, tax: acc.tax + i.tax, total: acc.total + i.total }),
    { subtotal: 0, tax: 0, total: 0 },
  );

  return {
    data: {
      deal: {
        id: deal.id,
        title: deal.title,
        currency: deal.currency,
        expectedClose: deal.expectedClose?.toISOString() ?? null,
        createdAt: deal.createdAt.toISOString(),
      },
      organization: deal.organization,
      contact: deal.contact
        ? { firstName: deal.contact.firstName, lastName: deal.contact.lastName ?? null, email: deal.contact.email ?? null, phone: deal.contact.phone ?? null }
        : null,
      company: deal.company,
      items,
      totals,
    },
    error: null,
  };
}
