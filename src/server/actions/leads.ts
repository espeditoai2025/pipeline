"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Lead, LeadStatus } from "@/types/contacts";
import { runWorkflows } from "@/lib/workflow-engine";
import { dispatchWebhook } from "@/server/actions/webhooks";
import { safeFetch, assertPublicUrl } from "@/lib/ssrf";

function getIds(s: Session | null) {
  const user = s?.user as { id?: string; organizationId?: string } | undefined;
  return { orgId: user?.organizationId ?? null, userId: user?.id ?? null };
}

// DB enum → app type mapping
const DB_TO_APP: Record<string, LeadStatus> = {
  NEW: "NEW",
  CONTACTED: "WORKING",
  QUALIFIED: "NURTURING",
  CONVERTED: "CONVERTED",
  DISQUALIFIED: "DISQUALIFIED",
};
const APP_TO_DB: Record<string, string> = {
  NEW: "NEW",
  WORKING: "CONTACTED",
  NURTURING: "QUALIFIED",
  CONVERTED: "CONVERTED",
  DISQUALIFIED: "DISQUALIFIED",
};

const LEAD_SELECT = {
  id: true, title: true, source: true, score: true, status: true,
  data: true, email: true, phone: true, notes: true,
  organizationId: true, ownerId: true, contactId: true, convertedDealId: true,
  createdAt: true, updatedAt: true,
  owner: { select: { id: true, name: true, email: true } },
  contact: { select: { id: true, firstName: true, lastName: true } },
} as const;

function mapLead(l: {
  id: string; title: string; source: string | null; score: number; status: string;
  data: unknown; email: string | null; phone: string | null; notes: string | null;
  organizationId: string; ownerId: string | null; contactId: string | null;
  convertedDealId: string | null; createdAt: Date; updatedAt: Date;
  owner: { id: string; name: string | null; email: string } | null;
  contact: { id: string; firstName: string; lastName: string | null } | null;
}): Lead {
  return {
    id: l.id,
    title: l.title,
    source: l.source,
    score: l.score,
    status: (DB_TO_APP[l.status] ?? l.status) as LeadStatus,
    data: (l.data ?? {}) as Record<string, unknown>,
    email: l.email,
    phone: l.phone,
    notes: l.notes,
    organizationId: l.organizationId,
    ownerId: l.ownerId,
    owner: l.owner,
    contactId: l.contactId,
    contact: l.contact,
    convertedDealId: l.convertedDealId,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  };
}

export async function getLeads(): Promise<Lead[]> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return [];

  const rows = await db.lead.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    select: LEAD_SELECT,
  });

  return rows.map(mapLead);
}

export async function getLeadDetail(id: string): Promise<Lead | null> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return null;

  const row = await db.lead.findFirst({
    where: { id, organizationId: orgId },
    select: LEAD_SELECT,
  });

  return row ? mapLead(row) : null;
}

