# Pipely — correzioni di codice, home, piani e automazioni

Data: 7 settembre 2026. Base Git: ba67b0e. Target: liberi professionisti e microimprese.

Le anomalie dell’audit sono state corrette nel codice locale. La nuova migrazione è stata verificata su un database di prova temporaneo; **non è stata applicata in produzione e il nuovo codice non è stato pubblicato**. Lo storico dell’audit iniziale rimane in REVISIONE-CODICE-HOME-PIANI-2026-09-07.md e nel JSON AUDIT-2026-09-07-tests.json.

## Problemi trattati

| Riferimento audit | Correzione implementata |
| --- | --- |
| B01/B02 — Stripe e abbonamenti | Piano e marker evento salvati nella stessa transazione. Gli errori rimangono ritentabili, un duplicato è riconosciuto solo dal marker completato. Lock per organizzazione e lettura dello stato corrente Stripe impediscono che vecchi eventi sovrascrivano un abbonamento più recente. Prezzi sconosciuti rifiutati, fine periodo aggiornata. Checkout aperti riutilizzati, richieste idempotenti e prezzo mensile verificato contro €29. UI comune per piani legacy e Enterprise; piani manuali indirizzati al supporto. |
| R01/R03 — permessi | I ruoli sono riletti dal database. Viewer non può scrivere nei flussi CRM; gestione workflow e configurazioni riservata ai ruoli competenti. API key, SMTP, inviti e webhook riservati a Owner/Admin. Una chiave perde i permessi quando il creatore viene declassato o spostato. Nessun invito può conferire il ruolo Owner. Anche incassi e modifica delle fatture controllano il ruolo attuale. |
| R02/A02 — organizzazioni e riferimenti | Email e bozze verificano contatto/affare; la lettura non espone relazioni email esterne preesistenti. Conversione lead controlla il prodotto anche con prezzo esplicito e rifiuta valute incompatibili. Workflow verifica fasi, pipeline, template e responsabili sia al salvataggio sia durante l’esecuzione. |
| A01/P01/P02 — piani e quote | Creazione contatti, importazioni, conversione e API contano e scrivono nella stessa transazione Serializable, con retry dei conflitti. Stesso principio per le pipeline. Modifica/attivazione/validazione/ripresa dei workflow e invio SMTP controllano il piano attuale. Downgrade da Stripe o admin disattiva workflow e sospende lavori in attesa. Campagne non modificabili su Starter. |
| A03/A09 — builder | Selettori di fase e responsabile, filtri da/a, soglia, tipo attività, destinatario e attesa configurabili. Validazione condivisa client/server, ID azioni univoci, configurazioni incomplete rifiutate. I filtri salvati restano visibili anche dopo il caricamento asincrono delle opzioni. |
| A04 — registro | Stati distinti per coda, esecuzione, attesa, sospensione, successo, errore e passi saltati. Dettagli dei passi ed errori visibili. “Valida configurazione” non esegue azioni né incrementa i contatori delle esecuzioni. Registro aggiornato ogni 15 secondi quando aperto. |
| A05/A06 — responsabili | I lead creati/importati hanno un responsabile. Contesto lead e variabili email disponibili; dopo un’assegnazione i passi successivi usano il nuovo responsabile. |
| A07 — eventi | Creazione e modifiche di affari, contatti e lead accodano eventi nella transazione del dato, inclusi form, drag and drop, stato in blocco, API e conversione. Una modifica può generare sia cambio stato sia cambio valore. Le importazioni generano eventi solo per workflow con opzione esplicita attiva. |
| A08 — esecuzione affidabile | Presa in carico atomica, lease, configurazione congelata, checkpoint transazionali per ogni azione sul database, ripresa da checkpoint e lavori falliti conservati. Attività scadute deduplicate per scadenza, scansione a lotti senza bloccare per sempre i record oltre il cinquantesimo. |
| H01/H02/H03 — promesse commerciali | Tracking limitato alle campagne e indicato come misura approssimativa. Rimossi SSO/SAML, report personalizzati, API dedicata, prezzo barrato e offerta annuale non implementata. Schede piani condivise, quota Lead Finder visibile, CTA Pro esplicita sulla registrazione. Esempi e demo dichiarati, menu mobile e funzioni escluse accessibili. Guida aggiornata nei passaggi pertinenti. |
| C01 — prodotti | L’attivazione/disattivazione viene persistita nel database. |
| C02 — report | Vinti e persi selezionati per data di chiusura, eliminati esclusi, win rate calcolato sui chiusi. Pipeline e funnel basati sugli aperti correnti. Valuta selezionabile, separata in KPI, grafici e CSV. Risposte obsolete non sovrascrivono una selezione successiva; in caso di errore non vengono mostrate o esportate vecchie metriche con la nuova valuta e viene proposta la ripetizione della richiesta. |
| Ulteriore difetto emerso | L’API di creazione lead valorizza a oggetto vuoto i dati opzionali assenti, evitando l’errore Prisma. Il dispatcher interno dei webhook è stato rimosso dal modulo RPC “use server”. Nella fusione di più duplicati, il messaggio intermedio appare dentro il pannello: su mobile il toast copriva il pulsante per la seconda unione. |

