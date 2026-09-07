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

## Stato del rilascio

Commit, push, migrazione e verifica del deploy: in corso. Nessun workflow operativo è stato attivato e nessun pagamento reale è stato effettuato.

## Verifiche successive richieste

- Confermare deploy READY, migrazione completata e conteggi del database preservati.
- Confermare nuova definizione cron `/api/cron/workflows` ogni 5 minuti e almeno un’esecuzione reale senza errori; verificare che richieste senza autenticazione vengano rifiutate.
- Verificare home pubblicata, login e protezione delle pagine riservate.
- Distinguere la verifica del worker vuoto dalla prova completa di consegna: SMTP non è configurato nel CRM. Per SMTP e un ciclo di pagamento servono recapiti/configurazioni di prova e Stripe in modalità test; non vanno eseguiti addebiti reali per collaudare il rilascio.

Dettaglio delle correzioni e verifiche precedenti: [CORREZIONI-CRM-2026-09-07.md](CORREZIONI-CRM-2026-09-07.md).
