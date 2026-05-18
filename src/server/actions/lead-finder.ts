"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { chatCompletion } from "@/lib/openrouter";
import { getOrgPlan, getLimits, checkFeature } from "@/lib/plan";
import { createLead } from "@/server/actions/leads";
import type { LeadFinderSearch, LeadCandidate } from "@/types/lead-finder";

function getIds(s: Session | null) {
  const user = s?.user as { id?: string; organizationId?: string } | undefined;
  return { orgId: user?.organizationId ?? null, userId: user?.id ?? null };
}

const FAKE_EMAIL_PATTERNS = ["acme", "example", "test", "placeholder", "yourcompany", "nomeazienda", "company.it", "azienda.it", "dominio", "pippo", "prova"];
function sanitizeEmail(email: string | null): string | null {
  if (!email) return null;
  const lower = email.toLowerCase().trim();
  if (!lower.match(/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/)) return null;
  if (FAKE_EMAIL_PATTERNS.some((p) => lower.includes(p))) return null;
  return email.trim();
}

function sanitizePhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6 || digits.length > 13) return null;
  if (/^(\d)\1{5,}$/.test(digits)) return null; // tutti uguali (es. 000000)
  return phone.trim();
}

function completenessScore(hasEmail: boolean, hasPhone: boolean, hasWebsite: boolean, hasContact: boolean): number {
  return Math.min(100, 65 + (hasEmail ? 15 : 0) + (hasPhone ? 10 : 0) + (hasWebsite ? 5 : 0) + (hasContact ? 5 : 0));
}

// ─── Normalizzazione nome azienda per deduplicazione ──────────────────────
const COMPANY_SUFFIXES = /\b(s\.?r\.?l\.?s?|s\.?p\.?a\.?|s\.?n\.?c\.?|s\.?a\.?s\.?|s\.?s\.?|s\.?c\.?a\.?r\.?l\.?|ltd|soc\s+coop|cooperativa|onlus|aps|odv)\b\.?/gi;
function dedupeKey(name: string): string {
  return name
    .toLowerCase()
    .replace(COMPANY_SUFFIXES, "")
    .replace(/[^\wàèéìòùÀÈÉÌÒÙ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── INI-PEC: email PEC ufficiale da P.IVA (registro ministeriale) ────────
async function fetchPecFromIniPec(piva: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.inipec.gov.it/cerca-pec/-/pec/codice-fiscale/${piva.trim()}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "it-IT,it;q=0.9",
        },
        next: { revalidate: 86400 }, // cache 24h — i dati PEC cambiano raramente
      }
    );
    if (!res.ok) return null;
    const html = await res.text();
    // INI-PEC mostra la PEC in formato email nell'HTML
    const match = html.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
    if (!match) return null;
    const email = match[0].toLowerCase();
    // Escludiamo email del sito stesso (noreply@, contatti@ inipec...)
    if (email.includes("inipec") || email.includes("infocamere") || email.includes("gov.it")) return null;
    return email;
  } catch {
    return null;
  }
}

// Esegui lookups INI-PEC in parallelo con concorrenza limitata
async function enrichWithPec(
  companies: Array<{ piva?: string | null; email?: string | null }>
): Promise<(string | null)[]> {
  const CONCURRENCY = 5;
  const results: (string | null)[] = new Array(companies.length).fill(null);
  for (let i = 0; i < companies.length; i += CONCURRENCY) {
    const batch = companies.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((c) => (c.piva && !c.email) ? fetchPecFromIniPec(c.piva) : Promise.resolve(null))
    );
    batchResults.forEach((r, idx) => { results[i + idx] = r; });
  }
  return results;
}