const leadSchema = z.object({
  title: z.string().min(1, "Titolo obbligatorio"),
  source: z.string().optional(),
  score: z.number().min(0).max(100),
  status: z.enum(["NEW", "WORKING", "NURTURING", "CONVERTED", "DISQUALIFIED"]),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
  ownerId: z.string().optional(),
  contactId: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

export async function createLead(input: z.infer<typeof leadSchema>): Promise<{ data: Lead | null; error: string | null }> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!session || !orgId) return { data: null, error: "Non autorizzato" };

  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  try {
    const row = await db.lead.create({
      data: {
        title: parsed.data.title,
        source: parsed.data.source || null,
        score: parsed.data.score,
        status: APP_TO_DB[parsed.data.status] as "NEW" | "CONTACTED" | "QUALIFIED" | "CONVERTED" | "DISQUALIFIED",
        data: (parsed.data.data ?? {}) as Record<string, string>,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        notes: parsed.data.notes || null,
        organizationId: orgId,
        ownerId: parsed.data.ownerId || null,
        contactId: parsed.data.contactId || null,
      },
      select: LEAD_SELECT,
    });

    revalidatePath("/leads");
    runWorkflows({ trigger: "LEAD_CREATED", orgId, leadId: row.id, leadTitle: row.title }).catch(console.error);
    dispatchWebhook(orgId, "lead.created", { id: row.id, title: row.title, email: row.email, source: row.source }).catch(() => {});
    return { data: mapLead(row), error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Errore durante la creazione" };
  }
}

export async function updateLead(input: z.infer<typeof leadSchema> & { id: string }): Promise<{ data: Lead | null; error: string | null }> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!session || !orgId) return { data: null, error: "Non autorizzato" };

  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) return { data: null, error: parsed.error.issues[0]?.message ?? "Dati non validi" };

  try {
    const row = await db.lead.update({
      where: { id: input.id, organizationId: orgId },
      data: {
        title: parsed.data.title,
        source: parsed.data.source || null,
        score: parsed.data.score,
        status: APP_TO_DB[parsed.data.status] as "NEW" | "CONTACTED" | "QUALIFIED" | "CONVERTED" | "DISQUALIFIED",
        data: (parsed.data.data ?? {}) as Record<string, string>,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        notes: parsed.data.notes || null,
        ownerId: parsed.data.ownerId || null,
        contactId: parsed.data.contactId || null,
      },
      select: LEAD_SELECT,
    });

    revalidatePath("/leads");
    return { data: mapLead(row), error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Errore durante l'aggiornamento" };
  }
}

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<{ error: string | null }> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return { error: "Non autorizzato" };

  try {
    await db.lead.update({
      where: { id, organizationId: orgId },
      data: { status: APP_TO_DB[status] as "NEW" | "CONTACTED" | "QUALIFIED" | "CONVERTED" | "DISQUALIFIED" },
    });
    revalidatePath("/leads");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Errore" };
  }
}

export async function deleteLead(id: string): Promise<{ error: string | null }> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return { error: "Non autorizzato" };

  try {
    await db.lead.delete({ where: { id, organizationId: orgId } });
    revalidatePath("/leads");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Errore durante l'eliminazione" };
  }
}

export async function importLeads(
  rows: Array<{
    title: string;
    email?: string | null;
    phone?: string | null;
    source?: string | null;
    status?: string | null;
    score?: number | null;
    notes?: string | null;
    data?: Record<string, unknown>;
  }>
): Promise<{ created: number; skipped: number; error: string | null }> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return { created: 0, skipped: 0, error: "Non autorizzato" };
  if (!rows.length) return { created: 0, skipped: 0, error: null };

  const valid = rows
    .filter((r) => typeof r.title === "string" && r.title.trim())
    .map((r) => ({
      title: r.title.trim(),
      email: r.email?.trim() || null,
      phone: r.phone?.trim() || null,
      source: r.source?.trim() || null,
      status: (APP_TO_DB[r.status?.toUpperCase() ?? ""] ?? "NEW") as "NEW" | "CONTACTED" | "QUALIFIED" | "CONVERTED" | "DISQUALIFIED",
      score: typeof r.score === "number" ? Math.min(100, Math.max(0, Math.round(r.score))) : 0,
      notes: r.notes?.trim() || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: (r.data ?? {}) as any,
      organizationId: orgId,
    }));

  const skipped = rows.length - valid.length;
  if (!valid.length) return { created: 0, skipped, error: "Nessuna riga valida (campo Nome obbligatorio)" };

  try {
    const result = await db.lead.createMany({ data: valid, skipDuplicates: false });
    revalidatePath("/leads");
    return { created: result.count, skipped, error: null };
  } catch (e) {
    return { created: 0, skipped, error: e instanceof Error ? e.message : "Errore durante l'importazione" };
  }
}

// ─── Helpers arricchimento lead ──────────────────────────────────────────────

const _SKIP_SITE_DOMAINS = /duckduckgo|google\.|facebook|linkedin|twitter|instagram|yelp|paginegialle|mappa|openstreet|registro\.it|infocamere|cciaa|ateco|wikipedia/i;

