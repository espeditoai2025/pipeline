# Da fare — Infrastruttura Pipely

## 1. DNS Resend per pipely.it (dominio email transazionale)

Aggiungere nel pannello del registrar di **pipely.it** questi 3 record:

### Record 1 — DKIM
| Campo | Valore |
|---|---|
| Tipo | `TXT` |
| Nome | `resend._domainkey` |
| Valore | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDQkFXsH1aoOPzcdDlP9vX4sh8EjCMUeo/GlYW6RblRTMn95bXFdh9+nYK/umFAi5gFwFCHu5USXnxyJ+PpVDRQRdQKazjKNUYD4dZMc8g9GEeQFEQSZax/PgClu/uL1PgSOqsmDRmNvxrkImxsNSEzxwttcIVN10t6K5JCPAZvJQIDAQAB` |
| TTL | Auto |

### Record 2 — SPF (MX)
| Campo | Valore |
|---|---|
| Tipo | `MX` |
| Nome | `send` |
| Valore | `feedback-smtp.eu-west-1.amazonses.com` |
| Priorità | `10` |
| TTL | Auto |

### Record 3 — SPF (TXT)
| Campo | Valore |
|---|---|
| Tipo | `TXT` |
| Nome | `send` |
| Valore | `v=spf1 include:amazonses.com ~all` |
| TTL | Auto |

Dopo aver aggiunto i record, chiedere a Claude di verificare la propagazione e impostare:
```
RESEND_FROM=Pipely CRM <noreply@pipely.it>
```

---

## 2. Upstash Redis — rate limiting

1. Vai su https://upstash.com → crea account → **Create Database**
   - Nome: `pipely-ratelimit`
   - Tipo: Redis
   - Region: **EU West 1** (Francoforte)
   - Piano: Free
2. Apri il database → copia **REST URL** e **REST Token**
3. Esegui da terminale nella cartella del progetto:
```bash
echo "https://..." | vercel env add UPSTASH_REDIS_REST_URL production
echo "xxxxx"       | vercel env add UPSTASH_REDIS_REST_TOKEN production
```

---

## 3. Sentry — monitoraggio errori

1. Vai su https://sentry.io → crea account → **Create Project** → Next.js
2. Copia il DSN (formato `https://xxx@oyyy.ingest.sentry.io/zzz`)
3. Esegui:
```bash
echo "https://xxx@..." | vercel env add SENTRY_DSN production
echo "https://xxx@..." | vercel env add NEXT_PUBLIC_SENTRY_DSN production
```

---

## 4. PostHog — analytics

1. Vai su https://posthog.com → crea account → crea progetto **Pipely**
   - Region: **EU Cloud** (https://eu.posthog.com)
2. Copia la **Project API key** (formato `phc_xxx`)
3. Esegui:
```bash
echo "phc_xxx"            | vercel env add NEXT_PUBLIC_POSTHOG_KEY production
echo "https://eu.i.posthog.com" | vercel env add NEXT_PUBLIC_POSTHOG_HOST production
```

---

## 5. Google OAuth — login con Google

Il pulsante "Accedi con Google" nella pagina di login dà errore perché mancano le credenziali.

1. Vai su https://console.cloud.google.com/
2. Crea un progetto → **API & Services → Credentials → Create OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized redirect URIs: `https://www.pipely.it/api/auth/callback/google`
3. Copia **Client ID** e **Client Secret**
4. Esegui:
```bash
echo "xxx.apps.googleusercontent.com" | vercel env add GOOGLE_CLIENT_ID production
echo "GOCSPX-xxx"                     | vercel env add GOOGLE_CLIENT_SECRET production
```

---

## 6. Redeploy finale
Dopo aver completato tutti i punti sopra:
```bash
vercel deploy --prod
```

---

---

# Roadmap Prodotto — Verso il miglior CRM italiano

## Priorità 1 — Quick wins (base già esistente)

### 7. Vista Calendario attività
Le attività (call, meeting, task, ecc.) esistono già. Serve un componente calendario visuale (FullCalendar o simile) nella pagina `/activities` per vedere tutto a colpo d'occhio.
- **File coinvolti**: `src/app/(dashboard)/activities/`, `src/server/actions/activities.ts`
- **Effort**: Medio

### 8. Merge duplicati contatti
Il rilevamento duplicati per email funziona già nell'import CSV. Serve una UI dedicata per confrontare e unire i contatti duplicati esistenti.
- **File coinvolti**: `src/components/contacts/ContactsTable.tsx` (detection già presente), nuovo componente merge
- **Effort**: Basso

### 9. Grafico Forecast pipeline
I dati di forecast pesato (valore deal × probabilità stage) sono già calcolati in `dashboard.ts`. Serve il chart Recharts forecast vs actual per mese.
- **File coinvolti**: `src/server/actions/dashboard.ts`, `src/components/charts/`
- **Effort**: Medio

### 10. Webhook endpoints in/out
API pubblica per ricevere eventi esterni (webhook in) e notificare sistemi terzi quando succede qualcosa nel CRM (webhook out). Lo schema `ApiKey` esiste già.
- **File coinvolti**: `src/app/api/`, schema Prisma
- **Effort**: Medio

### 11. Generazione preventivi PDF
I prodotti e deal products ci sono già. Serve un template PDF generabile dalla pagina deal con dati azienda, contatto, prodotti, prezzi, sconti.
- **File coinvolti**: `src/server/actions/products.ts`, `src/components/products/DealProductsManager.tsx`
- **Effort**: Medio-Alto

## Priorità 2 — Differenziatori mercato italiano

### 12. Email Sequences / Drip campaigns
Builder dedicato per sequenze automatiche (giorno 1: email benvenuto, giorno 3: follow-up, ecc.). I workflow coprono parzialmente ma serve UX dedicata.
- **Effort**: Alto

### 13. WhatsApp Business API
Integrazione con WhatsApp Business per inviare messaggi, template, e tracciare conversazioni dal CRM. Canale #1 in Italia per vendita.
- **Effort**: Alto

### 14. Zapier / Make connector
Connettore per aprire l'ecosistema a 5000+ integrazioni senza sviluppo custom. Richiede API REST pubblica documentata + app Zapier/Make.
- **Effort**: Medio-Alto

### 15. PWA / Mobile responsive
Progressive Web App con manifest, service worker, e UI ottimizzata per mobile. Il 60%+ degli utenti CRM accede da smartphone.
- **Effort**: Medio

### 16. Integrazione fatturazione italiana
Collegamento con FatturaPA, FatturaPro, Danea Easyfatt per generare e-fatture direttamente dal deal. Fondamentale per il mercato italiano.
- **Effort**: Alto

---

## Note
- `CRON_SECRET` ✅ già impostato su Vercel
- `NEXT_PUBLIC_APP_URL` ✅ già impostato su Vercel (`https://www.pipely.it`)
- `RESEND_API_KEY` ✅ già impostato su Vercel
- `prisma db push` ✅ già aggiunto al build command (gira ad ogni deploy)
- Dopo ogni `vercel env add`, lanciare `vercel deploy --prod` per applicare
