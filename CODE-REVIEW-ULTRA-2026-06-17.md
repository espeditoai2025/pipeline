# Pipely — Revisione Ultra del Codice (profondità massima)

**Data:** 2026-06-17
**Progetto:** Pipely — CRM SaaS multi-tenant (clone Pipedrive)
**Stack:** Next.js 16 (App Router) · React 19 · Prisma 7 (`@prisma/adapter-pg` / Postgres) · NextAuth 5 beta (JWT) · Stripe · Upstash (ratelimit/redis) · Sentry · TanStack Query/Table · Zod 4 · Zustand · next-intl · scraper Python
**Dimensioni del codice:** 312 file TS/TSX (~46.4k LOC), 32 route API, 28 server action, schema Prisma da 863 righe, 108 componenti

**Metodologia:** revisione multi-agente in 3 fasi — (1) **ricognizione** (architettura, modello dati, inventario route/action), (2) **review approfondita** su 13 dimensioni in parallelo, (3) **verifica adversariale** di ogni finding contro il codice reale (con evidenza `file:riga`). Totale: **143 agenti**, ~5.8M token, 1510 chiamate a strumenti. Baseline aggiuntiva: `tsc --noEmit` ed ESLint.

---

## 1. Executive summary

Pipely è un prodotto **ricco e ben strutturato** — pattern di multi-tenancy coerente (`organizationId` su quasi tutti i modelli), gating dei piani sensato, separazione client/server ragionevole, `tsc` pulito. Tuttavia la revisione ha identificato **classi di problemi sistemici** che vanno affrontate **prima di trattare dati di clienti reali in produzione**:

1. 🔴 **Pipeline di deploy distruttiva** — `prisma db push --accept-data-loss` ad ogni deploy di produzione, senza migrazioni versionate né backup reale. Un singolo cambio di schema non additivo può cancellare silenziosamente i dati di tutti i tenant.
2. 🔴 **IDOR cross-tenant su entità figlie** — diverse server action (`custom-fields`, `products`, `campaigns`) mutano/leggono record per `id` puro senza risalire all'organizzazione. Un utente autenticato può leggere/modificare/cancellare dati di **altri tenant**.
3. 🔴 **Endpoint Python `/api/enrich` pubblico** — nessuna autenticazione, SSRF verso rete interna/metadata cloud e abuso di crediti Browserbase. (È inoltre **dead code** lato app → rimuovibile.)
4. 🟠 **Auth fail-open ricorrente** — più punti adottano `if (secret) { ... }` invece di fail-closed: `CRON_SECRET` mancante apre l'endpoint cron, `SCRAPER_SECRET_KEY` mancante apre lo scraper, il rate limiter diventa no-op senza Upstash, e i token di reset password ricadono su un segreto hardcoded `"fallback-secret"`.

### Temi trasversali (cause-radice ricorrenti)

| Tema | Sintesi | Finding collegati |
|---|---|---|
| **Scoping per tenant non risalito al parent** | Entità senza `organizationId` proprio (`DealProduct`, `CustomFieldValue`, `EmailListContact`) vengono mutate per `id` senza verificare il parent | C2, C3, H8, H9, H10, H11, H12, M1, M30 |
| **Fail-open su segreto mancante** | `if (secret && ...)` invece di rifiutare quando il segreto manca | C4, H1, H7, H13, M14, M31 |
| **SSRF non mitigato** | `fetch`/scraper verso URL arbitrari, nessun blocco di IP privati/metadata | C4, H6, H7, M18, M19 |
| **Invio email "fantasma"** | Stato `SENT` salvato anche quando nessuna email parte (SMTP mai usato) | H14, H15 |
| **Nessun enforcement centralizzato** | Gating piano, RBAC e scoping sono inline e ripetuti → facile dimenticarli (le route v1 lo dimostrano) | H5, M8, M9 |
| **Nessuna paginazione / aggregazione in-memory** | `findMany` illimitati e report calcolati in JS | H17, M22, M23, M24 |

### Cosa funziona bene

- Pattern di multi-tenancy **coerente** sul percorso principale (cookie-session): la stragrande maggioranza delle action filtra correttamente per `organizationId`.
- Verifica firma webhook Stripe presente; RBAC su operazioni org-critiche (cambio ruolo / eliminazione org riservati a `OWNER`).
- `tsconfig` in `strict` + `noUncheckedIndexedAccess`; `tsc --noEmit` **pulito**.
- Separazione `plan.ts` (server) / `plan-client.ts` (client-safe); uso di `Decimal` per i valori monetari.

---

## 2. Dashboard severità

| Severità | Conteggio | Note |
|---|---|---|
| 🔴 **Critical** | 4 | Da risolvere prima del prossimo deploy di produzione |
| 🟠 **High** | 27 | Sicurezza/correttezza con impatto concreto |
| 🟡 **Medium** | 48 | Da pianificare a breve |
| 🔵 **Low** | 37 | Miglioramenti / hardening |
| ⚪ **Info** | 7 | Note e debito tecnico minore |
| ❌ **Refutati** | 4 | Falsi positivi confermati dalla verifica (vedi §8) |
| ⏸ **Non verificati** | 13 | Verifica adversariale non completata per limite sessione (vedi §9) |

> I conteggi riflettono la **severità effettiva post-verifica** (alcuni finding sono stati riclassificati o declassati dalla fase adversariale). I duplicati segnalati da più dimensioni sono stati uniti in questo report, con nota di conferma incrociata.

### Baseline automatica

- **TypeScript** (`tsc --noEmit`): ✅ **pulito**, 0 errori.
- **ESLint** (`eslint .`): ⚠️ **33 errori + 23 warning**. Principali:
  - `'remaining' is assigned a value but never used` — [rate-limit.ts:71,95](src/lib/rate-limit.ts) (vedi finding H16/M14: il valore del limiter è scartato).
  - `setState` sincrono dentro `useEffect` — [CommandPalette.tsx:74](src/components/shared/CommandPalette.tsx).
  - `Unexpected any` — `bookings.ts:141`, `invoices.ts:224`, `surveys.ts:86`.
  - variabili morte: `appUrl` ([email-templates.ts:67](src/lib/email-templates.ts)), `invitation` ([settings.ts:136](src/server/actions/settings.ts)).
  - `console` non consentito in [logger.ts:34](src/lib/logger.ts).
  - React Compiler salta la memoizzazione di `SmtpWizard` (uso di `watch()` di react-hook-form).

---

## 3. 🔴 Finding CRITICAL

### C1 — Il build di produzione esegue `prisma db push --accept-data-loss` ad ogni deploy
**File:** [vercel.json:3-4](vercel.json) · **Categoria:** Infra / Perdita dati · **Confidence:** alta · *Confermato da 3 dimensioni (config, prisma, deps).*

