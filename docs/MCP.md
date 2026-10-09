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
| `pipely_get_record` | Dettaglio contatto/azienda/trattativa/attività; note azienda/contatto/trattativa, valori personalizzati e storico attività |
| `pipely_create_contact` | Crea contatto, verifica quota e riferimenti dell'organizzazione |
| `pipely_update_contact` | Aggiorna i campi indicati e collega, cambia o rimuove l'azienda, con controllo della versione |
| `pipely_get_external_record` | Cerca azienda/contatto tramite fonte e ID esterni permanenti |
| `pipely_upsert_company` | Sincronizza un'azienda tramite ID esterno, con conflitti email/PIVA e senza invii |
| `pipely_upsert_contact` | Sincronizza un contatto tramite ID esterno, con conflitti email e senza invii |
| `pipely_import_batch` | Lotto di massimo 100 voci, dry-run, risultati per voce e import senza invii |
| `pipely_get_recipient_policy` | Legge esclusioni, sospensioni, rimbalzi e ultimi 30 eventi del recapito |
| `pipely_set_recipient_policy` | Registra uno stato del recapito con motivo, fonte, data e controllo versione |
| `pipely_create_deal` | Crea trattativa OPEN con pipeline/fase coerenti |
| `pipely_create_activity` | Crea attività attribuita al creatore della chiave |
| `pipely_create_note` | Aggiunge una nota testuale ad azienda, contatto o trattativa |
| `pipely_update_deal` | Modifica titolo/valore/stato/fase/motivo perdita, con controllo della versione |
| `pipely_create_company` | Crea azienda con anagrafica, partita IVA e referente |
| `pipely_update_company` | Aggiorna solo i campi indicati, con controllo della versione e cancellazione tramite null |
| `pipely_complete_activity` | Completa un'attività; se già conclusa mantiene la data originale |
| `pipely_update_activity` / `pipely_reopen_activity` | Ripianifica o riapre con versione; conserva lo storico dei completamenti |
| `pipely_list_custom_fields` / `pipely_save_custom_field` / `pipely_set_custom_values` | Gestisce definizioni e valori personalizzati, senza sovrascrivere i campi omessi |
| `pipely_save_pipeline` | Crea/aggiorna pipeline e fasi con quota e versione; non elimina fasi con trattative |
| `pipely_get_gobus_profile` / `pipely_set_gobus_profile` / `pipely_get_gobus_report` | Scheda GoBus e report con canoni separati dalle offerte e prove/test esclusi dai paganti |
| `pipely_list_automation_effects` / `pipely_predict_effects` | Legge configurazione senza segreti e prevede possibili workflow/webhook/email |
| `pipely_upsert_external_event` / `pipely_list_external_events` | Storico PCSMail/GoBus deduplicato e versionato, senza invii o note duplicate |

Il server 1.4.0 pubblicato espone 35 tool: quindici di lettura e venti di scrittura. La ricerca per ID esterno e la lettura degli stati dei recapiti sono disponibili anche alle chiavi di sola lettura. Le altre operazioni sono registrate solo quando la chiave autorizza la scrittura; il server ricontrolla credenziale e ruolo anche nella transazione di scrittura. I riferimenti a contatti, aziende, fasi, pipeline e responsabili devono appartenere all'organizzazione della chiave. Le chiavi di scrittura esistenti abilitano anche le nuove operazioni; ricarica l'elenco strumenti nel client dopo il rilascio. Per lo stato pubblicato consulta il registro dei lavori e i rapporti di rilascio.

Le liste accettano `page` (1–10.000), `perPage` (1–50, predefinito 25) e `search` (massimo 200 caratteri). Il dettaglio restituisce al massimo 20 note, con 10.000 caratteri ciascuna e indicazione di eventuale troncamento. Non espone audio, credenziali di servizi, credenziali di abbonamento Pipely o dati di altre organizzazioni.

## Scritture, retry ed eventi

Ogni scrittura richiede un `requestId` univoco, per esempio un UUID, di 8–100 caratteri alfanumerici, trattini o underscore. Riutilizza lo stesso ID e gli stessi dati nei retry. Il CRM, la ricevuta, i workflow e le consegne webhook sono salvati in un'unica transazione serializzabile. Un retry restituisce l'ID originale con `replayed: true`. Riutilizzare un ID per altri dati o per un altro tool viene rifiutato. La schermata mostra le ultime 30 ricevute, con connessione, operazione, record e identificativo della richiesta; non memorizza il testo del prompt o i parametri della scrittura, ma un hash di confronto.

