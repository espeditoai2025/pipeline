# Verifica e rilascio degli incassi

Il codice è pronto per la prova su un database dedicato. La revisione non ha eseguito migrazioni, invii o modifiche sui dati reali.

**Aggiornamento del 5 settembre 2026, sera: lavoro ripreso su richiesta dell'utente con un collaudo su PostgreSQL locale** (sezione dedicata sotto). Nessuna migrazione e nessun deploy sui dati reali, che restano irraggiungibili senza credenziali. Per risultati, attività da riprendere e inventario dei file consultare [la revisione completa](REVISIONE-CRM-2026-09-05.md).

## Tentativo di esecuzione del 5 settembre 2026

Su richiesta dell'utente è stato avviato il controllo `npx prisma migrate status`. Il comando si è fermato prima della connessione con `Connection url is empty`: sia `DIRECT_URL` sia `DATABASE_URL` risultano vuote in `.env.local` e nel processo. Non sono state trovate configurazioni alternative del database nei file ambiente del progetto. Il progetto Vercel è collegato, ma non è disponibile un'autenticazione CLI e il browser mostra la pagina di login.

La migrazione non è stata applicata e nessun dato è stato modificato. Alla ripresa del lavoro occorrerà configurare `DIRECT_URL` nel file ambiente locale oppure rendere disponibile l'accesso al progetto Vercel. Il tentativo era autorizzato ed è stato impedito dalla connessione mancante; la successiva richiesta dell'utente ha messo il lavoro in pausa.

## Collaudo su PostgreSQL locale del 5 settembre 2026

Eseguito dopo la sospensione, su richiesta dell'utente, con un container Docker `postgres:17-alpine` vuoto e dati di prova: 2 organizzazioni, 4 utenti (proprietario, venditore, lettore, proprietario di un'altra organizzazione), 36 fatture in EUR e USD negli stati PAID, SENT, DRAFT e CANCELLED. Nessun accesso ai dati reali: `DIRECT_URL`, `DATABASE_URL`, `NEXTAUTH_SECRET` e `NEXTAUTH_URL` restano vuote in `.env.local`.

Procedura e risultati:

1. Le cinque migrazioni precedenti sono state applicate via SQL e registrate con `prisma migrate resolve --applied`, come per un database senza storico. `migrate status` mostrava soltanto `20260905120000_invoice_payments` pendente; `migrate deploy` l'ha applicata e lo schema risulta aggiornato.
2. 98 controlli sui saldi iniziali superati: ogni fattura PAID con totale positivo ha un solo movimento `legacy_<id>` per l'intero totale, metodo `saldo_precedente`, data `paidAt` oppure `updatedAt`, autore uguale al creatore, `paidAmount` uguale al totale. Nessun movimento per fatture a totale zero, SENT, DRAFT o annullate. Numeri, stati, totali, valute e date invariati. Indici presenti; vincolo `amount > 0` e blocco della cancellazione di una fattura con movimenti verificati.
3. 9 prove con le azioni server reali e sola sessione simulata: due incassi simultanei oltre il residuo ne accettano uno; otto acconti concorrenti da 15 su un residuo di 100 ne accettano sei; lo stesso `requestId` inviato tre volte in parallelo e poi in serie produce un solo movimento, e con dati diversi viene rifiutato; acconto, saldo con stato PAID e data dell'ultimo incasso, rettifica che riapre il residuo e resta nello storico; lettore bloccato; altra organizzazione senza lettura né scrittura; bozza dall'affare con scadenza suggerita, invio, incasso, annullamento con progressivo conservato; paginazione a 25 e riepiloghi per valuta uguali alle somme ricalcolate; ogni `paidAmount` uguale alla somma dei movimenti non annullati.
4. Prova autenticata nel browser con `next dev` sul database di prova: dashboard con “La tua giornata”, scadenzario con 42 fatture su due pagine e filtro scadute, incasso di 22 € registrato dal modulo con residuo aggiornato, errore mostrato oltre il saldo, lettore senza pulsanti di scrittura, altra organizzazione che vede solo le proprie fatture e riceve “Pagina non trovata” sul dettaglio altrui.

Note operative emerse:

- Se il baseline è incompleto, `migrate deploy` fallisce con P3018 sulla migrazione già presente nello schema. Recupero: `prisma migrate resolve --rolled-back <nome>` seguito da `--applied <nome>`, poi di nuovo `migrate deploy`. Sul database reale controllare `migrate status` prima del deploy.
- Le colonne di data sono `TIMESTAMP(3)` senza fuso: Prisma scrive e legge in UTC. Inserimenti manuali con `psql` o con oggetti `Date` locali spostano l'ora; usare valori UTC.
- Un'organizzazione senza `crmMode` viene portata alla pagina di setup prima della dashboard: negli ambienti di prova impostare la modalità o completare il setup.
- Il dettaglio di una fattura non accessibile risponde HTTP 200 con corpo “Pagina non trovata”, per via dello streaming di Next: nessun dato esposto, ma i controlli automatici devono verificare il contenuto e non lo stato HTTP.
- Il server di sviluppo richiede `AUTH_SECRET` o `NEXTAUTH_SECRET`: senza, Auth.js registra `MissingSecret` e il login non funziona.

Gli script del collaudo (fixture, verifica dei saldi, test vitest e controllo browser) sono rimasti fuori dal repository. Con le credenziali reali restano da fare: backup, verifica dello storico Prisma del database di destinazione, ripetizione della procedura su una copia dei dati reali e rilascio.

## Database di produzione (dai log Vercel, 5 settembre 2026)

