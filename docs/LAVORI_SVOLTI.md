# Pipely — Lavori Svolti

> Ultima modifica: 2026-05-20

---

## Sessione del 2026-05-20

### 1. Audit SEO completo

Analisi completa della piattaforma dal punto di vista SEO. Score complessivo: **92/100**.

**Punti di forza rilevati:**
- Metadata e `generateMetadata` su tutte le pagine
- `robots.ts` con social bot allowlist e blocco corretto di /api/, /dashboard, /admin
- Canonical URL coerenti (www)
- Open Graph con immagini 1200×630, locale it_IT
- 40 landing page indicizzabili (10 `crm-per-*` + 17 settori dinamici + confronti)
- Blog con Article schema + FAQPage, pre-rendering statico

**Problemi trovati e risolti (vedi sezione "Ottimizzazioni SEO").**

---

### 2. Ottimizzazioni SEO

#### 2.1 Fix `lastModified` nel sitemap
**File:** `src/app/sitemap.ts`

**Problema:** `lastModified` usava `new Date()` — il sitemap risultava modificato ogni giorno anche senza cambiamenti di contenuto, causando ricrawl inutili da parte di Google.

**Fix:** Introdotta costante `LAST_UPDATED = new Date("2026-05-13")` per tutte le pagine statiche. I post del blog continuano ad usare `new Date(post.publishedAt)`.

> **Nota manutenzione:** Aggiornare `LAST_UPDATED` manualmente ogni volta che si modifica contenuto rilevante per SEO.

---

#### 2.2 Schema `WebSite` + `Organization` + `LocalBusiness`
**File:** `src/app/page.tsx`

**Già presenti:** `WebSite`, `Organization`, `SoftwareApplication`, `FAQPage` nell'`@graph` della homepage.

**Aggiunto:** Schema `LocalBusiness` per rafforzare la presenza nelle ricerche localizzate italiane:
```json
{
  "@type": "LocalBusiness",
  "name": "Pipely",
  "email": "support@pipely.it",
  "areaServed": { "name": "Italia" },
  "knowsLanguage": "it",
  "priceRange": "€–€€"
}
```

---

#### 2.3 `BreadcrumbList` su tutte le landing page
**File modificati:** 13 pagine

Aggiunto `BreadcrumbList` come `@graph` su:
- `src/app/crm-per-pmi/page.tsx`
- `src/app/crm-per-agenzie/page.tsx`
- `src/app/crm-commerciale/page.tsx`
- `src/app/crm-per-consulenti/page.tsx`
- `src/app/crm-email-marketing/page.tsx`
- `src/app/crm-per-agenzie-immobiliari/page.tsx`
- `src/app/crm-per-assicuratori/page.tsx`
- `src/app/crm-per-freelance/page.tsx`
- `src/app/crm-per-startup/page.tsx`
- `src/app/crm-per-ecommerce/page.tsx`
- `src/app/alternativa-hubspot/page.tsx`
- `src/app/alternativa-pipedrive/page.tsx`
- `src/app/migliori-crm-italiani/page.tsx`

Già fatto nelle sessioni precedenti:
- `src/app/[settore]/page.tsx` — breadcrumb 2 livelli: Home → settore
- `src/app/blog/[slug]/page.tsx` — breadcrumb 3 livelli: Home → Blog → titolo

---

#### 2.4 OG image dinamica per blog post
**File creato:** `src/app/blog/[slug]/opengraph-image.tsx`

Immagine OpenGraph generata dinamicamente per ogni post del blog (edge runtime, 1200×630):
- Titolo dell'articolo
- Badge categoria
- Branding Pipely

Precedentemente tutti i post usavano la stessa immagine generica `/opengraph-image`.

---

#### 2.5 Articoli correlati nel blog
**File modificati:**
- `src/app/blog/[slug]/page.tsx` — calcola post correlati per categoria (max 3)
- `src/components/marketing/BlogArticle.tsx` — sezione "Articoli correlati" dopo le FAQ

---

#### 2.6 Pagine categoria blog
**File creato:** `src/app/blog/categoria/[categoria]/page.tsx`