function mapSearch(s: {
  id: string; organizationId: string; name: string; sector: string | null;
  location: string | null; companySize: string | null; keywords: string | null;
  idealCustomer: string | null; maxResults: number; status: string; error: string | null;
  createdAt: Date; updatedAt: Date;
}): LeadFinderSearch {
  return {
    ...s,
    status: s.status as LeadFinderSearch["status"],
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

function mapCandidate(c: {
  id: string; organizationId: string; searchId: string; companyName: string;
  website: string | null; sector: string | null; location: string | null;
  companySize: string | null; contactName: string | null; contactRole: string | null;
  email: string | null; phone: string | null; linkedinUrl: string | null;
  score: number; source: string; motivation: string | null; status: string;
  leadId: string | null; createdAt: Date;
}): LeadCandidate {
  return {
    ...c,
    status: c.status as LeadCandidate["status"],
    createdAt: c.createdAt.toISOString(),
  };
}

const searchSchema = z.object({
  name: z.string().min(1, "Nome ricerca obbligatorio"),
  sector: z.string().optional(),
  location: z.string().optional(),
  companySize: z.string().optional(),
  keywords: z.string().optional(),
  idealCustomer: z.string().optional(),
  maxResults: z.number().int().min(3).max(50).default(10),
});

// ─── createSearch ─────────────────────────────────────────────────────────

export async function createSearch(
  input: z.infer<typeof searchSchema>
): Promise<{ data: LeadFinderSearch | null; error: string | null }> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return { data: null, error: "Non autorizzato" };

  const plan = await getOrgPlan(orgId);
  const limits = getLimits(plan);

  // Check daily limit for STARTER
  if (limits.leadFinderPerDay !== null) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayCount = await db.leadFinderSearch.count({
      where: { organizationId: orgId, createdAt: { gte: startOfDay } },
    });
    if (todayCount >= limits.leadFinderPerDay) {
      return { data: null, error: `Hai raggiunto il limite di ${limits.leadFinderPerDay} ricerca al giorno del piano Starter. Passa a PRO per ricerche illimitate.` };
    }
  }

  const parsed = searchSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Input non valido" };

  // Cap maxResults at plan limit
  const cappedData = {
    ...parsed.data,
    maxResults: Math.min(parsed.data.maxResults, limits.leadFinderMaxResults),
  };

  try {
    const row = await db.leadFinderSearch.create({
      data: { organizationId: orgId, ...cappedData, status: "PENDING" },
    });
    revalidatePath("/lead-finder");
    return { data: mapSearch(row), error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Errore creazione ricerca" };
  }
}

// ─── Google Places helper ─────────────────────────────────────────────────

type PlacesResult = {
  companyName: string;
  website: string | null;
  phone: string | null;
  location: string | null;
  // Campi extra da fatturatoitalia.it scraping
  piva?: string | null;
  address?: string | null;
  sector?: string | null;
  fatturatoSlug?: string | null;
  email?: string | null;
  _inactive?: boolean; // flag interno — azienda cessata/non attiva, da scartare
};

// ─── Geocoding helper (Nominatim) ────────────────────────────────────────────
// Restituisce lat/lon + raggio + provincia (per fallback FatturatoItalia)

type GeoResult = {
  lat: number;
  lon: number;
  radius: number;
  provinceSlug: string | null; // slug della provincia per /provincia/{slug}
};

async function geocodeLocation(location: string): Promise<GeoResult | null> {
  if (!location.trim()) return null;
  try {
    const q = encodeURIComponent((location.split(",")[0] ?? location).trim());
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&countrycodes=it&limit=1&addressdetails=1`,
      { headers: { "User-Agent": "Pipely-CRM/1.0 (contact@pipely.it)" } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      boundingbox?: string[];
      address?: {
        county?: string;       // "Città metropolitana di Milano"
        state_district?: string; // "Città metropolitana di Milano"
        province?: string;
        state?: string;
        city?: string;
        town?: string;
        village?: string;
      };
    }>;
    const first = data[0];
    if (!first?.lat || !first?.lon) return null;

    const lat = parseFloat(first.lat);
    const lon = parseFloat(first.lon);
    let radius = 25000;
    if (first.boundingbox?.length === 4) {
      const bb = first.boundingbox.map(Number);
      const s = bb[0] ?? lat, n = bb[1] ?? lat, w = bb[2] ?? lon, e = bb[3] ?? lon;
      const latM = (n - s) * 111000;
      const lonM = (e - w) * 111000 * Math.cos((lat * Math.PI) / 180);
      radius = Math.max(15000, Math.min(Math.hypot(latM, lonM) / 2, 200000));
    }

    // Estrai provincia da addressdetails Nominatim
    // "Città metropolitana di Milano" → "milano", "Provincia di Bergamo" → "bergamo"
    const addr = first.address;
    const rawProvince =
      addr?.county ?? addr?.state_district ?? addr?.province ?? null;
    let provinceSlug: string | null = null;
    if (rawProvince) {
      const cleaned = rawProvince
        .replace(/\bCitt[aà]\s+metropolitana\s+di\s*/i, "")
        .replace(/\bProvincia\s+di\s*/i, "")
        .replace(/\bProv\.\s*/i, "")
        .trim();
      provinceSlug = toSlug(cleaned);
    }

    return { lat, lon, radius, provinceSlug };
  } catch {
    return null;
  }
}

async function searchGooglePlaces(
  query: string,
  maxResults: number,
  coords?: { lat: number; lon: number; radius: number } | null,
): Promise<PlacesResult[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return [];

  try {
    const body: Record<string, unknown> = {
      textQuery: query,
      maxResultCount: Math.min(maxResults, 20),
      languageCode: "it",
      regionCode: "IT",
    };
    // locationRestriction garantisce i risultati nell'area geografica specificata
    if (coords) {
      body.locationRestriction = {
        circle: {
          center: { latitude: coords.lat, longitude: coords.lon },
          radius: coords.radius,
        },
      };
    }

    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.websiteUri,places.businessStatus",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) return [];

    const data = await res.json() as {
      places?: Array<{
        displayName?: { text?: string };
        formattedAddress?: string;
        internationalPhoneNumber?: string;
        websiteUri?: string;
        businessStatus?: string;
      }>;
    };

    return (data.places ?? [])
      .filter((p) => p.businessStatus !== "CLOSED_PERMANENTLY" && p.displayName?.text)
      .map((p) => ({
        companyName: p.displayName!.text!,
        website: p.websiteUri ? p.websiteUri.replace(/\/$/, "") : null,
        phone: p.internationalPhoneNumber ?? null,
        // Extract city from formattedAddress (first meaningful part before country)
        location: p.formattedAddress
          ? p.formattedAddress.split(",").slice(-3, -1).map((s) => s.trim()).join(", ")
          : null,
      }));
  } catch {
    return [];
  }
}

// ─── FatturatoItalia scraper ──────────────────────────────────────────────
// Source: fatturatoitalia.it — dati CCIAA
// Percorsi supportati: /comune/[slug], /provincia/[slug], /regione/[slug]

const ITALIAN_REGIONS = new Set([
  "abruzzo", "basilicata", "calabria", "campania", "emilia-romagna",
  "friuli-venezia-giulia", "lazio", "liguria", "lombardia", "marche",
  "molise", "piemonte", "puglia", "sardegna", "sicilia", "toscana",
  "trentino-alto-adige", "umbria", "valle-d-aosta", "veneto",
  "emilia romagna", "friuli venezia giulia", "trentino alto adige", "valle daosta",
]);

const ITALIAN_PROVINCES = new Set([
  "agrigento", "alessandria", "ancona", "aosta", "arezzo", "ascoli-piceno", "asti",
  "avellino", "bari", "barletta-andria-trani", "belluno", "benevento", "bergamo",
  "biella", "bologna", "bolzano", "brescia", "brindisi", "cagliari", "caltanissetta",
  "campobasso", "caserta", "catania", "catanzaro", "chieti", "como", "cosenza",
  "cremona", "crotone", "cuneo", "enna", "fermo", "ferrara", "firenze", "foggia",
  "forli-cesena", "frosinone", "genova", "gorizia", "grosseto", "imperia", "isernia",
  "la-spezia", "l-aquila", "latina", "lecce", "lecco", "livorno", "lodi", "lucca",
  "macerata", "mantova", "massa-carrara", "matera", "messina", "milano", "modena",
  "monza-e-della-brianza", "napoli", "novara", "nuoro", "oristano", "padova",
  "palermo", "parma", "pavia", "perugia", "pesaro-e-urbino", "pescara", "piacenza",
  "pisa", "pistoia", "pordenone", "potenza", "prato", "ragusa", "ravenna",
  "reggio-calabria", "reggio-emilia", "rieti", "rimini", "roma", "rovigo",
  "salerno", "sassari", "savona", "siena", "siracusa", "sondrio", "sud-sardegna",
  "taranto", "teramo", "terni", "torino", "trapani", "trento", "treviso",
  "trieste", "udine", "varese", "venezia", "verbano-cusio-ossola", "vercelli",
  "verona", "vibo-valentia", "vicenza", "viterbo",
]);

function toSlug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[''']/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function detectLocationType(location: string): "regione" | "provincia" | "comune" {
  // Normalizza rimuovendo prefissi tipo "Provincia di", "Prov."
  const clean = (location.split(",")[0] ?? location)
    .replace(/\bprovincia\s+di\s*/i, "")
    .replace(/\bprov\.\s*/i, "")
    .trim();
  const slug = toSlug(clean);
  if (ITALIAN_REGIONS.has(slug)) return "regione";
  if (ITALIAN_PROVINCES.has(slug)) return "provincia";
  return "comune";
}

// Estrae P.IVA direttamente dallo slug URL (es. "mario-rossi-srl-01234567890" → "01234567890")
// Molto piu' affidabile del regex HTML
function extractVatFromSlug(slug: string): string | null {
  const m = slug.match(/(\d{11})$/);
  return m?.[1] ?? null;
}

// Scraping pagina listing FatturatoItalia → array di aziende con slug e P.IVA estratto dall'URL
// HTML struttura: <td><a href="/nome_azienda_srl-PIVA" title="...">Nome Display</a></td>
// Ogni link appare 2× per riga (colonna 1 e 2), ~45 aziende per pagina
async function scrapeFatturatoPages(
  baseUrl: string,
  labelLocation: string,
  maxResults: number,
): Promise<PlacesResult[]> {
  const results: PlacesResult[] = [];
  const seenSlugs = new Set<string>();
  const maxPages = Math.ceil(maxResults / 45) + 1;

  // Cattura slug (group 1) + testo link visibile (group 2) in un'unica regex
  // URL format: /nome_azienda_srl-PIVA (underscore come separatore, PIVA = 11 cifre)
  const COMPANY_LINK = /href="https?:\/\/www\.fatturatoitalia\.it\/([a-z0-9][a-z0-9_-]*-\d{11})"[^>]*>([^<]{2,100})<\/a>/gi;

  for (let page = 1; page <= maxPages; page++) {
    try {
      const url = page === 1 ? baseUrl : `${baseUrl}/${page}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept-Language": "it-IT,it;q=0.9",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        next: { revalidate: 3600 },
      });
      if (!res.ok) break;
      const html = await res.text();

      let foundOnPage = 0;
      COMPANY_LINK.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = COMPANY_LINK.exec(html)) !== null) {
        const slug = m[1] ?? "";
        const rawName = (m[2] ?? "").trim();
        if (!slug || !rawName || rawName.length < 2) continue;
        if (seenSlugs.has(slug)) continue;
        seenSlugs.add(slug);
        const piva = extractVatFromSlug(slug);
        // Il testo del link è già formattato correttamente (es. "Dical Srl", "Bustraser Italia S.r.l.")
        results.push({ companyName: rawName, website: null, phone: null, location: labelLocation, fatturatoSlug: slug, piva });
        foundOnPage++;
        if (results.length >= maxResults) break;
      }

      if (foundOnPage === 0 || results.length >= maxResults) break;
    } catch {
      break;
    }
  }
  return results;
}

