# Fatture in Cloud — attivazione per Pipely

Aggiornato il 7 settembre 2026. Il connettore è implementato nel codice locale; l’app OAuth non è stata ancora creata e non sono presenti le sue credenziali. Nessuna fattura reale è stata creata o inviata durante lo sviluppo.

## 1. Creare l’app di Pipely

Nel **tuo account che gestisce l’integrazione Pipely**, apri **Impostazioni → Sviluppatore → Nuova app**. Nome suggerito: **Pipely CRM**. Seleziona **OAuth 2.0** e registra questo indirizzo di ritorno:

```text
https://www.pipely.it/api/integrations/fatture-in-cloud/callback
```

Per il collaudo usa la visibilità privata e inserisci l’email del tuo account nella lista degli utenti autorizzati. Una volta completato il collaudo, la distribuzione ai clienti richiede la procedura di abilitazione pubblica del fornitore. **I clienti di Pipely non devono creare app o consegnare Client Secret:** autorizzeranno l’app di Pipely con il proprio account. [Procedura ufficiale di creazione e visibilità](https://developers.fattureincloud.it/docs/basics/create-an-app/).

L’indirizzo deve coincidere esattamente tra app e configurazione server. Per un ambiente locale separato si può registrare `http://localhost:3000/api/integrations/fatture-in-cloud/callback`; non usare le credenziali di produzione in un ambiente di prova condiviso. [OAuth Authorization Code Flow](https://developers.fattureincloud.it/docs/authentication/code-flow/vanilla-code/).

## 2. Configurare il server

Inserire nelle variabili server dell’ambiente scelto, senza pubblicarle nel repository o nel frontend:

| Variabile | Valore / funzione |
| --- | --- |
| `FIC_CLIENT_ID` | Client ID dell’app Pipely |
| `FIC_CLIENT_SECRET` | Client Secret dell’app; inserirlo direttamente nelle impostazioni del servizio di hosting, senza inviarlo in chat |
| `FIC_REDIRECT_URI` | L’indirizzo di ritorno esatto indicato sopra |
| `INTEGRATIONS_ENCRYPTION_KEY` | Segreto casuale stabile di almeno 32 caratteri, conservato nel gestore dei segreti |

Il codice usa AES-256-GCM per i token, con vincolo all’organizzazione. Se la chiave dedicata manca, usa `AUTH_SECRET` o `NEXTAUTH_SECRET` con almeno 32 caratteri. Configurare la chiave dedicata **prima del primo collegamento**; cambiarla successivamente rende illeggibili i token esistenti e richiede la riconnessione.

I permessi richiesti dal codice sono `issued_documents.invoices:a settings:r`: gestione delle fatture e lettura delle impostazioni necessarie. Le credenziali e i token non sono restituiti dalle azioni all’interfaccia.

Prima di aprire le nuove pagine sull’ambiente di destinazione, applicare la migrazione `20260907120000_voice_and_invoicing` con `prisma migrate deploy` secondo la procedura di rilascio del progetto, poi pubblicare la build con la configurazione impostata. **Questi passaggi non sono stati eseguiti in produzione in questa sessione.** Non usare `db push` o reset sul database di produzione.

## 3. Collegare e collaudare

1. Accedere a Pipely come proprietario o amministratore di un’organizzazione Pro. In **Impostazioni → Organizzazione**, verificare la partita IVA dell’emittente.
2. Aprire **Impostazioni → Fatturazione → Fatture in Cloud**, autorizzare l’app e selezionare l’azienda. La sua partita IVA deve coincidere con quella di Pipely.
3. In un ambiente/account di prova del fornitore, preparare una bozza italiana in EUR con IVA positiva, senza incassi. Completare CAP, provincia, partita IVA/codice fiscale, codice destinatario o PEC e modalità di pagamento.
4. Verificare anteprima e totali. Confermare la creazione, aprire il documento nel gestionale e controllare anagrafica, numero, aliquote, scadenza e XML. Il numero fiscale è assegnato da Fatture in Cloud e può differire dal numero interno Pipely.
5. L’invio fiscale richiede una **seconda conferma**. Collaudare l’intero ciclo solo con una modalità di prova supportata dal fornitore o con un documento reale valido e un’autorizzazione specifica. Il codice non include un simulatore SdI e non presume che esista un parametro sandbox universale.
6. Verificare aggiornamento dello stato, rinnovo del token, rifiuto XML e gestione di un’interruzione di rete. Non forzare nuovi tentativi per un documento con esito incerto.

## Ambito della prima versione

Supportate fatture ordinarie italiane, EUR, IVA positiva, senza cassa previdenziale, rivalsa, ritenute, bollo o split payment. **Forfettari, IVA zero, PA, estero, note di credito e sincronizzazione degli incassi restano da implementare.** Per questi casi si deve lavorare nel gestionale; Pipely blocca i casi non rappresentabili nei propri calcoli.

Le chiamate incerte bloccano la ripetizione della creazione o dell’invio. “Aggiorna stato / riconcilia” cerca il documento tramite il riferimento stabile Pipely e legge l’esito. Se la creazione non è individuabile o un invio resta senza conferma, serve verifica sul gestionale: non è stato introdotto un pulsante che possa creare duplicati forzando il blocco.

Riferimenti tecnici: [creazione documento](https://developers.fattureincloud.it/docs/guides/invoice-creation/), [gestione fattura elettronica](https://developers.fattureincloud.it/docs/guides/e-invoice-management/), [schema OpenAPI](https://developers.fattureincloud.it/docs/openapi-specification/).
