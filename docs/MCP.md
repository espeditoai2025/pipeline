# Collegare Pipely a piattaforme e agenti tramite MCP

Il server del progetto espone `https://www.pipely.it/api/mcp` con Streamable HTTP. Usa l'SDK ufficiale TypeScript 2.3.0, con supporto al protocollo 2026-07-28 e alla modalità stateless dei client 2025. La documentazione dell'SDK descrive il [trasporto HTTP](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/http.md) e la [verifica del token davanti al gestore](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/web-standard.md).

## Configurazione

1. Come proprietario o amministratore, apri **Impostazioni → Sicurezza → Gestisci connessioni MCP**, oppure `/settings/mcp`.
2. Crea una chiave con nome e scadenza. La lettura è il permesso predefinito; la scrittura richiede una selezione esplicita.
3. Copia la chiave mostrata una volta e salvala nel gestore dei segreti del client. Non inserirla nel repository, nelle note CRM o nei prompt.
4. Nel client imposta l'URL sopra, trasporto Streamable HTTP e header `Authorization: Bearer <chiave MCP>`.

Il client deve supportare header personalizzati. Non è presente un authorization server OAuth né il consenso automatico tramite login; client che richiedono soltanto OAuth non possono collegarsi con questa prima versione. Non vengono configurati account SaaS o agenti esterni automaticamente. Una piattaforma senza MCP può usare le API REST `/api/v1` e i webhook già disponibili.

Le chiavi `pip_mcp_` sono separate dalle chiavi REST `pip_live_`. Una chiave MCP di sola lettura non può essere utilizzata per scrivere sulle API REST. Sono consentite 10 chiavi attive per organizzazione, con scadenza fra 1 e 365 giorni (90 predefiniti). La revoca è conservata per mantenere lo storico delle scritture. Cambiare ruolo o organizzazione del creatore blocca l'accesso. L'eliminazione del creatore o dell'organizzazione elimina credenziali e ricevute collegate.

## Tool disponibili

| Tool | Operazione |
| --- | --- |
| `pipely_get_context` | Organizzazione, permessi, limiti attuali del piano e istruzioni d'uso |
| `pipely_list_pipelines` | Pipeline, fasi e membri (massimo 100 per elenco) |
| `pipely_list_contacts` | Ricerca contatti per nome/email, filtro azienda, paginazione |
| `pipely_list_companies` | Ricerca aziende per nome/partita IVA, paginazione |
| `pipely_list_deals` | Ricerca trattative per titolo, stato/pipeline, paginazione; escluse quelle eliminate |
| `pipely_list_activities` | Ricerca attività per oggetto, completamento e collegamenti |
| `pipely_get_record` | Dettaglio contatto/azienda/trattativa/attività; ultime 20 note per contatto/trattativa |
| `pipely_create_contact` | Crea contatto, verifica quota e riferimenti dell'organizzazione |
| `pipely_update_contact` | Aggiorna i campi indicati e collega, cambia o rimuove l'azienda, con controllo della versione |
| `pipely_create_deal` | Crea trattativa OPEN con pipeline/fase coerenti |
| `pipely_create_activity` | Crea attività attribuita al creatore della chiave |
| `pipely_create_note` | Aggiunge una nota testuale a contatto o trattativa |
| `pipely_update_deal` | Modifica titolo/valore/stato/fase/motivo perdita, con controllo della versione |
| `pipely_create_company` | Crea azienda con anagrafica, partita IVA e referente |
| `pipely_update_company` | Aggiorna solo i campi indicati, con controllo della versione e cancellazione tramite null |
| `pipely_complete_activity` | Completa un'attività; se già conclusa mantiene la data originale |

Il server 1.2.0 espone 16 tool: le chiavi di lettura espongono solo i primi sette. Gli altri nove sono registrati solo quando la chiave autorizza la scrittura; il server ricontrolla credenziale e ruolo anche nella transazione di scrittura. I riferimenti a contatti, aziende, fasi, pipeline e responsabili devono appartenere all'organizzazione della chiave. Le chiavi di scrittura esistenti abilitano anche le nuove operazioni; ricarica l'elenco strumenti nel client dopo il rilascio.

