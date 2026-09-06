# Revisione Pipely — 5 settembre 2026

Target scelto: **liberi professionisti e microimprese**. Il lavoro si concentra su uso quotidiano, affidabilità dell'agenda, qualità dei contatti, scadenzario e incassi, isolamento delle organizzazioni. La revisione riguarda questi flussi e la configurazione di build; non costituisce una verifica completa di tutti i moduli o delle integrazioni esterne.

## Stato alla sospensione del lavoro

**Lavoro sospeso su richiesta dell'utente il 5 settembre 2026 e ripreso nella stessa giornata** con un collaudo su PostgreSQL 17 locale e dati di prova, descritto in [INCASSI-RILASCIO.md](INCASSI-RILASCIO.md). Questo documento è il punto di ripresa della sessione. Nessuna modifica applicativa, nessuna migrazione e nessuna pubblicazione sui dati reali.

| Ambito | Stato effettivo |
| --- | --- |
| Correzioni CRM e dashboard “La tua giornata” | Implementate nel codice locale e verificate con le prove descritte sotto. |
| Fatture e incassi | Implementati interfaccia, azioni server, schema e test; rilasciati in produzione il 5 settembre con la migrazione applicata. |
| Migrazione `20260905120000_invoice_payments` | **Applicata in produzione** dal deploy Vercel del commit `0b41120` (5 settembre, 20:38 UTC), dopo backup `pg_dump` e verifica dello storico. La tabella delle fatture era vuota. |
| Connessione | `DIRECT_URL` e `DATABASE_URL` inserite dall'utente in `.env.local` la sera del 5 settembre (Supabase, pooler eu-central-1); `DATABASE_CA_CERT` configurata il 6 settembre in locale e su Vercel con la CA `Supabase Root 2021 CA` (verifica TLS completa). `NEXTAUTH_URL` e un `NEXTAUTH_SECRET` locale impostati per lo sviluppo. |
| Verifiche | 94 test unitari e 20 prove browser isolate superati; TypeScript, ESLint, schema Prisma e build verificati. Collaudo successivo su PostgreSQL 17 locale con dati di prova: migrazione, saldi iniziali, concorrenza, ruoli, organizzazioni e pagine autenticate (vedi [INCASSI-RILASCIO.md](INCASSI-RILASCIO.md)). Nessun collaudo sui dati reali. |
| Rilascio e Git | Commit `0b41120` su `main` con i 64 file dell'inventario più `.gitignore`, push e deploy Vercel `dpl_CB39GqEBi7U7EPRYqpHZZfRbfcPw` in stato READY su pipely.it. Verifiche dopo il rilascio in [INCASSI-RILASCIO.md](INCASSI-RILASCIO.md). |

Il dettaglio dei 64 file è nell'inventario finale; i file generati e ignorati da Git sono elencati separatamente. Le funzionalità sono rilasciate ma non ancora usate con dati reali: in produzione non esistono fatture.

## Funzionalità aggiunta: La tua giornata

La dashboard contiene una sezione operativa, disponibile senza un servizio AI:

- Attività personali in ritardo e in scadenza entro oggi, completabili direttamente.
- Affari personali aperti senza una prossima attività datata, ordinati per chiusura prevista e anzianità dell'aggiornamento.
- Pianificazione del ricontatto con affare, contatto e oggetto già selezionati. La data è obbligatoria per il ricontatto.
- Nuova attività e collegamenti alle schede dei clienti e degli affari.
- Contatori completi; elenchi limitati a quattro attività scadute, quattro di oggi e cinque affari, con indicazione degli ulteriori risultati.

La giornata è calcolata nel fuso `Europe/Rome`, anche quando il server usa UTC e nei giorni di cambio dell'ora. I valori degli affari mantengono la propria valuta. Le query sono filtrate sia per organizzazione sia per assegnatario.

## Problemi corretti

