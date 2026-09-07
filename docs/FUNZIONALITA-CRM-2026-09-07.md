# Pipely — note vocali, comandi, fatturazione e dati aziendali

**Data: 7 settembre 2026. Stato: implementazione locale; rilascio e attivazione Fatture in Cloud da eseguire.**

Questa sessione segue il rilascio documentato in [RILASCIO-CRM-2026-09-07.md](RILASCIO-CRM-2026-09-07.md). Parte dal commit `431e3560819a6d200d7d3d42ef205905e62eb4d8`. Le nuove modifiche non sono state committate, pubblicate o applicate al database di produzione. La migrazione è stata provata su PostgreSQL 17 temporaneo in Docker; relazioni e indici sono stati confrontati con la SQL canonica Prisma. Il container e i suoi volumi di prova sono stati rimossi a collaudo concluso. Nessun dato CRM reale è stato modificato e nessuna fattura è stata inviata.

## Funzioni implementate

### Note vocali e comandi

- Nuova area `/voice`, voce nel menu e collegamento dalle note di affari e contatti, con destinatario preselezionato e verificato nell’organizzazione.
- Registrazione dal microfono del browser, arresto, ascolto prima del salvataggio e archivio condiviso dell’organizzazione. Microfono fermato quando si interrompe la registrazione o si lascia la pagina. Corrette le intestazioni che prima vietavano il microfono; consentita la riproduzione dell’anteprima `blob:`.
- Audio conservato nel database, lettura tramite sessione e appartenenza correnti, senza URL pubblico e senza cache condivisa. Titolo, testo modificabile, collegamento a contatto/affare e cancellazione con conferma. Modifica e cancellazione riservate all’autore o agli amministratori con permesso di scrittura.
- Trascrizione su richiesta tramite OpenRouter. L’audio rimane disponibile se il servizio fallisce; una trascrizione già presente non viene pagata nuovamente. Prenotazione della quota e blocco delle elaborazioni simultanee.
- Comandi in italiano, anche dal testo trascritto: aggiungere note, pianificare attività, cambiare stato, valore o fase di **un affare/contatto selezionato esplicitamente**. Date interpretate in Europe/Rome, con controllo delle ore impossibili nel cambio ora legale.
- Anteprima salvata sul server, valida 10 minuti; esecuzione solo dopo conferma. Schema ristretto, massimo cinque operazioni, destinatario limitato all’organizzazione, ricontrollo di piano e ruolo, rifiuto se il record è cambiato. Le azioni sono atomiche e la stessa conferma ripetuta non duplica le modifiche. Le modifiche agli affari alimentano le automazioni esistenti; l’anteprima lo dichiara.
- Corretto nel gestore transazionale comune il riconoscimento dei conflitti PostgreSQL delle query raw: il driver Prisma può restituire `P2010` con SQLSTATE `40001`/`40P01`, oltre a `P2034`. Il difetto è stato riprodotto con due conferme concorrenti su Docker e poi verificato risolto.

La registrazione resta nel browser finché non viene salvata. Trascrizioni e interpretazioni usano un servizio AI esterno, dichiarato nell’interfaccia. “Crea attività email” crea un’attività da svolgere; non invia direttamente un messaggio. Le automazioni già configurate possono invece produrre i propri effetti dopo una modifica confermata.

### Compilazione aziendale senza API esterne

Nel modulo azienda, “Compila dai tuoi dati” estrae campi da testo incollato direttamente nel browser oppure cerca nelle aziende della stessa organizzazione. Suggerisce soltanto dati trovati, segnala ambiguità e controlla formalmente la partita IVA italiana. Mostra l’origine e una selezione dei campi; quelli già compilati sono esclusi per impostazione iniziale e richiedono selezione esplicita per essere sostituiti. Applicare il suggerimento non salva automaticamente l’azienda.

Non vengono usati servizi esterni, registri, scraping o AI per questa funzione. Una partita IVA da sola **non permette di recuperare la ragione sociale** senza una fonte di dati già disponibile. Il controllo del checksum non certifica esistenza, titolarità o validità fiscale. Non sono inclusi estrazione da PDF/immagini, OCR, PEC/SDI da registri o arricchimento di fatturato/ATECO.

### Fatture in Cloud

- OAuth di Pipely, verifica dello stato e della sessione, token cifrati per organizzazione e rinnovo serializzato. Gestione del collegamento riservata a proprietari e amministratori.
- Selezione dell’azienda autorizzata con corrispondenza della partita IVA emittente. Protezione dai cambi di azienda e dalla sostituzione del collegamento durante creazioni/invii in corso.
- Da una bozza senza incassi: dati fiscali integrativi, aliquote del gestionale, confronto di imponibile/IVA/totale e anteprima. Il metodo di pagamento iniziale viene ripreso dalla fattura quando riconosciuto.
- Creazione su conferma; riferimento stabile Pipely e numero fiscale restituito dal gestionale. Invio allo SdI con conferma separata, verifica dell’XML e ricontrollo di destinatario, importi, valuta e stato.
- Operazioni esterne con esito incerto congelate, lettura e riconciliazione esplicita; nessun tentativo automatico che possa duplicare una fattura o un invio. Le fatture collegate non possono essere cancellate, marcate inviate manualmente o avere la scadenza modificata solo in Pipely.