`pipely_update_contact`, `pipely_update_deal` e `pipely_update_company` richiedono anche `expectedUpdatedAt`, ricavato da una lettura recente. Se il record è cambiato, la modifica viene rifiutata: rileggi la scheda, verifica che l'intento sia ancora valido e usa un nuovo `requestId`. Mantieni l'ID originale se stai invece ripetendo la medesima richiesta interrotta per scoprire se era già riuscita.

Per collegare un contatto già creato a un'azienda, leggi il contatto con `pipely_get_record` (`kind: "contact"`) o `pipely_list_contacts`, cerca l'azienda con `pipely_list_companies` e invoca `pipely_update_contact` con `id`, `expectedUpdatedAt`, `requestId` e `companyId`. Ripeti per ogni contatto usando un requestId distinto. Il contatto conserva il proprio ID e tutti i campi omessi. `companyId: null` rimuove il collegamento; un altro ID cambia l'azienda. Non vengono creati duplicati né consumata quota contatti.

Il tool può anche modificare nome, cognome, email, telefono, ruolo lavorativo e responsabile (`ownerId`). `null` cancella i campi facoltativi; cognome, telefono e ruolo accettano anche una stringa vuota. Nome e responsabile restano obbligatori; l'email deve essere valida oppure null. Il responsabile deve essere un membro della stessa organizzazione.

`pipely_update_contact` restituisce anche `record`, la scheda aggiornata. Una email in collisione con un altro contatto dell'organizzazione viene rifiutata, anche se differisce per maiuscole o spazi; nessuna unione automatica. Note e attività conservano il collegamento al medesimo ID.

## Sincronizzazione GoBus e import senza invii

Aziende e contatti supportano `externalSource`, `externalId` e `operationalEmail`. Fonte e ID devono essere forniti insieme: la fonte è normalizzata con trim/minuscole, l'ID con trim preservando le maiuscole. La coppia è univoca per tipo di record e organizzazione; lo stesso ID in un'altra organizzazione resta isolato. L'indirizzo operativo è distinto dall'email anagrafica e dall'email dell'account Pipely.

`pipely_get_external_record` cerca la coppia permanente; le liste accettano gli stessi filtri. Gli upsert richiedono `requestId`: un ID esterno assente crea un record, uno esistente e invariato restituisce `unchanged` con lo stesso ID. Le modifiche a un record esistente richiedono `expectedUpdatedAt`; una versione esplicitamente obsoleta viene sempre rifiutata. Le collisioni email e, per aziende, partita IVA normalizzata vengono segnalate senza fondere aziende diverse. Per collegare una scheda preesistente a GoBus, verificarne prima l'identità e assegnare esplicitamente fonte e ID tramite il normale aggiornamento versionato; non si usa l'email come chiave di fusione.

`pipely_import_batch` accetta `entries: [{kind: "company"|"contact", data: {...}}]`, massimo 100 voci e comunque entro il limite HTTP di 64 KiB. `dryRun` è true per impostazione predefinita: legge e segnala effetti previsti e conflitti senza salvare record, ricevute o eventi. Con `dryRun: false` salva i risultati per voce e una ricevuta idempotente; un retry identico recupera gli stessi risultati. Un nuovo lotto con gli stessi ID esterni conserva gli ID del CRM. Gli errori di una voce non applicano modifiche parziali a quella voce. Per collegare i contatti a nuove aziende, importare prima le aziende e utilizzare gli ID restituiti.

L'import MCP e gli upsert applicano sempre `withoutSends`: non accodano workflow o webhook e non risvegliano code. Non è disponibile un valore false per aggirare questo vincolo. Gli import CSV/Excel di contatti, lead e liste email deduplicano le email con trim/minuscole; quelli dei contatti supportano anche le colonne `externalSource`/`externalId`. I campi omessi e gli stati esistenti dei recapiti non vengono sovrascritti. Senza email o ID esterno non si può stabilire l'identità con certezza: non vengono fuse persone soltanto perché condividono un nome. Gli import di contatti/lead non attivano più workflow, anche se `triggerOnImport` era configurato; le creazioni singole conservano gli effetti documentati.