| Area | Problema rilevato | Correzione |
| --- | --- | --- |
| Contatti e attività | I riferimenti esterni ricevuti dalle azioni potevano collegare dati di altre organizzazioni. | Controllo server di azienda, contatto, affare, pipeline e fase prima della scrittura. |
| API pubbliche | Le PATCH di contatti e affari non verificavano i nuovi riferimenti; la creazione verificava l'organizzazione della fase ma non la pipeline selezionata. | Verifica dei riferimenti e della relazione fase/pipeline; organizzazione inclusa nelle scritture. |
| Pipeline | Un trascinamento con stato obsoleto poteva sovrascrivere uno spostamento recente. | Controllo della fase corrente, della pipeline e dello stato aperto, con messaggio di aggiornamento. |
| Affari chiusi | Ripetere “vinto” modificava la data di chiusura e ripeteva automazioni; riaprire via API lasciava la data precedente. | Date e automazioni cambiano solo alla transizione; riapertura azzera chiusura e motivo di perdita. Le operazioni collettive ignorano affari eliminati e stati già uguali. |
| Modulo affare | Rimuovere il contatto o la data poteva lasciare il valore precedente. | Rimozioni esplicite tramite `null`. |
| Sessioni | Ruolo e organizzazione rimanevano quelli memorizzati al login. | Aggiornamento dalla lettura dell'utente già effettuata durante la verifica della sessione. |
| Fusione contatti | Campi personalizzati eliminati e tag non trasferiti; gruppi di tre contatti trattati solo in parte. | Transazione serializzabile, recupero dei campi mancanti, trasferimento dei tag e delle relazioni, nota con dati originali e conflitti. L'interfaccia elabora tutte le coppie del gruppo e si azzera alla riapertura. |
| Importazione | Separazione con `split(',')`, righe invalide saltate, aziende create prima della deduplicazione e limite piano calcolato anche sui duplicati. | Parser CSV per virgola, punto e virgola, tabulazione, BOM, `sep=`, virgolette e celle multilinea; validazione completa, email normalizzate, limite sui nuovi contatti e transazione per aziende/contatti. |
| Excel e gestione errori | Valori formattati non preservati e caricamenti falliti senza recupero dello stato UI. | Lettura dei valori formattati, intestazioni controllate, limite di 2.000 righe e 5 MB; errori leggibili prima di salvare. |
| Agenda | Attività di oggi già scadute in due gruppi; attività senza data anche in “Più avanti”; calendario e contatori con stato separato. | Categorie esclusive e stato condiviso fra lista, calendario e contatori. |
| Orari | ISO UTC troncati in campi `datetime-local`, con spostamenti alla modifica. | Conversione esplicita UTC/orario locale nel modulo e nelle schede contatto/affare. |
| Dashboard | Confronti col periodo precedente su valori che non erano confronti; crescita del 100% senza base precedente. | Confronto solo sulle vendite; base assente indicata esplicitamente; etichette principali in italiano. |
| Accessibilità | Zoom mobile disabilitato e campi del modulo attività senza etichette associate. | Zoom abilitato, etichette collegate, regione dell'elenco identificata e controlli di scelta espliciti nella fusione. |
| Rilascio | Ogni deploy tentava di marcare `0_init` applicata ignorandone gli errori. | Deploy delle migrazioni senza baseline automatico. Un database nuovo esegue realmente lo schema iniziale. |
| Tooling | Lint sui file generati e configurazioni Sentry/cache deprecate o ridondanti. | Esclusioni mirate; opzioni Sentry aggiornate secondo i tipi installati; cache dei chunk gestita da Next.js. |

La fusione resta definitiva: prima di eliminare il duplicato conserva le informazioni originali in una nota del contatto principale. La nota non è un registro di audit immutabile. L'importazione non attiva automaticamente invii email o campagne per le nuove righe.

## Verifiche