**L’app OAuth non è ancora stata creata dall’utente.** Configurazione e procedura in [FATTURE-IN-CLOUD.md](FATTURE-IN-CLOUD.md). Le API Fatture in Cloud sono state collaudate con risposte simulate basate sulla documentazione ufficiale: manca il collaudo con il fornitore reale. Non è corretto presentare il connettore come già attivo sul sito.

## Piani e limiti

Limiti condivisi per organizzazione, verificati anche sul server:

| Funzione | Starter | Pro / Enterprise |
| --- | --- | --- |
| Compilazione dai dati locali | Sì | Sì |
| Note vocali conservate | 10 | 100 |
| Lunghezza registrazione nel browser | 120 secondi | 120 secondi |
| Dimensione audio per nota | 3 MiB | 3 MiB |
| Spazio audio totale | 50 MiB | 50 MiB |
| Trascrizione e interpretazione AI | No | 50 elaborazioni al giorno complessive |
| Fatture in Cloud | No | Sì, dopo attivazione e account compatibile |

La quota AI usa il giorno italiano e include i tentativi falliti. L’interfaccia esprime MiB come MB per semplicità. Il server controlla byte effettivi, firma del formato, durata dichiarata e quote; la durata reale non è analizzata da un decoder sul server. L’arresto a 120 secondi è applicato dal registratore. Dopo un downgrade i dati già salvati rimangono leggibili, ma nuove operazioni sono soggette al piano corrente. Un utente Viewer non acquisisce permessi di scrittura grazie al piano.

Aggiornati gli elenchi condivisi delle caratteristiche dei piani. La prima versione fiscale è dichiarata limitata alle fatture ordinarie italiane in EUR con IVA positiva, senza casse, rivalse, ritenute, bollo o split payment. Non copre ancora il caso forfettario, rilevante per la clientela scelta.

## Verifiche

| Prova | Esito |
| --- | --- |
| Test unitari | 169 superati |
| Integrazione su PostgreSQL 17 in Docker, pool di 8 connessioni | 46 superati: 27 regressioni CRM + 19 nuove funzioni |
| Interfaccia isolata desktop e mobile | 40 superati; ripetute le prove interessate dagli ultimi ritocchi |
| TypeScript, ESLint, validazione Prisma | Superati; lint senza errori o avvisi |
| Build Next.js | Completata, comprese le nuove pagine e API |
| Trascrizione effettiva tramite OpenRouter | Superata con audio sintetico italiano, senza dati personali |
| OAuth / creazione / invio su Fatture in Cloud reale | Non eseguiti: app e credenziali mancanti |
| Pubblicazione e migrazione di produzione | Non eseguite in questa sessione |

La prova reale di trascrizione ha restituito **“Richiama il cliente domani alle 10.00.”** dall’audio sintetico **“Richiama il cliente domani alle dieci.”** (134.504 byte), usando `openai/whisper-large-v3`. Evidenza in [FUNZIONALITA-2026-09-07-trascrizione.json](FUNZIONALITA-2026-09-07-trascrizione.json). L’interpretazione dei comandi nei test usa risposte AI simulate; la transazione CRM e il database sono reali nel collaudo Docker. L’accuratezza linguistica dei comandi reali va misurata prima di promettere comprensione generale.

Le prove UI usano componenti reali con backend simulato; il microfono del browser è un dispositivo di prova. Sono state osservate schermate desktop/mobile; Safari/iOS e microfono fisico restano da collaudare. Il primo comando Playwright ha richiesto la chiusura del proprio server Vite rimasto aperto nelle restrizioni Windows: tutti i 40 casi erano già riusciti e il processo è uscito con codice 0. La successiva esecuzione con permessi adeguati ha chiuso automaticamente i propri processi.

Comandi di verifica:

```text
npm run test:unit
npm run test:integration
npm run test:ui
npm run lint
npx tsc --noEmit
npx prisma validate
npm run build
```

Per Docker, `PIPELY_TEST_DATABASE_URL` deve puntare soltanto a `127.0.0.1` e al database `pipely_review_fixture`: la suite rifiuta altri indirizzi e non carica `.env.local`. Eseguire separatamente i due file di integrazione su database temporanei vuoti, perché ognuno applica tutte le migrazioni. Non usare il database del CRM.

## Da fare