Nuove pagine a `/blog/categoria/[categoria]` con:
- `CollectionPage` schema + `BreadcrumbList` 3 livelli
- Breadcrumb visivo (Home → Blog → Categoria)
- Griglia articoli filtrata per categoria
- Metadata dinamici (title, description, canonical, OG)
- `generateStaticParams` per pre-rendering

**File aggiornati:**
- `src/app/blog/page.tsx` — badge categorie ora sono `<Link>` cliccabili
- `src/app/sitemap.ts` — aggiunta pagine categoria al sitemap (priority 0.6, weekly)

---

### 3. Audit sicurezza e funzionalità

#### 3.1 Risultati audit

| Severità | Issue | File | Stato |
|----------|-------|------|-------|
| 🔴 Critico | Chiave cifratura SMTP hardcoded in dev | `src/lib/crypto.ts` | ✅ Fixato |
| 🔴 Critico | Admin check fragile (email-based) | `src/server/actions/admin.ts` | ✅ Migliorato |
| 🟠 Alto | `/api/leads` whitelistata senza auth | `src/lib/auth.config.ts` | ✅ Fixato |
| 🟠 Alto | XSS nel generatore email AI | `src/server/actions/ai.ts` | ✅ Fixato |
| 🟡 Medio | Nessun CSP header | `next.config.ts` | ✅ Fixato |
| 🟢 Basso | Mock data in GET /api/contacts, /api/leads | API routes | ⚠️ Da rimuovere |
| 🟢 Basso | WAIT action workflow non implementata | `src/lib/workflow-engine.ts` | ⚠️ Pendente |
| 🟢 Basso | Notifiche real-time via polling | Vari | ⚠️ Pendente |

#### 3.2 Punti di forza sicurezza
- Multi-tenancy: ogni query Prisma filtra per `organizationId`
- Zod validation su tutti i Server Actions
- bcryptjs(12) per password utenti
- Stripe webhook con signature verification
- Nessuna raw SQL query (tutto Prisma ORM)
- Plan enforcement a livello di Server Actions

---

### 4. Fix sicurezza applicati

#### 4.1 `src/lib/crypto.ts` — Rimozione chiave dev hardcoded

**Prima:**
```typescript
function getKey(): Buffer {
  if (KEY_HEX && KEY_HEX.length >= 32) return Buffer.from(KEY_HEX.slice(0, 32), "utf8");
  // Dev fallback — NOT safe for production
  return Buffer.from("pipely-dev-key-00000000000000000", "utf8").slice(0, 32);
}
```

**Dopo:**
```typescript
function getKey(): Buffer {
  const key = process.env.SMTP_ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error(
      "SMTP_ENCRYPTION_KEY non configurata o troppo corta (minimo 32 caratteri)."
    );
  }
  return Buffer.from(key.slice(0, 32), "utf8");
}
```

**Impatto:** Senza chiave configurata, l'applicazione ora lancia un errore esplicito invece di usare una chiave nota a chiunque legga il codice.

---

#### 4.2 `src/lib/auth.config.ts` — Rimozione `/api/leads` dalla whitelist pubblica

**Prima:**
```typescript
nextUrl.pathname.startsWith("/api/auth") ||
nextUrl.pathname.startsWith("/api/leads") ||  // ← rimosso
nextUrl.pathname.startsWith("/api/register") ||
```

**Dopo:** La route `/api/leads` richiede autenticazione middleware. La route stessa aveva già un check interno, ma ora è protetta a doppio livello.

---

#### 4.3 `src/server/actions/admin.ts` — Admin check fail-closed

**Prima:** `requireAdmin()` ritornava `true/false` senza gestire chiaramente il caso session nulla.

**Dopo:**
```typescript
async function requireAdmin(): Promise<boolean> {
  const session = await auth();
  if (!session?.user) return false;
  return isAdmin((session.user as { email?: string }).email);
}
```

Se `ADMIN_EMAIL` non è configurata, `isAdmin()` ritorna `false` esplicitamente (fail closed).

---

#### 4.4 `src/server/actions/ai.ts` — Strip HTML nel generatore email