| Verifica eseguita nella sessione | Esito e copertura |
| --- | --- |
| `npm run test:unit` | **94/94 superati**, in 8 file. Di questi, 23 test riguardano fatture e incassi. Le altre prove coprono parser, normalizzazione, deduplicazione, limiti, date, riferimenti tra organizzazioni, fusione, transizioni degli affari, API e query operative, oltre ai test preesistenti. |
| `npm run test:ui` | **20/20 superati**: dieci percorsi su Chromium desktop e mobile. Componenti reali e azioni simulate; completamento/ricontatto, fusione di tre contatti, CSV validi e invalidi, lista/calendario, acconto–saldo–rettifica, scadenze, errori, ruolo lettore, scadenzario e bozza. |
| `npx tsc --noEmit` | Superato. |
| `npm run lint` | Superato. |
| `npx prisma generate` e `npx prisma validate` | Client generato e schema valido. Non applicano la migrazione. |
| `npm run build` | Build Next.js di produzione completata, incluse le due nuove pagine fatture. Resta l'avviso relativo alla CA del database assente. |
| Controllo differenze Git | Nessun errore di spaziatura nel controllo finale delle modifiche applicative. |
| Ispezione visiva | Dashboard, scadenzario e dettaglio incassi controllati su desktop e telefono con dati dimostrativi. |
| `npx prisma migrate status` | **Non completato**: `Connection url is empty`, prima dell'accesso al database. |
| Collaudo su PostgreSQL 17 locale (Docker, dopo la sospensione) | Baseline con `migrate resolve`, `migrate deploy` della migrazione incassi, 98 controlli sui saldi iniziali, 9 prove con le azioni server reali (concorrenza, idempotenza, ruoli, organizzazioni, bozze, paginazione) e prova autenticata nel browser. Dati di prova, non reali; dettagli e note operative in [INCASSI-RILASCIO.md](INCASSI-RILASCIO.md). |

Questi sono i risultati delle esecuzioni già concluse nella sessione; l'aggiornamento documentale finale non ha rilanciato build o test applicativi.

I test non verificano transazioni contro PostgreSQL reale, concorrenza fra connessioni reali o consegna tramite servizi esterni. Nessuna migrazione, fusione o importazione è stata eseguita sui dati reali; nessun deploy è stato effettuato. Gli screenshot dei test usano dati dimostrativi.

## Configurazione ancora da completare

Il primo tentativo di eseguire la migrazione, il 5 settembre, era bloccato perché `DIRECT_URL` e `DATABASE_URL` erano vuote. In serata l'utente ha inserito le credenziali Supabase in `.env.local`; lo storico del database di produzione è risultato coerente (5 migrazioni applicate, una pendente), è stato fatto un backup con `pg_dump` e la migrazione è stata applicata dal deploy Vercel. Dettagli in [INCASSI-RILASCIO.md](INCASSI-RILASCIO.md).

Aggiornamento del 6 settembre: `DATABASE_CA_CERT` è configurata in locale e su Vercel con la CA `Supabase Root 2021 CA` scaricata dal pannello Supabase; la catena del pooler è stata verificata con `pg` e il redeploy ha fatto sparire l'avviso dalla build e dai log runtime (dettagli in LAVORI_SVOLTI.md).

## Priorità successive per il target scelto

Le attività seguenti sono **da fare**, non risultati già ottenuti. La ripresa avverrà su richiesta dell'utente.

