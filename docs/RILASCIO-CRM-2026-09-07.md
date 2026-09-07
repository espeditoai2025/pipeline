# Rilascio Pipely — 7 settembre 2026

Autorizzato dall’utente dopo le correzioni dell’audit, con richiesta di riprovare Docker dopo la sua chiusura per errore.

## Preparazione verificata

- Accesso GitHub e Vercel disponibile; branch `main` e remoto allineati a `ba67b0e` prima del rilascio. Progetto Vercel `pipeline`, dominio `pipely.it`.
- Produzione: 13 organizzazioni, un workflow disattivato, nessuna esecuzione o coda, nessun SMTP e nessun abbonamento Stripe collegato. Le variabili Vercel per cron, Resend e Stripe sono presenti: la presenza non certifica il valore o il funzionamento del provider.
- Otto migrazioni pregresse completate, checksum coerenti con i file locali (normalizzando soltanto LF/CRLF), nessuna migrazione fallita irrisolta.
- Docker riavviato correttamente. Backup `backups/pipely-prod-20260907-pre-workflow.dump`, 137.116 byte, SHA-256 `5683a5a53e97492dbf5799163ed7de86d3bc00957155aebb12b6d59afc1e0a26`. Contiene lo schema `public` del CRM, dati e storico Prisma: 44 tabelle e 44 sezioni dati. Non include gli schemi gestiti internamente da Supabase. Cartella ignorata da Git.
- Connessione al database reale con CA verificata e `sslmode=verify-full`; nessuna credenziale stampata o aggiunta al repository.
- Archivio verificato con `pg_restore --list`, poi ripristinato completamente nel database `pipely_restore` del container locale `pipely-release-review-20260907`. Nuova migrazione applicata sulla copia in transazione: tutti i 44 conteggi invariati e cinque nuove colonne chiave della coda presenti.
- Ripetute tutte le 27 prove di integrazione su PostgreSQL 17 reale con un pool di otto connessioni e database di fixture distinto dalla copia. Tutte superate, inclusi doppio worker, quote concorrenti, checkpoint, rollback, API, report e Stripe simulato. Risultato: [RILASCIO-2026-09-07-postgres-tests.json](RILASCIO-2026-09-07-postgres-tests.json).

La suite continua a usare PGlite per default. L’opzione `PIPELY_TEST_DATABASE_URL` accetta esclusivamente `127.0.0.1` e il database dedicato `pipely_review_fixture`, senza leggere `DATABASE_URL` o `.env.local`. Il database deve essere nuovo e vuoto. Le prove concorrenti non costituiscono un test di carico.

## Rilascio completato e prove in produzione

- Commit applicativo `343db83b992df85ac032b959fc0c97cc12029f99`, pubblicato su `main`. Deploy `dpl_uKd978rZRj3dgTbBCsE3KFkSqjmv` READY e assegnato a pipely.it/www.pipely.it.
- Log Vercel: nona migrazione `20260907090000_workflow_reliability` applicata fra 09:38:02 e 09:38:03 UTC; tutte le migrazioni completate. Build e TypeScript superati.
- Home canonica https://www.pipely.it/ e login: HTTP 200; nuova CTA Pro presente. Automazioni e billing senza sessione: redirect al login. Cron senza credenziale: HTTP 401.
- Cron abilitato sul deploy corretto con frequenza di 5 minuti. Chiamate reali HTTP 200 alle 09:40 e 09:45 UTC; nessun errore di runtime rilevato nella finestra 09:39–09:49 UTC. Evidenza in [RILASCIO-2026-09-07-vercel.json](RILASCIO-2026-09-07-vercel.json).
- Creata un’organizzazione temporanea, distinta dai clienti, con un contatto e un lead di prova. Gli eventi sono stati accodati tramite il produttore applicativo; nessun worker è stato avviato dal locale. Il cron Vercel delle 09:45 ha completato due job: un’attività, una notifica interna e un invio email. Entrambi SUCCESS, due esecuzioni, nessun errore, nessun duplicato osservato.
- Resend ha accettato l’email destinata a `delivered+pipely-release-20260907@resend.dev`, registrata SENT nello storico. È l’indirizzo ufficiale per simulare la consegna, non una casella cliente: [documentazione Resend](https://resend.com/docs/knowledge-base/what-email-addresses-to-use-for-testing). Questo prova il collegamento reale fra worker e provider; non certifica il recapito nella casella personale dell’utente. Evidenza in [RILASCIO-2026-09-07-smoke.json](RILASCIO-2026-09-07-smoke.json).
- Rimossi tutti i dati della fixture, compresa l’email, che nel modello corrente non ha una cancellazione a cascata dall’organizzazione. Controllo delle 09:52 UTC: tutti i conteggi delle tabelle CRM coincidono col backup; soltanto `_prisma_migrations` passa da 8 a 9. Rimangono il workflow originario disattivato e zero job in coda.
- Container di collaudo fermato e rimosso con il suo volume temporaneo. Backup verificato conservato; Docker lasciato disponibile. Nessuna modifica ai container preesistenti e nessun pagamento reale.

## Verifiche ancora da completare

- Consegna a una casella personale: destinatario richiesto all’utente. Il test Resend sopra usa la simulazione ufficiale del provider.
- SMTP personalizzato: nessuna configurazione presente nel CRM; servono account e configurazione verificata prima del collaudo.
- Stripe: variabili presenti e regressioni applicative superate con servizio simulato; restano verifica del prezzo remoto e ciclo completo in modalità test. Nessun checkout pagato o addebito reale eseguito.
- Carico rappresentativo, capacità dei worker, conservazione dei log e monitoraggio continuativo della coda. Le prove concorrenti con otto connessioni sono state completate e non sono più pendenti.

## File della fase di rilascio

- `scripts/release-backup.mjs`: backup esplicito di sola lettura, checksum delle migrazioni, inventario e confronto finale.
- `scripts/release-workflow-smoke.ts`: fixture con identità fissa, destinatario Resend limitato alla casella di test, lettura degli esiti e pulizia vincolata alla sola fixture conclusa.
- `tests/integration/database.ts`: collaudo opzionale su database locale dedicato con otto connessioni.
- I tre JSON RILASCIO di questa data, questo rapporto e gli indici di revisione/lavori svolti.

Dettaglio delle correzioni e dei 92 file originari: [CORREZIONI-CRM-2026-09-07.md](CORREZIONI-CRM-2026-09-07.md).