// Minimal CDP client via Node.js 24 built-in WebSocket — no playwright-core needed
function _cdpConnect(wsUrl: string): Promise<{
  navigate(url: string): Promise<string>;
  close(): void;
}> {
  return new Promise((resolve, reject) => {
    const initTimer = setTimeout(() => reject(new Error("CDP connect timeout")), 15000);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ws = new (globalThis as any).WebSocket(wsUrl) as {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      addEventListener(ev: string, fn: (e: any) => void): void;
      send(d: string): void;
      close(): void;
    };
    let msgId = 0;
    const pending = new Map<number, { res: (v: unknown) => void; rej: (e: unknown) => void }>();

    ws.addEventListener("message", (ev: { data: string }) => {
      try {
        const msg = JSON.parse(ev.data) as { id?: number; result?: unknown; error?: unknown };
        if (msg.id !== undefined) {
          const p = pending.get(msg.id);
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          if (p) { pending.delete(msg.id); msg.error ? p.rej(new Error(String(msg.error))) : p.res(msg.result); }
        }
      } catch { /* ignore */ }
    });

    ws.addEventListener("error", (e: unknown) => { clearTimeout(initTimer); reject(e); });

    ws.addEventListener("open", async () => {
      clearTimeout(initTimer);

      function cdpSend(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
        return new Promise((res, rej) => {
          const id = ++msgId;
          pending.set(id, { res, rej });
          ws.send(JSON.stringify({ id, method, params }));
          setTimeout(() => { if (pending.has(id)) { pending.delete(id); rej(new Error(`${method} timeout`)); } }, 18000);
        });
      }

      try {
        await cdpSend("Page.enable");
        resolve({
          async navigate(url: string): Promise<string> {
            await cdpSend("Page.navigate", { url });
            // Poll readyState max 12s
            let html = "";
            for (let i = 0; i < 8; i++) {
              await new Promise(r => setTimeout(r, 1500));
              try {
                const res = await cdpSend("Runtime.evaluate", {
                  expression: "document.readyState + '|||' + document.documentElement.outerHTML",
                  returnByValue: true,
                }) as { value?: string } | undefined;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const val = (res as any)?.value ?? "";
                const sep = val.indexOf("|||");
                if (sep >= 0) {
                  html = val.slice(sep + 3) as string;
                  if (val.slice(0, sep) === "complete" && html.length > 200) break;
                }
              } catch { break; }
            }
            return html;
          },
          close() { try { ws.close(); } catch { /* */ } },
        });
      } catch (e) { reject(e); }
    });
  });
}

