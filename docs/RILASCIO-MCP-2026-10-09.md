# Estensione MCP Pipely — 9 ottobre 2026

## Aggiornamento contatti — server 1.2.0

Pubblicato il commit applicativo `add7a23` su `main`. Deployment [3jPjcprSvBvC1CfViAGVUqnMzxe4](https://vercel.com/espeditoai2025-1690s-projects/pipeline/3jPjcprSvBvC1CfViAGVUqnMzxe4) verificato **READY / Production**, con alias `www.pipely.it` e `pipely.it`.

Il server espone ora 16 tool (sette di lettura e nove di scrittura). `pipely_update_contact` aggiorna parzialmente anagrafica, azienda e responsabile dei contatti esistenti, conservando ID e campi omessi. Per collegare un'azienda richiede `id`, `companyId`, `expectedUpdatedAt` e `requestId`; `companyId: null` rimuove il collegamento. Nome e responsabile non possono essere cancellati. I riferimenti devono appartenere alla stessa organizzazione; il controllo di versione impedisce sovrascritture concorrenti. Scrittura, ricevuta idempotente e webhook `contact.updated` sono atomici. Non crea contatti duplicati, non consuma quota contatti e non attiva `CONTACT_CREATED`.

Verificati 187 test unitari, 85 di integrazione (34 MCP), sei test UI desktop/mobile, TypeScript, ESLint dei moduli applicativi e build di produzione con 113 pagine statiche. Le sei nuove prove MCP coprono tre contatti a quota Starter piena, aggiornamento parziale e retry, riassegnazione/rimozione, isolamento, validazione/versioni obsolete e concorrenza. Lo script remoto conserva il warning console preesistente, senza errori di lint.

Il collaudo pubblico del 9 ottobre 2026 alle 20:09, ora italiana, ha superato 17 controlli: catalogo di 16 tool, collegamento aziendale, retry, rifiuto della versione obsoleta e rimozione del collegamento, oltre alle precedenti operazioni aziendali e attività, ricevute Starter, sola lettura e revoca. Rapporto separato, che conserva la prova del rilascio precedente: [MCP-PRODUZIONE-CONTATTI-2026-10-09.json](MCP-PRODUZIONE-CONTATTI-2026-10-09.json). Rimossa la sola organizzazione sintetica; nessuna email, pagamento o modifica dei dati cliente. Nessuna nuova migrazione o variabile ambiente. Le chiavi di scrittura esistenti abilitano il nuovo tool: ricaricare il catalogo nel client.

Aggiornati `src/lib/mcp/schemas.ts`, `src/lib/mcp/crm.ts`, `src/lib/mcp/server.ts`, il consenso in `src/components/settings/McpSettings.tsx`, `src/lib/guide-data.ts`, i test MCP, lo script remoto e la documentazione. La modifica preesistente ad `AGENTS.md` resta esclusa dai commit. Le sezioni seguenti conservano il dettaglio del rilascio 1.1.0.

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
- Verifica remota completata con il client ufficiale: 14 controlli superati su `https://www.pipely.it/api/mcp`, compresi creazione/aggiornamento aziende, retry, versione obsoleta, creazione/conclusione attività, conservazione della data, ricevute, piano Starter, sola lettura e revoca. Rapporto: [MCP-PRODUZIONE-2026-10-09.json](MCP-PRODUZIONE-2026-10-09.json).
- La sola organizzazione sintetica della prova è stata rimossa con i suoi record; nessuna email o pagamento eseguito e nessun dato cliente modificato.

## Pubblicazione

Commit applicativo `cd2bf20` pubblicato su `main`. Deployment [B4oi5Ckkia66Ptoew4CVZLmUNbXG](https://vercel.com/espeditoai2025-1690s-projects/pipeline/B4oi5Ckkia66Ptoew4CVZLmUNbXG) verificato **READY / Production**, assegnato a `www.pipely.it` e `pipely.it`. La prova remota è stata eseguita il 9 ottobre 2026 alle 18:36, ora italiana. Nessuna migrazione aggiuntiva.

## File modificati

- `src/lib/mcp/schemas.ts`: nuovi input e limiti dei campi.
- `src/lib/mcp/crm.ts`: operazioni transazionali e lettura dei campi aziendali completi.
- `src/lib/mcp/server.ts`: registrazione dei tre tool, versione e istruzioni.
- `src/components/settings/McpSettings.tsx`: descrizione dei permessi di scrittura.
- `src/lib/guide-data.ts`: guida alle funzioni disponibili.
- `tests/integration/mcp.test.ts`: nuove regressioni e aggiornamento del catalogo atteso.
- `scripts/check-mcp-production.mjs`: verifica aziende/attività, retry, versione obsoleta e rapporti datati senza sovrascrivere la prova del 3 ottobre.
- `docs/MCP.md`, `docs/LAVORI_SVOLTI.md`, questo rapporto: documentazione aggiornata.
- `docs/MCP-PRODUZIONE-2026-10-09.json`: esito del collaudo pubblico senza credenziali o contenuti cliente.

La modifica preesistente ad `AGENTS.md` è stata conservata ed esclusa dal commit applicativo.

## Attività successive

Restano separati da questa estensione OAuth, scopes per singola risorsa e gestione dei lead. L'aggiornamento dei contatti è disponibile dal server 1.2.0 descritto sopra. Non sono esposti cancellazioni, riapertura attività, campagne, pagamenti o invio di fatture.
