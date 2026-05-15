import { db } from "./db";
import type { Plan } from "../generated/prisma/enums";

// ─── Tier mapping (old enum values → current tiers) ──────────────────────────

export type PlanTier = "starter" | "pro" | "enterprise";

const TIER_MAP: Record<string, PlanTier> = {
  STARTER: "starter",
  FREE: "starter",
  ESSENTIAL: "pro",
  ADVANCED: "pro",
  PROFESSIONAL: "pro",
  PRO: "pro",
  ENTERPRISE: "enterprise",
};

export function getTier(plan: Plan | string): PlanTier {
  return TIER_MAP[plan as string] ?? "starter";
}

// ─── Limits per tier ─────────────────────────────────────────────────────────

export type PlanLimits = {
  maxPipelines: number | null; // null = unlimited
  maxContacts: number | null;
  ai: boolean;
  automations: boolean;
  emailCampaigns: boolean;
  smtp: boolean;
  leadFinderPerDay: number | null; // null = unlimited; 0 = no access
  leadFinderMaxResults: number;
};

export const LIMITS: Record<PlanTier, PlanLimits> = {
  starter: {
    maxPipelines: 1,
    maxContacts: 500,
    ai: false,
    automations: false,
    emailCampaigns: false,
    smtp: false,
    leadFinderPerDay: 1,
    leadFinderMaxResults: 10,
  },
  pro: {
    maxPipelines: null,
    maxContacts: null,
    ai: true,
    automations: true,
    emailCampaigns: true,
    smtp: true,
    leadFinderPerDay: null,
    leadFinderMaxResults: 20,
  },
  enterprise: {
    maxPipelines: null,
    maxContacts: null,
    ai: true,
    automations: true,
    emailCampaigns: true,
    smtp: true,
    leadFinderPerDay: null,
    leadFinderMaxResults: 20,
  },
};

export function getLimits(plan: Plan | string): PlanLimits {
  return LIMITS[getTier(plan)];
}

// ─── DB helper ───────────────────────────────────────────────────────────────

export async function getOrgPlan(orgId: string): Promise<Plan> {
  const org = await db.organization.findUnique({ where: { id: orgId }, select: { plan: true } });
  return (org?.plan ?? "STARTER") as Plan;
}

// ─── Gate helper — returns error string or null ───────────────────────────────

export type FeatureKey = keyof PlanLimits;

const FEATURE_LABELS: Record<FeatureKey, string> = {
  maxPipelines: "Pipeline multiple",
  maxContacts: "Contatti illimitati",
  ai: "AI Assistant",
  automations: "Automazioni",
  emailCampaigns: "Campagne email",
  smtp: "Configurazione email SMTP",
  leadFinderPerDay: "Lead Finder ricerche giornaliere",
  leadFinderMaxResults: "Lead Finder candidati per ricerca",
};

export function checkFeature(plan: Plan | string, feature: FeatureKey): string | null {
  const limits = getLimits(plan);
  const value = limits[feature];
  const allowed = typeof value === "boolean" ? value : value !== null;
  if (allowed) return null;
  return `${FEATURE_LABELS[feature]} è disponibile dal piano Pro.`;
}

export function checkContactLimit(plan: Plan | string, currentCount: number, adding = 1): string | null {
  const { maxContacts } = getLimits(plan);
  if (maxContacts === null) return null;
  if (currentCount + adding > maxContacts) {
    return `Hai raggiunto il limite di ${maxContacts} contatti del piano Starter. Passa a Pro per contatti illimitati.`;
  }
  return null;
}

export function checkPipelineLimit(plan: Plan | string, currentCount: number): string | null {
  const { maxPipelines } = getLimits(plan);
  if (maxPipelines === null) return null;
  if (currentCount >= maxPipelines) {
    return `Il piano Starter include 1 sola pipeline. Passa a Pro per pipeline illimitate.`;
  }
  return null;
}

export { isPlanError, PRO_FEATURES } from "./plan-client";
