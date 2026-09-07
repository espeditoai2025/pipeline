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
  cents: 2900,
  currency: "eur",
  interval: "month",
} as const;

export function isPlanError(error: string): boolean {
  return error.includes("piano Pro") || error.includes("piano Starter") || error.includes("piano Enterprise");
}

export const PRO_FEATURES = [
  "Pipeline illimitate",
  "Contatti illimitati",
  "AI Assistant integrato",
  "Fino a 100 note vocali (2 minuti ciascuna, 50 MB complessivi)",
  "Trascrizione e comandi CRM: 50 elaborazioni al giorno",
  "Fatture in Cloud in attivazione: fatture ordinarie italiane con IVA in EUR",
  "Automazioni avanzate (workflow)",
  "Email marketing con tracking aperture e click",
  "Configurazione SMTP (Gmail, Aruba, Libero, custom)",
  "Lead Finder: ricerche illimitate, fino a 50 candidati per ricerca",
];

export const STARTER_FEATURES = ["1 pipeline", "Fino a 500 contatti", "Attività e calendario", "Fino a 10 note vocali (2 minuti ciascuna)", "Compilazione aziende da testo e archivio Pipely", "Catalogo prodotti", "Importazione CSV / Excel", "Report vendite ed esportazione CSV", "Lead Finder: 1 ricerca al giorno, fino a 10 candidati", "API REST e webhook per integrazioni"];
export const ENTERPRISE_FEATURES = ["Tutte le funzionalità Pro", "Progetto di adozione da concordare", "Assistenza e condizioni definite nel preventivo"];
export const PLAN_LABELS: Record<PlanTier, string> = { starter: "Starter", pro: "Pro", enterprise: "Enterprise" };