Le liste accettano `page` (1–10.000), `perPage` (1–50, predefinito 25) e `search` (massimo 200 caratteri). Il dettaglio restituisce al massimo 20 note, con 10.000 caratteri ciascuna e indicazione di eventuale troncamento. Non espone audio, credenziali di servizi, dettagli di abbonamento o dati di altre organizzazioni.

## Scritture, retry ed eventi

Ogni scrittura richiede un `requestId` univoco, per esempio un UUID, di 8–100 caratteri alfanumerici, trattini o underscore. Riutilizza lo stesso ID e gli stessi dati nei retry. Il CRM, la ricevuta, i workflow e le consegne webhook sono salvati in un'unica transazione serializzabile. Un retry restituisce l'ID originale con `replayed: true`. Riutilizzare un ID per altri dati o per un altro tool viene rifiutato. La schermata mostra le ultime 30 ricevute, con connessione, operazione, record e identificativo della richiesta; non memorizza il testo del prompt o i parametri della scrittura, ma un hash di confronto.

`pipely_update_contact`, `pipely_update_deal` e `pipely_update_company` richiedono anche `expectedUpdatedAt`, ricavato da una lettura recente. Se il record è cambiato, la modifica viene rifiutata: rileggi la scheda, verifica che l'intento sia ancora valido e usa un nuovo `requestId`. Mantieni l'ID originale se stai invece ripetendo la medesima richiesta interrotta per scoprire se era già riuscita.

Per collegare un contatto già creato a un'azienda, leggi il contatto con `pipely_get_record` (`kind: "contact"`) o `pipely_list_contacts`, cerca l'azienda con `pipely_list_companies` e invoca `pipely_update_contact` con `id`, `expectedUpdatedAt`, `requestId` e `companyId`. Ripeti per ogni contatto usando un requestId distinto. Il contatto conserva il proprio ID e tutti i campi omessi. `companyId: null` rimuove il collegamento; un altro ID cambia l'azienda. Non vengono creati duplicati né consumata quota contatti.

Il tool può anche modificare nome, cognome, email, telefono, ruolo lavorativo e responsabile (`ownerId`). `null` cancella i campi facoltativi; cognome, telefono e ruolo accettano anche una stringa vuota. Nome e responsabile restano obbligatori; l'email deve essere valida oppure null. Il responsabile deve essere un membro della stessa organizzazione.

Le aziende supportano nome, sito, settore, dimensione, indirizzo, città, paese, email, telefono, partita IVA, descrizione, LinkedIn e nome/ruolo/email/telefono del referente. Gli aggiornamenti sono parziali: i campi omessi restano invariati e `null` cancella un campo facoltativo. Nome, email e URL non validi vengono rifiutati; i limiti dei campi sono indicati nello schema del tool. Il server salva i dati forniti, senza verificare partita IVA o recapiti su servizi esterni.

`pipely_complete_activity` richiede `id` e `requestId`, senza `expectedUpdatedAt` perché non cambia l'anagrafica né riapre l'attività. Usa la data corrente del server. Restituisce `completedAt` e `alreadyCompleted`: un'attività già conclusa mantiene la data originale e non genera un nuovo evento di completamento, anche con un nuovo requestId. Un retry della stessa richiesta restituisce la ricevuta originale con `replayed: true`. Non invia email.

