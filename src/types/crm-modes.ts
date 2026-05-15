export type CrmModeId = "CLASSIC" | "IMMOBILIARE" | "ASSICURAZIONI" | "ECOMMERCE";

export type CrmMode = {
  id: CrmModeId;
  name: string;
  description: string;
  category: string;
  color: string;
  emoji: string;
  features: string[];
  dealLabel: string;
  leadLabel: string;
  hint: string;
  comingSoon?: string;  // etichetta "prossimamente" per features settore-specifiche
};

const BASE_FEATURES = [
  "Pipeline deal flessibile",
  "Contatti, aziende e lead",
  "Attività e follow-up",
  "Campi personalizzati",
  "Report avanzati",
  "Email integrata",
];

export const CRM_MODES: Record<CrmModeId, CrmMode> = {
  CLASSIC: {
    id: "CLASSIC",
    name: "Classic",
    description: "CRM generico per team di vendita B2B — adatto a PMI, agenzie, consulenti, startup e reti commerciali",
    category: "Generico",
    color: "blue",
    emoji: "🏢",
    features: BASE_FEATURES,
    dealLabel: "Affare",
    leadLabel: "Lead",
    hint: "CRM generico B2B",
  },
  IMMOBILIARE: {
    id: "IMMOBILIARE",
    name: "Immobiliare",
    description: "Per agenti e agenzie immobiliari: compravendite, affitti, acquirenti e venditori in un'unica pipeline",
    category: "Real Estate",
    color: "orange",
    emoji: "🏠",
    features: [
      "Pipeline compravendite e affitti",
      "Database acquirenti e venditori",
      "Follow-up visite e appuntamenti",
      "Campi personalizzati (budget, preferenze)",
      "Report provvigioni e forecast",
      "Email integrata",
      "🔧 Schede immobile collegate (prossimamente)",
      "🔧 Promemoria scadenze e rogiti (prossimamente)",
    ],
    dealLabel: "Trattativa",
    leadLabel: "Acquirente / Venditore",
    hint: "Agenzie immobiliari",
    comingSoon: "Schede immobile, scadenze rogiti, promemoria rinnovi affitti",
  },
  ASSICURAZIONI: {
    id: "ASSICURAZIONI",
    name: "Assicurazioni",
    description: "Per agenti e broker assicurativi: polizze, rinnovi e scadenziario",
    category: "Assicurazioni",
    color: "teal",
    emoji: "🛡️",
    features: [
      ...BASE_FEATURES,
      "🔧 Gestione polizze e rinnovi (prossimamente)",
      "🔧 Scadenzario automatico polizze (prossimamente)",
    ],
    dealLabel: "Polizza",
    leadLabel: "Candidato assicurato",
    hint: "Agenti e broker assicurativi",
    comingSoon: "Gestione polizze, rinnovi automatici e scadenzario",
  },
  ECOMMERCE: {
    id: "ECOMMERCE",
    name: "E-commerce & Retail",
    description: "Per negozi online e retail: clienti, ordini e pipeline B2B wholesale",
    category: "E-commerce",
    color: "rose",
    emoji: "🛒",
    features: [
      ...BASE_FEATURES,
      "🔧 Segmentazione clienti per LTV (prossimamente)",
      "🔧 Pipeline B2B wholesale (prossimamente)",
    ],
    dealLabel: "Ordine / contratto",
    leadLabel: "Nuovo cliente",
    hint: "E-commerce e retail",
    comingSoon: "Segmentazione LTV, storico ordini e pipeline wholesale",
  },
};

export const DEFAULT_MODE: CrmModeId = "CLASSIC";
