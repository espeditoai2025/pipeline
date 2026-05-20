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

## 5. Redeploy finale
Dopo aver completato tutti i punti sopra:
```bash
vercel deploy --prod
```

---

## Note
- `CRON_SECRET` ✅ già impostato su Vercel
- `NEXT_PUBLIC_APP_URL` ✅ già impostato su Vercel (`https://www.pipely.it`)
- `RESEND_API_KEY` ✅ già impostato su Vercel
- `prisma db push` ✅ già aggiunto al build command (gira ad ogni deploy)
- Dopo ogni `vercel env add`, lanciare `vercel deploy --prod` per applicare
