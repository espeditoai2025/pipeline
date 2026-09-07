# Rilascio e completamento note vocali — 7 settembre 2026

Autorizzazione dell’utente: «pubblica e poi continua».

## Prima pubblicazione completata

- Commit applicativo `2ee140c`, seguito da `d2db6f5` per il ripristino di collaudo. Push su `main` completato.
- Deploy Vercel `dpl_E8X2NRodL1NEbdMfMmtuRTUTp8CT` **READY**, URL `https://pipeline-2okgc6k52-espeditoai2025-1690s-projects.vercel.app`, assegnato a `www.pipely.it` e `pipely.it`.
- Migrazione `20260907120000_voice_and_invoicing` applicata: dieci migrazioni completate, nessun errore irrisolto, checksum verificati. Conteggi delle tabelle CRM invariati; soltanto lo storico Prisma passa da 9 a 10.
- Home e login HTTP 200; `/voice`, `/settings/invoicing` e audio privato senza sessione reindirizzano al login. Cron senza credenziale HTTP 401. In produzione presenti le caratteristiche vocali e l’intestazione `microphone=(self)`.
- Fatture in Cloud è indicato **in attivazione** nei piani; il collegamento resta disabilitato finché non vengono configurate le credenziali OAuth. Non sono state create o inviate fatture reali.

Backup: `backups/pipely-prod-20260907-pre-voice-invoicing-v2.dump`, 139.580 byte, SHA-256 `08e72969b73b1963547fe7e000a54679c471829955c377cc1dbf593d7e7004b5`. Tutte le 44 tabelle e sezioni dati ripristinate in PostgreSQL 17 temporaneo; dopo la migrazione 49 tabelle, conteggi originali preservati. Primo tentativo oltre il timeout originario; secondo completato con indirizzo IPv4 risolto esplicitamente, TLS verificato e timeout di connessione. Il limite di durata del processo di backup è stato portato a dieci minuti per consentire l’estrazione dei metadati. Archivi conservati in cartella ignorata da Git; container temporanei rimossi.

## Prosecuzione implementata dopo il rilascio

- **Rinomina e ricollegamento delle note salvate**, conservando audio e trascrizione. Destinatario esplicito, controllo dei permessi attuali e dell’organizzazione anche sul server; l’autore o un amministratore può modificare la nota.
- **Unione dei contatti:** le note vocali del duplicato passano al contatto principale nella stessa transazione degli altri dati.
- **Eliminazione dei record:** nuove chiavi esterne con `SET NULL` mantengono la registrazione e rimuovono il collegamento. Gli affari eliminati logicamente non sono più proposti come destinatari dei comandi.
- La migrazione `20260907140000_voice_note_relations` scollega eventuali riferimenti già orfani o di altre organizzazioni, preservando le registrazioni, poi aggiunge chiavi esterne e indici. La validazione applicativa continua a impedire collegamenti fra organizzazioni.
- **Destinatario dei comandi:** utilizzare una nota senza collegamento azzera la selezione precedente; serve scegliere esplicitamente un record prima dell’anteprima.
- Estratto il prompt dei comandi in un modulo condiviso: il collaudo reale usa lo stesso prompt dell’applicazione, con data di riferimento riproducibile.

## Collaudo reale AI

**6 esempi su 6 superati** con `google/gemini-3.8-flash`: creazione nota, attività per domani alle dieci, stato vinto e importo italiano `1.250`, cambio di fase, rifiuto di un’eliminazione di massa, rifiuto di un comando per un destinatario diverso dal selezionato. Sono stati inviati soltanto esempi fittizi; il test non legge o modifica il database CRM.

Evidenza completa: [COMANDI-AI-2026-09-07.json](COMANDI-AI-2026-09-07.json). È un collaudo limitato, non una misura dell’accuratezza su tutti i comandi possibili. Restano da provare accenti, rumore, microfoni fisici, Safari/iOS e casi linguistici più vari. La trascrizione era già stata collaudata realmente nella sessione precedente.

## Verifiche del completamento

- 169 test unitari superati; TypeScript e lint completati.
- 50 casi di integrazione verificati: 27 regressioni CRM e 23 vocali/fatturazione. I 23 casi sono superati anche su PostgreSQL 17 con otto connessioni. Il test che provoca intenzionalmente una violazione FK ora la esegue in transazione, così il database PGlite resta utilizzabile dal caso successivo.
- 44 casi UI verificati su desktop e mobile. Corretto il nome accessibile del selettore di collegamento; ripetuti con esito positivo tutti i 16 casi delle nuove funzionalità dopo la correzione.
- Build locale finale completata. Seconda pubblicazione: in completamento.

Secondo backup: `backups/pipely-prod-20260907-pre-voice-integrity.dump`, 150.467 byte, SHA-256 `e8123490534949fe2d88be5f3de2344877bbbe020b2c2c0b015bdb28a2e395f8`, con tutte le 49 tabelle e dieci migrazioni. Il rapporto di ripristino è conservato accanto all’archivio.

## Passi ancora aperti

1. Creare l’app OAuth di Pipely e completare configurazione e collaudo reale Fatture in Cloud: [guida di attivazione](FATTURE-IN-CLOUD.md). Per distribuirla ai clienti occorre la procedura di abilitazione pubblica del fornitore.
2. Estendere la fatturazione a forfettari, natura IVA, bollo, casse e ritenute; poi PA, estero, note di credito e sincronizzazione di incassi e modifiche dal gestionale. L’attuale connettore mantiene espliciti i propri limiti.
3. Definire conservazione e pulizia dei metadati AI, misurare costi e capacità e completare le prove sui dispositivi. La conservazione dell’audio durante fusioni/eliminazioni è ora implementata.
4. Per arricchimento da sola partita IVA senza chiamate esterne serve una fonte locale autorizzata e aggiornata. L’autocompilazione attuale resta limitata ai dati già disponibili.

Restano inoltre i collaudi SMTP personale e Stripe in modalità test del precedente rilascio.

## File della prosecuzione

- `docs/COMANDI-AI-2026-09-07.json`
- `prisma/migrations/20260907140000_voice_note_relations/migration.sql`
- `prisma/schema.prisma`
- `scripts/check-crm-commands.ts`
- `src/components/voice/VoiceWorkspace.tsx`
- `src/lib/crm-command-prompt.ts`
- `src/lib/merge-contacts.ts`
- `src/lib/voice.ts`
- `src/server/actions/crm-commands.ts`
- `src/server/actions/voice.ts`
- `tests/integration/voice-invoicing.test.ts`
- `tests/ui/fixture/actions.ts`
- `tests/ui/fixture/main.tsx`
- `tests/ui/voice-invoicing.spec.ts`
- `tests/unit/contact-merge.test.ts`

Documentazione aggiornata: `docs/RILASCIO-VOCE-FATTURE-2026-09-07.md`, `docs/FUNZIONALITA-CRM-2026-09-07.md`, `docs/FATTURE-IN-CLOUD.md`, `docs/LAVORI_SVOLTI.md`.