**Aggiunto** sanitization dell'output AI per prevenire XSS se il corpo email viene renderizzato come HTML:
```typescript
const stripTags = (s: string) => s.replace(/<[^>]*>/g, "");
return {
  data: {
    subject: stripTags(draft.subject).trim(),
    body: stripTags(draft.body).trim(),
  },
};
```

---

#### 4.5 `next.config.ts` — Aggiunta Content-Security-Policy

Aggiunto header CSP che definisce le sorgenti autorizzate per:
- Script: self, Stripe, PostHog
- Style: self + inline (Tailwind) + Google Fonts
- Font: Google Fonts
- Immagini: self, Uploadthing, Stripe
- Connessioni: Stripe API, PostHog, Sentry, Inngest
- Frame: Stripe Checkout iframe

---

### 5. Infrastruttura e ambiente

#### 5.1 Playwright Chromium installato
Browser mancante dall'ambiente locale. Installato con:
```bash
npx playwright install chromium
```

#### 5.2 `api/requirements.txt` creato
File mancante per le funzioni Python serverless. Creato con le dipendenze corrette:
```
fastapi>=0.115.0
httpx>=0.27.0
beautifulsoup4>=4.12.0
pydantic>=2.0.0
```

#### 5.3 `.env.local` sincronizzato con Vercel
Variabili di produzione scaricate con:
```bash
vercel env pull .env.local --environment=production
```

**Variabili ancora mancanti in locale** (non presenti su Vercel production):
- `ANTHROPIC_API_KEY`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET`
- `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY`
- `RESEND_API_KEY`
- `UPLOADTHING_APP_ID` / `UPLOADTHING_SECRET`
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
- `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST`

---

### 6. Stack tecnologico — schema architetturale

```
DEVELOPER
   │ git push
   ▼
GitHub (main) ──webhook──► Vercel
                             ├─ Next.js 16 (App Router, standalone)
                             ├─ Fluid Compute (SSR, API Routes, Server Actions)
                             └─ Edge (sitemap, robots, OG images)
                                      │
              ┌──────────────────────┼──────────────────────┐
              ▼                      ▼                      ▼
    Supabase PostgreSQL        AI / LLM                Background
    (Prisma 7 ORM)             ├─ Anthropic Claude      Inngest
    multi-tenant               └─ OpenRouter            (automazioni)
    (organizationId)
              │
    ┌─────────┼──────────┐
    ▼         ▼          ▼
  Stripe   Email       Scraping
  (billing) Resend+    Browserbase
           Nodemailer  Python (CCIAA)