| Scrittura | Workflow | Webhook |
| --- | --- | --- |
| Contatto nuovo | `CONTACT_CREATED` | `contact.created` |
| Contatto modificato | Nessun trigger di aggiornamento contatti disponibile | `contact.updated`, con azienda e responsabile risultanti |
| Trattativa nuova | `DEAL_CREATED` | `deal.created` |
| Trattativa modificata | Eventi condivisi per fase, valore, vinta/persa | `deal.updated`, eventuali `deal.won`, `deal.lost`, `deal.stage_changed` |
| Attività | Nessun trigger di creazione; resta applicabile la gestione ordinaria delle scadenze | `activity.created` |
| Azienda nuova o modificata | Nessun trigger aziendale disponibile | `company.created` oppure `company.updated` |
| Completamento attività | Nessun trigger di completamento; la gestione ordinaria delle scadenze esclude le attività concluse | `activity.completed`, solo al primo completamento |
| Nota | Nessuno | Nessuno |

I job workflow sono ripresi dopo il commit e dal cron; i webhook sono accodati nella transazione e consegnati dopo il commit, con i retry ordinari. La consegna remota non è "exactly once": il ricevente deve gestire eventi ripetuti. Un'attività di tipo EMAIL è un promemoria, non invia una email. I workflow già configurati possono invece produrre effetti esterni, compreso l'invio di messaggi: il client deve ottenere l'autorizzazione dell'utente per l'azione CRM richiesta.

MCP è disponibile in Starter, Pro e Enterprise. Starter resta limitato a 500 contatti e non esegue workflow Pro. MCP non invoca l'AI interna e non consuma la quota giornaliera di trascrizione/comandi; eventuali costi dell'agente esterno sono gestiti dal suo fornitore. Non sono esposti cancellazioni, pagamenti, invio di fatture, campagne, amministrazione o trascrizioni vocali.

## Trasporto e hosting

La route gira nel runtime Node di Next.js con durata massima 60 secondi. Ogni richiesta verifica Bearer, ruolo corrente e organizzazione. Le risposte sono private e `no-store`. Sono accettati POST e OPTIONS; GET e DELETE autenticati restituiscono 405 perché non sono mantenute sessioni o connessioni SSE persistenti. I client 2025 ricevono, quando previsto dall'SDK, un flusso SSE limitato alla singola risposta.

Il limite è di 120 richieste al minuto per chiave con il limitatore API esistente; errori di autenticazione passano anche dal limite di autenticazione. Come le API esistenti, il limite richiede Upstash configurato e segue il ripiego del progetto in caso di indisponibilità del servizio. Ogni body è limitato a 64 KB anche senza Content-Length. I batch sono rifiutati per evitare che una sola richiesta aggiri il limite.

Host e Origin sono verificati prima dell'accesso ai dati. Le origini predefinite sono i domini Pipely, le URL applicative configurate e il deployment Vercel; lo sviluppo accetta localhost:3000 e 127.0.0.1:3000. Per un client browser aggiungi solo le origini HTTPS necessarie a `MCP_ALLOWED_ORIGINS`, separate da virgole. I client server possono omettere Origin. Non è consentito CORS `*`.

## Esempio con il client ufficiale

Con Node ≥20 e `@modelcontextprotocol/client` installato, configura `PIPELY_MCP_TOKEN` nel tuo ambiente privato. Non stamparlo nei log.

```js
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';

const client = new Client({ name: 'mio-agente', version: '1.0.0' });
const transport = new StreamableHTTPClientTransport(
  new URL('https://www.pipely.it/api/mcp'),
  { authProvider: { token: async () => process.env.PIPELY_MCP_TOKEN } },
);
try {
  await client.connect(transport);
  const result = await client.callTool({
    name: 'pipely_list_contacts',
    arguments: { search: 'Rossi', page: 1, perPage: 25 },
  });
  console.log(result.structuredContent);
} finally {
  await client.close();
}
```

## Da sviluppare in seguito

- OAuth con consenso, client registration/discovery e gestione delle autorizzazioni per client che non permettono header Bearer manuali.
- Scopes per singola risorsa, accesso assegnato a utenti operativi e filtri più restrittivi quando richiesti.
- Tool aggiuntivi per sincronizzazione di lead e contatti, mantenendo quota, eventi, concorrenza e ricevute.
- Collegamenti pronti per piattaforme specifiche, da validare sul client scelto.
