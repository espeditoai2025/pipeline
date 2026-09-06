"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveMx } from "node:dns/promises";
import { chatCompletion, DEFAULT_MODEL, LEADFINDER_MODEL } from "@/lib/openrouter";
import { getOrgPlan, getLimits } from "@/lib/plan";
import { italianDayBounds } from "@/lib/italian-date";
import {
  asText, atecoMatchesSector, clampScore, companyNameToken, completenessScore, dedupeKey, emailPlausibleForCompany, findRowByName, isLinkedInUrl,
  matchAiRows, normalizeCompanyName, normalizeItalianPhone, normalizeWebsite, parseJsonArrayLenient, sanitizeEmail, sanitizePhone,
  sizeMatches, websiteDomain, websiteVariants,
} from "@/lib/lead-finder-utils";
import { createLead } from "@/server/actions/leads";
import type { LeadFinderSearch, LeadCandidate } from "@/types/lead-finder";

function getIds(s: Session | null) {
  const user = s?.user as { id?: string; organizationId?: string } | undefined;
  return { orgId: user?.organizationId ?? null, userId: user?.id ?? null };
}

// Una ricerca resta RUNNING se la funzione serverless scade prima della fine:
// oltre questo tempo la consideriamo fallita, così l'interfaccia non resta bloccata su "In corso".
const STALE_RUNNING_MS = 10 * 60_000;
async function failStaleSearches(orgId: string) {
  await db.leadFinderSearch.updateMany({
    where: { organizationId: orgId, status: "RUNNING", updatedAt: { lt: new Date(Date.now() - STALE_RUNNING_MS) } },
    data: { status: "FAILED", error: "Ricerca interrotta per timeout. Riprova, magari con meno risultati o una zona più precisa." },
  }).catch(() => { /* la lettura prosegue comunque */ });
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
        signal: AbortSignal.timeout(6000), // best effort: il portale spesso non restituisce nulla ai server
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
    // Il portale INI-PEC oggi non restituisce PEC alle richieste automatiche: se il primo lotto
    // è vuoto non ha senso aspettare i timeout di tutti gli altri.
    if (i === 0 && batchResults.every((r) => r === null)) break;
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
  piva: string | null; ateco: string | null; nDipendenti: string | null;
  formaGiuridica: string | null; annoFondazione: string | null;
  emailSource: string | null; phoneSource: string | null; websiteSource: string | null;
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
    const { start: startOfDay } = italianDayBounds(new Date()); // giorno italiano, anche con server in UTC
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
  ateco?: string | null;
  nDipendenti?: string | null;
  formaGiuridica?: string | null;
  annoFondazione?: string | null;
  revenue?: string | null; // es. "€ 1.519.207 (2024)" dal registro
  fatturatoSlug?: string | null;
  email?: string | null;
  // Origine dei contatti: "sito" | "pec" | "maps" | "registro" | "ai" | "ai-verificato"
  emailSource?: string | null;
  phoneSource?: string | null;
  websiteSource?: string | null;
  // Primo stadio dell'imbuto: punteggio economico (servizio Python o modello) usato per scegliere chi arricchire
  preScore?: number | null;
  preMotivation?: string | null;
  _inactive?: boolean; // flag interno — azienda cessata/non attiva, da scartare
};

// Primo stadio dell'imbuto: valuta le aziende sui soli dati del registro con un modello economico,
// così la ricerca web con Sonar si paga solo per le migliori. Fallisce in silenzio: senza punteggio
// resta l'ordine di partenza (fatturato decrescente per il registro, rilevanza per Google Maps).
async function prescoreWithModel(criteriaText: string, items: PlacesResult[]): Promise<void> {
  const BATCH = 20;
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    const list = batch.map((p, idx) => {
      const facts = [
        p.sector ? `settore ${p.sector}` : null,
        p.ateco ? `ATECO ${p.ateco}` : null,
        p.nDipendenti ? `${p.nDipendenti} dipendenti` : null,
        p.revenue ? `fatturato ${p.revenue}` : null,
        p.address ?? p.location,
      ].filter(Boolean).join(", ");
      return `id ${idx}: ${p.companyName}${facts ? ` — ${facts}` : ""}`;
    }).join("\n");
    try {
      const raw = await chatCompletion(
        [
          {
            role: "system",
            content: `Sei un analista commerciale B2B. Valuta quanto ogni azienda corrisponde ai criteri del cliente ideale usando SOLO i dati forniti (nome, settore, ATECO, dimensione, fatturato, zona). Nessuna ricerca, nessun dato inventato.
Rispondi SOLO con un JSON array, un oggetto per azienda con lo stesso id ricevuto: [{"id":0,"score":75,"motivation":"...","website":"https://www.azienda.it"}]
Score 0-100 (100 = cliente ideale). Motivation in italiano, massimo 120 caratteri, riferita ai criteri.
Website: il sito ufficiale SOLO se lo conosci con certezza, altrimenti null (verrà verificato; un sito sbagliato è peggio di nessun sito).`,
          },
          { role: "user", content: `Criteri cliente ideale:\n${criteriaText}\n\nAziende:\n${list}` },
        ],
        { model: DEFAULT_MODEL, maxTokens: 2500, temperature: 0.2, timeoutMs: 45_000 },
      );
      const rows = parseJsonArrayLenient(raw);
      const byId = matchAiRows(rows, batch.length);
      let scored = 0;
      batch.forEach((p, idx) => {
        const row = byId.get(idx);
        if (!row) return;
        const score = clampScore(row.score, NaN);
        if (Number.isFinite(score)) {
          p.preScore = score;
          p.preMotivation = asText(row.motivation);
          scored++;
        }
        // A site the model is sure about is worth a visit: it stays "ai" until the probe confirms it.
        if (!p.website) {
          const site = normalizeWebsite(asText(row.website));
          if (site) {
            p.website = site;
            p.websiteSource = "ai";
          }
        }
      });
      if (scored < batch.length) {
        console.warn(`[leadFinder] pre-valutazione parziale: ${scored}/${batch.length} punteggi (righe ${rows.length}, id ${[...byId.keys()].sort((a, b) => a - b).join(",")}); risposta: ${raw.slice(0, 200).replace(/\s+/g, " ")}`);
      }
    } catch (err) {
      console.warn("[leadFinder] pre-valutazione non riuscita:", err instanceof Error ? err.message : err);
    }
  }
}

