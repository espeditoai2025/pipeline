// --- Guide data � NO React dependencies --------------------------------------
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
        { type: "para", text: "Pipely è un CRM progettato per gestire vendite, contatti e attività in un unico posto. La registrazione richiede meno di 2 minuti." },
        { type: "heading", text: "Registrazione" },
        { type: "steps", items: [
          "Vai alla pagina di registrazione e clicca su \"Crea account\"",
          "Inserisci nome, email e scegli una password sicura (min. 8 caratteri)",
          "Scegli il nome della tua organizzazione — sarà visibile ai tuoi colleghi",
          "Clicca \"Crea account\" per completare la registrazione",
        ]},
        { type: "tip", text: "Puoi registrarti anche con Google per un accesso più rapido, senza dover memorizzare una password aggiuntiva." },
        { type: "heading", text: "Cosa succede dopo" },
        { type: "para", text: "Dopo la registrazione entri direttamente nella dashboard. Pipely mostra un wizard guidato per completare i primi passi: configurare la pipeline, aggiungere contatti, creare il primo affare e altro." },
        { type: "tip", text: "Se crei l'account per un team, invita subito i tuoi colleghi da Impostazioni → Team." },
      ]},
      { id: "i2", title: "Configurare la tua organizzazione", excerpt: "Imposta il nome, il logo e le informazioni della tua azienda in Pipely.", readTime: 4, blocks: [
        { type: "heading", text: "Dove si trovano le impostazioni" },
        { type: "para", text: "Clicca sull'icona ingranaggio nella sidebar per accedere al pannello Impostazioni." },
        { type: "heading", text: "Nome e slug" },
        { type: "para", text: "Il nome dell'organizzazione è visibile a tutti i membri del team. Lo slug è un identificatore univoco assegnato alla registrazione e non è modificabile successivamente." },
        { type: "heading", text: "Piano attivo" },
        { type: "para", text: "Nella sezione Impostazioni puoi visualizzare il piano attivo: Starter (gratuito), Pro (€29/mese) o Enterprise (custom). Ogni piano sblocca funzionalità aggiuntive." },
        { type: "tip", text: "Mantieni i dati dell'organizzazione aggiornati — il nome viene usato come mittente predefinito nelle email inviate tramite Pipely." },
      ]},
      { id: "i3", title: "Invitare i membri del team", excerpt: "Come aggiungere collaboratori e assegnare ruoli e permessi.", readTime: 5, popular: true, blocks: [
        { type: "heading", text: "Ruoli disponibili" },
        { type: "list", items: [
          "OWNER — accesso completo, può modificare il piano e gestire tutti i dati",
          "ADMIN — accesso completo eccetto la gestione del piano",
          "MANAGER — gestisce affari, contatti e team ma non le impostazioni avanzate",
          "SALES — crea e gestisce affari e contatti, non accede alle impostazioni",
          "VIEWER — solo visualizzazione, nessuna modifica",
        ]},
        { type: "heading", text: "Come invitare un membro" },
        { type: "steps", items: [
          "Vai su Impostazioni → Team",
          "Clicca su \"Invita membro\"",
          "Inserisci l'email del collega e scegli il ruolo appropriato",
          "Clicca \"Invia invito\" — il collega riceve un'email con il link di accesso",
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
          "Apri la finestra di importazione (Contatti → Importa)",
          "Trascina il file nell'area di upload oppure clicca per selezionarlo",
          "Verifica la preview: Pipely mostra le prime 5 righe rilevate",
          "Controlla che le colonne siano mappate correttamente",
          "Clicca \"Importa N contatti\" per avviare l'importazione",
        ]},
        { type: "heading", text: "Colonne riconosciute automaticamente" },
        { type: "list", items: ["Nome / First Name", "Cognome / Last Name", "Email", "Telefono / Phone", "Azienda / Company"] },
        { type: "tip", text: "I duplicati (stessa email) vengono ignorati automaticamente. Puoi importare lo stesso file più volte senza creare duplicati." },
        { type: "warning", text: "Il file non deve superare i 5 MB. Per file molto grandi, dividili in più batch da importare separatamente." },
      ]},
      { id: "i5", title: "Panoramica della dashboard", excerpt: "Scopri i KPI principali, la pipeline overview, i widget e la guida wizard per i primi passi.", readTime: 3, blocks: [
        { type: "heading", text: "I KPI principali" },
        { type: "list", items: [
          "Affari aperti — numero totale di trattative attive nella pipeline",
          "Valore pipeline — somma del valore di tutti gli affari aperti",
          "Revenue vinta — totale degli affari chiusi come Vinti negli ultimi 30 giorni",
          "Win rate — percentuale di affari vinti sul totale chiusi (vinti + persi)",
          "Previsione ponderata — stima del fatturato basata sulla probabilità di ogni stage",
          "Attività scadute — attività con data di scadenza superata e non completate",
        ]},
        { type: "heading", text: "Grafico pipeline per stage" },
        { type: "para", text: "Il grafico a barre mostra la distribuzione degli affari e del valore per ogni stage. Usalo per identificare colli di bottiglia (es. molti affari bloccati nello stage Proposta)." },
        { type: "heading", text: "La guida di avvio rapido" },
        { type: "para", text: "Se sei nuovo, in cima alla dashboard trovi il wizard che ti accompagna in 10 passi: configurare la pipeline, aggiungere aziende, contatti, prodotti, affari, attività, email SMTP, automazioni, liste e campagne." },
        { type: "tip", text: "Una volta completati tutti i passi, la guida può essere nascosta cliccando sulla X in alto a destra. Lo stato viene salvato nel browser." },
      ]},
      { id: "i6", title: "Personalizzare le impostazioni iniziali", excerpt: "Lingua, fuso orario, valuta e altre preferenze dell'account.", readTime: 4, blocks: [
        { type: "heading", text: "Profilo personale" },
        { type: "para", text: "In Impostazioni → Profilo puoi aggiornare il nome visualizzato e la foto profilo. L'email non è modificabile in quanto usata per l'autenticazione." },
        { type: "heading", text: "Configurazione email (SMTP)" },
        { type: "para", text: "In Impostazioni → Email configuri il provider per inviare email reali ai tuoi contatti. Pipely supporta Gmail, Aruba, Libero e qualsiasi provider SMTP custom." },
        { type: "tip", text: "Senza SMTP configurato, le email mostrate nell'app sono simulate. Configura SMTP per abilitare l'invio reale ai destinatari." },
        { type: "heading", text: "Gestione team" },
        { type: "para", text: "In Impostazioni → Team gestisci i membri: inviti, modifica ruoli, rimozione utenti." },
        { type: "heading", text: "Pipeline e stage" },
        { type: "para", text: "In Impostazioni → Pipeline personalizzi gli stage: nome, probabilità di chiusura, colore e ordine. Puoi creare pipeline multiple per processi diversi (es. vendite, supporto)." },
      ]},
    ],
  },
  {
    id: "pipeline",
    label: "Pipeline & Affari",
    description: "Crea pipeline, gestisci affari e monitora le trattative",
    articles: [
      { id: "p1", title: "Come creare e configurare una pipeline", excerpt: "Imposta gli stage, la probabilità di chiusura e i tempi di rotting per la tua pipeline.", readTime: 5, popular: true, blocks: [
        { type: "heading", text: "Cos'è una pipeline" },
        { type: "para", text: "Una pipeline rappresenta il processo di vendita suddiviso in stage progressivi. Ogni affare avanza da uno stage all'altro verso la chiusura." },
        { type: "heading", text: "Creare la prima pipeline" },
        { type: "steps", items: [
          "Vai su Impostazioni → Pipeline",
          "Clicca \"Nuova pipeline\" e assegna un nome (es. Vendite B2B)",
          "Aggiungi gli stage cliccando il pulsante + accanto all'ultimo stage",
          "Per ogni stage imposta: nome, probabilità di chiusura (0–100%), colore opzionale",
          "Riordina gli stage trascinandoli con il drag handle",
          "Clicca Salva",
        ]},
        { type: "heading", text: "Stage consigliati" },
        { type: "list", items: [
          "Prospect (0%) — contatto identificato, non ancora qualificato",
          "Qualificato (20%) — interesse confermato",
          "Proposta inviata (50%) — offerta presentata al cliente",
          "Negoziazione (75%) — trattativa in corso",
          "Chiusura (90%) — accordo quasi finalizzato",
        ]},
        { type: "tip", text: "La probabilità di ogni stage viene usata per calcolare la previsione ponderata nella dashboard: valore affare × probabilità stage." },
        { type: "heading", text: "Rotting" },
        { type: "para", text: "Il rotting è un avviso visivo per gli affari fermi in uno stage da troppo tempo. Puoi configurare il numero di giorni soglia nelle impostazioni della pipeline." },
      ]},
      { id: "p2", title: "Aggiungere e gestire gli affari", excerpt: "Crea nuovi affari con contatto, prodotti e valore direttamente nel form di creazione.", readTime: 4, popular: true, blocks: [
        { type: "heading", text: "Creare un nuovo affare" },
        { type: "steps", items: [
          "Vai su Affari nella sidebar",
          "Clicca \"Nuovo affare\" in alto a destra",
          "Inserisci il titolo dell'affare e il valore stimato",
          "Seleziona pipeline, stage di partenza e data di chiusura prevista",
          "Collega un contatto dal menu a tendina (cerca tra i contatti esistenti in Pipely)",
          "Nella sezione Prodotti, aggiungi uno o più prodotti dal catalogo con quantità",
          "Assegna un responsabile del team",
          "Clicca Crea",
        ]},
        { type: "heading", text: "Aggiungere prodotti durante la creazione" },
        { type: "para", text: "Direttamente nel form di creazione affare trovi la sezione Prodotti. Seleziona un prodotto dal catalogo, imposta la quantità e il prezzo unitario viene inserito automaticamente. Il totale dei prodotti aggiorna il valore dell'affare." },
        { type: "list", items: [
          "Seleziona prodotto — cerca per nome nel catalogo attivo",
          "Quantità — numero di unità, default 1",
          "Prezzo unitario — precompilato dal catalogo, modificabile",
          "Totale riga — calcolato in automatico",
          "Puoi aggiungere più prodotti allo stesso affare",
        ]},
        { type: "heading", text: "Gestire gli affari nella vista Kanban" },
        { type: "para", text: "Nella vista Kanban puoi trascinare le card direttamente da uno stage all'altro. Lo stage dell'affare si aggiorna automaticamente." },
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
        { type: "para", text: "Puoi cambiare lo stage anche aprendo la scheda affare e selezionando il nuovo stage dal menu a tendina in cima alla pagina. Utile da mobile o quando si gestiscono più informazioni insieme." },
        { type: "tip", text: "Ogni spostamento viene registrato nello storico dell'affare con data e utente che ha effettuato la modifica." },
      ]},
      { id: "p4", title: "Rotting: affari in attesa troppo a lungo", excerpt: "Cos'è il rotting, come configurarlo e come ricevere notifiche sugli affari fermi.", readTime: 4, blocks: [
        { type: "heading", text: "Cos'è il rotting" },
        { type: "para", text: "Il rotting è un segnale visivo che avvisa quando un affare è rimasto nello stesso stage per troppo tempo senza attività. Gli affari in rotting mostrano un badge rosso nella vista Kanban e nella lista affari." },
        { type: "heading", text: "Configurare i giorni soglia" },
        { type: "steps", items: [
          "Vai su Impostazioni → Pipeline",
          "Seleziona la pipeline da configurare",
          "Per ogni stage trovi il campo \"Giorni prima del rotting\"",
          "Imposta il numero di giorni (es. 7 per lo stage Proposta, 14 per Negoziazione)",
          "Salva le modifiche",
        ]},
        { type: "heading", text: "Come gestire gli affari in rotting" },
        { type: "list", items: [
          "Filtra la lista affari per mostrare solo gli affari con rotting attivo",
          "Contatta il referente, aggiorna le note o pianifica un'attività di follow-up",
          "Non appena viene registrata un'attività o cambia lo stage, il badge rotting sparisce",
        ]},
        { type: "tip", text: "Configura soglie diverse per stage diversi: uno stage iniziale come Prospect può tollerare più giorni rispetto a Negoziazione, dove la trattativa è avanzata." },
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
        { type: "tip", text: "Compilare sempre il motivo della perdita: nel tempo questi dati diventano un'analisi preziosa su dove si perdono più trattative." },
      ]},
      { id: "p6", title: "Filtri e ricerca avanzata nella pipeline", excerpt: "Filtra gli affari per stage, responsabile, valore, data e altri criteri.", readTime: 5, blocks: [
        { type: "heading", text: "Filtri disponibili" },
        { type: "list", items: [
          "Stage — mostra solo gli affari in uno o più stage selezionati",
          "Responsabile — filtra per il membro del team assegnato all'affare",
          "Valore minimo / massimo — intervallo di valore economico dell'affare",
          "Data chiusura prevista — range di date entro cui si prevede la chiusura",
          "Stato — Aperto, Vinto, Perso",
        ]},
        { type: "heading", text: "Come applicare i filtri" },
        { type: "steps", items: [
          "Vai su Affari nella sidebar",
          "Clicca l'icona Filtri in alto a destra",
          "Seleziona uno o più criteri dal pannello laterale",
          "La lista (o Kanban) si aggiorna in tempo reale mostrando solo gli affari corrispondenti",
        ]},
        { type: "heading", text: "Combinare più filtri" },
        { type: "para", text: "I filtri si combinano con logica AND: attivando Stage = Proposta e Responsabile = Mario vengono mostrati solo gli affari nello stage Proposta assegnati a Mario." },
        { type: "tip", text: "Per resettare tutti i filtri clicca il pulsante \"Reimposta filtri\" in fondo al pannello. Lo stato dei filtri non viene salvato tra le sessioni." },
      ]},
    ],
  },
  {
    id: "contatti",
    label: "Contatti & Aziende",
    description: "Gestione anagrafica, importazione e relazioni tra entità",
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
          "Nome e Cognome — usati per personalizzare le email con {{nome}} e {{cognome}}",
          "Email — indirizzo principale per comunicazioni e campagne",
          "Telefono — visibile nella scheda per chiamate rapide",
          "Azienda — collega il contatto a un'azienda esistente in Pipely",
          "Ruolo/Qualifica — posizione nella sua azienda (es. Responsabile Acquisti)",
        ]},
        { type: "heading", text: "Modificare un contatto" },
        { type: "para", text: "Clicca sul nome di qualsiasi contatto per aprire il dettaglio. Da lì puoi modificare tutti i campi, vedere lo storico delle attività, gli affari collegati e le email inviate." },
        { type: "tip", text: "Collegare i contatti alle aziende ti permette di vedere tutti i referenti di un'azienda in un unico posto, nella scheda dell'azienda stessa." },
      ]},
      { id: "c2", title: "Collegare contatti alle aziende", excerpt: "Come associare un contatto a una o più aziende e gestire i ruoli.", readTime: 4, blocks: [
        { type: "heading", text: "Campo Azienda nel form contatto" },
        { type: "para", text: "Quando crei o modifichi un contatto, il campo Azienda ti permette di collegarlo a un'azienda esistente nel CRM. Inizia a digitare il nome: Pipely suggerisce le aziende già registrate." },
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
          "Vai su Contatti → clicca l'icona Importa in alto a destra",
          "Trascina il file CSV nell'area di upload o clicca per selezionarlo",
          "Verifica la preview con le prime 5 righe",
          "Controlla il mapping delle colonne rilevate automaticamente",
          "Clicca \"Importa\" per avviare il processo",
        ]},
        { type: "heading", text: "Gestione duplicati" },
        { type: "para", text: "I contatti con la stessa email di uno già presente nel CRM vengono automaticamente ignorati. Puoi importare lo stesso file più volte senza creare duplicati." },
        { type: "warning", text: "Se il file supera i 5 MB, dividilo in più file da importare separatamente. Per file molto grandi usa blocchi da massimo 1000 righe ciascuno." },
      ]},
      { id: "c4", title: "Gestire le aziende e i loro contatti", excerpt: "Vista aziendale, elenco dipendenti, affari collegati e storico attività.", readTime: 5, blocks: [
        { type: "heading", text: "Aprire la scheda azienda" },
        { type: "para", text: "Vai su Contatti → tab Aziende, oppure clicca sul nome di un'azienda da qualsiasi parte del CRM. La scheda mostra tutte le informazioni dell'azienda in un unico posto." },
        { type: "heading", text: "Contenuto della scheda azienda" },
        { type: "list", items: [
          "Campi azienda: nome, settore, sito web, telefono, indirizzo",
          "Contatti collegati: elenco di tutte le persone associate all'azienda",
          "Affari associati: tutte le trattative collegate ai contatti dell'azienda",
          "Attività: storico delle attività svolte con questa azienda",
        ]},
        { type: "heading", text: "Modificare i dati aziendali" },
        { type: "para", text: "Clicca sul pulsante Modifica nella scheda azienda per aggiornare nome, settore, sito web, telefono e altri campi. Le modifiche sono immediatamente visibili a tutti i membri del team." },
        { type: "tip", text: "Compilare il campo Settore ti permette di filtrare le aziende per vertical e di analizzare le performance di vendita per tipo di industria." },
      ]},
      { id: "c5", title: "Campi personalizzati per contatti", excerpt: "Aggiungi campi su misura per raccogliere le informazioni che servono al tuo team.", readTime: 6, blocks: [
        { type: "heading", text: "Creare un campo personalizzato" },
        { type: "steps", items: [
          "Vai su Impostazioni → Campi personalizzati",
          "Seleziona l'entità: Contatto, Affare o Azienda",
          "Clicca \"Aggiungi campo\"",
          "Inserisci il nome del campo e scegli il tipo",
          "Salva: il campo appare nelle schede di tutti i contatti per tutti i membri del team",
        ]},
        { type: "heading", text: "Tipi di campo disponibili" },
        { type: "list", items: [
          "Testo — campo libero per note brevi o identificatori",
          "Numero — valori numerici (es. fatturato annuo cliente)",
          "Data — selettore data (es. data di rinnovo contratto)",
          "Selezione singola — menu a tendina con opzioni predefinite",
        ]},
        { type: "tip", text: "I campi personalizzati sono visibili a tutti i membri del team e non possono essere resi privati. Usa nomi chiari che il team possa capire subito." },
      ]},
      { id: "c6", title: "Eliminare o archiviare un contatto", excerpt: "Differenza tra eliminazione definitiva e archiviazione; come recuperare i dati.", readTime: 3, blocks: [
        { type: "heading", text: "Eliminazione definitiva" },
        { type: "steps", items: [
          "Apri la scheda del contatto",
          "Clicca i tre puntini (⋯) in alto a destra",
          "Seleziona \"Elimina contatto\"",
          "Conferma l'eliminazione nella finestra di dialogo",
        ]},
        { type: "heading", text: "Cosa succede agli affari collegati" },
        { type: "para", text: "Gli affari collegati al contatto non vengono eliminati automaticamente: rimangono nella pipeline con il campo contatto vuoto. Dovrai aggiornare o eliminare manualmente gli affari orfani." },
        { type: "warning", text: "L'eliminazione è definitiva e irreversibile. Pipely non dispone di una funzione archivio: una volta eliminato, il contatto e le sue informazioni non possono essere recuperati." },
        { type: "tip", text: "Se hai dubbi, prima di eliminare esporta i dati del contatto tramite la funzione Export CSV nella lista contatti." },
      ]},
    ],
  },
  {
    id: "lead",
    label: "Lead Management",
    description: "Cattura lead, qualificazione e conversione in affari",
    articles: [
      { id: "l1", title: "Cos'è un lead in Pipely e come crearlo", excerpt: "Differenza tra lead e affare; come aggiungere un nuovo lead con email, telefono, responsabile e contatto collegato.", readTime: 4, popular: true, blocks: [
        { type: "heading", text: "Lead vs Affare" },
        { type: "para", text: "Un lead è un prospect non ancora qualificato: sai che esiste un interesse, ma non hai ancora abbastanza informazioni per aprire una trattativa. Un affare si crea quando il lead è qualificato e merita una posizione nella pipeline di vendita." },
        { type: "heading", text: "Creare un nuovo lead" },
        { type: "steps", items: [
          "Vai su Leads nella sidebar",
          "Clicca \"Nuovo lead\"",
          "Inserisci titolo, email e telefono del prospect",
          "Imposta lo score (0–100), la fonte (es. Sito web, LinkedIn) e aggiungi note",
          "Assegna un responsabile del team",
          "Opzionalmente collega il lead a un contatto già esistente in Pipely",
          "Clicca Crea",
        ]},
        { type: "heading", text: "Campi principali del lead" },
        { type: "list", items: [
          "Titolo — nome descrittivo del lead (es. \"Richiesta demo da Mario Rossi\")",
          "Email e Telefono — recapiti diretti del prospect",
          "Score — valore numerico 0-100 per prioritizzare (verde ≥70, giallo ≥40, rosso <40)",
          "Fonte — canale di provenienza (Sito web, LinkedIn, Evento, Referral, Ads...)",
          "Note — informazioni aggiuntive sul prospect",
          "Responsabile — membro del team che gestisce il lead",
          "Contatto collegato — collega il lead a un contatto Pipely già esistente",
        ]},
        { type: "tip", text: "Usa la sezione Leads come filtro: inserisci tutti i contatti iniziali e converti in affare solo quelli che superano la qualificazione." },
      ]},
      { id: "l2", title: "Qualificare un lead: stati e workflow", excerpt: "Gli stati NEW, WORKING, NURTURING, CONVERTED, DISQUALIFIED e come cambiarli direttamente dalla tabella.", readTime: 5, blocks: [
        { type: "heading", text: "Gli stati del lead" },
        { type: "list", items: [
          "Nuovo (NEW) — lead appena creato, non ancora lavorato",
          "In lavorazione (WORKING) — il responsabile sta attivamente qualificando il lead",
          "Nurturing (NURTURING) — lead non ancora pronto, da coltivare nel tempo",
          "Convertito (CONVERTED) — lead qualificato e trasformato in affare",
          "Non qualificato (DISQUALIFIED) — lead non idoneo o non interessato",
        ]},
        { type: "heading", text: "Come cambiare stato (metodo rapido)" },
        { type: "steps", items: [
          "Nella tabella Leads, individua la colonna Stato",
          "Clicca direttamente sul menu a tendina nella riga del lead",
          "Seleziona il nuovo stato: si aggiorna istantaneamente senza aprire il modulo",
        ]},
        { type: "heading", text: "Come cambiare stato dal modulo di modifica" },
        { type: "steps", items: [
          "Clicca sull'icona matita nella riga del lead",
          "Modifica il campo Stato nel form laterale",
          "Clicca Salva",
        ]},
        { type: "heading", text: "Buone pratiche" },
        { type: "para", text: "Aggiorna lo stato del lead dopo ogni interazione. I lead in NURTURING vanno contattati periodicamente con campagne email. Un lead rimasto in NEW per più di 3 giorni è spesso un segnale che manca un responsabile assegnato." },
        { type: "tip", text: "Usa le automazioni per cambiare stato automaticamente: es. quando viene completata un'attività di tipo Chiamata, sposta il lead da NEW a WORKING." },
      ]},
      { id: "l3", title: "Convertire un lead in affare", excerpt: "Come trasformare un lead qualificato in un affare: imposta il valore, crea il contatto e conferma in un click.", readTime: 3, popular: true, blocks: [
        { type: "heading", text: "Come convertire un lead" },
        { type: "steps", items: [
          "Nella tabella Leads, clicca l'icona freccia (→) sulla riga del lead",
          "Si apre il pannello di conversione con un riepilogo del lead",
          "Modifica il titolo dell'affare se necessario",
          "Inserisci il valore dell'affare in Euro",
          "Se il lead non ha già un contatto collegato, puoi creare un nuovo contatto con nome, email e telefono",
          "Clicca Converti: viene creato l'affare nel primo stage della pipeline predefinita",
        ]},
        { type: "heading", text: "Cosa viene creato" },
        { type: "list", items: [
          "Un nuovo affare nel primo stage della pipeline predefinita",
          "Opzionalmente un nuovo contatto collegato all'affare",
          "Il lead passa automaticamente a stato CONVERTED",
          "Il lead rimane visibile per riferimento storico",
        ]},
        { type: "tip", text: "Se il lead ha già un contatto collegato, l'affare viene associato automaticamente a quel contatto senza chiederti di crearne uno nuovo." },
        { type: "warning", text: "La conversione usa sempre il primo stage della pipeline predefinita. Assicurati di avere almeno una pipeline configurata prima di convertire un lead." },
      ]},
      { id: "l4", title: "Score e priorità dei lead", excerpt: "Come usare il punteggio per ordinare i lead e concentrarsi sui più promettenti.", readTime: 4, blocks: [
        { type: "heading", text: "Il campo score" },
        { type: "para", text: "Lo score è un numero da 0 a 100 che indica la priorità del lead. È un campo manuale: sei tu a decidere il punteggio in base alle informazioni raccolte durante la qualificazione." },
        { type: "heading", text: "Come usare lo score" },
        { type: "list", items: [
          "Ordina la lista lead per score decrescente per lavorare prima sui più promettenti",
          "Filtra i lead con score superiore a una soglia (es. > 70) per campagne dedicate",
          "Usa lo score come criterio nelle automazioni (es. score > 80 → crea attività urgente)",
        ]},
        { type: "heading", text: "Criteri di scoring suggeriti" },
        { type: "list", items: [
          "+30 punti se ha un budget definito",
          "+25 punti se è il decision maker",
          "+20 punti se ha un'esigenza urgente",
          "+15 punti se conosce già il prodotto",
          "+10 punti se proviene da referral",
        ]},
        { type: "tip", text: "Non esiste un calcolo automatico dello score: definisci una scala condivisa con il team per garantire coerenza nella valutazione." },
      ]},
      { id: "l5", title: "Importare lead da fonti esterne", excerpt: "Integrazione con form web, LinkedIn e altri strumenti di lead generation.", readTime: 6, blocks: [
        { type: "heading", text: "Opzioni di importazione attuali" },
        { type: "para", text: "Al momento Pipely non dispone di un'importazione diretta dedicata alla sezione Lead. Il flusso consigliato è: importa i contatti via CSV nella sezione Contatti, poi crea manualmente i lead dalla sezione Leads." },
        { type: "heading", text: "Flusso di importazione da CSV" },
        { type: "steps", items: [
          "Prepara un file CSV con i dati dei prospect (nome, email, telefono, fonte)",
          "Vai su Contatti → Importa e carica il file",
          "Una volta importati i contatti, vai su Leads → Nuovo lead e crea i lead associandoli ai contatti importati",
        ]},
        { type: "heading", text: "Funzionalità in arrivo" },
        { type: "list", items: [
          "Import diretto nella sezione Leads via CSV",
          "Webhook API per acquisire lead da form web in tempo reale",
          "Integrazione con Zapier/Make per connettere strumenti di lead generation",
        ]},
        { type: "tip", text: "Per essere avvisato quando le nuove funzionalità di importazione lead saranno disponibili, iscriviti alla newsletter Pipely." },
      ]},
      { id: "l6", title: "Report sulle performance dei lead", excerpt: "Tasso di conversione, tempo medio di qualificazione e analisi per sorgente.", readTime: 5, blocks: [
        { type: "heading", text: "Metriche disponibili" },
        { type: "list", items: [
          "Tasso di conversione — percentuale di lead convertiti in affare sul totale (CONVERTED / totale lead)",
          "Lead per stato — distribuzione dei lead tra NEW, WORKING, NURTURING, CONVERTED, LOST",
          "Lead per fonte — quanti lead provengono da ogni sorgente (Sito web, Evento, Referral...)",
        ]},
        { type: "heading", text: "Calcolo del tasso di conversione" },
        { type: "para", text: "Il tasso di conversione si calcola dividendo i lead con stato CONVERTED per il totale dei lead creati nel periodo. Non esiste ancora un KPI dedicato nella dashboard: puoi calcolarlo manualmente filtrando la lista lead per stato e periodo." },
        { type: "heading", text: "Analisi per fonte" },
        { type: "para", text: "Filtra la lista lead per il campo Fonte per capire quale canale porta i lead più qualificati. Confronta il tasso di conversione per fonte per ottimizzare gli investimenti di marketing." },
        { type: "tip", text: "Il KPI \"tempo medio di qualificazione\" non è disponibile come metrica preconfigurata: puoi stimarlo confrontando la data di creazione con quella di conversione nei record filtrati." },
      ]},
    ],
  },
  {
    id: "attivita",
    label: "Attività & Calendario",
    description: "Pianifica chiamate, email, meeting e follow-up",
    articles: [
      { id: "a1", title: "Creare una nuova attività", excerpt: "Come pianificare una chiamata, un'email, un meeting o un'altra attività.", readTime: 3, popular: true, blocks: [
        { type: "heading", text: "Tipi di attività disponibili" },
        { type: "list", items: [
          "Chiamata — telefonata da effettuare o già effettuata",
          "Email — email da inviare o da registrare nello storico",
          "Meeting — appuntamento o riunione",
          "Task — attività generica da completare",
          "Scadenza — promemoria per una scadenza importante",
        ]},
        { type: "heading", text: "Come creare un'attività" },
        { type: "steps", items: [
          "Vai su Attività nella sidebar oppure apri la scheda di un affare o contatto",
          "Clicca \"Nuova attività\"",
          "Seleziona il tipo di attività",
          "Inserisci titolo, data/ora, responsabile assegnato",
          "Collega un affare e/o un contatto (opzionale ma consigliato)",
          "Aggiungi note se necessario e clicca Crea",
        ]},
        { type: "tip", text: "Creare attività direttamente dalla scheda affare o contatto le collega automaticamente: risparmi un passaggio e lo storico rimane sempre aggiornato." },
      ]},
      { id: "a2", title: "Collegare attività ad affari e contatti", excerpt: "Associa le attività agli affari o ai contatti per tenere traccia dello storico.", readTime: 4, blocks: [
        { type: "heading", text: "Campi di collegamento nel form attività" },
        { type: "para", text: "Nel form di creazione attività trovi il campo \"Deal\" e il campo \"Contatto\". Collegare l'attività a entrambi garantisce che appaia nello storico sia dell'affare che del contatto." },
        { type: "heading", text: "Come funziona lo storico" },
        { type: "list", items: [
          "Scheda affare → tab Attività: mostra tutte le attività collegate a quell'affare",
          "Scheda contatto → tab Attività: mostra tutte le attività collegate a quel contatto",
          "Sezione Attività globale: mostra tutte le attività del team con filtri",
        ]},
        { type: "heading", text: "Modificare i collegamenti" },
        { type: "para", text: "Puoi modificare i campi Deal e Contatto di un'attività già creata aprendo la scheda attività e cliccando Modifica. Il cambio è immediato e lo storico si aggiorna automaticamente." },
        { type: "tip", text: "Per un CRM efficace, ogni chiamata o email con un cliente deve avere un'attività registrata con il deal collegato. Questo costruisce uno storico completo delle interazioni per ogni trattativa." },
      ]},
      { id: "a3", title: "Attività scadute e promemoria", excerpt: "Come ricevere notifiche, gestire le attività in ritardo e ripianificarle.", readTime: 4, blocks: [
        { type: "heading", text: "Badge attività scadute" },
        { type: "para", text: "Nella dashboard trovi il KPI \"Attività scadute\" che mostra il numero di attività con data di scadenza superata e non ancora completate. Il numero è in rosso per attirare l'attenzione." },
        { type: "heading", text: "Come trovare le attività scadute" },
        { type: "steps", items: [
          "Vai su Attività nella sidebar",
          "Usa il filtro \"Scadute\" per mostrare solo le attività in ritardo",
          "Ordina per data crescente per vedere prima le più vecchie",
          "Completa, ripianifica o elimina le attività scadute",
        ]},
        { type: "heading", text: "Notifiche push" },
        { type: "para", text: "Al momento Pipely non invia notifiche push automatiche per le attività in scadenza. Le notifiche push sono in roadmap per Q4 2026." },
        { type: "tip", text: "Controlla le attività scadute ogni mattina dalla dashboard: mantenere questo numero a zero è un buon indicatore di un processo di vendita organizzato." },
      ]},
      { id: "a4", title: "Vista calendario delle attività", excerpt: "Usa la vista giornaliera e settimanale per organizzare il tuo piano di lavoro.", readTime: 3, blocks: [
        { type: "heading", text: "Accedere alla vista calendario" },
        { type: "steps", items: [
          "Vai su Attività nella sidebar",
          "In alto a destra trovi i pulsanti Lista e Calendario",
          "Clicca su Calendario per passare alla vista mensile/settimanale",
        ]},
        { type: "heading", text: "Navigazione nel calendario" },
        { type: "list", items: [
          "Usa le frecce < > per navigare tra i mesi o le settimane",
          "Clicca su un evento nel calendario per aprire il dettaglio dell'attività",
          "Le attività scadute appaiono evidenziate in rosso",
        ]},
        { type: "tip", text: "La vista calendario è utile per pianificare la settimana: ti permette di vedere subito se hai troppe attività concentrate in un giorno e distribuirle meglio." },
      ]},
      { id: "a5", title: "Segnare un'attività come completata", excerpt: "Come chiudere un'attività, aggiungere note e pianificare la prossima azione.", readTime: 2, blocks: [
        { type: "heading", text: "Completare un'attività" },
        { type: "steps", items: [
          "Nella lista attività, spunta il checkbox a sinistra del titolo dell'attività",
          "Oppure apri la scheda attività e clicca il pulsante \"Segna come completata\"",
          "Aggiungi note di completamento per documentare l'esito",
          "Conferma: l'attività passa a stato Completata",
        ]},
        { type: "heading", text: "Pianificare la prossima attività" },
        { type: "para", text: "Dopo aver completato un'attività, è buona pratica pianificare subito la prossima azione. Pipely ti suggerisce di creare una nuova attività immediatamente dopo la chiusura: clicca \"Pianifica follow-up\" nel messaggio di conferma." },
        { type: "tip", text: "Aggiungi sempre una nota di completamento: documenta cosa è emerso dalla chiamata o dall'incontro. Queste note alimentano lo storico dell'affare e aiutano il team a capire lo stato della trattativa." },
      ]},
      { id: "a6", title: "Tipi di attività personalizzati", excerpt: "Crea tipi di attività su misura oltre quelli predefiniti (chiamata, email, meeting).", readTime: 5, blocks: [
        { type: "heading", text: "Tipi predefiniti" },
        { type: "para", text: "Pipely include cinque tipi di attività predefiniti: Chiamata, Email, Meeting, Task e Scadenza. Questi coprono la maggior parte delle esigenze di un processo di vendita standard." },
        { type: "heading", text: "Personalizzazione non ancora disponibile" },
        { type: "para", text: "La creazione di tipi di attività personalizzati non è ancora disponibile. Al momento non puoi aggiungere, rinominare o rimuovere i tipi predefiniti." },
        { type: "list", items: [
          "Tipi personalizzati — in roadmap per una versione futura",
          "Icone personalizzate — in roadmap",
          "Colori per tipo — in roadmap",
        ]},
        { type: "tip", text: "Se hai bisogno di categorizzare ulteriormente le attività, usa il campo Note per specificare il sotto-tipo (es. \"Demo prodotto\" come nota di un Meeting)." },
      ]},
    ],
  },
  {
    id: "email",
    label: "Email & Comunicazioni",
    description: "Integrazione email, template e tracciamento messaggi",
    articles: [
      { id: "em1", title: "Configurare il tuo account email (SMTP wizard)", excerpt: "Usa il wizard in Impostazioni → Email per collegare Gmail, Aruba, Libero o un provider SMTP custom in pochi clic.", readTime: 5, popular: true, blocks: [
        { type: "heading", text: "Perché configurare l'SMTP" },
        { type: "para", text: "Senza SMTP configurato, le email create in Pipely vengono registrate nel CRM ma non recapitate realmente. Con SMTP attivo ogni email parte dalla tua casella di posta." },
        { type: "heading", text: "Provider supportati" },
        { type: "list", items: [
          "Gmail — email Google con App Password dedicata",
          "Aruba — configurazione automatica per domini su Aruba",
          "Libero — configurazione automatica per @libero.it",
          "Custom SMTP — qualsiasi provider con supporto SMTP (Outlook, Yahoo, hosting privato...)",
        ]},
        { type: "heading", text: "Come configurare Gmail" },
        { type: "steps", items: [
          "Vai su Impostazioni → Email",
          "Seleziona Gmail come provider",
          "Inserisci la tua email Gmail",
          "Per la password devi usare un'App Password (non la password Gmail normale)",
          "Vai su myaccount.google.com → Sicurezza → Verifica in due passaggi → App password",
          "Crea una nuova App Password per \"Pipely\" e copiala",
          "Incollala nel campo password e clicca \"Testa connessione\"",
        ]},
        { type: "warning", text: "Gmail richiede la verifica in due passaggi attiva per poter creare un'App Password. Abilitala prima di procedere." },
        { type: "heading", text: "Come configurare Aruba o Libero" },
        { type: "para", text: "Seleziona il provider nel wizard: host, porta e protocollo vengono precompilati automaticamente. Inserisci solo email e password del tuo account." },
        { type: "tip", text: "Le credenziali vengono cifrate con AES-256 prima di essere salvate nel database. La password non viene mai memorizzata in chiaro." },
      ]},
      { id: "em2", title: "Configurare Gmail con App Password", excerpt: "Gmail richiede una App Password dedicata (non la password principale). Guida passo-passo con link alla pagina Google.", readTime: 4, blocks: [
        { type: "heading", text: "Perché serve un'App Password" },
        { type: "para", text: "Google non consente di usare la password principale dell'account per applicazioni di terze parti con SMTP. Per motivi di sicurezza devi creare un'App Password dedicata, che può essere revocata in qualsiasi momento senza cambiare la password principale." },
        { type: "heading", text: "Prerequisito: Verifica in 2 passaggi" },
        { type: "para", text: "Le App Password sono disponibili solo se hai attivato la Verifica in due passaggi sul tuo account Google. Se non è ancora attiva, abilitala prima di procedere." },
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
      { id: "em3", title: "Configurare Aruba o Libero come provider SMTP", excerpt: "Impostazioni host, porta e crittografia per i provider italiani più diffusi.", readTime: 3, blocks: [
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
      { id: "em4", title: "Creare template email riutilizzabili", excerpt: "Risparmia tempo con modelli predefiniti per i messaggi più frequenti.", readTime: 5, blocks: [
        { type: "heading", text: "Dove si trovano i template" },
        { type: "steps", items: [
          "Vai su Email → Template nella sidebar",
          "Clicca \"Nuovo template\"",
          "Inserisci il nome del template (uso interno, non visibile al destinatario)",
          "Inserisci oggetto e corpo del messaggio",
          "Usa le variabili dinamiche per personalizzare il testo",
          "Salva il template",
        ]},
        { type: "heading", text: "Variabili supportate nei template" },
        { type: "list", items: [
          "{{nome}} — nome del contatto destinatario",
          "{{cognome}} — cognome del contatto",
          "{{email}} — indirizzo email del contatto",
        ]},
        { type: "heading", text: "Usare un template" },
        { type: "para", text: "Quando invii un'email da una scheda contatto o affare, clicca \"Seleziona template\" nel form: il corpo e l'oggetto vengono precompilati automaticamente, pronti per eventuali personalizzazioni finali." },
        { type: "tip", text: "Crea template per i messaggi più frequenti: follow-up dopo una chiamata, presentazione commerciale, promemoria offerta in scadenza. Risparmia minuti preziosi ogni giorno." },
      ]},
      { id: "em5", title: "Inviare email direttamente da Pipely", excerpt: "Scrivi e invia email ai contatti senza uscire dal CRM, con storico completo.", readTime: 4, blocks: [
        { type: "heading", text: "Prerequisito" },
        { type: "para", text: "Per inviare email reali è necessario avere un account SMTP configurato in Impostazioni → Email. Senza SMTP le email vengono registrate nel CRM ma non recapitate al destinatario." },
        { type: "heading", text: "Inviare da una scheda contatto" },
        { type: "steps", items: [
          "Apri la scheda del contatto",
          "Clicca sul pulsante \"Invia email\"",
          "Seleziona un template esistente oppure scrivi il messaggio da zero",
          "Verifica oggetto e destinatario",
          "Clicca Invia",
        ]},
        { type: "heading", text: "Inviare da una scheda affare" },
        { type: "para", text: "Apri la scheda affare → tab Email → Nuova email. L'email viene inviata al contatto collegato all'affare e registrata sia nello storico del contatto che in quello dell'affare." },
        { type: "tip", text: "Ogni email inviata da Pipely viene automaticamente salvata nello storico del contatto con data, oggetto e corpo del messaggio. Utile per avere un registro completo delle comunicazioni." },
      ]},
      { id: "em6", title: "Sicurezza: come vengono protette le credenziali SMTP", excerpt: "Le password SMTP sono cifrate con AES-256 e non vengono mai salvate in chiaro nel database.", readTime: 3, blocks: [
        { type: "heading", text: "Cifratura delle credenziali" },
        { type: "para", text: "Quando inserisci la password SMTP nel wizard, Pipely la cifra con l'algoritmo AES-256-CBC prima di salvarla nel database. La chiave di cifratura non è mai memorizzata nel database ma è configurata come variabile d'ambiente sul server." },
        { type: "heading", text: "Cosa significa in pratica" },
        { type: "list", items: [
          "La password non è mai visibile in chiaro, nemmeno agli amministratori del sistema",
          "In caso di accesso non autorizzato al database, le credenziali risultano illeggibili senza la chiave di cifratura",
          "La chiave AES è separata dai dati: massima protezione anche in caso di violazione del DB",
        ]},
        { type: "heading", text: "Variabile d'ambiente SMTP_ENCRYPTION_KEY" },
        { type: "para", text: "Per le installazioni self-hosted o Enterprise, la chiave di cifratura è configurata tramite la variabile d'ambiente SMTP_ENCRYPTION_KEY. Assicurati di conservarla in modo sicuro e separato dal database." },
        { type: "tip", text: "Per massima sicurezza, usa sempre un'App Password dedicata a Pipely (non la password principale dell'account email). Così puoi revocarla in qualsiasi momento senza impatti su altri servizi." },
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
          "Vai su Email → Liste nella sidebar",
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
      { id: "ca2", title: "Aggiungere contatti a una lista: inserimento manuale", excerpt: "Incolla una o più email nel campo testo per aggiungerle rapidamente alla lista.", readTime: 2, blocks: [
        { type: "heading", text: "Come aggiungere contatti manualmente" },
        { type: "steps", items: [
          "Apri la lista email a cui vuoi aggiungere contatti",
          "Clicca il pulsante \"Aggiungi contatti\"",
          "Nel campo testo, incolla le email: una per riga oppure separate da virgola",
          "Clicca Aggiungi",
          "La lista si aggiorna in tempo reale mostrando il nuovo totale contatti",
        ]},
        { type: "heading", text: "Gestione duplicati" },
        { type: "para", text: "Se un'email è già presente nella lista, viene ignorata silenziosamente: non viene aggiunta di nuovo e non viene mostrato un errore. Puoi incollare liberamente anche liste già parzialmente presenti." },
        { type: "tip", text: "L'inserimento manuale è ideale per aggiungere pochi contatti alla volta. Per importazioni di massa usa il caricamento CSV." },
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
          "Apri la lista → clicca \"Importa da file\"",
          "Trascina il file nell'area di upload o clicca per selezionarlo",
          "Pipely analizza il file e mostra un'anteprima",
          "Clicca Importa per avviare il processo",
          "Al termine viene mostrato il feedback: N contatti aggiunti, M già presenti",
        ]},
        { type: "tip", text: "I duplicati (email già presenti nella lista) vengono gestiti automaticamente: non vengono aggiunti di nuovo e il conteggio finale riflette solo le email effettivamente nuove." },
      ]},
      { id: "ca4", title: "Creare e inviare una campagna email", excerpt: "Scegli la lista, imposta oggetto, mittente e corpo del messaggio, poi invia subito o pianifica.", readTime: 5, popular: true, blocks: [
        { type: "heading", text: "Prerequisiti" },
        { type: "list", items: [
          "Account SMTP configurato in Impostazioni → Email",
          "Almeno una lista email con contatti",
        ]},
        { type: "heading", text: "Creare la campagna" },
        { type: "steps", items: [
          "Vai su Email → Campagne",
          "Clicca \"Nuova campagna\"",
          "Seleziona la lista di destinatari",
          "Inserisci nome mittente e oggetto dell'email",
          "Scrivi il corpo del messaggio — puoi usare le variabili {{nome}}, {{cognome}}, {{email}}",
          "Facoltativamente imposta una data/ora di invio programmato",
          "Clicca Crea campagna",
        ]},
        { type: "heading", text: "Variabili dinamiche" },
        { type: "list", items: [
          "{{nome}} — sostituito con il nome del contatto",
          "{{cognome}} — sostituito con il cognome",
          "{{email}} — sostituito con l'indirizzo email",
        ]},
        { type: "heading", text: "Inviare la campagna" },
        { type: "para", text: "Nella lista campagne trova la campagna con stato BOZZA e clicca Invia ora. Pipely invia a ogni contatto non disiscritto della lista e aggiorna lo stato in INVIATA." },
        { type: "heading", text: "Statistiche" },
        { type: "para", text: "Dopo l'invio puoi vedere: email consegnate, aperture (tramite pixel di tracciamento 1×1 px) e click (ogni link viene reindirizzato attraverso un URL di tracciamento)." },
        { type: "tip", text: "Alcuni client email bloccano le immagini remote: in quei casi l'apertura non viene rilevata. I click sui link sono invece sempre tracciati con precisione." },
      ]},
      { id: "ca5", title: "Personalizzare il messaggio con variabili dinamiche", excerpt: "Usa {{nome}}, {{cognome}} e {{email}} per personalizzare ogni email con i dati del destinatario.", readTime: 3, blocks: [
        { type: "heading", text: "Variabili disponibili" },
        { type: "list", items: [
          "{{nome}} — sostituito con il nome del contatto destinatario",
          "{{cognome}} — sostituito con il cognome",
          "{{email}} — sostituito con l'indirizzo email del contatto",
        ]},
        { type: "heading", text: "Come usare le variabili" },
        { type: "para", text: "Inserisci le variabili nel corpo del messaggio o nell'oggetto della campagna direttamente nel testo, tra doppie parentesi graffe. La sostituzione avviene al momento dell'invio, per ogni destinatario della lista." },
        { type: "heading", text: "Gestione valori mancanti" },
        { type: "para", text: "Se per un contatto il campo corrispondente alla variabile è vuoto (es. manca il nome), la variabile viene sostituita con una stringa vuota. Controlla la qualità dei dati nella lista prima dell'invio per evitare email come \"Ciao ,\"." },
        { type: "tip", text: "Esempio: \"Ciao {{nome}}, ti contatto riguardo alla tua richiesta...\" — ogni destinatario riceverà l'email con il proprio nome al posto della variabile." },
      ]},
      { id: "ca6", title: "Monitorare aperture e click della campagna", excerpt: "Ogni email contiene un pixel di tracciamento e link con redirect. Dopo l'invio vedi quante email sono state aperte e quanti link cliccati.", readTime: 3, blocks: [
        { type: "heading", text: "Come funziona il tracciamento" },
        { type: "list", items: [
          "Aperture: ogni email inviata contiene un pixel di tracciamento 1×1 px invisibile. Quando il destinatario apre l'email e carica le immagini, il pixel viene richiesto al server Pipely registrando l'apertura.",
          "Click: ogni link nel corpo dell'email viene reindirizzato attraverso un URL di tracciamento Pipely. Quando il destinatario clicca, il server registra il click e poi reindirizza all'URL originale.",
        ]},
        { type: "heading", text: "Dove vedere le statistiche" },
        { type: "steps", items: [
          "Vai su Email → Campagne",
          "Apri la campagna con stato INVIATA",
          "Nella scheda trovi i contatori: Email consegnate, Aperture, Click",
        ]},
        { type: "warning", text: "Alcuni client email bloccano il caricamento delle immagini remote: in quei casi l'apertura non viene rilevata anche se l'email è stata letta. I click sui link sono invece sempre tracciati con precisione." },
        { type: "tip", text: "Un buon tasso di apertura per campagne B2B è tra il 20% e il 30%. Se scende sotto il 15%, considera di rivedere oggetto e orario di invio." },
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
          "Affari aperti — numero totale di trattative attive nella pipeline",
          "Valore pipeline — somma del valore di tutti gli affari aperti",
          "Revenue vinta (30 gg) — totale degli affari chiusi come Vinti nel periodo selezionato",
          "Win rate — percentuale affari vinti / (vinti + persi)",
          "Previsione ponderata — stima fatturato = Σ (valore affare × probabilità stage)",
          "Attività scadute — attività con data superata non ancora completate",
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
        { type: "para", text: "Il grafico funnel mostra quanti affari e quale valore si trovano in ogni stage della pipeline. Ogni barra rappresenta uno stage: più è larga, più affari o valore si trovano in quello stage." },
        { type: "heading", text: "Identificare i colli di bottiglia" },
        { type: "list", items: [
          "Molti affari fermi nello stesso stage indica un problema in quel passaggio del processo",
          "Es. molti affari in \"Proposta inviata\" → i clienti non rispondono → serve follow-up",
          "Es. pochi affari in \"Negoziazione\" → le proposte non vengono accettate → rivedi il pricing",
        ]},
        { type: "heading", text: "Tasso di conversione stage by stage" },
        { type: "para", text: "Il tasso di conversione tra stage A e stage B si calcola dividendo gli affari che passano da A a B per il totale di quelli che entrano in A. Un calo brusco tra due stage indica dove si perdono più opportunità." },
        { type: "tip", text: "Confronta il funnel in periodi diversi per vedere se le azioni correttive hanno portato miglioramenti. Usa il selettore periodo per cambiare l'intervallo di analisi." },
      ]},
      { id: "r3", title: "Report trend: vinti vs persi negli ultimi 6 mesi", excerpt: "Leggi il grafico andamento e confronta i periodi per valutare la crescita.", readTime: 4, blocks: [
        { type: "heading", text: "Il grafico trend" },
        { type: "para", text: "Il grafico a linee mostra l'andamento degli affari vinti e persi mese per mese negli ultimi 6 mesi. Le due linee consentono di visualizzare immediatamente se il numero di vinti cresce o scende rispetto ai persi." },
        { type: "heading", text: "Come interpretare il grafico" },
        { type: "list", items: [
          "Linea vinti che sale → miglioramento del processo di vendita",
          "Linea persi che sale → aumentano le trattative perse, analizza i motivi",
          "Stagionalità: picchi o cali ricorrenti nello stesso mese dell'anno indicano effetti stagionali",
        ]},
        { type: "heading", text: "Revenue vinta e periodo" },
        { type: "para", text: "Il KPI Revenue vinta riportato in dashboard considera solo il periodo selezionato in alto nella pagina Report. Cambia il periodo per vedere la revenue su 7 giorni, 30 giorni, 90 giorni o 12 mesi." },
        { type: "tip", text: "Esporta i dati in CSV per analisi più approfondite su Excel o Google Sheets, dove puoi creare pivot e grafici personalizzati." },
      ]},
      { id: "r4", title: "Top performer del team", excerpt: "Classifica i venditori per revenue generata, affari vinti e tasso di conversione.", readTime: 3, blocks: [
        { type: "heading", text: "Dove trovare il report" },
        { type: "para", text: "Vai su Report nella sidebar. Il pannello Top performer mostra una tabella con i membri del team ordinati per performance nel periodo selezionato." },
        { type: "heading", text: "Metriche per venditore" },
        { type: "list", items: [
          "Revenue generata — somma del valore degli affari vinti",
          "Affari vinti — numero di trattative chiuse con successo",
          "Win rate — percentuale affari vinti / (vinti + persi) per quel venditore",
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
        { type: "warning", text: "I campi personalizzati non sono ancora inclusi nell'export CSV. Questa funzionalità è in roadmap per una versione futura." },
        { type: "tip", text: "L'export CSV è lo strumento principale per fare analisi avanzate in Excel o Google Sheets, creare report personalizzati o eseguire backup dei tuoi dati." },
      ]},
      { id: "r6", title: "Filtrare i report per periodo", excerpt: "Confronta le performance su 7 giorni, 30 giorni, 90 giorni o 12 mesi.", readTime: 2, blocks: [
        { type: "heading", text: "Il selettore periodo" },
        { type: "para", text: "In alto nella pagina Report trovi un selettore che permette di scegliere il periodo di analisi. Ogni cambio aggiorna istantaneamente tutti i KPI e i grafici della pagina." },
        { type: "heading", text: "Periodi disponibili" },
        { type: "list", items: [
          "7 giorni — ultima settimana, utile per monitoraggio quotidiano",
          "30 giorni — ultimo mese, il periodo più usato per review mensili",
          "90 giorni — ultimo trimestre, per analisi trimestrali",
          "12 mesi — ultimo anno, per visione strategica e analisi stagionali",
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
      { id: "au1", title: "Cos'è un'automazione in Pipely", excerpt: "Introduzione ai workflow automatici: trigger, condizioni e azioni disponibili.", readTime: 5, blocks: [
        { type: "heading", text: "Cos'è un workflow" },
        { type: "para", text: "Un'automazione in Pipely è una regola trigger → azione: quando accade un evento specifico (trigger), Pipely esegue automaticamente un'azione predefinita. Non richiede alcuna competenza di programmazione." },
        { type: "heading", text: "Struttura di un workflow" },
        { type: "list", items: [
          "Trigger — l'evento che attiva il workflow (es. affare creato, lead convertito)",
          "Azione — cosa viene eseguito automaticamente (es. invia email, crea attività, invia notifica)",
        ]},
        { type: "heading", text: "Dove trovare le automazioni" },
        { type: "para", text: "Vai su Automazioni nella sidebar. Ogni workflow è elencato con nome, stato (attivo/inattivo) e un toggle verde/grigio per abilitarlo o disabilitarlo. Il log delle esecuzioni è visibile aprendo il singolo workflow." },
        { type: "list", items: [
          "Workflow attivi — toggle verde: vengono eseguiti ad ogni trigger",
          "Workflow inattivi — toggle grigio: non vengono eseguiti, utili per testare prima di attivare",
        ]},
        { type: "tip", text: "Inizia con automazioni semplici (un trigger, un'azione). Aggiungine di più complesse man mano che prendi confidenza con lo strumento e verifichi il log delle esecuzioni." },
      ]},
      { id: "au2", title: "Creare la tua prima automazione", excerpt: "Guida passo-passo alla creazione di un workflow per automatizzare i follow-up.", readTime: 7, popular: true, blocks: [
        { type: "heading", text: "Cosa sono le automazioni" },
        { type: "para", text: "Un'automazione (workflow) è una regola trigger-action: quando accade un evento (trigger), Pipely esegue automaticamente un'azione, senza intervento manuale." },
        { type: "heading", text: "Esempi pratici" },
        { type: "list", items: [
          "Quando un affare cambia stage → invia email di follow-up al contatto",
          "Quando un lead viene creato → crea un'attività di richiamo per il responsabile",
          "Quando un affare viene vinto → invia notifica al team commerciale",
          "Quando un'attività scade → promemoria automatico via notifica",
        ]},
        { type: "heading", text: "Creare un workflow" },
        { type: "steps", items: [
          "Vai su Automazioni nella sidebar",
          "Clicca \"Nuova automazione\"",
          "Scegli il trigger: l'evento che avvia il workflow",
          "Configura eventuali condizioni (es. solo se valore affare > 1000€)",
          "Aggiungi l'azione da eseguire (email, notifica, crea attività...)",
          "Attiva il workflow con il toggle ON/OFF",
        ]},
        { type: "heading", text: "Trigger disponibili" },
        { type: "list", items: [
          "Affare: creato, cambiato stage, vinto, perso",
          "Contatto: creato, modificato",
          "Attività: completata, scaduta",
          "Lead: creato, convertito",
        ]},
        { type: "tip", text: "Inizia con automazioni semplici (un trigger, un'azione) e aggiungine di più complesse man mano che prendi confidenza con lo strumento." },
      ]},
      { id: "au3", title: "Automazioni per il follow-up dopo una chiamata", excerpt: "Invia automaticamente un'email o crea un'attività dopo ogni chiamata completata.", readTime: 5, blocks: [
        { type: "heading", text: "Scenario: follow-up automatico dopo una chiamata" },
        { type: "para", text: "Ogni volta che un commerciale completa un'attività di tipo Chiamata, Pipely invia automaticamente un'email di follow-up al contatto collegato all'affare." },
        { type: "heading", text: "Come configurare il workflow" },
        { type: "steps", items: [
          "Vai su Automazioni → Nuova automazione",
          "Trigger: seleziona \"Attività completata\"",
          "Condizione: tipo attività = Chiamata",
          "Azione: seleziona \"Invia email\" al contatto collegato all'affare",
          "Personalizza oggetto e corpo con le variabili {{nome}}, {{cognome}}",
          "Attiva il workflow con il toggle",
        ]},
        { type: "heading", text: "Esempio di messaggio" },
        { type: "para", text: "Oggetto: \"Riepilogo della nostra chiamata, {{nome}}\" — Corpo: \"Grazie per la chiamata di oggi. Come concordato, ti invio il materiale richiesto...\"" },
        { type: "tip", text: "Aggiungi anche un'azione \"Crea attività\" (tipo Task) per ricordare al responsabile di fare un follow-up dopo 3 giorni se il cliente non risponde." },
      ]},
      { id: "au4", title: "Notifiche automatiche al team", excerpt: "Avvisa i colleghi quando un affare cambia stage o raggiunge un valore soglia.", readTime: 4, blocks: [
        { type: "heading", text: "Quando usare le notifiche automatiche" },
        { type: "para", text: "Le notifiche in-app tengono il team allineato sulle trattative importanti senza che nessuno debba monitorare manualmente la pipeline. Utile per manager che vogliono essere avvisati sugli sviluppi chiave." },
        { type: "heading", text: "Come configurare" },
        { type: "steps", items: [
          "Vai su Automazioni → Nuova automazione",
          "Trigger: \"Affare cambiato stage\" oppure \"Affare vinto\"",
          "Azione: \"Invia notifica in-app\"",
          "Destinatario: il responsabile dell'affare oppure un membro specifico del team",
          "Personalizza il messaggio della notifica",
          "Attiva il workflow",
        ]},
        { type: "list", items: [
          "Affare vinto → notifica al manager con valore e nome del cliente",
          "Affare arrivato in Negoziazione → notifica al responsabile commerciale",
        ]},
        { type: "tip", text: "Le notifiche in-app appaiono come badge nella sidebar di Pipely. Non vengono inviate via email o push al momento: per aggiornamenti su queste funzionalità consulta la roadmap." },
      ]},
      { id: "au5", title: "Automazioni per i lead in entrata", excerpt: "Assegna automaticamente i lead ai responsabili in base a regole personalizzate.", readTime: 5, blocks: [
        { type: "heading", text: "Automatizzare la gestione dei lead in entrata" },
        { type: "para", text: "Quando arriva un nuovo lead, è fondamentale rispondere rapidamente. Con un'automazione puoi creare automaticamente un'attività di qualificazione assegnata al responsabile giusto." },
        { type: "heading", text: "Workflow 1: crea attività di chiamata" },
        { type: "steps", items: [
          "Trigger: \"Lead creato\"",
          "Azione: \"Crea attività\" di tipo Chiamata",
          "Titolo: \"Chiamata di qualificazione — {{nome}}\"",
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
        { type: "tip", text: "Combina entrambi i workflow: email di benvenuto immediata per il lead, e attività di follow-up per il commerciale. Il lead si sente seguito e il team ha un promemoria chiaro." },
      ]},
      { id: "au6", title: "Monitorare e debuggare le automazioni", excerpt: "Come visualizzare la cronologia di esecuzione e risolvere gli errori.", readTime: 4, blocks: [
        { type: "heading", text: "Il tab Log del workflow" },
        { type: "para", text: "Ogni workflow dispone di un tab Log che mostra l'elenco delle ultime esecuzioni con data, entità coinvolta (es. nome dell'affare) e stato: SUCCESS o FAILED." },
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
          "SMTP non configurato → l'azione \"Invia email\" fallisce: configura SMTP in Impostazioni → Email",
          "Contatto senza email → l'invio non riesce: verifica che il contatto abbia un'email valida",
          "Workflow disattivato → le esecuzioni non partono: controlla il toggle ON/OFF",
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
      { id: "pr1", title: "Aggiungere prodotti al catalogo", excerpt: "Come creare schede prodotto con nome, codice, prezzo, IVA e tipo di fatturazione (una tantum, abbonamento, noleggio, affitto o personalizzato).", readTime: 3, popular: true, blocks: [
        { type: "heading", text: "Creare una scheda prodotto" },
        { type: "steps", items: [
          "Vai su Prodotti nella sidebar",
          "Clicca \"Nuovo prodotto\"",
          "Inserisci nome, codice e unità di misura",
          "Scegli la categoria (Software, SaaS, Sito Web, Agente AI, Hardware, Servizi, Altro)",
          "Imposta il prezzo e l'aliquota IVA",
          "Scegli il tipo di fatturazione dalla griglia delle card (es. Una tantum, Mensile, Noleggio mensile)",
          "Clicca Crea prodotto",
        ]},
        { type: "heading", text: "Tipi di fatturazione disponibili" },
        { type: "list", items: [
          "Una tantum — pagamento singolo, nessuna ricorrenza",
          "Mensile / Annuale — abbonamento con rinnovo periodico",
          "Noleggio mensile / Noleggio annuale — canone di noleggio",
          "Affitto mensile / Affitto annuale — canone di affitto",
          "Personalizzati — tipi definiti dall'organizzazione in Impostazioni → Prezzi",
        ]},
        { type: "heading", text: "Collegare prodotti agli affari" },
        { type: "para", text: "Apri la scheda di un affare e trova la sezione Prodotti. Clicca Aggiungi prodotto, cerca nel catalogo, imposta quantità e sconto. Il valore dell'affare si aggiorna automaticamente." },
        { type: "tip", text: "Per aggiungere tipi di fatturazione personalizzati (es. Leasing trimestrale, Canone semestrale) vai su Impostazioni → Prezzi." },
      ]},
      { id: "pr2", title: "Associare prodotti agli affari", excerpt: "Aggiungi prodotti o servizi a un affare per calcolare il valore totale.", readTime: 4, blocks: [
        { type: "heading", text: "Come associare un prodotto" },
        { type: "steps", items: [
          "Apri la scheda dell'affare",
          "Scorri fino alla sezione \"Prodotti\"",
          "Clicca \"Aggiungi prodotto\"",
          "Cerca il prodotto nel catalogo digitando il nome",
          "Seleziona il prodotto e imposta quantità e sconto",
          "Il valore totale dell'affare si aggiorna automaticamente",
        ]},
        { type: "heading", text: "Aggiungere più prodotti" },
        { type: "para", text: "Puoi aggiungere quanti prodotti vuoi a un singolo affare. Ogni riga è indipendente: ogni prodotto ha la propria quantità, sconto e IVA. Il totale affare è la somma di tutte le righe." },
        { type: "tip", text: "Se un prodotto non è ancora nel catalogo, crealo prima da Prodotti → Nuovo prodotto, poi torna nell'affare per aggiungerlo." },
      ]},
      { id: "pr3", title: "Gestire quantità, sconti e IVA", excerpt: "Imposta quantità, percentuale di sconto e aliquota IVA per ogni riga prodotto.", readTime: 4, blocks: [
        { type: "heading", text: "Campi di ogni riga prodotto" },
        { type: "list", items: [
          "Quantità — numero di unità (i decimali sono supportati, es. 2.5 ore)",
          "Sconto — percentuale di sconto applicata al prezzo (es. 10%)",
          "IVA — aliquota IVA applicata al prezzo (es. 22%)",
        ]},
        { type: "heading", text: "Formula di calcolo" },
        { type: "para", text: "Totale riga = Prezzo × Quantità × (1 - Sconto%). L'IVA è indicativa e mostrata separatamente. Il valore dell'affare visualizzato in pipeline è il totale al netto dell'IVA." },
        { type: "heading", text: "Esempio pratico" },
        { type: "para", text: "Prodotto: €100, Quantità: 3, Sconto: 10% → Totale = 100 × 3 × 0.9 = €270. Con IVA 22%: imponibile €270, IVA €59,40, totale lordo €329,40." },
        { type: "tip", text: "Lo sconto a percentuale è l'unica modalità disponibile. Se hai uno sconto a valore fisso (es. -50€), convertilo in percentuale prima di inserirlo." },
      ]},
      { id: "pr4", title: "Categorie e unità di misura", excerpt: "Organizza il catalogo per categorie: Software, SaaS, Sito Web, Agente AI, Hardware, Servizi, Consulenza, Formazione, Altro.", readTime: 3, blocks: [
        { type: "heading", text: "Categorie disponibili" },
        { type: "list", items: [
          "Software — applicazioni desktop o on-premise",
          "SaaS — servizi cloud con abbonamento",
          "Sito Web — sviluppo o manutenzione siti",
          "Agente AI — soluzioni di intelligenza artificiale",
          "Hardware — prodotti fisici e dispositivi",
          "Servizi — prestazioni professionali generiche",
          "Consulenza — attività di advisory e strategia",
          "Formazione — corsi, workshop e training",
          "Altro — tutto ciò che non rientra nelle categorie precedenti",
        ]},
        { type: "heading", text: "A cosa servono le categorie" },
        { type: "para", text: "Le categorie aiutano a filtrare il catalogo prodotti e a generare report di vendita suddivisi per tipologia. Scegliere la categoria corretta permette di analizzare quale tipo di prodotto contribuisce di più alla revenue." },
        { type: "tip", text: "Non sono disponibili categorie personalizzate: usa Altro per prodotti non classificabili nelle categorie esistenti." },
      ]},
      { id: "pr5", title: "Prezzi in valute diverse", excerpt: "Supporto multi-valuta: come impostare prezzi in EUR, USD e altre valute.", readTime: 4, blocks: [
        { type: "heading", text: "Valuta dell'organizzazione" },
        { type: "para", text: "Il prezzo di ogni prodotto è inserito nella valuta predefinita dell'organizzazione. Tutti i calcoli e i report utilizzano la stessa valuta: non è prevista conversione automatica." },
        { type: "heading", text: "Multi-valuta non ancora supportata" },
        { type: "para", text: "Pipely non supporta ancora la gestione multi-valuta nativa. Non è possibile impostare prezzi in valute diverse sulla stessa scheda prodotto." },
        { type: "heading", text: "Workaround consigliato" },
        { type: "list", items: [
          "Crea varianti dello stesso prodotto con prezzi in valute diverse (es. \"Piano Pro - EUR\" e \"Piano Pro - USD\")",
          "Usa la categoria per distinguere le varianti",
          "Applica la variante corretta in base alla valuta dell'affare",
        ]},
        { type: "tip", text: "Il supporto multi-valuta nativo è in roadmap. Se questo è un requisito critico per il tuo business, contatta il supporto per essere aggiornato sui tempi." },
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
      { id: "pr7", title: "Tipi di fatturazione personalizzati", excerpt: "Crea tipi di pagamento su misura (es. Leasing trimestrale, Canone semestrale) oltre ai 7 predefiniti.", readTime: 3, blocks: [
        { type: "heading", text: "Tipi predefiniti" },
        { type: "para", text: "Pipely include 7 tipi di fatturazione pronti all'uso: Una tantum, Mensile, Annuale, Noleggio mensile, Noleggio annuale, Affitto mensile, Affitto annuale. Non possono essere rimossi." },
        { type: "heading", text: "Aggiungere un tipo personalizzato" },
        { type: "steps", items: [
          "Vai su Impostazioni → Prezzi",
          "Nella sezione \"Tipi personalizzati\" clicca \"Aggiungi tipo\"",
          "Inserisci il nome del tipo (es. \"Leasing trimestrale\")",
          "Opzionale: inserisci la descrizione del periodo (es. \"ogni 3 mesi\")",
          "Clicca \"Aggiungi tipo\" — il tipo è subito disponibile in tutti i form prodotto",
        ]},
        { type: "heading", text: "Come appare nel form prodotto" },
        { type: "para", text: "Quando crei o modifichi un prodotto, i tipi personalizzati appaiono in fondo alla griglia dei tipi di fatturazione, esattamente come i tipi predefiniti." },
        { type: "tip", text: "I tipi personalizzati sono ricorrenti per default: il prodotto verrà marcato come abbonamento ricorrente con il periodo che hai specificato." },
      ]},
      { id: "pr8", title: "Categorie prodotto personalizzate", excerpt: "Aggiungi categorie su misura (es. Formazione, Energia, Consulenza AI) oltre alle 9 predefinite.", readTime: 2, blocks: [
        { type: "heading", text: "Categorie predefinite (non rimovibili)" },
        { type: "list", items: [
          "Software, Hardware, Servizio, Supporto, Licenza, SaaS, Sito Web, Agenti AI, Altro",
        ]},
        { type: "heading", text: "Aggiungere una categoria personalizzata" },
        { type: "steps", items: [
          "Vai su Impostazioni → Prezzi",
          "Nella sezione \"Categorie prodotto\" digita il nome della nuova categoria",
          "Premi Invio o clicca il pulsante +",
          "La categoria appare subito nel form di creazione prodotto",
        ]},
        { type: "heading", text: "Come appaiono nel catalogo" },
        { type: "para", text: "Le categorie personalizzate sono selezionabili nella griglia categoria del form prodotto, esattamente come le predefinite. Nella tabella prodotti appaiono con un badge colorato." },
        { type: "tip", text: "Per rimuovere una categoria personalizzata clicca l'icona cestino accanto al chip. Attenzione: i prodotti già associati a quella categoria la mantengono nel database — cambierà solo la visualizzazione del label." },
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
          "Email — non modificabile: è usata per l'autenticazione e non può essere cambiata",
          "Foto profilo — si imposta collegando l'account Google (avatar Google Account)",
          "Password — modificabile solo se usi email+password (non Google OAuth)",
        ]},
        { type: "tip", text: "Il nome visualizzato appare nelle attività, negli affari assegnati e nelle notifiche al team. Usa il tuo nome reale per facilitare la collaborazione." },
      ]},
      { id: "im2", title: "Gestire i membri del team", excerpt: "Invita nuovi utenti, modifica i ruoli e rimuovi accessi.", readTime: 5, blocks: [
        { type: "heading", text: "Dove gestire il team" },
        { type: "para", text: "Vai su Impostazioni → Team per vedere l'elenco completo dei membri con ruolo e data di iscrizione." },
        { type: "heading", text: "Invitare un nuovo membro" },
        { type: "steps", items: [
          "Clicca \"Invita membro\"",
          "Inserisci l'email del collega",
          "Scegli il ruolo appropriato (SALES, MANAGER, ADMIN...)",
          "Clicca Invia invito: il collega riceve un'email con il link di accesso",
        ]},
        { type: "heading", text: "Rimuovere un membro" },
        { type: "steps", items: [
          "Nella lista team, clicca i tre puntini (⋯) accanto al nome del membro",
          "Seleziona \"Rimuovi dal team\"",
          "Conferma: il membro perde immediatamente l'accesso a Pipely",
        ]},
        { type: "tip", text: "Prima di rimuovere un membro, riassegna i suoi affari e attività aperti a un altro responsabile per non perdere la continuità nelle trattative." },
      ]},
      { id: "im3", title: "Personalizzare la pipeline", excerpt: "Aggiungi, rinomina o riordina gli stage della tua pipeline di vendita.", readTime: 4, popular: true, blocks: [
        { type: "heading", text: "Accedere alle impostazioni pipeline" },
        { type: "steps", items: [
          "Vai su Impostazioni → Pipeline",
          "Seleziona la pipeline da modificare",
          "Da qui puoi aggiungere, rinominare, riordinare ed eliminare gli stage",
        ]},
        { type: "heading", text: "Operazioni disponibili" },
        { type: "list", items: [
          "Aggiungi stage — clicca + per aggiungere uno stage alla fine",
          "Rinomina — clicca sul nome dello stage per modificarlo",
          "Riordina — trascina con il drag handle per cambiare la posizione",
          "Probabilità — imposta la % per la previsione ponderata",
          "Elimina — disponibile solo se lo stage è vuoto (nessun affare)",
        ]},
        { type: "warning", text: "Non puoi eliminare uno stage che contiene affari. Sposta prima tutti gli affari in un altro stage, poi potrai eliminarlo." },
        { type: "tip", text: "Imposta con cura la probabilità di ogni stage: viene usata per calcolare la previsione ponderata in dashboard e nei report di forecast." },
      ]},
      { id: "im4", title: "Impostazioni di notifica", excerpt: "Configura email, push e alert in-app per gli eventi importanti.", readTime: 4, blocks: [
        { type: "heading", text: "Notifiche disponibili" },
        { type: "para", text: "Al momento Pipely supporta solo notifiche in-app: appaiono come badge nella sidebar e nella campana delle notifiche. Non sono disponibili notifiche via email o push mobile." },
        { type: "heading", text: "Tipi di notifiche in-app" },
        { type: "list", items: [
          "Affare assegnato a te",
          "Attività in scadenza (visibile in dashboard come KPI)",
          "Notifiche da workflow automatici",
        ]},
        { type: "heading", text: "Funzionalità in roadmap" },
        { type: "list", items: [
          "Email di notifica per eventi chiave (previsto Q4 2026)",
          "Notifiche push mobile via PWA (previsto Q4 2026)",
          "Personalizzazione degli eventi notificati",
        ]},
        { type: "tip", text: "Controlla le attività scadute ogni mattina dalla dashboard: il KPI \"Attività scadute\" è il modo più rapido per non perdere follow-up importanti." },
      ]},
      { id: "im5", title: "Campi personalizzati globali", excerpt: "Crea campi aggiuntivi per affari, contatti e aziende a livello di organizzazione.", readTime: 6, blocks: [
        { type: "heading", text: "Creare un campo personalizzato" },
        { type: "steps", items: [
          "Vai su Impostazioni → Campi personalizzati",
          "Scegli l'entità: Affare, Contatto o Azienda",
          "Clicca \"Aggiungi campo\"",
          "Inserisci il nome e scegli il tipo",
          "Salva: il campo appare in tutte le schede dell'entità scelta per tutti i membri del team",
        ]},
        { type: "heading", text: "Tipi di campo disponibili" },
        { type: "list", items: [
          "Testo — campo libero (es. Codice cliente, Note interne)",
          "Numero — valori numerici (es. Fatturato annuo, Budget)",
          "Data — selettore data (es. Data rinnovo contratto)",
          "Selezione singola — menu a tendina con opzioni predefinite (es. Settore, Priorità)",
          "Selezione multipla — checkbox multipli tra opzioni predefinite",
          "Booleano — flag Sì/No (es. Cliente VIP, NDA firmato)",
        ]},
        { type: "tip", text: "I campi personalizzati sono visibili a tutti i membri del team e si applicano a tutti i record dell'entità scelta. Usali per informazioni strutturate specifiche del tuo processo di vendita." },
      ]},
      { id: "im7", title: "Setup CRM: scegli la modalità per il tuo settore", excerpt: "Adatta Pipely al tuo settore scegliendo tra Classic, Immobiliare, Assicurazioni ed E-commerce.", readTime: 3, popular: true, blocks: [
        { type: "heading", text: "Cos'è il Setup CRM" },
        { type: "para", text: "Pipely si adatta al tuo settore attraverso quattro modalità: Classic (generico B2B), Immobiliare, Assicurazioni ed E-commerce. Ogni modalità personalizza la terminologia dell'app (es. 'Affare' diventa 'Polizza' in modalità Assicurazioni) e, nelle versioni verticali, abiliterà funzionalità specifiche del settore." },
        { type: "heading", text: "Come cambiare il setup" },
        { type: "steps", items: [
          "Vai alla Dashboard principale",
          "Individua il banner colorato 'Setup CRM' (sotto il wizard di onboarding)",
          "Clicca su 'Cambia setup'",
          "Scegli la modalità desiderata dalla griglia di card",
          "Clicca 'Applica setup' per confermare",
        ]},
        { type: "heading", text: "Le 4 modalità disponibili" },
        { type: "list", items: [
          "Classic — CRM generico B2B, adatto a PMI, agenzie, consulenti, startup e reti commerciali",
          "Immobiliare — per agenti e agenzie immobiliari (funzionalità settore in arrivo)",
          "Assicurazioni — per agenti e broker assicurativi (funzionalità settore in arrivo)",
          "E-commerce & Retail — per negozi online e retail (funzionalità settore in arrivo)",
        ]},
        { type: "tip", text: "Il setup può essere cambiato in qualsiasi momento senza perdere dati. Cambiarlo aggiorna solo la terminologia e le funzionalità suggerite." },
        { type: "warning", text: "Le funzionalità settore-specifiche dei 3 verticali (Immobiliare, Assicurazioni, E-commerce) sono in sviluppo e saranno disponibili prossimamente." },
      ]},
      { id: "im6", title: "Cambiare piano o aggiornare i dati di fatturazione", excerpt: "Come upgradare il piano, aggiornare la carta e scaricare le fatture.", readTime: 4, blocks: [
        { type: "heading", text: "Dove gestire il piano" },
        { type: "steps", items: [
          "Vai su Impostazioni → Piano / Fatturazione",
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
          "Vai su Impostazioni → Profilo",
          "Clicca \"Cambia password\"",
          "Inserisci la password attuale e poi la nuova password (min. 8 caratteri)",
          "Conferma la nuova password e salva",
        ]},
        { type: "heading", text: "Se usi Google OAuth" },
        { type: "para", text: "Se ti sei registrato con Google, non hai una password Pipely da cambiare. La gestione della password è interamente delegata al tuo Account Google. Per cambiarla vai su myaccount.google.com → Sicurezza → Password." },
        { type: "tip", text: "Usa una password lunga e unica per Pipely. Un gestore di password come 1Password o Bitwarden ti aiuta a generare e conservare credenziali sicure senza doverle ricordare." },
      ]},
      { id: "s2", title: "Attivare l'autenticazione a due fattori (2FA)", excerpt: "Proteggi il tuo account con un secondo livello di verifica via app o SMS.", readTime: 5, blocks: [
        { type: "heading", text: "2FA con Google OAuth" },
        { type: "para", text: "Se accedi a Pipely con Google, la 2FA è quella configurata sul tuo Account Google. Quando Google richiede la verifica in due passaggi, Pipely è automaticamente protetto dalla 2FA di Google." },
        { type: "heading", text: "Come attivare la 2FA Google" },
        { type: "steps", items: [
          "Vai su myaccount.google.com",
          "Clicca su Sicurezza nel menu laterale",
          "Nella sezione \"Accesso a Google\" clicca \"Verifica in 2 passaggi\"",
          "Segui la procedura guidata per scegliere il metodo (app, SMS, chiave fisica)",
        ]},
        { type: "heading", text: "2FA per account email+password" },
        { type: "para", text: "La 2FA nativa per gli account email+password di Pipely è in roadmap. Al momento non è disponibile. Per proteggere il tuo account usa una password robusta e unica." },
        { type: "tip", text: "L'app Google Authenticator o Authy sono i metodi 2FA più sicuri. Preferiscili rispetto agli SMS, vulnerabili agli attacchi di SIM swapping." },
      ]},
      { id: "s3", title: "Gestione delle sessioni attive", excerpt: "Visualizza i dispositivi connessi e disconnetti le sessioni sospette.", readTime: 3, blocks: [
        { type: "heading", text: "Sessioni attive in Pipely" },
        { type: "para", text: "Pipely non dispone attualmente di una lista delle sessioni attive (dispositivi connessi). Non è possibile vedere da quali browser o dispositivi è aperta la tua sessione." },
        { type: "heading", text: "Come invalidare tutte le sessioni" },
        { type: "list", items: [
          "Account email+password: cambia la password in Impostazioni → Profilo. Tutte le sessioni attive vengono invalidate.",
          "Account Google OAuth: revoca l'accesso di Pipely dalla dashboard Google (myaccount.google.com → Sicurezza → App con accesso all'account). Poi accedi di nuovo.",
        ]},
        { type: "tip", text: "Se sospetti un accesso non autorizzato, cambia immediatamente la password (o revoca l'accesso OAuth) e verifica le attività recenti nel CRM." },
      ]},
      { id: "s4", title: "Privacy dei dati: cosa raccoglie Pipely", excerpt: "Informativa sulla privacy, GDPR e come vengono trattati i tuoi dati.", readTime: 6, blocks: [
        { type: "heading", text: "Dati raccolti" },
        { type: "list", items: [
          "Dati account — nome, email, password cifrata o provider OAuth",
          "Dati CRM — contatti, aziende, affari, attività e note inseriti dall'utente",
          "Log di accesso — data/ora di login, indirizzo IP per sicurezza",
          "Pixel di tracciamento campagne — aperture email tramite pixel 1×1 px anonimizzato",
        ]},
        { type: "heading", text: "Base legale e GDPR" },
        { type: "para", text: "Pipely tratta i dati in conformità al GDPR (Regolamento UE 2016/679). La Privacy Policy completa è disponibile alla pagina /privacy del sito. Come titolare del trattamento per i dati CRM inseriti nel sistema, sei tu a essere responsabile della loro correttezza e liceità." },
        { type: "link", text: "Leggi la Privacy Policy completa", href: "/privacy" },
        { type: "tip", text: "Per domande specifiche sulla privacy o richieste GDPR (accesso, rettifica, cancellazione), contatta il supporto tramite /contatti indicando la natura della richiesta." },
      ]},
      { id: "s5", title: "Esportare o eliminare i tuoi dati", excerpt: "Come richiedere l'export completo dei dati o la cancellazione dell'account.", readTime: 4, blocks: [
        { type: "heading", text: "Esportare i tuoi dati" },
        { type: "list", items: [
          "Affari — vai su Affari → clicca Export per scaricare il CSV",
          "Contatti — vai su Contatti → clicca Export per scaricare il CSV",
          "Prodotti — vai su Prodotti → clicca Export per scaricare il CSV del catalogo",
        ]},
        { type: "heading", text: "Eliminare l'account (richiesta GDPR)" },
        { type: "steps", items: [
          "Vai su /contatti e compila il modulo di supporto",
          "Specifica nell'oggetto: \"Richiesta cancellazione account GDPR\"",
          "Indica l'email dell'account da eliminare",
          "Il team elabora la richiesta entro 30 giorni come previsto dal GDPR",
        ]},
        { type: "warning", text: "La cancellazione dell'account è definitiva e irreversibile. Tutti i dati CRM (contatti, affari, attività) vengono eliminati permanentemente entro 30 giorni dalla richiesta." },
        { type: "tip", text: "Prima di richiedere la cancellazione, esporta i dati che vuoi conservare tramite le funzioni Export CSV disponibili nelle varie sezioni." },
      ]},
      { id: "s6", title: "Permessi e ruoli del team", excerpt: "Amministratore, manager, venditore: differenze di accesso e operazioni consentite.", readTime: 5, blocks: [
        { type: "heading", text: "Ruoli disponibili" },
        { type: "list", items: [
          "OWNER — accesso completo: gestisce il piano, la fatturazione e tutti i dati",
          "ADMIN — come OWNER ma senza accesso alla gestione del piano/fatturazione",
          "MANAGER — gestisce affari, contatti, team e report; non accede alle impostazioni avanzate",
          "SALES — crea e gestisce affari e contatti propri; non accede alle impostazioni",
          "VIEWER — sola lettura su tutti i dati; non può creare o modificare nulla",
        ]},
        { type: "heading", text: "Come assegnare i ruoli" },
        { type: "para", text: "I ruoli si assegnano al momento dell'invito (Impostazioni → Team → Invita membro) o modificandoli in seguito cliccando i tre puntini accanto al nome del membro." },
        { type: "tip", text: "Segui il principio del minimo privilegio: assegna il ruolo più restrittivo che permette al membro di svolgere il proprio lavoro. Usa ADMIN solo per chi gestisce davvero l'account." },
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
          "Google OAuth — accesso sicuro con account Google, 2FA inclusa",
          "SMTP (qualsiasi provider) — Gmail, Aruba, Libero, Outlook e provider custom",
        ]},
        { type: "heading", text: "In roadmap" },
        { type: "list", items: [
          "Zapier / Make — automazione con centinaia di app (previsto)",
          "Google Calendar — sincronizzazione attività (previsto)",
          "Webhook — notifiche push a sistemi esterni (previsto)",
          "API REST pubblica — documentazione e chiavi API (in sviluppo)",
        ]},
        { type: "tip", text: "Per accesso anticipato all'API REST o per valutare integrazioni custom su piano Enterprise, contatta il supporto tramite /contatti." },
      ]},
      { id: "in2", title: "Usare l'API REST di Pipely", excerpt: "Documentazione base per sviluppatori: autenticazione, endpoint principali ed esempi.", readTime: 8, popular: true, blocks: [
        { type: "heading", text: "Stato dell'API" },
        { type: "para", text: "L'API REST di Pipely è attualmente in sviluppo. L'autenticazione tramite API Key non è ancora disponibile per il pubblico generale. Per accesso anticipato contatta il supporto." },
        { type: "heading", text: "Endpoint pianificati" },
        { type: "list", items: [
          "GET /api/deals — lista affari con filtri",
          "POST /api/deals — crea un nuovo affare",
          "GET /api/contacts — lista contatti",
          "POST /api/contacts — crea un nuovo contatto",
          "GET /api/leads — lista lead",
          "POST /api/leads — crea un nuovo lead",
        ]},
        { type: "heading", text: "Autenticazione" },
        { type: "para", text: "L'autenticazione avverrà tramite API Key da includere nell'header HTTP: Authorization: Bearer <api_key>. Le API Key saranno generabili da Impostazioni → Integrazioni (in sviluppo)." },
        { type: "tip", text: "Se sei uno sviluppatore e vuoi integrare Pipely nel tuo stack, contatta il supporto per ricevere la documentazione API in anteprima e accedere all'ambiente di test." },
      ]},
      { id: "in3", title: "Configurare i webhook", excerpt: "Ricevi notifiche in tempo reale nel tuo sistema quando avvengono eventi in Pipely.", readTime: 6, blocks: [
        { type: "heading", text: "Stato dei webhook" },
        { type: "para", text: "I webhook non sono ancora disponibili come funzionalità self-service in Pipely. Non è possibile configurarli autonomamente dall'interfaccia." },
        { type: "heading", text: "Opzione Enterprise" },
        { type: "para", text: "Per i piani Enterprise è possibile richiedere la configurazione di webhook custom tramite il supporto. Il team valuta ogni richiesta e definisce gli endpoint in base alle esigenze specifiche." },
        { type: "heading", text: "Alternative disponibili" },
        { type: "list", items: [
          "Usa le Automazioni di Pipely per azioni in risposta agli eventi interni",
          "Quando l'API REST sarà disponibile, potrai usare polling per aggiornare sistemi esterni",
          "Con Make (piano HTTP) puoi già fare polling dell'API quando sarà disponibile",
        ]},
        { type: "tip", text: "Contatta il supporto tramite /contatti per richiedere webhook su piano Enterprise o per essere avvisato quando i webhook self-service saranno disponibili." },
      ]},
      { id: "in4", title: "Integrazione con Google Calendar", excerpt: "Sincronizza le attività di Pipely con il tuo calendario Google.", readTime: 5, blocks: [
        { type: "heading", text: "Stato dell'integrazione" },
        { type: "para", text: "La sincronizzazione con Google Calendar è in roadmap. Al momento le attività di Pipely rimangono nel CRM e non vengono sincronizzate automaticamente con Google Calendar o altri calendari esterni." },
        { type: "heading", text: "Workaround attuale" },
        { type: "steps", items: [
          "Esporta le attività tramite la funzione Export CSV nella pagina Attività",
          "Apri Google Calendar → Impostazioni → Importa eventi",
          "Carica il file CSV (potrebbe richiedere conversione in formato .ics)",
          "Gli eventi appaiono nel calendario ma non si sincronizzano in tempo reale",
        ]},
        { type: "tip", text: "Iscriviti alla newsletter Pipely per essere avvisato quando l'integrazione nativa con Google Calendar sarà disponibile." },
      ]},
      { id: "in5", title: "Connettere Pipely a Zapier o Make", excerpt: "Automatizza i flussi tra Pipely e centinaia di altre app senza scrivere codice.", readTime: 5, blocks: [
        { type: "heading", text: "Stato dell'integrazione" },
        { type: "para", text: "L'integrazione nativa con Zapier e Make (Integromat) è in roadmap. Non è ancora disponibile un'app Pipely ufficiale su questi marketplace." },
        { type: "heading", text: "Alternativa con Make (piano HTTP)" },
        { type: "para", text: "Quando l'API REST di Pipely sarà disponibile, potrai usare il modulo HTTP di Make per fare richieste API personalizzate e automatizzare i flussi tra Pipely e altre app senza aspettare l'integrazione nativa." },
        { type: "list", items: [
          "Make HTTP module → POST /api/deals per creare affari da altri sistemi",
          "Zapier Webhooks → compatibile con l'API REST Pipely (quando disponibile)",
        ]},
        { type: "tip", text: "Se hai bisogno di integrazioni urgenti, contatta il supporto: per i piani Enterprise sono disponibili integrazioni custom su richiesta." },
      ]},
      { id: "in6", title: "Integrazione con strumenti di firma digitale", excerpt: "Collega DocuSign o altri servizi per firmare i contratti direttamente da Pipely.", readTime: 4, blocks: [
        { type: "heading", text: "Stato dell'integrazione" },
        { type: "para", text: "L'integrazione nativa con strumenti di firma digitale come DocuSign, FirmaOggi o simili non è disponibile in Pipely." },
        { type: "heading", text: "Workaround consigliato" },
        { type: "steps", items: [
          "Prepara e firma il documento sulla piattaforma di firma digitale che usi",
          "Scarica il documento firmato in PDF",
          "Apri la scheda affare in Pipely",
          "Aggiungi una nota all'affare con il link al documento o allega il PDF",
        ]},
        { type: "list", items: [
          "DocuSign — firma e scarica il PDF firmato, poi allegalo alla nota affare",
          "FirmaOggi — stessa procedura",
          "Adobe Sign — stessa procedura",
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
        { type: "heading", text: "Pipely è una Progressive Web App (PWA)" },
        { type: "para", text: "Pipely non è disponibile come app nativa su App Store o Google Play. Si installa come PWA direttamente dal browser del tuo smartphone, senza passare dagli store." },
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
      { id: "mo2", title: "Funzionalità disponibili sull'app mobile", excerpt: "Cosa puoi fare da mobile: affari, contatti, attività e notifiche push.", readTime: 4, blocks: [
        { type: "heading", text: "Funzionalità accessibili da mobile" },
        { type: "para", text: "Tramite la PWA hai accesso a tutte le funzionalità di Pipely disponibili su desktop: non esiste una versione mobile ridotta." },
        { type: "list", items: [
          "Affari — crea, modifica e sposta affari nella pipeline",
          "Contatti — aggiungi contatti, visualizza schede, invia email",
          "Attività — crea e completa attività, vedi il calendario",
          "Lead — gestisci e converti i lead in affare",
          "Report — visualizza i KPI e i grafici",
          "Campagne — monitora le statistiche di invio",
        ]},
        { type: "heading", text: "Limiti rispetto al desktop" },
        { type: "para", text: "La schermata più piccola rende alcune operazioni meno comode (es. drag & drop nella Kanban). Non esistono funzionalità esclusive mobile al momento." },
        { type: "tip", text: "Per operazioni frequenti da mobile come creare un'attività o aggiungere una nota a un affare, la PWA è perfettamente adatta. Per import massivi o configurazioni avanzate usa il desktop." },
      ]},
      { id: "mo3", title: "Notifiche push: configurazione", excerpt: "Come attivare e personalizzare gli alert sullo smartphone.", readTime: 3, blocks: [
        { type: "heading", text: "Stato delle notifiche push" },
        { type: "para", text: "Le notifiche push PWA non sono ancora disponibili in Pipely. Al momento non riceverai alert sullo smartphone per attività in scadenza, affari aggiornati o altri eventi." },
        { type: "heading", text: "In roadmap" },
        { type: "list", items: [
          "Notifiche push PWA per attività in scadenza (previsto Q4 2026)",
          "Notifiche per affari assegnati",
          "Notifiche per messaggi dal team",
        ]},
        { type: "heading", text: "Alternativa attuale" },
        { type: "para", text: "Monitora le attività scadute dalla dashboard ogni volta che apri l'app: il KPI \"Attività scadute\" in rosso è il segnale più immediato di azioni in ritardo." },
        { type: "tip", text: "Iscriviti alla newsletter Pipely per essere avvisato quando le notifiche push saranno disponibili." },
      ]},
      { id: "mo4", title: "Accesso offline: cosa funziona senza connessione", excerpt: "Quali dati sono disponibili offline e come si sincronizzano alla riconnessione.", readTime: 4, blocks: [
        { type: "heading", text: "Pipely richiede connessione" },
        { type: "para", text: "Pipely non dispone di una modalità offline. Tutti i dati sono in tempo reale sul server: senza connessione internet l'app non funziona." },
        { type: "heading", text: "Perché non c'è la modalità offline" },
        { type: "para", text: "I dati CRM non vengono memorizzati localmente sul dispositivo per motivi di sicurezza: in caso di smarrimento o accesso non autorizzato allo smartphone, i dati aziendali rimangono protetti sul server." },
        { type: "list", items: [
          "Nessuna cache locale dei contatti o degli affari",
          "Nessuna sincronizzazione alla riconnessione (non necessaria)",
          "Connessione 4G/5G sufficiente per un uso fluido",
        ]},
        { type: "tip", text: "Per lavorare in mobilità assicurati di avere una connessione dati attiva. La PWA funziona ottimamente anche con connessioni 4G standard." },
      ]},
      { id: "mo5", title: "Aggiungere contatti dalla rubrica del telefono", excerpt: "Importa i contatti direttamente dalla rubrica iOS o Android in Pipely.", readTime: 3, blocks: [
        { type: "heading", text: "Funzionalità non disponibile" },
        { type: "para", text: "Pipely non supporta l'importazione diretta dalla rubrica del telefono (iOS Contatti o Android Contacts). Non è possibile accedere alla rubrica tramite la PWA." },
        { type: "heading", text: "Come aggiungere contatti da mobile" },
        { type: "steps", items: [
          "Apri la PWA Pipely sul tuo smartphone",
          "Vai su Contatti → Nuovo contatto",
          "Inserisci manualmente nome, email e telefono del contatto",
          "Salva",
        ]},
        { type: "heading", text: "Importazione via CSV da mobile" },
        { type: "para", text: "Se hai un file CSV dei tuoi contatti salvato sullo smartphone o accessibile da Google Drive, puoi caricarlo tramite la funzione Importa in Contatti, anche da mobile." },
        { type: "tip", text: "Per importazioni massive di contatti dalla rubrica, esporta la rubrica del telefono in CSV dal tuo sistema (iPhone: esporta da iCloud.com → Contatti, Android: esporta da Google Contacts) e poi importa il CSV in Pipely da desktop." },
      ]},
      { id: "mo6", title: "Problemi comuni sull'app mobile", excerpt: "Soluzioni per crash, errori di login e problemi di sincronizzazione su mobile.", readTime: 5, blocks: [
        { type: "heading", text: "La PWA non si aggiorna" },
        { type: "steps", items: [
          "Apri le impostazioni del browser sul tuo smartphone",
          "Svuota la cache (Cancella dati navigazione → Cache)",
          "Chiudi e riapri la PWA",
          "Se il problema persiste, disinstalla la PWA e reinstallala dal browser",
        ]},
        { type: "heading", text: "Login fallisce su mobile" },
        { type: "list", items: [
          "Verifica che i cookie di terze parti non siano bloccati nelle impostazioni del browser",
          "Su iOS: usa Safari (supporto OAuth migliore rispetto a Chrome su iOS)",
          "Prova ad accedere in modalità navigazione privata per escludere problemi di cache",
        ]},
        { type: "heading", text: "Google OAuth non funziona su iOS" },
        { type: "para", text: "Su iPhone, Google OAuth funziona meglio con Safari. Chrome su iOS può avere problemi con i popup di autenticazione. Se il login Google fallisce, passa a Safari." },
        { type: "tip", text: "Se il problema persiste, contatta il supporto tramite /contatti specificando: modello smartphone, versione OS, browser usato e messaggio di errore visualizzato." },
      ]},
    ],
  },
  {
    id: "fatturazione",
    label: "Fatturazione & Piani",
    description: "Abbonamenti, pagamenti e gestione del piano",
    articles: [
      { id: "fa1", title: "Piani disponibili e differenze", excerpt: "Confronto tra Starter (gratis), Pro (€29/mese) ed Enterprise (custom) di Pipely.", readTime: 4, popular: true, blocks: [
        { type: "heading", text: "Starter — Gratis" },
        { type: "para", text: "Il piano di partenza, sempre gratuito. Perfetto per scoprire Pipely e gestire una pipeline di vendita semplice." },
        { type: "list", items: [
          "1 pipeline con stage personalizzabili",
          "Fino a 500 contatti",
          "Report base (KPI dashboard)",
          "App mobile",
        ]},
        { type: "heading", text: "Pro — €29/mese" },
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
        { type: "heading", text: "Enterprise — Prezzo custom" },
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
          "Vai su Impostazioni → Piano / Fatturazione",
          "Clicca su \"Upgrade a Pro\"",
          "Inserisci i dati di pagamento (carta di credito o SEPA)",
          "Conferma — il piano viene attivato immediatamente",
        ]},
        { type: "heading", text: "Cosa si sblocca subito" },
        { type: "list", items: [
          "Pipeline illimitate — puoi crearne quante vuoi",
          "Contatti illimitati — nessun limite alla crescita del CRM",
          "AI Assistant — suggerimenti intelligenti e generazione testi",
          "Automazioni avanzate — workflow attivi",
          "Report personalizzati — filtri e periodi custom",
        ]},
        { type: "tip", text: "Per il piano Enterprise contatta il team commerciale tramite il pulsante Contatta il supporto in basso nella pagina." },
      ]},
      { id: "fa3", title: "Metodi di pagamento accettati", excerpt: "Carte di credito, SEPA, bonifico: come aggiornare i dati di pagamento.", readTime: 3, blocks: [
        { type: "heading", text: "Metodi disponibili" },
        { type: "list", items: [
          "Carta di credito/debito — Visa, Mastercard, American Express",
          "SEPA Direct Debit — addebito diretto da conto corrente europeo",
          "Bonifico bancario — disponibile solo su richiesta per piano Enterprise",
        ]},
        { type: "heading", text: "Sicurezza dei pagamenti" },
        { type: "para", text: "I pagamenti sono gestiti da Stripe, certificato PCI DSS Level 1 (il massimo livello di sicurezza per i pagamenti online). Pipely non memorizza i dati della carta: sono gestiti interamente da Stripe." },
        { type: "heading", text: "Aggiornare i dati di pagamento" },
        { type: "steps", items: [
          "Vai su Impostazioni → Piano / Fatturazione",
          "Clicca il link al portale Stripe",
          "Nel portale puoi aggiornare la carta, aggiungere un metodo SEPA o vedere lo storico",
        ]},
        { type: "tip", text: "Per il piano Enterprise con pagamento tramite bonifico bancario, contatta il supporto tramite /contatti per ricevere i dati bancari e le istruzioni." },
      ]},
      { id: "fa4", title: "Scaricare le fatture e i ricevuti", excerpt: "Dove trovare lo storico pagamenti e come scaricare le fatture in PDF.", readTime: 2, blocks: [
        { type: "heading", text: "Come accedere alle fatture" },
        { type: "steps", items: [
          "Vai su Impostazioni → Piano / Fatturazione",
          "Clicca il link \"Gestisci fatturazione\" (portale Stripe)",
          "Nel portale trovi lo storico completo dei pagamenti",
          "Clicca su un pagamento per scaricare la fattura in PDF",
        ]},
        { type: "heading", text: "Informazioni sulle fatture" },
        { type: "list", items: [
          "Le fatture sono emesse da Pipely SRL (o entità legale equivalente)",
          "Includono IVA se applicabile in base al paese di fatturazione",
          "Il numero di partita IVA va inserito nel portale Stripe per le fatture B2B",
        ]},
        { type: "tip", text: "Puoi configurare nel portale Stripe l'email a cui inviare automaticamente le fatture ad ogni rinnovo. Utile per l'amministrazione aziendale." },
      ]},
      { id: "fa5", title: "Disdire o sospendere l'abbonamento", excerpt: "Come cancellare il piano e cosa succede ai tuoi dati dopo la disdetta.", readTime: 4, blocks: [
        { type: "heading", text: "Come cancellare il piano" },
        { type: "steps", items: [
          "Vai su Impostazioni → Piano / Fatturazione",
          "Clicca \"Gestisci abbonamento\"",
          "Seleziona \"Cancella piano\"",
          "Conferma la cancellazione",
          "La cancellazione è efficace a fine del periodo già pagato",
        ]},
        { type: "heading", text: "Cosa succede dopo la cancellazione" },
        { type: "list", items: [
          "Il piano Pro rimane attivo fino alla scadenza del periodo pagato",
          "Dopo la scadenza l'account torna al piano Starter (gratuito) con funzionalità limitate",
          "I dati rimangono accessibili in sola lettura per 30 giorni dopo la scadenza",
          "Dopo 30 giorni i dati vengono eliminati definitivamente",
        ]},
        { type: "warning", text: "Esporta i tuoi dati (affari, contatti, prodotti) prima che scadano i 30 giorni post-cancellazione. Dopo quella data i dati non sono recuperabili." },
        { type: "tip", text: "Non esiste una funzione di \"sospensione\": puoi solo cancellare il piano. Se vuoi riprendere in futuro, ricrea l'account e importa i dati dal CSV esportato." },
      ]},
      { id: "fa6", title: "Sconto per pagamento annuale", excerpt: "Risparmia fino al 20% pagando l'abbonamento annualmente anziché mensilmente.", readTime: 2, blocks: [
        { type: "heading", text: "Piano Pro annuale" },
        { type: "para", text: "Il piano Pro annuale costa €290/anno, equivalente a circa €24/mese. Rispetto al piano mensile a €29/mese, il pagamento annuale fa risparmiare €58 all'anno (2 mesi omaggio)." },
        { type: "heading", text: "Come attivare il piano annuale" },
        { type: "steps", items: [
          "Vai su Impostazioni → Piano / Fatturazione",
          "Clicca \"Upgrade a Pro\"",
          "Nella pagina di checkout seleziona l'opzione \"Annuale\"",
          "Il risparmio viene mostrato chiaramente nella pagina",
          "Completa il pagamento: il piano è attivo per 12 mesi",
        ]},
        { type: "tip", text: "Se hai già un piano mensile attivo e vuoi passare all'annuale, contatta il supporto tramite /contatti: il team ti aiuterà a fare il passaggio con eventuale credito proporzionale." },
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
        { type: "para", text: "Se usi Google OAuth, assicurati di selezionare lo stesso account Google con cui ti sei registrato. Se hai più account Google, verifica quale è quello corretto." },
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
          "Prova da un browser diverso o in modalità incognito",
        ]},
        { type: "heading", text: "Problema su più dispositivi" },
        { type: "para", text: "Se i dati non si aggiornano su più dispositivi contemporaneamente, potrebbe essere un'interruzione del servizio Pipely. Controlla la pagina di stato del servizio." },
        { type: "heading", text: "Possibili cause" },
        { type: "list", items: [
          "Cache browser obsoleta — risolto svuotando la cache",
          "Connessione instabile — riprova con connessione stabile",
          "Interruzione del servizio — verifica la pagina di stato",
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
          "Excel: File → Salva con nome → scegli \"CSV UTF-8 (delimitato da virgola)\"",
          "Google Sheets: File → Scarica → CSV (.csv) — già in UTF-8",
          "LibreOffice: nella finestra di esportazione CSV seleziona \"Unicode (UTF-8)\"",
        ]},
        { type: "warning", text: "I file salvati con Excel in formato \"CSV (delimitato da virgola)\" standard usano la codifica ANSI: caratteri come à, è, ù possono risultare corrotti. Usa sempre il formato \"CSV UTF-8\"." },
        { type: "tip", text: "In caso di dubbi sul formato, usa il template Excel fornito da Pipely (Contatti → Importa → Scarica template): è già configurato nel formato corretto." },
      ]},
      { id: "pb4", title: "Le email non vengono registrate in Pipely", excerpt: "Problemi di integrazione email: configurazione IMAP/SMTP e risoluzione errori.", readTime: 6, blocks: [
        { type: "heading", text: "Verifica la configurazione SMTP" },
        { type: "steps", items: [
          "Vai su Impostazioni → Email",
          "Controlla che SMTP sia configurato (host, porta, email, password)",
          "Clicca \"Testa connessione\" per verificare che le credenziali siano corrette",
        ]},
        { type: "heading", text: "Errori comuni e soluzioni" },
        { type: "list", items: [
          "Errore 535 (credenziali errate) — verifica email e password; per Gmail usa App Password",
          "Errore su porta 587/465 — controlla che la porta corrisponda al protocollo (587=STARTTLS, 465=SSL)",
          "Connessione rifiutata — il provider potrebbe bloccare SMTP; controlla le impostazioni di sicurezza dell'account email",
          "Gmail \"Accesso bloccato\" — devi usare App Password, non la password principale",
        ]},
        { type: "warning", text: "Gmail non consente l'accesso SMTP con la password principale dell'account. Devi generare un'App Password dedicata da myaccount.google.com → Sicurezza → App password." },
        { type: "tip", text: "Dopo aver corretto la configurazione, usa il pulsante \"Testa connessione\" prima di salvare: riceverai un'email di test per confermare che tutto funzioni." },
      ]},
      { id: "pb5", title: "La pagina non si carica o è lenta", excerpt: "Come svuotare la cache, verificare la connessione e segnalare un'interruzione.", readTime: 3, blocks: [
        { type: "heading", text: "Passaggi di risoluzione" },
        { type: "steps", items: [
          "Svuota la cache del browser: Ctrl+Shift+Delete (Windows) / Cmd+Shift+Delete (Mac)",
          "Disabilita temporaneamente le estensioni del browser (ad blocker, VPN...)",
          "Verifica la connessione: apri un altro sito per confermare che internet funzioni",
          "Prova in modalità incognito per escludere problemi di estensioni o cache",
        ]},
        { type: "heading", text: "Se il problema riguarda solo Pipely" },
        { type: "para", text: "Se altri siti caricano normalmente ma Pipely è lento o non risponde, potrebbe essere un'interruzione del servizio. Controlla la pagina di stato o contatta il supporto." },
        { type: "list", items: [
          "Interruzione confermata — aspetta il ripristino e monitora gli aggiornamenti di stato",
          "Nessuna interruzione segnalata — invia un report al supporto con screenshot e browser usato",
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
          "Disponibilità: lunedì–venerdì, 9:00–18:00 CET",
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
        { type: "tip", text: "Più informazioni fornisci nel primo messaggio, più rapida sarà la risoluzione. Evita messaggi generici come \"non funziona\": specifica cosa hai fatto e cosa è successo." },
      ]},
    ],
  },
  {
    id: "tutorial",
    label: "Tutorial Video",
    description: "Guide video passo-passo per sfruttare Pipely al massimo",
    articles: [
      { id: "tv1", title: "Pipely in 5 minuti: la guida rapida", excerpt: "Video introduttivo che mostra le funzionalità principali di Pipely.", readTime: 5, popular: true, blocks: [
        { type: "para", text: "Questo tutorial video è in fase di produzione e sarà disponibile a breve." },
        { type: "list", items: [
          "Panoramica della dashboard e dei KPI principali",
          "Creare il primo affare e navigare la pipeline Kanban",
          "Aggiungere un contatto e collegarlo a un affare",
          "Configurare la pipeline con stage personalizzati",
        ]},
        { type: "tip", text: "Iscriviti alla newsletter Pipely per essere avvisato quando nuovi tutorial vengono pubblicati." },
      ]},
      { id: "tv2", title: "Come configurare la pipeline in video", excerpt: "Walkthrough completo: dalla creazione degli stage alla prima trattativa.", readTime: 8, popular: true, blocks: [
        { type: "para", text: "Questo tutorial video è in fase di produzione e sarà disponibile a breve." },
        { type: "list", items: [
          "Accedere a Impostazioni → Pipeline",
          "Aggiungere e rinominare gli stage con probabilità di chiusura",
          "Riordinare gli stage con drag & drop",
          "Creare il primo affare e trascinarlo tra gli stage nella Kanban",
        ]},
        { type: "tip", text: "Iscriviti alla newsletter Pipely per essere avvisato quando nuovi tutorial vengono pubblicati." },
      ]},
      { id: "tv3", title: "Gestire i contatti: video tutorial", excerpt: "Come aggiungere, modificare e importare contatti con la guida video.", readTime: 6, blocks: [
        { type: "para", text: "Questo tutorial video è in fase di produzione e sarà disponibile a breve." },
        { type: "list", items: [
          "Importazione CSV con gestione duplicati",
          "Creazione manuale di un contatto con tutti i campi",
          "Collegamento del contatto a un'azienda",
          "Invio email direttamente dalla scheda contatto",
        ]},
        { type: "tip", text: "Iscriviti alla newsletter Pipely per essere avvisato quando nuovi tutorial vengono pubblicati." },
      ]},
      { id: "tv4", title: "Automazioni avanzate: webinar registrato", excerpt: "1 ora di webinar con esempi pratici di workflow automatici.", readTime: 60, blocks: [
        { type: "para", text: "Questo tutorial video è in fase di produzione e sarà disponibile a breve." },
        { type: "list", items: [
          "Follow-up automatico dopo una chiamata completata",
          "Notifiche al team quando un affare viene vinto",
          "Lead nurturing: email automatiche ai lead in NURTURING",
          "Debug e monitoraggio dei workflow con il tab Log",
        ]},
        { type: "tip", text: "Iscriviti alla newsletter Pipely per essere avvisato quando nuovi tutorial vengono pubblicati." },
      ]},
      { id: "tv5", title: "Report e analytics: video demo", excerpt: "Come leggere i grafici, filtrare per periodo ed esportare i dati.", readTime: 10, blocks: [
        { type: "para", text: "Questo tutorial video è in fase di produzione e sarà disponibile a breve." },
        { type: "list", items: [
          "Leggere il grafico funnel e identificare i colli di bottiglia",
          "Filtrare i KPI per periodo (7, 30, 90 giorni, 12 mesi)",
          "Analizzare il report Top performer del team",
          "Esportare i dati in CSV per analisi su Excel",
        ]},
        { type: "tip", text: "Iscriviti alla newsletter Pipely per essere avvisato quando nuovi tutorial vengono pubblicati." },
      ]},
      { id: "tv6", title: "Tour completo dell'app mobile", excerpt: "Tutte le funzionalità dell'app iOS e Android in un video di 7 minuti.", readTime: 7, blocks: [
        { type: "para", text: "Questo tutorial video è in fase di produzione e sarà disponibile a breve." },
        { type: "list", items: [
          "Installazione PWA su iPhone (Safari) e Android (Chrome)",
          "Navigazione tra le sezioni principali da mobile",
          "Creazione di un'attività e di un contatto da smartphone",
          "Gestione degli affari nella vista Kanban da mobile",
        ]},
        { type: "tip", text: "Iscriviti alla newsletter Pipely per essere avvisato quando nuovi tutorial vengono pubblicati." },
      ]},
    ],
  },
];


// --- AI serialization ---------------------------------------------------------

function serializeBlock(b: GuideBlock): string {
  if (b.type === "heading") return `**${b.text}**`;
  if (b.type === "para") return b.text;
  if (b.type === "list") return b.items.map((i) => `� ${i}`).join("\n");
  if (b.type === "steps") return b.items.map((i, n) => `${n + 1}. ${i}`).join("\n");
  if (b.type === "tip") return `?? ${b.text}`;
  if (b.type === "warning") return `?? ${b.text}`;
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
  const lines = ["=== GUIDA PIPELY � INDICE ==="];
  for (const s of GUIDE_SECTIONS) {
    lines.push(`\n[${s.label}]`);
    for (const a of s.articles) lines.push(`- ${a.title}`);
  }
  return lines.join("\n");
}
