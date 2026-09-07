// Deliberately local: no network, AI, inferred revenue or registry lookups.
export const companyFieldLabels = {
  name: "Ragione sociale", vatNumber: "Partita IVA", email: "Email", phone: "Telefono",
  website: "Sito web", address: "Indirizzo", city: "Città", country: "Paese",
} as const;
export type CompanyField = keyof typeof companyFieldLabels;
export type CompanySuggestion = { source: string; fields: Partial<Record<CompanyField, string>>; warnings: string[] };

export function normalizeItalianVat(value: string) {
  return value.toUpperCase().replace(/^\s*IT/, "").replace(/[\s.\-]/g, "");
}
export function isValidItalianVat(value: string) {
  const vat = normalizeItalianVat(value);
  if (!/^\d{11}$/.test(vat) || /^0+$/.test(vat)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let digit = Number(vat[i]) * (i % 2 === 0 ? 1 : 2);
    if (digit > 9) digit -= 9;
    sum += digit;
  }
  return (10 - sum % 10) % 10 === Number(vat[10]);
}

export function extractCompanyText(text: string): CompanySuggestion {
  const fields: CompanySuggestion["fields"] = {};
  const warnings: string[] = [];
  const lines = text.slice(0, 20000).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const labelled: [CompanyField, RegExp][] = [
    ["name", /^(?:ragione sociale|denominazione|azienda)\s*[:=]\s*(.+)$/i],
    ["address", /^(?:indirizzo|sede(?: legale)?)\s*[:=]\s*(.+)$/i],
    ["city", /^(?:città|citta|comune)\s*[:=]\s*(.+)$/i],
    ["country", /^(?:paese|nazione)\s*[:=]\s*(.+)$/i],
    ["phone", /^(?:telefono|tel\.?|cellulare|cell\.?)\s*[:=]\s*([+\d][\d\s().-]{5,30})$/i],
  ];
  for (const [field, pattern] of labelled) {
    const matches = [...new Set(lines.flatMap(line => line.match(pattern)?.[1]?.trim() ?? []))];
    if (matches.length === 1) fields[field] = matches[0]!.slice(0, 200);
    else if (matches.length > 1) warnings.push("Più valori per " + companyFieldLabels[field] + ": scegli quello corretto nel modulo.");
  }
  const vats = [...new Set([...text.matchAll(/(?:p\.?\s*iva|partita\s+iva|vat(?:\s+number)?)\s*[:=]?\s*((?:IT\s*)?\d(?:[\s.-]?\d){10})(?!\d)/gi)].map(m => normalizeItalianVat(m[1]!)))];
  if (vats.length === 1) {
    if (isValidItalianVat(vats[0]!)) fields.vatNumber = vats[0];
    else warnings.push("La partita IVA non supera il controllo formale: verificala nel documento originale.");
  } else if (vats.length > 1) warnings.push("Sono presenti più partite IVA: nessuna è stata scelta automaticamente.");
  const withoutUrls = text.replace(/https?:\/\/[^\s<>"']+/gi, "");
  const emails = [...new Set(withoutUrls.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [])];
  if (emails.length === 1) fields.email = emails[0];
  else if (emails.length > 1) warnings.push("Sono presenti più email: scegli quella aziendale nel modulo.");
  const sites = [...new Set((text.match(/https?:\/\/[^\s<>"']+/gi) ?? []).map(url => url.replace(/[.,;)]+$/, "")))];
  if (sites.length === 1) {
    try { const url = new URL(sites[0]!); if (!url.username && !url.password) fields.website = url.href; } catch { /* No guesses. */ }
  }
  return { source: "Testo incollato — elaborato nel browser", fields, warnings };
}
