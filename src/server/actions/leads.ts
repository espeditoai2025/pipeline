"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Lead, LeadStatus } from "@/types/contacts";
import { runWorkflows } from "@/lib/workflow-engine";

function getIds(s: Session | null) {
  const user = s?.user as { id?: string; organizationId?: string } | undefined;
  return { orgId: user?.organizationId ?? null, userId: user?.id ?? null };
}

// DB enum → app type mapping
const DB_TO_APP: Record<string, LeadStatus> = {
  NEW: "NEW",
  CONTACTED: "WORKING",
  QUALIFIED: "NURTURING",
  CONVERTED: "CONVERTED",
  DISQUALIFIED: "DISQUALIFIED",
};
const APP_TO_DB: Record<string, string> = {
  NEW: "NEW",
  WORKING: "CONTACTED",
  NURTURING: "QUALIFIED",
  CONVERTED: "CONVERTED",
  DISQUALIFIED: "DISQUALIFIED",
};

const LEAD_SELECT = {
  id: true, title: true, source: true, score: true, status: true,
  data: true, email: true, phone: true, notes: true,
  organizationId: true, ownerId: true, contactId: true, convertedDealId: true,
  createdAt: true, updatedAt: true,
  owner: { select: { id: true, name: true, email: true } },
  contact: { select: { id: true, firstName: true, lastName: true } },
} as const;

function mapLead(l: {
  id: string; title: string; source: string | null; score: number; status: string;
  data: unknown; email: string | null; phone: string | null; notes: string | null;
  organizationId: string; ownerId: string | null; contactId: string | null;
  convertedDealId: string | null; createdAt: Date; updatedAt: Date;
  owner: { id: string; name: string | null; email: string } | null;
  contact: { id: string; firstName: string; lastName: string | null } | null;
}): Lead {
  return {
    id: l.id,
    title: l.title,
    source: l.source,
    score: l.score,
    status: (DB_TO_APP[l.status] ?? l.status) as LeadStatus,
    data: (l.data ?? {}) as Record<string, unknown>,
    email: l.email,
    phone: l.phone,
    notes: l.notes,
    organizationId: l.organizationId,
    ownerId: l.ownerId,
    owner: l.owner,
    contactId: l.contactId,
    contact: l.contact,
    convertedDealId: l.convertedDealId,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  };
}

export async function getLeads(): Promise<Lead[]> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return [];

  const rows = await db.lead.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    select: LEAD_SELECT,
  });

  return rows.map(mapLead);
}

const leadSchema = z.object({
  title: z.string().min(1, "Titolo obbligatorio"),
  source: z.string().optional(),
  score: z.number().min(0).max(100),
  status: z.enum(["NEW", "WORKING", "NURTURING", "CONVERTED", "DISQUALIFIED"]),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
  ownerId: z.string().optional(),
  contactId: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

export async function createLead(input: z.infer<typeof leadSchema>): Promise<{ data: Lead | null; error: string | null }> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!session || !orgId) return { data: null, error: "Non autorizzato" };

  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  try {
    const row = await db.lead.create({
      data: {
        title: parsed.data.title,
        source: parsed.data.source || null,
        score: parsed.data.score,
        status: APP_TO_DB[parsed.data.status] as "NEW" | "CONTACTED" | "QUALIFIED" | "CONVERTED" | "DISQUALIFIED",
        data: (parsed.data.data ?? {}) as Record<string, string>,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        notes: parsed.data.notes || null,
        organizationId: orgId,
        ownerId: parsed.data.ownerId || null,
        contactId: parsed.data.contactId || null,
      },
      select: LEAD_SELECT,
    });

    revalidatePath("/leads");
    runWorkflows({ trigger: "LEAD_CREATED", orgId, leadId: row.id, leadTitle: row.title }).catch(console.error);
    return { data: mapLead(row), error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Errore durante la creazione" };
  }
}

export async function updateLead(input: z.infer<typeof leadSchema> & { id: string }): Promise<{ data: Lead | null; error: string | null }> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!session || !orgId) return { data: null, error: "Non autorizzato" };

  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  try {
    const row = await db.lead.update({
      where: { id: input.id, organizationId: orgId },
      data: {
        title: parsed.data.title,
        source: parsed.data.source || null,
        score: parsed.data.score,
        status: APP_TO_DB[parsed.data.status] as "NEW" | "CONTACTED" | "QUALIFIED" | "CONVERTED" | "DISQUALIFIED",
        data: (parsed.data.data ?? {}) as Record<string, string>,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        notes: parsed.data.notes || null,
        ownerId: parsed.data.ownerId || null,
        contactId: parsed.data.contactId || null,
      },
      select: LEAD_SELECT,
    });

    revalidatePath("/leads");
    return { data: mapLead(row), error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Errore durante l'aggiornamento" };
  }
}

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<{ error: string | null }> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return { error: "Non autorizzato" };

  try {
    await db.lead.update({
      where: { id, organizationId: orgId },
      data: { status: APP_TO_DB[status] as "NEW" | "CONTACTED" | "QUALIFIED" | "CONVERTED" | "DISQUALIFIED" },
    });
    revalidatePath("/leads");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Errore" };
  }
}

