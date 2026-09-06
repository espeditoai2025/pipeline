// Pure helpers for the Lead Finder pipeline. Kept outside the "use server" module so
// they can be unit-tested and reused without becoming server actions.

const FAKE_EMAIL_PATTERNS = ["acme", "example", "test", "placeholder", "yourcompany", "nomeazienda", "company.it", "azienda.it", "dominio", "pippo", "prova"];
// Real mailboxes nobody sells to: privacy desks, technical contacts, automated senders.
const LOW_VALUE_MAILBOX = /^(privacy|dpo|gdpr|noreply|no-reply|donotreply|do-not-reply|postmaster|webmaster|abuse|cookie|cookies|unsubscribe|newsletter|press|ufficiostampa|ufficio-stampa|ufficio.stampa|media)(@|[._-])/;

export function sanitizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const lower = email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(lower)) return null;
  if (FAKE_EMAIL_PATTERNS.some((p) => lower.includes(p))) return null;
  if (LOW_VALUE_MAILBOX.test(lower)) return null;
  return lower;
}

export function sanitizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6 || digits.length > 13) return null;
  if (/^(\d)\1{5,}$/.test(digits)) return null; // all identical digits (e.g. 000000)
  return phone.trim();
}

export function completenessScore(hasEmail: boolean, hasPhone: boolean, hasWebsite: boolean, hasContact: boolean): number {
  return Math.min(100, 65 + (hasEmail ? 15 : 0) + (hasPhone ? 10 : 0) + (hasWebsite ? 5 : 0) + (hasContact ? 5 : 0));
}

// ─── Company names ─────────────────────────────────────────────────────────

const COMPANY_SUFFIXES = /\b(s\.?r\.?l\.?s?|s\.?p\.?a\.?|s\.?n\.?c\.?|s\.?a\.?s\.?|s\.?s\.?|s\.?c\.?a\.?r\.?l\.?|ltd|soc\s+coop|cooperativa|onlus|aps|odv)\b\.?/gi;

/** Key used to decide that two names refer to the same company: case, accents, suffixes and punctuation removed. */
export function dedupeKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(COMPANY_SUFFIXES, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Display normalisation: Title Case with Italian particles kept lowercase (not when they are initials like "E."). */
export function normalizeCompanyName(raw: string): string {
  return raw
    // Registry names carry the abbreviated form in brackets: "Sanpellegrino Spa (ovvero in forma abbreviata Sa.Pe. Spa)"
    .replace(/\s*\((?:ovvero|in forma abbreviata|in breve|o in breve|abbreviabile|abbreviata)[^)]*\)/gi, "")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/(?<!^)\b(Di|Del|Della|Dei|Degli|Delle|Da|In|E)\b(?!\.)/g, (m) => m.toLowerCase());
}

// Words that appear in thousands of company names and prove nothing about identity.
const NAME_STOPWORDS = new Set([
  "spa", "srl", "srls", "sas", "snc", "sapa", "scarl", "scrl", "societa", "coop", "cooperativa", "unipersonale", "semplificata",
  "limited", "gmbh", "group", "gruppo", "holding", "partecipazioni", "italia", "italy", "italiana", "italiano", "international",
  "internazionale", "company", "industria", "industrie", "industries", "industrial", "industriale", "industriali", "technologies",
  "technology", "tecnologie", "tecnologia", "officine", "officina", "fratelli", "costruzioni", "lavorazioni", "meccanica",
  "meccaniche", "impianti", "servizi", "service", "services", "commerciale", "engineering", "solutions", "systems", "sistemi",
  "europe", "europa", "nuova", "nuove", "della", "delle", "degli", "manifattura", "manifatture", "produzione", "produzioni",
]);

/** The most distinctive word of a company name, used to check that a website really talks about it. */
export function companyNameToken(name: string): string | null {
  const words = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((w) => w.length >= 4 && !NAME_STOPWORDS.has(w));
  if (words.length === 0) return null;
  return words.reduce((best, w) => (w.length > best.length ? w : best));
}

/** URLs to try when checking that a site exists: sites often answer only with or only without "www.". */
export function websiteVariants(website: string): string[] {
  const raw = website.trim().replace(/\/+$/, "");
  const m = /^(https?):\/\/(www\.)?([^/]+)$/i.exec(raw);
  if (!m) return [raw];
  const host = m[3]!.toLowerCase();
  const preferred = m[2] ? `www.${host}` : host;
  const other = m[2] ? host : `www.${host}`;
  return [...new Set([`https://${preferred}`, `https://${other}`, `http://${preferred}`, `http://${other}`])];
}

// ─── Websites and e-mail plausibility ──────────────────────────────────────

