# Pipely MCP 1.4.2 — previsione aggiornamento attività

## Richiesta e modifica

Riferimento `gobus-pipely-predict-update-activity-20261010`, ricevuto dalla chat «Progettare la crescita AI di GoBus» il 10 ottobre 2026. Pubblicazione autorizzata dalla regola del titolare salvata in `AGENTS.md`.

Lo schema di `pipely_predict_effects` non accettava `update_activity`, pur essendo disponibile lo strumento di aggiornamento. Ora accetta l'operazione e include i possibili workflow attivi `ACTIVITY_OVERDUE` della stessa organizzazione. Non prevede webhook per questo aggiornamento. Il catalogo resta di 35 strumenti per una chiave con scrittura e 15 per una chiave di sola lettura; la previsione è disponibile anche in sola lettura.

L'aggiornamento reale non accoda workflow/webhook e non invia email direttamente. Una scadenza modificata azzera `workflowOverdueAt`: la scansione successiva può accodare un workflow se l'attività è aperta, scaduta entro la finestra corrente di 30 giorni e non già elaborata per quella scadenza. `maySendEmail` include prudenzialmente gli invii futuri dei workflow. La previsione riguarda il tipo di operazione, non l'idoneità di un singolo record. Configurazione troncata o successivamente modificata limita le conclusioni.

Nessuna migrazione, nuova dipendenza, nuova chiave, invio email/SMS o modifica a record CRM GoBus durante questo intervento. La sincronizzazione strutturata dei dati resta gestita dalla chat GoBus.

## Verifiche locali

- 56 test mirati, poi regressioni complete: 187 test unitari e 115 test di integrazione passati, con database locale in memoria e provider simulati.
- Cinque nuovi test: contratto SDK/HTTP e accesso in sola lettura; compatibilità `create_activity`; isolamento e workflow inattivi; effetto futuro verificato con la scansione reale sul database simulato senza eseguire invii; configurazione troncata e limiti del piano.
- TypeScript senza errori. ESLint senza errori, con un avviso preesistente in `scripts/check-mcp-production.mjs` per `console.log`.
- Diff verificato. Preservate fuori dal commit le modifiche PcsMail preesistenti a `AGENTS.md` e lo script diagnostico locale `scripts/inspect-gobus-crm.mjs`.
- Build Next.js 16.2.6 completata: 113 pagine. Avviso preesistente sul runtime edge; nessun errore. Queste verifiche locali non confermano il comportamento in produzione.

## Produzione

Prima del rilascio, remoto `origin/main` a `4bac6eb53e2e1b861535804285d9aa0702b10fdc`, alias `www.pipely.it` sul deployment READY `dpl_29iMGM2SoveKoqDTnpxW2hqGUpoW`; nessun deployment concorrente nell'elenco del progetto Pipeline.

Nuovo commit, deployment e comportamento online da registrare dopo la pubblicazione effettiva. La verifica autenticata userà la connessione GoBus esistente, in sola lettura, senza creare fixture in produzione.