function normalizeCompanyName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bDi\b|\bDel\b|\bDella\b|\bDei\b|\bDegli\b|\bDelle\b|\bDa\b|\bIn\b|\bE\b/g, (m) => m.toLowerCase());
}

// Estrae il valore di un campo dalla pagina dettaglio FatturatoItalia.
// Pattern HTML: <b>LABEL</b></p></div><div class="col-xs-7"><p>[<a ...>]VALUE[</a>]</p>
function extractDetailField(html: string, label: string): string | null {
  const esc = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = html.match(
    new RegExp(
      `<b>${esc}</b></p></div>\\s*<div class="col-xs-7"><p>(?:<a[^>]*>)?([^<]{1,200})(?:</a>)?`,
      "i"
    )
  );
  return m?.[1]?.trim().replace(/\s+/g, " ") ?? null;
}

// Scraping pagina dettaglio azienda → indirizzo completo, settore/ATECO, telefono, sito
// Filtra automaticamente le aziende con Stato Attività != Attiva
async function fetchFatturatoDetail(slug: string): Promise<Partial<PlacesResult>> {
  try {
    const res = await fetch(`https://www.fatturatoitalia.it/${slug}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "it-IT,it;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return {};
    const html = await res.text();

    // Scarta aziende cessate/non attive
    const stato = extractDetailField(html, "Stato Attività");
    if (stato && !/attiv/i.test(stato)) return { _inactive: true };

    // Indirizzo: via + città + provincia
    const via = extractDetailField(html, "Indirizzo");
    const citta = extractDetailField(html, "Città");
    const provincia = extractDetailField(html, "Provincia");
    const addressParts = [via, citta, provincia].filter(Boolean);
    const address = addressParts.length > 0 ? addressParts.join(", ") : null;

    // Settore: usa la descrizione attività prevalente (più leggibile del codice ATECO)
    const ateco = extractDetailField(html, "ATECO");
    const attivita = extractDetailField(html, "Attività prevalente");
    const sector = attivita ?? (ateco ? `ATECO ${ateco}` : null);

    // Telefono: cerca link tel: oppure pattern numeri italiani
    const SKIP_DOMAINS = /fatturatoitalia\.it|google\.|facebook\.|linkedin\.|twitter\.|instagram\.|youtube\.|googleapis\.|gstatic\.|cloudflare\.|amazonaws\.|cdn\.|numeroverde\.com|adcapital\.it/i;

    const phoneM =
      html.match(/tel:([\d+][\d\s\-./()]{6,18})/i) ??
      html.match(/\b((?:\+39[\s.-]?)?0\d{1,3}[\s.-]?\d{5,8})\b/) ??
      html.match(/\b(3\d{9})\b/);
    const phone = phoneM?.[1]?.trim() ?? null;

    // Sito web: link esterno non di navigazione
    const siteMatches = [...html.matchAll(/href="(https?:\/\/[^"]{6,100})"/gi)];
    const website = siteMatches
      .map((sm) => sm[1] ?? "")
      .find((u) => u && !SKIP_DOMAINS.test(u) && !u.includes("?") && u.split("/").length <= 4)
      ?? null;

    return { address, sector, phone, website };
  } catch {
    return {};
  }
}

// ─── Scraping email dal sito aziendale ────────────────────────────────────
// Cerca mailto: link nella homepage e nella pagina /contatti — fonte piu' affidabile

async function scrapeEmailFromWebsite(website: string): Promise<string | null> {
  const base = website.replace(/\/$/, "");
  const SKIP_PATTERNS = /\.(png|jpg|jpeg|gif|svg|css|js|pdf)$/i;
  const SKIP_EMAILS = /^(noreply|no-reply|donotreply|support|webmaster|admin|postmaster|info-|privacy|cookie|dpo@)/i;

  for (const path of ["", "/contatti", "/contact", "/chi-siamo"]) {
    try {
      const res = await fetch(`${base}${path}`, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Pipely-CRM/1.0)" },
        signal: AbortSignal.timeout(6000),
        redirect: "follow",
      });
      if (!res.ok) continue;
      const html = await res.text();
      // Priorita' 1: mailto: link espliciti
      const mailtoMatches = [...html.matchAll(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi)];
      for (const m of mailtoMatches) {
        const email = m[1]?.toLowerCase();
        if (email && !SKIP_PATTERNS.test(email) && !SKIP_EMAILS.test(email)) return email;
      }
      // Priorita' 2: pattern email nel testo visibile (non dentro script/style)
      const textOnly = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
      const emailMatches = [...textOnly.matchAll(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g)];
      for (const m of emailMatches) {
        const email = m[1]?.toLowerCase();
        if (email && !SKIP_PATTERNS.test(email) && !SKIP_EMAILS.test(email)) return email;
      }
    } catch {
      continue;
    }
  }
  return null;
}

// Arricchisce un batch di aziende con dati dal dettaglio CCIAA + email dal sito
// Filtra le aziende non attive (Stato Attività != Attiva)
async function enrichWithFatturatoDetails(companies: PlacesResult[]): Promise<PlacesResult[]> {
  const CONCURRENCY = 8;
  const enriched = [...companies];
  const inactiveIdxs = new Set<number>();

  // Fase 1: dati CCIAA dalla pagina FatturatoItalia
  for (let i = 0; i < enriched.length; i += CONCURRENCY) {
    const batch = enriched.slice(i, i + CONCURRENCY);
    const details = await Promise.all(
      batch.map((c) => c.fatturatoSlug ? fetchFatturatoDetail(c.fatturatoSlug) : Promise.resolve({} as Partial<PlacesResult>))
    );
    details.forEach((d, idx) => {
      const c = enriched[i + idx];
      if (!c) return;
      if (d._inactive) { inactiveIdxs.add(i + idx); return; }
      if (d.address) c.address = d.address;
      if (d.sector && !c.sector) c.sector = d.sector;
      if (d.phone && !c.phone) c.phone = d.phone;
      if (d.website && !c.website) c.website = d.website;
    });
  }

  const active = enriched.filter((_, idx) => !inactiveIdxs.has(idx));

  // Fase 2: scraping email dal sito aziendale (solo per chi ha website)
  const withWebsite = active.filter((c) => c.website);
  for (let i = 0; i < withWebsite.length; i += CONCURRENCY) {
    const batch = withWebsite.slice(i, i + CONCURRENCY);
    const emails = await Promise.all(batch.map((c) => scrapeEmailFromWebsite(c.website!)));
    emails.forEach((email, idx) => {
      const c = batch[idx];
      if (c && email) (c as PlacesResult & { email?: string }).email = email;
    });
  }

  return active;
}

// Tenta di fare scraping su FatturatoItalia con catena di fallback geografica:
// 1. /comune/{slug}        — solo grandi comuni (pochissimi hanno pagina dedicata)
// 2. /provincia/{slug}     — tutti i 107 capoluoghi di provincia (copertura principale)
// 3. /provincia/{geo}      — provincia ricavata da Nominatim (per citta' non capoluogo)
// 4. /regione/{slug}       — intera regione come ultimo fallback
async function fetchFatturatoItalia(
  location: string,
  maxResults: number,
  geo?: GeoResult | null,
): Promise<PlacesResult[]> {
  const rawName = (location.split(",")[0] ?? location)
    .replace(/\bprovincia\s+di\s*/i, "")
    .replace(/\bprov\.\s*/i, "")
    .trim();
  const locSlug = toSlug(rawName);
  if (!locSlug) return [];

  const locType = detectLocationType(location);
  const locationLabel = rawName;
  const BASE = "https://www.fatturatoitalia.it";

  async function tryUrl(url: string): Promise<PlacesResult[]> {
    return scrapeFatturatoPages(url, locationLabel, maxResults).catch(() => []);
  }

  // Strategia principale basata sul tipo di localita'
  if (locType === "regione") {
    const results = await tryUrl(`${BASE}/regione/${locSlug}`);
    return enrichWithFatturatoDetails(results.slice(0, maxResults));
  }

  if (locType === "provincia") {
    const results = await tryUrl(`${BASE}/provincia/${locSlug}`);
    return enrichWithFatturatoDetails(results.slice(0, maxResults));
  }

  // locType === "comune": prova piu' URL in sequenza fino a trovare risultati
  const urlsToTry: string[] = [
    `${BASE}/comune/${locSlug}`,           // es. /comune/napoli (pochi comuni hanno pagina)
    `${BASE}/provincia/${locSlug}`,        // es. /provincia/milano (se il comune = capoluogo)
  ];

  // Aggiungi provincia da Nominatim se disponibile e diversa dal comune
  if (geo?.provinceSlug && geo.provinceSlug !== locSlug) {
    urlsToTry.push(`${BASE}/provincia/${geo.provinceSlug}`);
  }

  for (const url of urlsToTry) {
    const results = await tryUrl(url);
    if (results.length > 0) {
      return enrichWithFatturatoDetails(results.slice(0, maxResults));
    }
  }

  return [];
}

// ─── Python scraper service integration ──────────────────────────────────
// Quando SCRAPER_SERVICE_URL è configurato, usa il microservizio Python
// al posto dello scraper TypeScript interno per FatturatoItalia + INI-PEC.

type ScraperServiceCompany = {
  name: string;
  piva?: string | null;
  address?: string | null;
  sector?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  n_dipendenti?: string | null;
  forma_giuridica?: string | null;
  anno_fondazione?: string | null;
  score?: number;
  motivation?: string | null;
};

async function fetchFromScraperService(
  search: { location?: string | null; sector?: string | null; keywords?: string | null; idealCustomer?: string | null; maxResults: number },
  geo?: GeoResult | null,
): Promise<{ companies: ScraperServiceCompany[]; available: boolean }> {
  // URL base: SCRAPER_SERVICE_URL oppure URL del deployment Vercel corrente (funzione Python interna)
  const baseUrl =
    process.env.SCRAPER_SERVICE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    process.env.NEXT_PUBLIC_APP_URL ??
    null;

  if (!baseUrl) return { companies: [], available: false };

  const loc = (search.location ?? "").split(",")[0]?.trim() ?? "";
  const rawSlug = toSlug(loc);
  if (!rawSlug) return { companies: [], available: false };

  const locType = detectLocationType(loc);
  let locationSlug = `${locType}/${rawSlug}`;
  // Per comuni non capoluogo usa la provincia ricavata da Nominatim
  if (locType === "comune" && geo?.provinceSlug && geo.provinceSlug !== rawSlug) {
    locationSlug = `provincia/${geo.provinceSlug}`;
  }

  try {
    const res = await fetch(`${baseUrl}/api/scraper`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.SCRAPER_SECRET_KEY ? { "x-scraper-key": process.env.SCRAPER_SECRET_KEY } : {}),
      },
      body: JSON.stringify({
        location: loc,
        location_slug: locationSlug,
        max_results: search.maxResults,
        sector: search.sector ?? null,
        keywords: search.keywords ?? null,
        ideal_customer: search.idealCustomer ?? null,
      }),
      signal: AbortSignal.timeout(240_000), // max 4 min
    });
    if (!res.ok) return { companies: [], available: true };
    const data = await res.json() as { companies: ScraperServiceCompany[] };
    return { companies: data.companies ?? [], available: true };
  } catch {
    return { companies: [], available: false };
  }
}

// ─── JSON parsing helper ──────────────────────────────────────────────────

function extractJsonArray(raw: string): Array<Record<string, unknown>> {
  const stripped = raw.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
  const match = stripped.match(/\[[\s\S]*\]/);
  if (!match) throw new Error(`Risposta AI non valida — nessun array JSON trovato. Risposta: ${raw.slice(0, 300)}`);
  try {
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) throw new Error("Non è un array");
    return parsed as Array<Record<string, unknown>>;
  } catch {
    throw new Error(`JSON malformato nella risposta AI: ${match[0].slice(0, 200)}`);
  }
}

// ─── runSearch ────────────────────────────────────────────────────────────

export async function runSearch(
  searchId: string
): Promise<{ error: string | null }> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return { error: "Non autorizzato" };

  const search = await db.leadFinderSearch.findFirst({
    where: { id: searchId, organizationId: orgId },
  });
  if (!search) return { error: "Ricerca non trovata" };

  await db.leadFinderSearch.update({ where: { id: searchId }, data: { status: "RUNNING" } });

  try {
    // ── FASE 1: Google Places → aziende reali verificate ──────────────────
    const hasSpecificTerm = !!(search.keywords || search.sector);
    const loc = search.location ?? "";

    // Geocoding: ottieni coordinate per locationRestriction (vincolo geografico preciso)
    const coords = loc ? await geocodeLocation(loc) : null;

    // Categorie Places per massima copertura: aziende + artigiani + professionisti
    // La localita' e' garantita da locationRestriction, NON dal testo della query
    const ALL_CATEGORIES = [
      // Imprese e societa'
      "aziende imprese societa srl",
      "negozi commercio attivita",
      // Artigiani
      "artigiani idraulici elettricisti impianti",
      "artigiani edili costruzioni ristrutturazioni",
      "artigiani meccanici officine carrozzerie",
      "artigiani falegnami installatori serramenti",
      // Liberi professionisti
      "avvocati notai commercialisti consulenti",
      "medici dentisti fisioterapisti",
      "architetti ingegneri geometri",
      // Ristorazione turismo
      "ristoranti bar pizzerie gelaterie",
      "hotel agriturismo bed breakfast",
      // Servizi vari
      "parrucchieri estetisti centri benessere",
      "palestre scuole guida centri sportivi",
    ];

    let placesResults: PlacesResult[];

    if (hasSpecificTerm) {
      // Ricerca specifica: keyword/settore come query + locationRestriction
      // Se geocoding fallisce, aggiunge la location nel testo come fallback
      const q = coords
        ? (search.keywords ?? search.sector ?? "").trim()
        : `${search.keywords ?? search.sector} ${loc}`.trim();
      placesResults = await searchGooglePlaces(q, search.maxResults, coords);
    } else {
      // Ricerca generica: tutte le categorie in parallelo, localita' da locationRestriction
      const queries = coords
        ? ALL_CATEGORIES
        : ALL_CATEGORIES.map((cat) => `${cat} ${loc}`.trim());
      const allArrays = await Promise.all(queries.map((q) => searchGooglePlaces(q, 20, coords)));
      const seen = new Set<string>();
      placesResults = allArrays
        .flat()
        .filter((p) => {
          const key = p.companyName.toLowerCase().slice(0, 20);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, search.maxResults);
    }

    // Escludi enti pubblici
    const PUBLIC_PREFIXES = ["comune di", "municipio", "provincia di", "regione ", "asl ", "istituto comprensivo", "scuola "];
    placesResults = placesResults.filter((p) => {
      const l = p.companyName.toLowerCase();
      return !PUBLIC_PREFIXES.some((pfx) => l.startsWith(pfx));
    });

    // ── FASE 1b: FatturatoItalia → aziende CCIAA non su Google Maps ──────
    // Preferisce il microservizio Python (BeautifulSoup + INI-PEC + AI scoring).
    // Fallback allo scraper TypeScript interno se SCRAPER_SERVICE_URL non è configurato.
    let fatturatoResults: PlacesResult[] = [];
    let scraperServiceResults: ScraperServiceCompany[] = [];

    if (search.location) {
      try {
        const { companies, available } = await fetchFromScraperService(search, coords);
        if (available && companies.length > 0) {
          scraperServiceResults = companies;
          // Converti in PlacesResult per il merge successivo
          fatturatoResults = companies.map((c) => ({
            companyName: c.name,
            website: c.website ?? null,
            phone: c.phone ?? null,
            location: c.address ?? search.location,
            piva: c.piva ?? null,
            address: c.address ?? null,
            sector: c.sector ?? null,
            email: c.email ?? null,
          }));
        } else if (!available) {
          // Python service non configurato — usa scraper TypeScript
          fatturatoResults = await fetchFatturatoItalia(
            search.location,
            Math.max(search.maxResults, 30),
            coords,
          );
        }
      } catch {
        // non-fatal: procedi senza
      }
    }

    // Merge Places + FatturatoItalia — deduplica per nome (prime 12 lettere)
    const seenNames = new Set(placesResults.map((p) => p.companyName.toLowerCase().slice(0, 12)));
    const newFromFatturato = fatturatoResults.filter((f) => {
      const key = f.companyName.toLowerCase().slice(0, 12);
      if (seenNames.has(key)) return false;
      seenNames.add(key);
      return true;
    });

    // Se la ricerca è specifica (keywords/settore), filtra FatturatoItalia con Sonar dopo
    // Se generica, aggiungi tutte fino al limite
    let allPlacesResults = [...placesResults, ...newFromFatturato].slice(0, search.maxResults);

    // ── FASE 1c: INI-PEC — email PEC ufficiale per aziende con P.IVA ─────
    // Solo per aziende da FatturatoItalia (hanno piva), che non hanno già email verificata
    {
      const pecEmails = await enrichWithPec(allPlacesResults.map((p) => ({ piva: (p as PlacesResult & { piva?: string }).piva, email: p.website ? null : null })));
      allPlacesResults = allPlacesResults.map((p, i) => {
        const pec = pecEmails[i];
        if (!pec) return p;
        return { ...p, email: sanitizeEmail(pec) } as PlacesResult;
      });
    }

    // ── DEDUPLICAZIONE: salta aziende già presenti nel CRM ───────────────
    const [existingCandidates, existingLeads] = await Promise.all([
      db.leadCandidate.findMany({
        where: { organizationId: orgId, status: "APPROVED" },
        select: { companyName: true },
      }),
      db.lead.findMany({
        where: { organizationId: orgId },
        select: { title: true },
      }),
    ]);
    const existingNames = new Set([
      ...existingCandidates.map((c) => dedupeKey(c.companyName)),
      ...existingLeads.map((l) => normalizeCompanyName(l.title)),
    ]);
    allPlacesResults = allPlacesResults.filter(
      (p) => !existingNames.has(normalizeCompanyName(p.companyName))
    );

    const hasPlacesData = allPlacesResults.length > 0;

    // ── FASE 2: Perplexity/Sonar — arricchimento contatti in batch da 15 ──

    const criteria: string[] = [];
    if (search.sector) criteria.push(`Settore: ${search.sector}`);
    if (search.location) criteria.push(`Paese/Città: ${search.location}`);
    if (search.companySize) criteria.push(`Dimensione azienda: ${search.companySize} dipendenti`);
    if (search.keywords) criteria.push(`Parole chiave: ${search.keywords}`);
    if (search.idealCustomer) criteria.push(`Descrizione cliente ideale: ${search.idealCustomer}`);
    const criteriaText = criteria.length > 0
      ? criteria.join("\n")
      : `Qualsiasi azienda, artigiano o libero professionista${search.location ? ` di ${search.location}` : " italiano"}`;

    type ParsedCandidate = {
      companyName: string; website: string | null; sector: string | null;
      location: string | null; companySize: string | null; contactName: string | null;
      contactRole: string | null; email: string | null; phone: string | null;
      linkedinUrl: string | null; score: number; motivation: string | null;
    };

    let parsed: ParsedCandidate[];

    if (hasPlacesData) {
      // Batch Sonar enrichment: 15 aziende per chiamata
      const BATCH = 15;
      const enrichedAll: Array<Record<string, unknown>> = [];

      for (let i = 0; i < allPlacesResults.length; i += BATCH) {
        const batch = allPlacesResults.slice(i, i + BATCH);
        const companiesList = batch
          .map((p, idx) => {
            let line = `${i + idx + 1}. ${p.companyName}`;
            if (p.piva) line += ` (P.IVA: ${p.piva})`;
            if (p.website) line += ` — ${p.website}`;
            if (p.address) line += ` — ${p.address}`;
            else if (p.location) line += ` — ${p.location}`;
            if (p.sector) line += ` — Settore: ${p.sector}`;
            return line;
          })
          .join("\n");
        try {
          const raw = await chatCompletion(
            [
              {
                role: "system",
                content: `Sei un esperto ricercatore di lead B2B con accesso alla ricerca web in tempo reale.
Hai ricevuto un elenco di attività reali (da Google Maps e registro CCIAA italiano). Per ognuna:
1. Cerca il referente (titolare, CEO, responsabile) sul sito web ufficiale o LinkedIn
2. Cerca l'email reale (personale o generica: info@, commerciale@, contatti@) — SOLO se la trovi verificata sul web
3. Assegna uno score 0-100 rispetto ai criteri del cliente ideale
4. Scrivi una motivazione sintetica (1-2 frasi)
REGOLE FONDAMENTALI:
- NON inventare email, nomi o dati non trovati — usa null se non trovi nulla
- NON costruire LinkedIn URL a caso — usa null se non trovi il profilo reale
- Rispondi SOLO con JSON array valido, zero testo aggiuntivo, zero markdown`,
              },
              {
                role: "user",
                content: `Criteri cliente ideale:\n${criteriaText}\n\nAttività da arricchire:\n${companiesList}\n\nJSON array (un oggetto per ogni attività, stesso ordine):\n[{"companyName":"...","contactName":"...","contactRole":"...","email":"...","score":80,"motivation":"..."}]`,
              },
            ],
            { maxTokens: 2000, temperature: 0.1, model: process.env.OPENROUTER_MODEL_LEADFINDER ?? "perplexity/sonar" }
          );
          try { enrichedAll.push(...extractJsonArray(raw)); } catch { /* batch fallback */ }
        } catch { /* batch failure non-fatal */ }
      }

      // Merge Places/CCIAA + Sonar
      const genericSearch = !hasSpecificTerm && !search.idealCustomer;
      parsed = allPlacesResults.map((p) => {
        // Se il Python service ha già calcolato score/motivation per questa azienda, usali
        const fromService = scraperServiceResults.find(
          (s) => s.name.toLowerCase().slice(0, 12) === p.companyName.toLowerCase().slice(0, 12)
        );

        const match = enrichedAll.find(
          (e) => typeof e.companyName === "string" &&
            (e.companyName.toLowerCase().includes(p.companyName.toLowerCase().slice(0, 10)) ||
             p.companyName.toLowerCase().includes((e.companyName as string).toLowerCase().slice(0, 10)))
        );
        const email = sanitizeEmail(
          (p as PlacesResult & { email?: string }).email ?? (match?.email ? String(match.email) : null)
        );
        const phone = sanitizePhone(p.phone ?? (match?.phone ? String(match.phone) : null));
        const contactName = match?.contactName ? String(match.contactName) : null;
        const website = p.website ?? null;
        const score = fromService?.score != null
          ? fromService.score
          : genericSearch
            ? completenessScore(!!email, !!phone, !!website, !!contactName)
            : typeof match?.score === "number" ? Math.min(100, Math.max(0, Math.round(match.score))) : 60;
        const motivation = fromService?.motivation
          ?? (genericSearch
            ? `Azienda${search.location ? ` di ${search.location}` : ""} trovata su Google Maps${p.piva ? " e registro CCIAA" : ""}.`
            : (match?.motivation ? String(match.motivation) : null));
        return {
          companyName: p.companyName,
          website,
          sector: p.sector ?? search.sector ?? null,
          location: p.address ?? p.location,
          companySize: search.companySize ?? null,
          phone,
          contactName,
          contactRole: match?.contactRole ? String(match.contactRole) : null,
          email,
          linkedinUrl: null,
          score,
          motivation,
        };
      });

    } else {
      // Fallback: Sonar trova tutto da zero (solo se Places e FatturatoItalia hanno fallito)
      const raw = await chatCompletion(
        [
          {
            role: "system",
            content: `Sei un esperto ricercatore di lead B2B con accesso alla ricerca web in tempo reale.
Cerca aziende REALI che trovi effettivamente su internet. Per ogni azienda verifica sito web, referente, contatti.
REGOLE FONDAMENTALI:
- Includi SOLO aziende con sede nella localita' specificata — NON aziende di altre citta' o regioni
- NON inventare dati: se non trovi un campo, usa null
- NON costruire siti web o email a caso — inserisci solo quelli che verifichi sul web
- Se non riesci a trovare abbastanza aziende reali, restituisci meno oggetti (non aggiungere aziende false)
- Rispondi SOLO con JSON array valido, zero testo aggiuntivo, zero markdown`,
          },
          {
            role: "user",
            content: `Criteri di ricerca:
${criteriaText}

Cerca fino a ${search.maxResults} aziende reali con sede esclusivamente in: ${loc || "Italia"}.
Rispondi SOLO con JSON array:
[
  {
    "companyName": "Nome Azienda Srl",
    "website": "www.nomeazienda.it",
    "sector": "settore",
    "location": "Città, Provincia",
    "companySize": "11-50",
    "contactName": "Nome Cognome",
    "contactRole": "CEO / Titolare",
    "email": "info@nomeazienda.it",
    "phone": "+39 02 1234567",
    "score": 85,
    "motivation": "perche' corrisponde ai criteri"
  }
]
Usa email generica (info@, commerciale@) solo se la trovi sul sito reale. Lascia null se non la trovi.`,
          },
        ],
        { maxTokens: 3000, temperature: 0.2, model: process.env.OPENROUTER_MODEL_LEADFINDER ?? "perplexity/sonar" }
      );

      const candidates = extractJsonArray(raw);
      parsed = candidates
        .filter((c) => typeof c.companyName === "string" && c.companyName)
        .map((c) => ({
          companyName: String(c.companyName),
          website: c.website ? String(c.website) : null,
          sector: c.sector ? String(c.sector) : null,
          location: c.location ? String(c.location) : null,
          companySize: c.companySize ? String(c.companySize) : null,
          contactName: c.contactName ? String(c.contactName) : null,
          contactRole: c.contactRole ? String(c.contactRole) : null,
          email: sanitizeEmail(c.email ? String(c.email) : null),
          phone: sanitizePhone(c.phone ? String(c.phone) : null),
          linkedinUrl: null,
          score: typeof c.score === "number" ? Math.min(100, Math.max(0, Math.round(c.score))) : 50,
          motivation: c.motivation ? String(c.motivation) : null,
        }));
    }

    // Enrichment pass: aziende ancora senza email → secondo tentativo Sonar
    // Esclude chi ha gia' l'email scraped dal sito (piu' affidabile)
    const stillMissingEmail = parsed.filter((c) => !c.email);
    if (stillMissingEmail.length > 0) {
      try {
        const enrichPrompt = stillMissingEmail
          .map((c) => `- ${c.companyName}${c.website ? ` (${c.website})` : ""}`)
          .join("\n");
        const enrichRaw = await chatCompletion(
          [
            { role: "system", content: "Cerca sul web email e telefono delle seguenti aziende italiane. NON inventare email — inserisci SOLO quelle che trovi verificate sul sito ufficiale o pagine contatti. Se non trovi nulla, lascia null. Rispondi SOLO con JSON array, zero testo extra." },
            { role: "user", content: `Cerca email e telefono sul sito ufficiale o pagina contatti di queste aziende:\n${enrichPrompt}\n\nJSON array:\n[{"companyName":"...","email":"...","phone":"..."}]` },
          ],
          { maxTokens: 1500, temperature: 0.2, model: process.env.OPENROUTER_MODEL_LEADFINDER ?? "perplexity/sonar" }
        );
        const enrichStripped = enrichRaw.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
        const enrichMatch = enrichStripped.match(/\[[\s\S]*\]/);
        if (enrichMatch) {
          const enriched = JSON.parse(enrichMatch[0]) as Array<{ companyName: string; email?: string; phone?: string }>;
          parsed = parsed.map((c) => {
            const found = enriched.find((e) => e.companyName?.toLowerCase().includes(c.companyName.toLowerCase().slice(0, 8)));
            if (!found) return c;
            return { ...c, email: c.email ?? sanitizeEmail(found.email || null), phone: c.phone ?? sanitizePhone(found.phone || null) };
          });
        }
      } catch {
        // non-fatal
      }
    }

    const rows = parsed.map((c) => ({
      organizationId: orgId,
      searchId,
      ...c,
      source: hasPlacesData
        ? (fatturatoResults.length > 0 ? "Google Maps + CCIAA + AI" : "Google Maps + AI")
        : "AI",
      status: "PENDING",
    }));

    await db.leadCandidate.createMany({ data: rows });
    await db.leadFinderSearch.update({ where: { id: searchId }, data: { status: "DONE" } });
    revalidatePath(`/lead-finder/${searchId}`);
    return { error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore AI";
    await db.leadFinderSearch.update({ where: { id: searchId }, data: { status: "FAILED", error: msg } });
    return { error: msg };
  }
}

// ─── getSearches ──────────────────────────────────────────────────────────

export async function getSearches(): Promise<{ data: (LeadFinderSearch & { _count: { candidates: number } })[] | null; error: string | null }> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return { data: null, error: "Non autorizzato" };

  try {
    const rows = await db.leadFinderSearch.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { candidates: true } } },
    });
    return {
      data: rows.map((r) => ({ ...mapSearch(r), _count: r._count })),
      error: null,
    };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Errore" };
  }
}

// ─── getCandidates ────────────────────────────────────────────────────────

export async function getCandidates(
  searchId: string
): Promise<{ data: { search: LeadFinderSearch; candidates: LeadCandidate[] } | null; error: string | null }> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return { data: null, error: "Non autorizzato" };

  try {
    const search = await db.leadFinderSearch.findFirst({
      where: { id: searchId, organizationId: orgId },
      include: { candidates: { orderBy: { score: "desc" } } },
    });
    if (!search) return { data: null, error: "Ricerca non trovata" };

    return {
      data: {
        search: mapSearch(search),
        candidates: search.candidates.map(mapCandidate),
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Errore" };
  }
}

// ─── approveCandidate ─────────────────────────────────────────────────────

export async function approveCandidate(
  candidateId: string
): Promise<{ leadId: string | null; error: string | null }> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return { leadId: null, error: "Non autorizzato" };

  const candidate = await db.leadCandidate.findFirst({
    where: { id: candidateId, organizationId: orgId },
  });
  if (!candidate) return { leadId: null, error: "Candidato non trovato" };
  if (candidate.status === "APPROVED") return { leadId: candidate.leadId, error: null };

  // Controlla se esiste già un lead con lo stesso nome azienda
  const normalizedName = normalizeCompanyName(candidate.companyName);
  const allOrgLeads = await db.lead.findMany({
    where: { organizationId: orgId },
    select: { id: true, title: true },
  });
  const duplicate = allOrgLeads.find((l) => normalizeCompanyName(l.title) === normalizedName);
  if (duplicate) {
    await db.leadCandidate.update({
      where: { id: candidateId },
      data: { status: "APPROVED", leadId: duplicate.id },
    });
    return { leadId: duplicate.id, error: null };
  }

  const { data: newLead, error: leadError } = await createLead({
    title: candidate.companyName,
    source: "Lead Finder",
    score: candidate.score,
    email: candidate.email ?? undefined,
    phone: candidate.phone ?? undefined,
    notes: candidate.motivation ?? undefined,
    status: "NEW",
    data: {
      website: candidate.website,
      sector: candidate.sector,
      location: candidate.location,
      companySize: candidate.companySize,
      contactName: candidate.contactName,
      contactRole: candidate.contactRole,
      linkedinUrl: candidate.linkedinUrl,
      source: "Lead Finder AI",
    },
  });

  if (leadError || !newLead) return { leadId: null, error: leadError ?? "Errore creazione lead" };

  await db.leadCandidate.update({
    where: { id: candidateId },
    data: { status: "APPROVED", leadId: newLead.id },
  });

  revalidatePath(`/lead-finder`);
  return { leadId: newLead.id, error: null };
}

// ─── rejectBelowScore ─────────────────────────────────────────────────────

export async function rejectBelowScore(
  searchId: string,
  threshold = 70
): Promise<{ count: number; error: string | null }> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return { count: 0, error: "Non autorizzato" };

  try {
    const result = await db.leadCandidate.updateMany({
      where: { searchId, organizationId: orgId, status: "PENDING", score: { lt: threshold } },
      data: { status: "REJECTED" },
    });
    revalidatePath(`/lead-finder/${searchId}`);
    return { count: result.count, error: null };
  } catch (e) {
    return { count: 0, error: e instanceof Error ? e.message : "Errore" };
  }
}

// ─── rejectCandidate ──────────────────────────────────────────────────────

export async function rejectCandidate(
  candidateId: string
): Promise<{ error: string | null }> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return { error: "Non autorizzato" };

  try {
    await db.leadCandidate.updateMany({
      where: { id: candidateId, organizationId: orgId },
      data: { status: "REJECTED" },
    });
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Errore" };
  }
}

// ─── deleteSearch ─────────────────────────────────────────────────────────

export async function deleteSearch(
  searchId: string
): Promise<{ error: string | null }> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return { error: "Non autorizzato" };

  try {
    await db.leadFinderSearch.delete({
      where: { id: searchId, organizationId: orgId },
    });
    revalidatePath("/lead-finder");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Errore eliminazione" };
  }
}

// ─── getLeadFinderInfo ────────────────────────────────────────────────────
// Returns plan limits + today's usage for the current org

export async function getLeadFinderInfo(): Promise<{
  perDay: number | null;
  maxResults: number;
  usedToday: number;
}> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return { perDay: 0, maxResults: 10, usedToday: 0 };

  const plan = await getOrgPlan(orgId);
  const limits = getLimits(plan);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const usedToday = limits.leadFinderPerDay !== null
    ? await db.leadFinderSearch.count({ where: { organizationId: orgId, createdAt: { gte: startOfDay } } })
    : 0;

  return {
    perDay: limits.leadFinderPerDay,
    maxResults: limits.leadFinderMaxResults,
    usedToday,
  };
}
