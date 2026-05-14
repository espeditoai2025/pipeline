// ─── Guide data — NO React dependencies ──────────────────────────────────────
// Used by both the guide UI (page.tsx) and the AI assistant (ai.ts).

export type GuideBlock =
  | { type: "para"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] }
  | { type: "steps"; items: string[] }
  | { type: "tip"; text: string }
  | { type: "warning"; text: string }
  | { type: "link"; text: string; href: string };

export type GuideArticle = {
  id: string;
  title: string;
  excerpt: string;
  readTime: number;
  popular?: boolean;
  blocks?: GuideBlock[];
};

export type GuideSection = {
  id: string;
  label: string;
  description: string;
  articles: GuideArticle[];
};
export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "inizia",
    label: "Inizia con Pipely",
    description: "Configurazione account, primo accesso e importazione dati",
    articles: [
      { id: "i1", title: "Come creare il tuo account Pipely", excerpt: "Guida passo-passo alla registrazione e configurazione iniziale del tuo CRM.", readTime: 3, popular: true, blocks: [
        { type: "heading", text: "Prima di iniziare" },
        { type: "para", text: "Pipely Ã¨ un CRM progettato per gestire vendite, contatti e attivitÃ  in un unico posto. La registrazione richiede meno di 2 minuti." },
        { type: "heading", text: "Registrazione" },
        { type: "steps", items: [
          "Vai alla pagina di registrazione e clicca su \"Crea account\"",
          "Inserisci nome, email e scegli una password sicura (min. 8 caratteri)",
          "Scegli il nome della tua organizzazione â€” sarÃ  visibile ai tuoi colleghi",
          "Clicca \"Crea account\" per completare la registrazione",
        ]},
        { type: "tip", text: "Puoi registrarti anche con Google per un accesso piÃ¹ rapido, senza dover memorizzare una password aggiuntiva." },
        { type: "heading", text: "Cosa succede dopo" },
        { type: "para", text: "Dopo la registrazione entri direttamente nella dashboard. Pipely mostra un wizard guidato per completare i primi passi: configurare la pipeline, aggiungere contatti, creare il primo affare e altro." },
        { type: "tip", text: "Se crei l'account per un team, invita subito i tuoi colleghi da Impostazioni â†’ Team." },
      ]},
      { id: "i2", title: "Configurare la tua organizzazione", excerpt: "Imposta il nome, il logo e le informazioni della tua azienda in Pipely.", readTime: 4, blocks: [
        { type: "heading", text: "Dove si trovano le impostazioni" },
        { type: "para", text: "Clicca sull'icona ingranaggio nella sidebar per accedere al pannello Impostazioni." },
        { type: "heading", text: "Nome e slug" },
        { type: "para", text: "Il nome dell'organizzazione Ã¨ visibile a tutti i membri del team. Lo slug Ã¨ un identificatore univoco assegnato alla registrazione e non Ã¨ modificabile successivamente." },
        { type: "heading", text: "Piano attivo" },
        { type: "para", text: "Nella sezione Impostazioni puoi visualizzare il piano attivo: Starter (gratuito), Pro (â‚¬29/mese) o Enterprise (custom). Ogni piano sblocca funzionalitÃ  aggiuntive." },
        { type: "tip", text: "Mantieni i dati dell'organizzazione aggiornati â€” il nome viene usato come mittente predefinito nelle email inviate tramite Pipely." },
      ]},
      { id: "i3", title: "Invitare i membri del team", excerpt: "Come aggiungere collaboratori e assegnare ruoli e permessi.", readTime: 5, popular: true, blocks: [
        { type: "heading", text: "Ruoli disponibili" },
        { type: "list", items: [
          "OWNER â€” accesso completo, puÃ² modificare il piano e gestire tutti i dati",
          "ADMIN â€” accesso completo eccetto la gestione del piano",
          "MANAGER â€” gestisce affari, contatti e team ma non le impostazioni avanzate",
          "SALES â€” crea e gestisce affari e contatti, non accede alle impostazioni",
          "VIEWER â€” solo visualizzazione, nessuna modifica",
        ]},
        { type: "heading", text: "Come invitare un membro" },
        { type: "steps", items: [
          "Vai su Impostazioni â†’ Team",
          "Clicca su \"Invita membro\"",
          "Inserisci l'email del collega e scegli il ruolo appropriato",
          "Clicca \"Invia invito\" â€” il collega riceve un'email con il link di accesso",
        ]},
        { type: "tip", text: "Un venditore che deve solo inserire affari e contatti ha bisogno del ruolo SALES. Assegna ADMIN solo a chi gestisce l'account." },
      ]},
      { id: "i4", title: "Importare contatti da CSV o Excel", excerpt: "Trasferisci i tuoi dati esistenti in Pipely: carica file CSV, XLS o XLSX oppure scarica il template Excel precompilato.", readTime: 6, blocks: [
        { type: "heading", text: "Formati supportati" },
        { type: "para", text: "Pipely accetta file CSV, XLS e XLSX. Puoi preparare il file con Excel, Google Sheets o LibreOffice." },
        { type: "heading", text: "Scaricare il template Excel" },
        { type: "steps", items: [
          "Vai su Contatti nella sidebar",
          "Clicca sull'icona \"Importa\" in alto a destra",
          "Nella finestra che si apre, clicca \"Scarica template Excel\"",
          "Compila il file con i tuoi dati e salvalo",
        ]},
        { type: "heading", text: "Importare il file" },
        { type: "steps", items: [
          "Apri la finestra di importazione (Contatti â†’ Importa)",
          "Trascina il file nell'area di upload oppure clicca per selezionarlo",
          "Verifica la preview: Pipely mostra le prime 5 righe rilevate",
          "Controlla che le colonne siano mappate correttamente",
          "Clicca \"Importa N contatti\" per avviare l'importazione",
        ]},
        { type: "heading", text: "Colonne riconosciute automaticamente" },
        { type: "list", items: ["Nome / First Name", "Cognome / Last Name", "Email", "Telefono / Phone", "Azienda / Company"] },
        { type: "tip", text: "I duplicati (stessa email) vengono ignorati automaticamente. Puoi importare lo stesso file piÃ¹ volte senza creare duplicati." },
        { type: "warning", text: "Il file non deve superare i 5 MB. Per file molto grandi, dividili in piÃ¹ batch da importare separatamente." },
      ]},
      { id: "i5", title: "Panoramica della dashboard", excerpt: "Scopri i KPI principali, la pipeline overview, i widget e la guida wizard per i primi passi.", readTime: 3, blocks: [
        { type: "heading", text: "I KPI principali" },
        { type: "list", items: [
          "Affari aperti â€” numero totale di trattative attive nella pipeline",
          "Valore pipeline â€” somma del valore di tutti gli affari aperti",
          "Revenue vinta â€” totale degli affari chiusi come Vinti negli ultimi 30 giorni",
          "Win rate â€” percentuale di affari vinti sul totale chiusi (vinti + persi)",
          "Previsione ponderata â€” stima del fatturato basata sulla probabilitÃ  di ogni stage",
          "AttivitÃ  scadute â€” attivitÃ  con data di scadenza superata e non completate",
        ]},
        { type: "heading", text: "Grafico pipeline per stage" },
        { type: "para", text: "Il grafico a barre mostra la distribuzione degli affari e del valore per ogni stage. Usalo per identificare colli di bottiglia (es. molti affari bloccati nello stage Proposta)." },
        { type: "heading", text: "La guida di avvio rapido" },
        { type: "para", text: "Se sei nuovo, in cima alla dashboard trovi il wizard che ti accompagna in 10 passi: configurare la pipeline, aggiungere aziende, contatti, prodotti, affari, attivitÃ , email SMTP, automazioni, liste e campagne." },
        { type: "tip", text: "Una volta completati tutti i passi, la guida puÃ² essere nascosta cliccando sulla X in alto a destra. Lo stato viene salvato nel browser." },
      ]},
      { id: "i6", title: "Personalizzare le impostazioni iniziali", excerpt: "Lingua, fuso orario, valuta e altre preferenze dell'account.", readTime: 4, blocks: [
        { type: "heading", text: "Profilo personale" },
        { type: "para", text: "In Impostazioni â†’ Profilo puoi aggiornare il nome visualizzato e la foto profilo. L'email non Ã¨ modificabile in quanto usata per l'autenticazione." },
        { type: "heading", text: "Configurazione email (SMTP)" },
        { type: "para", text: "In Impostazioni â†’ Email configuri il provider per inviare email reali ai tuoi contatti. Pipely supporta Gmail, Aruba, Libero e qualsiasi provider SMTP custom." },
        { type: "tip", text: "Senza SMTP configurato, le email mostrate nell'app sono simulate. Configura SMTP per abilitare l'invio reale ai destinatari." },
        { type: "heading", text: "Gestione team" },
        { type: "para", text: "In Impostazioni â†’ Team gestisci i membri: inviti, modifica ruoli, rimozione utenti." },
        { type: "heading", text: "Pipeline e stage" },
        { type: "para", text: "In Impostazioni â†’ Pipeline personalizzi gli stage: nome, probabilitÃ  di chiusura, colore e ordine. Puoi creare pipeline multiple per processi diversi (es. vendite, supporto)." },
      ]},
    ],
  },
  {
    id: "pipeline",
    label: "Pipeline & Affari",
    description: "Crea pipeline, gestisci affari e monitora le trattative",
    articles: [
      { id: "p1", title: "Come creare e configurare una pipeline", excerpt: "Imposta gli stage, la probabilitÃ  di chiusura e i tempi di rotting per la tua pipeline.", readTime: 5, popular: true, blocks: [
        { type: "heading", text: "Cos'Ã¨ una pipeline" },
        { type: "para", text: "Una pipeline rappresenta il processo di vendita suddiviso in stage progressivi. Ogni affare avanza da uno stage all'altro verso la chiusura." },
        { type: "heading", text: "Creare la prima pipeline" },
        { type: "steps", items: [
          "Vai su Impostazioni â†’ Pipeline",
          "Clicca \"Nuova pipeline\" e assegna un nome (es. Vendite B2B)",
          "Aggiungi gli stage cliccando il pulsante + accanto all'ultimo stage",
          "Per ogni stage imposta: nome, probabilitÃ  di chiusura (0â€“100%), colore opzionale",
          "Riordina gli stage trascinandoli con il drag handle",
          "Clicca Salva",
        ]},
        { type: "heading", text: "Stage consigliati" },
        { type: "list", items: [
          "Prospect (0%) â€” contatto identificato, non ancora qualificato",
          "Qualificato (20%) â€” interesse confermato",
          "Proposta inviata (50%) â€” offerta presentata al cliente",
          "Negoziazione (75%) â€” trattativa in corso",
          "Chiusura (90%) â€” accordo quasi finalizzato",
        ]},
        { type: "tip", text: "La probabilitÃ  di ogni stage viene usata per calcolare la previsione ponderata nella dashboard: valore affare Ã— probabilitÃ  stage." },
        { type: "heading", text: "Rotting" },
        { type: "para", text: "Il rotting Ã¨ un avviso visivo per gli affari fermi in uno stage da troppo tempo. Puoi configurare il numero di giorni soglia nelle impostazioni della pipeline." },
      ]},
      { id: "p2", title: "Aggiungere e gestire gli affari", excerpt: "Crea nuovi affari, assegnali ai responsabili e collegali a contatti e aziende.", readTime: 4, popular: true, blocks: [
        { type: "heading", text: "Creare un nuovo affare" },
        { type: "steps", items: [
          "Vai su Affari nella sidebar",
          "Clicca \"Nuovo affare\" in alto a destra",
          "Inserisci il titolo dell'affare e il valore stimato",
          "Seleziona lo stage di partenza nella pipeline",
          "Collega un contatto e/o un'azienda",
          "Assegna un responsabile e una data di chiusura prevista",
          "Clicca Crea",
        ]},
        { type: "heading", text: "Gestire gli affari nella vista Kanban" },
        { type: "para", text: "Nella vista Kanban puoi trascinare le card direttamente da uno stage all'altro. Lo stage dell'affare si aggiorna automaticamente." },
        { type: "heading", text: "Aggiungere prodotti a un affare" },
        { type: "para", text: "Apri la scheda dell'affare e cerca la sezione Prodotti. Aggiungi prodotti dal catalogo, imposta quantitÃ  e sconto. Il valore dell'affare si ricalcola in automatico." },
        { type: "tip", text: "Imposta sempre una data di chiusura prevista: viene usata per i report di previsione e per calcolare il tasso di conversione nel tempo." },
      ]},
      { id: "p3", title: "Spostare gli affari tra gli stage", excerpt: "Come trascinare le card nella vista Kanban e aggiornare lo stato degli affari.", readTime: 3, blocks: [
        { type: "heading", text: "Drag & drop nella vista Kanban" },
        { type: "para", text: "Nella vista Kanban ogni colonna rappresenta uno stage della pipeline. Per spostare un affare tieni premuto sulla card e trascinala nella colonna desiderata: lo stage si aggiorna automaticamente." },
        { type: "steps", items: [
          "Vai su Affari e seleziona la vista Kanban (icona colonne in alto a destra)",
          "Individua la card dell'affare da spostare",
          "Tieni premuto il mouse (o il dito su mobile) sulla card",
          "Trascina la card nella colonna dello stage di destinazione",
          "Rilascia: lo stage dell'affare viene aggiornato istantaneamente",
        ]},
        { type: "heading", text: "Aggiornare lo stage dalla scheda affare" },
        { type: "para", text: "Puoi cambiare lo stage anche aprendo la scheda affare e selezionando il nuovo stage dal menu a tendina in cima alla pagina. Utile da mobile o quando si gestiscono piÃ¹ informazioni insieme." },
        { type: "tip", text: "Ogni spostamento viene registrato nello storico dell'affare con data e utente che ha effettuato la modifica." },
      ]},
      { id: "p4", title: "Rotting: affari in attesa troppo a lungo", excerpt: "Cos'Ã¨ il rotting, come configurarlo e come ricevere notifiche sugli affari fermi.", readTime: 4, blocks: [
        { type: "heading", text: "Cos'Ã¨ il rotting" },
        { type: "para", text: "Il rotting Ã¨ un segnale visivo che avvisa quando un affare Ã¨ rimasto nello stesso stage per troppo tempo senza attivitÃ . Gli affari in rotting mostrano un badge rosso nella vista Kanban e nella lista affari." },
        { type: "heading", text: "Configurare i giorni soglia" },
        { type: "steps", items: [
          "Vai su Impostazioni â†’ Pipeline",
          "Seleziona la pipeline da configurare",
          "Per ogni stage trovi il campo \"Giorni prima del rotting\"",
          "Imposta il numero di giorni (es. 7 per lo stage Proposta, 14 per Negoziazione)",
          "Salva le modifiche",
        ]},
        { type: "heading", text: "Come gestire gli affari in rotting" },
        { type: "list", items: [
          "Filtra la lista affari per mostrare solo gli affari con rotting attivo",
          "Contatta il referente, aggiorna le note o pianifica un'attivitÃ  di follow-up",
          "Non appena viene registrata un'attivitÃ  o cambia lo stage, il badge rotting sparisce",
        ]},
        { type: "tip", text: "Configura soglie diverse per stage diversi: uno stage iniziale come Prospect puÃ² tollerare piÃ¹ giorni rispetto a Negoziazione, dove la trattativa Ã¨ avanzata." },
      ]},
      { id: "p5", title: "Marcare un affare come vinto o perso", excerpt: "Come chiudere un affare e registrare il motivo della perdita per le analisi.", readTime: 3, blocks: [
        { type: "heading", text: "Chiudere un affare come Vinto" },
        { type: "steps", items: [
          "Apri la scheda dell'affare",
          "Clicca il pulsante verde \"Vinto\" in alto a destra",
          "Conferma: l'affare passa a stato VINTO e viene contabilizzato nella Revenue vinta",
        ]},
        { type: "heading", text: "Chiudere un affare come Perso" },
        { type: "steps", items: [
          "Apri la scheda dell'affare",
          "Clicca il pulsante rosso \"Perso\"",
          "Inserisci il motivo della perdita nel campo apposito (es. Prezzo, Concorrente, No budget)",
          "Conferma: l'affare passa a stato PERSO",
        ]},
        { type: "heading", text: "Impatto sui report" },
        { type: "para", text: "Gli affari vinti incrementano il KPI Revenue vinta e il Win rate nella dashboard. I motivi di perdita sono analizzabili nella sezione Report per identificare le aree di miglioramento." },
        { type: "tip", text: "Compilare sempre il motivo della perdita: nel tempo questi dati diventano un'analisi preziosa su dove si perdono piÃ¹ trattative." },
      ]},
      { id: "p6", title: "Filtri e ricerca avanzata nella pipeline", excerpt: "Filtra gli affari per stage, responsabile, valore, data e altri criteri.", readTime: 5, blocks: [
        { type: "heading", text: "Filtri disponibili" },
        { type: "list", items: [
          "Stage â€” mostra solo gli affari in uno o piÃ¹ stage selezionati",
          "Responsabile â€” filtra per il membro del team assegnato all'affare",
          "Valore minimo / massimo â€” intervallo di valore economico dell'affare",
          "Data chiusura prevista â€” range di date entro cui si prevede la chiusura",
          "Stato â€” Aperto, Vinto, Perso",
        ]},
        { type: "heading", text: "Come applicare i filtri" },
        { type: "steps", items: [
          "Vai su Affari nella sidebar",
          "Clicca l'icona Filtri in alto a destra",
          "Seleziona uno o piÃ¹ criteri dal pannello laterale",
          "La lista (o Kanban) si aggiorna in tempo reale mostrando solo gli affari corrispondenti",
        ]},
        { type: "heading", text: "Combinare piÃ¹ filtri" },
        { type: "para", text: "I filtri si combinano con logica AND: attivando Stage = Proposta e Responsabile = Mario vengono mostrati solo gli affari nello stage Proposta assegnati a Mario." },
        { type: "tip", text: "Per resettare tutti i filtri clicca il pulsante \"Reimposta filtri\" in fondo al pannello. Lo stato dei filtri non viene salvato tra le sessioni." },
      ]},
    ],
  },
  {
    id: "contatti",
    label: "Contatti & Aziende",
    description: "Gestione anagrafica, importazione e relazioni tra entitÃ ",
    articles: [
      { id: "c1", title: "Creare e modificare un contatto", excerpt: "Aggiungi nome, email, telefono, azienda di riferimento e campi personalizzati.", readTime: 3, popular: true, blocks: [
        { type: "heading", text: "Creare un nuovo contatto" },
        { type: "steps", items: [
          "Vai su Contatti nella sidebar",
          "Clicca \"Nuovo contatto\" in alto a destra",
          "Inserisci nome, cognome ed email",
          "Aggiungi telefono, ruolo/qualifica e azienda di riferimento",
          "Clicca Crea contatto",
        ]},
        { type: "heading", text: "Campi principali" },
        { type: "list", items: [
          "Nome e Cognome â€” usati per personalizzare le email con {{nome}} e {{cognome}}",
          "Email â€” indirizzo principale per comunicazioni e campagne",
          "Telefono â€” visibile nella scheda per chiamate rapide",
          "Azienda â€” collega il contatto a un'azienda esistente in Pipely",
          "Ruolo/Qualifica â€” posizione nella sua azienda (es. Responsabile Acquisti)",
        ]},
        { type: "heading", text: "Modificare un contatto" },
        { type: "para", text: "Clicca sul nome di qualsiasi contatto per aprire il dettaglio. Da lÃ¬ puoi modificare tutti i campi, vedere lo storico delle attivitÃ , gli affari collegati e le email inviate." },
        { type: "tip", text: "Collegare i contatti alle aziende ti permette di vedere tutti i referenti di un'azienda in un unico posto, nella scheda dell'azienda stessa." },
      ]},
      { id: "c2", title: "Collegare contatti alle aziende", excerpt: "Come associare un contatto a una o piÃ¹ aziende e gestire i ruoli.", readTime: 4, blocks: [
        { type: "heading", text: "Campo Azienda nel form contatto" },
        { type: "para", text: "Quando crei o modifichi un contatto, il campo Azienda ti permette di collegarlo a un'azienda esistente nel CRM. Inizia a digitare il nome: Pipely suggerisce le aziende giÃ  registrate." },
        { type: "heading", text: "Creare un'azienda al volo" },
        { type: "para", text: "Se l'azienda non esiste ancora, puoi crearla direttamente dal campo Azienda: digita il nome e seleziona l'opzione \"Crea azienda con questo nome\". L'azienda viene creata e collegata al contatto in un unico passaggio." },
        { type: "heading", text: "Effetti del collegamento" },
        { type: "list", items: [
          "La scheda dell'azienda mostra l'elenco di tutti i contatti collegati",
          "Gli affari associati ai contatti appaiono anche nella scheda aziendale",
          "Filtrare i contatti per azienda diventa immediato",
        ]},
        { type: "tip", text: "Collegare sempre i contatti alle rispettive aziende ti permette di avere una vista completa di tutte le persone e trattative legate a un cliente." },
      ]},
      { id: "c3", title: "Importare contatti in massa", excerpt: "Guida al formato CSV corretto, mapping dei campi e gestione dei duplicati.", readTime: 7, blocks: [
        { type: "heading", text: "Formato CSV corretto" },
        { type: "list", items: [
          "Encoding: UTF-8 (non UTF-16 o ANSI)",
          "Separatore: virgola o punto e virgola",
          "Prima riga: intestazioni delle colonne (Nome, Cognome, Email, Telefono, Azienda)",
          "Dimensione massima file: 5 MB",
        ]},
        { type: "heading", text: "Procedura di importazione" },
        { type: "steps", items: [
          "Vai su Contatti â†’ clicca l'icona Importa in alto a destra",
          "Trascina il file CSV nell'area di upload o clicca per selezionarlo",
          "Verifica la preview con le prime 5 righe",
          "Controlla il mapping delle colonne rilevate automaticamente",
          "Clicca \"Importa\" per avviare il processo",
        ]},
        { type: "heading", text: "Gestione duplicati" },
        { type: "para", text: "I contatti con la stessa email di uno giÃ  presente nel CRM vengono automaticamente ignorati. Puoi importare lo stesso file piÃ¹ volte senza creare duplicati." },
        { type: "warning", text: "Se il file supera i 5 MB, dividilo in piÃ¹ file da importare separatamente. Per file molto grandi usa blocchi da massimo 1000 righe ciascuno." },
      ]},
      { id: "c4", title: "Gestire le aziende e i loro contatti", excerpt: "Vista aziendale, elenco dipendenti, affari collegati e storico attivitÃ .", readTime: 5, blocks: [
        { type: "heading", text: "Aprire la scheda azienda" },
        { type: "para", text: "Vai su Contatti â†’ tab Aziende, oppure clicca sul nome di un'azienda da qualsiasi parte del CRM. La scheda mostra tutte le informazioni dell'azienda in un unico posto." },
        { type: "heading", text: "Contenuto della scheda azienda" },
        { type: "list", items: [
          "Campi azienda: nome, settore, sito web, telefono, indirizzo",
          "Contatti collegati: elenco di tutte le persone associate all'azienda",
          "Affari associati: tutte le trattative collegate ai contatti dell'azienda",
          "AttivitÃ : storico delle attivitÃ  svolte con questa azienda",
        ]},
        { type: "heading", text: "Modificare i dati aziendali" },
        { type: "para", text: "Clicca sul pulsante Modifica nella scheda azienda per aggiornare nome, settore, sito web, telefono e altri campi. Le modifiche sono immediatamente visibili a tutti i membri del team." },
        { type: "tip", text: "Compilare il campo Settore ti permette di filtrare le aziende per vertical e di analizzare le performance di vendita per tipo di industria." },
      ]},
      { id: "c5", title: "Campi personalizzati per contatti", excerpt: "Aggiungi campi su misura per raccogliere le informazioni che servono al tuo team.", readTime: 6, blocks: [
        { type: "heading", text: "Creare un campo personalizzato" },
        { type: "steps", items: [
          "Vai su Impostazioni â†’ Campi personalizzati",
          "Seleziona l'entitÃ : Contatto, Affare o Azienda",
          "Clicca \"Aggiungi campo\"",
          "Inserisci il nome del campo e scegli il tipo",
          "Salva: il campo appare nelle schede di tutti i contatti per tutti i membri del team",
        ]},
        { type: "heading", text: "Tipi di campo disponibili" },
        { type: "list", items: [
          "Testo â€” campo libero per note brevi o identificatori",
          "Numero â€” valori numerici (es. fatturato annuo cliente)",
          "Data â€” selettore data (es. data di rinnovo contratto)",
          "Selezione singola â€” menu a tendina con opzioni predefinite",
        ]},
        { type: "tip", text: "I campi personalizzati sono visibili a tutti i membri del team e non possono essere resi privati. Usa nomi chiari che il team possa capire subito." },
      ]},
      { id: "c6", title: "Eliminare o archiviare un contatto", excerpt: "Differenza tra eliminazione definitiva e archiviazione; come recuperare i dati.", readTime: 3, blocks: [
        { type: "heading", text: "Eliminazione definitiva" },
        { type: "steps", items: [
          "Apri la scheda del contatto",
          "Clicca i tre puntini (â‹¯) in alto a destra",
          "Seleziona \"Elimina contatto\"",
          "Conferma l'eliminazione nella finestra di dialogo",
        ]},
        { type: "heading", text: "Cosa succede agli affari collegati" },
        { type: "para", text: "Gli affari collegati al contatto non vengono eliminati automaticamente: rimangono nella pipeline con il campo contatto vuoto. Dovrai aggiornare o eliminare manualmente gli affari orfani." },
        { type: "warning", text: "L'eliminazione Ã¨ definitiva e irreversibile. Pipely non dispone di una funzione archivio: una volta eliminato, il contatto e le sue informazioni non possono essere recuperati." },
        { type: "tip", text: "Se hai dubbi, prima di eliminare esporta i dati del contatto tramite la funzione Export CSV nella lista contatti." },
      ]},
    ],
  },
  {
    id: "lead",
    label: "Lead Management",
    description: "Cattura lead, qualificazione e conversione in affari",
    articles: [
      { id: "l1", title: "Cos'Ã¨ un lead in Pipely e come crearlo", excerpt: "Differenza tra lead e affare; come aggiungere un nuovo lead e assegnargli uno score.", readTime: 4, popular: true, blocks: [
        { type: "heading", text: "Lead vs Affare" },
        { type: "para", text: "Un lead Ã¨ un prospect non ancora qualificato: sai che esiste un interesse, ma non hai ancora abbastanza informazioni per aprire una trattativa. Un affare si crea quando il lead Ã¨ qualificato e merita una posizione nella pipeline di vendita." },
        { type: "heading", text: "Creare un nuovo lead" },
        { type: "steps", items: [
          "Vai su Leads nella sidebar",
          "Clicca \"Nuovo lead\"",
          "Inserisci nome, email e telefono del prospect",
          "Imposta lo score (0â€“100), la fonte (es. Sito web, LinkedIn) e aggiungi note",
          "Assegna un responsabile e clicca Crea",
        ]},
        { type: "heading", text: "Campi principali del lead" },
        { type: "list", items: [
          "Nome e Email â€” identificano il prospect",
          "Telefono â€” per contatti diretti",
          "Score â€” valore numerico 0-100 per prioritizzare",
          "Fonte â€” da dove proviene il lead (es. Sito web, Evento, Referral)",
          "Note â€” informazioni aggiuntive sul prospect",
        ]},
        { type: "tip", text: "Usa la sezione Leads come filtro: inserisci tutti i contatti iniziali e converti in affare solo quelli che superano la qualificazione." },
      ]},
      { id: "l2", title: "Qualificare un lead: stati e workflow", excerpt: "Gli stati NEW, WORKING, NURTURING, CONVERTED e come passare da uno all'altro.", readTime: 5, blocks: [
        { type: "heading", text: "Gli stati del lead" },
        { type: "list", items: [
          "NEW â€” lead appena creato, non ancora lavorato",
          "WORKING â€” il responsabile sta attivamente qualificando il lead",
          "NURTURING â€” lead non ancora pronto, da coltivare nel tempo",
          "CONVERTED â€” lead qualificato e trasformato in affare",
          "LOST â€” lead perso, non interessato o non raggiungibile",
        ]},
        { type: "heading", text: "Come cambiare stato" },
        { type: "steps", items: [
          "Apri la scheda del lead",
          "Clicca sul badge stato in cima alla pagina",
          "Seleziona il nuovo stato dal menu",
          "Lo stato si aggiorna istantaneamente",
        ]},
        { type: "heading", text: "Buone pratiche" },
        { type: "para", text: "Aggiorna lo stato del lead dopo ogni interazione. I lead in NURTURING vanno contattati periodicamente con campagne email. Un lead rimasto in NEW per piÃ¹ di 3 giorni Ã¨ spesso un segnale che manca un responsabile assegnato." },
        { type: "tip", text: "Usa le automazioni per cambiare stato automaticamente: es. quando viene completata un'attivitÃ  di tipo Chiamata, sposta il lead da NEW a WORKING." },
      ]},
      { id: "l3", title: "Convertire un lead in affare", excerpt: "Come trasformare un lead qualificato in un affare nella pipeline.", readTime: 3, popular: true, blocks: [
        { type: "heading", text: "Come convertire un lead" },
        { type: "steps", items: [
          "Apri la scheda del lead qualificato",
          "Clicca il pulsante \"Converti in affare\" in alto a destra",
          "Se il contatto non esiste ancora, Pipely offre di crearlo automaticamente con i dati del lead",
          "Seleziona la pipeline e lo stage di partenza per il nuovo affare",
          "Conferma: viene creato l'affare e il lead passa a stato CONVERTED",
        ]},
        { type: "heading", text: "Cosa viene creato" },
        { type: "list", items: [
          "Un nuovo affare nella pipeline selezionata",
          "Opzionalmente un nuovo contatto con i dati del lead",
          "Il lead rimane visibile con stato CONVERTED per riferimento storico",
        ]},
        { type: "tip", text: "Dopo la conversione il lead non viene eliminato: puoi sempre tornare alla scheda lead per vedere da dove Ã¨ partita la trattativa." },
      ]},
      { id: "l4", title: "Score e prioritÃ  dei lead", excerpt: "Come usare il punteggio per ordinare i lead e concentrarsi sui piÃ¹ promettenti.", readTime: 4, blocks: [
        { type: "heading", text: "Il campo score" },
        { type: "para", text: "Lo score Ã¨ un numero da 0 a 100 che indica la prioritÃ  del lead. Ãˆ un campo manuale: sei tu a decidere il punteggio in base alle informazioni raccolte durante la qualificazione." },
        { type: "heading", text: "Come usare lo score" },
        { type: "list", items: [
          "Ordina la lista lead per score decrescente per lavorare prima sui piÃ¹ promettenti",
          "Filtra i lead con score superiore a una soglia (es. > 70) per campagne dedicate",
          "Usa lo score come criterio nelle automazioni (es. score > 80 â†’ crea attivitÃ  urgente)",
        ]},
        { type: "heading", text: "Criteri di scoring suggeriti" },
        { type: "list", items: [
          "+30 punti se ha un budget definito",
          "+25 punti se Ã¨ il decision maker",
          "+20 punti se ha un'esigenza urgente",
          "+15 punti se conosce giÃ  il prodotto",
          "+10 punti se proviene da referral",
        ]},
        { type: "tip", text: "Non esiste un calcolo automatico dello score: definisci una scala condivisa con il team per garantire coerenza nella valutazione." },
      ]},
      { id: "l5", title: "Importare lead da fonti esterne", excerpt: "Integrazione con form web, LinkedIn e altri strumenti di lead generation.", readTime: 6, blocks: [
        { type: "heading", text: "Opzioni di importazione attuali" },
        { type: "para", text: "Al momento Pipely non dispone di un'importazione diretta dedicata alla sezione Lead. Il flusso consigliato Ã¨: importa i contatti via CSV nella sezione Contatti, poi crea manualmente i lead dalla sezione Leads." },
        { type: "heading", text: "Flusso di importazione da CSV" },
        { type: "steps", items: [
          "Prepara un file CSV con i dati dei prospect (nome, email, telefono, fonte)",
          "Vai su Contatti â†’ Importa e carica il file",
          "Una volta importati i contatti, vai su Leads â†’ Nuovo lead e crea i lead associandoli ai contatti importati",
        ]},
        { type: "heading", text: "FunzionalitÃ  in arrivo" },
        { type: "list", items: [
          "Import diretto nella sezione Leads via CSV",
          "Webhook API per acquisire lead da form web in tempo reale",
          "Integrazione con Zapier/Make per connettere strumenti di lead generation",
        ]},
        { type: "tip", text: "Per essere avvisato quando le nuove funzionalitÃ  di importazione lead saranno disponibili, iscriviti alla newsletter Pipely." },
      ]},
      { id: "l6", title: "Report sulle performance dei lead", excerpt: "Tasso di conversione, tempo medio di qualificazione e analisi per sorgente.", readTime: 5, blocks: [
        { type: "heading", text: "Metriche disponibili" },
        { type: "list", items: [
          "Tasso di conversione â€” percentuale di lead convertiti in affare sul totale (CONVERTED / totale lead)",
          "Lead per stato â€” distribuzione dei lead tra NEW, WORKING, NURTURING, CONVERTED, LOST",
          "Lead per fonte â€” quanti lead provengono da ogni sorgente (Sito web, Evento, Referral...)",
        ]},
        { type: "heading", text: "Calcolo del tasso di conversione" },
        { type: "para", text: "Il tasso di conversione si calcola dividendo i lead con stato CONVERTED per il totale dei lead creati nel periodo. Non esiste ancora un KPI dedicato nella dashboard: puoi calcolarlo manualmente filtrando la lista lead per stato e periodo." },
        { type: "heading", text: "Analisi per fonte" },
        { type: "para", text: "Filtra la lista lead per il campo Fonte per capire quale canale porta i lead piÃ¹ qualificati. Confronta il tasso di conversione per fonte per ottimizzare gli investimenti di marketing." },
        { type: "tip", text: "Il KPI \"tempo medio di qualificazione\" non Ã¨ disponibile come metrica preconfigurata: puoi stimarlo confrontando la data di creazione con quella di conversione nei record filtrati." },
      ]},
    ],
  },
  {
    id: "attivita",
    label: "AttivitÃ  & Calendario",
    description: "Pianifica chiamate, email, meeting e follow-up",
    articles: [
      { id: "a1", title: "Creare una nuova attivitÃ ", excerpt: "Come pianificare una chiamata, un'email, un meeting o un'altra attivitÃ .", readTime: 3, popular: true, blocks: [
        { type: "heading", text: "Tipi di attivitÃ  disponibili" },
        { type: "list", items: [
          "Chiamata â€” telefonata da effettuare o giÃ  effettuata",
          "Email â€” email da inviare o da registrare nello storico",
          "Meeting â€” appuntamento o riunione",
          "Task â€” attivitÃ  generica da completare",
          "Scadenza â€” promemoria per una scadenza importante",
        ]},
        { type: "heading", text: "Come creare un'attivitÃ " },
        { type: "steps", items: [
          "Vai su AttivitÃ  nella sidebar oppure apri la scheda di un affare o contatto",
          "Clicca \"Nuova attivitÃ \"",
          "Seleziona il tipo di attivitÃ ",
          "Inserisci titolo, data/ora, responsabile assegnato",
          "Collega un affare e/o un contatto (opzionale ma consigliato)",
          "Aggiungi note se necessario e clicca Crea",
        ]},
        { type: "tip", text: "Creare attivitÃ  direttamente dalla scheda affare o contatto le collega automaticamente: risparmi un passaggio e lo storico rimane sempre aggiornato." },
      ]},
      { id: "a2", title: "Collegare attivitÃ  ad affari e contatti", excerpt: "Associa le attivitÃ  agli affari o ai contatti per tenere traccia dello storico.", readTime: 4, blocks: [
        { type: "heading", text: "Campi di collegamento nel form attivitÃ " },
        { type: "para", text: "Nel form di creazione attivitÃ  trovi il campo \"Deal\" e il campo \"Contatto\". Collegare l'attivitÃ  a entrambi garantisce che appaia nello storico sia dell'affare che del contatto." },
        { type: "heading", text: "Come funziona lo storico" },
        { type: "list", items: [
          "Scheda affare â†’ tab AttivitÃ : mostra tutte le attivitÃ  collegate a quell'affare",
          "Scheda contatto â†’ tab AttivitÃ : mostra tutte le attivitÃ  collegate a quel contatto",
          "Sezione AttivitÃ  globale: mostra tutte le attivitÃ  del team con filtri",
        ]},
        { type: "heading", text: "Modificare i collegamenti" },
        { type: "para", text: "Puoi modificare i campi Deal e Contatto di un'attivitÃ  giÃ  creata aprendo la scheda attivitÃ  e cliccando Modifica. Il cambio Ã¨ immediato e lo storico si aggiorna automaticamente." },
        { type: "tip", text: "Per un CRM efficace, ogni chiamata o email con un cliente deve avere un'attivitÃ  registrata con il deal collegato. Questo costruisce uno storico completo delle interazioni per ogni trattativa." },
      ]},
      { id: "a3", title: "AttivitÃ  scadute e promemoria", excerpt: "Come ricevere notifiche, gestire le attivitÃ  in ritardo e ripianificarle.", readTime: 4, blocks: [
        { type: "heading", text: "Badge attivitÃ  scadute" },
        { type: "para", text: "Nella dashboard trovi il KPI \"AttivitÃ  scadute\" che mostra il numero di attivitÃ  con data di scadenza superata e non ancora completate. Il numero Ã¨ in rosso per attirare l'attenzione." },
        { type: "heading", text: "Come trovare le attivitÃ  scadute" },
        { type: "steps", items: [
          "Vai su AttivitÃ  nella sidebar",
          "Usa il filtro \"Scadute\" per mostrare solo le attivitÃ  in ritardo",
          "Ordina per data crescente per vedere prima le piÃ¹ vecchie",
          "Completa, ripianifica o elimina le attivitÃ  scadute",
        ]},
        { type: "heading", text: "Notifiche push" },
        { type: "para", text: "Al momento Pipely non invia notifiche push automatiche per le attivitÃ  in scadenza. Le notifiche push sono in roadmap per Q3 2025." },
        { type: "tip", text: "Controlla le attivitÃ  scadute ogni mattina dalla dashboard: mantenere questo numero a zero Ã¨ un buon indicatore di un processo di vendita organizzato." },
      ]},
      { id: "a4", title: "Vista calendario delle attivitÃ ", excerpt: "Usa la vista giornaliera e settimanale per organizzare il tuo piano di lavoro.", readTime: 3, blocks: [
        { type: "heading", text: "Accedere alla vista calendario" },
        { type: "steps", items: [
          "Vai su AttivitÃ  nella sidebar",
          "In alto a destra trovi i pulsanti Lista e Calendario",
          "Clicca su Calendario per passare alla vista mensile/settimanale",
        ]},
        { type: "heading", text: "Navigazione nel calendario" },
        { type: "list", items: [
          "Usa le frecce < > per navigare tra i mesi o le settimane",
          "Clicca su un evento nel calendario per aprire il dettaglio dell'attivitÃ ",
          "Le attivitÃ  scadute appaiono evidenziate in rosso",
        ]},
        { type: "tip", text: "La vista calendario Ã¨ utile per pianificare la settimana: ti permette di vedere subito se hai troppe attivitÃ  concentrate in un giorno e distribuirle meglio." },
      ]},
      { id: "a5", title: "Segnare un'attivitÃ  come completata", excerpt: "Come chiudere un'attivitÃ , aggiungere note e pianificare la prossima azione.", readTime: 2, blocks: [
        { type: "heading", text: "Completare un'attivitÃ " },
        { type: "steps", items: [
          "Nella lista attivitÃ , spunta il checkbox a sinistra del titolo dell'attivitÃ ",
          "Oppure apri la scheda attivitÃ  e clicca il pulsante \"Segna come completata\"",
          "Aggiungi note di completamento per documentare l'esito",
          "Conferma: l'attivitÃ  passa a stato Completata",
        ]},
        { type: "heading", text: "Pianificare la prossima attivitÃ " },
        { type: "para", text: "Dopo aver completato un'attivitÃ , Ã¨ buona pratica pianificare subito la prossima azione. Pipely ti suggerisce di creare una nuova attivitÃ  immediatamente dopo la chiusura: clicca \"Pianifica follow-up\" nel messaggio di conferma." },
        { type: "tip", text: "Aggiungi sempre una nota di completamento: documenta cosa Ã¨ emerso dalla chiamata o dall'incontro. Queste note alimentano lo storico dell'affare e aiutano il team a capire lo stato della trattativa." },
      ]},
      { id: "a6", title: "Tipi di attivitÃ  personalizzati", excerpt: "Crea tipi di attivitÃ  su misura oltre quelli predefiniti (chiamata, email, meeting).", readTime: 5, blocks: [
        { type: "heading", text: "Tipi predefiniti" },
        { type: "para", text: "Pipely include cinque tipi di attivitÃ  predefiniti: Chiamata, Email, Meeting, Task e Scadenza. Questi coprono la maggior parte delle esigenze di un processo di vendita standard." },
        { type: "heading", text: "Personalizzazione non ancora disponibile" },
        { type: "para", text: "La creazione di tipi di attivitÃ  personalizzati non Ã¨ ancora disponibile. Al momento non puoi aggiungere, rinominare o rimuovere i tipi predefiniti." },
        { type: "list", items: [
          "Tipi personalizzati â€” in roadmap per una versione futura",
          "Icone personalizzate â€” in roadmap",
          "Colori per tipo â€” in roadmap",
        ]},
        { type: "tip", text: "Se hai bisogno di categorizzare ulteriormente le attivitÃ , usa il campo Note per specificare il sotto-tipo (es. \"Demo prodotto\" come nota di un Meeting)." },
      ]},
    ],
  },
  {
    id: "email",
    label: "Email & Comunicazioni",
    description: "Integrazione email, template e tracciamento messaggi",
    articles: [
      { id: "em1", title: "Configurare il tuo account email (SMTP wizard)", excerpt: "Usa il wizard in Impostazioni â†’ Email per collegare Gmail, Aruba, Libero o un provider SMTP custom in pochi clic.", readTime: 5, popular: true, blocks: [
        { type: "heading", text: "PerchÃ© configurare l'SMTP" },
        { type: "para", text: "Senza SMTP configurato, le email create in Pipely vengono registrate nel CRM ma non recapitate realmente. Con SMTP attivo ogni email parte dalla tua casella di posta." },
        { type: "heading", text: "Provider supportati" },
        { type: "list", items: [
          "Gmail â€” email Google con App Password dedicata",
          "Aruba â€” configurazione automatica per domini su Aruba",
          "Libero â€” configurazione automatica per @libero.it",
          "Custom SMTP â€” qualsiasi provider con supporto SMTP (Outlook, Yahoo, hosting privato...)",
        ]},
        { type: "heading", text: "Come configurare Gmail" },
        { type: "steps", items: [
          "Vai su Impostazioni â†’ Email",
          "Seleziona Gmail come provider",
          "Inserisci la tua email Gmail",
          "Per la password devi usare un'App Password (non la password Gmail normale)",
          "Vai su myaccount.google.com â†’ Sicurezza â†’ Verifica in due passaggi â†’ App password",
          "Crea una nuova App Password per \"Pipely\" e copiala",
          "Incollala nel campo password e clicca \"Testa connessione\"",
        ]},
        { type: "warning", text: "Gmail richiede la verifica in due passaggi attiva per poter creare un'App Password. Abilitala prima di procedere." },
        { type: "heading", text: "Come configurare Aruba o Libero" },
        { type: "para", text: "Seleziona il provider nel wizard: host, porta e protocollo vengono precompilati automaticamente. Inserisci solo email e password del tuo account." },
        { type: "tip", text: "Le credenziali vengono cifrate con AES-256 prima di essere salvate nel database. La password non viene mai memorizzata in chiaro." },
      ]},
      { id: "em2", title: "Configurare Gmail con App Password", excerpt: "Gmail richiede una App Password dedicata (non la password principale). Guida passo-passo con link alla pagina Google.", readTime: 4, blocks: [
        { type: "heading", text: "PerchÃ© serve un'App Password" },
        { type: "para", text: "Google non consente di usare la password principale dell'account per applicazioni di terze parti con SMTP. Per motivi di sicurezza devi creare un'App Password dedicata, che puÃ² essere revocata in qualsiasi momento senza cambiare la password principale." },
        { type: "heading", text: "Prerequisito: Verifica in 2 passaggi" },
        { type: "para", text: "Le App Password sono disponibili solo se hai attivato la Verifica in due passaggi sul tuo account Google. Se non Ã¨ ancora attiva, abilitala prima di procedere." },
        { type: "heading", text: "Come creare l'App Password" },
        { type: "steps", items: [
          "Vai su myaccount.google.com e accedi al tuo account",
          "Clicca su Sicurezza nel menu laterale",
          "Nella sezione \"Accesso a Google\" clicca su \"Verifica in 2 passaggi\"",
          "Scorri in fondo alla pagina e clicca su \"App password\"",
          "Seleziona \"Altra (nome personalizzato)\" e digita \"Pipely\"",
          "Clicca Genera: Google mostra una password di 16 caratteri",
          "Copia la password e incollala nel campo SMTP Password in Pipely",
        ]},
        { type: "warning", text: "L'App Password viene mostrata da Google una sola volta. Se la perdi, devi generarne una nuova. Tienila al sicuro come qualsiasi altra credenziale." },
        { type: "link", text: "Gestisci le App Password Google", href: "https://myaccount.google.com/apppasswords" },
      ]},
      { id: "em3", title: "Configurare Aruba o Libero come provider SMTP", excerpt: "Impostazioni host, porta e crittografia per i provider italiani piÃ¹ diffusi.", readTime: 3, blocks: [
        { type: "heading", text: "Configurazione automatica" },
        { type: "para", text: "Quando selezioni Aruba o Libero nel wizard SMTP di Pipely, host, porta e protocollo vengono precompilati automaticamente. Devi inserire solo la tua email e la password del provider." },
        { type: "heading", text: "Parametri Aruba" },
        { type: "list", items: [
          "Host: mail.nome-dominio.it (sostituisci con il tuo dominio Aruba)",
          "Porta: 587",
          "Sicurezza: STARTTLS",
          "Username: la tua email su dominio Aruba",
          "Password: la password della casella email Aruba",
        ]},
        { type: "heading", text: "Parametri Libero" },
        { type: "list", items: [
          "Host: smtp.libero.it",
          "Porta: 465",
          "Sicurezza: SSL/TLS",
          "Username: il tuo indirizzo @libero.it",
          "Password: la password della casella Libero",
        ]},
        { type: "tip", text: "Dopo aver inserito le credenziali, usa il pulsante \"Testa connessione\" nel wizard per verificare che tutto funzioni prima di salvare." },
      ]},
      { id: "em4", title: "Creare template email riutilizzabili", excerpt: "Risparmia tempo con modelli predefiniti per i messaggi piÃ¹ frequenti.", readTime: 5, blocks: [
        { type: "heading", text: "Dove si trovano i template" },
        { type: "steps", items: [
          "Vai su Email â†’ Template nella sidebar",
          "Clicca \"Nuovo template\"",
          "Inserisci il nome del template (uso interno, non visibile al destinatario)",
          "Inserisci oggetto e corpo del messaggio",
          "Usa le variabili dinamiche per personalizzare il testo",
          "Salva il template",
        ]},
        { type: "heading", text: "Variabili supportate nei template" },
        { type: "list", items: [
          "{{nome}} â€” nome del contatto destinatario",
          "{{cognome}} â€” cognome del contatto",
          "{{email}} â€” indirizzo email del contatto",
        ]},
        { type: "heading", text: "Usare un template" },
        { type: "para", text: "Quando invii un'email da una scheda contatto o affare, clicca \"Seleziona template\" nel form: il corpo e l'oggetto vengono precompilati automaticamente, pronti per eventuali personalizzazioni finali." },
        { type: "tip", text: "Crea template per i messaggi piÃ¹ frequenti: follow-up dopo una chiamata, presentazione commerciale, promemoria offerta in scadenza. Risparmia minuti preziosi ogni giorno." },
      ]},
      { id: "em5", title: "Inviare email direttamente da Pipely", excerpt: "Scrivi e invia email ai contatti senza uscire dal CRM, con storico completo.", readTime: 4, blocks: [
        { type: "heading", text: "Prerequisito" },
        { type: "para", text: "Per inviare email reali Ã¨ necessario avere un account SMTP configurato in Impostazioni â†’ Email. Senza SMTP le email vengono registrate nel CRM ma non recapitate al destinatario." },
        { type: "heading", text: "Inviare da una scheda contatto" },
        { type: "steps", items: [
          "Apri la scheda del contatto",
          "Clicca sul pulsante \"Invia email\"",
          "Seleziona un template esistente oppure scrivi il messaggio da zero",
          "Verifica oggetto e destinatario",
          "Clicca Invia",
        ]},
        { type: "heading", text: "Inviare da una scheda affare" },
        { type: "para", text: "Apri la scheda affare â†’ tab Email â†’ Nuova email. L'email viene inviata al contatto collegato all'affare e registrata sia nello storico del contatto che in quello dell'affare." },
        { type: "tip", text: "Ogni email inviata da Pipely viene automaticamente salvata nello storico del contatto con data, oggetto e corpo del messaggio. Utile per avere un registro completo delle comunicazioni." },
      ]},
      { id: "em6", title: "Sicurezza: come vengono protette le credenziali SMTP", excerpt: "Le password SMTP sono cifrate con AES-256 e non vengono mai salvate in chiaro nel database.", readTime: 3, blocks: [
        { type: "heading", text: "Cifratura delle credenziali" },
        { type: "para", text: "Quando inserisci la password SMTP nel wizard, Pipely la cifra con l'algoritmo AES-256-CBC prima di salvarla nel database. La chiave di cifratura non Ã¨ mai memorizzata nel database ma Ã¨ configurata come variabile d'ambiente sul server." },
        { type: "heading", text: "Cosa significa in pratica" },
        { type: "list", items: [
          "La password non Ã¨ mai visibile in chiaro, nemmeno agli amministratori del sistema",
          "In caso di accesso non autorizzato al database, le credenziali risultano illeggibili senza la chiave di cifratura",
          "La chiave AES Ã¨ separata dai dati: massima protezione anche in caso di violazione del DB",
        ]},
        { type: "heading", text: "Variabile d'ambiente SMTP_ENCRYPTION_KEY" },
        { type: "para", text: "Per le installazioni self-hosted o Enterprise, la chiave di cifratura Ã¨ configurata tramite la variabile d'ambiente SMTP_ENCRYPTION_KEY. Assicurati di conservarla in modo sicuro e separato dal database." },
        { type: "tip", text: "Per massima sicurezza, usa sempre un'App Password dedicata a Pipely (non la password principale dell'account email). CosÃ¬ puoi revocarla in qualsiasi momento senza impatti su altri servizi." },
      ]},
    ],
  },
  {
    id: "campagne",
    label: "Campagne Email",
    description: "Liste contatti, campagne di email marketing e monitoraggio risultati",
    articles: [
      { id: "ca1", title: "Creare una lista email", excerpt: "Crea una lista, assegna un nome e una descrizione, poi aggiungi contatti manualmente o via import.", readTime: 3, popular: true, blocks: [
        { type: "heading", text: "Creare la lista" },
        { type: "steps", items: [
          "Vai su Email â†’ Liste nella sidebar",
          "Clicca \"Nuova lista\"",
          "Inserisci nome e descrizione opzionale",
          "Aggiungi le prime email nel campo testo (una per riga o separate da virgola)",
          "In alternativa, carica un file CSV/XLS/XLSX con le email",
          "Clicca Crea lista",
        ]},
        { type: "heading", text: "Aggiungere contatti in seguito" },
        { type: "para", text: "Apri una lista esistente e usa il pulsante Aggiungi contatti per inserire nuove email manualmente o importare un file." },
        { type: "tip", text: "Le email duplicate vengono ignorate automaticamente in fase di creazione e importazione." },
      ]},
      { id: "ca2", title: "Aggiungere contatti a una lista: inserimento manuale", excerpt: "Incolla una o piÃ¹ email nel campo testo per aggiungerle rapidamente alla lista.", readTime: 2, blocks: [
        { type: "heading", text: "Come aggiungere contatti manualmente" },
        { type: "steps", items: [
          "Apri la lista email a cui vuoi aggiungere contatti",
          "Clicca il pulsante \"Aggiungi contatti\"",
          "Nel campo testo, incolla le email: una per riga oppure separate da virgola",
          "Clicca Aggiungi",
          "La lista si aggiorna in tempo reale mostrando il nuovo totale contatti",
        ]},
        { type: "heading", text: "Gestione duplicati" },
        { type: "para", text: "Se un'email Ã¨ giÃ  presente nella lista, viene ignorata silenziosamente: non viene aggiunta di nuovo e non viene mostrato un errore. Puoi incollare liberamente anche liste giÃ  parzialmente presenti." },
        { type: "tip", text: "L'inserimento manuale Ã¨ ideale per aggiungere pochi contatti alla volta. Per importazioni di massa usa il caricamento CSV." },
      ]},
      { id: "ca3", title: "Importare contatti in una lista da CSV o Excel", excerpt: "Carica un file CSV, XLS o XLSX con le email dei destinatari. I duplicati vengono gestiti automaticamente.", readTime: 4, blocks: [
        { type: "heading", text: "Formato accettato" },
        { type: "list", items: [
          "File CSV, XLS o XLSX",
          "Una email per riga (nessuna intestazione necessaria)",
          "Dimensione massima: 5 MB",
          "Encoding: UTF-8 consigliato",
        ]},
        { type: "heading", text: "Come importare" },
        { type: "steps", items: [
          "Apri la lista â†’ clicca \"Importa da file\"",
          "Trascina il file nell'area di upload o clicca per selezionarlo",
          "Pipely analizza il file e mostra un'anteprima",
          "Clicca Importa per avviare il processo",
          "Al termine viene mostrato il feedback: N contatti aggiunti, M giÃ  presenti",
        ]},
        { type: "tip", text: "I duplicati (email giÃ  presenti nella lista) vengono gestiti automaticamente: non vengono aggiunti di nuovo e il conteggio finale riflette solo le email effettivamente nuove." },
      ]},
      { id: "ca4", title: "Creare e inviare una campagna email", excerpt: "Scegli la lista, imposta oggetto, mittente e corpo del messaggio, poi invia subito o pianifica.", readTime: 5, popular: true, blocks: [
        { type: "heading", text: "Prerequisiti" },
        { type: "list", items: [
          "Account SMTP configurato in Impostazioni â†’ Email",
          "Almeno una lista email con contatti",
        ]},
        { type: "heading", text: "Creare la campagna" },
        { type: "steps", items: [
          "Vai su Email â†’ Campagne",
          "Clicca \"Nuova campagna\"",
          "Seleziona la lista di destinatari",
          "Inserisci nome mittente e oggetto dell'email",
          "Scrivi il corpo del messaggio â€” puoi usare le variabili {{nome}}, {{cognome}}, {{email}}",
          "Facoltativamente imposta una data/ora di invio programmato",
          "Clicca Crea campagna",
        ]},
        { type: "heading", text: "Variabili dinamiche" },
        { type: "list", items: [
          "{{nome}} â€” sostituito con il nome del contatto",
          "{{cognome}} â€” sostituito con il cognome",
          "{{email}} â€” sostituito con l'indirizzo email",
        ]},
        { type: "heading", text: "Inviare la campagna" },
        { type: "para", text: "Nella lista campagne trova la campagna con stato BOZZA e clicca Invia ora. Pipely invia a ogni contatto non disiscritto della lista e aggiorna lo stato in INVIATA." },
        { type: "heading", text: "Statistiche" },
        { type: "para", text: "Dopo l'invio puoi vedere: email consegnate, aperture (tramite pixel di tracciamento 1Ã—1 px) e click (ogni link viene reindirizzato attraverso un URL di tracciamento)." },
        { type: "tip", text: "Alcuni client email bloccano le immagini remote: in quei casi l'apertura non viene rilevata. I click sui link sono invece sempre tracciati con precisione." },
      ]},
      { id: "ca5", title: "Personalizzare il messaggio con variabili dinamiche", excerpt: "Usa {{nome}}, {{cognome}} e {{email}} per personalizzare ogni email con i dati del destinatario.", readTime: 3, blocks: [
        { type: "heading", text: "Variabili disponibili" },
        { type: "list", items: [
          "{{nome}} â€” sostituito con il nome del contatto destinatario",
          "{{cognome}} â€” sostituito con il cognome",
          "{{email}} â€” sostituito con l'indirizzo email del contatto",
        ]},
        { type: "heading", text: "Come usare le variabili" },
        { type: "para", text: "Inserisci le variabili nel corpo del messaggio o nell'oggetto della campagna direttamente nel testo, tra doppie parentesi graffe. La sostituzione avviene al momento dell'invio, per ogni destinatario della lista." },
        { type: "heading", text: "Gestione valori mancanti" },
        { type: "para", text: "Se per un contatto il campo corrispondente alla variabile Ã¨ vuoto (es. manca il nome), la variabile viene sostituita con una stringa vuota. Controlla la qualitÃ  dei dati nella lista prima dell'invio per evitare email come \"Ciao ,\"." },
        { type: "tip", text: "Esempio: \"Ciao {{nome}}, ti contatto riguardo alla tua richiesta...\" â€” ogni destinatario riceverÃ  l'email con il proprio nome al posto della variabile." },
      ]},
      { id: "ca6", title: "Monitorare aperture e click della campagna", excerpt: "Ogni email contiene un pixel di tracciamento e link con redirect. Dopo l'invio vedi quante email sono state aperte e quanti link cliccati.", readTime: 3, blocks: [
        { type: "heading", text: "Come funziona il tracciamento" },
        { type: "list", items: [
          "Aperture: ogni email inviata contiene un pixel di tracciamento 1Ã—1 px invisibile. Quando il destinatario apre l'email e carica le immagini, il pixel viene richiesto al server Pipely registrando l'apertura.",
          "Click: ogni link nel corpo dell'email viene reindirizzato attraverso un URL di tracciamento Pipely. Quando il destinatario clicca, il server registra il click e poi reindirizza all'URL originale.",
        ]},
        { type: "heading", text: "Dove vedere le statistiche" },
        { type: "steps", items: [
          "Vai su Email â†’ Campagne",
          "Apri la campagna con stato INVIATA",
          "Nella scheda trovi i contatori: Email consegnate, Aperture, Click",
        ]},
        { type: "warning", text: "Alcuni client email bloccano il caricamento delle immagini remote: in quei casi l'apertura non viene rilevata anche se l'email Ã¨ stata letta. I click sui link sono invece sempre tracciati con precisione." },
        { type: "tip", text: "Un buon tasso di apertura per campagne B2B Ã¨ tra il 20% e il 30%. Se scende sotto il 15%, considera di rivedere oggetto e orario di invio." },
      ]},
    ],
  },
  {
    id: "report",
    label: "Report & Analytics",
    description: "KPI, grafici personalizzati e export dei dati",
    articles: [
      { id: "r1", title: "Dashboard dei report: panoramica", excerpt: "Scopri tutti i KPI disponibili: affari aperti, revenue, win rate, avg deal.", readTime: 4, popular: true, blocks: [
        { type: "heading", text: "KPI principali" },
        { type: "list", items: [
          "Affari aperti â€” numero totale di trattative attive nella pipeline",
          "Valore pipeline â€” somma del valore di tutti gli affari aperti",
          "Revenue vinta (30 gg) â€” totale degli affari chiusi come Vinti nel periodo selezionato",
          "Win rate â€” percentuale affari vinti / (vinti + persi)",
          "Previsione ponderata â€” stima fatturato = Î£ (valore affare Ã— probabilitÃ  stage)",
          "AttivitÃ  scadute â€” attivitÃ  con data superata non ancora completate",
        ]},
        { type: "heading", text: "Grafici disponibili" },
        { type: "list", items: [
          "Grafico a barre: distribuzione affari e valore per stage",
          "Grafico vinti vs persi: confronto mensile degli ultimi 6 mesi",
        ]},
        { type: "tip", text: "Usa il selettore periodo in alto nella pagina Report per aggiornare tutti i KPI e i grafici: 7 giorni, 30 giorni, 90 giorni o 12 mesi." },
      ]},
      { id: "r2", title: "Analisi del funnel di vendita", excerpt: "Come interpretare il grafico funnel e identificare i colli di bottiglia.", readTime: 5, blocks: [
        { type: "heading", text: "Come leggere il grafico funnel" },
        { type: "para", text: "Il grafico funnel mostra quanti affari e quale valore si trovano in ogni stage della pipeline. Ogni barra rappresenta uno stage: piÃ¹ Ã¨ larga, piÃ¹ affari o valore si trovano in quello stage." },
        { type: "heading", text: "Identificare i colli di bottiglia" },
        { type: "list", items: [
          "Molti affari fermi nello stesso stage indica un problema in quel passaggio del processo",
          "Es. molti affari in \"Proposta inviata\" â†’ i clienti non rispondono â†’ serve follow-up",
          "Es. pochi affari in \"Negoziazione\" â†’ le proposte non vengono accettate â†’ rivedi il pricing",
        ]},
        { type: "heading", text: "Tasso di conversione stage by stage" },
        { type: "para", text: "Il tasso di conversione tra stage A e stage B si calcola dividendo gli affari che passano da A a B per il totale di quelli che entrano in A. Un calo brusco tra due stage indica dove si perdono piÃ¹ opportunitÃ ." },
        { type: "tip", text: "Confronta il funnel in periodi diversi per vedere se le azioni correttive hanno portato miglioramenti. Usa il selettore periodo per cambiare l'intervallo di analisi." },
      ]},
      { id: "r3", title: "Report trend: vinti vs persi negli ultimi 6 mesi", excerpt: "Leggi il grafico andamento e confronta i periodi per valutare la crescita.", readTime: 4, blocks: [
        { type: "heading", text: "Il grafico trend" },
        { type: "para", text: "Il grafico a linee mostra l'andamento degli affari vinti e persi mese per mese negli ultimi 6 mesi. Le due linee consentono di visualizzare immediatamente se il numero di vinti cresce o scende rispetto ai persi." },
        { type: "heading", text: "Come interpretare il grafico" },
        { type: "list", items: [
          "Linea vinti che sale â†’ miglioramento del processo di vendita",
          "Linea persi che sale â†’ aumentano le trattative perse, analizza i motivi",
          "StagionalitÃ : picchi o cali ricorrenti nello stesso mese dell'anno indicano effetti stagionali",
        ]},
        { type: "heading", text: "Revenue vinta e periodo" },
        { type: "para", text: "Il KPI Revenue vinta riportato in dashboard considera solo il periodo selezionato in alto nella pagina Report. Cambia il periodo per vedere la revenue su 7 giorni, 30 giorni, 90 giorni o 12 mesi." },
        { type: "tip", text: "Esporta i dati in CSV per analisi piÃ¹ approfondite su Excel o Google Sheets, dove puoi creare pivot e grafici personalizzati." },
      ]},
      { id: "r4", title: "Top performer del team", excerpt: "Classifica i venditori per revenue generata, affari vinti e tasso di conversione.", readTime: 3, blocks: [
        { type: "heading", text: "Dove trovare il report" },
        { type: "para", text: "Vai su Report nella sidebar. Il pannello Top performer mostra una tabella con i membri del team ordinati per performance nel periodo selezionato." },
        { type: "heading", text: "Metriche per venditore" },
        { type: "list", items: [
          "Revenue generata â€” somma del valore degli affari vinti",
          "Affari vinti â€” numero di trattative chiuse con successo",
          "Win rate â€” percentuale affari vinti / (vinti + persi) per quel venditore",
        ]},
        { type: "heading", text: "Filtrare per periodo" },
        { type: "para", text: "Il report si aggiorna in base al selettore periodo in alto nella pagina. Seleziona 30 giorni per vedere le performance del mese corrente, o 12 mesi per una visione annuale." },
        { type: "tip", text: "Usa questo report nelle riunioni di team per riconoscere i top performer e identificare chi potrebbe beneficiare di coaching o supporto." },
      ]},
      { id: "r5", title: "Esportare i dati in CSV", excerpt: "Come scaricare l'elenco degli affari e dei contatti per analisi esterne.", readTime: 3, blocks: [
        { type: "heading", text: "Come esportare" },
        { type: "steps", items: [
          "Vai su Affari oppure Contatti nella sidebar",
          "Applica eventuali filtri per selezionare i record che ti interessano",
          "Clicca l'icona Export (freccia verso il basso) in alto a destra",
          "Il file CSV viene scaricato automaticamente nel browser",
        ]},
        { type: "heading", text: "Cosa include il CSV" },
        { type: "para", text: "Il file esportato include tutti i campi visibili nella lista: per gli affari include titolo, valore, stage, responsabile, contatto, data chiusura e stato. Per i contatti include nome, cognome, email, telefono e azienda." },
        { type: "warning", text: "I campi personalizzati non sono ancora inclusi nell'export CSV. Questa funzionalitÃ  Ã¨ in roadmap per una versione futura." },
        { type: "tip", text: "L'export CSV Ã¨ lo strumento principale per fare analisi avanzate in Excel o Google Sheets, creare report personalizzati o eseguire backup dei tuoi dati." },
      ]},
      { id: "r6", title: "Filtrare i report per periodo", excerpt: "Confronta le performance su 7 giorni, 30 giorni, 90 giorni o 12 mesi.", readTime: 2, blocks: [
        { type: "heading", text: "Il selettore periodo" },
        { type: "para", text: "In alto nella pagina Report trovi un selettore che permette di scegliere il periodo di analisi. Ogni cambio aggiorna istantaneamente tutti i KPI e i grafici della pagina." },
        { type: "heading", text: "Periodi disponibili" },
        { type: "list", items: [
          "7 giorni â€” ultima settimana, utile per monitoraggio quotidiano",
          "30 giorni â€” ultimo mese, il periodo piÃ¹ usato per review mensili",
          "90 giorni â€” ultimo trimestre, per analisi trimestrali",
          "12 mesi â€” ultimo anno, per visione strategica e analisi stagionali",
        ]},
        { type: "tip", text: "Imposta il periodo su 30 giorni per le riunioni mensili con il team. Usa 12 mesi per il business review di fine anno." },
      ]},
    ],
  },
  {
    id: "automazioni",
    label: "Automazioni",
    description: "Workflow automatici, trigger e azioni ricorrenti",
    articles: [
      { id: "au1", title: "Cos'Ã¨ un'automazione in Pipely", excerpt: "Introduzione ai workflow automatici: trigger, condizioni e azioni disponibili.", readTime: 5, blocks: [
        { type: "heading", text: "Cos'Ã¨ un workflow" },
        { type: "para", text: "Un'automazione in Pipely Ã¨ una regola trigger â†’ azione: quando accade un evento specifico (trigger), Pipely esegue automaticamente un'azione predefinita. Non richiede alcuna competenza di programmazione." },
        { type: "heading", text: "Struttura di un workflow" },
        { type: "list", items: [
          "Trigger â€” l'evento che attiva il workflow (es. affare creato, lead convertito)",
          "Azione â€” cosa viene eseguito automaticamente (es. invia email, crea attivitÃ , invia notifica)",
        ]},
        { type: "heading", text: "Dove trovare le automazioni" },
        { type: "para", text: "Vai su Automazioni nella sidebar. Ogni workflow Ã¨ elencato con nome, stato (attivo/inattivo) e un toggle verde/grigio per abilitarlo o disabilitarlo. Il log delle esecuzioni Ã¨ visibile aprendo il singolo workflow." },
        { type: "list", items: [
          "Workflow attivi â€” toggle verde: vengono eseguiti ad ogni trigger",
          "Workflow inattivi â€” toggle grigio: non vengono eseguiti, utili per testare prima di attivare",
        ]},
        { type: "tip", text: "Inizia con automazioni semplici (un trigger, un'azione). Aggiungine di piÃ¹ complesse man mano che prendi confidenza con lo strumento e verifichi il log delle esecuzioni." },
      ]},
      { id: "au2", title: "Creare la tua prima automazione", excerpt: "Guida passo-passo alla creazione di un workflow per automatizzare i follow-up.", readTime: 7, popular: true, blocks: [
        { type: "heading", text: "Cosa sono le automazioni" },
        { type: "para", text: "Un'automazione (workflow) Ã¨ una regola trigger-action: quando accade un evento (trigger), Pipely esegue automaticamente un'azione, senza intervento manuale." },
        { type: "heading", text: "Esempi pratici" },
        { type: "list", items: [
          "Quando un affare cambia stage â†’ invia email di follow-up al contatto",
          "Quando un lead viene creato â†’ crea un'attivitÃ  di richiamo per il responsabile",
          "Quando un affare viene vinto â†’ invia notifica al team commerciale",
          "Quando un'attivitÃ  scade â†’ promemoria automatico via notifica",
        ]},
        { type: "heading", text: "Creare un workflow" },
        { type: "steps", items: [
          "Vai su Automazioni nella sidebar",
          "Clicca \"Nuova automazione\"",
          "Scegli il trigger: l'evento che avvia il workflow",
          "Configura eventuali condizioni (es. solo se valore affare > 1000â‚¬)",
          "Aggiungi l'azione da eseguire (email, notifica, crea attivitÃ ...)",
          "Attiva il workflow con il toggle ON/OFF",
        ]},
        { type: "heading", text: "Trigger disponibili" },
        { type: "list", items: [
          "Affare: creato, cambiato stage, vinto, perso",
          "Contatto: creato, modificato",
          "AttivitÃ : completata, scaduta",
          "Lead: creato, convertito",
        ]},
        { type: "tip", text: "Inizia con automazioni semplici (un trigger, un'azione) e aggiungine di piÃ¹ complesse man mano che prendi confidenza con lo strumento." },
      ]},
      { id: "au3", title: "Automazioni per il follow-up dopo una chiamata", excerpt: "Invia automaticamente un'email o crea un'attivitÃ  dopo ogni chiamata completata.", readTime: 5, blocks: [
        { type: "heading", text: "Scenario: follow-up automatico dopo una chiamata" },
        { type: "para", text: "Ogni volta che un commerciale completa un'attivitÃ  di tipo Chiamata, Pipely invia automaticamente un'email di follow-up al contatto collegato all'affare." },
        { type: "heading", text: "Come configurare il workflow" },
        { type: "steps", items: [
          "Vai su Automazioni â†’ Nuova automazione",
          "Trigger: seleziona \"AttivitÃ  completata\"",
          "Condizione: tipo attivitÃ  = Chiamata",
          "Azione: seleziona \"Invia email\" al contatto collegato all'affare",
          "Personalizza oggetto e corpo con le variabili {{nome}}, {{cognome}}",
          "Attiva il workflow con il toggle",
        ]},
        { type: "heading", text: "Esempio di messaggio" },
        { type: "para", text: "Oggetto: \"Riepilogo della nostra chiamata, {{nome}}\" â€” Corpo: \"Grazie per la chiamata di oggi. Come concordato, ti invio il materiale richiesto...\"" },
        { type: "tip", text: "Aggiungi anche un'azione \"Crea attivitÃ \" (tipo Task) per ricordare al responsabile di fare un follow-up dopo 3 giorni se il cliente non risponde." },
      ]},
      { id: "au4", title: "Notifiche automatiche al team", excerpt: "Avvisa i colleghi quando un affare cambia stage o raggiunge un valore soglia.", readTime: 4, blocks: [
        { type: "heading", text: "Quando usare le notifiche automatiche" },
        { type: "para", text: "Le notifiche in-app tengono il team allineato sulle trattative importanti senza che nessuno debba monitorare manualmente la pipeline. Utile per manager che vogliono essere avvisati sugli sviluppi chiave." },
        { type: "heading", text: "Come configurare" },
        { type: "steps", items: [
          "Vai su Automazioni â†’ Nuova automazione",
          "Trigger: \"Affare cambiato stage\" oppure \"Affare vinto\"",
          "Azione: \"Invia notifica in-app\"",
          "Destinatario: il responsabile dell'affare oppure un membro specifico del team",
          "Personalizza il messaggio della notifica",
          "Attiva il workflow",
        ]},
        { type: "list", items: [
          "Affare vinto â†’ notifica al manager con valore e nome del cliente",
          "Affare arrivato in Negoziazione â†’ notifica al responsabile commerciale",
        ]},
        { type: "tip", text: "Le notifiche in-app appaiono come badge nella sidebar di Pipely. Non vengono inviate via email o push al momento: per aggiornamenti su queste funzionalitÃ  consulta la roadmap." },
      ]},
      { id: "au5", title: "Automazioni per i lead in entrata", excerpt: "Assegna automaticamente i lead ai responsabili in base a regole personalizzate.", readTime: 5, blocks: [
        { type: "heading", text: "Automatizzare la gestione dei lead in entrata" },
        { type: "para", text: "Quando arriva un nuovo lead, Ã¨ fondamentale rispondere rapidamente. Con un'automazione puoi creare automaticamente un'attivitÃ  di qualificazione assegnata al responsabile giusto." },
        { type: "heading", text: "Workflow 1: crea attivitÃ  di chiamata" },
        { type: "steps", items: [
          "Trigger: \"Lead creato\"",
          "Azione: \"Crea attivitÃ \" di tipo Chiamata",
          "Titolo: \"Chiamata di qualificazione â€” {{nome}}\"",
          "Scadenza: entro 24 ore dalla creazione del lead",
          "Assegnata a: il responsabile del lead",
        ]},
        { type: "heading", text: "Workflow 2: email di benvenuto" },
        { type: "steps", items: [
          "Trigger: \"Lead creato\"",
          "Azione: \"Invia email\" al lead",
          "Oggetto: \"Ciao {{nome}}, ti contatteremo presto\"",
          "Corpo: messaggio di benvenuto con breve presentazione del team",
        ]},
        { type: "tip", text: "Combina entrambi i workflow: email di benvenuto immediata per il lead, e attivitÃ  di follow-up per il commerciale. Il lead si sente seguito e il team ha un promemoria chiaro." },
      ]},
      { id: "au6", title: "Monitorare e debuggare le automazioni", excerpt: "Come visualizzare la cronologia di esecuzione e risolvere gli errori.", readTime: 4, blocks: [
        { type: "heading", text: "Il tab Log del workflow" },
        { type: "para", text: "Ogni workflow dispone di un tab Log che mostra l'elenco delle ultime esecuzioni con data, entitÃ  coinvolta (es. nome dell'affare) e stato: SUCCESS o FAILED." },
        { type: "heading", text: "Come accedere al log" },
        { type: "steps", items: [
          "Vai su Automazioni",
          "Clicca sul workflow da monitorare",
          "Seleziona il tab \"Log\"",
          "Esamina le esecuzioni recenti: SUCCESS (verde) o FAILED (rosso)",
          "Clicca su una riga FAILED per espandere il messaggio di errore",
        ]},
        { type: "heading", text: "Errori comuni e soluzioni" },
        { type: "list", items: [
          "SMTP non configurato â†’ l'azione \"Invia email\" fallisce: configura SMTP in Impostazioni â†’ Email",
          "Contatto senza email â†’ l'invio non riesce: verifica che il contatto abbia un'email valida",
          "Workflow disattivato â†’ le esecuzioni non partono: controlla il toggle ON/OFF",
        ]},
        { type: "tip", text: "Dopo aver corretto un errore, riattiva il workflow e verifica che la prossima esecuzione risulti SUCCESS nel log." },
      ]},
    ],
  },
  {
    id: "prodotti",
    label: "Prodotti & Listini",
    description: "Catalogo prodotti, prezzi e associazione agli affari",
    articles: [
      { id: "pr1", title: "Aggiungere prodotti al catalogo", excerpt: "Come creare schede prodotto con nome, codice, prezzo, IVA e attivare la fatturazione ricorrente mensile o annuale.", readTime: 3, popular: true, blocks: [
        { type: "heading", text: "Creare una scheda prodotto" },
        { type: "steps", items: [
          "Vai su Prodotti nella sidebar",
          "Clicca \"Nuovo prodotto\"",
          "Inserisci il nome del prodotto",
          "Scegli la categoria (Software, SaaS, Sito Web, Agente AI, Hardware, Servizi, Consulenza, Formazione, Altro)",
          "Imposta il prezzo e l'aliquota IVA",
          "Se Ã¨ un prodotto ricorrente, attiva il toggle \"Abbonamento\" e scegli il periodo (Mensile / Annuale)",
          "Clicca Crea prodotto",
        ]},
        { type: "heading", text: "Collegare prodotti agli affari" },
        { type: "para", text: "Apri la scheda di un affare e trova la sezione Prodotti. Clicca Aggiungi prodotto, cerca nel catalogo, imposta quantitÃ  e sconto. Il valore dell'affare si aggiorna automaticamente." },
        { type: "heading", text: "Categorie disponibili" },
        { type: "list", items: [
          "Software, SaaS, Sito Web, Agente AI â€” per prodotti digitali",
          "Hardware â€” per prodotti fisici",
          "Servizi, Consulenza, Formazione â€” per prestazioni professionali",
          "Altro â€” per tutto il resto",
        ]},
        { type: "tip", text: "Impostare la categoria correttamente ti aiuta a filtrare il catalogo e a generare report di vendita suddivisi per tipologia." },
      ]},
      { id: "pr2", title: "Associare prodotti agli affari", excerpt: "Aggiungi prodotti o servizi a un affare per calcolare il valore totale.", readTime: 4, blocks: [
        { type: "heading", text: "Come associare un prodotto" },
        { type: "steps", items: [
          "Apri la scheda dell'affare",
          "Scorri fino alla sezione \"Prodotti\"",
          "Clicca \"Aggiungi prodotto\"",
          "Cerca il prodotto nel catalogo digitando il nome",
          "Seleziona il prodotto e imposta quantitÃ  e sconto",
          "Il valore totale dell'affare si aggiorna automaticamente",
        ]},
        { type: "heading", text: "Aggiungere piÃ¹ prodotti" },
        { type: "para", text: "Puoi aggiungere quanti prodotti vuoi a un singolo affare. Ogni riga Ã¨ indipendente: ogni prodotto ha la propria quantitÃ , sconto e IVA. Il totale affare Ã¨ la somma di tutte le righe." },
        { type: "tip", text: "Se un prodotto non Ã¨ ancora nel catalogo, crealo prima da Prodotti â†’ Nuovo prodotto, poi torna nell'affare per aggiungerlo." },
      ]},
      { id: "pr3", title: "Gestire quantitÃ , sconti e IVA", excerpt: "Imposta quantitÃ , percentuale di sconto e aliquota IVA per ogni riga prodotto.", readTime: 4, blocks: [
        { type: "heading", text: "Campi di ogni riga prodotto" },
        { type: "list", items: [
          "QuantitÃ  â€” numero di unitÃ  (i decimali sono supportati, es. 2.5 ore)",
          "Sconto â€” percentuale di sconto applicata al prezzo (es. 10%)",
          "IVA â€” aliquota IVA applicata al prezzo (es. 22%)",
        ]},
        { type: "heading", text: "Formula di calcolo" },
        { type: "para", text: "Totale riga = Prezzo Ã— QuantitÃ  Ã— (1 - Sconto%). L'IVA Ã¨ indicativa e mostrata separatamente. Il valore dell'affare visualizzato in pipeline Ã¨ il totale al netto dell'IVA." },
        { type: "heading", text: "Esempio pratico" },
        { type: "para", text: "Prodotto: â‚¬100, QuantitÃ : 3, Sconto: 10% â†’ Totale = 100 Ã— 3 Ã— 0.9 = â‚¬270. Con IVA 22%: imponibile â‚¬270, IVA â‚¬59,40, totale lordo â‚¬329,40." },
        { type: "tip", text: "Lo sconto a percentuale Ã¨ l'unica modalitÃ  disponibile. Se hai uno sconto a valore fisso (es. -50â‚¬), convertilo in percentuale prima di inserirlo." },
      ]},
      { id: "pr4", title: "Categorie e unitÃ  di misura", excerpt: "Organizza il catalogo per categorie: Software, SaaS, Sito Web, Agente AI, Hardware, Servizi, Consulenza, Formazione, Altro.", readTime: 3, blocks: [
        { type: "heading", text: "Categorie disponibili" },
        { type: "list", items: [
          "Software â€” applicazioni desktop o on-premise",
          "SaaS â€” servizi cloud con abbonamento",
          "Sito Web â€” sviluppo o manutenzione siti",
          "Agente AI â€” soluzioni di intelligenza artificiale",
          "Hardware â€” prodotti fisici e dispositivi",
          "Servizi â€” prestazioni professionali generiche",
          "Consulenza â€” attivitÃ  di advisory e strategia",
          "Formazione â€” corsi, workshop e training",
          "Altro â€” tutto ciÃ² che non rientra nelle categorie precedenti",
        ]},
        { type: "heading", text: "A cosa servono le categorie" },
        { type: "para", text: "Le categorie aiutano a filtrare il catalogo prodotti e a generare report di vendita suddivisi per tipologia. Scegliere la categoria corretta permette di analizzare quale tipo di prodotto contribuisce di piÃ¹ alla revenue." },
        { type: "tip", text: "Non sono disponibili categorie personalizzate: usa Altro per prodotti non classificabili nelle categorie esistenti." },
      ]},
      { id: "pr5", title: "Prezzi in valute diverse", excerpt: "Supporto multi-valuta: come impostare prezzi in EUR, USD e altre valute.", readTime: 4, blocks: [
        { type: "heading", text: "Valuta dell'organizzazione" },
        { type: "para", text: "Il prezzo di ogni prodotto Ã¨ inserito nella valuta predefinita dell'organizzazione. Tutti i calcoli e i report utilizzano la stessa valuta: non Ã¨ prevista conversione automatica." },
        { type: "heading", text: "Multi-valuta non ancora supportata" },
        { type: "para", text: "Pipely non supporta ancora la gestione multi-valuta nativa. Non Ã¨ possibile impostare prezzi in valute diverse sulla stessa scheda prodotto." },
        { type: "heading", text: "Workaround consigliato" },
        { type: "list", items: [
          "Crea varianti dello stesso prodotto con prezzi in valute diverse (es. \"Piano Pro - EUR\" e \"Piano Pro - USD\")",
          "Usa la categoria per distinguere le varianti",
          "Applica la variante corretta in base alla valuta dell'affare",
        ]},
        { type: "tip", text: "Il supporto multi-valuta nativo Ã¨ in roadmap. Se questo Ã¨ un requisito critico per il tuo business, contatta il supporto per essere aggiornato sui tempi." },
      ]},
      { id: "pr6", title: "Esportare il catalogo prodotti", excerpt: "Come scaricare l'elenco prodotti in formato CSV per la gestione esterna.", readTime: 2, blocks: [
        { type: "heading", text: "Come esportare il catalogo" },
        { type: "steps", items: [
          "Vai su Prodotti nella sidebar",
          "Clicca l'icona Export (freccia verso il basso) in alto a destra",
          "Il file CSV viene scaricato automaticamente",
        ]},
        { type: "heading", text: "Campi inclusi nel CSV" },
        { type: "list", items: [
          "Nome prodotto",
          "Codice prodotto",
          "Categoria",
          "Prezzo unitario",
          "Aliquota IVA",
          "Tipo ricorrenza (Mensile / Annuale / Nessuna)",
        ]},
        { type: "tip", text: "Usa il CSV esportato per fare un backup del catalogo, per importarlo in un gestionale esterno o per condividerlo con il team commerciale." },
      ]},
    ],
  },
  {
    id: "impostazioni",
    label: "Impostazioni Account",
    description: "Profilo personale, organizzazione e gestione team",
    articles: [
      { id: "im1", title: "Modificare il profilo personale", excerpt: "Aggiorna nome, email, foto profilo e preferenze di notifica.", readTime: 3, blocks: [
        { type: "heading", text: "Come accedere al profilo" },
        { type: "steps", items: [
          "Clicca sull'icona ingranaggio nella sidebar per aprire Impostazioni",
          "Seleziona la sezione \"Profilo\"",
          "Modifica il nome visualizzato",
          "Clicca Salva",
        ]},
        { type: "heading", text: "Limitazioni" },
        { type: "list", items: [
          "Email â€” non modificabile: Ã¨ usata per l'autenticazione e non puÃ² essere cambiata",
          "Foto profilo â€” si imposta collegando l'account Google (avatar Google Account)",
          "Password â€” modificabile solo se usi email+password (non Google OAuth)",
        ]},
        { type: "tip", text: "Il nome visualizzato appare nelle attivitÃ , negli affari assegnati e nelle notifiche al team. Usa il tuo nome reale per facilitare la collaborazione." },
      ]},
      { id: "im2", title: "Gestire i membri del team", excerpt: "Invita nuovi utenti, modifica i ruoli e rimuovi accessi.", readTime: 5, blocks: [
        { type: "heading", text: "Dove gestire il team" },
        { type: "para", text: "Vai su Impostazioni â†’ Team per vedere l'elenco completo dei membri con ruolo e data di iscrizione." },
        { type: "heading", text: "Invitare un nuovo membro" },
        { type: "steps", items: [
          "Clicca \"Invita membro\"",
          "Inserisci l'email del collega",
          "Scegli il ruolo appropriato (SALES, MANAGER, ADMIN...)",
          "Clicca Invia invito: il collega riceve un'email con il link di accesso",
        ]},
        { type: "heading", text: "Rimuovere un membro" },
        { type: "steps", items: [
          "Nella lista team, clicca i tre puntini (â‹¯) accanto al nome del membro",
          "Seleziona \"Rimuovi dal team\"",
          "Conferma: il membro perde immediatamente l'accesso a Pipely",
        ]},
        { type: "tip", text: "Prima di rimuovere un membro, riassegna i suoi affari e attivitÃ  aperti a un altro responsabile per non perdere la continuitÃ  nelle trattative." },
      ]},
      { id: "im3", title: "Personalizzare la pipeline", excerpt: "Aggiungi, rinomina o riordina gli stage della tua pipeline di vendita.", readTime: 4, popular: true, blocks: [
        { type: "heading", text: "Accedere alle impostazioni pipeline" },
        { type: "steps", items: [
          "Vai su Impostazioni â†’ Pipeline",
          "Seleziona la pipeline da modificare",
          "Da qui puoi aggiungere, rinominare, riordinare ed eliminare gli stage",
        ]},
        { type: "heading", text: "Operazioni disponibili" },
        { type: "list", items: [
          "Aggiungi stage â€” clicca + per aggiungere uno stage alla fine",
          "Rinomina â€” clicca sul nome dello stage per modificarlo",
          "Riordina â€” trascina con il drag handle per cambiare la posizione",
          "ProbabilitÃ  â€” imposta la % per la previsione ponderata",
          "Elimina â€” disponibile solo se lo stage Ã¨ vuoto (nessun affare)",
        ]},
        { type: "warning", text: "Non puoi eliminare uno stage che contiene affari. Sposta prima tutti gli affari in un altro stage, poi potrai eliminarlo." },
        { type: "tip", text: "Imposta con cura la probabilitÃ  di ogni stage: viene usata per calcolare la previsione ponderata in dashboard e nei report di forecast." },
      ]},
      { id: "im4", title: "Impostazioni di notifica", excerpt: "Configura email, push e alert in-app per gli eventi importanti.", readTime: 4, blocks: [
        { type: "heading", text: "Notifiche disponibili" },
        { type: "para", text: "Al momento Pipely supporta solo notifiche in-app: appaiono come badge nella sidebar e nella campana delle notifiche. Non sono disponibili notifiche via email o push mobile." },
        { type: "heading", text: "Tipi di notifiche in-app" },
        { type: "list", items: [
          "Affare assegnato a te",
          "AttivitÃ  in scadenza (visibile in dashboard come KPI)",
          "Notifiche da workflow automatici",
        ]},
        { type: "heading", text: "FunzionalitÃ  in roadmap" },
        { type: "list", items: [
          "Email di notifica per eventi chiave (previsto Q3 2025)",
          "Notifiche push mobile via PWA (previsto Q3 2025)",
          "Personalizzazione degli eventi notificati",
        ]},
        { type: "tip", text: "Controlla le attivitÃ  scadute ogni mattina dalla dashboard: il KPI \"AttivitÃ  scadute\" Ã¨ il modo piÃ¹ rapido per non perdere follow-up importanti." },
      ]},
      { id: "im5", title: "Campi personalizzati globali", excerpt: "Crea campi aggiuntivi per affari, contatti e aziende a livello di organizzazione.", readTime: 6, blocks: [
        { type: "heading", text: "Creare un campo personalizzato" },
        { type: "steps", items: [
          "Vai su Impostazioni â†’ Campi personalizzati",
          "Scegli l'entitÃ : Affare, Contatto o Azienda",
          "Clicca \"Aggiungi campo\"",
          "Inserisci il nome e scegli il tipo",
          "Salva: il campo appare in tutte le schede dell'entitÃ  scelta per tutti i membri del team",
        ]},
        { type: "heading", text: "Tipi di campo disponibili" },
        { type: "list", items: [
          "Testo â€” campo libero (es. Codice cliente, Note interne)",
          "Numero â€” valori numerici (es. Fatturato annuo, Budget)",
          "Data â€” selettore data (es. Data rinnovo contratto)",
          "Selezione singola â€” menu a tendina con opzioni predefinite (es. Settore, PrioritÃ )",
        ]},
        { type: "tip", text: "I campi personalizzati sono visibili a tutti i membri del team e si applicano a tutti i record dell'entitÃ  scelta. Usali per informazioni strutturate specifiche del tuo processo di vendita." },
      ]},
      { id: "im6", title: "Cambiare piano o aggiornare i dati di fatturazione", excerpt: "Come upgradare il piano, aggiornare la carta e scaricare le fatture.", readTime: 4, blocks: [
        { type: "heading", text: "Dove gestire il piano" },
        { type: "steps", items: [
          "Vai su Impostazioni â†’ Piano / Fatturazione",
          "Qui trovi il piano attivo e il pulsante Upgrade a Pro",
          "Per gestire carta, IBAN e fatture clicca il link al portale Stripe",
        ]},
        { type: "heading", text: "Upgrade a Pro" },
        { type: "para", text: "Clicca \"Upgrade a Pro\" per accedere alla pagina di checkout con Stripe. Inserisci i dati di pagamento e conferma: il piano viene attivato immediatamente." },
        { type: "heading", text: "Piano Enterprise" },
        { type: "para", text: "Per il piano Enterprise (prezzo custom, SLA, SSO, account manager dedicato) contatta il supporto tramite /contatti o usa il pulsante \"Contatta il supporto\" nella pagina." },
        { type: "tip", text: "Le fatture vengono emesse e gestite tramite il portale Stripe. Clicca il link nella pagina Piano / Fatturazione per accedere allo storico pagamenti e scaricare le fatture in PDF." },
      ]},
    ],
  },
  {
    id: "sicurezza",
    label: "Sicurezza & Privacy",
    description: "Password, autenticazione a due fattori e protezione dati",
    articles: [
      { id: "s1", title: "Cambiare la password del tuo account", excerpt: "Come aggiornare la password e scegliere una credenziale sicura.", readTime: 2, blocks: [
        { type: "heading", text: "Se usi email+password" },
        { type: "steps", items: [
          "Vai su Impostazioni â†’ Profilo",
          "Clicca \"Cambia password\"",
          "Inserisci la password attuale e poi la nuova password (min. 8 caratteri)",
          "Conferma la nuova password e salva",
        ]},
        { type: "heading", text: "Se usi Google OAuth" },
        { type: "para", text: "Se ti sei registrato con Google, non hai una password Pipely da cambiare. La gestione della password Ã¨ interamente delegata al tuo Account Google. Per cambiarla vai su myaccount.google.com â†’ Sicurezza â†’ Password." },
        { type: "tip", text: "Usa una password lunga e unica per Pipely. Un gestore di password come 1Password o Bitwarden ti aiuta a generare e conservare credenziali sicure senza doverle ricordare." },
      ]},
      { id: "s2", title: "Attivare l'autenticazione a due fattori (2FA)", excerpt: "Proteggi il tuo account con un secondo livello di verifica via app o SMS.", readTime: 5, blocks: [
        { type: "heading", text: "2FA con Google OAuth" },
        { type: "para", text: "Se accedi a Pipely con Google, la 2FA Ã¨ quella configurata sul tuo Account Google. Quando Google richiede la verifica in due passaggi, Pipely Ã¨ automaticamente protetto dalla 2FA di Google." },
        { type: "heading", text: "Come attivare la 2FA Google" },
        { type: "steps", items: [
          "Vai su myaccount.google.com",
          "Clicca su Sicurezza nel menu laterale",
          "Nella sezione \"Accesso a Google\" clicca \"Verifica in 2 passaggi\"",
          "Segui la procedura guidata per scegliere il metodo (app, SMS, chiave fisica)",
        ]},
        { type: "heading", text: "2FA per account email+password" },
        { type: "para", text: "La 2FA nativa per gli account email+password di Pipely Ã¨ in roadmap. Al momento non Ã¨ disponibile. Per proteggere il tuo account usa una password robusta e unica." },
        { type: "tip", text: "L'app Google Authenticator o Authy sono i metodi 2FA piÃ¹ sicuri. Preferiscili rispetto agli SMS, vulnerabili agli attacchi di SIM swapping." },
      ]},
      { id: "s3", title: "Gestione delle sessioni attive", excerpt: "Visualizza i dispositivi connessi e disconnetti le sessioni sospette.", readTime: 3, blocks: [
        { type: "heading", text: "Sessioni attive in Pipely" },
        { type: "para", text: "Pipely non dispone attualmente di una lista delle sessioni attive (dispositivi connessi). Non Ã¨ possibile vedere da quali browser o dispositivi Ã¨ aperta la tua sessione." },
        { type: "heading", text: "Come invalidare tutte le sessioni" },
        { type: "list", items: [
          "Account email+password: cambia la password in Impostazioni â†’ Profilo. Tutte le sessioni attive vengono invalidate.",
          "Account Google OAuth: revoca l'accesso di Pipely dalla dashboard Google (myaccount.google.com â†’ Sicurezza â†’ App con accesso all'account). Poi accedi di nuovo.",
        ]},
        { type: "tip", text: "Se sospetti un accesso non autorizzato, cambia immediatamente la password (o revoca l'accesso OAuth) e verifica le attivitÃ  recenti nel CRM." },
      ]},
      { id: "s4", title: "Privacy dei dati: cosa raccoglie Pipely", excerpt: "Informativa sulla privacy, GDPR e come vengono trattati i tuoi dati.", readTime: 6, blocks: [
        { type: "heading", text: "Dati raccolti" },
        { type: "list", items: [
          "Dati account â€” nome, email, password cifrata o provider OAuth",
          "Dati CRM â€” contatti, aziende, affari, attivitÃ  e note inseriti dall'utente",
          "Log di accesso â€” data/ora di login, indirizzo IP per sicurezza",
          "Pixel di tracciamento campagne â€” aperture email tramite pixel 1Ã—1 px anonimizzato",
        ]},
        { type: "heading", text: "Base legale e GDPR" },
        { type: "para", text: "Pipely tratta i dati in conformitÃ  al GDPR (Regolamento UE 2016/679). La Privacy Policy completa Ã¨ disponibile alla pagina /privacy del sito. Come titolare del trattamento per i dati CRM inseriti nel sistema, sei tu a essere responsabile della loro correttezza e liceitÃ ." },
        { type: "link", text: "Leggi la Privacy Policy completa", href: "/privacy" },
        { type: "tip", text: "Per domande specifiche sulla privacy o richieste GDPR (accesso, rettifica, cancellazione), contatta il supporto tramite /contatti indicando la natura della richiesta." },
      ]},
      { id: "s5", title: "Esportare o eliminare i tuoi dati", excerpt: "Come richiedere l'export completo dei dati o la cancellazione dell'account.", readTime: 4, blocks: [
        { type: "heading", text: "Esportare i tuoi dati" },
        { type: "list", items: [
          "Affari â€” vai su Affari â†’ clicca Export per scaricare il CSV",
          "Contatti â€” vai su Contatti â†’ clicca Export per scaricare il CSV",
          "Prodotti â€” vai su Prodotti â†’ clicca Export per scaricare il CSV del catalogo",
        ]},
        { type: "heading", text: "Eliminare l'account (richiesta GDPR)" },
        { type: "steps", items: [
          "Vai su /contatti e compila il modulo di supporto",
          "Specifica nell'oggetto: \"Richiesta cancellazione account GDPR\"",
          "Indica l'email dell'account da eliminare",
          "Il team elabora la richiesta entro 30 giorni come previsto dal GDPR",
        ]},
        { type: "warning", text: "La cancellazione dell'account Ã¨ definitiva e irreversibile. Tutti i dati CRM (contatti, affari, attivitÃ ) vengono eliminati permanentemente entro 30 giorni dalla richiesta." },
        { type: "tip", text: "Prima di richiedere la cancellazione, esporta i dati che vuoi conservare tramite le funzioni Export CSV disponibili nelle varie sezioni." },
      ]},
      { id: "s6", title: "Permessi e ruoli del team", excerpt: "Amministratore, manager, venditore: differenze di accesso e operazioni consentite.", readTime: 5, blocks: [
        { type: "heading", text: "Ruoli disponibili" },
        { type: "list", items: [
          "OWNER â€” accesso completo: gestisce il piano, la fatturazione e tutti i dati",
          "ADMIN â€” come OWNER ma senza accesso alla gestione del piano/fatturazione",
          "MANAGER â€” gestisce affari, contatti, team e report; non accede alle impostazioni avanzate",
          "SALES â€” crea e gestisce affari e contatti propri; non accede alle impostazioni",
          "VIEWER â€” sola lettura su tutti i dati; non puÃ² creare o modificare nulla",
        ]},
        { type: "heading", text: "Come assegnare i ruoli" },
        { type: "para", text: "I ruoli si assegnano al momento dell'invito (Impostazioni â†’ Team â†’ Invita membro) o modificandoli in seguito cliccando i tre puntini accanto al nome del membro." },
        { type: "tip", text: "Segui il principio del minimo privilegio: assegna il ruolo piÃ¹ restrittivo che permette al membro di svolgere il proprio lavoro. Usa ADMIN solo per chi gestisce davvero l'account." },
      ]},
    ],
  },
  {
    id: "integrazioni",
    label: "Integrazioni",
    description: "API, webhook e connessione con app di terze parti",
    articles: [
      { id: "in1", title: "Panoramica delle integrazioni disponibili", excerpt: "Scopri tutte le app che puoi collegare a Pipely: Gmail, Slack, Zapier e altro.", readTime: 4, blocks: [
        { type: "heading", text: "Integrazioni native disponibili" },
        { type: "list", items: [
          "Google OAuth â€” accesso sicuro con account Google, 2FA inclusa",
          "SMTP (qualsiasi provider) â€” Gmail, Aruba, Libero, Outlook e provider custom",
        ]},
        { type: "heading", text: "In roadmap" },
        { type: "list", items: [
          "Zapier / Make â€” automazione con centinaia di app (previsto)",
          "Google Calendar â€” sincronizzazione attivitÃ  (previsto)",
          "Webhook â€” notifiche push a sistemi esterni (previsto)",
          "API REST pubblica â€” documentazione e chiavi API (in sviluppo)",
        ]},
        { type: "tip", text: "Per accesso anticipato all'API REST o per valutare integrazioni custom su piano Enterprise, contatta il supporto tramite /contatti." },
      ]},
      { id: "in2", title: "Usare l'API REST di Pipely", excerpt: "Documentazione base per sviluppatori: autenticazione, endpoint principali ed esempi.", readTime: 8, popular: true, blocks: [
        { type: "heading", text: "Stato dell'API" },
        { type: "para", text: "L'API REST di Pipely Ã¨ attualmente in sviluppo. L'autenticazione tramite API Key non Ã¨ ancora disponibile per il pubblico generale. Per accesso anticipato contatta il supporto." },
        { type: "heading", text: "Endpoint pianificati" },
        { type: "list", items: [
          "GET /api/deals â€” lista affari con filtri",
          "POST /api/deals â€” crea un nuovo affare",
          "GET /api/contacts â€” lista contatti",
          "POST /api/contacts â€” crea un nuovo contatto",
          "GET /api/leads â€” lista lead",
          "POST /api/leads â€” crea un nuovo lead",
        ]},
        { type: "heading", text: "Autenticazione" },
        { type: "para", text: "L'autenticazione avverrÃ  tramite API Key da includere nell'header HTTP: Authorization: Bearer <api_key>. Le API Key saranno generabili da Impostazioni â†’ Integrazioni (in sviluppo)." },
        { type: "tip", text: "Se sei uno sviluppatore e vuoi integrare Pipely nel tuo stack, contatta il supporto per ricevere la documentazione API in anteprima e accedere all'ambiente di test." },
      ]},
      { id: "in3", title: "Configurare i webhook", excerpt: "Ricevi notifiche in tempo reale nel tuo sistema quando avvengono eventi in Pipely.", readTime: 6, blocks: [
        { type: "heading", text: "Stato dei webhook" },
        { type: "para", text: "I webhook non sono ancora disponibili come funzionalitÃ  self-service in Pipely. Non Ã¨ possibile configurarli autonomamente dall'interfaccia." },
        { type: "heading", text: "Opzione Enterprise" },
        { type: "para", text: "Per i piani Enterprise Ã¨ possibile richiedere la configurazione di webhook custom tramite il supporto. Il team valuta ogni richiesta e definisce gli endpoint in base alle esigenze specifiche." },
        { type: "heading", text: "Alternative disponibili" },
        { type: "list", items: [
          "Usa le Automazioni di Pipely per azioni in risposta agli eventi interni",
          "Quando l'API REST sarÃ  disponibile, potrai usare polling per aggiornare sistemi esterni",
          "Con Make (piano HTTP) puoi giÃ  fare polling dell'API quando sarÃ  disponibile",
        ]},
        { type: "tip", text: "Contatta il supporto tramite /contatti per richiedere webhook su piano Enterprise o per essere avvisato quando i webhook self-service saranno disponibili." },
      ]},
      { id: "in4", title: "Integrazione con Google Calendar", excerpt: "Sincronizza le attivitÃ  di Pipely con il tuo calendario Google.", readTime: 5, blocks: [
        { type: "heading", text: "Stato dell'integrazione" },
        { type: "para", text: "La sincronizzazione con Google Calendar Ã¨ in roadmap. Al momento le attivitÃ  di Pipely rimangono nel CRM e non vengono sincronizzate automaticamente con Google Calendar o altri calendari esterni." },
        { type: "heading", text: "Workaround attuale" },
        { type: "steps", items: [
          "Esporta le attivitÃ  tramite la funzione Export CSV nella pagina AttivitÃ ",
          "Apri Google Calendar â†’ Impostazioni â†’ Importa eventi",
          "Carica il file CSV (potrebbe richiedere conversione in formato .ics)",
          "Gli eventi appaiono nel calendario ma non si sincronizzano in tempo reale",
        ]},
        { type: "tip", text: "Iscriviti alla newsletter Pipely per essere avvisato quando l'integrazione nativa con Google Calendar sarÃ  disponibile." },
      ]},
      { id: "in5", title: "Connettere Pipely a Zapier o Make", excerpt: "Automatizza i flussi tra Pipely e centinaia di altre app senza scrivere codice.", readTime: 5, blocks: [
        { type: "heading", text: "Stato dell'integrazione" },
        { type: "para", text: "L'integrazione nativa con Zapier e Make (Integromat) Ã¨ in roadmap. Non Ã¨ ancora disponibile un'app Pipely ufficiale su questi marketplace." },
        { type: "heading", text: "Alternativa con Make (piano HTTP)" },
        { type: "para", text: "Quando l'API REST di Pipely sarÃ  disponibile, potrai usare il modulo HTTP di Make per fare richieste API personalizzate e automatizzare i flussi tra Pipely e altre app senza aspettare l'integrazione nativa." },
        { type: "list", items: [
          "Make HTTP module â†’ POST /api/deals per creare affari da altri sistemi",
          "Zapier Webhooks â†’ compatibile con l'API REST Pipely (quando disponibile)",
        ]},
        { type: "tip", text: "Se hai bisogno di integrazioni urgenti, contatta il supporto: per i piani Enterprise sono disponibili integrazioni custom su richiesta." },
      ]},
      { id: "in6", title: "Integrazione con strumenti di firma digitale", excerpt: "Collega DocuSign o altri servizi per firmare i contratti direttamente da Pipely.", readTime: 4, blocks: [
        { type: "heading", text: "Stato dell'integrazione" },
        { type: "para", text: "L'integrazione nativa con strumenti di firma digitale come DocuSign, FirmaOggi o simili non Ã¨ disponibile in Pipely." },
        { type: "heading", text: "Workaround consigliato" },
        { type: "steps", items: [
          "Prepara e firma il documento sulla piattaforma di firma digitale che usi",
          "Scarica il documento firmato in PDF",
          "Apri la scheda affare in Pipely",
          "Aggiungi una nota all'affare con il link al documento o allega il PDF",
        ]},
        { type: "list", items: [
          "DocuSign â€” firma e scarica il PDF firmato, poi allegalo alla nota affare",
          "FirmaOggi â€” stessa procedura",
          "Adobe Sign â€” stessa procedura",
        ]},
        { type: "tip", text: "Per ora mantieni i documenti firmati nel tuo sistema di archiviazione (Google Drive, SharePoint) e incolla il link nelle note dell'affare in Pipely per un accesso rapido." },
      ]},
    ],
  },
  {
    id: "mobile",
    label: "App Mobile",
    description: "Accedi a Pipely da iOS e Android ovunque tu sia",
    articles: [
      { id: "mo1", title: "Scaricare l'app Pipely su iPhone e Android", excerpt: "Link agli store e requisiti minimi di sistema per l'app mobile.", readTime: 2, blocks: [
        { type: "heading", text: "Pipely Ã¨ una Progressive Web App (PWA)" },
        { type: "para", text: "Pipely non Ã¨ disponibile come app nativa su App Store o Google Play. Si installa come PWA direttamente dal browser del tuo smartphone, senza passare dagli store." },
        { type: "heading", text: "Installazione su iPhone (Safari)" },
        { type: "steps", items: [
          "Apri Safari sul tuo iPhone",
          "Vai su pipely.app e accedi al tuo account",
          "Tocca l'icona Condividi (quadrato con freccia in su) in basso",
          "Scorri e seleziona \"Aggiungi a schermata Home\"",
          "Conferma: l'icona Pipely appare nella schermata Home",
        ]},
        { type: "heading", text: "Installazione su Android (Chrome)" },
        { type: "steps", items: [
          "Apri Chrome sul tuo Android",
          "Vai su pipely.app e accedi al tuo account",
          "Tocca i tre puntini in alto a destra",
          "Seleziona \"Installa app\" o \"Aggiungi a schermata Home\"",
          "Conferma: l'icona appare nella schermata principale",
        ]},
        { type: "tip", text: "La PWA offre un'esperienza quasi identica all'app nativa: icona nella home, schermo intero, accesso rapido senza aprire il browser." },
      ]},
      { id: "mo2", title: "FunzionalitÃ  disponibili sull'app mobile", excerpt: "Cosa puoi fare da mobile: affari, contatti, attivitÃ  e notifiche push.", readTime: 4, blocks: [
        { type: "heading", text: "FunzionalitÃ  accessibili da mobile" },
        { type: "para", text: "Tramite la PWA hai accesso a tutte le funzionalitÃ  di Pipely disponibili su desktop: non esiste una versione mobile ridotta." },
        { type: "list", items: [
          "Affari â€” crea, modifica e sposta affari nella pipeline",
          "Contatti â€” aggiungi contatti, visualizza schede, invia email",
          "AttivitÃ  â€” crea e completa attivitÃ , vedi il calendario",
          "Lead â€” gestisci e converti i lead in affare",
          "Report â€” visualizza i KPI e i grafici",
          "Campagne â€” monitora le statistiche di invio",
        ]},
        { type: "heading", text: "Limiti rispetto al desktop" },
        { type: "para", text: "La schermata piÃ¹ piccola rende alcune operazioni meno comode (es. drag & drop nella Kanban). Non esistono funzionalitÃ  esclusive mobile al momento." },
        { type: "tip", text: "Per operazioni frequenti da mobile come creare un'attivitÃ  o aggiungere una nota a un affare, la PWA Ã¨ perfettamente adatta. Per import massivi o configurazioni avanzate usa il desktop." },
      ]},
      { id: "mo3", title: "Notifiche push: configurazione", excerpt: "Come attivare e personalizzare gli alert sullo smartphone.", readTime: 3, blocks: [
        { type: "heading", text: "Stato delle notifiche push" },
        { type: "para", text: "Le notifiche push PWA non sono ancora disponibili in Pipely. Al momento non riceverai alert sullo smartphone per attivitÃ  in scadenza, affari aggiornati o altri eventi." },
        { type: "heading", text: "In roadmap" },
        { type: "list", items: [
          "Notifiche push PWA per attivitÃ  in scadenza (previsto Q3 2025)",
          "Notifiche per affari assegnati",
          "Notifiche per messaggi dal team",
        ]},
        { type: "heading", text: "Alternativa attuale" },
        { type: "para", text: "Monitora le attivitÃ  scadute dalla dashboard ogni volta che apri l'app: il KPI \"AttivitÃ  scadute\" in rosso Ã¨ il segnale piÃ¹ immediato di azioni in ritardo." },
        { type: "tip", text: "Iscriviti alla newsletter Pipely per essere avvisato quando le notifiche push saranno disponibili." },
      ]},
      { id: "mo4", title: "Accesso offline: cosa funziona senza connessione", excerpt: "Quali dati sono disponibili offline e come si sincronizzano alla riconnessione.", readTime: 4, blocks: [
        { type: "heading", text: "Pipely richiede connessione" },
        { type: "para", text: "Pipely non dispone di una modalitÃ  offline. Tutti i dati sono in tempo reale sul server: senza connessione internet l'app non funziona." },
        { type: "heading", text: "PerchÃ© non c'Ã¨ la modalitÃ  offline" },
        { type: "para", text: "I dati CRM non vengono memorizzati localmente sul dispositivo per motivi di sicurezza: in caso di smarrimento o accesso non autorizzato allo smartphone, i dati aziendali rimangono protetti sul server." },
        { type: "list", items: [
          "Nessuna cache locale dei contatti o degli affari",
          "Nessuna sincronizzazione alla riconnessione (non necessaria)",
          "Connessione 4G/5G sufficiente per un uso fluido",
        ]},
        { type: "tip", text: "Per lavorare in mobilitÃ  assicurati di avere una connessione dati attiva. La PWA funziona ottimamente anche con connessioni 4G standard." },
      ]},
      { id: "mo5", title: "Aggiungere contatti dalla rubrica del telefono", excerpt: "Importa i contatti direttamente dalla rubrica iOS o Android in Pipely.", readTime: 3, blocks: [
        { type: "heading", text: "FunzionalitÃ  non disponibile" },
        { type: "para", text: "Pipely non supporta l'importazione diretta dalla rubrica del telefono (iOS Contatti o Android Contacts). Non Ã¨ possibile accedere alla rubrica tramite la PWA." },
        { type: "heading", text: "Come aggiungere contatti da mobile" },
        { type: "steps", items: [
          "Apri la PWA Pipely sul tuo smartphone",
          "Vai su Contatti â†’ Nuovo contatto",
          "Inserisci manualmente nome, email e telefono del contatto",
          "Salva",
        ]},
        { type: "heading", text: "Importazione via CSV da mobile" },
        { type: "para", text: "Se hai un file CSV dei tuoi contatti salvato sullo smartphone o accessibile da Google Drive, puoi caricarlo tramite la funzione Importa in Contatti, anche da mobile." },
        { type: "tip", text: "Per importazioni massive di contatti dalla rubrica, esporta la rubrica del telefono in CSV dal tuo sistema (iPhone: esporta da iCloud.com â†’ Contatti, Android: esporta da Google Contacts) e poi importa il CSV in Pipely da desktop." },
      ]},
      { id: "mo6", title: "Problemi comuni sull'app mobile", excerpt: "Soluzioni per crash, errori di login e problemi di sincronizzazione su mobile.", readTime: 5, blocks: [
        { type: "heading", text: "La PWA non si aggiorna" },
        { type: "steps", items: [
          "Apri le impostazioni del browser sul tuo smartphone",
          "Svuota la cache (Cancella dati navigazione â†’ Cache)",
          "Chiudi e riapri la PWA",
          "Se il problema persiste, disinstalla la PWA e reinstallala dal browser",
        ]},
        { type: "heading", text: "Login fallisce su mobile" },
        { type: "list", items: [
          "Verifica che i cookie di terze parti non siano bloccati nelle impostazioni del browser",
          "Su iOS: usa Safari (supporto OAuth migliore rispetto a Chrome su iOS)",
          "Prova ad accedere in modalitÃ  navigazione privata per escludere problemi di cache",
        ]},
        { type: "heading", text: "Google OAuth non funziona su iOS" },
        { type: "para", text: "Su iPhone, Google OAuth funziona meglio con Safari. Chrome su iOS puÃ² avere problemi con i popup di autenticazione. Se il login Google fallisce, passa a Safari." },
        { type: "tip", text: "Se il problema persiste, contatta il supporto tramite /contatti specificando: modello smartphone, versione OS, browser usato e messaggio di errore visualizzato." },
      ]},
    ],
  },
  {
    id: "fatturazione",
    label: "Fatturazione & Piani",
    description: "Abbonamenti, pagamenti e gestione del piano",
    articles: [
      { id: "fa1", title: "Piani disponibili e differenze", excerpt: "Confronto tra Starter (gratis), Pro (â‚¬29/mese) ed Enterprise (custom) di Pipely.", readTime: 4, popular: true, blocks: [
        { type: "heading", text: "Starter â€” Gratis" },
        { type: "para", text: "Il piano di partenza, sempre gratuito. Perfetto per scoprire Pipely e gestire una pipeline di vendita semplice." },
        { type: "list", items: [
          "1 pipeline con stage personalizzabili",
          "Fino a 500 contatti",
          "Report base (KPI dashboard)",
          "App mobile",
        ]},
        { type: "heading", text: "Pro â€” â‚¬29/mese" },
        { type: "para", text: "Il piano per team e professionisti che vogliono automatizzare il lavoro e crescere senza limiti." },
        { type: "list", items: [
          "Pipeline illimitate",
          "Contatti illimitati",
          "AI Assistant integrato",
          "Automazioni avanzate (workflow trigger-action)",
          "Report personalizzati",
          "Campagne email con tracciamento aperture e click",
          "Configurazione SMTP per provider email custom",
        ]},
        { type: "heading", text: "Enterprise â€” Prezzo custom" },
        { type: "para", text: "Per organizzazioni con esigenze avanzate di sicurezza, compliance e supporto." },
        { type: "list", items: [
          "Tutto incluso nel piano Pro",
          "Contatti illimitati con SLA al 99,5%",
          "SSO / SAML per autenticazione aziendale",
          "Supporto dedicato con account manager",
          "Onboarding personalizzato e formazione del team",
        ]},
        { type: "tip", text: "Puoi iniziare con Starter gratuitamente e passare a Pro in qualsiasi momento. Nessun contratto annuale obbligatorio." },
      ]},
      { id: "fa2", title: "Come effettuare l'upgrade del piano", excerpt: "Passare da Starter a Pro: costi, attivazione e cosa cambia subito.", readTime: 3, blocks: [
        { type: "heading", text: "Passare da Starter a Pro" },
        { type: "steps", items: [
          "Vai su Impostazioni â†’ Piano / Fatturazione",
          "Clicca su \"Upgrade a Pro\"",
          "Inserisci i dati di pagamento (carta di credito o SEPA)",
          "Conferma â€” il piano viene attivato immediatamente",
        ]},
        { type: "heading", text: "Cosa si sblocca subito" },
        { type: "list", items: [
          "Pipeline illimitate â€” puoi crearne quante vuoi",
          "Contatti illimitati â€” nessun limite alla crescita del CRM",
          "AI Assistant â€” suggerimenti intelligenti e generazione testi",
          "Automazioni avanzate â€” workflow attivi",
          "Report personalizzati â€” filtri e periodi custom",
        ]},
        { type: "tip", text: "Per il piano Enterprise contatta il team commerciale tramite il pulsante Contatta il supporto in basso nella pagina." },
      ]},
      { id: "fa3", title: "Metodi di pagamento accettati", excerpt: "Carte di credito, SEPA, bonifico: come aggiornare i dati di pagamento.", readTime: 3, blocks: [
        { type: "heading", text: "Metodi disponibili" },
        { type: "list", items: [
          "Carta di credito/debito â€” Visa, Mastercard, American Express",
          "SEPA Direct Debit â€” addebito diretto da conto corrente europeo",
          "Bonifico bancario â€” disponibile solo su richiesta per piano Enterprise",
        ]},
        { type: "heading", text: "Sicurezza dei pagamenti" },
        { type: "para", text: "I pagamenti sono gestiti da Stripe, certificato PCI DSS Level 1 (il massimo livello di sicurezza per i pagamenti online). Pipely non memorizza i dati della carta: sono gestiti interamente da Stripe." },
        { type: "heading", text: "Aggiornare i dati di pagamento" },
        { type: "steps", items: [
          "Vai su Impostazioni â†’ Piano / Fatturazione",
          "Clicca il link al portale Stripe",
          "Nel portale puoi aggiornare la carta, aggiungere un metodo SEPA o vedere lo storico",
        ]},
        { type: "tip", text: "Per il piano Enterprise con pagamento tramite bonifico bancario, contatta il supporto tramite /contatti per ricevere i dati bancari e le istruzioni." },
      ]},
      { id: "fa4", title: "Scaricare le fatture e i ricevuti", excerpt: "Dove trovare lo storico pagamenti e come scaricare le fatture in PDF.", readTime: 2, blocks: [
        { type: "heading", text: "Come accedere alle fatture" },
        { type: "steps", items: [
          "Vai su Impostazioni â†’ Piano / Fatturazione",
          "Clicca il link \"Gestisci fatturazione\" (portale Stripe)",
          "Nel portale trovi lo storico completo dei pagamenti",
          "Clicca su un pagamento per scaricare la fattura in PDF",
        ]},
        { type: "heading", text: "Informazioni sulle fatture" },
        { type: "list", items: [
          "Le fatture sono emesse da Pipely SRL (o entitÃ  legale equivalente)",
          "Includono IVA se applicabile in base al paese di fatturazione",
          "Il numero di partita IVA va inserito nel portale Stripe per le fatture B2B",
        ]},
        { type: "tip", text: "Puoi configurare nel portale Stripe l'email a cui inviare automaticamente le fatture ad ogni rinnovo. Utile per l'amministrazione aziendale." },
      ]},
      { id: "fa5", title: "Disdire o sospendere l'abbonamento", excerpt: "Come cancellare il piano e cosa succede ai tuoi dati dopo la disdetta.", readTime: 4, blocks: [
        { type: "heading", text: "Come cancellare il piano" },
        { type: "steps", items: [
          "Vai su Impostazioni â†’ Piano / Fatturazione",
          "Clicca \"Gestisci abbonamento\"",
          "Seleziona \"Cancella piano\"",
          "Conferma la cancellazione",
          "La cancellazione Ã¨ efficace a fine del periodo giÃ  pagato",
        ]},
        { type: "heading", text: "Cosa succede dopo la cancellazione" },
        { type: "list", items: [
          "Il piano Pro rimane attivo fino alla scadenza del periodo pagato",
          "Dopo la scadenza l'account torna al piano Starter (gratuito) con funzionalitÃ  limitate",
          "I dati rimangono accessibili in sola lettura per 30 giorni dopo la scadenza",
          "Dopo 30 giorni i dati vengono eliminati definitivamente",
        ]},
        { type: "warning", text: "Esporta i tuoi dati (affari, contatti, prodotti) prima che scadano i 30 giorni post-cancellazione. Dopo quella data i dati non sono recuperabili." },
        { type: "tip", text: "Non esiste una funzione di \"sospensione\": puoi solo cancellare il piano. Se vuoi riprendere in futuro, ricrea l'account e importa i dati dal CSV esportato." },
      ]},
      { id: "fa6", title: "Sconto per pagamento annuale", excerpt: "Risparmia fino al 20% pagando l'abbonamento annualmente anzichÃ© mensilmente.", readTime: 2, blocks: [
        { type: "heading", text: "Piano Pro annuale" },
        { type: "para", text: "Il piano Pro annuale costa â‚¬290/anno, equivalente a circa â‚¬24/mese. Rispetto al piano mensile a â‚¬29/mese, il pagamento annuale fa risparmiare â‚¬58 all'anno (2 mesi omaggio)." },
        { type: "heading", text: "Come attivare il piano annuale" },
        { type: "steps", items: [
          "Vai su Impostazioni â†’ Piano / Fatturazione",
          "Clicca \"Upgrade a Pro\"",
          "Nella pagina di checkout seleziona l'opzione \"Annuale\"",
          "Il risparmio viene mostrato chiaramente nella pagina",
          "Completa il pagamento: il piano Ã¨ attivo per 12 mesi",
        ]},
        { type: "tip", text: "Se hai giÃ  un piano mensile attivo e vuoi passare all'annuale, contatta il supporto tramite /contatti: il team ti aiuterÃ  a fare il passaggio con eventuale credito proporzionale." },
      ]},
    ],
  },
  {
    id: "problemi",
    label: "Risoluzione Problemi",
    description: "Errori frequenti, supporto e soluzioni rapide",
    articles: [
      { id: "pb1", title: "Non riesco ad accedere al mio account", excerpt: "Procedura di recupero password e sblocco account dopo troppi tentativi.", readTime: 3, popular: true, blocks: [
        { type: "heading", text: "Accesso con Google" },
        { type: "para", text: "Se usi Google OAuth, assicurati di selezionare lo stesso account Google con cui ti sei registrato. Se hai piÃ¹ account Google, verifica quale Ã¨ quello corretto." },
        { type: "heading", text: "Accesso con email+password" },
        { type: "steps", items: [
          "Vai alla pagina di login",
          "Clicca \"Password dimenticata?\"",
          "Inserisci l'email del tuo account",
          "Ricevi il link di recupero via email (controlla anche lo spam)",
          "Clicca il link e imposta una nuova password",
        ]},
        { type: "heading", text: "Account bloccato per troppi tentativi" },
        { type: "para", text: "Dopo troppi tentativi di accesso falliti l'account viene bloccato temporaneamente. Aspetta 15 minuti prima di riprovare. Se il problema persiste, contatta il supporto." },
        { type: "tip", text: "Se non ricevi l'email di recupero password entro 5 minuti, controlla la cartella spam. Aggiungi noreply@pipely.app ai tuoi contatti attendibili per evitare futuri problemi." },
      ]},
      { id: "pb2", title: "I dati non si sincronizzano correttamente", excerpt: "Cause comuni di mancata sincronizzazione e come forzare l'aggiornamento.", readTime: 4, blocks: [
        { type: "heading", text: "Passaggi di base" },
        { type: "steps", items: [
          "Ricarica la pagina con Ctrl+R (Windows) o Cmd+R (Mac)",
          "Se il problema persiste, svuota la cache del browser (Ctrl+Shift+Delete)",
          "Chiudi e riapri il browser",
          "Prova da un browser diverso o in modalitÃ  incognito",
        ]},
        { type: "heading", text: "Problema su piÃ¹ dispositivi" },
        { type: "para", text: "Se i dati non si aggiornano su piÃ¹ dispositivi contemporaneamente, potrebbe essere un'interruzione del servizio Pipely. Controlla la pagina di stato del servizio." },
        { type: "heading", text: "Possibili cause" },
        { type: "list", items: [
          "Cache browser obsoleta â€” risolto svuotando la cache",
          "Connessione instabile â€” riprova con connessione stabile",
          "Interruzione del servizio â€” verifica la pagina di stato",
        ]},
        { type: "tip", text: "Contatta il supporto tramite /contatti se il problema persiste dopo aver provato tutti i passaggi, specificando browser, sistema operativo e comportamento osservato." },
      ]},
      { id: "pb3", title: "Errore durante l'importazione dei contatti", excerpt: "Formati CSV supportati, errori di codifica e come correggere i file.", readTime: 5, blocks: [
        { type: "heading", text: "Checklist pre-importazione" },
        { type: "list", items: [
          "Encoding: salva il CSV in UTF-8 (non UTF-16 o ANSI)",
          "Separatore: usa virgola o punto e virgola (non tab)",
          "Prima riga: deve contenere le intestazioni delle colonne",
          "Dimensione: il file non deve superare i 5 MB",
          "Righe: per file grandi, dividi in batch da massimo 1000 righe",
        ]},
        { type: "heading", text: "Come salvare in UTF-8" },
        { type: "steps", items: [
          "Excel: File â†’ Salva con nome â†’ scegli \"CSV UTF-8 (delimitato da virgola)\"",
          "Google Sheets: File â†’ Scarica â†’ CSV (.csv) â€” giÃ  in UTF-8",
          "LibreOffice: nella finestra di esportazione CSV seleziona \"Unicode (UTF-8)\"",
        ]},
        { type: "warning", text: "I file salvati con Excel in formato \"CSV (delimitato da virgola)\" standard usano la codifica ANSI: caratteri come Ã , Ã¨, Ã¹ possono risultare corrotti. Usa sempre il formato \"CSV UTF-8\"." },
        { type: "tip", text: "In caso di dubbi sul formato, usa il template Excel fornito da Pipely (Contatti â†’ Importa â†’ Scarica template): Ã¨ giÃ  configurato nel formato corretto." },
      ]},
      { id: "pb4", title: "Le email non vengono registrate in Pipely", excerpt: "Problemi di integrazione email: configurazione IMAP/SMTP e risoluzione errori.", readTime: 6, blocks: [
        { type: "heading", text: "Verifica la configurazione SMTP" },
        { type: "steps", items: [
          "Vai su Impostazioni â†’ Email",
          "Controlla che SMTP sia configurato (host, porta, email, password)",
          "Clicca \"Testa connessione\" per verificare che le credenziali siano corrette",
        ]},
        { type: "heading", text: "Errori comuni e soluzioni" },
        { type: "list", items: [
          "Errore 535 (credenziali errate) â€” verifica email e password; per Gmail usa App Password",
          "Errore su porta 587/465 â€” controlla che la porta corrisponda al protocollo (587=STARTTLS, 465=SSL)",
          "Connessione rifiutata â€” il provider potrebbe bloccare SMTP; controlla le impostazioni di sicurezza dell'account email",
          "Gmail \"Accesso bloccato\" â€” devi usare App Password, non la password principale",
        ]},
        { type: "warning", text: "Gmail non consente l'accesso SMTP con la password principale dell'account. Devi generare un'App Password dedicata da myaccount.google.com â†’ Sicurezza â†’ App password." },
        { type: "tip", text: "Dopo aver corretto la configurazione, usa il pulsante \"Testa connessione\" prima di salvare: riceverai un'email di test per confermare che tutto funzioni." },
      ]},
      { id: "pb5", title: "La pagina non si carica o Ã¨ lenta", excerpt: "Come svuotare la cache, verificare la connessione e segnalare un'interruzione.", readTime: 3, blocks: [
        { type: "heading", text: "Passaggi di risoluzione" },
        { type: "steps", items: [
          "Svuota la cache del browser: Ctrl+Shift+Delete (Windows) / Cmd+Shift+Delete (Mac)",
          "Disabilita temporaneamente le estensioni del browser (ad blocker, VPN...)",
          "Verifica la connessione: apri un altro sito per confermare che internet funzioni",
          "Prova in modalitÃ  incognito per escludere problemi di estensioni o cache",
        ]},
        { type: "heading", text: "Se il problema riguarda solo Pipely" },
        { type: "para", text: "Se altri siti caricano normalmente ma Pipely Ã¨ lento o non risponde, potrebbe essere un'interruzione del servizio. Controlla la pagina di stato o contatta il supporto." },
        { type: "list", items: [
          "Interruzione confermata â€” aspetta il ripristino e monitora gli aggiornamenti di stato",
          "Nessuna interruzione segnalata â€” invia un report al supporto con screenshot e browser usato",
        ]},
        { type: "tip", text: "Chrome e Firefox offrono le migliori prestazioni con Pipely. Se usi un browser meno comune, prova a passare a Chrome o Firefox prima di contattare il supporto." },
      ]},
      { id: "pb6", title: "Contattare il supporto Pipely", excerpt: "Come aprire un ticket, orari del supporto e canali di contatto disponibili.", readTime: 2, blocks: [
        { type: "heading", text: "Come contattare il supporto" },
        { type: "steps", items: [
          "Vai su /contatti",
          "Compila il modulo con: email account, descrizione del problema, screenshot se disponibile",
          "Invia la richiesta",
        ]},
        { type: "heading", text: "Orari e tempi di risposta" },
        { type: "list", items: [
          "DisponibilitÃ : lunedÃ¬â€“venerdÃ¬, 9:00â€“18:00 CET",
          "Tempo di risposta: entro 1 giorno lavorativo per piani Pro ed Enterprise",
          "Piano Starter: risposta entro 2-3 giorni lavorativi",
        ]},
        { type: "heading", text: "Cosa includere nel messaggio" },
        { type: "list", items: [
          "Email del tuo account Pipely",
          "Descrizione chiara del problema",
          "Passi per riprodurre il problema",
          "Screenshot o video del comportamento anomalo",
          "Browser e sistema operativo usati",
        ]},
        { type: "tip", text: "PiÃ¹ informazioni fornisci nel primo messaggio, piÃ¹ rapida sarÃ  la risoluzione. Evita messaggi generici come \"non funziona\": specifica cosa hai fatto e cosa Ã¨ successo." },
      ]},
    ],
  },
  {
    id: "tutorial",
    label: "Tutorial Video",
    description: "Guide video passo-passo per sfruttare Pipely al massimo",
    articles: [
      { id: "tv1", title: "Pipely in 5 minuti: la guida rapida", excerpt: "Video introduttivo che mostra le funzionalitÃ  principali di Pipely.", readTime: 5, popular: true, blocks: [
        { type: "para", text: "Questo tutorial video Ã¨ in fase di produzione e sarÃ  disponibile a breve." },
        { type: "list", items: [
          "Panoramica della dashboard e dei KPI principali",
          "Creare il primo affare e navigare la pipeline Kanban",
          "Aggiungere un contatto e collegarlo a un affare",
          "Configurare la pipeline con stage personalizzati",
        ]},
        { type: "tip", text: "Iscriviti alla newsletter Pipely per essere avvisato quando nuovi tutorial vengono pubblicati." },
      ]},
      { id: "tv2", title: "Come configurare la pipeline in video", excerpt: "Walkthrough completo: dalla creazione degli stage alla prima trattativa.", readTime: 8, popular: true, blocks: [
        { type: "para", text: "Questo tutorial video Ã¨ in fase di produzione e sarÃ  disponibile a breve." },
        { type: "list", items: [
          "Accedere a Impostazioni â†’ Pipeline",
          "Aggiungere e rinominare gli stage con probabilitÃ  di chiusura",
          "Riordinare gli stage con drag & drop",
          "Creare il primo affare e trascinarlo tra gli stage nella Kanban",
        ]},
        { type: "tip", text: "Iscriviti alla newsletter Pipely per essere avvisato quando nuovi tutorial vengono pubblicati." },
      ]},
      { id: "tv3", title: "Gestire i contatti: video tutorial", excerpt: "Come aggiungere, modificare e importare contatti con la guida video.", readTime: 6, blocks: [
        { type: "para", text: "Questo tutorial video Ã¨ in fase di produzione e sarÃ  disponibile a breve." },
        { type: "list", items: [
          "Importazione CSV con gestione duplicati",
          "Creazione manuale di un contatto con tutti i campi",
          "Collegamento del contatto a un'azienda",
          "Invio email direttamente dalla scheda contatto",
        ]},
        { type: "tip", text: "Iscriviti alla newsletter Pipely per essere avvisato quando nuovi tutorial vengono pubblicati." },
      ]},
      { id: "tv4", title: "Automazioni avanzate: webinar registrato", excerpt: "1 ora di webinar con esempi pratici di workflow automatici.", readTime: 60, blocks: [
        { type: "para", text: "Questo tutorial video Ã¨ in fase di produzione e sarÃ  disponibile a breve." },
        { type: "list", items: [
          "Follow-up automatico dopo una chiamata completata",
          "Notifiche al team quando un affare viene vinto",
          "Lead nurturing: email automatiche ai lead in NURTURING",
          "Debug e monitoraggio dei workflow con il tab Log",
        ]},
        { type: "tip", text: "Iscriviti alla newsletter Pipely per essere avvisato quando nuovi tutorial vengono pubblicati." },
      ]},
      { id: "tv5", title: "Report e analytics: video demo", excerpt: "Come leggere i grafici, filtrare per periodo ed esportare i dati.", readTime: 10, blocks: [
        { type: "para", text: "Questo tutorial video Ã¨ in fase di produzione e sarÃ  disponibile a breve." },
        { type: "list", items: [
          "Leggere il grafico funnel e identificare i colli di bottiglia",
          "Filtrare i KPI per periodo (7, 30, 90 giorni, 12 mesi)",
          "Analizzare il report Top performer del team",
          "Esportare i dati in CSV per analisi su Excel",
        ]},
        { type: "tip", text: "Iscriviti alla newsletter Pipely per essere avvisato quando nuovi tutorial vengono pubblicati." },
      ]},
      { id: "tv6", title: "Tour completo dell'app mobile", excerpt: "Tutte le funzionalitÃ  dell'app iOS e Android in un video di 7 minuti.", readTime: 7, blocks: [
        { type: "para", text: "Questo tutorial video Ã¨ in fase di produzione e sarÃ  disponibile a breve." },
        { type: "list", items: [
          "Installazione PWA su iPhone (Safari) e Android (Chrome)",
          "Navigazione tra le sezioni principali da mobile",
          "Creazione di un'attivitÃ  e di un contatto da smartphone",
          "Gestione degli affari nella vista Kanban da mobile",
        ]},
        { type: "tip", text: "Iscriviti alla newsletter Pipely per essere avvisato quando nuovi tutorial vengono pubblicati." },
      ]},
    ],
  },
];


