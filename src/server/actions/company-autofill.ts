"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { crmPermissionError } from "@/lib/crm-permissions";
import { normalizeItalianVat, type CompanySuggestion } from "@/lib/company-autofill";

export async function findCompanySuggestions(query: string): Promise<{ data?: CompanySuggestion[]; error?: string }> {
  const session = await auth();
  const organizationId = (session?.user as { organizationId?: string } | undefined)?.organizationId;
  if (!organizationId || await crmPermissionError(session, "write")) return { error: "Non autorizzato" };
  if (typeof query !== "string" || query.trim().length < 3 || query.length > 200) return { error: "Inserisci almeno 3 caratteri o la partita IVA." };
  const search = query.trim();
  const vat = normalizeItalianVat(search);
  // Parameterized, tenant-scoped normalization also finds old formatted VAT values.
  const ids = /^\d{11}$/.test(vat) ? await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Company" WHERE "organizationId" = ${organizationId}
    AND regexp_replace(upper(coalesce("vatNumber", '')), '[^0-9]', '', 'g') = ${vat} LIMIT 8
  ` : null;
  const companies = await db.company.findMany({
    where: { organizationId, ...(ids ? { id: { in: ids.map(row => row.id) } } : { name: { contains: search, mode: "insensitive" } }) },
    select: { name: true, vatNumber: true, email: true, phone: true, website: true, address: true, city: true, country: true },
    orderBy: { updatedAt: "desc" }, take: 8,
  });
  return { data: companies.map(company => ({
    source: "Azienda giÃ  in Pipely: " + company.name,
    fields: Object.fromEntries(Object.entries(company).filter(([, value]) => Boolean(value))) as CompanySuggestion["fields"],
    warnings: ["Dati del tuo archivio, non verificati con il Registro Imprese."],
  })) };
}
