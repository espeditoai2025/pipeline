# Nuove Feature — Ispirate da Delera.io

## 1. Dashboard Team Vendite (Leaderboard)
**Effort: Basso | Impatto: Alto**

Classifica venditori con KPI individuali: affari vinti, revenue, win rate, attività completate. Grafico a barre comparativo. Filtro per periodo (7gg, 30gg, trimestre).

- Server action: `getTeamPerformance()` in dashboard.ts
- Componente: `TeamLeaderboard.tsx`
- Posizione: nuova sezione nella dashboard sotto il forecast

## 2. Calendario Appuntamenti Prenotabile
**Effort: Medio | Impatto: Alto**

Link pubblico `/book/{slug}` dove i clienti possono prenotare appuntamenti. Slot disponibili basati sulle attività esistenti. Conferma via email.

- Prisma: modello `BookingPage` (slug, userId, duration, availability)
- Server action: `getAvailableSlots()`, `createBooking()`
- Pagina pubblica: `/book/[slug]/page.tsx`
- UI gestione: sezione nel profilo utente

## 3. Survey / Sondaggi
**Effort: Medio | Impatto: Medio**

Form builder per creare sondaggi con domande multiple choice, testo libero, rating. Link pubblico condivisibile. Risultati aggregati.

- Prisma: modelli `Survey`, `SurveyQuestion`, `SurveyResponse`
- Server action: CRUD survey + submit response
- Pagina pubblica: `/survey/[id]/page.tsx`
- UI gestione: nuova pagina `/surveys`

## 4. Template Email Pronti
**Effort: Basso | Impatto: Medio**

Libreria di template email predefiniti in italiano: benvenuto, follow-up, proposta commerciale, promemoria pagamento, feedback, upsell. Selezionabili quando si crea una campagna.

- Dati: array statico di template con subject + body HTML
- Componente: `EmailTemplateLibrary.tsx`
- Integrazione: picker nella creazione campagna email

## 5. Widget Chatbot Sito Web
**Effort: Medio | Impatto: Alto**

Snippet JavaScript embeddabile su qualsiasi sito. Raccoglie nome, email, messaggio. I messaggi arrivano come lead nel CRM.

- API endpoint: `/api/v1/chat-widget` (POST)
- Snippet JS generabile dalle settings
- UI inbox: sezione messaggi in arrivo

---

## Ordine di implementazione
1. Dashboard Team Vendite (veloce, alto impatto)
2. Template Email Pronti (veloce)
3. Calendario Appuntamenti Prenotabile
4. Survey / Sondaggi
5. Widget Chatbot