## Esclusioni dei recapiti

Gli stati sono strutturati per indirizzo email normalizzato e organizzazione, separati dalle note CRM. `DO_NOT_CONTACT` blocca campagne e workflow; `SUSPENDED` applica lo stesso blocco fino a `suspendedUntil`, oppure fino a una modifica esplicita se la scadenza manca. Gli invii manuali restano disponibili, come richiesto, per permettere anche le risposte di assistenza. `PERMANENT_BOUNCE` blocca ogni invio a un recapito non utilizzabile.

Ogni modifica richiede motivo, fonte, data e requestId; per uno stato esistente è obbligatoria la sua `expectedUpdatedAt`. Lo storico delle modifiche è conservato. `CLEARED` richiede una verifica esplicita, conserva l'evento precedente, non rappresenta un consenso marketing e non reiscrive alle liste. Una disiscrizione di lista continua a bloccare la relativa campagna, anche dopo una correzione di uno stato globale.

Il punto centrale di invio controlla lo stato appena prima di chiamare SMTP/Resend, per destinatario e copie, anche con canale già risolto. Le campagne e i workflow accodati leggono lo stato corrente; un workflow escluso registra lo step `SKIPPED`, senza ricevuta email o esito incerto. Se la lettura delle esclusioni fallisce, non si invia. Il blocco sopravvive a reimport e cancellazione delle schede, perché è legato al recapito e all'organizzazione.

Il testo «NON RICONTATTARE» nelle descrizioni o nei registri locali non viene convertito automaticamente: va registrato esplicitamente con `pipely_set_recipient_policy` dopo aver verificato il recapito. Le nuove funzioni non hanno modificato i dati delle 35 aziende GoBus o inviato messaggi reali.

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

MCP è disponibile in Starter, Pro e Enterprise. Starter resta limitato a 500 contatti e non esegue workflow Pro. MCP non invoca l'AI interna e non consuma la quota giornaliera di trascrizione/comandi; eventuali costi dell'agente esterno sono gestiti dal suo fornitore. Non sono esposti cancellazioni, pagamenti, invio di fatture, campagne, amministrazione utenti o trascrizioni vocali.

## Schede, campi e report GoBus

`pipely_get_gobus_profile` / `pipely_set_gobus_profile` gestiscono una scheda strutturata per azienda: fonte, segmento, tipo azienda, verifica, cliente/prova/prospect/inattivo, piano base, upgrade in prova e scadenza, attivazione, primo servizio, prossima azione e `isTest`. Il profilo è separato dall'offerta CRM e versionato tramite il suo `updatedAt`. La lettura include gli stati strutturati dei recapiti noti dell'azienda e dei primi 100 contatti; non deduce esclusioni dalle descrizioni o dai campi personalizzati.

Il canone ha importo, valuta, periodicità (`MONTH`, `QUARTER`, `YEAR`, `ONE_OFF`), IVA (`INCLUDED`, `EXCLUDED`, `EXEMPT`, `UNKNOWN`), fonte, data e riferimento di verifica. Cambiare un dato economico invalida la vecchia verifica, salvo nuova data ed evidenza esplicita. `pipely_get_gobus_report` esclude i test e mostra separatamente canoni contrattuali verificati e offerte accettate, senza mescolare valute, periodicità o IVA. Contano fra i paganti ricorrenti solo clienti verificati con canone positivo, ricorrente e verificato. Pro 49 euro con prova Enterprise conserva il canone base; una proposta di 40 euro e una prova gratuita non entrano nel ricorrente. `reconciledReceipts` è null: questo report non dispone di un registro degli incassi riconciliati e non presenta il canone dichiarato come cassa.

Negli aggiornamenti MCP, `status: "WON"` richiede `acceptanceEvidence`; un importo o una nota di interesse non vengono convertiti automaticamente in accettazione. Le trattative hanno un flag `isTest`, disponibile anche come filtro. Il report GoBus esclude offerte senza evidenza e test; i report CRM generali conservano la loro semantica precedente.