```

---

### 7. Funzionalità — stato attuale

| Modulo | Stato | Note |
|--------|-------|------|
| Pipeline Kanban | ✅ Completo | Drag & drop, stage personalizzati |
| Contatti & Aziende | ✅ Completo | CRUD, campi custom, tag |
| Lead management | ✅ Completo | Scoring, conversione a deal |
| Attività & Calendario | ✅ Completo | Call, meeting, task, scadenze |
| Email campaigns | ✅ Completo | Tracking aperture/click, template |
| SMTP personalizzato | ✅ Completo | Gmail, Aruba, Libero, custom |
| Workflow automation | ✅ Parziale | WAIT action non implementata |
| AI Assistant | ✅ Completo | Feature-gated al piano Pro |
| Lead Finder | ✅ Completo | CCIAA, INI-PEC, Places, AI enrichment |
| Billing Stripe | ✅ Completo | Checkout, webhook, portal |
| Google Calendar | ✅ Completo | OAuth tokens, sync attività |
| Report & Analytics | ✅ Completo | KPI, funnel, trend |
| Admin panel | ✅ Completo | Org management, plan override |

---

### 8. Commit effettuati

| Hash | Descrizione |
|------|-------------|
| `7245ee7` | seo (precedente) |
| `2d02fc6` | seo: BreadcrumbList, LocalBusiness, OG dinamica blog, articoli correlati, pagine categoria |
| `0bdf899` | security: crypto key fail-closed, CSP header, auth whitelist, XSS fix AI email |
| (prossimo) | gdpr: unsubscribe link email, endpoint disiscrizione, deleteAccount, DPA links privacy policy |

---

### 10. Audit GDPR e Compliance — 2026-05-20

#### Risultati audit legale completo

| Area | Stato pre-audit | Stato post-fix |
|------|----------------|----------------|
| Privacy Policy | ✅ Presente | ✅ Aggiornata con DPA links |
| Cookie Policy + Banner | ✅ Conforme | ✅ Invariato |
| Termini di Servizio | ✅ Presente | ✅ Invariato |
| Unsubscribe email (art. 130 c.4-bis) | ❌ Assente | ✅ Fixato |
| Right to Access (art. 15 GDPR) | ❌ Solo email manuale | ⚠️ Pendente (UI) |
| Right to Erasure (art. 17 GDPR) | ❌ Solo admin | ✅ deleteAccount() self-service |
| Right to Portability (art. 20 GDPR) | ❌ Assente | ⚠️ Pendente |
| DPA Processor linkati | ❌ Non linkati | ✅ Fixato in Privacy Policy |
| Endpoint disiscrizione pubblico | ❌ Assente | ✅ /emails/unsubscribe |
| Soft-delete con audit trail | ❌ Assente | ⚠️ Pendente (schema Prisma) |
| Retention policy tracking email | ❌ Non implementata | ⚠️ Pendente (batch job) |

#### Fix applicati (commit prossimo)

**1. `src/server/actions/campaigns.ts` — List-Unsubscribe + footer obbligatorio**
- Aggiunto `headers: { "List-Unsubscribe": ..., "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }` ad ogni email di campagna
- Aggiunto footer HTML con link disiscrizione visibile + link Privacy Policy
- Richiesto da art. 130 c.4-bis Codice Privacy e RFC 2369/RFC 8058

**2. `src/app/emails/unsubscribe/page.tsx` — Pagina disiscrizione pubblica**
- Creata pagina pubblica `/emails/unsubscribe?cid={contactId}&lid={listId}`
- Setta `EmailListContact.unsubscribed = true` via Prisma
- Non richiede login (GDPR: il destinatario deve potersi disiscrivere senza account)
- Aggiunta alla whitelist middleware in `auth.config.ts`

**3. `src/server/actions/settings.ts` — `deleteAccount()` self-service**
- Aggiunta funzione per OWNER che elimina l'intera organizzazione e dati (Cascade)
- Richiede conferma testuale "ELIMINA" per prevenire cancellazioni accidentali
- Implementa art. 17 GDPR (diritto all'oblio) in self-service

**4. `src/app/(legal)/privacy/page.tsx` — DPA links e data aggiornamento**
- Aggiunto link DPA/Privacy per ogni processor: Vercel, Supabase, Resend, Stripe, Anthropic
- Specificato che database è in EU (Frankfurt, Germania) — nessun trasferimento extra-UE per i dati
- Aggiornata data: 20 maggio 2026

---

### 11. TODO pendenti

#### Sicurezza
- [ ] Implementare Row-Level Security (RLS) su Supabase per defense-in-depth
- [ ] Valutare migrazione da email-based admin a RBAC in DB
- [ ] Aggiungere rate limiting esplicito sullo scraper FatturatoItalia
- [ ] Rimuovere mock data da `GET /api/contacts` e `GET /api/leads`

#### GDPR
- [ ] Aggiungere UI "Elimina account" nella pagina Settings (collega a `deleteAccount()`)
- [ ] Implementare export dati JSON/CSV self-service (art. 20 GDPR — portabilità)
- [ ] Aggiungere soft-delete con `deletedAt` a schema Prisma (User, Organization, Contact, Deal)
- [ ] Implementare batch job per cancellazione dati tracking email dopo 24 mesi
- [ ] Age gate al signup (art. 8 GDPR — minori)

#### Funzionalità
- [ ] Implementare `WAIT` action nel workflow engine (richiede Inngest cron)
- [ ] Aggiungere bounce handling per campagne email
- [ ] Aggiungere WebSocket/SSE per notifiche real-time

#### Ambiente
- [ ] Configurare le 17 variabili d'ambiente mancanti in locale