Verificato con gli strumenti Vercel collegati, in sola lettura e senza accesso ai valori delle variabili. Il progetto `pipeline` in produzione (pipely.it) usa un PostgreSQL Supabase nella regione eu-central-1, raggiunto tramite il pooler `aws-1-eu-central-1.pooler.supabase.com:5432`, database `postgres`. `DIRECT_URL` e `DATABASE_URL` sono configurate su Vercel; `DATABASE_CA_CERT` no, come segnala la build.

- Build del 17 giugno 2026: `migrate resolve --applied 0_init` ha registrato il baseline sul database già esistente.
- Build del 2 settembre 2026 (ultimo deploy, commit 5354372): 5 migrazioni trovate, nessuna pendente. `20260905120000_invoice_payments` non è applicata in produzione.
- Snapshot del cron di backup del 5 settembre 2026 alle 02:00 UTC: 13 organizzazioni, 15 utenti, 6 contatti, 15 affari, 92 lead, 1 campagna. Il numero di fatture non fa parte dello snapshot.
- Nessun errore di database nei log di runtime degli ultimi 7 giorni; l'unico gruppo di errori riguarda il rate limiting Upstash non configurato.

Verifica diretta del 5 settembre 2026 in tarda serata, con le credenziali inserite dall'utente in `.env.local`: PostgreSQL 17.6, `prisma migrate status` coerente con i log di build (5 migrazioni applicate, solo `invoice_payments` pendente). Backup con `pg_dump` in `backups/pipely-prod-20260905.sql` (360 KB, 76 tabelle; cartella ignorata da Git). La tabella `Invoice` è vuota: la migrazione non ha saldi iniziali da trasferire e la finestra tra migrazione e nuovo codice non può produrre incoerenze sulle fatture.

Su Vercel `DATABASE_URL`, `DIRECT_URL` e gli altri segreti sono marcati come "Sensitive": `vercel env pull` restituisce soltanto il segnaposto `[SENSITIVE]` e nemmeno il pannello li mostra. Per sbloccare il lavoro locale le stringhe di connessione vanno prese dal progetto Supabase (Connect → pooler in modalità session per `DIRECT_URL`, transaction per `DATABASE_URL`) e incollate in `.env.local`, insieme alla CA del pooler per `DATABASE_CA_CERT`. Reimpostare la password del database su Supabase invalida anche le variabili su Vercel: farlo solo aggiornandole e rideployando. Prima della migrazione eseguire un backup e controllare `prisma migrate status` sul database reale.

## Migrazione

`20260905120000_invoice_payments` aggiunge `Invoice.paidAmount`, la tabella `InvoicePayment` e gli indici. Le istruzioni sono racchiuse in una transazione.

Ogni fattura esistente in stato `PAID` e con totale positivo riceve un movimento `legacy_<id>` per il totale originale, senza alterarne importo o valuta. Il metodo `saldo_precedente` e il riferimento distinguono questi saldi iniziali dagli incassi registrati dall'utente. La data è `paidAt`, oppure `updatedAt` se la prima non esiste; l'autore è il creatore della fattura. Non ricostruisce la data o l'autore effettivi di un pagamento non registrato dal vecchio sistema. Gli altri stati iniziano con incassato zero.

Non sostituire questa migrazione con `prisma db push`: creerebbe lo schema senza trasferire i saldi esistenti.

## Prova su PostgreSQL

Usare una copia di prova con storico Prisma coerente e credenziali dedicate. Applicare `npx prisma migrate deploy`, quindi generare il client e avviare l'app. Prima e dopo il test confrontare quantità di fatture, importi totali e numero di fatture pagate per organizzazione e valuta.

Verifiche necessarie prima del rilascio:

1. Le fatture pagate prima della migrazione mantengono il saldo zero e mostrano il movimento iniziale. Controllare separatamente eventuali vecchi totali nulli, negativi, valute non valide o relazioni incoerenti.
2. Da due connessioni inviare contemporaneamente due pagamenti che insieme supererebbero il residuo: deve essere ammesso soltanto quanto coperto dal saldo. Ripetere lo stesso `requestId`: un solo movimento.
3. Registrare acconto, saldo e rettifica; verificare i dati dopo il riavvio dell'app e da un secondo utente. Provare date a cavallo di mezzanotte italiana.
4. Provare un utente `VIEWER` e utenti di due organizzazioni, anche chiamando direttamente le azioni server con ID esterni.
5. Controllare che ogni `paidAmount` coincida con la somma dei movimenti non annullati, tenendo conto della precisione della valuta; verificare i riepiloghi con più valute e più di 25 fatture.

Le unit test coprono le regole con un database simulato; le prove UI usano un'app di test senza autenticazione o database. Il client Prisma generato e lo schema sono stati validati, ma questo non sostituisce l'esecuzione di queste prove contro PostgreSQL.

## Produzione

Conservare un backup verificato e controllare lo storico Prisma prima del rilascio. Fermare le vecchie istanze che possono modificare lo stato delle fatture durante il trasferimento dei saldi: il vecchio codice non aggiorna `paidAmount`. Applicare la migrazione e poi avviare la nuova versione. Il comando Vercel applica le migrazioni prima della build; pianificare la transizione per evitare scritture dal vecchio codice nel frattempo.

La CA per la connessione PostgreSQL resta da configurare tramite `DATABASE_CA_CERT`. L'XML precedente è disabilitato; completare dati fiscali, validazione e integrazione col provider prima di ripristinare l'esportazione. Stato “inviata” significa registrazione manuale nel CRM, non una ricevuta del servizio di fatturazione.

Per un eventuale rollback non eliminare i movimenti e non riavviare il vecchio writer senza un piano di riconciliazione: perderebbe la relazione fra incassi, saldo e stato. La migrazione è additiva; lo storico va conservato.
