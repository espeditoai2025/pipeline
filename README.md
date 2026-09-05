# Pipely

CRM italiano basato su Next.js 16, React 19 e PostgreSQL/Prisma 7. Comprende contatti, aziende, affari, attività, preventivi, scadenzario e incassi, email e automazioni.

## Sviluppo

1. Installa le dipendenze con `npm ci`.
2. Prepara `.env.local` usando `.env.example` e un database dedicato allo sviluppo. `DATABASE_URL` serve all'applicazione; `DIRECT_URL` alle migrazioni. I servizi esterni richiedono le rispettive credenziali.
3. Genera il client con `npm run db:generate`.
4. Su un database di sviluppo nuovo applica lo storico con `npx prisma migrate deploy`.
5. Avvia `npm run dev` e apri [localhost:3000](http://localhost:3000).

Le pagine del CRM richiedono un account e un'organizzazione. `npm run db:seed` è riservato a un database di prova: modifica i dati.

Prima di modificare Next.js leggi `AGENTS.md` e le guide locali in `node_modules/next/dist/docs/`.

## Verifiche

```sh
npm run test:unit
npm run test:ui
npm run lint
npx tsc --noEmit
npm run build
```

`test:unit` verifica parser, date, regole e azioni server con database simulato. `test:ui` usa componenti reali, dati dimostrativi e azioni simulate; avvia autonomamente un server Vite su `127.0.0.1:4174` e Chromium su desktop e mobile. Non carica autenticazione, database o integrazioni del CRM. Se manca il browser, installalo con `npx playwright install chromium`.

`test:e2e` è una suite separata che usa il CRM su porta 3000 e credenziali di test: eseguirla soltanto con ambiente e database di prova. Non è equivalente alla suite UI isolata.

La build genera Prisma e compila Next.js; non applica migrazioni. Il primo download dei font richiede accesso a Google Fonts.

## Rilascio e database esistenti

Vercel esegue `prisma migrate deploy` e poi la build. Non marca automaticamente una migrazione come già applicata e non ignora gli errori delle migrazioni.

Se un database esistente non ha ancora uno storico Prisma, confronta prima il suo schema con `prisma/migrations/0_init/migration.sql`, conserva un backup verificato e registra il baseline soltanto dopo aver confermato la corrispondenza. Un database vuoto deve eseguire la migrazione iniziale, non saltarla.

Configura `DATABASE_CA_CERT` con la CA del provider per la verifica del certificato TLS. Il comportamento attuale di `src/lib/db.ts`, in assenza della CA, cifra la connessione ma non verifica il certificato.

## Revisione del prodotto

L'area **Fatture e incassi** si trova nel menu, su `/invoices`. Dall'affare si crea una bozza; dopo l'emissione nel servizio di fatturazione la si segna come inviata. Gli incassi possono essere parziali, con data, metodo e riferimento; una rettifica conserva il movimento e ricalcola il residuo. Ricerca e filtri sono paginati lato server. I totali restano separati per valuta.

Questa versione richiede la migrazione `20260905120000_invoice_payments` prima di essere avviata sul database. Non usare `db push` per sostituirla: la migrazione trasferisce i vecchi stati pagati in movimenti di saldo iniziale. È preparata nel repository, **non applicata ai dati reali durante la revisione**. Vedi [procedura di verifica e rilascio degli incassi](docs/INCASSI-RILASCIO.md).

L'esportazione XML precedente è disabilitata perché inseriva dati fiscali fittizi. Non sono implementati emissione, invio SdI o conservazione: servono dati fiscali completi, validazione e integrazione con un provider.

Vedi [revisione del 5 settembre 2026](docs/REVISIONE-CRM-2026-09-05.md) per correzioni, nuova vista operativa, copertura dei test e priorità per liberi professionisti e microimprese.
