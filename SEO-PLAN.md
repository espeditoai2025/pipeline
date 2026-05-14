# Piano SEO: Homepage + Landing verticali + Comparison pages

## Context

L'analisi attuale mostra che pipely.it ha una base tecnica SEO solida (canonical, OG, JSON-LD, sitemap) ma manca di:
- H1 orientato alle keyword di ricerca (attuale: "Chiudi più affari. Lavora meno." — puro branding)
- Pagine verticali per keyword ad alto volume (CRM per PMI, CRM per agenzie, ecc.)
- FAQ con schema markup sulla homepage
- Comparison pages per keyword ad alto intent (alternativa HubSpot/Pipedrive)

Obiettivo: catturare traffico organico su keyword specifiche senza toccare il core dell'app.

---

## File critici

| File | Ruolo |
|------|-------|
| `src/app/page.tsx` | Homepage — H1, hero, feature grid, JSON-LD |
| `src/app/sitemap.ts` | Sitemap dinamica — va aggiornata con tutte le nuove route |
| `src/app/layout.tsx` | Metadata root + metadataBase |
| `src/app/(legal)/layout.tsx` | Layout condiviso per pagine pubbliche |

---

## Fase 1 — Homepage: H1 + FAQ schema (modifica `src/app/page.tsx`)

### 1a. Nuovo H1

**Prima:** `"Chiudi più affari. Lavora meno."`

**Dopo:** `"CRM Italiano con AI e Automazioni per PMI"`  
*(con sottotitolo marketing che mantiene il copy attuale)*

Struttura suggerita:
```
<h1>CRM Italiano con AI e Automazioni per PMI</h1>
<p className="hero-sub">Chiudi più affari, lavora meno. Pipeline, contatti, campagne email e AI Assistant — tutto integrato per team italiani.</p>
```

### 1b. Sezione FAQ visibile + FAQPage schema

Aggiungere prima del footer una sezione FAQ con 6–8 domande ad alto volume long-tail:

Domande target:
- "Cos'è un CRM?"
- "Perché le PMI usano un CRM?"
- "CRM vs Excel: qual è la differenza?"
- "Quanto costa un CRM?"
- "Come automatizzare i follow-up con un CRM?"
- "Pipely è gratuito?"
- "Posso importare i miei contatti da Excel?"
- "Il CRM funziona in italiano?"

Aggiungere al JSON-LD esistente (già in `page.tsx`) un quarto schema `FAQPage`:
```json
{
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "...", "acceptedAnswer": { "@type": "Answer", "text": "..." } },
    ...
  ]
}
```

---

## Fase 2 — Vertical landing pages

### Struttura file

Creare una cartella `src/app/(marketing)/` con layout condiviso che eredita il nav/footer pubblico.

Per ogni pagina: `src/app/(marketing)/[slug]/page.tsx`

### Componente riusabile

Creare `src/components/marketing/LandingPage.tsx` — template con:
- Hero con H1 + keyword specifica + badge
- 3 pain point specifici per il target
- Feature grid adattata al target
- Social proof / stats
- FAQ specifica per il target (4–6 domande)
- CTA finale

### Pagine verticali da creare (priorità ordine)

| URL | H1 target | Keyword primaria |
|-----|-----------|-----------------|
| `/crm-per-pmi` | "CRM per PMI Italiane: semplice, completo, in italiano" | crm per pmi |
| `/crm-per-agenzie` | "CRM per Agenzie e Studi Professionali" | crm per agenzie |
| `/crm-commerciale` | "CRM Commerciale per Team di Vendita" | crm commerciale |
| `/crm-per-consulenti` | "CRM per Consulenti e Freelance Italiani" | crm per consulenti |
| `/crm-email-marketing` | "CRM con Email Marketing Integrato" | crm email marketing |

Ogni pagina ha la propria `export const metadata` con title/description/OG dedicati.

---

## Fase 3 — Comparison pages

### Componente riusabile

Creare `src/components/marketing/ComparisonPage.tsx` con:
- Hero: "Pipely vs [Competitor]: il confronto completo"
- Tabella comparativa (feature × soluzione)
- Sezione "Perché scegliere Pipely"
- FAQ specifica (es. "Posso migrare da HubSpot a Pipely?")
- CTA

### Pagine da creare

| URL | H1 | Keyword |
|-----|----|---------|
| `/alternativa-hubspot` | "Pipely vs HubSpot: l'alternativa italiana" | alternativa hubspot |
| `/alternativa-pipedrive` | "Pipely vs Pipedrive: CRM italiano a confronto" | alternativa pipedrive |
| `/migliori-crm-italiani` | "I migliori CRM italiani del 2025" | migliori crm italiani |

---

## Fase 4 — Aggiornamenti trasversali

### `src/app/sitemap.ts`
Aggiungere tutte le nuove route con priorità 0.8 (landing) e 0.7 (comparison), changefreq monthly.

### `src/app/robots.ts`
Nessuna modifica necessaria (le nuove pagine sono già sotto `/` che è `allow: *`).

### `src/app/layout.tsx` — nessuna modifica necessaria

---

## Ordine di implementazione

1. **Homepage** — H1 + FAQ section + FAQPage schema (impatto immediato, 1 file)
2. **Vertical pages** — Componente template + 5 pagine + sitemap update
3. **Comparison pages** — Componente template + 3 pagine + sitemap update

---

## Verifica

- `npx tsc --noEmit` — nessun errore TypeScript
- Controllare [https://www.pipely.it/crm-per-pmi](https://www.pipely.it/crm-per-pmi) che ritorni 200 dopo deploy
- Validare FAQ schema su [https://validator.schema.org](https://validator.schema.org)
- Verificare sitemap aggiornata su [https://www.pipely.it/sitemap.xml](https://www.pipely.it/sitemap.xml)
- Testare OG tags delle nuove pagine con un OG debugger