async function _enrichWithBrowserbase(
  name: string,
  website: string | null,
  piva?: string,
  location?: string,
): Promise<{ email: string | null; phone: string | null; found: boolean }> {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  const projectId = process.env.BROWSERBASE_PROJECT_ID;
  if (!apiKey || !projectId) return { email: null, phone: null, found: false };

  // eslint-disable-next-line no-console
  console.log("[enrichBB] starting for:", name, "piva:", piva ?? "—");
  let email: string | null = null;
  let phone: string | null = null;
  let sessionId: string | null = null;

  try {
    const { default: Browserbase } = await import("@browserbasehq/sdk");
    const bb = new Browserbase({ apiKey });
    const session = await bb.sessions.create({ projectId });
    sessionId = session.id;
    // eslint-disable-next-line no-console
    console.log("[enrichBB] session ok:", sessionId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const connectUrl = (session as any).connectUrl ?? `wss://connect.browserbase.com?apiKey=${apiKey}&sessionId=${sessionId}`;
    const cdp = await _cdpConnect(connectUrl);
    // eslint-disable-next-line no-console
    console.log("[enrichBB] CDP connected");

    try {
      let resolvedSite = website;

      // Step A: trova sito via DuckDuckGo
      if (!resolvedSite) {
        const q = piva ? `"${piva}" sito ufficiale` : `"${name}" ${location ?? ""} sito ufficiale contatti`;
        const ddgHtml = await cdp.navigate(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`);
        const ddgClean = ddgHtml.replace(/<[^>]+>/g, " ");
        const ddgR = _extractEmailPhone(ddgClean, piva);
        if (ddgR.email) email = ddgR.email;
        if (ddgR.phone) phone = ddgR.phone;
        const hrefRe = /href="(https?:\/\/[^"]+)"/gi;
        let m: RegExpExecArray | null;
        while ((m = hrefRe.exec(ddgHtml)) !== null) {
          const href = m[1]!;
          if (!_SKIP_SITE_DOMAINS.test(href)) {
            try { resolvedSite = new URL(href).origin; break; } catch { continue; }
          }
        }
        // eslint-disable-next-line no-console
        console.log("[enrichBB] site found:", resolvedSite ?? "none");
      }

      // Step B: scrapa il sito aziendale
      if (resolvedSite && (!email || !phone)) {
        const base = resolvedSite.replace(/\/$/, "");
        for (const path of ["", "/contatti", "/contact", "/chi-siamo", "/about", "/contattaci"]) {
          try {
            const html = await cdp.navigate(`${base}${path}`);
            const r = _extractEmailPhone(html, piva);
            if (r.email && !email) email = r.email;
            if (r.phone && !phone) phone = r.phone;
            if (email && phone) break;
          } catch { continue; }
        }
      }
    } finally {
      cdp.close();
    }
  } catch (e) {
    console.error("[enrichBB] error:", e instanceof Error ? e.message : String(e));
  } finally {
    if (sessionId) {
      fetch(`https://api.browserbase.com/v1/sessions/${sessionId}`, {
        method: "POST",
        headers: { "x-bb-api-key": apiKey!, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REQUEST_RELEASE" }),
      }).catch(() => { /* ignore */ });
    }
  }

  return { email, phone, found: !!(email || phone) };
}

const _ENRICH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "it-IT,it;q=0.9,en;q=0.8",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};
const _SKIP_EMAIL_PREFIX = /^(noreply|no-reply|donotreply|support|webmaster|admin|postmaster|privacy|cookie|dpo|seo|marketing|newsletter)@/i;
const _SKIP_EMAIL_DOMAIN = /@(example|test|acme|placeholder|duckduckgo|google|facebook|linkedin|twitter|instagram|w3\.org|schema\.org|adobe|microsoft|apple|cloudflare)\./i;
const _EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const _MAILTO_RE = /mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i;
const _TEL_RE = /tel:([\+\d][\d\s\-./()]{5,18})/i;
const _PHONE_RE = /(?:\b(?:\+39[\s.\-]?)?0\d{1,3}[\s.\-]\d{3,8}\b|\b\+39\s?0\d{1,3}[\s.\-]?\d{4,8}\b|\b3\d{2}[\s.\-]\d{3}[\s.\-]\d{4}\b|\b3\d{9}\b)/;

function _sanitizeEmail(raw: string): string | null {
  const e = raw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(e)) return null;
  if (_SKIP_EMAIL_PREFIX.test(e) || _SKIP_EMAIL_DOMAIN.test(e)) return null;
  return e;
}

function _sanitizePhone(raw: string, piva?: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 6 || digits.length > 13) return null;
  if (/^(\d)\1{5,}$/.test(digits)) return null;
  if (piva && digits === piva.replace(/\D/g, "")) return null;
  return raw.trim();
}

function _extractEmailPhone(html: string, piva?: string): { email: string | null; phone: string | null } {
  const clean = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "");

  let email: string | null = null;
  const mailto = _MAILTO_RE.exec(html);
  if (mailto?.[1]) email = _sanitizeEmail(mailto[1]);
  if (!email) {
    for (const m of clean.matchAll(_EMAIL_RE)) {
      const s = _sanitizeEmail(m[0]);
      if (s) { email = s; break; }
    }
  }

  let phone: string | null = null;
  const telLink = _TEL_RE.exec(html);
  if (telLink?.[1]) phone = _sanitizePhone(telLink[1], piva);
  if (!phone) {
    const pm = _PHONE_RE.exec(clean);
    if (pm?.[0]) phone = _sanitizePhone(pm[0], piva);
  }

  return { email, phone };
}