export async function deleteLead(id: string): Promise<{ error: string | null }> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return { error: "Non autorizzato" };

  try {
    await db.lead.delete({ where: { id, organizationId: orgId } });
    revalidatePath("/leads");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Errore durante l'eliminazione" };
  }
}

export async function importLeads(
  rows: Array<{
    title: string;
    email?: string | null;
    phone?: string | null;
    source?: string | null;
    status?: string | null;
    score?: number | null;
    notes?: string | null;
    data?: Record<string, unknown>;
  }>
): Promise<{ created: number; skipped: number; error: string | null }> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return { created: 0, skipped: 0, error: "Non autorizzato" };
  if (!rows.length) return { created: 0, skipped: 0, error: null };

  const valid = rows
    .filter((r) => typeof r.title === "string" && r.title.trim())
    .map((r) => ({
      title: r.title.trim(),
      email: r.email?.trim() || null,
      phone: r.phone?.trim() || null,
      source: r.source?.trim() || null,
      status: (APP_TO_DB[r.status?.toUpperCase() ?? ""] ?? "NEW") as "NEW" | "CONTACTED" | "QUALIFIED" | "CONVERTED" | "DISQUALIFIED",
      score: typeof r.score === "number" ? Math.min(100, Math.max(0, Math.round(r.score))) : 0,
      notes: r.notes?.trim() || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: (r.data ?? {}) as any,
      organizationId: orgId,
    }));

  const skipped = rows.length - valid.length;
  if (!valid.length) return { created: 0, skipped, error: "Nessuna riga valida (campo Nome obbligatorio)" };

  try {
    const result = await db.lead.createMany({ data: valid, skipDuplicates: false });
    revalidatePath("/leads");
    return { created: result.count, skipped, error: null };
  } catch (e) {
    return { created: 0, skipped, error: e instanceof Error ? e.message : "Errore durante l'importazione" };
  }
}

export async function deleteLeads(ids: string[]): Promise<{ count: number; error: string | null }> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return { count: 0, error: "Non autorizzato" };
  if (!ids.length) return { count: 0, error: null };

  try {
    const result = await db.lead.deleteMany({
      where: { id: { in: ids }, organizationId: orgId },
    });
    revalidatePath("/leads");
    return { count: result.count, error: null };
  } catch (e) {
    return { count: 0, error: e instanceof Error ? e.message : "Errore durante l'eliminazione" };
  }
}

const convertSchema = z.object({
  dealTitle: z.string().min(1),
  dealValue: z.number().min(0).default(0),
  currency: z.string().default("EUR"),
  createContact: z.boolean().default(false),
  contactFirstName: z.string().optional(),
  contactLastName: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  createCompany: z.boolean().default(false),
  companyName: z.string().optional(),
  companyWebsite: z.string().optional(),
  companySector: z.string().optional(),
  companySize: z.string().optional(),
  productId: z.string().optional(),
  productQuantity: z.number().int().min(1).default(1),
  productUnitPrice: z.number().min(0).optional(),
});

