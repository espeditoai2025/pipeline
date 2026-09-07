# Pipely — revisione codice, home, piani e automazioni

Data: **7 settembre 2026**. Base Git: `ba67b0e`, albero inizialmente pulito. Target: **liberi professionisti e microimprese**.

## Stato dopo le correzioni del 7 settembre

Le correzioni sono ora implementate nel codice locale. Il dettaglio aggiornato, i test, i file modificati e le operazioni necessarie per il rilascio sono in [CORREZIONI-CRM-2026-09-07.md](CORREZIONI-CRM-2026-09-07.md). La migrazione delle automazioni è stata collaudata soltanto sul database temporaneo di prova; non è stata applicata in produzione.

## Esito dell’audit iniziale (storico, prima delle correzioni)

Il CRM contiene implementazioni reali di pipeline, contatti, attività, campagne, AI e automazioni. **Le promesse della home e la separazione dei piani non sono però rispettate in tutti i percorsi. Le automazioni non sono ancora affidabili come presentate.**

Il motore può inviare email, creare attività e notifiche e modificare affari. Questo non significa che ogni azione sia configurabile dall'interfaccia, che ogni evento lo attivi, o che ritardi, errori e cambi di piano siano gestiti correttamente.

La verifica in sola lettura del database collegato ha trovato **1 workflow disattivato, 0 esecuzioni e 0 elementi in coda**. Non risulta quindi una prova d'uso delle automazioni registrata in questo database. Non sono state attivate automazioni né inviate email durante questa revisione.

I **139 test unitari ordinari passano**. La nuova suite di audit contiene **21 prove: 4 passano e 17 falliscono** su aspettative esplicite di correttezza. I 17 fallimenti riguardano 12 gruppi di problemi, non 17 guasti indipendenti. I servizi esterni e il database sono simulati in questa suite: sono prove dei percorsi di codice, non consegne email o transazioni Stripe reali.

## Perimetro e metodo

- Confronto della home nel repository con la home pubblica aperta in Chrome il 7 settembre; controllo del contenuto, delle schede prezzo, dei collegamenti principali e dell'albero di accessibilità. Verifica visiva anche a 390 × 844, con ripristino del viewport al termine.
- Lettura mirata di schema Prisma, autenticazione/ruoli, limiti piani, billing e webhook Stripe, automazioni/builder/log/cron, contatti/import/lead/conversione, affari/pipeline, report, catalogo, campi personalizzati, email/SMTP/campagne, API e notifiche.
- Ricerca trasversale dei punti di controllo dei piani e delle invocazioni del motore, delle funzioni vuote e dei riferimenti a SSO/SAML.
- Esecuzione dei test ordinari, TypeScript ed ESLint; aggiunta di specifiche di regressione separate, con mock di autenticazione, DB, mailer e Stripe. Nessuna chiamata a questi servizi dai test.
- Query aggregate sul database già configurato, con certificato TLS verificato, transazione `READ ONLY`, timeout e `ROLLBACK`. Nessun dato personale o segreto nel rapporto.

Questa è una revisione ampia del prodotto e dei percorsi indicati, non una certificazione di sicurezza di ogni riga o delle infrastrutture. Non sono stati eseguiti pagamenti, invii a destinatari reali, attivazioni di workflow, migrazioni, deploy, test di carico, penetration test o collaudi autenticati end-to-end in produzione. Build e collaudi PostgreSQL/UI delle revisioni precedenti rimangono evidenze storiche, non verifiche rieseguite qui. Booking, survey, chat e tutte le pagine SEO verticali non hanno ricevuto un collaudo funzionale completo in questa sessione.

## Home: promessa e disponibilità