| Priorità | Attività | Risultato da verificare |
| --- | --- | --- |
| P0 — connessione | **Fatto il 5 settembre** per `DIRECT_URL` e `DATABASE_URL`. `DATABASE_CA_CERT` configurata il 6 settembre su Vercel e in locale. | Connessione verificata con `prisma migrate status`. Credenziali solo in `.env.local`, mai nei documenti o in Git. |
| P0 — dati | **Fatto il 5 settembre**: storico Prisma verificato, backup `pg_dump` in `backups/`, migrazione applicata in produzione. | Tabella delle fatture vuota al momento della migrazione: nessun saldo iniziale da trasferire. Non usare `db push` al posto delle migrazioni. |
| P0 — collaudo | Ripetere sulla copia dei dati reali il collaudo già eseguito su PostgreSQL locale con dati di prova: più connessioni, autenticazione reale, due organizzazioni e un ruolo lettore. | Pagamenti concorrenti, retry, rettifiche e residui coerenti; impossibilità di leggere o modificare dati di altre organizzazioni nei flussi revisionati. Verificare anche la compatibilità delle nuove relazioni con la cancellazione dell'organizzazione. |
| P0 — rilascio | **Fatto il 5 settembre**: commit `0b41120`, deploy Vercel READY, migrazione applicata durante la build. | Da completare con una prova autenticata delle pagine incassi in produzione, con un account reale, appena esiste la prima fattura. |
| P1 — preventivi | Aggiungere stato persistente, versioni e accettazione del cliente. | Percorso documentato dalla proposta all'affare e all'incasso. |
| P1 — fatturazione | Scegliere il provider, completare i dati fiscali, validare il tracciato e collaudare l'integrazione. | Emissione e ricevute verificabili; solo dopo queste prove valutare il ripristino dell'XML. L'attuale stato “inviata” è manuale. |
| P1 — avvio rapido | Semplificare l'onboarding per importare clienti, aprire un affare, pianificare un ricontatto e preparare un preventivo. | Primo percorso completo comprensibile a un professionista, con moduli avanzati opzionali. |
| P1 — attività | Estendere la coda dei ricontatti con filtri per proprietario, cliente e periodo, comprese attività senza data e affari senza prossimo passo. | Vista completa oltre ai riepiloghi limitati della dashboard. Lo scadenzario delle fatture è già presente nel codice. |
| P2 — volumi | Paginare gli altri elenchi, gestire importazioni a lotti e riconciliare le valute negli altri report. | Prestazioni e aggregazioni verificate su dati rappresentativi. La separazione per valuta già aggiunta riguarda le fatture. |
| P2 — integrazioni | Collaudare invii, risposte, rinnovi OAuth, webhook e ripristino da backup in un ambiente di prova. | Flussi esterni verificati da inizio a fine; nessun invio reale effettuato nella revisione. |

Le precedenti note di maggio in `docs/LAVORI_SVOLTI.md` contengono ulteriori TODO e valutazioni storiche. Non sono state tutte riesaminate: riconciliarle con il codice prima di considerarle ancora aperte o risolte. Questa sessione non conferma i punteggi SEO o le valutazioni di conformità di quel documento.

Misure proposte: tempo necessario a pianificare il primo ricontatto, quota di affari aperti con prossima attività, ricontatti scaduti, tempo da proposta ad accettazione e ritorno degli utenti dopo quattro settimane. La leadership di mercato non si può dimostrare con una revisione del codice.

## Secondo intervento: fatture e incassi

Nuove pagine `/invoices` e `/invoices/[id]`, raggiungibili dal menu principale e dalle impostazioni. La creazione dall'affare propone una scadenza in base ai termini, apre il dettaglio della bozza e non scarica automaticamente file fiscali.

- Scadenzario con ricerca per numero, cliente o identificativo fiscale, filtri scadute, entro sette giorni, con acconto e stato; pagine da 25 record interrogate sul server.
- Riepiloghi di residuo, scaduto e incassato separati per valuta, sull'intero archivio. Bozze e annullate escluse dai totali; le scadenze si valutano sul giorno italiano.
- Incassi con importo, data, metodo, riferimento e autore. Il saldo finale imposta `PAID`; la data è quella dell'ultimo incasso effettivo. Una rettifica motivata conserva il movimento e riapre il residuo. Non costituisce rimborso o nota di credito.
- Validazione server e blocco delle scritture per `VIEWER`. Transazioni con blocco della riga fattura, residuo ricontrollato e chiave univoca per ogni invio del modulo. Il retry identico non crea un secondo movimento.
- Calcoli decimali per prezzi, sconti, imposta e saldo. La valuta viene conservata dall'affare; prodotti appartenenti ad altre organizzazioni o in valuta diversa vengono rifiutati.
- Le bozze annullate rimangono archiviate e il loro progressivo resta riservato. I documenti inviati non possono essere eliminati o marcati pagati senza un movimento.
- Moduli accessibili, errori recuperabili e prova visiva su desktop e telefono.