/** Host of a website without protocol, "www." or path; null when unparsable. */
export function websiteDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim().toLowerCase();
  if (!trimmed) return null;
  try {
    const host = new URL(/^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`).hostname;
    const clean = host.replace(/^www\./, "");
    return clean.includes(".") ? clean : null;
  } catch {
    return null;
  }
}

const GENERIC_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.it", "yahoo.com", "hotmail.it", "hotmail.com", "outlook.it", "outlook.com",
  "live.it", "live.com", "msn.com", "icloud.com", "me.com", "libero.it", "virgilio.it", "alice.it", "tin.it", "tiscali.it",
  "email.it", "fastwebnet.it", "inwind.it", "iol.it", "aruba.it", "protonmail.com", "proton.me", "pec.it",
]);

/**
 * An address suggested by a language model is kept only when it can belong to the company:
 * same domain as the website (or a subdomain), a personal/generic provider, or a PEC domain.
 * Addresses scraped from the company site or from INI-PEC are trusted and never pass through here.
 */
export function emailPlausibleForCompany(email: string, website: string | null | undefined): boolean {
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  const emailDomain = email.slice(at + 1).toLowerCase();
  if (GENERIC_EMAIL_DOMAINS.has(emailDomain) || /(^|\.)pec\./.test(emailDomain) || emailDomain.includes("pec") || emailDomain.includes("legalmail") || emailDomain.includes("postecert")) return true;
  const site = websiteDomain(website);
  if (!site) return true; // nothing to compare against: rely on the sanitiser only
  return emailDomain === site || emailDomain.endsWith(`.${site}`) || site.endsWith(`.${emailDomain}`);
}

const NOT_A_COMPANY_SITE = /(^|\.)(facebook|instagram|linkedin|twitter|x|youtube|tiktok|google|goo|paginegialle|paginebianche|fatturatoitalia|ufficiocamerale|reportaziende|registroimprese|infocamere|companyreports|aziende\.info|wikipedia|yelp|tripadvisor|trustpilot|amazon|ebay|subito|immobiliare|virgilio|libero|tuttocitta|cylex|europages|kompass|dnb|bing|yahoo)\.(com|it|eu|net|org|info|io)$/i;

/** Website proposed by a model or found on a page: canonical "https://host" or null when it is not a company site. */
export function normalizeWebsite(value: string | null | undefined): string | null {
  const domain = websiteDomain(value);
  if (!domain || NOT_A_COMPANY_SITE.test(domain)) return null;
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(domain)) return null;
  return `https://${domain}`;
}

/** Italian phone numbers in E.164 ("+39035560111"); other countries only when an explicit prefix is present. */
export function normalizeItalianPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = raw.trim().replace(/[^\d+]/g, "");
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  if (s.startsWith("+")) {
    const digits = s.slice(1).replace(/\D/g, "");
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }
  if (/^39\d{9,11}$/.test(s)) return `+${s}`;
  if (/^[03]\d{5,10}$/.test(s)) return `+39${s}`;
  return null;
}

export function formatPhoneForDisplay(e164: string | null | undefined): string | null {
  if (!e164) return null;
  return e164.startsWith("+39") ? `+39 ${e164.slice(3)}` : e164;
}

// ─── Deterministic filters on registry data ────────────────────────────────

export type EmployeeRange = { min: number; max: number };

/** "oltre 1000" -> 1000..∞, "da 50 a 99" -> 50..99, "fino a 5" -> 0..5, "11-50" -> 11..50, "1000+" -> 1000..∞ */
export function employeeRange(text: string | null | undefined): EmployeeRange | null {
  if (!text) return null;
  const t = text.toLowerCase().replace(/\./g, "").trim();
  let m = t.match(/(?:oltre|più di|piu di|>)\s*(\d+)/);
  if (m) return { min: Number(m[1]) + (t.startsWith("oltre") || t.includes("più") || t.includes("piu") ? 1 : 0), max: Infinity };
  m = t.match(/^(\d+)\s*\+$/);
  if (m) return { min: Number(m[1]), max: Infinity };
  m = t.match(/(?:da\s*)?(\d+)\s*(?:a|-|–)\s*(\d+)/);
  if (m) return { min: Number(m[1]), max: Number(m[2]) };
  m = t.match(/(?:fino a|meno di|<)\s*(\d+)/);
  if (m) return { min: 0, max: Number(m[1]) };
  m = t.match(/^(\d+)$/);
  if (m) return { min: Number(m[1]), max: Number(m[1]) };
  return null;
}

/** true/false when both sides are known, null when either is unknown (never discard on missing data). */
export function sizeMatches(requestedBand: string | null | undefined, registryText: string | null | undefined): boolean | null {
  const wanted = employeeRange(requestedBand);
  const actual = employeeRange(registryText);
  if (!wanted || !actual) return null;
  return actual.min <= wanted.max && actual.max >= wanted.min;
}