Il `buildCommand` è `npx prisma db push --accept-data-loss && npm run build`. `db push` allinea il DB allo schema **senza migrazioni versionate** e `--accept-data-loss` autorizza esplicitamente operazioni distruttive (drop colonne/tabelle, troncamenti) **senza prompt**. La cartella `prisma/migrations` è **assente**: nessuno storico, nessun rollback, nessuna review del diff DDL. Gira contro il DB di **produzione** ad ogni deploy.

**Impatto:** al primo cambio di schema non-additivo (rinomina/rimozione/restringimento di colonna) si perdono **irreversibilmente** dati multi-tenant in silenzio. Il cron `/api/cron/backup` **non è un vero backup** (vedi nota sotto): esegue solo conteggi aggregati e invia un'email — nessun dump/snapshot → nessun percorso di recovery.

**Fix:**
```jsonc
// vercel.json
"buildCommand": "npx prisma migrate deploy && npm run build"
```
Generare le migrazioni in locale con `prisma migrate dev`, committarle in `prisma/migrations/`, e **rimuovere** `db push --accept-data-loss` dalla pipeline di produzione. Se serve `db push` per ambienti effimeri/preview, condizionarlo a `VERCEL_ENV != 'production'`.

---

### C2 — IDOR di scrittura: `saveCustomFieldValues` sovrascrive i custom field di qualsiasi org
**File:** [custom-fields.ts:132-152](src/server/actions/custom-fields.ts) · **Categoria:** Multi-tenant / IDOR · **Confidence:** alta

La action verifica solo l'esistenza della sessione/org, poi esegue `deleteMany` + `createMany` su `customFieldValue` filtrando **solo** per `{ [entityType]Id: entityId }`. `CustomFieldValue` **non ha** colonna `organizationId` (`schema.prisma:467-478`), quindi nessun vincolo di tenant. Un utente autenticato di org A che conosca l'`id` (cuid) di un deal/contatto/azienda di org B può **cancellare e riscrivere** tutti i suoi custom field. Inoltre `fieldId` non è verificato come appartenente all'org.

> ⚠️ Essendo una `"use server"` action, è un endpoint RPC **invocabile direttamente**: che i form UI passino id legittimi non è una mitigazione.

**Fix:** risalire al parent e verificarne l'org prima di mutare; validare anche `fieldId`:
```ts
const parent = await db[entityType].findFirst({
  where: { id: entityId, organizationId: orgId }, select: { id: true },
});
if (!parent) return { error: "Non trovato" };
const validFields = await db.customField.findMany({
  where: { organizationId: orgId, entityType, id: { in: values.map(v => v.fieldId) } },
  select: { id: true },
});
// filtra values sul set valido, dentro la transazione esistente
```

---

### C3 — IDOR scrittura/cancellazione: `removeProductFromDeal` / `updateDealProduct` per id puro
**File:** [products.ts:243-302](src/server/actions/products.ts) · **Categoria:** Multi-tenant / IDOR · **Confidence:** alta

Entrambe verificano solo `if (!session)` (**senza nemmeno usare `orgId`**) e poi `db.dealProduct.delete/update({ where: { id } })` per id puro. `DealProduct` non ha `organizationId` (`schema.prisma:411-420`). Un utente autenticato può **eliminare o alterare quantità/prezzo/sconto** delle righe-prodotto dei deal di un altro tenant conoscendone l'`id` del `dealProduct` (id restituito al client da `addProductToDeal`/`getDealProducts`).

**Impatto:** manipolazione/cancellazione cross-tenant dei valori economici dei preventivi altrui.

**Fix:**
```ts
const orgId = getOrgId(session);
if (!orgId) return { error: "Non autorizzato" };
const dp = await db.dealProduct.findFirst({
  where: { id, deal: { organizationId: orgId } }, select: { id: true },
});
if (!dp) return { error: "Non trovato" };
// poi delete/update
```

---

### C4 — Endpoint Python `/api/enrich` completamente privo di autenticazione (SSRF + abuso Browserbase)
**File:** [api/enrich.py:257-300, 112-194](api/enrich.py) · [vercel.json:13-15](vercel.json) · **Categoria:** Broken Access Control + SSRF · **Confidence:** alta

`api/enrich.py` espone `POST /api/enrich` come funzione serverless Python (vercel.json, `maxDuration 60`). L'handler `enrich()` **non ha alcun controllo di autenticazione** (a differenza di `scraper.py` non legge neppure `SCRAPER_SECRET_KEY`). Le funzioni Python di Vercel **non passano** per `src/proxy.ts` → l'endpoint è pubblicamente invocabile. Il body `website` è un URL arbitrario fetchato sia via `httpx` (con `follow_redirects=True`) sia via headless browser Browserbase. Nessuna validazione di host/IP → SSRF verso `169.254.169.254` (metadata cloud), `localhost`, RFC1918; la risposta (email/telefono via regex) viene restituita al chiamante → exfiltrazione parziale + port-scanning.

**Impatto:** SSRF non autenticato verso rete interna/metadata (furto credenziali IAM), scansione rete, consumo illimitato di sessioni Browserbase a carico del titolare (costi).

**Fix (raccomandato): rimuovere `api/enrich.py`** — la verifica ha confermato che **nessun codice TS/Next lo chiama** (`enrichLead` fa tutto in TypeScript): è dead code deployato come superficie d'attacco. Rimuovere anche la voce in `vercel.json`. In subordine: auth fail-closed (`SCRAPER_SECRET_KEY`, rifiuto se assente), validazione anti-SSRF (blocco IP privati/loopback/link-local/reserved con risoluzione DNS, `follow_redirects=False` con ri-validazione di ogni `Location`), rate limit per IP.

---

## 4. 🟠 Finding HIGH

> Raggruppati per tema. I finding segnalati da più dimensioni sono uniti, con nota di conferma incrociata.

### 4.1 Isolamento multi-tenant / IDOR

**H8 — IDOR lettura: `getCustomFieldValues` legge i custom field di qualsiasi org** — [custom-fields.ts:35-56](src/server/actions/custom-fields.ts)
Verifica solo la sessione, poi `findMany({ where: { [idKey]: entityId } })` senza filtro org. Espone `{fieldId, value}` cross-tenant. *Fix:* verificare il parent `{ id: entityId, organizationId: orgId }` (con switch type-safe su `db.deal/db.contact/db.company`) prima della query.

**H9 — IDOR lettura: `getDealProducts` espone righe e prezzi dei deal altrui** — [products.ts:206-241](src/server/actions/products.ts)
Verifica `orgId` ma il controllo è **morto**: la query è `findMany({ where: { dealId } })` senza vincolo org. *Fix:* `const deal = await db.deal.findFirst({ where: { id: dealId, organizationId: orgId } }); if (!deal) return {...}`.

