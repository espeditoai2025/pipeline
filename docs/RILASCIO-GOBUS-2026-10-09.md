# Pipely — rilascio GoBus del 9 ottobre 2026

## Contenuto

Il lavoro implementa le tre priorità del collaudo MCP GoBus. La prima tranche (server 1.3.0, commit `9928795`) è pubblicata: update contatti con record restituito, esclusioni applicate da campagne/workflow, chiavi esterne permanenti e import CSV/Excel/MCP senza duplicati riconoscibili e senza invii impliciti. Deployment `dpl_CmyL38sXcSH5VczSPshJDiF9ARev` READY / Production; [22 controlli pubblici](MCP-PRODUZIONE-GOBUS-2026-10-09.json), fixture sintetica rimossa.

La seconda tranche aggiunge schede/report GoBus, campi e pipeline MCP, gestione attività e note aziendali, lettura e previsione degli effetti automatici, registrazione di eventi esterni deduplicati. Server 1.4.0 con 35 strumenti, 15 di sola lettura e 20 di scrittura. Migrazioni additive applicate dal normale processo Vercel `prisma migrate deploy`.

## Evidenze locali

| Richiesta | Verifica |
| --- | --- |
| Contatto esistente collegabile senza perdere note/attività | Test MCP: record invariato nelle relazioni, collisioni/versione/tenant/retry |
| Esclusioni al momento dell'invio | Test SMTP/Resend simulati: campagne e workflow già accodati, copie, maiuscole/spazi, disiscrizioni persistenti, errore database senza invio |
| Import CSV/Excel e MCP | Test reimport e concorrenza, chiavi esterne e ID stabili, dry-run senza effetti, conflitti email/PIVA, isolamento e ricevute |
| Canoni separati dalle offerte | Test Pro 49 con upgrade Enterprise in prova, proposta Molinari 40, prova gratuita, test esclusi, verifica invalidata al cambio prezzo |
| Campi/pipeline via MCP | Test valori parziali, tipi/opzioni, versioni, tenant, quota e rimozione negata di fasi usate |
| Attività e note aziendali | Test ripianificazione senza duplicato, completamento ripetuto, riapertura con storico, nota aziendale senza contatto commerciale |
| Visibilità degli effetti | Test workflow/email possibili, segreti e credenziali webhook esclusi, import silenzioso |
| Storico esterno | Test fonte/ID, identità mailbox, revisioni/versione/retry/tenant, rifiuto di corpo/allegati e nessuna nota/attività duplicata |

Passati 187 test unitari, 106 di integrazione e 50 test UI desktop/mobile. TypeScript ed ESLint dei moduli senza errori; warning console preesistente nello script di collaudo. Build di produzione completata (113 pagine). I test database sono isolati e non usano le credenziali del database cliente; i provider email sono simulati.

## Limiti operativi dichiarati

- La modifica riguarda Pipely e i suoi strumenti; non ha modificato le 35 aziende reali o inviato messaggi a clienti.
- Il testo storico «NON RICONTATTARE» non crea automaticamente un blocco: occorre registrare lo stato strutturato del recapito dopo verifica. Secondo la precisazione dell'utente, l'esclusione marketing blocca campagne e automazioni; gli invii manuali restano disponibili. Un rimbalzo permanente rende invece il recapito inutilizzabile per ogni invio.
- Senza email o chiave esterna non si deduce l'identità da un nome. Conflitti espliciti senza fusioni automatiche.
- Il report GoBus distingue canoni contrattuali verificati, offerte accettate e incassi. Gli incassi riconciliati non sono calcolati: il campo è null. Non cambia la semantica dei report CRM generali; WON via MCP richiede evidenza e il report GoBus esclude offerte prive di evidenza.
- Gli eventi esterni accettano metadati ed evidenza fornita dal chiamante; Pipely non verifica autonomamente PCSMail o GoBus. Nessun monitoraggio o import storico di caselle reali è stato avviato. Inviati e invio confermato non attestano consegna; eventi di rimbalzo/risposta non modificano consensi o esclusioni.
- La previsione degli effetti è prudente e basata sulla configurazione corrente. Webhook esterni, troncamento o modifiche successive possono impedire di escludere invii. Import e upsert mantengono invece la soppressione backend.

Ricaricare il catalogo MCP nel client dopo il rilascio. Contratto degli strumenti e parametri: [MCP.md](MCP.md).
