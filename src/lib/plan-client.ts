// Client-safe plan helpers — no DB imports

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
