export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  readingMinutes: number;
  category: string;
  excerpt: string;
  content: string;
  faqs?: { q: string; a: string }[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "come-organizzare-lead-crm",
    title: "Come Organizzare i Lead con un CRM (guida pratica)",
    description: "Scopri come organizzare i lead con un CRM: dalla raccolta alla qualificazione fino alla conversione. Guida pratica per team di vendita italiani.",
    publishedAt: "2026-04-15",
    readingMinutes: 7,
    category: "Vendite",
    excerpt: "Hai decine di potenziali clienti sparsi tra email, biglietti da visita e fogli Excel. Ecco come mettere ordine con un CRM e non perdere più nessuna opportunità.",
    content: `
<h2>Perché organizzare i lead è la base delle vendite</h2>
<p>Un lead non gestito è denaro perso. Eppure la maggior parte dei team di vendita italiani ancora oggi tiene traccia dei potenziali clienti in fogli Excel, caselle email o peggio ancora — nella memoria dei singoli venditori. Il risultato? Follow-up dimenticati, opportunità che "cadono nel buco" e pipeline che non rispecchia la realtà.</p>
<p>Un CRM risolve questo problema alla radice: ogni lead ha il suo profilo, con storico delle interazioni, stato aggiornato e prossima azione pianificata. In questa guida vediamo come strutturare il processo passo per passo.</p>

<h2>1. Definisci le fonti dei tuoi lead</h2>
<p>Il primo passo è capire da dove arrivano i tuoi potenziali clienti. Le fonti più comuni per le PMI italiane sono:</p>
<ul>
<li><strong>Sito web</strong> — form di contatto, chat, landing page</li>
<li><strong>Passaparola</strong> — segnalazioni da clienti esistenti</li>
<li><strong>LinkedIn</strong> — ricerca manuale o messaggi in entrata</li>
<li><strong>Fiere ed eventi</strong> — biglietti da visita, scan badge</li>
<li><strong>Campagne email</strong> — risposte a newsletter o cold outreach</li>
<li><strong>Telefono in entrata</strong> — richieste dirette</li>
</ul>
<p>In Pipely puoi etichettare ogni lead con la sua fonte di origine al momento della creazione. Questo ti permette di capire in seguito quali canali generano i lead più qualificati.</p>

<h2>2. Crea un sistema di qualificazione</h2>
<p>Non tutti i lead meritano lo stesso livello di attenzione. Un sistema di qualificazione ti permette di concentrare l'energia sui contatti più promettenti. Il modello più semplice ed efficace è il <strong>BANT</strong>:</p>
<ul>
<li><strong>Budget</strong> — ha il budget per il tuo prodotto/servizio?</li>
<li><strong>Authority</strong> — è il decisore o influenza la decisione?</li>
<li><strong>Need</strong> — ha un bisogno reale che tu puoi risolvere?</li>
<li><strong>Timeline</strong> — ha un orizzonte temporale definito?</li>
</ul>
<p>In Pipely puoi assegnare un <strong>lead score</strong> da 1 a 10 e uno <strong>stato</strong> (Nuovo, Contattato, Qualificato, Non qualificato) per filtrare rapidamente la lista e prioritizzare il lavoro.</p>

<h2>3. Struttura il profilo di ogni lead</h2>
<p>Un buon profilo lead contiene almeno questi dati:</p>
<ul>
<li>Nome e cognome, azienda, ruolo</li>
<li>Email e telefono (obbligatori per il follow-up)</li>
<li>Fonte di acquisizione</li>
<li>Stato e score</li>
<li>Note qualitative: cosa ha detto, quali problemi ha citato, obiezioni</li>
<li>Prossima azione pianificata con data</li>
</ul>
<p>Le note sono spesso sottovalutate, ma sono la differenza tra una conversazione generica e una chiamata dove il venditore ricorda i dettagli che contano per quel lead specifico.</p>

<h2>4. Collega i lead alla pipeline</h2>
<p>Quando un lead supera la qualificazione e diventa un'opportunità concreta, è il momento di convertirlo in un <strong>affare</strong> nella pipeline. In Pipely questo avviene con un singolo click: il sistema crea l'affare, opzionalmente crea anche il contatto corrispondente, e mantiene il link con il lead originale.</p>
<p>Questo passaggio è fondamentale perché separa la fase di nurturing/qualificazione dalla fase commerciale vera e propria — due processi con ritmi e responsabilità diverse.</p>

<h2>5. Automatizza i promemoria</h2>
<p>Il 80% dei follow-up richiedono più di un contatto prima di ottenere una risposta. Il problema è che i venditori si dimenticano. La soluzione non è disciplina — è automazione.</p>
<p>Con le automazioni di Pipely puoi creare regole tipo: "Se un lead è in stato Contattato e non ci sono interazioni da 3 giorni → crea un'attività di follow-up assegnata al responsabile". Il sistema lavora per te anche quando sei in riunione.</p>

<h2>Checklist operativa per organizzare i lead</h2>
<ul>
<li>☐ Definisci le fonti di acquisizione e inseriscile come etichette nel CRM</li>
<li>☐ Stabilisci criteri di qualificazione (usa BANT o un modello simile)</li>
<li>☐ Crea un template di note standard per le prime conversazioni</li>
<li>☐ Imposta un'automazione di follow-up per i lead inattivi</li>
<li>☐ Rivedi la lista lead ogni lunedì mattina — 15 minuti, non di più</li>
</ul>
`,
    faqs: [
      { q: "Qual è la differenza tra lead e contatto in un CRM?", a: "Un lead è un potenziale cliente che non hai ancora qualificato — sai che esiste ma non sai se ha interesse e budget reali. Un contatto è una persona con cui hai già stabilito una relazione e che è entrata nella tua pipeline commerciale. Alcuni CRM come Pipely separano le due entità per gestire meglio il processo di qualificazione." },
      { q: "Quanti lead si possono gestire con il piano gratuito di Pipely?", a: "Il piano Starter di Pipely include lead illimitati. Puoi aggiungere, qualificare e convertire quanti lead vuoi senza limiti di numero." },
      { q: "Posso importare i lead da un file Excel?", a: "Sì. Pipely ha un import guidato che accetta file CSV ed Excel. Il sistema rileva automaticamente le colonne e ti permette di mappare i campi in pochi click." },
    ],
  },

  {
    slug: "follow-up-commerciali-non-dimenticare",
    title: "Come Non Dimenticare i Follow-up Commerciali",
    description: "Follow-up dimenticati = opportunità perse. Scopri come strutturare un sistema di follow-up commerciale che funziona anche quando sei occupato.",
    publishedAt: "2026-04-22",
    readingMinutes: 6,
    category: "Vendite",
    excerpt: "Il 44% dei venditori abbandona dopo il primo tentativo di contatto. Ma l'80% delle vendite si chiude al quinto follow-up. Ecco come non perdere questa opportunità.",
    content: `
<h2>Il problema del follow-up dimenticato</h2>
<p>Hai mai inviato un'offerta a un potenziale cliente, aspettato una risposta e poi… dimenticato di ricontattarlo? È successo a tutti. La quotidianità frenetica, le email che si accumulano, le riunioni back-to-back: il follow-up commerciale è sempre la cosa che "faccio dopo".</p>
<p>Il risultato? Trattative che si raffreddano, clienti che scelgono un concorrente semplicemente perché li ha ricontattati prima, pipeline gonfiata di opportunità fantasma che non si chiudono mai.</p>
<p>La soluzione non è lavorare di più o essere più disciplinati. È costruire un <strong>sistema</strong>.</p>

<h2>Regola dei 5 touch point</h2>
<p>Le ricerche sul processo di vendita mostrano che:</p>
<ul>
<li>Il 44% dei venditori abbandona dopo il primo tentativo</li>
<li>L'80% delle vendite richiede almeno 5 follow-up</li>
<li>Solo il 8% dei venditori arriva al quinto contatto</li>
</ul>
<p>Chi arriva al quinto follow-up cattura una quota sproporzionata delle opportunità disponibili. Non perché sia più bravo — ma perché ha un sistema che lo ricorda di farlo.</p>

<h2>Il calendario dei follow-up: quando e come</h2>
<p>Una sequenza di follow-up efficace segue una cadenza specifica:</p>
<ul>
<li><strong>Follow-up 1 — Giorno 2:</strong> Email breve di conferma invio offerta. "Ho inviato la proposta ieri, fammi sapere se hai domande."</li>
<li><strong>Follow-up 2 — Giorno 5:</strong> Telefonata o email. Aggiungi valore: un caso studio rilevante, una risposta a un'obiezione comune.</li>
<li><strong>Follow-up 3 — Giorno 10:</strong> Email con una nuova prospettiva. "Ho pensato al tuo caso specifico e volevo condividere..."</li>
<li><strong>Follow-up 4 — Giorno 20:</strong> Verifica dello stato. "Sei ancora interessato? Siamo disponibili per una call di 15 minuti."</li>
<li><strong>Follow-up 5 — Giorno 35:</strong> Email di rottura. "Ho capito che potresti non essere interessato in questo momento. Se cambia qualcosa, sono qui."</li>
</ul>

<h2>Come automatizzare i follow-up con un CRM</h2>
<p>Fare il follow-up manualmente su decine di trattative è impossibile senza un sistema. Ecco come farlo con Pipely:</p>
<h3>Metodo 1: Attività pianificate</h3>
<p>Ogni volta che invii un'offerta, crei subito un'attività di follow-up con data specifica. L'attività appare nella tua dashboard il giorno stabilito e ti notifica cosa fare. Semplice, ma richiede disciplina nell'inserimento.</p>
<h3>Metodo 2: Automazioni workflow</h3>
<p>Il metodo più robusto. Crei una regola: "Quando un affare entra nello stage Offerta inviata → crea attività Follow-up tra 2 giorni". Il CRM fa tutto da solo. Tu devi solo lavorare sulle attività che appaiono in lista ogni mattina.</p>
<h3>Metodo 3: Email automatiche</h3>
<p>Per volumi alti, puoi creare sequenze email automatiche che partono al trigger. Il prospect riceve il follow-up a prescindere da cosa stai facendo tu.</p>

<h2>I 3 errori più comuni nel follow-up</h2>
<ul>
<li><strong>Errore 1: Il follow-up generico.</strong> "Volevo solo controllare se hai letto la mia email." Non aggiunge valore. Ogni follow-up deve portare qualcosa di nuovo: un'informazione, una domanda, una risposta.</li>
<li><strong>Errore 2: Abbandono precoce.</strong> Un "non rispondo" non è un "no". Potrebbe essere una settimana impegnata. Continua secondo la sequenza pianificata.</li>
<li><strong>Errore 3: Nessun sistema.</strong> Ricordarsi i follow-up a memoria o con post-it non scala. Con 10 trattative attive va ancora bene. Con 50 è impossibile.</li>
</ul>

<h2>Template follow-up pronti all'uso</h2>
<p><strong>Follow-up 1 (email):</strong><br/>
Oggetto: Re: Proposta [Nome Azienda]<br/>
"Ciao [Nome], ti scrivo per assicurarmi che la proposta sia arrivata correttamente. C'è qualche parte che vuoi approfondire? Sono disponibile per una call rapida questa settimana."</p>
<p><strong>Follow-up 5 (email di rottura):</strong><br/>
Oggetto: Chiudiamo qui?<br/>
"Ciao [Nome], ti ho contattato alcune volte senza ricevere risposta — capisco che potresti non essere interessato in questo momento, e va benissimo. Se le priorità cambiano, puoi trovarmi qui. Buon lavoro."</p>
`,
    faqs: [
      { q: "Quanti follow-up si devono fare prima di mollare?", a: "La regola generale è 5-7 tentativi distribuiti nell'arco di 5-6 settimane. Dopo 7 contatti senza risposta, ha senso fare un ultimo tentativo con un'email di 'rottura' e poi archiviare l'opportunità." },
      { q: "Meglio email o telefono per il follow-up?", a: "Dipende dal contesto. Per B2B con ticket alto, la telefonata è più efficace ma richiede più coraggio. L'email è meno invasiva ma si perde facilmente. La combinazione ottimale è: email iniziale + telefonata al secondo follow-up + email per i successivi." },
    ],
  },

  {
    slug: "miglior-crm-pmi-italiane-2026",
    title: "Il Miglior CRM per PMI Italiane nel 2026",
    description: "Confronto dei migliori CRM per PMI italiane nel 2026: funzionalità, prezzi, lingua italiana e facilità d'uso. Quale scegliere per la tua impresa?",
    publishedAt: "2026-05-01",
    readingMinutes: 9,
    category: "Confronti",
    excerpt: "Scegliere il CRM giusto per la tua PMI italiana è una decisione che impatta le vendite per anni. Ecco i criteri che contano davvero e le soluzioni da valutare.",
    content: `
<h2>Perché le PMI italiane hanno bisogno di un CRM diverso</h2>
<p>Un CRM enterprise come Salesforce o Microsoft Dynamics è progettato per strutture con decine di utenti, processi complessi e team IT dedicati. Per una PMI italiana con 2-20 venditori, questo tipo di strumento è spesso troppo costoso, troppo complicato e — aspetto spesso sottovalutato — non disponibile in italiano in modo nativo.</p>
<p>Le PMI hanno bisogno di un CRM che risponda a criteri diversi: <strong>facilità di adozione</strong>, <strong>prezzo sostenibile</strong>, <strong>interfaccia in italiano</strong>, <strong>supporto raggiungibile</strong> e integrazione con gli strumenti che già usano (email, Excel, Google Workspace).</p>

<h2>I 5 criteri per scegliere il CRM giusto</h2>
<h3>1. Curva di apprendimento</h3>
<p>Un CRM che non viene usato dal team non porta nessun vantaggio. La semplicità di adozione è il fattore numero uno per il successo dell'implementazione. Cerca strumenti con onboarding guidato, interfaccia intuitiva e documentazione in italiano.</p>
<h3>2. Prezzo rapportato al valore</h3>
<p>Molti CRM hanno prezzi "per utente al mese" che diventano insostenibili per team che crescono. Valuta il costo totale a 1, 2 e 5 anni. Considera anche i costi nascosti: onboarding, formazione, personalizzazioni.</p>
<h3>3. Pipeline e gestione affari</h3>
<p>La funzionalità core di ogni CRM. Verifica che la vista kanban sia presente, che si possano personalizzare gli stage e che i valori degli affari siano chiaramente visibili.</p>
<h3>4. Automazioni reali</h3>
<p>Automazioni che generano attività, inviano email o spostano affari in pipeline cambiano il modo di lavorare. Questa funzionalità spesso manca nei piani base — verifica che sia disponibile nel piano che ti interessa.</p>
<h3>5. Supporto in italiano</h3>
<p>Quando qualcosa non funziona, vuoi poter contattare qualcuno che risponde nella tua lingua entro tempi ragionevoli. Il supporto in inglese su fusi orari diversi è un ostacolo reale per molte PMI.</p>

<h2>Confronto soluzioni 2026</h2>
<h3>Pipely — CRM italiano nativo</h3>
<p>Progettato specificatamente per il mercato italiano. Interfaccia, documentazione e supporto 100% in italiano. Include pipeline kanban, gestione contatti, automazioni, email marketing con tracking, AI Assistant e import da Excel. Piano gratuito permanente disponibile.</p>
<ul>
<li>✅ Interfaccia e supporto in italiano</li>
<li>✅ Piano gratuito per sempre (Starter)</li>
<li>✅ Automazioni e email marketing inclusi nel Pro</li>
<li>✅ Setup in meno di 5 minuti</li>
<li>❌ Integrazioni native limitate rispetto ai big player</li>
</ul>

<h3>HubSpot CRM</h3>
<p>Soluzione americana con piano gratuito generoso ma interfaccia in inglese. Il piano gratuito diventa presto limitante e i piani a pagamento sono significativamente più costosi. Ideale per chi già usa l'ecosistema HubSpot (marketing, sales hub).</p>
<ul>
<li>✅ Piano gratuito con molte funzionalità</li>
<li>✅ Ecosistema integrazioni ampio</li>
<li>❌ Interfaccia primariamente in inglese</li>
<li>❌ Costo elevato per i piani avanzati</li>
</ul>

<h3>Pipedrive</h3>
<p>CRM focalizzato sulla pipeline di vendita, con interfaccia intuitiva. Non ha un piano gratuito — il minimo è circa €14,90/utente/mese. L'interfaccia è localizzata in italiano ma il supporto è in inglese o tramite partner locali.</p>
<ul>
<li>✅ Pipeline gestione eccellente</li>
<li>✅ Interfaccia localizzata</li>
<li>❌ Nessun piano gratuito</li>
<li>❌ Automazioni disponibili solo dai piani superiori</li>
</ul>

<h2>La mia raccomandazione per le PMI italiane</h2>
<p>Per una PMI italiana che parte da zero o migra da Excel, la scelta più pragmatica nel 2026 è un CRM che sia:</p>
<ol>
<li>Immediatamente utilizzabile senza formazione tecnica</li>
<li>Disponibile in italiano nativo</li>
<li>Con un piano gratuito per testare senza rischi</li>
<li>Con automazioni reali incluse nel piano a pagamento</li>
</ol>
<p>Se questi sono i tuoi criteri, inizia con Pipely — il piano Starter è gratuito per sempre e permette di valutare lo strumento nel contesto reale della tua azienda prima di qualsiasi investimento.</p>
`,
    faqs: [
      { q: "Quanto costa in media un CRM per PMI?", a: "I prezzi variano da 0€ (piani gratuiti come Pipely Starter) a €30-50/utente/mese per piani avanzati. Per un team di 5 venditori con funzionalità complete (pipeline, automazioni, email marketing), aspettati di spendere €100-200/mese totali." },
      { q: "Quanto tempo ci vuole per implementare un CRM in una PMI?", a: "Con uno strumento moderno come Pipely, il setup base (account, pipeline personalizzata, import contatti) richiede meno di un giorno. L'adozione completa del team — dove tutti usano lo strumento in modo consistente — richiede 2-4 settimane di abitudine." },
      { q: "È possibile migrare da HubSpot o Pipedrive a Pipely?", a: "Sì. Pipely supporta l'import da CSV ed Excel, che è il formato di export di qualsiasi CRM. Esporti i contatti, gli affari e le note dal CRM attuale in CSV e li importi in Pipely con il wizard guidato." },
    ],
  },

  {
    slug: "crm-gratis-pro-contro",
    title: "CRM Gratis: Pro e Contro (cosa valutare prima di scegliere)",
    description: "Un CRM gratis è davvero conveniente? Analisi onesta dei pro e contro dei CRM gratuiti: cosa includono, cosa manca e quando vale la pena passare al piano a pagamento.",
    publishedAt: "2026-04-08",
    readingMinutes: 7,
    category: "Guide",
    excerpt: "Il piano gratuito di un CRM è spesso la scelta giusta per iniziare. Ma ci sono trappole da evitare. Ecco un'analisi onesta prima di scegliere.",
    content: `
<h2>Perché i CRM gratuiti esistono</h2>
<p>I CRM gratuiti non sono atti di generosità: sono strategie di acquisizione clienti. L'obiettivo è che tu usi lo strumento, lo integri nei processi aziendali e poi — quando le esigenze crescono — passi al piano a pagamento. È il modello freemium e funziona molto bene.</p>
<p>Per te come utente, questo significa che puoi ottenere <strong>valore reale</strong> senza investimento iniziale — ma devi capire esattamente cosa è incluso e cosa no per non trovarti a fare scelte strategiche basate su aspettative sbagliate.</p>

<h2>Pro dei CRM gratuiti</h2>
<h3>Zero rischio finanziario</h3>
<p>Il vantaggio più ovvio: puoi valutare lo strumento nel contesto reale della tua azienda, con i tuoi dati, senza impegno economico. Questo è enorme — molte PMI hanno pagato licenze software che non sono mai state adottate dal team.</p>
<h3>Velocità di adozione</h3>
<p>Senza processo di acquisto, approvazioni e onboarding formale, puoi iniziare a usare il CRM nel giro di ore. Per un team piccolo con urgenza immediata, questo vale molto.</p>
<h3>Base funzionale sufficiente per iniziare</h3>
<p>I migliori piani gratuiti includono pipeline kanban, gestione contatti, attività e note — che coprono l'80% delle esigenze di una PMI che parte da zero. Non è necessario avere automazioni avanzate per migliorare immediatamente il modo di gestire i clienti.</p>

<h2>Contro dei CRM gratuiti</h2>
<h3>Limiti di utenti o record</h3>
<p>Molti CRM gratuiti limitano il numero di utenti (spesso 1-2) o il numero di contatti/deal gestibili. Prima di adottare uno strumento, verifica questi limiti nel contesto della tua crescita attesa.</p>
<h3>Assenza di automazioni</h3>
<p>Le automazioni — workflow che eseguono azioni automaticamente al verificarsi di condizioni — sono quasi universalmente riservate ai piani a pagamento. Se l'obiettivo principale è automatizzare follow-up e processi ripetitivi, il piano gratuito potrebbe non essere sufficiente.</p>
<h3>Supporto limitato o assente</h3>
<p>Il supporto clienti nei piani gratuiti è spesso limitato a documentazione e community. Per problemi urgenti o configurazioni complesse, potresti non ricevere assistenza tempestiva.</p>
<h3>Assenza di integrazioni avanzate</h3>
<p>API, Zapier, integrazione email avanzata, SMTP personalizzato: quasi sempre nei piani a pagamento. Se la tua operatività dipende da integrazioni specifiche, verifica la disponibilità prima di iniziare.</p>

<h2>Quando passare al piano a pagamento</h2>
<p>Questi sono i segnali che indicano che è arrivato il momento:</p>
<ul>
<li>Il team sta usando lo strumento attivamente e i processi dipendono da esso</li>
<li>Stai perdendo tempo in attività che potresti automatizzare</li>
<li>Hai bisogno di più utenti o stai superando i limiti di record</li>
<li>Vuoi inviare campagne email o attivare sequence automatiche</li>
<li>Il ROI del passaggio al piano Pro è evidente (tempo risparmiato, deal chiusi più velocemente)</li>
</ul>

<h2>Confronto piani gratuiti più comuni</h2>
<ul>
<li><strong>Pipely Starter:</strong> Contatti illimitati, 1 pipeline, funzionalità base. Gratuito per sempre, nessuna scadenza.</li>
<li><strong>HubSpot Free:</strong> Contatti illimitati, pipeline, email tracking. Limit di funzionalità avanzate, branding HubSpot nelle email.</li>
<li><strong>Zoho CRM Free:</strong> 3 utenti, moduli base. Interfaccia meno moderna.</li>
</ul>

<h2>La mia raccomandazione</h2>
<p>Inizia con un piano gratuito senza esitazione — è il modo più intelligente per valutare lo strumento. Scegli però un CRM il cui piano gratuito sia <strong>permanente</strong> (non una trial a tempo), così non sei costretto a fare scelte affrettate sulla migrazione. Quando le esigenze crescono, il passaggio al piano Pro sarà una scelta consapevole basata su valore reale dimostrato.</p>
`,
    faqs: [
      { q: "I dati caricati sul piano gratuito si perdono se passo al piano a pagamento?", a: "No. La migrazione da Starter a Pro è trasparente: tutti i dati, contatti, affari e note vengono mantenuti. È semplicemente un upgrade dell'account." },
      { q: "Il piano gratuito di Pipely ha una scadenza?", a: "No. Il piano Starter di Pipely è gratuito per sempre, senza limite temporale. Puoi usarlo a tempo indeterminato con le funzionalità incluse." },
    ],
  },

  {
    slug: "gestire-clienti-senza-excel",
    title: "Come Gestire Clienti senza Excel (e smettere di perdere deal)",
    description: "Excel non è un CRM: scopri perché i fogli di calcolo frenano le vendite e come fare la transizione a uno strumento professionale senza perdere dati.",
    publishedAt: "2026-03-20",
    readingMinutes: 8,
    category: "Guide",
    excerpt: "Molte PMI italiane gestiscono ancora i clienti con Excel. Funziona — fino a quando non funziona più. Ecco quando è arrivato il momento di cambiare.",
    content: `
<h2>Excel e la gestione clienti: un amore che non scala</h2>
<p>Non c'è niente di sbagliato nell'usare Excel per gestire i clienti quando sei solo o hai un pugno di trattative attive. Il foglio di calcolo è flessibile, familiare e immediatamente disponibile. Per molte PMI italiane, è stato il primo "CRM".</p>
<p>Il problema emerge quando l'azienda cresce. Ecco i segnali che indicano che Excel ha raggiunto il suo limite.</p>

<h2>5 segnali che Excel non basta più</h2>
<ol>
<li><strong>Hai perso un cliente perché hai dimenticato un follow-up.</strong> Excel non manda notifiche, non crea promemoria automatici, non ti avvisa quando un'opportunità è ferma da troppe settimane.</li>
<li><strong>Hai più di un venditore che accede allo stesso file.</strong> I conflitti di versione, i "chi ha fatto l'ultima modifica?" e i file duplicati diventano un costo quotidiano di produttività.</li>
<li><strong>Non riesci a capire in quanto tempo si chiude una trattativa.</strong> Report e analytics su Excel richiedono pivot table e formule complesse — che nessuno aggiorna con costanza.</li>
<li><strong>I dati dei clienti sono sparsi in più file.</strong> Un foglio per i lead, uno per i clienti attivi, uno per le offerte inviate. Nessun sistema coerente.</li>
<li><strong>Non sai quali affari sono fermi e quali avanzano.</strong> Una pipeline su Excel è una lista statica, non una vista dinamica sulla salute delle vendite.</li>
</ol>

<h2>Excel vs CRM: il confronto onesto</h2>
<ul>
<li><strong>Collaborazione:</strong> Excel → difficile, versioni conflittuali | CRM → in tempo reale, dati sempre aggiornati</li>
<li><strong>Notifiche:</strong> Excel → assente | CRM → automatiche per follow-up e scadenze</li>
<li><strong>Pipeline view:</strong> Excel → lista statica | CRM → kanban interattivo con valori</li>
<li><strong>Report:</strong> Excel → manuale, time-consuming | CRM → automatici, aggiornati in tempo reale</li>
<li><strong>Automazioni:</strong> Excel → impossibili | CRM → email, task, notifiche automatiche</li>
<li><strong>Mobile:</strong> Excel → pessimo | CRM → ottimizzato per smartphone</li>
</ul>

<h2>Come fare la transizione da Excel a CRM</h2>
<h3>Step 1: Esporta i tuoi dati da Excel</h3>
<p>Prima di tutto, metti in ordine il tuo foglio. Assicurati di avere colonne chiare per: Nome, Cognome, Email, Telefono, Azienda, Stato, Note. Salva il file come CSV.</p>
<h3>Step 2: Importa in Pipely</h3>
<p>Pipely ha un wizard di import guidato. Carichi il CSV, mappi le colonne e importi i contatti in pochi minuti. Il sistema rileva automaticamente i campi standard.</p>
<h3>Step 3: Configura la tua pipeline</h3>
<p>Crea gli stage che rispecchiano il tuo processo di vendita reale. Esempi comuni: Primo contatto → Qualificato → Offerta inviata → Negoziazione → Chiuso vinto / Chiuso perso.</p>
<h3>Step 4: Sposta i deal attivi in pipeline</h3>
<p>Prendi le trattative in corso dal tuo Excel e inseriscile come affari negli stage corretti. Aggiungi il valore stimato e la data di chiusura prevista.</p>
<h3>Step 5: Crea le prime automazioni</h3>
<p>Anche una sola automazione — "Se un affare è in Offerta inviata da 3 giorni → crea attività follow-up" — cambia immediatamente la quotidianità commerciale.</p>

<h2>Quanto tempo ci vuole?</h2>
<p>La transizione completa da Excel a CRM, per un team di 1-5 persone, richiede <strong>meno di una giornata lavorativa</strong>: 2-3 ore per import e configurazione, poi un paio di giorni di abitudine per il team. Non è un progetto IT — è un cambio di strumento come passare da un browser all'altro.</p>
`,
    faqs: [
      { q: "Devo inserire manualmente tutti i miei clienti nel CRM?", a: "No. Pipely ha un import da Excel/CSV che permette di caricare centinaia di contatti in pochi minuti. Prepara il tuo foglio con colonne standard (nome, email, azienda) e usa il wizard di import guidato." },
      { q: "Posso ancora usare Excel per alcuni calcoli e il CRM per il resto?", a: "Sì. Un approccio ibrido è valido: usa il CRM per la gestione clienti, lead e pipeline, e mantieni Excel per analisi finanziarie o report personalizzati. Pipely permette l'export in CSV per alimentare le tue analisi Excel." },
    ],
  },

  {
    slug: "come-creare-pipeline-vendite",
    title: "Come Creare una Pipeline Vendite Efficace in 5 Passi",
    description: "Una pipeline vendite ben strutturata è il cuore di ogni team commerciale. Scopri come crearla, quali stage usare e come mantenerla aggiornata.",
    publishedAt: "2026-03-10",
    readingMinutes: 8,
    category: "Vendite",
    excerpt: "Una pipeline è lo strumento che trasforma le intuizioni del venditore in un processo misurabile. Ecco come costruirne una che funzioni davvero.",
    content: `
<h2>Cos'è una pipeline vendite e perché è fondamentale</h2>
<p>Una pipeline vendite è la rappresentazione visiva di tutte le trattative in corso, organizzate per stadio del processo commerciale. Non è solo uno strumento organizzativo: è il cruscotto che permette al management di capire la salute delle vendite in tempo reale e al singolo venditore di sapere sempre su cosa concentrarsi.</p>
<p>Un team con una pipeline ben gestita chiude mediamente il 28% in più di trattative rispetto a chi lavora senza struttura. Non è magia: è la differenza tra lavorare su sensazioni e lavorare su dati.</p>

<h2>Passo 1: Mappa il tuo processo di vendita reale</h2>
<p>Prima di creare qualsiasi stage, fai un'analisi onesta di come funziona davvero il tuo ciclo di vendita. Chiediti:</p>
<ul>
<li>Qual è il primo punto di contatto con un prospect?</li>
<li>Quando un lead diventa un'opportunità seria?</li>
<li>Cosa succede tra la presentazione e la firma?</li>
<li>Quali sono i momenti di "go/no-go" nel processo?</li>
</ul>
<p>La pipeline deve riflettere la realtà, non un processo ideale. Se i tuoi deal realmente passano per 7 fasi prima di chiudersi, la tua pipeline deve avere 7 stage — non 4 perché sembrano "più clean".</p>

<h2>Passo 2: Definisci gli stage</h2>
<p>Gli stage più comuni per una pipeline B2B italiana:</p>
<ul>
<li><strong>Lead qualificato</strong> — Il prospect ha interesse confermato e criterio BANT iniziale</li>
<li><strong>Contatto effettuato</strong> — Primo dialogo avvenuto (call, meeting, email risposta)</li>
<li><strong>Analisi bisogni</strong> — Discovery completata, bisogni chiari</li>
<li><strong>Offerta preparata</strong> — Proposta commerciale in lavorazione</li>
<li><strong>Offerta inviata</strong> — La proposta è nelle mani del cliente</li>
<li><strong>In negoziazione</strong> — Feedback ricevuto, trattativa in corso</li>
<li><strong>Chiuso vinto</strong> — Contratto firmato</li>
<li><strong>Chiuso perso</strong> — Opportunità non convertita (con nota del motivo)</li>
</ul>
<p>Non copiare questo schema ciecamente: adattalo al tuo settore e ciclo di vendita specifico.</p>

<h2>Passo 3: Definisci le azioni di uscita da ogni stage</h2>
<p>Uno stage non è solo un nome — è definito dall'azione che fa avanzare un deal allo stage successivo. Questo è il punto dove la maggior parte delle pipeline fallisce: gli stage sono vaghi e soggettivi, quindi ogni venditore li interpreta in modo diverso.</p>
<p>Esempio: "Lead qualificato" — un deal entra in questo stage SOLO se:</p>
<ul>
<li>Il contatto ha risposto a una nostra comunicazione</li>
<li>Ha confermato di avere budget (anche se non specificato)</li>
<li>Ha manifestato un bisogno che possiamo risolvere</li>
</ul>
<p>Documenta questi criteri e condividili col team. È la differenza tra una pipeline che rispecchia la realtà e una pipeline piena di wishful thinking.</p>

<h2>Passo 4: Assegna valori e probabilità</h2>
<p>Per ogni deal nella pipeline inserisci:</p>
<ul>
<li><strong>Valore stimato:</strong> quanto vale il contratto?</li>
<li><strong>Data di chiusura prevista:</strong> entro quando ci aspettiamo la decisione?</li>
<li><strong>Probabilità di chiusura:</strong> alcune fasi hanno una probabilità standard (es. Offerta inviata → 40%, In negoziazione → 70%)</li>
</ul>
<p>Con questi dati il CRM calcola automaticamente il <strong>forecast</strong> — il valore pesato della pipeline — che è il numero che il management guarda per capire i ricavi attesi.</p>

<h2>Passo 5: Mantieni la pipeline pulita</h2>
<p>Una pipeline con deal fermi da 90 giorni non è una pipeline — è un cimitero di speranze. Le regole per mantenere la pipeline sana:</p>
<ul>
<li>Revisione settimanale obbligatoria: 15-20 minuti ogni lunedì per aggiornare gli stage</li>
<li>Deadline automatiche: se un deal è fermo in uno stage per X giorni → automazione di allerta</li>
<li>Chiudi o archivia: un deal che non avanza deve essere chiuso (vinto, perso o rimandato) — non lasciato in limbo</li>
<li>Motivo della perdita: quando chiudi un deal come perso, nota sempre il motivo. È il dato più prezioso per migliorare il processo.</li>
</ul>
`,
    faqs: [
      { q: "Quante pipeline si possono avere su Pipely?", a: "Con il piano Starter puoi gestire 1 pipeline. Con il piano Pro hai pipeline illimitate — utile se hai team diversi (es. vendita prodotti vs servizi) o processi commerciali distinti." },
      { q: "Come capisco se la mia pipeline è sana?", a: "Una pipeline sana ha deal distribuiti in modo equilibrato tra gli stage (non tutti in uno solo), valori stimati realistici e date di chiusura recenti. Se più del 50% dei deal è fermo nello stesso stage da settimane, c'è un collo di bottiglia da analizzare." },
    ],
  },

  {
    slug: "aumentare-conversioni-commerciali",
    title: "Come Aumentare le Conversioni Commerciali con un CRM",
    description: "Strategie pratiche per aumentare il tasso di conversione delle trattative usando un CRM. Dati, automazioni e processo: cosa fa davvero la differenza.",
    publishedAt: "2026-02-28",
    readingMinutes: 7,
    category: "Vendite",
    excerpt: "Il tasso di conversione medio B2B è intorno al 20%. Chi usa un CRM in modo attivo raggiunge il 30-40%. Ecco cosa cambia nel concreto.",
    content: `
<h2>Il tasso di conversione: la metrica che conta</h2>
<p>Quante delle trattative che entrano nella tua pipeline si chiudono con successo? Se non lo sai con precisione, hai già individuato il primo problema. Senza dati, qualsiasi tentativo di migliorare le conversioni è puro ottimismo.</p>
<p>Il CRM è prima di tutto uno strumento di misurazione. Prima di ottimizzare qualsiasi cosa, devi sapere dove stai perdendo le opportunità: in quale stage i deal si fermano, in quanto tempo, e per quale motivo.</p>

<h2>Dove si perdono le trattative: analisi per stage</h2>
<p>Con un CRM, puoi analizzare il tasso di avanzamento tra uno stage e l'altro. I punti di perdita più comuni sono:</p>
<ul>
<li><strong>Lead → Qualificato (40-60% di drop):</strong> Troppi lead non qualificati entrano in pipeline. Soluzione: criteri di qualificazione più rigidi, processo di discovery strutturato.</li>
<li><strong>Offerta inviata → Negoziazione (drop del 50-70%):</strong> Le offerte non hanno risposta. Soluzione: follow-up sistematico, offerte più personalizzate, call di presentazione piuttosto che PDF inviati a freddo.</li>
<li><strong>Negoziazione → Chiuso vinto (drop del 20-30%):</strong> Obiezioni non gestite, decision-making lungo, concorrenti. Soluzione: gestione obiezioni strutturata, urgenza legittima, coinvolgimento degli stakeholder.</li>
</ul>

<h2>5 strategie per aumentare il tasso di conversione</h2>
<h3>1. Rispondi ai lead entro 5 minuti</h3>
<p>Le ricerche mostrano che rispondere a un lead entro 5 minuti aumenta la probabilità di conversione del 400% rispetto a rispondere dopo 30 minuti. Configura notifiche immediate nel CRM quando arriva un nuovo lead e imposta un'automazione che crei subito un'attività di contatto.</p>
<h3>2. Personalizza l'offerta con i dati del CRM</h3>
<p>Un'offerta generica ha tassi di conversione bassi. Con il CRM hai tutte le note delle conversazioni, le obiezioni sollevate, i bisogni specifici. Un'offerta che cita esplicitamente questi elementi converte significativamente di più.</p>
<h3>3. Automatizza il follow-up post-offerta</h3>
<p>Il 70% dei deal si perde per mancanza di follow-up, non per mancanza di interesse. Imposta una sequenza automatica di 3-4 follow-up che scattano automaticamente dopo l'invio dell'offerta. Il primo dopo 2 giorni, il secondo dopo 5, il terzo dopo 10.</p>
<h3>4. Traccia i motivi di perdita e agisci sui dati</h3>
<p>Ogni deal perso dovrebbe avere un tag: prezzo, concorrente, timing, no budget, no need. Ogni mese analizza questa distribuzione. Se il 60% dei deal si perde per "prezzo", il problema non è il commerciale — è il pricing o il posizionamento.</p>
<h3>5. Velocizza il ciclo di vendita</h3>
<p>Ogni settimana aggiuntiva nel ciclo di vendita riduce la probabilità di chiusura. Identifica le attività che allungano il ciclo (burocrazia interna, offerte complesse, decisori multipli) e trova modi per accelerarle.</p>

<h2>Metriche da monitorare ogni settimana</h2>
<ul>
<li><strong>Tasso di conversione totale:</strong> deal vinti / deal totali entrati in pipeline</li>
<li><strong>Conversion rate per stage:</strong> dove si perde di più?</li>
<li><strong>Durata media del ciclo di vendita:</strong> quanti giorni da lead a chiusura?</li>
<li><strong>Valore medio del deal:</strong> sale o scende nel tempo?</li>
<li><strong>Pipeline velocity:</strong> valore pipeline × win rate / durata ciclo = ricavi mensili attesi</li>
</ul>
<p>Pipely calcola automaticamente tutte queste metriche nella sezione Report. Bastano 10 minuti a settimana per avere una view chiara della salute delle vendite.</p>
`,
    faqs: [
      { q: "Qual è un buon tasso di conversione per una PMI B2B?", a: "Il tasso di conversione medio B2B varia molto per settore: dal 15% nel software enterprise al 40% per servizi professionali locali. L'importante è misurare il tuo baseline e migliorarlo progressivamente piuttosto che confrontarsi con benchmark generici." },
      { q: "Quanto tempo ci vuole per vedere i risultati con un CRM?", a: "I benefici operativi (meno follow-up dimenticati, pipeline più chiara) si vedono nelle prime 2-4 settimane. I miglioramenti misurabili nelle conversioni richiedono 2-3 mesi di dati per essere statisticamente significativi." },
    ],
  },

  {
    slug: "follow-up-automatici-guida",
    title: "Follow-up Automatici: Guida Completa per Team di Vendita",
    description: "Come impostare follow-up automatici con un CRM: workflow, trigger, email template e best practice per non perdere nessuna opportunità commerciale.",
    publishedAt: "2026-02-15",
    readingMinutes: 9,
    category: "Automazioni",
    excerpt: "I follow-up automatici non sostituiscono il venditore — lo liberano dalle attività meccaniche per concentrarsi sulle conversazioni che contano.",
    content: `
<h2>Cos'è un follow-up automatico e quando usarlo</h2>
<p>Un follow-up automatico è un'azione (email, notifica, creazione attività) che scatta senza intervento manuale quando si verifica una condizione definita. Non è spam: è un sistema intelligente che assicura che ogni prospect riceva attenzione nei momenti giusti, anche quando il team è impegnato altrove.</p>
<p>I follow-up automatici sono utili quando:</p>
<ul>
<li>Un lead non risponde da X giorni</li>
<li>Un'offerta è inviata e il cliente non ha ancora risposto</li>
<li>Un affare è fermo in uno stage da troppo tempo</li>
<li>Un cliente non acquista da un certo periodo</li>
<li>Una trial o periodo di prova sta per scadere</li>
</ul>

<h2>I 3 tipi di automazione follow-up</h2>
<h3>1. Automazioni basate su tempo</h3>
<p>Si attivano dopo un determinato periodo di inattività. Esempio: "Se l'ultimo contatto con un lead è stato più di 5 giorni fa → crea attività 'Chiama [Nome]' assegnata al responsabile".</p>
<p>Sono le più semplici da impostare e immediatamente efficaci per i team che perdono deal per mancanza di follow-up.</p>
<h3>2. Automazioni basate su stage pipeline</h3>
<p>Si attivano quando un deal cambia stage. Esempio: "Quando un affare entra in 'Offerta inviata' → invia email di conferma al prospect + crea attività 'Follow-up call in 3 giorni'".</p>
<p>Sono le automazioni più potenti per standardizzare il processo commerciale del team.</p>
<h3>3. Automazioni basate su comportamento email</h3>
<p>Si attivano quando un prospect apre un'email o clicca un link. Esempio: "Se il prospect apre l'email con l'offerta → notifica immediatamente il commerciale responsabile".</p>
<p>Permettono di intervenire nel momento di massimo interesse del prospect.</p>

<h2>Come impostare i workflow in Pipely</h2>
<p>In Pipely, le automazioni si configurano dalla sezione Workflow con un'interfaccia visuale a trigger-condizione-azione:</p>
<ol>
<li><strong>Scegli il trigger:</strong> evento che avvia l'automazione (cambio stage, inattività, apertura email)</li>
<li><strong>Aggiungi condizioni:</strong> filtri opzionali (es. solo per deal con valore > €5.000)</li>
<li><strong>Definisci l'azione:</strong> cosa succede (crea attività, invia email, sposta stage, notifica utente)</li>
<li><strong>Testa il workflow</strong> su un deal di prova prima di attivarlo</li>
</ol>

<h2>5 workflow follow-up pronti all'uso</h2>
<h3>Workflow 1: Nuovo lead non contattato</h3>
<ul>
<li>Trigger: nuovo lead creato</li>
<li>Condizione: nessuna attività creata nelle ultime 24 ore</li>
<li>Azione: crea attività "Primo contatto" con scadenza tra 1 giorno</li>
</ul>
<h3>Workflow 2: Offerta inviata senza risposta</h3>
<ul>
<li>Trigger: affare in stage "Offerta inviata" da 3 giorni</li>
<li>Azione: crea attività "Follow-up offerta" + invia email template al prospect</li>
</ul>
<h3>Workflow 3: Deal bloccato in pipeline</h3>
<ul>
<li>Trigger: affare fermo nello stesso stage da 14 giorni</li>
<li>Azione: notifica al responsabile + crea attività "Review deal"</li>
</ul>
<h3>Workflow 4: Deal perso - nurturing</h3>
<ul>
<li>Trigger: affare chiuso come "Perso"</li>
<li>Azione: aggiungi il contatto alla lista nurturing + pianifica contatto in 90 giorni</li>
</ul>
<h3>Workflow 5: Benvenuto nuovo contatto</h3>
<ul>
<li>Trigger: nuovo contatto creato nel database</li>
<li>Azione: invia email di benvenuto con risorse utili</li>
</ul>

<h2>Errori da evitare nelle automazioni</h2>
<ul>
<li><strong>Troppi workflow sovrapposti:</strong> se un contatto riceve 3 email automatiche in 2 giorni da workflow diversi, sembra spam. Monitora la frequenza di contatto.</li>
<li><strong>Email automatiche troppo "robotiche":</strong> personalizza sempre con il nome del prospect e il contesto specifico. Un'email automatica mal scritta fa più danno di nessuna email.</li>
<li><strong>Workflow senza off-switch:</strong> ogni automazione deve fermarsi quando la condizione non è più valida (es. se il prospect risponde, il workflow di follow-up si deve disattivare).</li>
<li><strong>Attivare tutto insieme:</strong> inizia con 1-2 workflow semplici, monitorali per due settimane, poi aggiungi complessità.</li>
</ul>
`,
    faqs: [
      { q: "I follow-up automatici sembrano poco personali?", a: "Dipende da come li scrivi. Un'email automatica con nome, contesto specifico e tono umano è indistinguibile da una email scritta manualmente. La chiave è la personalizzazione con token dinamici ({nome}, {azienda}, {nome_affare}) e un copy naturale, non formale." },
      { q: "Le automazioni sono disponibili nel piano gratuito di Pipely?", a: "Le automazioni workflow sono disponibili nel piano Pro (€29/mese). Il piano Starter include la gestione manuale delle attività ma non i workflow automatici." },
      { q: "Come faccio a sapere se le mie automazioni funzionano?", a: "Pipely mostra un log di ogni esecuzione dei workflow nella sezione Automazioni. Puoi vedere quante volte è scattato ogni trigger, quante azioni sono state eseguite e se ci sono stati errori." },
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getBlogPostsByCategory(category: string): BlogPost[] {
  return BLOG_POSTS.filter((p) => p.category === category);
}

export const BLOG_CATEGORIES = [...new Set(BLOG_POSTS.map((p) => p.category))];