L'XML preesistente inseriva automaticamente `RF01`, CAP `00000` e indirizzi sostitutivi; ometteva inoltre la natura delle operazioni ad aliquota zero. Il controllo sull'associazione fra aliquota zero e natura è esplicitato nella [documentazione ufficiale FatturaPA](https://www.fatturapa.gov.it/export/documenti/fatturapa/v1.3/Rappresentazione-tabellare-fattura-ordinaria.pdf). L'esportazione è ora bloccata con un messaggio esplicito; la UI indica che l'emissione deve essere completata nel proprio servizio di fatturazione. Non è stata realizzata un'integrazione SdI.

La migrazione `20260905120000_invoice_payments` aggiunge lo storico e conserva le fatture precedentemente pagate come saldi iniziali identificabili. Non è stata applicata. **Prima di avviare questa versione va eseguita su un database di prova**, con verifica dei dati preesistenti e della concorrenza tra connessioni PostgreSQL; dettagli in [INCASSI-RILASCIO.md](INCASSI-RILASCIO.md). I test automatici della revisione usano database simulato: non dimostrano l'effettiva concorrenza sul server PostgreSQL. Lo storico è protetto dai flussi applicativi, non è un registro fiscalmente certificato o immutabile.


## Inventario dei file modificati e nuovi

Inventario confrontato con `git diff --name-only` e `git ls-files --others --exclude-standard` al termine della sessione. **Modificato** indica un file già tracciato diverso da `HEAD`; **Nuovo** indica un file non ancora aggiunto a Git. Totale: **32 modificati + 32 nuovi = 64 file**. Le descrizioni riguardano gli interventi di questa sessione; non sono presenti cancellazioni di file nell'inventario.

Directory di lavoro: `C:/Users/Pcs Hp/Desktop/Pipeline/Pipely`. I collegamenti seguenti aprono i file di questa copia locale. Tutti i file dell'inventario, più `.gitignore` con l'esclusione di `backups/`, sono entrati nel commit `0b41120` del 5 settembre 2026; i documenti sono stati poi aggiornati con l'esito del rilascio in un commit successivo.

### Documentazione

| File | Stato | Intervento |
| --- | --- | --- |
| [README.md](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/README.md>) | Modificato | Istruzioni di sviluppo, verifiche, rilascio, nuova area incassi e limite dell'esportazione XML. |
| [docs/LAVORI_SVOLTI.md](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/docs/LAVORI_SVOLTI.md>) | Modificato | Riepilogo della sessione e collegamenti alla revisione corrente, mantenendo le note storiche. |
| [docs/REVISIONE-CRM-2026-09-05.md](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/docs/REVISIONE-CRM-2026-09-05.md>) | Nuovo | Stato del lavoro, risultati, limiti, priorità e inventario dei file. |
| [docs/INCASSI-RILASCIO.md](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/docs/INCASSI-RILASCIO.md>) | Nuovo | Trasferimento dei saldi, verifiche PostgreSQL, rilascio e tentativo bloccato dalla connessione. |

### Configurazione e strumenti

| File | Stato | Intervento |
| --- | --- | --- |
| [eslint.config.mjs](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/eslint.config.mjs>) | Modificato | Esclusioni mirate per codice generato e risultati dei test. |
| [next.config.ts](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/next.config.ts>) | Modificato | Opzioni Sentry aggiornate e rimozione della regola di cache ridondante sui chunk Next.js. |
| [package.json](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/package.json>) | Modificato | Aggiunto il comando `test:ui` per le prove browser isolate. |
| [playwright.ui.config.ts](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/playwright.ui.config.ts>) | Nuovo | Configurazione delle prove desktop/mobile, fuso italiano e server Vite isolato. |
| [vercel.json](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/vercel.json>) | Modificato | Rimosso il baseline automatico della migrazione iniziale e il suo errore ignorato. |

### Database

| File | Stato | Intervento |
| --- | --- | --- |
| [prisma/schema.prisma](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/prisma/schema.prisma>) | Modificato | Aggiunti `InvoicePayment`, saldo incassato della fattura, relazioni e indice per le scadenze. |
| [prisma/migrations/20260905120000_invoice_payments/migration.sql](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/prisma/migrations/20260905120000_invoice_payments/migration.sql>) | Nuovo | Migrazione transazionale e movimenti iniziali per fatture già pagate; non eseguita. |

### Dashboard

| File | Stato | Intervento |
| --- | --- | --- |
| [src/app/(dashboard)/dashboard/page.tsx](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/app/(dashboard)/dashboard/page.tsx>) | Modificato | Collegamento alla vista della giornata ed etichette/confronti KPI corretti. |
| [src/components/dashboard/DailyFocus.tsx](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/components/dashboard/DailyFocus.tsx>) | Nuovo | Vista delle attività in ritardo/di oggi e degli affari da ricontattare, con azioni operative. |
| [src/server/actions/daily-focus.ts](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/server/actions/daily-focus.ts>) | Nuovo | Query di attività e affari filtrate per organizzazione e assegnatario. |
| [src/server/actions/dashboard.ts](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/server/actions/dashboard.ts>) | Modificato | Corretto il confronto percentuale dei ricavi quando manca una base precedente. |
| [src/lib/italian-date.ts](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/lib/italian-date.ts>) | Nuovo | Confini del giorno italiano, compresi i cambi tra ora solare e legale. |

### Riferimenti e sessioni

| File | Stato | Intervento |
| --- | --- | --- |
| [src/lib/crm-references.ts](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/lib/crm-references.ts>) | Nuovo | Validazione centralizzata dei collegamenti CRM, anche dentro una transazione. |
| [src/lib/api-auth.ts](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/lib/api-auth.ts>) | Modificato | Verifica aggiuntiva della relazione fra fase e pipeline nelle API. |
| [src/lib/auth.ts](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/lib/auth.ts>) | Modificato | Aggiornamento di ruolo e organizzazione dalla lettura dell'utente durante la verifica JWT. |
| [src/app/api/v1/contacts/[id]/route.ts](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/app/api/v1/contacts/[id]/route.ts>) | Modificato | Controlli dei riferimenti nelle modifiche ai contatti. |
| [src/app/api/v1/deals/[id]/route.ts](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/app/api/v1/deals/[id]/route.ts>) | Modificato | Controlli dei riferimenti e coerenza delle date nelle transizioni degli affari. |

### Contatti, importazione e fusione

| File | Stato | Intervento |
| --- | --- | --- |
| [src/server/actions/contacts.ts](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/server/actions/contacts.ts>) | Modificato | Validazione, limiti e transazioni dell'importazione; collegamento alla fusione protetta. |
| [src/lib/contact-import.ts](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/lib/contact-import.ts>) | Nuovo | Parser CSV, schemi di validazione, normalizzazione e deduplicazione. |
| [src/lib/merge-contacts.ts](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/lib/merge-contacts.ts>) | Nuovo | Fusione transazionale con trasferimento delle relazioni e conservazione dei conflitti. |
| [src/components/contacts/ContactsTable.tsx](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/components/contacts/ContactsTable.tsx>) | Modificato | Aggiornamento dell'elenco dopo importazione/fusione e riapertura corretta del modulo. |
| [src/components/contacts/ImportCSVModal.tsx](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/components/contacts/ImportCSVModal.tsx>) | Modificato | CSV/Excel, intestazioni, limiti, validazione e gestione degli errori prima dell'importazione. |
| [src/components/contacts/MergeDuplicatesModal.tsx](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/components/contacts/MergeDuplicatesModal.tsx>) | Modificato | Fusione di gruppi con più di due contatti, scelte accessibili e protezione durante il salvataggio. |

### Attività e affari

| File | Stato | Intervento |
| --- | --- | --- |
| [src/server/actions/activities.ts](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/server/actions/activities.ts>) | Modificato | Validazione di date, durate e riferimenti, e aggiornamento delle viste interessate. |
| [src/lib/activity-dates.ts](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/lib/activity-dates.ts>) | Nuovo | Categorie temporali esclusive e conversione tra ISO e data/ora locale. |
| [src/components/activities/ActivitiesPageClient.tsx](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/components/activities/ActivitiesPageClient.tsx>) | Modificato | Stato condiviso fra lista e calendario. |
| [src/components/activities/ActivitiesTable.tsx](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/components/activities/ActivitiesTable.tsx>) | Modificato | Contatori e gruppi coerenti, completamento sincronizzato e regione elenco accessibile. |
| [src/components/activities/ActivityForm.tsx](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/components/activities/ActivityForm.tsx>) | Modificato | Etichette associate, date coerenti, durata cancellabile e scadenza obbligatoria per il ricontatto. |
| [src/components/shared/ActivityTimeline.tsx](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/components/shared/ActivityTimeline.tsx>) | Modificato | Conversione corretta degli orari durante le modifiche dalla cronologia. |
| [src/server/actions/deals.ts](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/server/actions/deals.ts>) | Modificato | Controlli di fase/pipeline, stato obsoleto, transizioni, operazioni collettive e riferimenti. |
| [src/components/pipeline/DealForm.tsx](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/components/pipeline/DealForm.tsx>) | Modificato | Rimozione esplicita del contatto e della data prevista quando si svuotano i campi. |

### Fatture e incassi

| File | Stato | Intervento |
| --- | --- | --- |
| [src/app/(dashboard)/invoices/page.tsx](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/app/(dashboard)/invoices/page.tsx>) | Nuovo | Pagina scadenzario con ricerca, filtri e paginazione lato server. |
| [src/app/(dashboard)/invoices/[id]/page.tsx](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/app/(dashboard)/invoices/[id]/page.tsx>) | Nuovo | Caricamento del dettaglio fattura e permessi delle azioni. |
| [src/components/invoices/InvoiceWorkspace.tsx](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/components/invoices/InvoiceWorkspace.tsx>) | Nuovo | Riepiloghi per valuta, elenco fatture, filtri e navigazione fra pagine. |
| [src/components/invoices/InvoiceDetailClient.tsx](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/components/invoices/InvoiceDetailClient.tsx>) | Nuovo | Dettaglio, registrazione incassi, rettifiche, storico e modifica della scadenza. |
| [src/components/invoices/CreateInvoiceModal.tsx](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/components/invoices/CreateInvoiceModal.tsx>) | Modificato | Creazione accessibile della bozza, scadenza suggerita e gestione degli errori; rimosso il download XML automatico. |
| [src/components/invoices/InvoiceButton.tsx](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/components/invoices/InvoiceButton.tsx>) | Modificato | Apertura del modulo bozza dall'affare con stato azzerato alla riapertura. |
| [src/components/invoices/InvoicesManager.tsx](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/components/invoices/InvoicesManager.tsx>) | Modificato | Accesso alla nuova area dalla precedente scheda nelle impostazioni. |
| [src/server/actions/invoices.ts](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/server/actions/invoices.ts>) | Modificato | Validazione, valuta e calcoli decimali; transizioni protette, dettaglio incassi e blocco dell'XML incompleto. |
| [src/server/actions/invoice-workspace.ts](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/server/actions/invoice-workspace.ts>) | Nuovo | Incassi idempotenti, rettifiche, scadenze, paginazione e riepiloghi per valuta. |
| [src/lib/invoice-utils.ts](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/lib/invoice-utils.ts>) | Nuovo | Schemi, date italiane, termini di pagamento e formattazione monetaria. |
| [src/lib/invoice-payments.ts](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/lib/invoice-payments.ts>) | Nuovo | Blocco della riga fattura e ricalcolo del saldo dai movimenti non annullati. |

### Navigazione e accessibilità

| File | Stato | Intervento |
| --- | --- | --- |
| [src/app/layout.tsx](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/app/layout.tsx>) | Modificato | Rimosso il limite allo zoom sui dispositivi mobili. |
| [src/components/shared/Sidebar.tsx](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/components/shared/Sidebar.tsx>) | Modificato | Voce di menu per fatture e incassi. |
| [src/i18n/it.json](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/i18n/it.json>) | Modificato | Etichetta italiana della nuova voce di navigazione. |
| [src/i18n/en.json](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/src/i18n/en.json>) | Modificato | Etichetta inglese della nuova voce di navigazione. |

### Test unitari aggiunti

| File | Stato | Intervento |
| --- | --- | --- |
| [tests/unit/activity-dates.test.ts](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/tests/unit/activity-dates.test.ts>) | Nuovo | Categorie delle attività e conversioni temporali. |
| [tests/unit/contact-import.test.ts](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/tests/unit/contact-import.test.ts>) | Nuovo | Parser, validazione, normalizzazione e casi limite dell'importazione. |
| [tests/unit/contact-merge.test.ts](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/tests/unit/contact-merge.test.ts>) | Nuovo | Conservazione delle informazioni e relazioni durante la fusione. |
| [tests/unit/crm-actions.test.ts](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/tests/unit/crm-actions.test.ts>) | Nuovo | Riferimenti, transizioni, importazione e query delle azioni CRM. |
| [tests/unit/crm-api.test.ts](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/tests/unit/crm-api.test.ts>) | Nuovo | Isolamento dei riferimenti e comportamento delle API modificate. |
| [tests/unit/invoices.test.ts](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/tests/unit/invoices.test.ts>) | Nuovo | 23 prove su importi, date, permessi, idempotenza, residui, rettifiche, riepiloghi e creazione fatture. |

### Test browser aggiunti

| File | Stato | Intervento |
| --- | --- | --- |
| [tests/ui/crm.spec.ts](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/tests/ui/crm.spec.ts>) | Nuovo | Cinque percorsi CRM eseguiti sia su desktop sia su mobile. |
| [tests/ui/invoices.spec.ts](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/tests/ui/invoices.spec.ts>) | Nuovo | Cinque percorsi per incassi, rettifiche, errori, permessi, scadenzario e creazione bozza, su due dispositivi. |
| [tests/ui/server.mjs](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/tests/ui/server.mjs>) | Nuovo | Server Vite con azioni server e navigazione sostituite da simulazioni. |
| [tests/ui/fixture/index.html](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/tests/ui/fixture/index.html>) | Nuovo | Documento iniziale dell'applicazione di prova. |
| [tests/ui/fixture/main.tsx](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/tests/ui/fixture/main.tsx>) | Nuovo | Composizione dei componenti reali nei diversi scenari di prova. |
| [tests/ui/fixture/actions.ts](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/tests/ui/fixture/actions.ts>) | Nuovo | Dati dimostrativi e azioni simulate, senza accesso al database. |
| [tests/ui/fixture/navigation.ts](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/tests/ui/fixture/navigation.ts>) | Nuovo | Navigazione e aggiornamento simulati per le prove UI. |
| [tests/ui/fixture/Link.tsx](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/tests/ui/fixture/Link.tsx>) | Nuovo | Adattamento dei collegamenti Next.js nell'ambiente Vite. |

### Materiale generato o consultato, escluso dai 64 file

- `src/generated/prisma/`: client rigenerato localmente e ignorato da Git; non sostituisce l'applicazione della migrazione.
- `.next/` e file incrementali TypeScript: prodotti dai controlli di compilazione, ignorati da Git.
- `test-results/`: risultati e screenshot delle prove UI con dati dimostrativi, ignorati da Git; vengono rigenerati dalle esecuzioni successive.
- `.env.local`: controllata soltanto la disponibilità delle variabili necessarie, senza riportarne segreti; **nessuna modifica**. Le connessioni risultavano vuote.
- `prisma.config.ts`, `AGENTS.md`, `.env.example` e `.vercel/project.json`: consultati, non modificati. Il collegamento locale al progetto Vercel non equivale a un accesso autenticato.
- `tests/unit/mock-ai.test.ts` e `tests/unit/reporting.test.ts`: test preesistenti eseguiti nella suite da 94 prove, non modificati.

## Punto da cui riprendere

Migrazione, collaudo e rilascio sono completati il 5 settembre 2026; la procedura e le verifiche sono in [INCASSI-RILASCIO.md](<C:/Users/Pcs Hp/Desktop/Pipeline/Pipely/docs/INCASSI-RILASCIO.md>). Ripartire dalle voci ancora aperte: prova degli incassi in produzione con la prima fattura reale, poi le priorità di prodotto indicate sopra.