## Come funzionano ora le automazioni

1. La modifica CRM e i lavori delle automazioni vengono salvati insieme; se l’accodamento fallisce, la modifica viene annullata.
2. Il worker viene richiamato dopo la risposta per ridurre l’attesa. Un cron dedicato ogni 5 minuti recupera comunque i lavori persistiti, le attese scadute e le attività in ritardo.
3. I passi salvati al momento dell’evento non cambiano quando viene modificato il workflow. Azione sul database e avanzamento del passo vengono confermati nella stessa transazione.
4. Gli errori temporanei possono essere ritentati dal passo incompleto. Gli invii email interrotti o incerti vengono fermati e richiedono verifica prima della ripresa manuale.
5. La disattivazione o il downgrade sospendono il lavoro. Riattivare il workflow e premere “Riprendi dal passo interrotto” per ripartire; il sistema non riavvia automaticamente vecchi invii dopo un cambio piano.

Le email sono effetti esterni e non possono condividere una transazione PostgreSQL. Resend riceve una chiave idempotente; SMTP non offre la stessa garanzia. Non viene promessa consegna esattamente una volta: un timeout può aver già prodotto un invio. Per questo l’esito incerto resta visibile e la ripresa richiede conferma dopo verifica nel provider. SUCCESS di un invio significa accettazione dal provider, non recapito o lettura.

Importazioni: l’opzione “Esegui anche sui nuovi record importati” è disattivata per default, evitando invii a liste intere senza una scelta esplicita. La scansione e i worker sono limitati per richiesta; con grandi volumi i job rimangono in coda. Le catene generate da automazioni sono limitate a 5 livelli per evitare cicli senza fine.

## Verifiche

- Test unitari: 156 superati, inclusi prezzi, piani legacy, permessi attuali, chiavi API e downgrade SMTP.
- Integrazione: 27 prove superate con Prisma e PostgreSQL PGlite temporaneo, senza leggere DATABASE_URL o .env.local. Applicato l’intero storico SQL, inclusa la nuova migrazione con una vecchia attesa e una validazione preesistenti. Verificati rollback reali tramite vincoli SQL, checkpoint, coda, importazioni, conversioni, quote, API, report e webhook Stripe.
- UI: 28 prove superate su desktop e mobile, inclusi builder, registro errori, piani legacy, home, importazione, fusione contatti e incassi. Verifica visiva delle schermate della fixture con font di fallback locale; dopo il suo allineamento, ripetute e superate anche le 6 prove mirate di home, builder e fusione su entrambi i dispositivi (non conteggiate come nuovi casi).
- TypeScript, lint e validazione Prisma: superati senza errori. Build di produzione locale completata con exit code 0, incluse 107 pagine generate e la nuova rotta /api/cron/workflows. Il consueto avviso sul runtime Edge indica che le relative pagine sono dinamiche; non è un errore di build.

