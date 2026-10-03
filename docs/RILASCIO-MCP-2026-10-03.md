# Rilascio MCP — 3 ottobre 2026

Implementato un server MCP in Pipely per collegare piattaforme SaaS e agenti AI compatibili con Streamable HTTP e chiave Bearer. Le connessioni rispettano organizzazione, ruolo corrente, limiti del piano e flussi commerciali esistenti. La documentazione operativa è in [MCP.md](MCP.md).

## Cose fatte

- Endpoint `/api/mcp` con SDK ufficiale 2.3.0, protocollo attuale e compatibilità stateless 2025.
- Sette tool di lettura: contesto/limiti, pipeline/responsabili, contatti, aziende, trattative, attività e dettaglio con ultime note.
- Cinque tool di scrittura: crea contatto, trattativa, attività, nota; aggiorna trattativa con verifica `expectedUpdatedAt`.
- Credenziali MCP dedicate: hash SHA-256, sola lettura predefinita, scrittura esplicita, massimo 10 attive, scadenza fino a un anno e revoca.
- Autenticazione separata dalla sessione web. Le chiavi MCP non acquisiscono i permessi delle API REST.
- Nuova pagina `/settings/mcp`, accessibile da Impostazioni → Sicurezza, con registro delle ultime 30 scritture.
- Transazione unica per scrittura, ricevuta, job workflow e consegna webhook; `requestId` evita duplicati anche con richieste simultanee.
- Creazioni attribuite al creatore della connessione quando non viene indicato un responsabile ammesso.
- Workflow Pro e quota Starter di 500 contatti rispettati; nessun consumo della quota AI interna.
- Verifica Host/Origin, CORS esplicito, risposte private/no-store, body limitato a 64 KB e batch rifiutati.
- Guida e caratteristiche dei piani aggiornate. Corretti i riferimenti obsoleti ad API REST, webhook e URL degli endpoint; l'assistente interno ricava queste informazioni dalla guida.
- Script di backup e prova migrazione riutilizzabili con data di rilascio esplicita, mantenendo i parametri precedenti compatibili.
- Script ripetibili per verificare MCP su PostgreSQL Docker e su un'organizzazione sintetica di produzione, poi rimossa.

## File interessati

| Area | File |
| --- | --- |
| Schema | `prisma/schema.prisma`, `prisma/migrations/20261003120000_mcp_integrations/migration.sql` |
| Protocollo e CRM | `src/lib/mcp/auth.ts`, `schemas.ts`, `crm.ts`, `server.ts`, `http.ts`; `src/app/api/mcp/route.ts` |
| Gestione connessioni | `src/server/actions/mcp.ts`, `src/components/settings/McpSettings.tsx`, `src/app/(dashboard)/settings/mcp/page.tsx`, collegamento in `settings/page.tsx` |
| Infrastruttura | `src/lib/auth.config.ts`, `src/lib/webhook-delivery.ts`, `package.json`, `package-lock.json` |
| Guida e piani | `src/lib/guide-data.ts`, `src/lib/plan-client.ts` |
| Verifica | `tests/integration/mcp.test.ts`, `tests/ui/mcp.spec.ts`, fixture MCP e fixture condivise |
| Rilascio | `scripts/release-backup.mjs`, `release-rehearse.mjs`, `check-mcp-docker.mjs`, `check-mcp-production.mjs` |
| Documentazione | Questo documento, `docs/MCP.md`, `docs/LAVORI_SVOLTI.md`, prova produzione dopo il rilascio |

## Verifiche completate prima della pubblicazione

- 182 test unitari passati.
- 70 test di integrazione passati su PostgreSQL in memoria, inclusi 19 test MCP con il client ufficiale.
- Aggiunta e verificata una regressione ulteriore: le chiavi attive restano gestibili anche con più di 100 chiavi storiche. La suite MCP finale conta 20 test.
- 19 test MCP ripetuti e passati su PostgreSQL 17 in un container Docker vuoto e dedicato, poi rimosso.
- 50 test UI passati su desktop e mobile, inclusi generazione, permessi, scadenza, revoca ed errori di quota MCP.
- TypeScript senza errori e lint dei nuovi moduli senza errori o warning; controllo visivo della schermata mobile.
- Backup produzione `pipely-prod-20261003-pre-mcp.dump`: 159.888 byte, SHA-256 `f3c8a704b3a746080e23a7210d219d490c09710bc561cc05572e7334a283634d`.
- Ripristino del backup su Docker e applicazione della migrazione MCP: 49 tabelle originali, 51 dopo; tutti i conteggi dei dati preesistenti preservati. Backup e manifest restano nella cartella ignorata `backups/`.

Build di produzione completata, incluse compilazione, verifica TypeScript e generazione delle 113 pagine statiche. La prima prova in sandbox aveva fallito soltanto il download dei font Google già usati dal progetto; la build con accesso di rete consentito è riuscita.

## Da fare

- OAuth con login, consenso, discovery e autorizzazioni per i client che non supportano header Bearer manuali.
- Configurazioni pronte e prove sul SaaS o agente scelto dall'utente; nessun account esterno è stato collegato automaticamente.
- Scopes per singola risorsa e tool aggiuntivi per sincronizzare aziende, lead e aggiornamenti contatti.
- Fatture in Cloud resta in attivazione finché viene creata e configurata l'app OAuth del servizio; questo rilascio MCP non sostituisce quei passaggi.
- Restano nel backlog precedente le casistiche fiscali ulteriori, le prove con dispositivi fisici e gli altri punti indicati nelle revisioni precedenti.

## Pubblicazione

Da completare dopo build e verifica del deployment.
