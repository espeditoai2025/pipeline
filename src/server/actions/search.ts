"use server";

import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function getOrgId(s: Session | null) {
  return (s?.user as { organizationId?: string } | undefined)?.organizationId ?? null;
}

export type SearchResult = {
  id: string;
  type: "contact" | "deal" | "company" | "lead";
  title: string;
  subtitle: string;
  href: string;
};

export async function globalSearch(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return [];

  const [contacts, deals, companies, leads] = await Promise.all([
    db.contact.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName:  { contains: q, mode: "insensitive" } },
          { email:     { contains: q, mode: "insensitive" } },
          { phone:     { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true },
      take: 5,
    }),
    db.deal.findMany({
      where: {
        organizationId: orgId,
        status: "OPEN",
        title: { contains: q, mode: "insensitive" },
      },
      select: { id: true, title: true, value: true, stage: { select: { name: true } } },
      take: 5,
    }),
    db.company.findMany({
      where: {
        organizationId: orgId,
        name: { contains: q, mode: "insensitive" },
      },
      select: { id: true, name: true, industry: true },
      take: 4,
    }),
    db.lead.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, title: true, email: true, source: true },
      take: 4,
    }),
  ]);

  const results: SearchResult[] = [];

  contacts.forEach((c) => results.push({
    id: c.id, type: "contact",
    title: `${c.firstName} ${c.lastName}`.trim() || c.email || "—",
    subtitle: [c.jobTitle, c.email].filter(Boolean).join(" · "),
    href: `/contacts/${c.id}`,
  }));

  deals.forEach((d) => results.push({
    id: d.id, type: "deal",
    title: d.title,
    subtitle: [d.stage?.name, d.value ? `€${Number(d.value).toLocaleString("it-IT")}` : null].filter(Boolean).join(" · "),
    href: `/deals/${d.id}`,
  }));

  companies.forEach((c) => results.push({
    id: c.id, type: "company",
    title: c.name,
    subtitle: c.industry ?? "Azienda",
    href: `/companies/${c.id}`,
  }));

  leads.forEach((l) => results.push({
    id: l.id, type: "lead",
    title: l.title,
    subtitle: [l.source, l.email].filter(Boolean).join(" · "),
    href: `/leads/${l.id}`,
  }));

  return results;
}
