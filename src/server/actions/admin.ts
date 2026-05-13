"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function isAdmin(email: string | null | undefined) {
  const adminEmail = process.env.ADMIN_EMAIL;
  return !!adminEmail && email === adminEmail;
}

async function requireAdmin() {
  const session = await auth();
  return isAdmin((session?.user as { email?: string } | undefined)?.email);
}

// ─── Plan management ──────────────────────────────────────────────────────────

export type AdminPlan = "STARTER" | "PRO" | "ENTERPRISE";

export async function updateOrgPlan(orgId: string, plan: AdminPlan): Promise<{ error: string | null }> {
  if (!(await requireAdmin())) return { error: "Non autorizzato" };
  if (!["STARTER", "PRO", "ENTERPRISE"].includes(plan)) return { error: "Piano non valido" };

  await db.organization.update({ where: { id: orgId }, data: { plan } });
  revalidatePath(`/admin/organizations/${orgId}`);
  revalidatePath("/admin/organizations");
  return { error: null };
}

// ─── Overview ─────────────────────────────────────────────────────────────────

export type AdminOverview = {
  totalOrgs: number;
  totalUsers: number;
  totalDeals: number;
  totalCampaignsSent: number;
  newOrgsLast30: number;
  orgsWithSmtp: number;
  signupsByDay: { date: string; count: number }[];
  topOrgs: { id: string; name: string; plan: string; dealCount: number; contactCount: number; userCount: number }[];
  recentOrgs: { id: string; name: string; slug: string; plan: string; ownerEmail: string | null; createdAt: string }[];
};

export async function getAdminOverview(): Promise<AdminOverview | null> {
  if (!(await requireAdmin())) return null;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400_000);

  const [totalOrgs, totalUsers, totalDeals, totalCampaignsSent, newOrgsLast30, orgsWithSmtp, recentRaw, topRaw] =
    await Promise.all([
      db.organization.count(),
      db.user.count(),
      db.deal.count(),
      db.emailCampaign.count({ where: { status: "SENT" } }),
      db.organization.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      db.smtpConfig.count(),
      db.organization.findMany({
        orderBy: { createdAt: "desc" },
        take: 60,
        select: {
          id: true, name: true, slug: true, plan: true, createdAt: true,
          users: { where: { role: "OWNER" }, select: { email: true }, take: 1 },
        },
      }),
      db.organization.findMany({
        orderBy: { deals: { _count: "desc" } },
        take: 5,
        select: {
          id: true, name: true, plan: true,
          _count: { select: { deals: true, contacts: true, users: true } },
        },
      }),
    ]);

  // Signup chart — last 30 days
  const signupsByDay: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400_000);
    const key = d.toISOString().slice(0, 10);
    signupsByDay.push({
      date: key,
      count: recentRaw.filter((o) => o.createdAt.toISOString().slice(0, 10) === key).length,
    });
  }

  return {
    totalOrgs,
    totalUsers,
    totalDeals,
    totalCampaignsSent,
    newOrgsLast30,
    orgsWithSmtp,
    signupsByDay,
    topOrgs: topRaw.map((o) => ({
      id: o.id, name: o.name, plan: o.plan,
      dealCount: o._count.deals, contactCount: o._count.contacts, userCount: o._count.users,
    })),
    recentOrgs: recentRaw.slice(0, 10).map((o) => ({
      id: o.id, name: o.name, slug: o.slug, plan: o.plan,
      ownerEmail: o.users[0]?.email ?? null,
      createdAt: o.createdAt.toISOString(),
    })),
  };
}

// ─── Organizations list ────────────────────────────────────────────────────────

export type AdminOrg = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  ownerEmail: string | null;
  userCount: number;
  dealCount: number;
  contactCount: number;
  campaignsSent: number;
  hasSmtp: boolean;
  createdAt: string;
};

export async function getAdminOrganizations(): Promise<AdminOrg[] | null> {
  if (!(await requireAdmin())) return null;

  const rows = await db.organization.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, slug: true, plan: true, createdAt: true,
      smtpConfig: { select: { id: true } },
      users: { where: { role: "OWNER" }, select: { email: true }, take: 1 },
      _count: { select: { users: true, deals: true, contacts: true } },
    },
  });

  const campaignCounts = await db.emailCampaign.groupBy({
    by: ["organizationId"],
    where: { status: "SENT" },
    _count: { id: true },
  });
  const campaignMap = new Map(campaignCounts.map((r) => [r.organizationId, r._count.id]));

  return rows.map((o) => ({
    id: o.id, name: o.name, slug: o.slug, plan: o.plan,
    ownerEmail: o.users[0]?.email ?? null,
    userCount: o._count.users,
    dealCount: o._count.deals,
    contactCount: o._count.contacts,
    campaignsSent: campaignMap.get(o.id) ?? 0,
    hasSmtp: o.smtpConfig !== null,
    createdAt: o.createdAt.toISOString(),
  }));
}

// ─── Org detail ───────────────────────────────────────────────────────────────

export type AdminOrgDetail = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
  hasSmtp: boolean;
  users: { id: string; name: string | null; email: string; role: string; createdAt: string }[];
  stats: {
    deals: number; contacts: number; companies: number; activities: number;
    products: number; workflows: number; emailLists: number; campaigns: number; campaignsSent: number;
  };
};

export async function getAdminOrgDetail(id: string): Promise<AdminOrgDetail | null> {
  if (!(await requireAdmin())) return null;

  const org = await db.organization.findUnique({
    where: { id },
    include: {
      users: { orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, role: true, createdAt: true } },
      smtpConfig: { select: { id: true } },
      _count: {
        select: {
          deals: true, contacts: true, companies: true, activities: true,
          products: true, workflows: true, emailLists: true, emailCampaigns: true,
        },
      },
    },
  });
  if (!org) return null;

  const campaignsSent = await db.emailCampaign.count({ where: { organizationId: id, status: "SENT" } });

  return {
    id: org.id, name: org.name, slug: org.slug, plan: org.plan,
    createdAt: org.createdAt.toISOString(),
    hasSmtp: org.smtpConfig !== null,
    users: org.users.map((u) => ({
      id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt.toISOString(),
    })),
    stats: {
      deals: org._count.deals, contacts: org._count.contacts, companies: org._count.companies,
      activities: org._count.activities, products: org._count.products, workflows: org._count.workflows,
      emailLists: org._count.emailLists, campaigns: org._count.emailCampaigns, campaignsSent,
    },
  };
}