async function _scrapeWebsite(website: string, piva?: string): Promise<{ email: string | null; phone: string | null; found: boolean }> {
  const base = website.replace(/\/$/, "");
  const paths = ["", "/contatti", "/contact", "/chi-siamo", "/about", "/contattaci"];
  let email: string | null = null;
  let phone: string | null = null;

  for (const path of paths) {
    try {
      // SSRF guard: validate host resolves to a public IP and re-validate each redirect hop.
      const res = await safeFetch(`${base}${path}`, {
        headers: _ENRICH_HEADERS,
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) continue;
      const html = await res.text();
      const r = _extractEmailPhone(html, piva);
      if (r.email && !email) email = r.email;
      if (r.phone && !phone) phone = r.phone;
      if (email && phone) break;
    } catch { continue; }
  }

  return { email, phone, found: !!(email || phone) };
}

async function _duckduckgoRaw(query: string): Promise<string> {
  const url = new URL("https://html.duckduckgo.com/html/");
  url.searchParams.set("q", query);
  const res = await fetch(url.toString(), {
    headers: { ..._ENRICH_HEADERS, Accept: "text/html" },
    signal: AbortSignal.timeout(25000),
    redirect: "follow",
  });
  if (!res.ok) return "";
  return res.text();
}

async function _findWebsite(name: string, location?: string, piva?: string): Promise<string | null> {
  // Con P.IVA la ricerca è molto più precisa
  const query = piva
    ? `"${piva}" sito ufficiale`
    : `"${name}" ${location ?? ""} sito ufficiale`;
  try {
    const html = await _duckduckgoRaw(query);
    const hrefRe = /href="(https?:\/\/(?!.*duckduckgo)[^"]+)"/gi;
    const skipDomains = /duckduckgo|google|facebook|linkedin|twitter|instagram|yelp|paginegialle|mappa|openstreet|registro\.it|cciaa|ateco/i;
    let m: RegExpExecArray | null;
    while ((m = hrefRe.exec(html)) !== null) {
      const href = m[1];
      if (href && !skipDomains.test(href)) {
        let origin: string;
        try { origin = new URL(href).origin; } catch { continue; }
        // SSRF guard: skip any candidate that resolves to a private/internal IP.
        if (await assertPublicUrl(origin, { requireHttps: false }).then(() => true).catch(() => false)) {
          return origin;
        }
      }
    }
  } catch (e) { console.error("[findWebsite] error:", e); }
  return null;
}

async function _duckduckgoSearch(name: string, location?: string, piva?: string, needEmail = true, needPhone = true): Promise<{ email: string | null; phone: string | null }> {
  const suffix = needEmail && needPhone ? "email telefono contatti" : needEmail ? "email contatti" : "telefono contatti";
  // P.IVA come anchor di ricerca se disponibile
  const query = piva
    ? `"${piva}" ${suffix}`
    : [name, location, suffix].filter(Boolean).join(" ");
  try {
    const html = await _duckduckgoRaw(query);
    const clean = html.replace(/<[^>]+>/g, " ");
    const r = _extractEmailPhone(clean, piva);
    const email = r.email && !r.email.includes("duckduckgo") ? r.email : null;
    return { email, phone: r.phone };
  } catch { return { email: null, phone: null }; }
}

// ─── Action ──────────────────────────────────────────────────────────────────

