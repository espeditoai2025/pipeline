// Client-safe plan helpers — no DB imports

// ─── Tier mapping (old enum values → current tiers) ──────────────────────────
// Unica fonte di verita, riusata da plan.ts (server) e dalla UI: i piani legacy
// ESSENTIAL/ADVANCED/PROFESSIONAL sono Pro a tutti gli effetti.

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

export function getTier(plan: string): PlanTier {
  return TIER_MAP[plan] ?? "starter";
}

/** Ordine crescente dei tier, per confrontare piano attuale e piano target. */
export const TIER_RANK: Record<PlanTier, number> = {
  starter: 0,
  pro: 1,
  enterprise: 2,
};

export const PRO_PRICING = {
  monthly: "€29",
  monthlyFull: "€99",
  yearly: "€290",
  yearlyNote: "2 mesi omaggio",
} as const;

export function isPlanError(error: string): boolean {
  return error.includes("piano Pro") || error.includes("piano Starter") || error.includes("piano Enterprise");
}

export const PRO_FEATURES = [
  "Pipeline illimitate",
  "Contatti illimitati",
  "AI Assistant integrato",
  "Automazioni avanzate (workflow)",
  "Email marketing con tracking aperture e click",
  "Configurazione SMTP (Gmail, Aruba, Libero, custom)",
  "Report personalizzati",
];
