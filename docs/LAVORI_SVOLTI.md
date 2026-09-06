# Pipely — Lavori Svolti

> Ultimo aggiornamento del registro: 2026-09-06. Le sezioni di maggio sotto sono conservate come storico.

## Sessione del 2026-09-06 — Posta ed email marketing

Controllo della funzione mail e delle campagne. In produzione **nessuna email poteva partire** e il guasto era invisibile.

Il mittente predefinito è `noreply@pipely.app` (`RESEND_FROM` non impostata in nessun ambiente Vercel), ma il dominio `pipely.app` non ha alcun record di posta: niente MX, niente SPF, nessun DKIM. Resend rifiuta gli invii da un dominio non verificato, e un dominio senza DKIM non può essere verificato. Ne risultavano bloccati reset password, benvenuto, inviti al team, modulo contatti, notifiche dei workflow, avviso di backup, invio singolo e campagne. I dati di produzione concordano: la tabella `Email` è vuota, nessuna configurazione SMTP esiste, e l'unica campagna in stato "SENT" è del 14 maggio, precedente alla correzione che impedisce di marcare inviata una campagna con zero invii.

Il guasto era silenzioso perché l'SDK Resend **non lancia** sugli errori dell'API: `emails.send` restituisce `{ data, error }`. Solo l'invio campagne leggeva `error`; ogni altro punto faceva `await` senza controllo, e in `sendEmail` la riga veniva salvata come "SENT" con l'interfaccia che diceva "Email inviata". I `.catch()` sparsi intercettavano solo gli errori di rete, quindi un rifiuto dell'API non finiva nemmeno nei log.