**H10 — IDOR scrittura: `addProductToDeal` inietta righe nel deal di un altro tenant** — [products.ts:159-204](src/server/actions/products.ts)
Verifica che `productId` sia dell'org ma **non** che `dealId` lo sia. *Fix:* `db.deal.findFirst({ where: { id: dealId, organizationId: orgId } })` prima della `create`.

**H11/H12 — IDOR cancellazione: `removeContactFromList` elimina contatti di mailing list cross-tenant** — [campaigns.ts:192-199](src/server/actions/campaigns.ts) *(confermato da 2 dimensioni)*
`delete({ where: { id } })` per id puro, solo `if (!session)`. `EmailListContact` non ha `organizationId`. *Fix:* `deleteMany({ where: { id, list: { organizationId: orgId } } })` (verificare `count > 0`).

> **Pattern unificante (H8–H12, C2, C3):** tutte le entità figlie prive di `organizationId` proprio (`DealProduct`, `CustomFieldValue`, `EmailListContact`, `Note`) devono essere filtrate **risalendo al parent** con `{ parent: { organizationId: orgId } }`. Vale la pena un audit sistematico di ogni `findUnique/findFirst/update/delete/findMany` su questi modelli.

### 4.2 Autenticazione, segreti, sessione

**H1/H7 — Endpoint `cron/backup` fail-open se `CRON_SECRET` non è configurato** — [api/cron/backup/route.ts:21-24](src/app/api/cron/backup/route.ts) *(confermato da 3 dimensioni)*
Il check è `if (secret && authHeader !== ...) return 401`: se `CRON_SECRET` manca, il controllo è saltato e l'endpoint (pubblico nel proxy) è invocabile da chiunque. Aggrega dati di tutte le org, invia email all'admin e **triggera workflow + resume `WorkflowQueue`** (side-effect cross-tenant). *Fix:* fail-closed — `const secret = process.env.CRON_SECRET; if (!secret || authHeader !== 'Bearer '+secret) return 401;`. *(Severity borderline medium/high: dipende da misconfigurazione, blast-radius limitato da `slice(0,50)`.)*

**H13 / M3 — Secret di fallback hardcoded `"fallback-secret"` nei token di reset password** — [forgot-password/route.ts:13,84](src/app/api/auth/forgot-password/route.ts), [reset-password/route.ts:26](src/app/api/auth/reset-password/route.ts) *(confermato da 3 dimensioni)*
`signToken`/`verifyToken` usano `process.env.NEXTAUTH_SECRET ?? "fallback-secret"`. Il token è `base64url(userId:expiresAt:HMAC)`. Se l'env manca — **o se è impostata come `AUTH_SECRET`** (nome usato da NextAuth v5, che questo codice custom **non** legge) — i token sono firmati con un segreto pubblico noto → **forgery di token per qualsiasi `userId`** = account takeover. *Fix:* `const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET; if (!secret) throw...`. Rimuovere ogni fallback. Idealmente: token random single-use persistiti su DB (hash), per supportare revoca/uso singolo.

**H — Verifica certificato TLS disabilitata sulla connessione Postgres** — [db.ts:11-13](src/lib/db.ts)
`ssl: { rejectUnauthorized: false }` incondizionato (anche in produzione) → MITM attivo può presentare un certificato arbitrario sul canale che trasporta **tutti** i dati multi-tenant. *Fix:* in produzione `rejectUnauthorized: true` + CA (o `?sslmode=verify-full`; con Supabase basta la CA pubblica). Rilassare solo per Postgres locale (docker-compose/CI).

### 4.3 SSRF (Server-Side Request Forgery)

**H6 — SSRF nei webhook in uscita** — [webhooks.ts:78-82, 212-247, 277-304](src/server/actions/webhooks.ts) *(confermato da 2 dimensioni; ⏸ un verdetto adversariale mancante)*
`createWebhook` valida l'URL solo con `z.string().url()`; `dispatchWebhook`/`testWebhook` fanno `fetch` server-side verso URL arbitrari (inclusi `169.254.169.254`, `localhost`, RFC1918). `testWebhook` **ritorna statusCode e body** al chiamante → SSRF oracle. `updateWebhook` non valida affatto l'URL. *Fix:* util `isPublicHttpsUrl()` (scheme https, blocco IP privati/metadata su IP risolto via DNS), applicata in create **e** update **e** ri-verificata al dispatch (anti DNS-rebinding con IP pinning); non restituire il body in `testWebhook`.

**H7 — SSRF nello scraper di arricchimento lead** — [leads.ts:467-490, 504-522, 551-595](src/server/actions/leads.ts)
`enrichLead` legge `data.website` (input utente: `z.record` libero) e lo passa a `_scrapeWebsite` con `redirect:'follow'`; `_findWebsite` estrae `href` da DuckDuckGo senza filtrare IP interni. *Fix:* stessa util anti-SSRF, `redirect:'manual'` + ri-validazione di ogni `Location`, applicata anche agli href estratti.

### 4.4 Billing / API pubblica

**H5 — Le route `/api/v1/*` bypassano il gating di piano** — [v1/contacts/route.ts:76-106](src/app/api/v1/contacts/route.ts), [v1/deals/route.ts:79-118](src/app/api/v1/deals/route.ts)
Le action interne applicano `checkContactLimit`/`checkPipelineLimit`; le route v1 **no** (grep: 0 occorrenze di `checkFeature/checkContactLimit/getOrgPlan` in `api/v1`). Un'org STARTER può superare illimitatamente i limiti (contatti/pipeline) scriptando contro l'API → aggira la leva di monetizzazione. *Fix:* helper condiviso `enforceContactLimit(orgId)` usato sia dalle action sia dalle route v1; rispondere `402`.

**H16 — Rate limiting mai applicato alle route `/api/v1/*`** — [rate-limit.ts:90](src/lib/rate-limit.ts), tutte le `v1/*`
`withApiRateLimit` (60 req/min) è definito ma importato da **zero** file. Le route v1 sono pubbliche nel proxy: l'unica barriera è l'API key, senza throttling → scraping/enumerazione/mutazioni illimitate. *Fix:* wrapper `withApiKey(handler)` che fa auth + rate-limit per-key (chiave = `apiKeyId`, non IP). *(Vedi anche M14: il limiter è fail-open senza Upstash → no-op anche dove applicato.)*

### 4.5 Config / infra / headers

