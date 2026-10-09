# Estensione MCP Pipely — 9 ottobre 2026

## Funzioni

Server `pipely` versione 1.1.0, con 15 strumenti (sette di lettura e otto di scrittura).

- `pipely_create_company`: anagrafica aziendale completa, partita IVA, sito e dati del referente; ID e updatedAt nella ricevuta. Salva i dati forniti senza verifiche su servizi esterni.
- `pipely_update_company`: modifica solo i campi indicati; null cancella i campi facoltativi. Richiede la versione expectedUpdatedAt letta dalla scheda; modifiche concorrenti obsolete sono respinte.
- `pipely_complete_activity`: conclusione con la data corrente del server. Retry e completamenti successivi conservano il primo completedAt; non riapre l'attività e non invia email.

Ogni scrittura richiede requestId, permesso di scrittura e ruolo corrente OWNER/ADMIN del creatore della chiave. Il record deve appartenere all'organizzazione collegata. Azienda, ricevuta ed eventi sono salvati nella stessa transazione serializzabile. Gli eventi sono `company.created`, `company.updated` e, solo alla prima conclusione, `activity.completed`. Il motore attuale non ha trigger workflow per aziende o completamento; le attività concluse vengono escluse dalla gestione ordinaria delle scadenze. Gli altri workflow restano governati dal piano.

Disponibile negli stessi piani del precedente MCP. Le chiavi di scrittura già attive autorizzano anche queste funzioni; le chiavi di lettura espongono sempre sette strumenti. Non serve una migrazione o una nuova variabile ambiente. Ricaricare l'elenco strumenti nel client per scoprire i nuovi tool.

## Verifiche

- 187 test unitari superati.
- 79 test di integrazione superati, di cui 28 MCP con client ufficiale e PostgreSQL incorporato PGlite isolato.
- Otto nuove prove: anagrafica completa e retry, aggiornamento parziale/null e retry, versione obsoleta/azienda esterna/input vuoto, validazione e rifiuto campi di sistema, aggiornamenti aziendali concorrenti, completamenti ripetuti, completamenti concorrenti da chiavi diverse, Starter e isolamento attività.
- Sei prove UI desktop/mobile superate per gestione delle chiavi, consenso alla scrittura, scadenza, revoca ed errori.
- TypeScript ed ESLint dei moduli modificati completati senza errori.
- Build di produzione completata: TypeScript e 113 pagine statiche generati senza errori.
- Docker Desktop non ha reso disponibile il motore durante questa verifica; le prove di integrazione sopra usano PGlite, non un container.
- Pubblicazione e verifica remota in corso; lo script di produzione usa soltanto una propria organizzazione sintetica e rimuove i dati al termine.

## File modificati

- `src/lib/mcp/schemas.ts`: nuovi input e limiti dei campi.
- `src/lib/mcp/crm.ts`: operazioni transazionali e lettura dei campi aziendali completi.
- `src/lib/mcp/server.ts`: registrazione dei tre tool, versione e istruzioni.
- `src/components/settings/McpSettings.tsx`: descrizione dei permessi di scrittura.
- `src/lib/guide-data.ts`: guida alle funzioni disponibili.
- `tests/integration/mcp.test.ts`: nuove regressioni e aggiornamento del catalogo atteso.
- `scripts/check-mcp-production.mjs`: verifica aziende/attività, retry, versione obsoleta e rapporti datati senza sovrascrivere la prova del 3 ottobre.
- `docs/MCP.md`, `docs/LAVORI_SVOLTI.md`, questo rapporto: documentazione aggiornata.

## Attività successive

Restano separati da questa estensione OAuth, scopes per singola risorsa, aggiornamento dei contatti e gestione dei lead. Non sono esposti cancellazioni, riapertura attività, campagne, pagamenti o invio di fatture.