Correzioni: nuovo `src/lib/mailer.ts`, unico punto d'uscita della posta, che legge l'errore restituito e lo riporta al chiamante (`sendPlatformMail` per la posta di piattaforma, con log dei fallimenti; `sendOrgMail` per quella inviata per conto di un'organizzazione). Tutti e otto i punti d'invio ci passano; `resend.emails.send` compare ora solo dentro il mailer. L'SMTP verificato del cliente ha la precedenza su Resend anche quando la chiave di piattaforma è presente — prima, con `RESEND_API_KEY` impostata, la procedura guidata SMTP venduta come funzione Pro non veniva mai usata — e un SMTP che fallisce non ricade su Resend, per non far partire il messaggio da un mittente inatteso. Il nome mittente scelto per la campagna, prima ignorato sul canale Resend, viene ora applicato mantenendo l'indirizzo verificato. Il `cc`, prima accettato e perso, arriva a destinazione anche via SMTP.

Nuovo registro per destinatario (`CampaignDelivery`, migrazione `20260906100000_campaign_delivery`): un invio interrotto da un timeout, che dopo trenta minuti torna in Bozza, riparte senza riscrivere a chi ha già ricevuto, e il totale somma i tentativi. Le stesse righe rendono uniche le statistiche: aperture e clic contano una volta per persona invece di ogni caricamento del pixel, così il tasso mostrato non può più superare il 100% per via dei proxy immagini dei client di posta.

Verifiche: 133 test unitari (15 nuovi fra `mailer` e `campaign-sender`, compresa la prova che una ripresa non genera doppioni), TypeScript, ESLint e build di produzione puliti; la SQL della migrazione coincide con quella canonica generata da Prisma. Il collaudo su database reale non è stato eseguito perché Docker non era avviato.

Rilasciato con il commit `e2fbf61`: la build ha applicato la migrazione `campaign_delivery` (otto migrazioni in tutto).

**Posta attivata la notte del 6 settembre.** L'utente ha aggiunto su Aruba i tre record indicati da Resend: MX `feedback-smtp.eu-west-1.amazonses.com` e TXT `v=spf1 include:amazonses.com ~all` su `send.pipely.it`, TXT DKIM su `resend._domainkey.pipely.it`. La posizione del DKIM dice che il dominio registrato su Resend è `pipely.it`, non il sottodominio: `send.pipely.it` è solo il percorso di ritorno per SPF, quindi il mittente va sul dominio principale e la posta Aruba in ingresso resta intatta (l'MX all'apice non è stato toccato). Impostata `RESEND_FROM` su Vercel a `Pipely CRM <noreply@pipely.it>` e fatto il redeploy. Prova reale in produzione: una richiesta di reset password ha generato il token e **nessun errore del mailer nei log**, cioè Resend ha accettato il messaggio — lo stesso tentativo prima della correzione sarebbe fallito in silenzio.

**Rate limiting attivato.** Il limitatore in `src/lib/rate-limit.ts` esisteva già ma non era mai entrato in funzione: senza credenziali Redis lasciava passare tutto, e ogni richiesta di autenticazione registrava l'errore "rate limiting DISATTIVO". Provisionata dal marketplace Vercel un'istanza Upstash Redis sul piano gratuito a Francoforte, la stessa regione del database, con l'aggiornamento automatico di piano disattivato per escludere costi a sorpresa. L'integrazione crea però `KV_REST_API_URL`/`KV_REST_API_TOKEN`, non i nomi nativi di Upstash che il codice cercava: ora accetta entrambe le coppie, così non serve duplicare gli stessi segreti sotto due nomi. Corretto anche un rischio di disponibilità: l'eccezione di `.limit()` risaliva fino alla rotta, quindi un guasto di Redis avrebbe reso inaccessibili login, registrazione e reset password; ora la richiesta passa e l'errore finisce nei log. Prova reale su pipely.it: le prime dieci richieste all'endpoint di reset password rispondono 200, dall'undicesima in poi 429 con l'intestazione `Retry-After`, e l'errore ricorrente è sparito dai log.

## Sessione del 2026-09-05 — CRM per professionisti e microimprese

Corrette incoerenze nei flussi di contatti, importazione/fusione, attività, affari e riferimenti tra organizzazioni. Aggiunte la dashboard “La tua giornata” e l'area “Fatture e incassi”, con scadenzario, acconti, saldi, rettifiche e riepiloghi per valuta.

Verifiche concluse: 94 test unitari, 20 prove browser isolate, TypeScript, ESLint, validazione Prisma e build, più un collaudo su PostgreSQL 17 locale con dati di prova. In serata, con le credenziali Supabase fornite dall'utente: backup `pg_dump`, verifica dello storico Prisma, commit `0b41120`, push e deploy Vercel con la migrazione `invoice_payments` applicata in produzione. La tabella delle fatture in produzione era vuota. Restano aperti `DATABASE_CA_CERT` e il rate limiting Upstash.

A seguire, sempre il 5 settembre: modello OpenRouter predefinito aggiornato a `google/gemini-3.8-flash` (commit `a4035fd`) e revisione del Lead Finder AI: abbinamento delle risposte del modello per id invece che per prefisso del nome, controllo di plausibilità delle email proposte dall'AI rispetto al dominio del sito, deduplica unificata per nome normalizzato, P.IVA e dominio, lotti da 10 con parser tollerante ai JSON troncati, timeout e retry verso OpenRouter, interrogazioni Google Places a ondate, recupero delle ricerche rimaste "in corso" oltre dieci minuti e pulsante "Riprova"; helper puri in `src/lib/lead-finder-utils.ts` con test unitari.

Prova reale del Lead Finder sulla provincia di Bergamo (database di prova in Docker, chiavi OpenRouter locali): FatturatoItalia ha cambiato HTML (link relativi, nomi in maiuscolo, scheda con tabella `th`/`td` e lista `dt`/`dd`, senza più telefono e sito nella pagina gratuita), quindi sia lo scraper TypeScript sia la funzione Python trovavano zero aziende. Riscritti entrambi i parser, che ora leggono anche P.IVA reale (lo slug contiene il codice fiscale), fatturato e comune; INI-PEC risponde senza dati e viene tentato una sola volta; lo scorer Python troncava il JSON a 500 token e ricadeva su punteggi piatti. Attivata la funzione Python in produzione con `SCRAPER_SECRET_KEY` su Vercel; il chiamante le chiede il doppio dei risultati e preferisce il punteggio di Sonar, con quello del servizio come ripiego. Confronto con criteri e AI su dieci aziende: TypeScript 42 secondi, Python 66 secondi con selezione più pertinente e più contatti; senza AI nessuno dei due trova email o telefoni, perché il registro non li espone più.

Imbuto a due stadi e origine dei contatti (notte tra 5 e 6 settembre): la ricerca raccoglie un bacino largo dal registro (fino a 60 aziende, il triplo dei risultati richiesti), applica filtri deterministici su dimensione (fasce di dipendenti del registro contro la fascia del modulo) e settore (codici ATECO abbinati ai tredici settori del modulo; le aziende senza codice restano in coda), pre-valuta con Gemini sui soli dati del registro e manda a Sonar solo le migliori. Email, telefono e sito portano ciascuno la propria origine (`sito`, `pec`, `maps`, `registro`, `ai-verificato`, `ai`), salvata nelle tre nuove colonne di `LeadCandidate` (migrazione `20260905230000_lead_candidate_sources`) e mostrata nella tabella come "verificato" o "da verificare"; i telefoni sono salvati in E.164 e i domini delle email devono avere un record MX. Due difetti emersi al collaudo: Gemini 3.8 Flash spende oltre duemila token di ragionamento nascosto che contano nel limite `max_tokens`, quindi la pre-valutazione arrivava tronca (14 aziende su 17) e anche le risposte brevi dell'assistente e delle bozze email rischiavano di uscire vuote; `chatCompletion` invia ora `reasoning.effort = low` (i modelli senza ragionamento, come Sonar, lo ignorano; disattivarlo del tutto è rifiutato dall'endpoint) e scrive nei log le risposte troncate, e lo stesso parametro è nel servizio Python. La verifica dei siti visitava solo il dominio senza `www.` e scartava quasi tutti i siti proposti: ora prova le varianti www/https/http, considera esistente un sito che risponde (anche con 403) e lo marca "verificato" solo se le pagine citano la parola distintiva del nome dell'azienda. La pre-valutazione (Gemini nel codice TypeScript, scorer del servizio Python in produzione) propone anche il sito ufficiale quando ne è certa, marcato `ai` e verificato allo stesso modo prima di cercarvi email; un'email letta da un sito non riconosciuto resta "da verificare"; caselle privacy, stampa e no-reply sono scartate; i nomi del registro perdono la parentesi "(ovvero in forma abbreviata …)". Collaudo su Bergamo, settore manifattura, parole chiave metalmeccanica: percorso TypeScript 41 secondi, 10 aziende, 9 con sito (8 verificati), pre-valutazione completa 17/17 e selezione coerente (Stemin, Brembo, SDF, Dalmine, Evoca davanti a Sanpellegrino); percorso Python 53 secondi, 9 siti di cui 7 verificati e 2 lasciati "da verificare" (Tenaris per Dalmine, Fecs per Stemin) con le relative email. Rilasciato in produzione il 6 settembre 2026 con il commit `9b996ec`: la build Vercel ha applicato la migrazione `20260905230000_lead_candidate_sources` (sette migrazioni in tutto) e il deploy è stato pubblicato su pipely.it in poco più di due minuti.