Il collaudo PGlite usa un pool di una connessione per evitare collisioni di protocollo nel server embedded. Le dipendenze di questo collaudo sono dichiarate esplicitamente in package.json e nel lockfile, alle versioni già risolte nel progetto. Le chiamate applicative concorrenti vengono esercitate, ma questo non sostituisce prove di contesa tra backend PostgreSQL indipendenti o test di carico. Mailer e Stripe sono simulati; le prove UI montano i componenti reali su dati locali deterministici. Non sono prove di consegna o pagamento in produzione.

Comandi riproducibili:

~~~powershell
npm run test:unit
npm run test:integration
npm run test:ui -- --workers=1 --timeout=60000
npx prisma validate
npx tsc --noEmit
npm run lint
npm run build
~~~

Controllo finale git diff --check superato. Risultati macchina: CORREZIONI-2026-09-07-tests.json e CORREZIONI-2026-09-07-integration.json. La suite audit è mantenuta come alias della regressione integrata. Il JSON AUDIT iniziale conserva i precedenti 4 successi e 17 fallimenti.

## Da fare per il rilascio

- Applicare la migrazione 20260907090000_workflow_reliability e pubblicare insieme il nuovo worker e i produttori di eventi. Lo schema è additivo, ma i nuovi campi obbligatori della coda richiedono un passaggio coordinato: sospendere le vecchie esecuzioni durante migrazione e deploy. Salvare prima un backup e l’elenco dei workflow attivi da riattivare. Il comando Vercel esistente esegue già migrate deploy prima della build; non lanciare db push sul database reale.
- Verificare nell’ambiente di destinazione CRON_SECRET, esecuzione del nuovo cron ogni 5 minuti, durata delle funzioni e disponibilità del servizio di pianificazione. La presenza in vercel.json non prova che il cron sia già operativo.
- Verificare STRIPE_PRO_PRICE_ID, chiave e firma webhook. Il prezzo deve essere attivo, EUR 2900 centesimi, mensile e a quantità fissa. Eseguire un ciclo in modalità Stripe test con attivazione, retry, cancellazione e ritorno a Starter.
- Collaudare su recapiti di prova il provider della piattaforma e SMTP verificato: consegna, rifiuto, attesa, ripresa dopo errore e downgrade. Questi invii non sono stati effettuati durante la correzione.
- Ripetere i casi di contesa su PostgreSQL con più connessioni e carico rappresentativo; calibrare capacità dei worker, conservazione dei log e monitoraggio della coda.

In questa sessione non sono stati eseguiti commit, push, deploy o migrazioni di produzione. Le precedenti migrazioni di incassi, candidati e consegne campagne e le configurazioni Resend/Redis già rilasciate rimangono nello storico; non sono tornate pendenti.

## File modificati e aggiunti

L’inventario seguente comprende le correzioni applicative, i test e la documentazione rispetto alla base Git indicata, escludendo il JSON dell’audit iniziale e lo script read-only preesistente.

Totale: 92 file rispetto alla base indicata. M = modificato; A = aggiunto. Il rapporto audit e i due indici di revisione comprendono anche lo storico precedente alle correzioni.