export async function convertLead(
  id: string,
  input: z.infer<typeof convertSchema>
): Promise<{ dealId: string | null; contactId: string | null; companyId: string | null; error: string | null }> {
  const session = await auth();
  const { orgId, userId } = getIds(session);
  if (!session || !orgId || !userId) return { dealId: null, contactId: null, companyId: null, error: "Non autorizzato" };

  const parsed = convertSchema.safeParse(input);
  if (!parsed.success) return { dealId: null, contactId: null, companyId: null, error: "Dati non validi" };

  try {
    const lead = await db.lead.findUnique({ where: { id, organizationId: orgId } });
    if (!lead) return { dealId: null, contactId: null, companyId: null, error: "Lead non trovato" };
    if (lead.status === "CONVERTED") return { dealId: null, contactId: null, companyId: null, error: "Lead già convertito" };

    const pipeline = await db.pipeline.findFirst({
      where: { organizationId: orgId },
      include: { stages: { orderBy: { position: "asc" }, take: 1 } },
    });
    if (!pipeline?.stages[0]) return { dealId: null, contactId: null, companyId: null, error: "Nessuna pipeline configurata" };

    // Optionally create a Company
    let companyId: string | null = null;
    if (parsed.data.createCompany && parsed.data.companyName) {
      const company = await db.company.create({
        data: {
          name: parsed.data.companyName,
          website: parsed.data.companyWebsite || null,
          industry: parsed.data.companySector || null,
          size: parsed.data.companySize || null,
          organizationId: orgId,
        },
      });
      companyId = company.id;
    }

    // Optionally create a Contact (linked to company if created)
    let contactId: string | null = lead.contactId ?? null;
    if (parsed.data.createContact && parsed.data.contactFirstName) {
      const contact = await db.contact.create({
        data: {
          firstName: parsed.data.contactFirstName,
          lastName: parsed.data.contactLastName || null,
          email: parsed.data.contactEmail || lead.email || null,
          phone: parsed.data.contactPhone || lead.phone || null,
          organizationId: orgId,
          ownerId: userId,
          companyId: companyId ?? undefined,
        },
      });
      contactId = contact.id;
    }

    const deal = await db.deal.create({
      data: {
        title: parsed.data.dealTitle,
        value: parsed.data.dealValue,
        currency: parsed.data.currency,
        status: "OPEN",
        pipelineId: pipeline.id,
        stageId: pipeline.stages[0].id,
        organizationId: orgId,
        ownerId: userId,
        contactId: contactId ?? undefined,
        companyId: companyId ?? undefined,
      },
    });

    // Optionally link a product to the deal
    if (parsed.data.productId) {
      let unitPrice = parsed.data.productUnitPrice;
      if (unitPrice === undefined) {
        const product = await db.product.findUnique({ where: { id: parsed.data.productId }, select: { unitPrice: true } });
        unitPrice = product ? Number(product.unitPrice) : 0;
      }
      await db.dealProduct.create({
        data: {
          dealId: deal.id,
          productId: parsed.data.productId,
          quantity: parsed.data.productQuantity ?? 1,
          unitPrice,
          discount: 0,
        },
      });
    }

    await db.lead.update({
      where: { id },
      data: { status: "CONVERTED", convertedDealId: deal.id, contactId: contactId ?? undefined },
    });

    revalidatePath("/leads");
    revalidatePath("/deals");
    revalidatePath("/contacts");
    revalidatePath("/companies");
    return { dealId: deal.id, contactId, companyId, error: null };
  } catch (e) {
    return { dealId: null, contactId: null, companyId: null, error: e instanceof Error ? e.message : "Errore durante la conversione" };
  }
}
