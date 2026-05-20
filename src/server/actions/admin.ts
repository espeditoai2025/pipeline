"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function isAdmin(email: string | null | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    // ADMIN_EMAIL non configurata: fail closed — nessuno è admin
    return false;
  }
  return email === adminEmail;
}

async function requireAdmin(): Promise<boolean> {
  const session = await auth();
  if (!session?.user) return false;
  return isAdmin((session.user as { email?: string }).email);
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

// ─── Delete organization ───────────────────────────────────────────────────────

export async function deleteOrganization(orgId: string): Promise<{ error: string | null }> {
  if (!(await requireAdmin())) return { error: "Non autorizzato" };
  await db.organization.delete({ where: { id: orgId } });
  revalidatePath("/admin/organizations");
  return { error: null };
}

// ─── Global users list ────────────────────────────────────────────────────────

export type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  orgId: string;
  orgName: string;
  orgPlan: string;
  createdAt: string;
};

export async function getAdminUsers(): Promise<AdminUser[] | null> {
  if (!(await requireAdmin())) return null;
  const rows = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, email: true, role: true, createdAt: true,
      organization: { select: { id: true, name: true, plan: true } },
    },
  });
  return rows.map((u) => ({
    id: u.id, name: u.name, email: u.email, role: u.role,
    orgId: u.organization.id, orgName: u.organization.name, orgPlan: u.organization.plan,
    createdAt: u.createdAt.toISOString(),
  }));
}

// ─── Workflow execution logs ──────────────────────────────────────────────────

export type AdminWorkflowLog = {
  id: string;
  workflowId: string;
  workflowName: string;
  orgId: string;
  orgName: string;
  status: string;
  trigger: string;
  entityLabel: string;
  startedAt: string;
  finishedAt: string | null;
};

export async function getAdminWorkflowLogs(limit = 100): Promise<AdminWorkflowLog[] | null> {
  if (!(await requireAdmin())) return null;
  const rows = await db.workflowExecution.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
    include: {
      workflow: { select: { name: true, organizationId: true, organization: { select: { name: true } } } },
    },
  });
  return rows.map((r) => {
    const payload = r.payload as Record<string, string>;
    return {
      id: r.id,
      workflowId: r.workflowId,
      workflowName: r.workflow.name,
      orgId: r.workflow.organizationId,
      orgName: r.workflow.organization.name,
      status: r.status,
      trigger: payload.trigger ?? "",
      entityLabel: payload.entityLabel ?? "",
      startedAt: r.startedAt.toISOString(),
      finishedAt: r.finishedAt?.toISOString() ?? null,
    };
  });
}

// ─── Global campaigns ─────────────────────────────────────────────────────────

export type AdminCampaign = {
  id: string;
  name: string;
  subject: string;
  status: string;
  orgId: string;
  orgName: string;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  openRate: number;
  clickRate: number;
  sentAt: string | null;
  createdAt: string;
};

export async function getAdminCampaigns(): Promise<AdminCampaign[] | null> {
  if (!(await requireAdmin())) return null;
  const rows = await db.emailCampaign.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, subject: true, status: true,
      totalSent: true, totalOpened: true, totalClicked: true,
      sentAt: true, createdAt: true,
      organization: { select: { id: true, name: true } },
    },
  });
  return rows.map((c) => ({
    id: c.id, name: c.name, subject: c.subject, status: c.status,
    orgId: c.organization.id, orgName: c.organization.name,
    totalSent: c.totalSent, totalOpened: c.totalOpened, totalClicked: c.totalClicked,
    openRate: c.totalSent > 0 ? Math.round((c.totalOpened / c.totalSent) * 100) : 0,
    clickRate: c.totalSent > 0 ? Math.round((c.totalClicked / c.totalSent) * 100) : 0,
    sentAt: c.sentAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
  }));
}

// ─── MRR / plan distribution ──────────────────────────────────────────────────

export type AdminPlanStats = {
  distribution: { plan: string; count: number; mrr: number }[];
  totalMrr: number;
  totalOrgs: number;
};

const MRR_BY_PLAN: Record<string, number> = { STARTER: 0, FREE: 0, PRO: 29, PROFESSIONAL: 29, ADVANCED: 29, ESSENTIAL: 29, ENTERPRISE: 99 };

export async function getAdminPlanStats(): Promise<AdminPlanStats | null> {
  if (!(await requireAdmin())) return null;
  const groups = await db.organization.groupBy({ by: ["plan"], _count: { id: true } });
  const distribution = groups.map((g) => ({
    plan: g.plan, count: g._count.id, mrr: (MRR_BY_PLAN[g.plan] ?? 0) * g._count.id,
  }));
  const totalMrr = distribution.reduce((s, d) => s + d.mrr, 0);
  const totalOrgs = distribution.reduce((s, d) => s + d.count, 0);
  return { distribution, totalMrr, totalOrgs };
}