export async function enrichLead(id: string): Promise<{
  email: string | null;
  phone: string | null;
  source: string | null;
  error: string | null;
}> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return { email: null, phone: null, source: null, error: "Non autorizzato" };

  const lead = await db.lead.findUnique({
    where: { id, organizationId: orgId },
    select: { id: true, title: true, email: true, phone: true, data: true },
  });
  if (!lead) return { email: null, phone: null, source: null, error: "Lead non trovato" };

  const data = (lead.data ?? {}) as Record<string, unknown>;
  const website = typeof data.website === "string" ? data.website : null;
  const piva = typeof data.piva === "string" ? data.piva : undefined;
  const location = typeof data.location === "string" ? data.location : undefined;

  let email: string | null = null;
  let phone: string | null = null;
  const sources: string[] = [];
  let resolvedWebsite = website;

  try {
    // 1. Browserbase — browser reale: trova sito (se manca) + scrapa tutto
    if (process.env.BROWSERBASE_API_KEY) {
      const bb = await _enrichWithBrowserbase(lead.title, resolvedWebsite, piva, location);
      if (bb.email) email = bb.email;
      if (bb.phone) phone = bb.phone;
      if (bb.found) sources.push("sito web (browser)");
    }

    // 2. Fallback fetch plain — solo se Browserbase non configurato o non ha trovato nulla
    if (!email || !phone) {
      // 2a. Trova il sito se ancora non ce l'abbiamo
      if (!resolvedWebsite) {
        resolvedWebsite = await _findWebsite(lead.title, location, piva);
      }
      // 2b. Scrapa il sito
      if (resolvedWebsite) {
        const site = await _scrapeWebsite(resolvedWebsite, piva);
        if (site.email && !email) email = site.email;
        if (site.phone && !phone) phone = site.phone;
        if (site.found && !sources.some(s => s.startsWith("sito web"))) sources.push("sito web");
      }
      // 2c. DuckDuckGo come ultimo tentativo
      if (!email || !phone) {
        const ddg = await _duckduckgoSearch(lead.title, location, piva, !email, !phone);
        if (ddg.email && !email) { email = ddg.email; sources.push("ricerca web"); }
        if (ddg.phone && !phone) { phone = ddg.phone; if (!sources.includes("ricerca web")) sources.push("ricerca web"); }
      }
    }

    // Salva nel DB solo i campi che prima erano vuoti
    const updates: { email?: string; phone?: string } = {};
    if (email && !lead.email) updates.email = email;
    if (phone && !lead.phone) updates.phone = phone;
    if (Object.keys(updates).length > 0) {
      await db.lead.update({ where: { id }, data: updates });
      revalidatePath("/leads");
    }

    return { email, phone, source: sources.length > 0 ? sources.join(", ") : null, error: null };
  } catch (e) {
    return { email: null, phone: null, source: null, error: e instanceof Error ? e.message : "Errore di rete" };
  }
}

export async function deleteLeads(ids: string[]): Promise<{ count: number; error: string | null }> {
  const session = await auth();
  const { orgId } = getIds(session);
  if (!orgId) return { count: 0, error: "Non autorizzato" };
  if (!ids.length) return { count: 0, error: null };

  try {
    const result = await db.lead.deleteMany({
      where: { id: { in: ids }, organizationId: orgId },
    });
    revalidatePath("/leads");
    return { count: result.count, error: null };
  } catch (e) {
    return { count: 0, error: e instanceof Error ? e.message : "Errore durante l'eliminazione" };
  }
}

const convertSchema = z.object({
  dealTitle: z.string().min(1),
  dealValue: z.number().min(0).default(0),
  currency: z.string().default("EUR"),
  createContact: z.boolean().default(false),
  contactFirstName: z.string().optional(),
  contactLastName: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  createCompany: z.boolean().default(false),
  companyName: z.string().optional(),
  companyWebsite: z.string().optional(),
  companySector: z.string().optional(),
  companySize: z.string().optional(),
  productId: z.string().optional(),
  productQuantity: z.number().int().min(1).default(1),
  productUnitPrice: z.number().min(0).optional(),
});