**H — CSP con `script-src 'unsafe-inline' 'unsafe-eval'`** — [next.config.ts:8-11](next.config.ts)
La CSP statica annulla quasi del tutto la protezione XSS (qualsiasi injection esegue inline/eval). Nessun meccanismo a nonce (verificato: l'unico `nonce` nel repo è il commento). 14 file usano `dangerouslySetInnerHTML`, di cui almeno `AIAssistant.tsx` in area autenticata. *Fix:* CSP a nonce generato nel proxy/middleware (`'nonce-<v>' 'strict-dynamic'`); rimuovere almeno `'unsafe-eval'` (non serve in prod). *(Hardening: richiede un sink XSS per concretizzarsi.)*

**H — CORS wildcard `*` su `chat-widget`** — [v1/chat-widget/route.ts:9,33,48](src/app/api/v1/chat-widget/route.ts)
Endpoint pubblico di scrittura, non autenticato, senza rate limit né validazione Zod, con `Access-Control-Allow-Origin: *`. Accetta `orgId` arbitrario dal body → spam/flood di `chatMessage` cross-org da qualsiasi browser. *Fix:* validazione Zod (incl. `visitorEmail` email + max length), `withApiRateLimit`, allowlist di origin (o token per-widget invece di `orgId` nudo).

### 4.6 Email — correttezza

**H14 — `sendCampaign` usa `resend!` anche con solo SMTP: tutti gli invii falliscono ma la campagna è marcata SENT** — [campaigns.ts:331-334, 379-399](src/server/actions/campaigns.ts) *(confermato da 2 dimensioni)*
Il gate accetta SMTP come provider valido, ma il loop chiama incondizionatamente `resend!.emails.send(...)`. Con `resend === null` (no `RESEND_API_KEY`) ogni iterazione lancia, il `catch` la conta come `failed`, **ma la campagna è comunque marcata `SENT`**. L'utente crede di aver inviato; **zero email partono**. `RESEND_API_KEY` è globale → colpisce **tutti** i tenant. `sendViaSMTP` esiste ma è **dead code**. *Fix:* nel loop scegliere il canale (`resend` se disponibile, altrimenti `await sendViaSMTP(orgId, {...})`); non marcare `SENT` se `sent === 0`.

**H15 — `sendEmail` salva `SENT` e ritorna successo anche senza alcun provider** — [emails.ts:137-170](src/server/actions/emails.ts)
Invia solo `if (isEmailEnabled() && resend)`; altrimenti salta l'invio ma salva `status: "SENT"` + `sentAt`. Nessun fallback SMTP. *Fix:* se nessun provider attivo, salvare `QUEUED/UNSENT` e segnalare, oppure invocare `sendViaSMTP`.

### 4.7 Data layer / performance

**H17 — Liste server-side senza paginazione** — [contacts.ts:24-32,57-63](src/server/actions/contacts.ts), [leads.ts:76-82](src/server/actions/leads.ts), [invoices.ts:67-71](src/server/actions/invoices.ts), [pipeline.ts:20-39](src/server/actions/pipeline.ts)
`getContacts/getCompanies/getLeads/getInvoices` caricano **tutte** le righe dell'org; `getPipeline` carica tutti i deal OPEN con 3 relazioni incluse. Su org PRO/ENTERPRISE (illimitate) → latenza/memoria/payload enormi, timeout. *Fix:* `take` + cursor (come già fatto nelle route v1 con `parsePagination`); per la pipeline, `take 50` per stage + "mostra altri" + conteggi separati.

**H — Nessuna gestione di migrazioni** — [prisma/schema.prisma](prisma/schema.prisma), [package.json](package.json)
`prisma/migrations` assente; build solo `prisma generate`; deploy via `db push --accept-data-loss`. *(Stessa causa-radice di C1; vedi fix C1.)*

### 4.8 Scraper / frontend

**H — Auth fail-open sullo scraper Python** — [api/scraper.py:477-484](api/scraper.py), [python-scraper/main.py:56-63](python-scraper/main.py)
`secret = os.getenv('SCRAPER_SECRET_KEY',''); if secret: ...` → senza la variabile (assente in `.env.local`) l'endpoint `/api/scraper` è pubblico: scraping illimitato di `fatturatoitalia.it`/`inipec.gov.it` e consumo crediti OpenRouter a carico del titolare. *Fix:* fail-closed (`if not secret: raise 503`); impostare `SCRAPER_SECRET_KEY` in tutti gli ambienti e documentarla in `.env.example`.

**H — Drag-and-drop Kanban inaccessibile da tastiera** — [KanbanBoard.tsx:28-30](src/components/pipeline/KanbanBoard.tsx), [DealCard.tsx](src/components/pipeline/DealCard.tsx)
Solo `PointerSensor`, nessun `KeyboardSensor`/`sortableKeyboardCoordinates` in tutto il codebase → spostare affari (funzione core) è impossibile da tastiera. Violazione WCAG 2.1.1. *Fix:* aggiungere `KeyboardSensor` + `coordinateGetter`, `accessibility={{ announcements }}` in italiano, separare il bersaglio click/`Link` dall'handle di drag. *(La card ha già `role/tabIndex/aria-roledescription` di default da `useSortable` — manca solo il sensore tastiera e gli announcements.)*

---

## 5. 🟡 Finding MEDIUM (48)

> Sintesi raggruppata per area. `file:riga` cliccabili; fix in forma compatta.

### Multi-tenant / API v1
- **M1 — Cross-tenant FK injection nelle route v1** ([v1/deals/route.ts:87-115](src/app/api/v1/deals/route.ts), [v1/deals/[id]/route.ts:81-99](src/app/api/v1/deals/[id]/route.ts), [v1/contacts/route.ts:84-98](src/app/api/v1/contacts/route.ts)): `stageId/pipelineId/contactId/companyId/ownerId` dal body, spread in `create/update` senza verificarne l'org. Un deal può referenziare entità di altri tenant → la GET con `include` ne **espone nome/email/telefono**. *Fix:* validare ogni FK con `findFirst({ where: { id, organizationId } })`; whitelist dei campi invece di `...rest`.
- **M2 — `chat-widget` pubblico senza auth/rate-limit/validazione, CORS `*`** ([v1/chat-widget/route.ts:4-41](src/app/api/v1/chat-widget/route.ts)): vedi anche finding HIGH CORS.

### Auth / sessione
- **M4 — Token di reset riutilizzabile** ([forgot-password/route.ts:73](src/app/api/auth/forgot-password/route.ts), [reset-password/route.ts:26](src/app/api/auth/reset-password/route.ts)): HMAC stateless, mai invalidato → riusabile entro 1h anche dopo il reset. *Fix:* single-use (persistere token hash + `usedAt`, o includere `passwordChangedAt` nel payload).
- **M5 — Reset/cambio password non invalidano le sessioni JWT esistenti** ([auth.config.ts:53,70](src/lib/auth.config.ts), [settings.ts:334](src/server/actions/settings.ts)): JWT senza store DB → dopo un reset le sessioni dell'attaccante restano valide. *Fix:* `sessionTokenVersion`/`passwordChangedAt` su `User`, verificato nel callback `jwt`; incrementare su reset/change.
- **M6 — OAuth Google Calendar callback senza `state` (CSRF)** ([google-calendar/connect/route.ts:14](src/app/api/google-calendar/connect/route.ts), [callback/route.ts:9](src/app/api/google-calendar/callback/route.ts)): account-stitching; token Google salvati **in chiaro**. *Fix:* `state` random firmato/legato alla sessione + cifratura token a riposo (riusare `crypto.ts`).
- **M7 — Provider Google senza adapter/`signIn`: sessione senza `organizationId`** ([auth.config.ts:7](src/lib/auth.config.ts), [auth.ts:13](src/lib/auth.ts)): login Google → sessione autenticata con `orgId` undefined (stato rotto). *Fix:* rimuovere il provider finché incompleto, o `signIn` che rifiuta account senza `User`+org.

### Billing / Stripe
- **M — Webhook Stripe senza idempotenza** ([stripe/webhook/route.ts:10-101](src/app/api/stripe/webhook/route.ts)): eventi duplicati/out-of-order possono declassare un'org con sub valida (o viceversa); `payment_failed` declassa senza grace period. *Fix:* tabella `ProcessedStripeEvent` (insert+catch), re-fetch della subscription come verità, grace period su `past_due`.
- **M8 — Gating piani sparso, nessun guard centralizzato** ([plan.ts:94-118](src/lib/plan.ts)): facile dimenticarlo (le route v1 lo dimostrano). *Fix:* `requireFeature(orgId, key)` riusabile + test che ogni create-path passi dal gate.

### Validazione input / injection
- **M — `submitSurveyResponse` pubblico senza validazione né limiti** ([surveys.ts:179-196,68-95](src/server/actions/surveys.ts)): `answers` salvato grezzo, nessun cap, nessun rate-limit; anche `createSurvey` salva `options as any`. *Fix:* schema Zod, validare le chiavi contro le domande reali, rate-limit per IP.
- **M — `xlsx@0.18.5` vulnerabile (prototype pollution + ReDoS) su file utente** ([ImportCSVModal.tsx:53-65](src/components/contacts/ImportCSVModal.tsx), [LeadImportModal.tsx](src/components/leads/LeadImportModal.tsx)): CVE-2023-30533 / CVE-2024-22363; la fix esiste solo sul CDN SheetJS, non su npm. *Fix:* tarball patchato (`xlsx-0.20.x` da cdn.sheetjs.com) o migrare a `exceljs`; isolare in Web Worker con limiti.

### Data layer / performance
- **M — Numerazione fatture non atomica** ([invoices.ts:196-233](src/server/actions/invoices.ts)): read-then-write senza transazione → race su `progressive` (P2002 non gestito che crasha la action). *Fix:* `$transaction` + retry su P2002.
- **M — `convertLead`: 5+ write senza transazione** ([leads.ts:659-744](src/server/actions/leads.ts)): fallimento a metà lascia company/contact/deal orfani e lead ri-convertibile (duplicati). *Fix:* `$transaction`; effetti esterni (workflow/webhook) fuori dalla tx.
- **M — N+1 in `approveAllCandidates`/`approveCandidate`** ([lead-finder.ts:1341-1389](src/server/actions/lead-finder.ts)): `createLead` in loop (ognuno ri-esegue `auth()` + `runWorkflows`). *Fix:* `createMany`, risolvere la sessione una volta, workflow aggregati.
- **M — Indici mancanti** ([schema.prisma:200-227,482-491,535-555](prisma/schema.prisma)): mancano `Contact [organizationId, createdAt]`, `Company [organizationId]`, `Note [dealId]/[contactId]`, `EmailCampaign [listId]`, `DealProduct [dealId]/[productId]`, `CustomFieldValue [fieldId/...]`. Per la ricerca testuale valutare `pg_trgm`/GIN.
- **M — Pool pg senza `max`/timeout in serverless** ([db.ts:7-21](src/lib/db.ts)): rischio esaurimento connessioni. *Fix:* `max` basso per istanza + pooler (PgBouncer/Supabase :6543) o Prisma Accelerate.
- **M — Cron backup: aggregazioni globali senza `take` + resume coda non robusto** ([cron/backup/route.ts:102-158](src/app/api/cron/backup/route.ts)): materializza tutte le attività scadute cross-org per processarne 50. *Fix:* `take` nella query, batch fino a esaurimento, `orderBy resumeAt`.
- **M — `Email.organizationId` nullable** ([schema.prisma:345-369](prisma/schema.prisma)): righe non scopabili (in PG `= null` non matcha) né cancellate alla rimozione org. *Fix:* NOT NULL + relazione `onDelete: Cascade` (backfill prima).
- **M — Report/Team Performance aggregano in memoria** ([reports.ts:32-58](src/server/actions/reports.ts), [dashboard.ts:254-275](src/server/actions/dashboard.ts)): `findMany` di tutto + filter/reduce in JS. *Fix:* `groupBy`/`aggregate` Prisma o SQL raw.

### Rate limiting / abuso
- **M14 — Rate limiter fail-open silenzioso senza Upstash** ([rate-limit.ts:24,43-53](src/lib/rate-limit.ts)) *(confermato da 2 dimensioni)*: senza env o se Redis è giù, il limiter diventa no-op (anche su login/forgot/reset) **senza log**. *Fix:* fail-loud (Sentry) e in produzione considerare fail-closed sugli endpoint sensibili.
- **M — Pixel tracking gonfiabili (open/click) senza dedup né rate-limit** ([track/open/...](src/app/api/track/open/[campaignId]/[contactId]/route.ts), [track/click/...](src/app/api/track/click/[campaignId]/[contactId]/route.ts)): `+1` ad ogni richiesta, `contactId` ignorato. *Fix:* HMAC sull'URL, evento idempotente per `(campaignId, contactId)`, rate-limit.

### Email / campagne
- **M — Click tracker = open-redirector** ([track/click/...route.ts:8-36](src/app/api/track/click/[campaignId]/[contactId]/route.ts)): `Response.redirect(?url=...)` validando solo http/https → redirector aperto su dominio Pipely, riusabile per phishing. *Fix:* firmare HMAC la destinazione o mappatura opaca per id.
- **M — Unsubscribe via GET muta lo stato senza token firmato** ([emails/unsubscribe/page.tsx:11-49](src/app/emails/unsubscribe/page.tsx)): prefetch/scanner causano disiscrizioni accidentali; inoltre `List-Unsubscribe-Post: One-Click` (RFC 8058) promette un POST che non esiste. *Fix:* link firmato HMAC, route handler POST per la one-click, GET solo di conferma.
- **M — HTML injection nelle email** ([campaigns.ts:345-369](src/server/actions/campaigns.ts), [emails.ts:144](src/server/actions/emails.ts)): `firstName/lastName/orgName` e body interpolati con solo `\n→<br>`, nessun escaping → markup attivo nell'inbox. *Fix:* HTML-escape delle variabili; sanitizer per il body rich-text; check di ruolo minimo per l'invio.
- **M — Invio campagne senza throttle né quota** ([campaigns.ts:336-403](src/server/actions/campaigns.ts)): burst sincrono → rate-limit provider/blacklist; nessuna idempotenza. *Fix:* batch con concorrenza limitata + backoff, quota giornaliera per-org, coda asincrona (esiste `WorkflowQueue`).
- **M — `sendCampaign`: stato non atomico, campagna bloccata in `SENDING`** ([campaigns.ts:336,344-399](src/server/actions/campaigns.ts)): nessun `try/finally` → crash/timeout lascia la campagna irrecuperabile. *Fix:* `try/finally`, invio delegato a coda con tracking per-contatto.

### Scraper / lead finder
- **M18 — SSRF via `location_slug`/`website` arbitrari** ([api/scraper.py:308-309,275-305,200-207](api/scraper.py)): concatenazione diretta in URL + `follow_redirects=True`. *Fix:* whitelist regex su `location_slug`, guard IP-privati, redirect disabilitati/ri-validati.
- **M19 — Nessun rate limiting su endpoint Python e `runSearch`** ([api/scraper.py:477](api/scraper.py), [api/enrich.py:257](api/enrich.py), [lead-finder.ts:764-777](src/server/actions/lead-finder.ts)): `runSearch` ri-eseguibile senza incrementare il cap giornaliero → chiamate Places/Sonar/scraping illimitate. *Fix:* rate-limit Upstash + cooldown per `searchId`.
- **M — Scraping di registri terzi (inipec.gov.it) con User-Agent contraffatto, senza robots/ToS** ([api/scraper.py:23-27](api/scraper.py), [lead-finder.ts:411-417](src/server/actions/lead-finder.ts)): profilo legale/GDPR sull'uso commerciale dei dati. *Fix:* verificare ToS, valutare fonti con licenza (InfoCamere/Registro Imprese), identificare il bot, documentare la base giuridica.

### Automazioni / workflow *(⏸ verdetto adversariale non completato per limite sessione)*
- **M — Nessun retry reale dei webhook** ([webhooks.ts:230-269](src/server/actions/webhooks.ts)): `attempts` sempre 1, fire-and-forget → consegne perse in serverless. *Fix:* outbox + retry dal cron con backoff, o Upstash QStash.
- **M30 — Step workflow per id puro senza riscoping org** ([workflow-engine.ts:140-144](src/lib/workflow-engine.ts), [workflows.ts:127-159](src/server/actions/workflows.ts)): `UPDATE_DEAL_STAGE` aggiorna il deal per solo `id`; `stageId/userId/templateId` validati solo come `z.string()`. *Fix:* validare allo store, `where { id, organizationId }`, verificare lo stage via `pipeline.organizationId`.

### Config / segreti / qualità
- **M — Segreti di produzione in chiaro in `.env.local` sul disco** ([.env.local:14,35](.env.local)): `SMTP_ENCRYPTION_KEY` reale e `VERCEL_OIDC_TOKEN` (file correttamente gitignored, ma esfiltrabile da backup/sync/malware). *Fix:* chiavi di sviluppo distinte da prod; rigenerare la chiave SMTP se condivisa; `vercel env pull` on-demand.
- **M31 — Dipendenze beta in produzione con range `^`** ([package.json:48](package.json)): `next-auth@^5.0.0-beta.31` → `^` su beta consente beta successive con breaking changes. *Fix:* pinnare la versione esatta; pianificare upgrade alla 5.0 stabile.
- **M — Copertura test minima e su codice morto** ([tests/unit/reporting.test.ts](tests/unit/reporting.test.ts)): i 2 test esercitano `reporting.ts`/`mock-ai.ts` (non usati in prod); nessun test su scoping/IDOR/server actions. *Fix:* test di integrazione su `organizationId` in update/delete e sui casi IDOR noti.

### Frontend
- **M — `xlsx` (~400KB) importato staticamente in client component** ([LeadsTable.tsx:17](src/components/leads/LeadsTable.tsx), [ImportCSVModal.tsx:6](src/components/contacts/ImportCSVModal.tsx)): finisce nel bundle iniziale di `/leads` anche per chi non importa mai. *Fix:* `await import("xlsx")` dentro gli handler (come già fatto per jsPDF).
- **M — "Segna tutte lette" è solo stato locale e non persiste** ([Topbar.tsx:63-65,155-166](src/components/shared/Topbar.tsx)): non chiama `markWorkflowNotificationsRead`; il badge ricompare al polling di 60s; doppio fetch. *Fix:* persistere + `react-query` condiviso (Topbar/Panel) con `refetchInterval`.
- **M — XSS potenziale: markdown non sanitizzato in `AIAssistant`** ([AIAssistant.tsx:10-15,137](src/components/ai/AIAssistant.tsx)): `parseMarkdown` non fa escaping prima di `dangerouslySetInnerHTML`; l'output LLM include dati CRM. *Fix:* escape di `&<>` prima delle sostituzioni, o DOMPurify.

---

## 6. 🔵 Finding LOW (37) e ⚪ INFO (7)

| Sev | Area | Titolo | File |
|---|---|---|---|
| LOW | Multi-tenant | `convertLead`: lookup prezzo prodotto con `productId` non scoped | [leads.ts:718-733](src/server/actions/leads.ts) |
| LOW | Multi-tenant | `createActivity`/`sendEmail` accettano `dealId`/`contactId` senza verifica org | [activities.ts:80-98](src/server/actions/activities.ts) |
| LOW | Auth | Nessuna policy password, nessun limite lunghezza (troncamento bcrypt a 72 byte) | [register/route.ts:14](src/app/api/auth/register/route.ts) |
| LOW | Billing | `WEBHOOK_SECRET` con non-null assertion a livello modulo (crash se manca) | [stripe/webhook/route.ts:8](src/app/api/stripe/webhook/route.ts) |
| LOW | Billing | `STRIPE_PRO_PRICE_ID` fallback a stringa vuota → checkout con price invalido | [stripe.ts:18](src/lib/stripe.ts) |
| LOW | Billing | Numero progressivo fattura: race read-then-write | [invoices.ts:196-233](src/server/actions/invoices.ts) |
| LOW | Injection | Self-XSS: `parseMarkdown` + `dangerouslySetInnerHTML` nei messaggi chat AI | [AIAssistant.tsx:10-15](src/components/ai/AIAssistant.tsx) |
| LOW | Injection | Route v1 di lettura senza validazione Zod dei query param (`cast as any`) | [v1/deals/route.ts:42-71](src/app/api/v1/deals/route.ts) |
| LOW | Injection | HTML email da input utente con sola conversione `\n→<br>` | [emails.ts:144](src/server/actions/emails.ts) |
| LOW | Data | `Tag` senza FK né indice su `organizationId` | [schema.prisma:258-265](prisma/schema.prisma) |
| LOW | Data | `Booking` range query senza indice ottimale su `startTime/endTime` | [schema.prisma:794-808](prisma/schema.prisma) |
| LOW | API | Rate limit su IP (`x-forwarded-for`) spoofabile invece che su API key | [rate-limit.ts:57,95](src/lib/rate-limit.ts) |
| LOW | Server action | Leak di messaggi di errore Prisma grezzi al client via `e.message` | [contacts.ts:335,386](src/server/actions/contacts.ts) |
| LOW | Server action | Inconsistenza `update` (throw P2025) vs `updateMany/deleteMany` (no-op) per lo scoping | [bookings.ts:122-154](src/server/actions/bookings.ts) |
| LOW | Server action | `getInvitations`/`getApiKeys` ritornano il token di invito grezzo al client | [settings.ts:114-178](src/server/actions/settings.ts) |
| LOW | Server action | `updateDeal`: scrittura non atomica rispetto al confronto valore precedente | [deals.ts:79-104](src/server/actions/deals.ts) |
| LOW | Server action | `importContactsToList`: errori inghiottiti come "skipped" | [campaigns.ts:162-190](src/server/actions/campaigns.ts) |
| LOW | Frontend | FOUC dark mode (classe `dark` solo in `useEffect`, no script anti-flash) | [ThemeProvider.tsx:9-14](src/components/shared/ThemeProvider.tsx) |
| LOW | Frontend | Fetch-in-effect con server actions invece di RSC/react-query (TanStack già configurato) | [AIInsightsStrip.tsx:25-30](src/components/dashboard/AIInsightsStrip.tsx) |
| LOW | Frontend | Viewport blocca lo zoom utente (`maximumScale: 1`) — barriera a11y | [layout.tsx:68-74](src/app/layout.tsx) |
| LOW | Frontend | Rollback ottimistico Kanban resetta allo stato iniziale (perde mosse concorrenti) | [KanbanBoard.tsx:88-91](src/components/pipeline/KanbanBoard.tsx) |
| LOW | Frontend | Campanella notifiche senza accessible name (`aria-label`) | [Topbar.tsx:214-217](src/components/shared/Topbar.tsx) |
| LOW | Frontend | Reload completo pagina dopo import lead/navigazione invece di update SPA | [LeadsTable.tsx:537](src/components/leads/LeadsTable.tsx) |
| LOW | Frontend | `SessionProvider` senza `initialSession` → fetch `/api/auth/session` ad ogni load | [Providers.tsx:20](src/components/shared/Providers.tsx) |
| LOW | Frontend | PostHog inizializzato indipendentemente dal consenso cookie | [PostHogProvider.tsx:12-21](src/components/shared/PostHogProvider.tsx) |
| LOW | Email | Mittente fisso `noreply@pipely.app` (fromName ignorato, no auth dominio per-org) | [campaigns.ts:341,380-389](src/server/actions/campaigns.ts) |
| LOW | Email | `importContactsToList`: nessun limite dimensione, insert uno-a-uno | [campaigns.ts:162-190](src/server/actions/campaigns.ts) |
| LOW | Scraper | API key Browserbase nella query string del WebSocket (e nei log) | [api/enrich.py:129-132](api/enrich.py) |
| LOW | Scraper | Prompt injection da contenuti scrapati passati ai prompt LLM | [api/scraper.py:420-449](api/scraper.py) |
| LOW | Scraper | Logging di PII di business in chiaro nei server action di enrichment | [leads.ts:343,382](src/server/actions/leads.ts) |
| LOW | Config | `image.remotePatterns` con hostname wildcard ampi (`.ufs.sh`, `.uploadthing.com`) | [next.config.ts:48-50](next.config.ts) |
| LOW | Config | docker-compose con `NEXTAUTH_SECRET` placeholder e password DB debole | [docker-compose.yml:9,31](docker-compose.yml) |
| LOW | Config | Cifratura SMTP AES-256-**CBC** senza autenticazione (no AEAD/MAC) | [crypto.ts:17-24](src/lib/crypto.ts) |
| LOW | Qualità | Codice morto: `reporting.ts`, file `mock-*` non usati in prod | [reporting.ts](src/lib/reporting.ts) |
| LOW | Qualità | `shadcn` (CLI) come dependency di produzione invece che devDependency | [package.json:60](package.json) |
| INFO | Multi-tenant | `updateNote`/`deleteNote` scopano solo per `authorId`, non `organizationId` | [deals.ts:272-299](src/server/actions/deals.ts) |
| INFO | Auth | Cookie flags / `trustHost` NextAuth non configurati esplicitamente | [auth.config.ts:6,70](src/lib/auth.config.ts) |
| INFO | Billing | `checkout.session.completed` non attiva PRO (dipende da `subscription.*`) | [stripe/webhook/route.ts:70-82](src/app/api/stripe/webhook/route.ts) |
| INFO | API | `lastUsedAt` aggiornato fire-and-forget ad ogni richiesta autenticata | [api-auth.ts:52](src/lib/api-auth.ts) |
| INFO | Server action | `incrementTemplateUsage`: nessun `revalidatePath` né gestione errori | [emails.ts:250-258](src/server/actions/emails.ts) |
| INFO | Config | Header `X-XSS-Protection` legacy e duplicazione header tra next.config e vercel.json | [next.config.ts:33](next.config.ts) |
| INFO | Qualità | Mix di logger strutturato e `console.*` sparso nelle server actions | [logger.ts](src/lib/logger.ts) |

---

## 7. Piano di remediation prioritizzato

### 🚑 Sprint 0 — prima del prossimo deploy di produzione
1. **C1** — sostituire `db push --accept-data-loss` con `prisma migrate deploy` + migrazioni versionate. *(Blocca perdita dati.)*
2. **C2, C3, H8–H12** — audit e fix di **tutte** le entità figlie senza `organizationId` (custom-fields, products, campaigns): scoping via parent. *(Blocca IDOR cross-tenant.)*
3. **C4** — rimuovere `api/enrich.py` (dead code) + voce `vercel.json`.
4. **H1/H7, H13, H** (scraper), **M14** — convertire tutti i check fail-open in **fail-closed** (`CRON_SECRET`, `SCRAPER_SECRET_KEY`, `NEXTAUTH_SECRET`/`AUTH_SECRET`, rate limiter).

### 🔧 Sprint 1 — sicurezza/correttezza ad alto impatto
5. **H6, H7, M18, M19** — util anti-SSRF condivisa (webhook + scraper) con blocco IP privati/metadata.
6. **H5, H16, M8** — helper centralizzato di gating piano + rate-limit, applicato anche alle route v1 (`withApiKey`).
7. **H14, H15** — fixare l'invio email (dispatcher resend/SMTP; non marcare `SENT` senza invio).
8. **H** (TLS DB) — `rejectUnauthorized: true` in produzione.
9. **M (xlsx)** — migrare a versione patchata o `exceljs`.

### 📈 Sprint 2 — robustezza / performance / DX
10. **H17, M22-24** — paginazione liste + aggregazioni a DB (`groupBy`).
11. **M (Stripe idempotenza), M (convertLead/invoice atomicità)** — transazioni + idempotenza.
12. **H** (Kanban a11y) + finding frontend (bundle xlsx, notifiche, FOUC).
13. **M (test)** — suite di integrazione su scoping/IDOR; pinning dipendenze beta.
14. Pulizia ESLint (33 errori) + codice morto + logging coerente.

---

## 8. ❌ Falsi positivi (refutati in verifica)

La fase adversariale ha **declassato a info / scartato** questi finding (utile per evitare interventi inutili):

1. **"Nessun limite di seat sugli inviti"** → il modello di pricing è **per-account con team illimitato** (value proposition vs Pipedrive); nessun bug. *Suggerimento:* un commento in `plan.ts` eviterebbe che future analisi lo ri-sollevino.
2. **"Deal FK senza `onDelete` esplicito"** → per i campi opzionali `contactId/companyId` il default Prisma è già `SetNull`: la cancellazione funziona. Solo cosmetico (esplicitare gli `onDelete`).
3. **"Email header injection via `fromName` in `sendViaSMTP`"** → la funzione è dead code e nodemailer 7.0.13 mitiga l'injection (verificato empiricamente). Solo hardening difensivo.
4. **"Parsing non difensivo della risposta OpenRouter"** → i chiamanti avvolgono già in `except Exception` con degradazione controllata; nessun 500 reale.

---

## 9. ⏸ Finding non verificati (limite di sessione)

La verifica adversariale di **13 finding** non è stata completata (raggiunto il limite di sessione a fine run). I finding restano validi come **segnalazioni della fase di review** ma **senza** conferma adversariale indipendente — da rivedere manualmente. I principali (già inclusi sopra perché confermati da altre dimensioni o ad alta confidenza):

- **H6** (SSRF webhook), **H7-bis** (cron fail-open) — *confermati indirettamente da finding gemelli verificati in altre dimensioni.*
- **M (webhook no-retry)**, **M30** (workflow step senza riscoping), **M14** (rate limiter fail-open), **M31** (deps beta), **M (test su codice morto)**, e alcuni low/info di `deps-supply-quality`.

> Nessuno di questi è Critical non confermato altrove: i 4 Critical sono tutti verificati.

---

## Appendice A — Mappa architettura & modello dati

### Multi-tenancy
Campo di scoping: **`organizationId`** (cuid) su quasi tutti i modelli, con relazione `organization … onDelete: Cascade`. `userId`/`ownerId` è ownership **intra**-org, non confine di tenant.

**Catena sessione → org (JWT, no DB in sessione):**
- [auth.ts](src/lib/auth.ts) — provider `Credentials` (bcrypt); `authorize` ritorna `{ id, email, name, role, organizationId }`.
- [auth.config.ts](src/lib/auth.config.ts) — edge-safe; callback `jwt`/`session` propagano `role` + `organizationId`. Strategia JWT.
- **[src/proxy.ts](src/proxy.ts)** — il "middleware" di Next.js 16 (rinominato `proxy`). Il gate è in `authorized`: whitelist di path pubblici (incl. `/api/v1/`, `/api/cron/`, `/api/track/`, `/api/stripe/webhook`, `/book/`, `/survey/`). **`authorized` controlla solo l'autenticazione, NON lo scoping per org** → lo scoping è responsabilità di ogni query (causa-radice degli IDOR).

**Pattern canonico:**
```ts
const session = await auth();
const orgId = (session?.user as { organizationId?: string })?.organizationId;
if (!orgId) return /* [] | null | { error } */;
await db.<model>.findMany({ where: { organizationId: orgId, ... } });
```
Helper `getOrgId(session)` ridefinito localmente in ogni file (non centralizzato → candidato a refactor).

**API pubblica `/api/v1/*`:** [api-auth.ts](src/lib/api-auth.ts) → `authenticateApiKey` (Bearer `pip_live_…`, SHA-256, lookup `ApiKey.keyHash`, `expiresAt`). Sicurezza = solo l'API key (route pubbliche nel proxy).

**Entità a rischio (no `organizationId` proprio, scopate via parent):** `Stage`, `DealProduct`, `CustomFieldValue`, `Note`, `EmailListContact`, `SurveyQuestion/Response`, `Booking`, `WebhookDelivery`, `WorkflowExecution`, `EmailAccount`. `Tag` (`organizationId` String senza FK/indice), `Email` (`organizationId` String? nullable).

### Ruoli
`enum Role`: `OWNER > ADMIN > MANAGER > SALES (default) > VIEWER`. **Nessuna gerarchia centralizzata / `requireRole`** — check inline in [settings.ts](src/server/actions/settings.ts) (cambio ruolo/eliminazione org riservati a `OWNER`). `MANAGER/SALES/VIEWER` non hanno enforcement consistente → **da verificare se VIEWER può scrivere**. Super-admin di piattaforma separato: `isAdmin(email) === process.env.ADMIN_EMAIL` ([admin.ts](src/server/actions/admin.ts), fail-closed).

### Piani
`Organization.plan` (`STARTER`/`PRO`/`ENTERPRISE`). `LIMITS` in [plan.ts](src/lib/plan.ts): STARTER = 1 pipeline, 500 contatti, no AI/automations/campagne/SMTP, leadFinder 1/giorno. Gating **solo applicativo e sparso** (no guard centralizzato); route v1 senza gating (H5). Sync via [stripe/webhook](src/app/api/stripe/webhook/route.ts).

---

## Appendice B — Note di metodologia

- **Conferma incrociata:** diversi finding sono stati segnalati indipendentemente da più dimensioni (es. il `db push` distruttivo da config/prisma/deps; gli IDOR da multi-tenant/server-actions; il `fallback-secret` da auth/validation/deps). Questa ridondanza aumenta la confidenza.
- **Verifica adversariale:** ogni finding è stato sottoposto a un agente "scettico" istruito a refutarlo aprendo il codice citato. 4 finding sono stati scartati (§8), diversi declassati di severità (riflessa nei conteggi). 13 verifiche non completate per limite sessione (§9).
- **Limiti:** la revisione è statica (no esecuzione/exploit reali). Le `file:riga` sono accurate al commit `2de05bf` (branch `main`). Alcuni path nei finding originali avevano prefisso `Pipely/` ridondante — qui normalizzati relativi alla root del progetto.

---

*Report generato da revisione multi-agente automatizzata (143 agenti, verifica adversariale). Le severità riflettono il giudizio post-verifica; validare sempre i fix con test prima del deploy.*