1. Creare l’app OAuth di Pipely, configurare i segreti server e collaudare collegamento, rinnovo e documenti nel sistema del fornitore; richiedere poi l’abilitazione pubblica.
2. Rilasciare il codice e applicare la decima migrazione secondo il processo di backup e rilascio già usato. Questa fase non è stata eseguita.
3. Estendere il modello fiscale per forfettari, natura IVA, bollo, casse e ritenute prima di offrire la fatturazione a tutti i liberi professionisti. Seguono PA, estero, note di credito, incassi e sincronizzazione delle variazioni effettuate nel gestionale.
4. Collaudare microfono fisico, Safari/iOS, accenti, rumore, date relative e comandi reali; monitorare costo e tasso di errore prima di ampliare le quote.
5. Definire conservazione/pulizia di anteprime e contatori AI, gestione delle note dopo eliminazione/fusione dei record collegati e crescita dello spazio audio. Gli ID del collegamento vocale sono validati nell’applicazione ma non hanno ancora relazioni FK verso contatti/affari.
6. Se si vuole completare da sola partita IVA senza chiamate esterne, procurare e mantenere un dataset locale autorizzato. I suggerimenti attuali riutilizzano esclusivamente testo e dati già presenti.

Restano validi anche i punti aperti del precedente rilascio: SMTP personale, recapito su casella dell’utente e collaudo Stripe in modalità test.

## Inventario dei file

Elenco generato dal confronto con il commit iniziale della sessione. Non comprende output temporanei, client Prisma generato o segreti.

| Stato | File |
| --- | --- |
| Nuovo | `docs/FATTURE-IN-CLOUD.md` |
| Nuovo | `docs/FUNZIONALITA-2026-09-07-trascrizione.json` |
| Nuovo | `docs/FUNZIONALITA-CRM-2026-09-07.md` |
| Modificato | `docs/LAVORI_SVOLTI.md` |
| Modificato | `next.config.ts` |
| Nuovo | `prisma/migrations/20260907120000_voice_and_invoicing/migration.sql` |
| Modificato | `prisma/schema.prisma` |
| Nuovo | `scripts/check-voice-transcription.ts` |
| Nuovo | `src/app/(dashboard)/settings/invoicing/page.tsx` |
| Modificato | `src/app/(dashboard)/settings/page.tsx` |
| Nuovo | `src/app/(dashboard)/voice/page.tsx` |
| Nuovo | `src/app/api/integrations/fatture-in-cloud/callback/route.ts` |
| Nuovo | `src/app/api/integrations/fatture-in-cloud/connect/route.ts` |
| Nuovo | `src/app/api/voice/[id]/route.ts` |
| Nuovo | `src/app/api/voice/[id]/transcribe/route.ts` |
| Nuovo | `src/app/api/voice/route.ts` |
| Nuovo | `src/components/companies/CompanyAutofill.tsx` |
| Modificato | `src/components/companies/CompanyForm.tsx` |
| Modificato | `src/components/contacts/ContactNotePanel.tsx` |
| Nuovo | `src/components/invoices/InvoiceCloudPanel.tsx` |
| Modificato | `src/components/invoices/InvoiceDetailClient.tsx` |
| Modificato | `src/components/pipeline/DealNotePanel.tsx` |
| Nuovo | `src/components/settings/InvoicingSettings.tsx` |
| Modificato | `src/components/shared/Sidebar.tsx` |
| Nuovo | `src/components/voice/VoiceWorkspace.tsx` |
| Modificato | `src/i18n/en.json` |
| Modificato | `src/i18n/it.json` |
| Nuovo | `src/lib/company-autofill.ts` |
| Nuovo | `src/lib/crm-command-schema.ts` |
| Modificato | `src/lib/crm-transaction.ts` |
| Nuovo | `src/lib/fatture-in-cloud.ts` |
| Nuovo | `src/lib/feature-access.ts` |
| Nuovo | `src/lib/integration-crypto.ts` |
| Nuovo | `src/lib/invoicing-schema.ts` |
| Modificato | `src/lib/plan-client.ts` |
| Modificato | `src/lib/plan.ts` |
| Nuovo | `src/lib/voice-ai.ts` |
| Nuovo | `src/lib/voice.ts` |
| Nuovo | `src/server/actions/company-autofill.ts` |
| Nuovo | `src/server/actions/crm-commands.ts` |
| Modificato | `src/server/actions/invoice-workspace.ts` |
| Modificato | `src/server/actions/invoices.ts` |
| Nuovo | `src/server/actions/invoicing.ts` |
| Nuovo | `src/server/actions/voice.ts` |
| Nuovo | `tests/integration/voice-invoicing.test.ts` |
| Modificato | `tests/ui/fixture/actions.ts` |
| Modificato | `tests/ui/fixture/main.tsx` |
| Nuovo | `tests/ui/voice-invoicing.spec.ts` |
| Nuovo | `tests/unit/company-voice.test.ts` |
| Nuovo | `tests/unit/crm-transaction.test.ts` |
| Modificato | `tests/unit/invoices.test.ts` |

Totale: 51 file (19 modificati, 32 nuovi).