La fonte pubblica è [pipely.it](https://www.pipely.it/); i riferimenti sotto indicano il codice locale della stessa funzionalità. Il browser ha verificato il contenuto corrente: la versione restituita dal motore di ricerca conteneva anche testi precedenti, perciò non è stata usata come unica prova dello stato pubblicato.

| Caratteristica | Riscontro | Giudizio |
| --- | --- | --- |
| Pipeline Kanban e fasi personalizzate | Componenti pipeline, `server/actions/deals.ts` e `pipeline.ts`; spostamenti e riferimenti verificati da test ordinari | Presente; quote concorrenti ed emissione eventi da uniformare |
| Contatti, aziende, storico e campi personalizzati | CRUD in `contacts.ts`, form contatti/aziende, `custom-fields.ts`; import e merge coperti da test | Presente; lo storico non raccoglie automaticamente ogni email generata dai workflow |
| Attività e calendario | Azioni, calendario e gestione scadenze esistono; test sulle date italiane | Presente; follow-up automatici soggetti ai problemi del motore |
| Report e analytics | `reports.ts` legge dati reali e la pagina mostra grafici/CSV | Presente ma con errori di calcolo; aggiornamento al caricamento/cambio periodo, non flusso continuo |
| Campagne email con tracking | `campaign-sender.ts`: mailer reale, variabili, pixel/link firmati, disiscrizione, registro destinatari; cron campagne | Presente nel codice; singolo stato storico `SENT` non prova una consegna attuale |
| SMTP personalizzato | Configurazione cifrata, verifica SMTP e mailer con precedenza al canale verificato | Presente; diritto d'uso non ricontrollato dopo downgrade; nessun SMTP configurato nel DB osservato |
| AI su dati CRM e bozze email | `ai.ts`, contesto CRM e `openrouter.ts`; controlli Pro sul server | Integrazione reale; non è stata inviata una richiesta AI live in questa sessione. Insights in parte deterministici, forecast non certificato statisticamente |
| Automazioni che spostano affari e notificano il team | Motore presente; builder incompleto, notifiche al solo responsabile | Parziale; esempi della home non tutti riproducibili dal builder |
| Tracking di ogni email | Le campagne iniettano il tracking; `emails.ts` e `workflow-engine.ts` non lo fanno | Promessa non rispettata |
| Lead da qualsiasi fonte, qualifica e conversione | Inserimento, import, API, Lead Finder e conversione esistono | Presente per i canali implementati; “qualsiasi fonte” richiede integrazione/import. Quota contatti e riferimenti prodotto aggirabili nella conversione |
| Catalogo e IVA | Prodotti, associazioni agli affari e documenti/incassi esistono | Presente; disattivazione prodotto fittizia. Non equivale a emissione elettronica SDI, esplicitamente non disponibile nel codice fatture |
| Import XLS/CSV e duplicati | Parser, anteprima e azione server reale; test su separatori, duplicati e quote | Presente; eventi automatici dell'import non equivalenti alla creazione singola |
| Report personalizzati Pro | Nessun costruttore, salvataggio o modello di report personalizzato trovato; stessa pagina per tutti | Non implementati come funzione distinta |
| SSO/SAML Enterprise | Solo riferimenti promozionali/guida; autenticazione applicativa con Credentials | Non implementato |
| API dedicata Enterprise | Esiste una API condivisa `/api/v1`; creazione chiavi e autenticazione non richiedono Enterprise | API reale; dedicazione e distinzione Enterprise non dimostrate |
| SLA, onboarding, account manager, priorità supporto | SLA menzionato nei Termini; gli altri sono servizi organizzativi | Non verificabili dal codice. Servono accordi, processo e misure operative; non considerarli funzionalità tecniche collaudate |

### Correzioni consigliate alla home

1. Sostituire il tracking universale con **tracking delle campagne email**, finché gli altri invii non vengono integrati. Evitare “sai esattamente chi ha aperto”: un pixel misura richieste dell'immagine e non dimostra da solo la lettura della persona.
2. Rimuovere o indicare esplicitamente come da concordare le funzioni non disponibili: **SSO/SAML, report personalizzati, API dedicata**. Allineare anche impostazioni, guida e descrizioni nell'amministrazione.
3. Mostrare esempi di automazioni configurabili oggi: il filtro sulla fase “Proposta”, il meeting kickoff, il task e la notifica a tutto il team non sono configurabili esattamente come descritti. La FAQ sull'assenza di attività da 7 giorni non corrisponde a un trigger esistente.
4. Definire l'offerta Pro: `29 €` e riferimento `99 €` sono statici; “offerta limitata” non indica una scadenza e il prezzo addebitato dipende dal Price ID Stripe, non da questa stringa. Esplicitare unità del prezzo (organizzazione/utente), trattamento IVA e durata dell'offerta. Verificare la configurazione Stripe prima di dichiarare coincidenza dell'addebito.
5. Il pulsante “Passa a Pro” porta a `/register`, senza selezione del piano o checkout: rendere chiaro il percorso iscrizione → attivazione Pro e gestire chi è già autenticato.
6. **Accessibilità:** le funzioni escluse dello Starter sono indicate solo da icona e opacità. Nell'albero accessibile compaiono come le funzioni incluse. Aggiungere “Non incluso” testuale o `sr-only`. Le schede si dispongono in colonna a 390 px e i pulsanti principali restano visibili; su mobile scompaiono i collegamenti rapidi dell'header, senza menu sostitutivo.
7. Etichettare come dimostrativi i numeri della campagna e la conversazione AI. Non rappresentano i risultati del database osservato. La statistica FAQ del 20–30% di opportunità perse necessita di una fonte o di una formulazione non quantitativa.
8. Preferire esempi per professionisti e microimprese: richiesta preventivo, ricontatto, incarico acquisito, scadenza e incasso. La home rimane prevalentemente rivolta a team commerciali generici.

Riferimenti principali: `src/app/page.tsx:202`, `:217`, `:738`, `:773`, `:788`, `:859`; `src/components/shared/Topbar.tsx:164` (polling notifiche ogni 60 secondi). Le affermazioni assolute su sicurezza e disponibilità richiedono evidenze infrastrutturali: la cifratura SMTP AES-256 esiste, ma non basta a dimostrare che ogni dato applicativo sia cifrato allo stesso modo.

## Piani: cosa viene fatto rispettare

La mappa centrale è in `src/lib/plan.ts:23` e `src/lib/plan-client.ts`. `FREE` equivale a Starter; `ESSENTIAL`, `ADVANCED`, `PROFESSIONAL` e `PRO` equivalgono a Pro. Un piano sconosciuto ricade su Starter.

| Diritto/limite | Starter | Pro / Enterprise | Rispetto effettivo |
| --- | --- | --- | --- |
| Pipeline | 1 | Illimitate | Controllo su creazione; conteggio e inserimento non atomici, rischio superamento con richieste concorrenti |
| Contatti CRM | 500 | Illimitati | Creazione UI e API controllate; import transazionale controllato; conversione lead senza quota |
| AI | Esclusa | Inclusa | Verificata nelle azioni server assistant, insights e bozze |
| Automazioni | Escluse | Incluse | Controllata solo la creazione, non modifica, riattivazione, esecuzione o ripresa da coda |
| Campagne | Escluse | Incluse | Controlli su creazione/invio e ricontrollo delle campagne programmate prima dell'invio; editing di campagne esistenti non ha lo stesso controllo |
| SMTP | Escluso | Incluso | Controllo quando si salva la configurazione; il mailer riutilizza un SMTP già verificato anche senza diritto corrente |
| Report | Base | “Personalizzati” nella home | Unico percorso comune, nessuna separazione base/personalizzati |
| Lead Finder | 1 ricerca/giorno, massimo 10 risultati | Ricerche senza quota giornaliera, massimo 50 risultati per ricerca | Limiti presenti nel codice e nel billing; poco visibili nella home. Nessuna prova di carico/quota concorrente live qui |
| API | Non chiarito dalla home | API “dedicata” Enterprise | API comuni disponibili senza controllo del piano; non esiste un diritto Enterprise distinto nel modello limiti |
| SSO/SAML | — | Pubblicizzato Enterprise | Nessuna implementazione |

Pro ed Enterprise hanno **gli stessi limiti tecnici**. I servizi manuali Enterprise possono legittimamente essere distinti, ma vanno definiti e non confusi con funzionalità già implementate. Le liste prezzo/funzioni sono duplicate tra home, billing, impostazioni e librerie: adottare una fonte unica per presentazione e autorizzazioni.

## Problemi prioritari e criteri di chiusura

P1 = alta priorità prima di promuovere/affidare il flusso ai clienti; P2 = comportamento o promessa da correggere. “Riprodotto” indica una prova isolata sui moduli reali, non un attacco o una modifica in produzione.

### [P1] B01 — un errore Stripe può lasciare il piano sbagliato definitivamente

**Riprodotto, 2 prove.** `src/app/api/stripe/webhook/route.ts:74` inserisce l'evento nel registro prima dell'aggiornamento dell'organizzazione. Se l'update fallisce, la risposta è 500 ma il registro rimane. Il tentativo successivo viene riconosciuto come duplicato e confermato senza completare l'aggiornamento. Inoltre qualsiasi errore nell'inserimento del registro, anche una connessione DB assente, viene trattato come duplicato con HTTP 200.

Conseguenza: pagamento valido senza Pro, o downgrade non applicato, senza recupero automatico. **Chiusura:** update del piano e completamento evento atomici, oppure registro con stati recuperabili; distinguere violazione univoca da guasto DB. Entrambe le prove B01 devono passare.

### [P1] A01 — automazioni ancora eseguibili su Starter dopo downgrade

**Riprodotto, 2 prove.** Il controllo in `server/actions/workflows.ts:123` copre solo `createWorkflow`. `updateWorkflow:145`, `toggleWorkflow:170`, `workflow-engine.ts:173` e la ripresa da cron non verificano il piano.

Conseguenza: un workflow creato da Pro può essere modificato, riattivato e continuare a inviare/creare dati da Starter. **Chiusura:** diritto verificato su tutte le mutazioni e prima di ogni esecuzione/ripresa; politica esplicita per workflow e code dopo downgrade. Le campagne programmate già mostrano un esempio di ricontrollo del piano.

### [P1] A02 — cambio fase automatico senza vincoli di organizzazione/pipeline

**Riprodotto.** `src/lib/workflow-engine.ts:121` aggiorna l'affare con `stageId` configurato, senza verificare che la fase appartenga all'organizzazione e alla stessa pipeline. La creazione del workflow accetta qualsiasi stringa. Il controllo facoltativo del pulsante Test non protegge l'esecuzione.

Con un ID valido di un'altra pipeline/organizzazione si può creare un collegamento incoerente. Non è stata tentata lettura di dati altrui in produzione. **Chiusura:** validazione dei riferimenti sia al salvataggio sia all'esecuzione; aggiornamento vincolato all'organizzazione, alla pipeline e allo stato dell'affare. Test con due organizzazioni e due pipeline della stessa organizzazione.

### [P1] R01 / R03 — ruolo Viewer non rispettato e invito Owner non limitato

**R01 riprodotto:** un utente `VIEWER` può creare workflow che scrivono dati (`server/actions/workflows.ts:114`). Anche creazione/revoca chiavi API (`settings.ts:274`, `:295`) controllano la sessione ma non il ruolo: una chiave concede accesso alle API dell'organizzazione senza un profilo di sola lettura.

**R03 da lettura del codice:** `inviteTeamMember` (`settings.ts:114`) permette ad ADMIN di invitare e accetta il parametro `Role`, che comprende OWNER, senza una allowlist runtime dei ruoli assegnabili. La registrazione usa `invitation.role` (`app/api/auth/register/route.ts:62`). Un invito con ruolo OWNER può quindi estendere privilegi che `updateMemberRole` riserva al proprietario. Nessun invito è stato inviato per provarlo.

**Chiusura:** matrice server dei permessi, ruolo riletto dal DB per azioni sensibili, ruoli invito validati e OWNER gestito solo da una procedura esplicita. Verificare VIEWER/SALES/MANAGER/ADMIN/OWNER per workflow, chiavi, SMTP e operazioni CRM.

### [P1] R02 — controlli incompleti sui riferimenti di email e conversioni

**Riprodotto, 2 prove.** `emails.ts:121` accetta `contactId`/`dealId` senza verificarne l'organizzazione, invia prima e salva poi; `saveDraft:177` ha gli stessi riferimenti non validati. Un ID esterno valido può essere collegato e il successivo `getEmails` include nome del contatto/titolo affare senza ulteriore controllo sulla relazione.

In `leads.ts:678`, quando `productUnitPrice` viene fornito dal client, non viene cercato il prodotto nell'organizzazione; `:735` collega comunque il suo ID. Anche quando la ricerca viene eseguita ma non trova il prodotto, il valore predefinito è zero invece di un rifiuto.

**Chiusura:** validare tutti i riferimenti prima di inviare o aprire la transazione e rifiutare il prodotto assente/esterno indipendentemente dal prezzo. Le prove isolate dimostrano l'assenza del controllo, non una compromissione osservata del database reale.

### [P1] A03 — builder incompleto e configurazioni invalide salvabili

**Validazione fase vuota riprodotta; UI verificata nel sorgente.** `WorkflowBuilder.tsx:38` inizializza `UPDATE_DEAL_STAGE.stageId` e `ASSIGN_OWNER.userId` vuoti, ma non presenta i relativi selettori. Non presenta neppure i filtri `toStageId`, `fromStageId`, `minValue`: il salvataggio ricostruisce il trigger col solo tipo e perde eventuali filtri esistenti. `CREATE_ACTIVITY` è fissato a CALL, senza selezione di task/meeting; SEND_EMAIL è fissato al destinatario contact.

`workflows.ts:47` ammette stringhe vuote, tipi attività arbitrari e numeri negativi/frazionari per i ritardi. Il builder riutilizza inoltre ID `step-1` all'apertura di workflow esistenti: aggiungendo passi può creare duplicati e modifica/rimozione agiscono su entrambi.

**Chiusura:** editor completo e validazione condivisa dei tipi/riferimenti/compatibilità trigger-azione; ID unici; conservazione dei filtri durante modifica. Un utente deve poter costruire ed eseguire gli esempi pubblicizzati senza intervenire sul JSON.

### [P1] A07 — lo stesso evento commerciale non attiva sempre le automazioni

**Lettura dei percorsi.** Il trascinamento chiama DEAL_STAGE_CHANGED (`deals.ts:50`); la modifica della fase attraverso `updateDeal` no. Le modifiche massive WON/LOST (`deals.ts:348`) non emettono i rispettivi eventi. Le route API v1 non invocano il motore; import e conversione lead non producono gli stessi eventi di creazione manuale.

Le invocazioni dalle azioni usano promesse non attese (`.catch(...)`), senza accodamento durevole e senza `after`/estensione del ciclo di vita della richiesta. Su funzioni serverless questa modalità non garantisce il completamento dopo la risposta. Non è stato osservato un job troncato live: il rischio deriva dall'implementazione e dal modello di esecuzione documentato in `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md`.

**Chiusura:** pubblicazione degli eventi da un percorso comune, insieme alla mutazione CRM, con ID univoco e worker. Definire esplicitamente se l'import attiva workflow, evitando invii a sorpresa. `after` può migliorare il ciclo di vita, ma da solo non garantisce retry e deduplicazione.

### [P1] A08 — scadenze ripetute e coda senza presa in carico atomica

**Lettura del cron e dello schema.** `api/cron/backup/route.ts:104` recupera tutte le attività scadute, poi lavora sulle prime 50 senza ordinamento o memoria degli eventi già elaborati. Le stesse attività ancora scadute possono generare nuovamente task, notifiche o email ogni giorno; le successive possono non essere mai raggiunte.

A `:132` i primi 50 elementi della coda vengono letti senza blocco/claim. Esecuzioni sovrapposte possono processare lo stesso elemento. Dopo `runStepsFrom` il job viene eliminato anche se il motore ha registrato FAILED senza rilanciare un errore. La ripresa usa i passi correnti del workflow e un indice salvato in precedenza: una modifica durante WAIT può far riprendere dall'azione sbagliata. Disattivare il workflow fa eliminare il job, senza una sospensione recuperabile.

**Chiusura:** claim atomico, event/job ID, versionamento o snapshot della configurazione, stati per tentativi/esito/pausa, retry limitati e coda degli errori, query limitate e ordinate. Per ACTIVITY_OVERDUE scegliere tra evento singolo per scadenza e promemoria periodico dichiarato.

### [P2] A04 — il log può mostrare successo senza azioni eseguite

**Riprodotto, 3 prove.** Se manca destinatario o template, l'azione restituisce una stringa SKIP ma l'esecuzione termina SUCCESS (`workflow-engine.ts:84`, `:246`). WAIT crea la coda ma non registra la pausa né i passi già eseguiti (`:258`). Il Test è una validazione e scrive comunque una `WorkflowExecution` SUCCESS (`workflows.ts:268`), aumentando conteggio e ultima esecuzione.

`getWorkflowLogs:86` conta le righe di log come passi (inclusi inizio/fine) e cerca l'errore nel payload, mentre il motore lo scrive nei log: l'utente non vede una diagnosi utile. **Chiusura:** distinguere validazione/esecuzione, SUCCESS/FAILED/SKIPPED/PAUSED e risultati per passo, esporre errore e coda. Il test di configurazione va chiamato “Valida”, con un collaudo separato su dati di prova.

### [P2] A05 / A06 — responsabili errati nei workflow

**Riprodotti.** LEAD_CREATED non contiene owner (`workflow-engine.ts:29`); l'esecutore usa `""` per attività/notifiche, incompatibile con il riferimento obbligatorio all'utente. L'email verso contact non ha un contatto da risolvere su questo evento. ASSIGN_OWNER aggiorna l'entità ma non il responsabile passato agli step successivi: notifiche e attività vanno al precedente (`workflow-engine.ts:129`, `:148`).

**Chiusura:** payload con contesto coerente del lead e fallback validato nell'organizzazione; aggiornamento del contesto dopo riassegnazione o destinatari espliciti per passo.

### [P2] A09 — WAIT esiste nel motore ma non è disponibile nel builder

`WorkflowConfig.ts:25` disabilita WAIT. La coda viene ripresa dal cron giornaliero delle **02:00 UTC** (`vercel.json:17`): un termine può essere servito quasi 24 ore dopo, oltre agli eventuali arretrati. Il cron ogni 15 minuti gestisce webhook e campagne, non workflow. Il messaggio di validazione “delay ignorati” è obsoleto rispetto alla coda reale.

**Chiusura:** rendere configurabili le attese solo insieme a un worker con frequenza/garanzie dichiarate, mostrare la prossima ripresa, correggere la guida. La creazione di un'attività con scadenza +3 giorni è immediata: non equivale a sospendere il workflow per 3 giorni.

### [P2] P01 / P02 — limiti di piano aggirabili

**P01 riprodotto:** con 500 contatti Starter, `convertLead` crea il 501° (`leads.ts:706`). `createContact` e POST API contatti contano e inseriscono in operazioni separate; lo stesso avviene per pipeline (`pipeline.ts:145`). Il superamento per concorrenza è un rischio statico, non un test di carico eseguito. L'import contatti usa invece una transazione Serializable.

**P02 da codice:** `mailer.ts:80` sceglie SMTP se verificato, senza piano; `smtp.ts:82` verifica solo il salvataggio. Dopo downgrade le email ordinarie possono continuare a usare il canale Pro.

**Chiusura:** politica unica delle quote, applicata dentro transazioni per tutti i percorsi; diritto SMTP ricontrollato quando si sceglie il canale, con comportamento del downgrade comunicato al cliente.

### [P2] B02 — stato abbonamento e presentazione non coerenti

`handleSubscriptionDeleted` aggiorna per sola organizzazione, senza verificare la corrispondenza con l'abbonamento attuale. Un evento ritardato su un vecchio abbonamento può revocare il nuovo; gli update non sono ordinati o riconciliati con lo stato attuale Stripe. Gli upsert portano ogni abbonamento attivo con metadata dell'organizzazione a PRO senza una mappa Price ID → piano e non aggiornano `stripeCurrentPeriodEnd` (`webhook/route.ts:16`, `:38`).

`BillingClient.tsx:31` considera Pro solo PRO/ENTERPRISE: i tre vecchi piani paganti sono mostrati Starter, ed Enterprise è etichettato Pro. I dati di rinnovo non vengono alimentati dal webhook. **Chiusura:** riconciliazione per customer/subscription attuali, mappa prodotti/prezzi, aggiornamento periodo e stessa normalizzazione dei piani in UI/server. Collaudo Stripe in modalità test con duplicati, fuori ordine, rinnovo, cancellazione e riabbonamento. Nessun abbonamento Stripe collegato è presente nel DB osservato, quindi non si sta segnalando un cliente effettivamente addebitato male.

### [P2] H01 / H02 / H03 — funzioni pubblicizzate più ampie del prodotto

**H01 tracking ordinario riprodotto:** `emails.ts:139` passa al mailer solo il corpo HTML; il motore workflow fa lo stesso. La presenza dei campi tracking nel modello Email non inietta pixel o link e non prova che siano usati.

**H02 report personalizzati:** `reports.ts:22` e la pagina report offrono aggregazioni fisse e quattro periodi comuni a tutti i piani, senza un costruttore o salvataggio di report. **H03 SSO:** provider Credentials e nessun percorso SAML/SSO. Queste funzioni vanno implementate o tolte dalla promessa corrente; per API dedicata e supporto Enterprise serve una definizione del servizio.

### [P2] C01 — disattivazione prodotto solo apparente

**Riprodotto.** `products.ts:143` restituisce successo senza scrivere nulla. `ProductsTable.tsx:192` aggiorna lo stato locale e mostra “Prodotto disattivato”; ricaricando ricompare attivo. Il commento “isActive not in schema” è superato: il campo è presente e letto da `mapProduct`.

**Chiusura:** aggiornamento server autenticato e vincolato all'organizzazione; conferma dal dato persistito; verifica dopo ricaricamento e nelle scelte dei prodotti associabili.

### [P2] C02 — report economici e funnel non sempre attendibili

**Lettura delle query/calcoli** (`reports.ts:32`, `:64`, `:92`; `reports/page.tsx:27`). Le query non leggono la valuta e sommano gli importi, mentre l'interfaccia li etichetta tutti in euro. Gli affari DELETED entrano nel totale usato come denominatore della conversione e nel funnel. Il grafico pipeline del trend usa una query basata su `closedAt`, che normalmente esclude gli affari aperti senza chiusura. Il KPI dei vinti del periodo parte da `createdAt`, escludendo affari creati prima ma chiusi nel periodo, senza spiegare una semantica di coorte.

**Chiusura:** definizione esplicita dei KPI, esclusione eliminati, separazione valute o cambio documentato, query distinte per stock aperto e chiusure. Aggiungere fixture con affare vecchio vinto oggi, eliminato, affare aperto senza chiusura e valute diverse. I test ordinari `reporting.test.ts` esercitano `lib/reporting`, non questo server action: il loro verde non verifica questi calcoli.

## Automazioni: matrice operativa

### Trigger

| Trigger | Collegamento nel codice | Limiti attuali |
| --- | --- | --- |
| DEAL_CREATED | Creazione manuale affare | API e conversione non equivalenti; avvio non atteso |
| DEAL_STAGE_CHANGED | Drag & drop | Modifica dal form senza stesso evento; filtri fase non configurabili dal builder |
| DEAL_WON | Modifica singola dello stato | Operazione massiva/API senza evento |
| DEAL_LOST | Modifica singola dello stato | Operazione massiva/API senza evento |
| DEAL_VALUE_CHANGED | Modifica singola del valore | Filtro soglia non configurabile dal builder; confronta nuovo valore, non attraversamento della soglia; una modifica contemporanea a WON/LOST privilegia l'evento di stato |
| CONTACT_CREATED | Creazione singola | Import/API/conversione senza lo stesso evento |
| LEAD_CREATED | Creazione singola lead | Mancano responsabile e contatto nel payload per le azioni più utili |
| ACTIVITY_OVERDUE | Cron giornaliero | Ripetizione, limite globale 50 e nessuna deduplicazione |
| Affare senza attività da 7 giorni | Nessuno | La FAQ descrive una funzione assente; diverso da un'attività già esistente e scaduta |

### Azioni

| Azione | Motore | Builder / esito |
| --- | --- | --- |
| SEND_EMAIL | Invio reale tramite mailer, errore provider intercettato | Template selezionabile, destinatario fissato al contatto; skip registrati come successo; niente tracking/storico Email del workflow |
| CREATE_ACTIVITY | Inserisce l'attività con scadenza | Solo CALL dal builder; lead senza owner invalido; subject non personalizzato tramite variabili |
| UPDATE_DEAL_STAGE | Aggiorna `stageId` | Selettore assente, valore iniziale vuoto; controlli organizzazione/pipeline mancanti; non emette a sua volta evento di fase |
| ASSIGN_OWNER | Controlla utente nell'organizzazione e assegna deal/contact | Selettore assente; contesto successivo mantiene vecchio owner; non assegna direttamente il lead |
| SEND_NOTIFICATION | Inserisce notifica leggibile dalla UI | Solo owner, non tutto il team; aggiornamento contatore ogni 60 s; lead senza owner invalido |
| WAIT | Accoda i passi successivi | Disabilitata dal builder, ripresa giornaliera, log pausa assente |

Variabili: nel motore `{{nome}}` e `{{deal}}` vengono entrambe sostituite con l'etichetta dell'entità. Su un affare `{{nome}}` diventa il titolo della trattativa, non il nome del destinatario. Le campagne usano invece una personalizzazione diversa, con nome/cognome/email del contatto. Uniformare e documentare i dizionari disponibili per evento.

## Riscontro operativo del database

Lettura conclusa alle **08:16:51 Europe/Rome** (`2026-09-07T06:16:51.797Z`). Fonte: connessione già presente in `.env.local`, identificata dalla documentazione del progetto come produzione; nessuna credenziale inclusa.

| Dato aggregato | Risultato |
| --- | --- |
| Organizzazioni | 13: 10 STARTER, 2 FREE, 1 PRO |
| Workflow | 1 totale, 0 attivi |
| WorkflowExecution | 0 righe |
| WorkflowQueue | 0 righe, 0 in scadenza |
| SMTP | 0 configurazioni |
| Abbonamenti Stripe collegati | 0 |
| Campagne | 1 con stato SENT |

Lo stato SENT isolato non dimostra consegna, apertura o clic. Il registro precedente documenta che tale campagna precede le correzioni mail. La precedente attivazione Resend e Redis in produzione è documentata in `LAVORI_SVOLTI.md` e nei commit recenti; non è stata ripetuta una prova di invio in questa sessione.

Nel file locale mancano configurazioni Resend, cron e Stripe, mentre DB/CA/OpenRouter sono presenti. **Le variabili locali non dimostrano assenza o presenza delle corrispondenti variabili su Vercel**: non è stata letta la configurazione live Vercel. In particolare il calendario in `vercel.json` dimostra l'intenzione di schedulazione, non un'esecuzione cron riuscita in produzione.

Lo script chiamato `backup` genera statistiche aggregate e un'email di riepilogo: non produce un backup ripristinabile. Il backup `pg_dump` e le migrazioni già applicate rimangono quelli documentati nelle revisioni precedenti. Nessuna migrazione è stata eseguita durante questo audit.

## Verifiche riproducibili e file

| Verifica | Esito di questa sessione |
| --- | --- |
| `npm run test:unit` | 139/139, 12 file |
| `npx tsc --noEmit` | Superato |
| `npm run lint` | Superato sul codice iniziale; controllo finale anche sui nuovi file |
| Suite di audit | 21 prove, 4 superate, 17 fallite per assertion di comportamento; nessun errore di import/setup |
| Browser home | Contenuti pubblici, schede piani e accessibilità controllati; vista desktop e 390 px |
| Query aggregate | Concluse con TLS verificato e transazione READ ONLY |

Esecuzione delle sole specifiche di audit:

```powershell
npx vitest run --config vitest.audit.config.ts
```

Il JSON AUDIT conserva il risultato iniziale (4/21). Le vecchie prove con mock poco profondi sono state sostituite da test di regressione con PostgreSQL temporaneo, azioni reali del CRM e servizi esterni simulati. Il comando attuale è `npm run test:integration`; il risultato aggiornato si trova in `CORREZIONI-2026-09-07-integration.json`. Il vecchio comando audit resta un alias alla stessa suite; non sovrascrivere il JSON storico. Per H01 è stata corretta la promessa commerciale e aggiunta una verifica UI della home.

Per ripetere i soli conteggi, con connessione e CA già configurate:

```powershell
node tests/audit/production-readonly.mjs
```

File aggiunti:

- `docs/REVISIONE-CODICE-HOME-PIANI-2026-09-07.md`: questo rapporto, matrice e attività residue.
- `docs/AUDIT-2026-09-07-tests.json`: risultato delle 21 prove e relativi errori, privo di dati reali.
- `tests/audit/crm-review.test.ts`: prove isolate su engine, server actions, limiti, mail, catalogo e webhook Stripe.
- `tests/audit/production-readonly.mjs`: controllo DB aggregato ripetibile, senza scritture.
- `vitest.audit.config.ts`: configurazione separata per le specifiche di audit.

File aggiornati: `docs/REVISIONE-CRM-2026-09-05.md` (collegamento al nuovo audit e chiarimento dello storico rilascio) e `docs/LAVORI_SVOLTI.md` (registro della sessione).

**Alla conclusione del solo audit iniziale non erano stati modificati file applicativi. Le correzioni successive sono elencate nel rapporto aggiornato collegato in apertura.**

## Priorità individuate nell’audit iniziale (ora trattate dalle correzioni)

1. **Integrità e autorizzazioni:** A02, R01/R02/R03; chiudere i percorsi tra organizzazioni e l'estensione dei privilegi.
2. **Abbonamenti e quote:** B01/B02, A01, P01/P02; testare tutti i percorsi con Starter, Pro, Enterprise e piani storici, inclusi downgrade e richieste concorrenti.
3. **Automazioni utilizzabili:** A03/A05/A06; completare builder, payload e variabili, con workflow di esempio costruiti davvero dall'interfaccia.
4. **Esecuzione affidabile:** A07/A08/A09/A04; eventi comuni, coda durevole, presa in carico atomica, deduplicazione, errori visibili e retry.
5. **Veridicità prodotto e home:** H01/H02/H03, C01/C02 e accessibilità prezzi. Pubblicizzare solo le funzioni collaudate, esplicitare servizi Enterprise e natura delle demo.
6. **Collaudo prima del rilascio:** due organizzazioni di prova, tutti i ruoli/piani, test Stripe, recapiti email di test, trigger da UI/API/import/bulk, attese e guasti simulati; passaggio delle specifiche qui fallite. Poi verifica operativa di scheduler, segreti, invii e monitoraggio nell'ambiente di destinazione.

Per i professionisti e le microimprese la priorità è un percorso affidabile **richiesta → preventivo → richiamo → incarico → scadenza/incasso**, prima di ampliare ulteriormente il catalogo delle promesse.