// ─── AI serialization ─────────────────────────────────────────────────────────

function serializeBlock(b: GuideBlock): string {
  if (b.type === "heading") return `**${b.text}**`;
  if (b.type === "para") return b.text;
  if (b.type === "list") return b.items.map((i) => `• ${i}`).join("\n");
  if (b.type === "steps") return b.items.map((i, n) => `${n + 1}. ${i}`).join("\n");
  if (b.type === "tip") return `💡 ${b.text}`;
  if (b.type === "warning") return `⚠️ ${b.text}`;
  if (b.type === "link") return `[${b.text}](${b.href})`;
  return "";
}

function serializeArticle(section: GuideSection, article: GuideArticle): string {
  const lines: string[] = [`### [${section.label}] ${article.title}`, article.excerpt, ""];
  if (article.blocks) {
    for (const b of article.blocks) lines.push(serializeBlock(b));
  }
  return lines.join("\n");
}

export function getGuideContext(query: string): string {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);

  if (words.length === 0) return getGuideIndex();

  type Scored = { section: GuideSection; article: GuideArticle; score: number };
  const scored: Scored[] = [];

  for (const section of GUIDE_SECTIONS) {
    for (const article of section.articles) {
      let score = 0;
      const titleLc = article.title.toLowerCase();
      const excerptLc = article.excerpt.toLowerCase();
      const sectionLc = section.label.toLowerCase();
      const blocksText = (article.blocks ?? [])
        .map((b) => {
          if (b.type === "list" || b.type === "steps") return b.items.join(" ");
          if (b.type === "link") return b.text;
          return (b as { text?: string }).text ?? "";
        })
        .join(" ")
        .toLowerCase();

      for (const w of words) {
        if (titleLc.includes(w)) score += 3;
        if (excerptLc.includes(w)) score += 2;
        if (blocksText.includes(w)) score += 1;
        if (sectionLc.includes(w)) score += 1;
      }

      if (score > 0) scored.push({ section, article, score });
    }
  }

  if (scored.length === 0) return getGuideIndex();

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 4);

  return (
    "=== DOCUMENTAZIONE PIPELY ===\n\n" +
    top.map(({ section, article }) => serializeArticle(section, article)).join("\n\n---\n\n")
  );
}

function getGuideIndex(): string {
  const lines = ["=== GUIDA PIPELY — INDICE ==="];
  for (const s of GUIDE_SECTIONS) {
    lines.push(`\n[${s.label}]`);
    for (const a of s.articles) lines.push(`- ${a.title}`);
  }
  return lines.join("\n");
}