| Stato | File |
| --- | --- |
| A | [docs/CORREZIONI-2026-09-07-integration.json](../docs/CORREZIONI-2026-09-07-integration.json) |
| A | [docs/CORREZIONI-2026-09-07-tests.json](../docs/CORREZIONI-2026-09-07-tests.json) |
| A | [docs/CORREZIONI-CRM-2026-09-07.md](../docs/CORREZIONI-CRM-2026-09-07.md) |
| M | [docs/LAVORI_SVOLTI.md](../docs/LAVORI_SVOLTI.md) |
| A | [docs/REVISIONE-CODICE-HOME-PIANI-2026-09-07.md](../docs/REVISIONE-CODICE-HOME-PIANI-2026-09-07.md) |
| M | [docs/REVISIONE-CRM-2026-09-05.md](../docs/REVISIONE-CRM-2026-09-05.md) |
| M | [package-lock.json](../package-lock.json) |
| M | [package.json](../package.json) |
| A | [prisma/migrations/20260907090000_workflow_reliability/migration.sql](../prisma/migrations/20260907090000_workflow_reliability/migration.sql) |
| M | [prisma/schema.prisma](../prisma/schema.prisma) |
| M | [src/app/(admin)/admin/organizations/[id]/PlanChanger.tsx](../src/app/(admin)/admin/organizations/%5Bid%5D/PlanChanger.tsx) |
| M | [src/app/(dashboard)/automations/page.tsx](../src/app/(dashboard)/automations/page.tsx) |
| M | [src/app/(dashboard)/billing/BillingClient.tsx](../src/app/(dashboard)/billing/BillingClient.tsx) |
| M | [src/app/(dashboard)/billing/page.tsx](../src/app/(dashboard)/billing/page.tsx) |
| M | [src/app/(dashboard)/reports/page.tsx](../src/app/(dashboard)/reports/page.tsx) |
| M | [src/app/(dashboard)/settings/page.tsx](../src/app/(dashboard)/settings/page.tsx) |
| M | [src/app/api/auth/register/route.ts](../src/app/api/auth/register/route.ts) |
| M | [src/app/api/cron/backup/route.ts](../src/app/api/cron/backup/route.ts) |
| M | [src/app/api/cron/process-webhooks/route.ts](../src/app/api/cron/process-webhooks/route.ts) |
| A | [src/app/api/cron/workflows/route.ts](../src/app/api/cron/workflows/route.ts) |
| M | [src/app/api/stripe/checkout/route.ts](../src/app/api/stripe/checkout/route.ts) |
| M | [src/app/api/stripe/webhook/route.ts](../src/app/api/stripe/webhook/route.ts) |
| M | [src/app/api/v1/contacts/route.ts](../src/app/api/v1/contacts/route.ts) |
| M | [src/app/api/v1/deals/[id]/route.ts](../src/app/api/v1/deals/%5Bid%5D/route.ts) |
| M | [src/app/api/v1/deals/route.ts](../src/app/api/v1/deals/route.ts) |
| M | [src/app/api/v1/leads/route.ts](../src/app/api/v1/leads/route.ts) |
| M | [src/app/crm-per-agenzie/page.tsx](../src/app/crm-per-agenzie/page.tsx) |
| M | [src/app/page.tsx](../src/app/page.tsx) |
| M | [src/components/automations/AutomationLogView.tsx](../src/components/automations/AutomationLogView.tsx) |
| M | [src/components/automations/WorkflowBuilder.tsx](../src/components/automations/WorkflowBuilder.tsx) |
| M | [src/components/automations/WorkflowCard.tsx](../src/components/automations/WorkflowCard.tsx) |
| M | [src/components/automations/WorkflowConfig.ts](../src/components/automations/WorkflowConfig.ts) |
| M | [src/components/charts/FunnelChart.tsx](../src/components/charts/FunnelChart.tsx) |
| M | [src/components/charts/TopPerformersTable.tsx](../src/components/charts/TopPerformersTable.tsx) |
| M | [src/components/charts/TrendChart.tsx](../src/components/charts/TrendChart.tsx) |
| M | [src/components/contacts/MergeDuplicatesModal.tsx](../src/components/contacts/MergeDuplicatesModal.tsx) |
| M | [src/components/shared/UpgradeModal.tsx](../src/components/shared/UpgradeModal.tsx) |
| M | [src/lib/api-auth.ts](../src/lib/api-auth.ts) |
| A | [src/lib/crm-permissions.ts](../src/lib/crm-permissions.ts) |
| M | [src/lib/crm-references.ts](../src/lib/crm-references.ts) |
| A | [src/lib/crm-transaction.ts](../src/lib/crm-transaction.ts) |
| M | [src/lib/guide-data.ts](../src/lib/guide-data.ts) |
| M | [src/lib/mailer.ts](../src/lib/mailer.ts) |
| M | [src/lib/plan-client.ts](../src/lib/plan-client.ts) |
| M | [src/lib/plan.ts](../src/lib/plan.ts) |
| A | [src/lib/report-metrics.ts](../src/lib/report-metrics.ts) |
| M | [src/lib/smtp-send.ts](../src/lib/smtp-send.ts) |
| M | [src/lib/stripe.ts](../src/lib/stripe.ts) |
| A | [src/lib/webhook-delivery.ts](../src/lib/webhook-delivery.ts) |
| M | [src/lib/workflow-engine.ts](../src/lib/workflow-engine.ts) |
| A | [src/lib/workflow-events.ts](../src/lib/workflow-events.ts) |
| A | [src/lib/workflow-schema.ts](../src/lib/workflow-schema.ts) |
| A | [src/lib/workflow-validation.ts](../src/lib/workflow-validation.ts) |
| A | [src/lib/workflow-wake.ts](../src/lib/workflow-wake.ts) |
| M | [src/server/actions/activities.ts](../src/server/actions/activities.ts) |
| M | [src/server/actions/admin.ts](../src/server/actions/admin.ts) |
| M | [src/server/actions/billing-types.ts](../src/server/actions/billing-types.ts) |
| M | [src/server/actions/bookings.ts](../src/server/actions/bookings.ts) |
| M | [src/server/actions/campaigns.ts](../src/server/actions/campaigns.ts) |
| M | [src/server/actions/chat-widget.ts](../src/server/actions/chat-widget.ts) |
| M | [src/server/actions/contacts.ts](../src/server/actions/contacts.ts) |
| M | [src/server/actions/crm-mode.ts](../src/server/actions/crm-mode.ts) |
| M | [src/server/actions/custom-fields.ts](../src/server/actions/custom-fields.ts) |
| M | [src/server/actions/deals.ts](../src/server/actions/deals.ts) |
| M | [src/server/actions/emails.ts](../src/server/actions/emails.ts) |
| M | [src/server/actions/invoice-workspace.ts](../src/server/actions/invoice-workspace.ts) |
| M | [src/server/actions/invoices.ts](../src/server/actions/invoices.ts) |
| M | [src/server/actions/lead-finder.ts](../src/server/actions/lead-finder.ts) |
| M | [src/server/actions/leads.ts](../src/server/actions/leads.ts) |
| M | [src/server/actions/pipeline.ts](../src/server/actions/pipeline.ts) |
| M | [src/server/actions/products.ts](../src/server/actions/products.ts) |
| M | [src/server/actions/reports.ts](../src/server/actions/reports.ts) |
| M | [src/server/actions/settings.ts](../src/server/actions/settings.ts) |
| M | [src/server/actions/smtp.ts](../src/server/actions/smtp.ts) |
| M | [src/server/actions/surveys.ts](../src/server/actions/surveys.ts) |
| M | [src/server/actions/webhooks.ts](../src/server/actions/webhooks.ts) |
| M | [src/server/actions/workflows.ts](../src/server/actions/workflows.ts) |
| M | [src/types/workflows.ts](../src/types/workflows.ts) |
| A | [tests/audit/crm-review.test.ts](../tests/audit/crm-review.test.ts) |
| A | [tests/integration/crm-fixes.test.ts](../tests/integration/crm-fixes.test.ts) |
| A | [tests/integration/database.ts](../tests/integration/database.ts) |
| M | [tests/ui/fixture/actions.ts](../tests/ui/fixture/actions.ts) |
| M | [tests/ui/fixture/main.tsx](../tests/ui/fixture/main.tsx) |
| A | [tests/ui/workflows-home.spec.ts](../tests/ui/workflows-home.spec.ts) |
| M | [tests/unit/crm-actions.test.ts](../tests/unit/crm-actions.test.ts) |
| M | [tests/unit/crm-api.test.ts](../tests/unit/crm-api.test.ts) |
| M | [tests/unit/invoices.test.ts](../tests/unit/invoices.test.ts) |
| M | [tests/unit/mailer.test.ts](../tests/unit/mailer.test.ts) |
| A | [tests/unit/plans-permissions.test.ts](../tests/unit/plans-permissions.test.ts) |
| M | [vercel.json](../vercel.json) |
| A | [vitest.audit.config.ts](../vitest.audit.config.ts) |
| A | [vitest.integration.config.ts](../vitest.integration.config.ts) |