Verifica TLS del database (6 settembre 2026): l'utente ha scaricato dal pannello Supabase la CA `Supabase Root 2021 CA` (file `docs/prod-ca-2021.crt`, valido fino ad aprile 2031). Il pooler `*.pooler.supabase.com` presenta la catena foglia → `Supabase Intermediate 2021 CA` → quella root, e l'impronta della root inviata dal server coincide con il file; con la CA e `rejectUnauthorized: true` la connessione a `DIRECT_URL` e `DATABASE_URL` riesce, senza CA il client rifiuta la catena. In `.env.local` il valore sta su una riga con gli a capo codificati come `\n` (Next.js li converte, `src/lib/db.ts` accetta entrambe le forme). Su Vercel la variabile è stata creata per Production, marcata Sensitive, con `vercel env add` letta dal file, seguita da un redeploy: l'avviso `[db] DATABASE_CA_CERT non impostato`, che la build precedente stampava sei volte e che compariva a ogni richiesta nei log runtime, è sparito, e il cron delle 07:30 UTC ha girato sul nuovo deploy senza avvisi né errori.

Per il dettaglio delle cose fatte, dei limiti dei test, delle attività da fare e di tutti i file modificati/nuovi, fare riferimento alla [revisione del 5 settembre](REVISIONE-CRM-2026-09-05.md) e alla [procedura di rilascio degli incassi](INCASSI-RILASCIO.md). Le valutazioni e i TODO delle sezioni storiche non sono stati tutti riconfermati da questa revisione.

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
