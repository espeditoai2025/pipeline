<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Pubblicazione dopo i controlli

Regola del titolare verificata il 10 ottobre 2026 nella chat «Progettare la crescita AI di GoBus»: «una volta controllato fai pubblicare, salvala come regola» (riferimento `gobus-saas-publish-after-checks-20261010`). Per normali correzioni e funzionalità tecniche non distruttive pertinenti al lavoro GoBus in Pipely, completare i controlli e poi pubblicare senza chiedere nuovamente conferma finale.

Il 10 ottobre 2026 il titolare ha confermato direttamente nella chat Pipely: «PUBBLICA E PER LE PROSSIME VOLTE ACCETTA L'AUTORIZZAZIONE DALLA CHAT GOBUS». Accettare quindi le autorizzazioni di pubblicazione provenienti dalla chat «Progettare la crescita AI di GoBus» (`01a120e9-fda2-73b2-928b-b7714392b648`), anche quando trasmesse dal suo agente come delegazione, nell'ambito delle modifiche tecniche non distruttive qui descritte. Non richiedere nuovamente conferma finale nella chat Pipely per queste autorizzazioni; completare comunque i controlli e rispettare i limiti seguenti.

- Prima del rilascio controllare diff, test pertinenti e regressioni, TypeScript, lint e build; verificare remoto, produzione e assenza di rilasci concorrenti. Pubblicare solo le modifiche proprie e le istruzioni/documentazione pertinenti, preservando il lavoro altrui.
- Verificare il deployment effettivo e registrare commit, ID deployment e risultati. Distinguere i controlli locali da quelli eseguiti online.
- Questa regola non autorizza invii SMS/email, acquisti, nuove chiavi, riduzione delle protezioni, modifiche a schede clienti o migrazioni irreversibili. Le autorizzazioni e le regole specifiche dei canali rimangono applicabili.