// Verifica che il dominio di una email possa ricevere posta. Errori di rete o timeout non bocciano:
// true/false solo quando il DNS risponde, null quando non si sa.
async function domainHasMx(domain: string): Promise<boolean | null> {
  try {
    const records = await Promise.race([
      resolveMx(domain),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
    ]);
    if (records === null) return null;
    return records.length > 0;
  } catch (err) {
    const code = (err as { code?: string }).code;
    return code === "ENOTFOUND" || code === "ENODATA" ? false : null;
  }
}

const FATTURATO_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Accept-Language": "it-IT,it;q=0.9",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/&euro;/g, "€")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&");
}

function htmlText(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

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
        websiteSource: p.websiteUri ? "maps" : null,
        phoneSource: p.internationalPhoneNumber ? "maps" : null,
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
  startPage = 1,
): Promise<PlacesResult[]> {
  const results: PlacesResult[] = [];
  const seenSlugs = new Set<string>();
  const maxPages = Math.ceil(maxResults / 45) + 1;

  // Struttura del listing (settembre 2026), una riga per azienda:
  //   <article class="fi-geo-company-row">
  //     <span class="nome_azienda"><a href="/slug-codicefiscale">NOME IN MAIUSCOLO</a></span>
  //     <span class="fi-geo-company-revenue">&euro; 1.234.567</span>
  //     <span class="fi-geo-company-location"><a href="/comune/x">Comune</a> (<a href="/provincia/y">BG</a>)</span>
  //   </article>
  // I link sono relativi; per sicurezza si accetta anche la forma assoluta. Le 11 cifre finali sono il
  // codice fiscale, che per la maggior parte delle società coincide con la P.IVA (la scheda la conferma).
  const ROW = /<article class="fi-geo-company-row">([\s\S]*?)<\/article>/gi;
  const COMPANY_LINK = /<a href="(?:https?:\/\/www\.fatturatoitalia\.it)?\/([a-z0-9][a-z0-9_-]*-\d{11})"[^>]*>([^<]{2,150})<\/a>/i;
  const ANY_COMPANY_LINK = new RegExp(COMPANY_LINK.source, "gi");

  const pushRow = (slug: string, rawName: string, block: string) => {
    if (!slug || rawName.trim().length < 2 || seenSlugs.has(slug)) return;
    seenSlugs.add(slug);
    const revenueRaw = block.match(/fi-geo-company-revenue">([^<]+)</i)?.[1];
    const revenue = revenueRaw && !/^\s*n\/?d\s*$/i.test(htmlText(revenueRaw)) ? revenueRaw : null;
    const comune = block.match(/\/comune\/[^"]+"[^>]*>([^<]+)</i)?.[1];
    const provincia = block.match(/\/provincia\/[^"]+"[^>]*>([^<]+)</i)?.[1];
    const location = comune ? `${htmlText(comune)}${provincia ? ` (${htmlText(provincia)})` : ""}` : labelLocation;
    results.push({
      companyName: normalizeCompanyName(htmlText(rawName)),
      website: null,
      phone: null,
      location,
      fatturatoSlug: slug,
      piva: extractVatFromSlug(slug),
      revenue: revenue ? htmlText(revenue) : null,
    });
  };

  for (let page = startPage; page < startPage + maxPages; page++) {
    try {
      const url = page === 1 ? baseUrl : `${baseUrl}/${page}`;
      const res = await fetch(url, { headers: FATTURATO_HEADERS, next: { revalidate: 3600 }, signal: AbortSignal.timeout(15_000) });
      if (!res.ok) break;
      const html = await res.text();
      const before = results.length;

      const rows = [...html.matchAll(ROW)];
      if (rows.length > 0) {
        for (const row of rows) {
          const block = row[1] ?? "";
          const m = block.match(COMPANY_LINK);
          if (m) pushRow(m[1] ?? "", m[2] ?? "", block);
          if (results.length >= maxResults) break;
        }
      } else {
        // Ripiego se il markup cambia ancora: qualsiasi link azienda nella pagina
        for (const m of html.matchAll(ANY_COMPANY_LINK)) {
          pushRow(m[1] ?? "", m[2] ?? "", "");
          if (results.length >= maxResults) break;
        }
      }

      if (results.length === before || results.length >= maxResults) break;
    } catch {
      break;
    }
  }
  return results;
}

// Legge i campi della scheda azienda (settembre 2026): tabella "Dati aziendali" con
// <th scope="row">Etichetta</th><td>Valore</td>, più una lista <dt>/<dd> con gli stessi dati.
// Le etichette sono confrontate in minuscolo, così piccole variazioni non rompono il parser.
function extractDetailFields(html: string): Map<string, string> {
  const fields = new Map<string, string>();
  const MISSING = /^(n\/?d|n\.d\.|-|non disponibile)$/i; // il sito scrive "N/D" per i dati mancanti
  const put = (rawKey: string, rawValue: string) => {
    const key = htmlText(rawKey).toLowerCase();
    const value = htmlText(rawValue);
    if (key && value && !MISSING.test(value) && !fields.has(key)) fields.set(key, value);
  };
  for (const m of html.matchAll(/<th scope="row">([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi)) put(m[1] ?? "", m[2] ?? "");
  for (const m of html.matchAll(/<dt>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi)) put(m[1] ?? "", m[2] ?? "");
  return fields;
}

// Scheda azienda → P.IVA reale, indirizzo completo, settore/ATECO, dipendenti, forma giuridica,
// anno di fondazione e fatturato. Telefono e sito non sono più nella pagina gratuita.
// Scarta le aziende il cui stato non è "Attiva" (cessate, in liquidazione, inattive).
async function fetchFatturatoDetail(slug: string): Promise<Partial<PlacesResult>> {
  try {
    const res = await fetch(`https://www.fatturatoitalia.it/${slug}`, {
      headers: FATTURATO_HEADERS,
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return {};
    const html = await res.text();
    const fields = extractDetailFields(html);
    if (fields.size === 0) return {};
    const get = (...keys: string[]) => {
      for (const k of keys) { const v = fields.get(k); if (v) return v; }
      return null;
    };

    const stato = get("stato attività", "stato attivita", "stato");
    if (stato && !/^attiva/i.test(stato)) return { _inactive: true };

    const viaRaw = get("indirizzo");
    const via = viaRaw ? normalizeCompanyName(viaRaw) : null; // il registro scrive gli indirizzi in maiuscolo
    const comune = get("comune", "città", "citta");
    const provincia = get("provincia");
    const place = comune ? `${comune}${provincia ? ` (${provincia})` : ""}` : provincia;
    const address = [via, place].filter(Boolean).join(", ") || null;

    const atecoCode = get("codice ateco") ?? get("ateco")?.split(" - ")[0]?.trim() ?? null;
    const attivita = get("attività prevalente", "attivita prevalente") ?? get("ateco")?.split(" - ").slice(1).join(" - ").trim() ?? null;
    const sector = attivita || (atecoCode ? `ATECO ${atecoCode}` : null);
    const nDipendenti = get("n. dipendenti", "dipendenti");
    const formaGiuridica = get("forma giuridica");
    const annoFondazione = get("anno fondazione", "anno di fondazione");
    const pivaDigits = get("partita iva", "p.iva")?.replace(/\D/g, "") ?? "";
    const piva = pivaDigits.length === 11 ? pivaDigits : undefined;
    const revenueKey = [...fields.keys()].find((k) => k.startsWith("fatturato"));
    const revenueValue = revenueKey ? fields.get(revenueKey) : null;
    const revenueYear = revenueKey?.replace("fatturato", "").trim();
    const revenue = revenueValue ? `${revenueValue}${revenueYear ? ` (${revenueYear})` : ""}` : null;

    return { address, sector, ateco: atecoCode, nDipendenti, formaGiuridica, annoFondazione, piva, revenue, phone: null, website: null };
  } catch {
    return {};
  }
}

// ─── Scraping email dal sito aziendale ────────────────────────────────────
// Cerca mailto: link nella homepage e nella pagina /contatti — fonte piu' affidabile

// Visita home e pagine contatti di un sito: dice se il sito risponde e restituisce la prima email
// trovata in un link mailto: o nel testo visibile. Usato sia per i siti del registro sia per quelli
// proposti dal modello, che vengono accettati solo se rispondono davvero.
type WebsiteProbe = {
  /** Some server answered: the site exists even when it refuses bots (403) or the home page is a 404. */
  reachable: boolean;
  /** The variant that answered ("https://www.azienda.it"), so the stored link is one that works. */
  url: string | null;
  /** The pages mention the company's distinctive name: reasonable evidence that the site is really theirs. */
  nameFound: boolean;
  email: string | null;
};

const PROBE_HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; Pipely-CRM/1.0)", Accept: "text/html,*/*;q=0.8" };

async function probeWebsite(website: string, companyName?: string): Promise<WebsiteProbe> {
  const SKIP_PATTERNS = /\.(png|jpg|jpeg|gif|svg|css|js|pdf)$/i;
  const SKIP_EMAILS = /^(noreply|no-reply|donotreply|support|webmaster|admin|postmaster|info-|privacy|cookie|dpo@)/i;
  const token = companyName ? companyNameToken(companyName) : null;
  const result: WebsiteProbe = { reachable: false, url: null, nameFound: false, email: null };

  // Sites often answer only with or only without "www.", and a few still serve plain http.
  let base: string | null = null;
  for (const variant of websiteVariants(website)) {
    try {
      const res = await fetch(variant, { headers: PROBE_HEADERS, signal: AbortSignal.timeout(6000), redirect: "follow" });
      result.reachable = true;
      result.url = variant;
      base = variant;
      if (res.ok) {
        const html = await res.text();
        if (token && html.toLowerCase().includes(token)) result.nameFound = true;
        const email = extractEmailFromHtml(html, SKIP_PATTERNS, SKIP_EMAILS);
        if (email) return { ...result, email };
      }
      break;
    } catch {
      continue;
    }
  }
  if (!base) return result;

  for (const path of ["/contatti", "/contact", "/chi-siamo"]) {
    try {
      const res = await fetch(`${base}${path}`, { headers: PROBE_HEADERS, signal: AbortSignal.timeout(6000), redirect: "follow" });
      if (!res.ok) continue;
      const html = await res.text();
      if (token && html.toLowerCase().includes(token)) result.nameFound = true;
      const email = extractEmailFromHtml(html, SKIP_PATTERNS, SKIP_EMAILS);
      if (email) return { ...result, email };
    } catch {
      continue;
    }
  }
  return result;
}

function extractEmailFromHtml(html: string, skipPatterns: RegExp, skipEmails: RegExp): string | null {
  // Priorita' 1: mailto: link espliciti
  for (const m of html.matchAll(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi)) {
    const email = m[1]?.toLowerCase();
    if (email && !skipPatterns.test(email) && !skipEmails.test(email)) return email;
  }
  // Priorita' 2: pattern email nel testo visibile (non dentro script/style)
  const textOnly = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
  for (const m of textOnly.matchAll(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g)) {
    const email = m[1]?.toLowerCase();
    if (email && !skipPatterns.test(email) && !skipEmails.test(email)) return email;
  }
  return null;
}

async function scrapeEmailFromWebsite(website: string): Promise<string | null> {
  return (await probeWebsite(website)).email;
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
      if (d.piva) c.piva = d.piva; // P.IVA reale dalla scheda: lo slug contiene il codice fiscale
      if (d.revenue) c.revenue = d.revenue;
      if (d.address) c.address = d.address;
      if (d.sector && !c.sector) c.sector = d.sector;
      if (d.ateco && !c.ateco) c.ateco = d.ateco;
      if (d.nDipendenti && !c.nDipendenti) c.nDipendenti = d.nDipendenti;
      if (d.formaGiuridica && !c.formaGiuridica) c.formaGiuridica = d.formaGiuridica;
      if (d.annoFondazione && !c.annoFondazione) c.annoFondazione = d.annoFondazione;
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
  startPage = 1,
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
    return scrapeFatturatoPages(url, locationLabel, maxResults, startPage).catch(() => []);
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
  ateco?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  n_dipendenti?: string | null;
  forma_giuridica?: string | null;
  anno_fondazione?: string | null;
  revenue?: string | null;
  email_source?: string | null;
  website_source?: string | null;
  score?: number;
  motivation?: string | null;
};

async function fetchFromScraperService(
  search: { location?: string | null; sector?: string | null; keywords?: string | null; idealCustomer?: string | null; maxResults: number },
  geo?: GeoResult | null,
  pageOffset = 0,
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
        // Il chiamante passa già la dimensione del bacino; le schede scartano aziende cessate
        max_results: Math.min(60, Math.max(search.maxResults, 20)),
        sector: search.sector ?? null,
        keywords: search.keywords ?? null,
        ideal_customer: search.idealCustomer ?? null,
        page_offset: pageOffset,
      }),
      signal: AbortSignal.timeout(240_000), // max 4 min
    });
    if (!res.ok) return { companies: [], available: false };
    const data = await res.json() as { companies: ScraperServiceCompany[] };
    return { companies: data.companies ?? [], available: true };
  } catch {
    return { companies: [], available: false };
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
  if (search.status === "DONE") return { error: "Ricerca già completata: crea una nuova ricerca per altri risultati" };
  if (search.status === "RUNNING" && Date.now() - search.updatedAt.getTime() < STALE_RUNNING_MS) {
    return { error: "Ricerca già in corso: attendi il completamento" };
  }

  await db.leadFinderSearch.update({ where: { id: searchId }, data: { status: "RUNNING", error: null } });

  try {
    // ── FASE 1: Google Places → aziende reali verificate ──────────────────
    const hasSpecificTerm = !!(search.keywords || search.sector);
    const genericSearch = !hasSpecificTerm && !search.idealCustomer;
    const loc = search.location ?? "";

    // Imbuto a due stadi: con criteri si raccoglie un bacino tre volte più ampio del richiesto,
    // lo si filtra sui dati del registro e lo si pre-valuta a basso costo; solo i migliori
    // maxResults passano alla ricerca web con Sonar. Senza criteri il bacino serve solo alla deduplica.
    const poolTarget = genericSearch ? Math.max(search.maxResults, 20) : Math.min(60, Math.max(search.maxResults * 3, 30));

    const criteria: string[] = [];
    if (search.sector) criteria.push(`Settore: ${search.sector}`);
    if (search.location) criteria.push(`Paese/Città: ${search.location}`);
    if (search.companySize) criteria.push(`Dimensione azienda: ${search.companySize} dipendenti`);
    if (search.keywords) criteria.push(`Parole chiave: ${search.keywords}`);
    if (search.idealCustomer) criteria.push(`Descrizione cliente ideale: ${search.idealCustomer}`);
    const criteriaText = criteria.length > 0
      ? criteria.join("\n")
      : `Qualsiasi azienda, artigiano o libero professionista${search.location ? ` di ${search.location}` : " italiano"}`;

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
      placesResults = await searchGooglePlaces(q, Math.min(20, poolTarget), coords);
    } else {
      // Ricerca generica: categorie a ondate di 4 interrogazioni, finché i risultati bastano.
      // Ogni interrogazione Places ha un costo: per 10 candidati non servono 13 chiamate.
      const target = Math.min(60, Math.ceil(search.maxResults * 1.5));
      const seen = new Map<string, PlacesResult>();
      const WAVE = 4;
      for (let i = 0; i < ALL_CATEGORIES.length && seen.size < target; i += WAVE) {
        const queries = ALL_CATEGORIES.slice(i, i + WAVE).map((cat) => (coords ? cat : `${cat} ${loc}`.trim()));
        const arrays = await Promise.all(queries.map((q) => searchGooglePlaces(q, 20, coords)));
        for (const p of arrays.flat()) {
          const key = dedupeKey(p.companyName);
          if (key && !seen.has(key)) seen.set(key, p);
        }
      }
      placesResults = [...seen.values()].slice(0, search.maxResults);
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
    //
    // Paginazione automatica: ricerche successive con la stessa location partono
    // dalla pagina successiva (45 aziende/pagina su FatturatoItalia).
    const alreadyFoundPiva = search.location
      ? await db.leadCandidate.count({
          where: { organizationId: orgId, piva: { not: null }, search: { location: search.location } },
        })
      : 0;
    const fatturatoStartPage = Math.max(1, Math.floor(alreadyFoundPiva / 45) + 1);

    let fatturatoResults: PlacesResult[] = [];

    if (search.location) {
      try {
        const { companies, available } = await fetchFromScraperService({ ...search, maxResults: poolTarget }, coords, fatturatoStartPage - 1);
        if (available && companies.length > 0) {
          // Converti in PlacesResult per il merge successivo; il punteggio del servizio vale come pre-valutazione
          fatturatoResults = companies.map((c) => ({
            companyName: c.name,
            // The scorer may propose a site it is sure about: it stays "ai" until the probe confirms it
            website: normalizeWebsite(c.website),
            phone: c.phone ?? null,
            location: c.address ?? search.location,
            piva: c.piva ?? null,
            address: c.address ?? null,
            sector: c.sector ?? null,
            ateco: c.ateco ?? null,
            nDipendenti: c.n_dipendenti ?? null,
            formaGiuridica: c.forma_giuridica ?? null,
            annoFondazione: c.anno_fondazione ?? null,
            revenue: c.revenue ?? null,
            email: c.email ?? null,
            emailSource: c.email ? (c.email_source ?? "sito") : null,
            phoneSource: c.phone ? "registro" : null,
            websiteSource: normalizeWebsite(c.website) ? (c.website_source ?? "registro") : null,
            preScore: typeof c.score === "number" ? c.score : null,
            preMotivation: c.motivation ?? null,
          }));
        } else if (!available || companies.length === 0) {
          // Python service non disponibile o 0 risultati — usa scraper TypeScript
          fatturatoResults = await fetchFatturatoItalia(
            search.location,
            Math.max(poolTarget, 30),
            coords,
            fatturatoStartPage,
          );
        }
      } catch {
        // non-fatal: procedi senza
      }
    }

    // Merge Places + FatturatoItalia — deduplica per nome normalizzato e P.IVA
    const seenKeys = new Set(placesResults.map((p) => dedupeKey(p.companyName)));
    const seenPiva = new Set<string>();
    const newFromFatturato = fatturatoResults.filter((f) => {
      const key = dedupeKey(f.companyName);
      if (!key || seenKeys.has(key)) return false;
      if (f.piva && seenPiva.has(f.piva)) return false;
      seenKeys.add(key);
      if (f.piva) seenPiva.add(f.piva);
      return true;
    });

    // Bacino completo: la selezione avviene dopo deduplica, filtri e pre-valutazione
    let allPlacesResults: PlacesResult[] = [...placesResults, ...newFromFatturato];

    // ── DEDUPLICAZIONE: salta aziende già trovate nella stessa location e nel CRM ──
    // Se c'è una location, esclude TUTTI i candidati già trovati per quella location
    // (non solo gli APPROVED) — così ricerche successive restituiscono aziende nuove.
    const [existingCandidates, existingLeads] = await Promise.all([
      search.location
        ? db.leadCandidate.findMany({
            where: { organizationId: orgId, search: { location: search.location } },
            select: { companyName: true, piva: true, website: true },
          })
        : db.leadCandidate.findMany({
            where: { organizationId: orgId, status: "APPROVED" },
            select: { companyName: true, piva: true, website: true },
          }),
      db.lead.findMany({
        where: { organizationId: orgId },
        select: { title: true, email: true },
      }),
    ]);
    // Una sola chiave normalizzata per candidati e lead, più P.IVA e dominio del sito.
    const existingKeys = new Set(
      [...existingCandidates.map((c) => dedupeKey(c.companyName)), ...existingLeads.map((l) => dedupeKey(l.title))].filter(Boolean),
    );
    const existingPiva = new Set(existingCandidates.map((c) => c.piva).filter((v): v is string => !!v));
    const existingDomains = new Set(
      [
        ...existingCandidates.map((c) => websiteDomain(c.website)),
        ...existingLeads.map((l) => (l.email ? websiteDomain(l.email.split("@")[1]) : null)),
      ].filter((v): v is string => !!v),
    );
    allPlacesResults = allPlacesResults.filter((p) => {
      if (existingKeys.has(dedupeKey(p.companyName))) return false;
      if (p.piva && existingPiva.has(p.piva)) return false;
      const domain = websiteDomain(p.website);
      return !(domain && existingDomains.has(domain));
    });

    // ── FILTRI DETERMINISTICI sui dati del registro, a costo zero ───────────
    // Dimensione: si scarta solo quando il registro contraddice la fascia richiesta (mai sui dati mancanti).
    if (search.companySize) {
      allPlacesResults = allPlacesResults.filter((p) => sizeMatches(search.companySize, p.nDipendenti) !== false);
    }
    // Settore vs ATECO: prima le corrispondenze, poi le sconosciute (es. Google Maps, senza codice);
    // le incoerenze restano solo se servono a raggiungere il numero richiesto.
    if (search.sector) {
      const verdict = (p: PlacesResult) => atecoMatchesSector(p.ateco, search.sector);
      const matching = allPlacesResults.filter((p) => verdict(p) === true);
      const unknown = allPlacesResults.filter((p) => verdict(p) === null);
      const mismatching = allPlacesResults.filter((p) => verdict(p) === false);
      allPlacesResults = [...matching, ...unknown, ...(matching.length + unknown.length >= search.maxResults ? [] : mismatching)];
    }

    // ── PRE-VALUTAZIONE (primo stadio dell'imbuto) ─────────────────────────
    const poolAfterFilters = allPlacesResults.length;
    if (!genericSearch && allPlacesResults.length > search.maxResults) {
      await prescoreWithModel(criteriaText, allPlacesResults.filter((p) => typeof p.preScore !== "number"));
      const order = new Map(allPlacesResults.map((p, i) => [p, i]));
      allPlacesResults = [...allPlacesResults].sort((a, b) => {
        const sa = typeof a.preScore === "number" ? a.preScore : 50;
        const sb = typeof b.preScore === "number" ? b.preScore : 50;
        return sb - sa || order.get(a)! - order.get(b)!;
      });
    }
    allPlacesResults = allPlacesResults.slice(0, search.maxResults);
    console.warn(
      `[leadFinder] ricerca ${searchId}: maps ${placesResults.length}, registro ${fatturatoResults.length}, dopo filtri ${poolAfterFilters}, selezionate ${allPlacesResults.length}` +
      (genericSearch ? "" : ` (pre-valutazione: ${allPlacesResults.map((p) => (typeof p.preScore === "number" ? p.preScore : "-")).join(",")})`),
    );

    // ── FASE 1c: email dal sito aziendale (fonte verificata) ───────────────
    // Solo siti di Maps o del registro: quelli proposti dall'AI vengono prima verificati (nome in pagina)
    // dalla sonda più avanti, che raccoglie l'email a quel punto.
    {
      const noEmail = allPlacesResults.map((p, i) => ({ p, i })).filter(({ p }) => p.website && !p.email && p.websiteSource !== "ai").slice(0, 25);
      for (let bi = 0; bi < noEmail.length; bi += 5) {
        const batch = noEmail.slice(bi, bi + 5);
        const emails = await Promise.all(batch.map(({ p }) => scrapeEmailFromWebsite(p.website!)));
        emails.forEach((email, idx) => {
          const item = batch[idx];
          const sanitized = email ? sanitizeEmail(email) : null;
          if (sanitized && item) {
            allPlacesResults[item.i]!.email = sanitized;
            allPlacesResults[item.i]!.emailSource = "sito";
          }
        });
      }
    }

    // ── FASE 1d: INI-PEC, best effort ──────────────────────────────────────
    {
      const pecEmails = await enrichWithPec(allPlacesResults.map((p) => ({ piva: p.piva, email: p.email ?? null })));
      allPlacesResults = allPlacesResults.map((p, i) => {
        const pec = pecEmails[i] ? sanitizeEmail(pecEmails[i]) : null;
        return pec ? { ...p, email: pec, emailSource: "pec" } : p;
      });
    }

    const hasPlacesData = allPlacesResults.length > 0;

    // ── FASE 2: Perplexity/Sonar — arricchimento contatti (secondo stadio) ──

    type ParsedCandidate = {
      companyName: string; website: string | null; sector: string | null;
      location: string | null; companySize: string | null; contactName: string | null;
      contactRole: string | null; email: string | null; phone: string | null;
      linkedinUrl: string | null;
      piva: string | null; ateco: string | null; nDipendenti: string | null;
      formaGiuridica: string | null; annoFondazione: string | null;
      emailSource: string | null; phoneSource: string | null; websiteSource: string | null;
      score: number; motivation: string | null;
    };

    let parsed: ParsedCandidate[];

    if (hasPlacesData) {
      // Batch Sonar enrichment: 10 aziende per chiamata, con id espliciti per riabbinare le risposte.
      // Lotti più grandi superavano il limite di token e il JSON troncato faceva perdere l'intero lotto.
      const BATCH = 10;
      const enrichedAll: Array<Record<string, unknown>> = [];

      for (let i = 0; i < allPlacesResults.length; i += BATCH) {
        const batch = allPlacesResults.slice(i, i + BATCH);
        const companiesList = batch
          .map((p, idx) => {
            let line = `id ${i + idx}: ${p.companyName}`;
            if (p.piva) line += ` (P.IVA: ${p.piva})`;
            if (p.website) line += ` — ${p.website}`;
            if (p.address) line += ` — ${p.address}`;
            else if (p.location) line += ` — ${p.location}`;
            if (p.sector) line += ` — Settore: ${p.sector}`;
            if (p.nDipendenti) line += ` — Dipendenti: ${p.nDipendenti}`;
            if (p.revenue) line += ` — Fatturato: ${p.revenue}`;
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
4. Scrivi una motivazione sintetica (1-2 frasi) riferita ai criteri del cliente ideale
5. Se trovi telefono, sito ufficiale o profilo LinkedIn verificati, riportali; altrimenti null
REGOLE FONDAMENTALI:
- Ogni oggetto deve riportare lo stesso "id" ricevuto in ingresso
- Il sito deve essere quello ufficiale dell'azienda, non un aggregatore, un social o una pagina di terzi
- NON inventare email, nomi o dati non trovati — usa null se non trovi nulla
- L'email deve appartenere all'azienda: stesso dominio del sito, oppure PEC o provider personale
- NON costruire LinkedIn URL a caso — usa null se non trovi il profilo reale
- Rispondi SOLO con JSON array valido, zero testo aggiuntivo, zero markdown`,
              },
              {
                role: "user",
                content: `Criteri cliente ideale:\n${criteriaText}\n\nAttività da arricchire:\n${companiesList}\n\nJSON array (un oggetto per ogni attività, con lo stesso id):\n[{"id":0,"companyName":"...","contactName":"...","contactRole":"...","email":"...","phone":"...","website":"...","linkedinUrl":"...","score":80,"motivation":"..."}]`,
              },
            ],
            { maxTokens: 3000, temperature: 0.1, model: LEADFINDER_MODEL, timeoutMs: 90_000 }
          );
          try {
            const rows = parseJsonArrayLenient(raw);
            // Se il modello ha omesso gli id ma ha risposto per tutte le aziende, l'ordine del lotto è affidabile
            const aligned = rows.length === batch.length ? rows.map((r, idx) => (r.id === undefined ? { ...r, id: i + idx } : r)) : rows;
            enrichedAll.push(...aligned);
          } catch (err) {
            console.warn(`[leadFinder] lotto AI non interpretabile (${raw.length} caratteri):`, err instanceof Error ? err.message : err);
          }
        } catch (err) {
          console.warn("[leadFinder] lotto AI non riuscito:", err instanceof Error ? err.message : err);
        }
      }
      const aiById = matchAiRows(enrichedAll, allPlacesResults.length);

      // Merge Places/CCIAA + Sonar
      parsed = allPlacesResults.map((p, index) => {
        // Abbinamento per id; il nome normalizzato resta solo come ripiego per righe senza id
        const match = aiById.get(index) ?? findRowByName(enrichedAll, p.companyName);
        // Sito proposto dal modello: accettato solo con dominio sensato; viene poi verificato davvero
        const aiSite = p.website ? null : normalizeWebsite(asText(match?.website));
        const website = p.website ?? aiSite;
        const websiteSource = website ? (p.website ? (p.websiteSource ?? "registro") : "ai") : null;
        // Email trovate sul sito o su INI-PEC sono verificate; quelle proposte dal modello devono essere plausibili
        const scrapedEmail = sanitizeEmail(p.email ?? null);
        const aiEmail = sanitizeEmail(asText(match?.email));
        const email = scrapedEmail ?? (aiEmail && emailPlausibleForCompany(aiEmail, website) ? aiEmail : null);
        const emailSource = email ? (scrapedEmail ? (p.emailSource ?? "sito") : "ai") : null;
        const phone = sanitizePhone(p.phone ?? asText(match?.phone));
        const phoneSource = phone ? (p.phone ? (p.phoneSource ?? "registro") : "ai") : null;
        const contactName = asText(match?.contactName);
        // Punteggio: Sonar ha letto i criteri e il web, quindi vale più della pre-valutazione,
        // che resta come ripiego; per le ricerche generiche conta la completezza dei dati.
        const sonarScore = match && typeof match.score !== "undefined" ? clampScore(match.score, NaN) : NaN;
        const preScore = typeof p.preScore === "number" ? p.preScore : NaN;
        const score = genericSearch
          ? completenessScore(!!email, !!phone, !!website, !!contactName)
          : Number.isFinite(sonarScore) ? sonarScore : Number.isFinite(preScore) ? preScore : 60;
        const registryFacts = [p.sector, p.nDipendenti ? `${p.nDipendenti} dipendenti` : null, p.revenue ? `fatturato ${p.revenue}` : null].filter(Boolean).join(", ");
        const registryMotivation = `Azienda${search.location ? ` di ${search.location}` : ""} ${p.fatturatoSlug ? "dal registro CCIAA" : "trovata su Google Maps"}${registryFacts ? `: ${registryFacts}` : ""}.`;
        const motivation = genericSearch
          ? registryMotivation
          : asText(match?.motivation) ?? asText(p.preMotivation) ?? registryMotivation;
        return {
          companyName: p.companyName,
          website,
          sector: p.sector ?? search.sector ?? null,
          location: p.address ?? p.location,
          companySize: search.companySize ?? null,
          phone,
          contactName,
          contactRole: asText(match?.contactRole),
          email,
          emailSource,
          phoneSource,
          websiteSource,
          linkedinUrl: isLinkedInUrl(match?.linkedinUrl),
          piva: (p as PlacesResult).piva ?? null,
          ateco: (p as PlacesResult).ateco ?? null,
          nDipendenti: (p as PlacesResult).nDipendenti ?? null,
          formaGiuridica: (p as PlacesResult).formaGiuridica ?? null,
          annoFondazione: (p as PlacesResult).annoFondazione ?? null,
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
        { maxTokens: 3000, temperature: 0.2, model: LEADFINDER_MODEL }
      );

      const candidates = parseJsonArrayLenient(raw);
      const seenFallbackKeys = new Set<string>();
      parsed = candidates
        .filter((c) => typeof c.companyName === "string" && c.companyName.trim())
        .filter((c) => {
          const key = dedupeKey(String(c.companyName));
          if (!key || seenFallbackKeys.has(key)) return false;
          seenFallbackKeys.add(key);
          return true;
        })
        .map((c) => {
          const website = normalizeWebsite(asText(c.website));
          const aiEmail = sanitizeEmail(asText(c.email));
          const email = aiEmail && emailPlausibleForCompany(aiEmail, website) ? aiEmail : null;
          const phone = sanitizePhone(asText(c.phone));
          return {
            companyName: String(c.companyName).trim(),
            website,
            sector: asText(c.sector),
            location: asText(c.location),
            companySize: asText(c.companySize),
            contactName: asText(c.contactName),
            contactRole: asText(c.contactRole),
            email,
            phone,
            emailSource: email ? "ai" : null,
            phoneSource: phone ? "ai" : null,
            websiteSource: website ? "ai" : null,
            linkedinUrl: isLinkedInUrl(c.linkedinUrl),
            piva: null,
            ateco: null,
            nDipendenti: null,
            formaGiuridica: null,
            annoFondazione: null,
            score: clampScore(c.score, 50),
            motivation: asText(c.motivation),
          };
        });
    }

    // Enrichment pass: aziende ancora senza email → secondo tentativo Sonar
    // Esclude chi ha gia' l'email scraped dal sito (piu' affidabile)
    // I siti proposti dal modello vengono verificati con una visita reale: se non rispondono
    // vengono scartati insieme all'email che ne condivideva il dominio; se rispondono e manca
    // l'email, la si cerca nelle pagine contatti. Cap a 15 per non allungare la ricerca.
    {
      const toProbe = parsed.map((c, i) => ({ c, i })).filter(({ c }) => c.website && c.websiteSource === "ai").slice(0, 15);
      for (let bi = 0; bi < toProbe.length; bi += 5) {
        const batch = toProbe.slice(bi, bi + 5);
        const probes = await Promise.all(batch.map(({ c }) => probeWebsite(c.website!, c.companyName)));
        probes.forEach((probe, k) => {
          const { c, i } = batch[k]!;
          if (!probe.reachable) {
            const sameDomain = !!c.email && websiteDomain(c.email.split("@")[1]) === websiteDomain(c.website);
            parsed[i] = { ...c, website: null, websiteSource: null, email: sameDomain ? null : c.email, emailSource: sameDomain ? null : c.emailSource };
          } else {
            // Verified only when the pages mention the company: a live site with another name stays "da verificare",
            // and an email read from such a site inherits the doubt.
            const siteEmail = !c.email && probe.email ? sanitizeEmail(probe.email) : null;
            parsed[i] = {
              ...c,
              website: probe.url ?? c.website,
              websiteSource: probe.nameFound ? "ai-verificato" : "ai",
              email: c.email ?? siteEmail,
              emailSource: c.email ? c.emailSource : siteEmail ? (probe.nameFound ? "sito" : "ai") : null,
            };
          }
        });
      }
    }

    // Limitato a 20 aziende per chiamata: oltre, il costo cresce e la risposta viene troncata.
    const stillMissingEmail = parsed
      .map((c, index) => ({ c, index }))
      .filter(({ c }) => !c.email)
      .slice(0, 20);
    if (stillMissingEmail.length > 0) {
      try {
        const enrichPrompt = stillMissingEmail
          .map(({ c, index }) => `id ${index}: ${c.companyName}${c.website ? ` (${c.website})` : ""}${c.location ? ` — ${c.location}` : ""}`)
          .join("\n");
        const enrichRaw = await chatCompletion(
          [
            { role: "system", content: "Cerca sul web email e telefono delle seguenti aziende italiane. NON inventare email: inserisci SOLO quelle che trovi sul sito ufficiale o nelle pagine contatti, con dominio coerente con l'azienda. Se non trovi nulla, usa null. Riporta per ogni oggetto lo stesso id ricevuto. Rispondi SOLO con JSON array, zero testo extra." },
            { role: "user", content: `Cerca email e telefono sul sito ufficiale o pagina contatti di queste aziende:\n${enrichPrompt}\n\nJSON array:\n[{"id":0,"email":"...","phone":"..."}]` },
          ],
          { maxTokens: 1500, temperature: 0.2, model: LEADFINDER_MODEL, timeoutMs: 90_000 }
        );
        const rows = parseJsonArrayLenient(enrichRaw);
        const byId = matchAiRows(rows, parsed.length);
        parsed = parsed.map((c, index) => {
          const found = byId.get(index) ?? findRowByName(rows, c.companyName);
          if (!found) return c;
          const aiEmail = sanitizeEmail(asText(found.email));
          const email = c.email ?? (aiEmail && emailPlausibleForCompany(aiEmail, c.website) ? aiEmail : null);
          const phone = c.phone ?? sanitizePhone(asText(found.phone));
          return {
            ...c,
            email,
            emailSource: c.email ? c.emailSource : email ? "ai" : null,
            phone,
            phoneSource: c.phone ? c.phoneSource : phone ? "ai" : null,
          };
        });
      } catch (err) {
        console.warn("[leadFinder] arricchimento email non riuscito:", err instanceof Error ? err.message : err);
      }
    }

    // Controllo MX sui domini delle email e telefoni in formato E.164
    {
      const mxCache = new Map<string, boolean | null>();
      for (const c of parsed) {
        if (!c.email) continue;
        const domain = c.email.split("@")[1] ?? "";
        if (!mxCache.has(domain)) mxCache.set(domain, await domainHasMx(domain));
        if (mxCache.get(domain) === false) { c.email = null; c.emailSource = null; }
      }
      for (const c of parsed) {
        if (!c.phone) continue;
        c.phone = normalizeItalianPhone(c.phone) ?? c.phone;
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
    await failStaleSearches(orgId);
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
    await failStaleSearches(orgId);
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

  // Controlla se esiste già un lead con lo stesso nome azienda (suffissi societari e punteggiatura ignorati)
  const normalizedName = dedupeKey(candidate.companyName);
  const allOrgLeads = await db.lead.findMany({
    where: { organizationId: orgId },
    select: { id: true, title: true },
  });
  const duplicate = allOrgLeads.find((l) => dedupeKey(l.title) === normalizedName);
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
      piva: candidate.piva,
      ateco: candidate.ateco,
      nDipendenti: candidate.nDipendenti,
      formaGiuridica: candidate.formaGiuridica,
      annoFondazione: candidate.annoFondazione,
      emailSource: candidate.emailSource,
      phoneSource: candidate.phoneSource,
      websiteSource: candidate.websiteSource,
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

// ─── approveAllCandidates ─────────────────────────────────────────────────

export async function approveAllCandidates(
  searchId: string
): Promise<{ created: number; skipped: number; error: string | null }> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return { created: 0, skipped: 0, error: "Non autorizzato" };

  const pending = await db.leadCandidate.findMany({
    where: { searchId, organizationId: orgId, status: "PENDING" },
    orderBy: { score: "desc" },
  });
  if (!pending.length) return { created: 0, skipped: 0, error: null };

  const allOrgLeads = await db.lead.findMany({
    where: { organizationId: orgId },
    select: { id: true, title: true },
  });
  const existingLeadNames = new Map(allOrgLeads.map((l) => [dedupeKey(l.title), l.id]));

  let created = 0;
  let skipped = 0;

  for (const candidate of pending) {
    const normalizedName = dedupeKey(candidate.companyName);
    const duplicateId = existingLeadNames.get(normalizedName);
    if (duplicateId) {
      await db.leadCandidate.update({
        where: { id: candidate.id },
        data: { status: "APPROVED", leadId: duplicateId },
      });
      skipped++;
      continue;
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
        piva: candidate.piva,
        ateco: candidate.ateco,
        nDipendenti: candidate.nDipendenti,
        formaGiuridica: candidate.formaGiuridica,
        annoFondazione: candidate.annoFondazione,
        source: "Lead Finder AI",
      },
    });

    if (newLead) {
      await db.leadCandidate.update({
        where: { id: candidate.id },
        data: { status: "APPROVED", leadId: newLead.id },
      });
      existingLeadNames.set(normalizedName, newLead.id);
      created++;
    } else {
      console.error(`approveAllCandidates: failed for ${candidate.companyName}`, leadError);
      skipped++;
    }
  }

  revalidatePath(`/lead-finder/${searchId}`);
  revalidatePath("/leads");
  return { created, skipped, error: null };
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

  const { start: startOfDay } = italianDayBounds(new Date());
  const usedToday = limits.leadFinderPerDay !== null
    ? await db.leadFinderSearch.count({ where: { organizationId: orgId, createdAt: { gte: startOfDay } } })
    : 0;

  return {
    perDay: limits.leadFinderPerDay,
    maxResults: limits.leadFinderMaxResults,
    usedToday,
  };
}