export async function convertLead(
  id: string,
  input: z.infer<typeof convertSchema>
): Promise<{ dealId: string | null; contactId: string | null; companyId: string | null; error: string | null }> {
  const session = await auth();
  const { orgId, userId } = getIds(session);
  if (!session || !orgId || !userId) return { dealId: null, contactId: null, companyId: null, error: "Non autorizzato" };

  const parsed = convertSchema.safeParse(input);
  if (!parsed.success) return { dealId: null, contactId: null, companyId: null, error: "Dati non validi" };

  try {
    const lead = await db.lead.findUnique({ where: { id, organizationId: orgId } });
    if (!lead) return { dealId: null, contactId: null, companyId: null, error: "Lead non trovato" };
    if (lead.status === "CONVERTED") return { dealId: null, contactId: null, companyId: null, error: "Lead già convertito" };

    const pipeline = await db.pipeline.findFirst({
      where: { organizationId: orgId },
      include: { stages: { orderBy: { position: "asc" }, take: 1 } },
    });
    if (!pipeline?.stages[0]) return { dealId: null, contactId: null, companyId: null, error: "Nessuna pipeline configurata" };
    const firstStageId = pipeline.stages[0].id;

    // Resolve the product price (scoped to the org) BEFORE the transaction.
    let productUnitPrice: number | undefined = parsed.data.productId ? parsed.data.productUnitPrice : undefined;
    if (parsed.data.productId && productUnitPrice === undefined) {
      const product = await db.product.findFirst({
        where: { id: parsed.data.productId, organizationId: orgId },
        select: { unitPrice: true },
      });
      productUnitPrice = product ? Number(product.unitPrice) : 0;
    }

    // All writes in a single transaction: a mid-way failure must not leave
    // orphan company/contact/deal or a re-convertible lead (duplicates).
    const { dealId, contactId, companyId } = await db.$transaction(async (tx) => {
      let companyId: string | null = null;
      if (parsed.data.createCompany && parsed.data.companyName) {
        const company = await tx.company.create({
          data: {
            name: parsed.data.companyName,
            website: parsed.data.companyWebsite || null,
            industry: parsed.data.companySector || null,
            size: parsed.data.companySize || null,
            organizationId: orgId,
          },
        });
        companyId = company.id;
      }

      let contactId: string | null = lead.contactId ?? null;
      if (parsed.data.createContact && parsed.data.contactFirstName) {
        const contact = await tx.contact.create({
          data: {
            firstName: parsed.data.contactFirstName,
            lastName: parsed.data.contactLastName || null,
            email: parsed.data.contactEmail || lead.email || null,
            phone: parsed.data.contactPhone || lead.phone || null,
            organizationId: orgId,
            ownerId: userId,
            companyId: companyId ?? undefined,
          },
        });
        contactId = contact.id;
      }

      const deal = await tx.deal.create({
        data: {
          title: parsed.data.dealTitle,
          value: parsed.data.dealValue,
          currency: parsed.data.currency,
          status: "OPEN",
          pipelineId: pipeline.id,
          stageId: firstStageId,
          organizationId: orgId,
          ownerId: userId,
          contactId: contactId ?? undefined,
          companyId: companyId ?? undefined,
        },
      });

      if (parsed.data.productId) {
        await tx.dealProduct.create({
          data: {
            dealId: deal.id,
            productId: parsed.data.productId,
            quantity: parsed.data.productQuantity ?? 1,
            unitPrice: productUnitPrice ?? 0,
            discount: 0,
          },
        });
      }

      await tx.lead.update({
        where: { id },
        data: { status: "CONVERTED", convertedDealId: deal.id, contactId: contactId ?? undefined },
      });

      return { dealId: deal.id, contactId, companyId };
    });

    revalidatePath("/leads");
    revalidatePath("/deals");
    revalidatePath("/contacts");
    revalidatePath("/companies");
    return { dealId, contactId, companyId, error: null };
  } catch (e) {
    return { dealId: null, contactId: null, companyId: null, error: e instanceof Error ? e.message : "Errore durante la conversione" };
  }
}