`pipely_save_custom_field` crea o modifica definizioni per azienda, contatto o trattativa, con versione obbligatoria per modifiche. Tipi: text, number, date, boolean, select, multiselect; multiselect usa un array JSON nella stringa del valore. Non cambia tipo/entità e non rimuove opzioni in uso. `pipely_set_custom_values` modifica solo i valori indicati e richiede la versione del record parent; null rimuove un valore facoltativo. `pipely_get_record` restituisce i valori. Campi consigliati sono quelli del collaudo GoBus; lo stato di esclusione effettivo resta sempre `RecipientPolicy`, anche se esiste un campo descrittivo di marketing.

`pipely_save_pipeline` crea o aggiorna pipeline e fasi. Per aggiornare occorrono ID e versione della pipeline da `pipely_list_pipelines`. Gli ID delle fasi esistenti devono essere conservati; omettere una fase la rimuove soltanto se non contiene trattative. Quota del piano e organizzazione sono verificati. Le liste di aziende/contatti supportano fonte/ID esterni e segmento GoBus; il report supporta fonte del profilo e segmento.

## Attività, note e previsione degli effetti

`pipely_update_activity` modifica oggetto, tipo, note, scadenza, durata e associazioni azienda/contatto/trattativa, con versione e requestId. Non crea un'altra attività. `pipely_reopen_activity` richiede motivo e versione: libera il completamento corrente, conserva `firstCompletedAt` e registra un evento con la data del completamento precedente. `get_record` restituisce gli ultimi 50 eventi. Un completamento ripetuto conserva data e storico, anche dall'interfaccia web. Dopo una riapertura e nuovo completamento nasce un nuovo evento: la data storica originaria rimane immutata. Le note supportano `companyId` e si leggono direttamente dalla scheda azienda senza creare un contatto commerciale.

`pipely_list_automation_effects` legge fino a 100 workflow e webhook, con indicazione di troncamento. Restituisce stato, eventi e azioni validate, ma non segreto webhook, credenziali, percorso o query della destinazione. `pipely_predict_effects` indica i possibili effetti di una scrittura; per update_deal include prudenzialmente gli eventi condizionati a cambiamenti e filtri. `maySendEmail` è true per workflow di invio, false solo quando non ci sono effetti di invio noti, null se un webhook o un elenco incompleto impediscono di escluderli. La configurazione può cambiare dopo la lettura e le scadenze delle attività possono attivare workflow in seguito. Import/upsert applicano la soppressione backend documentata.

## Eventi PCSMail e GoBus

`pipely_upsert_external_event` salva solo metadati e riferimenti, con chiave permanente fonte/ID per organizzazione. Per PCSMail richiede fonte `pcsmail`, account, mailbox, UIDVALIDITY, UID, direzione e timestamp; conserva Message-ID quando presente, destinatario e flag di verifica, stato e riferimento al messaggio. La coppia account/mailbox/UIDVALIDITY/UID impedisce anche una duplicazione tramite un altro ID esterno. Message-ID da solo non è una chiave di fusione. Retry identici e reimport invariati conservano ID e non creano revisioni duplicate; modifiche richiedono versione e conservano una revisione immutabile.

Stati posta: `DRAFT`, `SENT_CONFIRMED`, `UNCERTAIN`, `BOUNCE`, `REPLY_RECEIVED`. L'invio confermato richiede un riferimento di evidenza di invio; un messaggio in Inviati non dimostra consegna. Stati GoBus: `REGISTERED`, `FIRST_SERVICE`, `TRIAL`, `SUBSCRIPTION`, `SUPPORT_REQUEST`; richiedono azienda ed evidenza fornita dal chiamante. Pipely valida i riferimenti e conserva la provenienza, senza verificare autonomamente GoBus o PCSMail. La registrazione non crea note/attività, non invia messaggi e non modifica consensi, profili economici o esclusioni. Un rimbalzo registrato va classificato prima di aggiornare il relativo stato di recapito. `pipely_list_external_events` restituisce eventi paginati e ultime dieci revisioni per evento. Lo schema rifiuta corpo, allegati e campi aggiuntivi; non inserire chiavi o dati passeggeri nei riferimenti o nelle evidenze. Non vengono avviati monitoraggi o sincronizzazioni programmate di account reali.

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
