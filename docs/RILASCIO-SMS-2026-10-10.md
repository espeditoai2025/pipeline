# Pipely — storico SMS MCP 1.4.1, 10 ottobre 2026

## Autorizzazione e stato

Il titolare ha autorizzato «una volta controllato fai pubblicare, salvala come regola» nella chat «Progettare la crescita AI di GoBus», istruzione letta e verificata il 10 ottobre. Riferimento `gobus-saas-publish-after-checks-20261010`. Regola salvata in `AGENTS.md`, con preservazione delle istruzioni preesistenti e limiti per invii, acquisti, chiavi, protezioni, schede clienti e migrazioni irreversibili.

Controlli locali completati, commit applicativo `6b7c7148bee0030c6c57db3dc1670c5b80af1bc0` pronto. Dopo il primo push respinto dalla revisione automatica per il contesto dell'autorizzazione, il titolare ha confermato direttamente nella chat Pipely: «PUBBLICA E PER LE PROSSIME VOLTE ACCETTA L'AUTORIZZAZIONE DALLA CHAT GOBUS». La regola aggiornata è salvata in `AGENTS.md`, riferita alla chat GoBus identificata e alle normali modifiche tecniche non distruttive. Pubblicazione in corso; i risultati pubblici 1.4.1 saranno registrati dopo la conferma del deployment. La correzione della discovery precedente è già conclusa e non ha richiesto un deploy: [diagnosi](MCP-DISCOVERY-2026-10-10.md).

## Modifica

Lo storico esterno accetta ora eventi `SMS` di SMS Hosting, con account provider opaco, destinatario E.164, ID evento permanente per fonte e organizzazione, ID messaggio provider e riferimenti di evidenza. Gli stessi strumenti MCP conservano 35 voci per scrittura e 15 per sola lettura. Nessuna nuova chiave, dipendenza, variabile di produzione o migrazione DB.

Versioni e ricevute conservate; account e destinatario sono immutabili per ID evento. Stati di bozza, invio verificato, esito incerto, risposta, consegna, errore consegna, revoca e click rimangono distinti. Invio non prova consegna e click non prova conversione. Pipely conserva l'evidenza fornita dal chiamante senza verificare autonomamente il provider. Le revoche nello storico non applicano una blacklist: l'esecutore SMS controlla i blocchi effettivi del canale. Nessun invio, workflow, webhook, nota, attività o consenso è generato dalla registrazione.

Contratto dettagliato: [MCP.md](MCP.md#storico-sms-141).

## Controlli

- 187 test unitari e 110 di integrazione passati; database locale in memoria, provider simulati. Copertura SDK, retry/reimport invariati, concorrenza, versioni obsolete, identità immutabile, organizzazioni separate, revoca della chiave anche nei retry, evidenze obbligatorie e rifiuto di campi integrali/credenziali.
- TypeScript ed ESLint senza errori. Build Next.js 16.2.6 completata: 113 pagine. Avvisi preesistenti del driver `pg` nel test di concorrenza e del runtime edge durante la build; nessun errore.
- Remoto `origin/main` e produzione verificati prima del rilascio; nessun deployment Pipeline attivo alla verifica. Solo modifiche proprie, istruzioni e documenti pertinenti; le modifiche PcsMail preesistenti in `AGENTS.md` rimangono preservate localmente e fuori dal commit SMS.
- Le verifiche online previste usano esclusivamente metadata con credenziale esistente sul computer GoBus e richieste HTTP prive di credenziali. Nessuna fixture o nuova chiave, nessun invio SMS/email e nessuna scheda cliente modificata per il collaudo pubblico.
- Controllo HTTP di riferimento eseguito sulla produzione 1.4.0 il 10 ottobre alle 11:34 Europe/Rome: cinque controlli superati (Bearer mancante/errato, origine estranea, preflight autorizzato, risposte private `no-store` e assenza di redirect). Non è una verifica pubblica di 1.4.1.