// ATECO 2007 divisions (first two digits, optionally a group) for each sector of the search form.
const SECTOR_ATECO: Record<string, string[]> = {
  "Tecnologia / Software": ["26", "58.2", "61", "62", "63", "95.1"],
  "Manifattura / Industria": ["10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33"],
  "Retail / E-commerce": ["45.1", "45.3", "45.4", "47"],
  "Finanza / Banche / Assicurazioni": ["64", "65", "66"],
  "Sanità / Medicale": ["21", "32.5", "75", "86", "87", "88"],
  "Consulenza / Servizi Professionali": ["69", "70", "71", "72", "73", "74", "78", "82"],
  "Immobiliare / Costruzioni": ["41", "42", "43", "68"],
  "Trasporti / Logistica": ["49", "50", "51", "52", "53"],
  "Energia / Utilities": ["35", "36", "37", "38", "39"],
  "Formazione / Education": ["85"],
  "Marketing / Pubblicità": ["58", "59", "60", "63", "73"],
  "Turismo / Ospitalità": ["55", "56", "79", "93"],
  "Alimentare / Agroalimentare": ["01", "02", "03", "10", "11", "46.3", "47.2", "56"],
};

/** true/false when the sector has an ATECO mapping and the company has a code; null otherwise. */
export function atecoMatchesSector(ateco: string | null | undefined, sector: string | null | undefined): boolean | null {
  if (!sector || !ateco) return null;
  const prefixes = SECTOR_ATECO[sector];
  if (!prefixes) return null;
  const code = ateco.trim().replace(/[^\d.]/g, "");
  if (!/^\d{2}/.test(code)) return null;
  return prefixes.some((p) => code === p || code.startsWith(p.includes(".") ? p : `${p}.`) || (!p.includes(".") && code.startsWith(p) && (code.length === 2 || code[2] === ".")));
}

export function isLinkedInUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return /^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\/(in|company)\/[A-Za-z0-9_%.-]+\/?$/i.test(v) ? v : null;
}

// ─── Model output parsing ──────────────────────────────────────────────────

/**
 * Extracts a JSON array of objects from a model reply. Tolerates code fences and, when the array
 * was truncated by the token limit, salvages the objects that were closed before the cut.
 */
export function parseJsonArrayLenient(raw: string): Array<Record<string, unknown>> {
  const stripped = raw.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
  const start = stripped.indexOf("[");
  if (start < 0) throw new Error(`Risposta AI non valida: nessun array JSON trovato. Risposta: ${raw.slice(0, 300)}`);
  const end = stripped.lastIndexOf("]");
  if (end > start) {
    try {
      const parsed = JSON.parse(stripped.slice(start, end + 1));
      if (Array.isArray(parsed)) return parsed.filter((x): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x));
    } catch { /* fall through to salvage */ }
  }
  const objects: Array<Record<string, unknown>> = [];
  let depth = 0, inString = false, escaped = false, objStart = -1;
  for (let i = start + 1; i < stripped.length; i++) {
    const ch = stripped[i]!;
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === "{") { if (depth === 0) objStart = i; depth++; continue; }
    if (ch === "}") {
      depth--;
      if (depth === 0 && objStart >= 0) {
        try {
          const obj = JSON.parse(stripped.slice(objStart, i + 1));
          if (obj && typeof obj === "object") objects.push(obj as Record<string, unknown>);
        } catch { /* skip malformed object */ }
        objStart = -1;
      }
      continue;
    }
    if (ch === "]" && depth === 0) break;
  }
  if (objects.length > 0) return objects;
  // Last resort: one broken string (an unescaped quote) desyncs the scan above, so cut the text at every
  // `{"id": N` marker and parse each segment on its own; the damaged object is lost, the others survive.
  const markers = [...stripped.matchAll(/\{\s*"id"\s*:\s*\d+/g)].map((m) => m.index!);
  for (let m = 0; m < markers.length; m++) {
    const segment = stripped.slice(markers[m], markers[m + 1] ?? stripped.length);
    const close = segment.lastIndexOf("}");
    if (close < 0) continue;
    try {
      const obj = JSON.parse(segment.slice(0, close + 1));
      if (obj && typeof obj === "object" && !Array.isArray(obj)) objects.push(obj as Record<string, unknown>);
    } catch { /* skip malformed segment */ }
  }
  if (objects.length === 0) {
    const tail = stripped.length > 400 ? ` … ${stripped.slice(-200)}` : "";
    throw new Error(`JSON malformato nella risposta AI: ${stripped.slice(start, start + 200)}${tail}`);
  }
  return objects;
}

/** Maps model rows back to the companies they describe through the numeric "id" we sent. */
export function matchAiRows<T extends Record<string, unknown>>(rows: T[], count: number): Map<number, T> {
  const byId = new Map<number, T>();
  for (const row of rows) {
    const raw = row.id;
    const id = typeof raw === "number" ? raw : typeof raw === "string" && /^\d+$/.test(raw.trim()) ? Number(raw.trim()) : NaN;
    if (Number.isInteger(id) && id >= 0 && id < count && !byId.has(id)) byId.set(id, row);
  }
  return byId;
}

/** Fallback when a row carries no usable id: exact match on the normalised company name. */
export function findRowByName<T extends Record<string, unknown>>(rows: T[], companyName: string): T | undefined {
  const key = dedupeKey(companyName);
  if (!key) return undefined;
  return rows.find((r) => typeof r.companyName === "string" && dedupeKey(r.companyName) === key);
}

export function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t && t.toLowerCase() !== "null" && t.toLowerCase() !== "n/a" ? t : null;
}

export function clampScore(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : fallback;
}
