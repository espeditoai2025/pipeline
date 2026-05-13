"use client";

import { useState, useMemo } from "react";
import {
  Search, Rocket, GitBranch, Users, Zap, Calendar, Mail, Megaphone,
  BarChart3, Workflow, Package, Settings, ShieldCheck,
  Plug, Smartphone, CreditCard, HelpCircle, PlayCircle,
  ChevronRight, ChevronLeft, ArrowUpRight, BookOpen, Star,
  Clock, CheckCircle2, X, ExternalLink, Lightbulb, AlertTriangle, ListChecks,
} from "lucide-react";

// ─── Data ────────────────────────────────────────────────────────────────────

export type Block =
  | { type: "para"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] }
  | { type: "steps"; items: string[] }
  | { type: "tip"; text: string }
  | { type: "warning"; text: string }
  | { type: "link"; text: string; href: string };

type Article = {
  id: string;
  title: string;
  excerpt: string;
  readTime: number;
  popular?: boolean;
  blocks?: Block[];
};

type Category = {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  articles: Article[];
};

const CATEGORIES: Category[] = [
  {
    id: "inizia",
    label: "Inizia con Pipely",
    description: "Configurazione account, primo accesso e importazione dati",
    icon: Rocket,
    color: "text-violet-600",
    bgColor: "bg-violet-50 dark:bg-violet-900/20",
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
        { type: "para", text: "Nella sezione Impostazioni puoi visualizzare il piano attivo: FREE, ESSENTIAL, ADVANCED, PROFESSIONAL o ENTERPRISE. Ogni piano sblocca funzionalità aggiuntive." },
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
    icon: GitBranch,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
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
        { type: "para", text: "Apri la scheda dell'affare e cerca la sezione Prodotti. Aggiungi prodotti dal catalogo, imposta quantità e sconto. Il valore dell'affare si ricalcola in automatico." },
        { type: "tip", text: "Imposta sempre una data di chiusura prevista: viene usata per i report di previsione e per calcolare il tasso di conversione nel tempo." },
      ]},
      { id: "p3", title: "Spostare gli affari tra gli stage", excerpt: "Come trascinare le card nella vista Kanban e aggiornare lo stato degli affari.", readTime: 3 },
      { id: "p4", title: "Rotting: affari in attesa troppo a lungo", excerpt: "Cos'è il rotting, come configurarlo e come ricevere notifiche sugli affari fermi.", readTime: 4 },
      { id: "p5", title: "Marcare un affare come vinto o perso", excerpt: "Come chiudere un affare e registrare il motivo della perdita per le analisi.", readTime: 3 },
      { id: "p6", title: "Filtri e ricerca avanzata nella pipeline", excerpt: "Filtra gli affari per stage, responsabile, valore, data e altri criteri.", readTime: 5 },
    ],
  },
  {
    id: "contatti",
    label: "Contatti & Aziende",
    description: "Gestione anagrafica, importazione e relazioni tra entità",
    icon: Users,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
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
      { id: "c2", title: "Collegare contatti alle aziende", excerpt: "Come associare un contatto a una o più aziende e gestire i ruoli.", readTime: 4 },
      { id: "c3", title: "Importare contatti in massa", excerpt: "Guida al formato CSV corretto, mapping dei campi e gestione dei duplicati.", readTime: 7 },
      { id: "c4", title: "Gestire le aziende e i loro contatti", excerpt: "Vista aziendale, elenco dipendenti, affari collegati e storico attività.", readTime: 5 },
      { id: "c5", title: "Campi personalizzati per contatti", excerpt: "Aggiungi campi su misura per raccogliere le informazioni che servono al tuo team.", readTime: 6 },
      { id: "c6", title: "Eliminare o archiviare un contatto", excerpt: "Differenza tra eliminazione definitiva e archiviazione; come recuperare i dati.", readTime: 3 },
    ],
  },
  {
    id: "lead",
    label: "Lead Management",
    description: "Cattura lead, qualificazione e conversione in affari",
    icon: Zap,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
    articles: [
      { id: "l1", title: "Cos'è un lead in Pipely e come crearlo", excerpt: "Differenza tra lead e affare; come aggiungere un nuovo lead e assegnargli uno score.", readTime: 4, popular: true },
      { id: "l2", title: "Qualificare un lead: stati e workflow", excerpt: "Gli stati NEW, WORKING, NURTURING, CONVERTED e come passare da uno all'altro.", readTime: 5 },
      { id: "l3", title: "Convertire un lead in affare", excerpt: "Come trasformare un lead qualificato in un affare nella pipeline.", readTime: 3, popular: true },
      { id: "l4", title: "Score e priorità dei lead", excerpt: "Come usare il punteggio per ordinare i lead e concentrarsi sui più promettenti.", readTime: 4 },
      { id: "l5", title: "Importare lead da fonti esterne", excerpt: "Integrazione con form web, LinkedIn e altri strumenti di lead generation.", readTime: 6 },
      { id: "l6", title: "Report sulle performance dei lead", excerpt: "Tasso di conversione, tempo medio di qualificazione e analisi per sorgente.", readTime: 5 },
    ],
  },
  {
    id: "attivita",
    label: "Attività & Calendario",
    description: "Pianifica chiamate, email, meeting e follow-up",
    icon: Calendar,
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
    articles: [
      { id: "a1", title: "Creare una nuova attività", excerpt: "Come pianificare una chiamata, un'email, un meeting o un'altra attività.", readTime: 3, popular: true },
      { id: "a2", title: "Collegare attività ad affari e contatti", excerpt: "Associa le attività agli affari o ai contatti per tenere traccia dello storico.", readTime: 4 },
      { id: "a3", title: "Attività scadute e promemoria", excerpt: "Come ricevere notifiche, gestire le attività in ritardo e ripianificarle.", readTime: 4 },
      { id: "a4", title: "Vista calendario delle attività", excerpt: "Usa la vista giornaliera e settimanale per organizzare il tuo piano di lavoro.", readTime: 3 },
      { id: "a5", title: "Segnare un'attività come completata", excerpt: "Come chiudere un'attività, aggiungere note e pianificare la prossima azione.", readTime: 2 },
      { id: "a6", title: "Tipi di attività personalizzati", excerpt: "Crea tipi di attività su misura oltre quelli predefiniti (chiamata, email, meeting).", readTime: 5 },
    ],
  },
  {
    id: "email",
    label: "Email & Comunicazioni",
    description: "Integrazione email, template e tracciamento messaggi",
    icon: Mail,
    color: "text-sky-600",
    bgColor: "bg-sky-50 dark:bg-sky-900/20",
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
      { id: "em2", title: "Configurare Gmail con App Password", excerpt: "Gmail richiede una App Password dedicata (non la password principale). Guida passo-passo con link alla pagina Google.", readTime: 4 },
      { id: "em3", title: "Configurare Aruba o Libero come provider SMTP", excerpt: "Impostazioni host, porta e crittografia per i provider italiani più diffusi.", readTime: 3 },
      { id: "em4", title: "Creare template email riutilizzabili", excerpt: "Risparmia tempo con modelli predefiniti per i messaggi più frequenti.", readTime: 5 },
      { id: "em5", title: "Inviare email direttamente da Pipely", excerpt: "Scrivi e invia email ai contatti senza uscire dal CRM, con storico completo.", readTime: 4 },
      { id: "em6", title: "Sicurezza: come vengono protette le credenziali SMTP", excerpt: "Le password SMTP sono cifrate con AES-256 e non vengono mai salvate in chiaro nel database.", readTime: 3 },
    ],
  },
  {
    id: "campagne",
    label: "Campagne Email",
    description: "Liste contatti, campagne di email marketing e monitoraggio risultati",
    icon: Megaphone,
    color: "text-rose-600",
    bgColor: "bg-rose-50 dark:bg-rose-900/20",
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
      { id: "ca2", title: "Aggiungere contatti a una lista: inserimento manuale", excerpt: "Incolla una o più email nel campo testo per aggiungerle rapidamente alla lista.", readTime: 2 },
      { id: "ca3", title: "Importare contatti in una lista da CSV o Excel", excerpt: "Carica un file CSV, XLS o XLSX con le email dei destinatari. I duplicati vengono gestiti automaticamente.", readTime: 4 },
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
      { id: "ca5", title: "Personalizzare il messaggio con variabili dinamiche", excerpt: "Usa {{nome}}, {{cognome}} e {{email}} per personalizzare ogni email con i dati del destinatario.", readTime: 3 },
      { id: "ca6", title: "Monitorare aperture e click della campagna", excerpt: "Ogni email contiene un pixel di tracciamento e link con redirect. Dopo l'invio vedi quante email sono state aperte e quanti link cliccati.", readTime: 3 },
    ],
  },
  {
    id: "report",
    label: "Report & Analytics",
    description: "KPI, grafici personalizzati e export dei dati",
    icon: BarChart3,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
    articles: [
      { id: "r1", title: "Dashboard dei report: panoramica", excerpt: "Scopri tutti i KPI disponibili: affari aperti, revenue, win rate, avg deal.", readTime: 4, popular: true },
      { id: "r2", title: "Analisi del funnel di vendita", excerpt: "Come interpretare il grafico funnel e identificare i colli di bottiglia.", readTime: 5 },
      { id: "r3", title: "Report trend: vinti vs persi negli ultimi 6 mesi", excerpt: "Leggi il grafico andamento e confronta i periodi per valutare la crescita.", readTime: 4 },
      { id: "r4", title: "Top performer del team", excerpt: "Classifica i venditori per revenue generata, affari vinti e tasso di conversione.", readTime: 3 },
      { id: "r5", title: "Esportare i dati in CSV", excerpt: "Come scaricare l'elenco degli affari e dei contatti per analisi esterne.", readTime: 3 },
      { id: "r6", title: "Filtrare i report per periodo", excerpt: "Confronta le performance su 7 giorni, 30 giorni, 90 giorni o 12 mesi.", readTime: 2 },
    ],
  },
  {
    id: "automazioni",
    label: "Automazioni",
    description: "Workflow automatici, trigger e azioni ricorrenti",
    icon: Workflow,
    color: "text-pink-600",
    bgColor: "bg-pink-50 dark:bg-pink-900/20",
    articles: [
      { id: "au1", title: "Cos'è un'automazione in Pipely", excerpt: "Introduzione ai workflow automatici: trigger, condizioni e azioni disponibili.", readTime: 5 },
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
      { id: "au3", title: "Automazioni per il follow-up dopo una chiamata", excerpt: "Invia automaticamente un'email o crea un'attività dopo ogni chiamata completata.", readTime: 5 },
      { id: "au4", title: "Notifiche automatiche al team", excerpt: "Avvisa i colleghi quando un affare cambia stage o raggiunge un valore soglia.", readTime: 4 },
      { id: "au5", title: "Automazioni per i lead in entrata", excerpt: "Assegna automaticamente i lead ai responsabili in base a regole personalizzate.", readTime: 5 },
      { id: "au6", title: "Monitorare e debuggare le automazioni", excerpt: "Come visualizzare la cronologia di esecuzione e risolvere gli errori.", readTime: 4 },
    ],
  },
  {
    id: "prodotti",
    label: "Prodotti & Listini",
    description: "Catalogo prodotti, prezzi e associazione agli affari",
    icon: Package,
    color: "text-teal-600",
    bgColor: "bg-teal-50 dark:bg-teal-900/20",
    articles: [
      { id: "pr1", title: "Aggiungere prodotti al catalogo", excerpt: "Come creare schede prodotto con nome, codice, prezzo, IVA e attivare la fatturazione ricorrente mensile o annuale.", readTime: 3, popular: true, blocks: [
        { type: "heading", text: "Creare una scheda prodotto" },
        { type: "steps", items: [
          "Vai su Prodotti nella sidebar",
          "Clicca \"Nuovo prodotto\"",
          "Inserisci il nome del prodotto",
          "Scegli la categoria (Software, SaaS, Sito Web, Agente AI, Hardware, Servizi, Consulenza, Formazione, Altro)",
          "Imposta il prezzo e l'aliquota IVA",
          "Se è un prodotto ricorrente, attiva il toggle \"Abbonamento\" e scegli il periodo (Mensile / Annuale)",
          "Clicca Crea prodotto",
        ]},
        { type: "heading", text: "Collegare prodotti agli affari" },
        { type: "para", text: "Apri la scheda di un affare e trova la sezione Prodotti. Clicca Aggiungi prodotto, cerca nel catalogo, imposta quantità e sconto. Il valore dell'affare si aggiorna automaticamente." },
        { type: "heading", text: "Categorie disponibili" },
        { type: "list", items: [
          "Software, SaaS, Sito Web, Agente AI — per prodotti digitali",
          "Hardware — per prodotti fisici",
          "Servizi, Consulenza, Formazione — per prestazioni professionali",
          "Altro — per tutto il resto",
        ]},
        { type: "tip", text: "Impostare la categoria correttamente ti aiuta a filtrare il catalogo e a generare report di vendita suddivisi per tipologia." },
      ]},
      { id: "pr2", title: "Associare prodotti agli affari", excerpt: "Aggiungi prodotti o servizi a un affare per calcolare il valore totale.", readTime: 4 },
      { id: "pr3", title: "Gestire quantità, sconti e IVA", excerpt: "Imposta quantità, percentuale di sconto e aliquota IVA per ogni riga prodotto.", readTime: 4 },
      { id: "pr4", title: "Categorie e unità di misura", excerpt: "Organizza il catalogo per categorie: Software, SaaS, Sito Web, Agente AI, Hardware, Servizi, Consulenza, Formazione, Altro.", readTime: 3 },
      { id: "pr5", title: "Prezzi in valute diverse", excerpt: "Supporto multi-valuta: come impostare prezzi in EUR, USD e altre valute.", readTime: 4 },
      { id: "pr6", title: "Esportare il catalogo prodotti", excerpt: "Come scaricare l'elenco prodotti in formato CSV per la gestione esterna.", readTime: 2 },
    ],
  },
  {
    id: "impostazioni",
    label: "Impostazioni Account",
    description: "Profilo personale, organizzazione e gestione team",
    icon: Settings,
    color: "text-slate-600",
    bgColor: "bg-slate-50 dark:bg-slate-800/40",
    articles: [
      { id: "im1", title: "Modificare il profilo personale", excerpt: "Aggiorna nome, email, foto profilo e preferenze di notifica.", readTime: 3 },
      { id: "im2", title: "Gestire i membri del team", excerpt: "Invita nuovi utenti, modifica i ruoli e rimuovi accessi.", readTime: 5 },
      { id: "im3", title: "Personalizzare la pipeline", excerpt: "Aggiungi, rinomina o riordina gli stage della tua pipeline di vendita.", readTime: 4, popular: true },
      { id: "im4", title: "Impostazioni di notifica", excerpt: "Configura email, push e alert in-app per gli eventi importanti.", readTime: 4 },
      { id: "im5", title: "Campi personalizzati globali", excerpt: "Crea campi aggiuntivi per affari, contatti e aziende a livello di organizzazione.", readTime: 6 },
      { id: "im6", title: "Cambiare piano o aggiornare i dati di fatturazione", excerpt: "Come upgradare il piano, aggiornare la carta e scaricare le fatture.", readTime: 4 },
    ],
  },
  {
    id: "sicurezza",
    label: "Sicurezza & Privacy",
    description: "Password, autenticazione a due fattori e protezione dati",
    icon: ShieldCheck,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    articles: [
      { id: "s1", title: "Cambiare la password del tuo account", excerpt: "Come aggiornare la password e scegliere una credenziale sicura.", readTime: 2 },
      { id: "s2", title: "Attivare l'autenticazione a due fattori (2FA)", excerpt: "Proteggi il tuo account con un secondo livello di verifica via app o SMS.", readTime: 5 },
      { id: "s3", title: "Gestione delle sessioni attive", excerpt: "Visualizza i dispositivi connessi e disconnetti le sessioni sospette.", readTime: 3 },
      { id: "s4", title: "Privacy dei dati: cosa raccoglie Pipely", excerpt: "Informativa sulla privacy, GDPR e come vengono trattati i tuoi dati.", readTime: 6 },
      { id: "s5", title: "Esportare o eliminare i tuoi dati", excerpt: "Come richiedere l'export completo dei dati o la cancellazione dell'account.", readTime: 4 },
      { id: "s6", title: "Permessi e ruoli del team", excerpt: "Amministratore, manager, venditore: differenze di accesso e operazioni consentite.", readTime: 5 },
    ],
  },
  {
    id: "integrazioni",
    label: "Integrazioni",
    description: "API, webhook e connessione con app di terze parti",
    icon: Plug,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
    articles: [
      { id: "in1", title: "Panoramica delle integrazioni disponibili", excerpt: "Scopri tutte le app che puoi collegare a Pipely: Gmail, Slack, Zapier e altro.", readTime: 4 },
      { id: "in2", title: "Usare l'API REST di Pipely", excerpt: "Documentazione base per sviluppatori: autenticazione, endpoint principali ed esempi.", readTime: 8, popular: true },
      { id: "in3", title: "Configurare i webhook", excerpt: "Ricevi notifiche in tempo reale nel tuo sistema quando avvengono eventi in Pipely.", readTime: 6 },
      { id: "in4", title: "Integrazione con Google Calendar", excerpt: "Sincronizza le attività di Pipely con il tuo calendario Google.", readTime: 5 },
      { id: "in5", title: "Connettere Pipely a Zapier o Make", excerpt: "Automatizza i flussi tra Pipely e centinaia di altre app senza scrivere codice.", readTime: 5 },
      { id: "in6", title: "Integrazione con strumenti di firma digitale", excerpt: "Collega DocuSign o altri servizi per firmare i contratti direttamente da Pipely.", readTime: 4 },
    ],
  },
  {
    id: "mobile",
    label: "App Mobile",
    description: "Accedi a Pipely da iOS e Android ovunque tu sia",
    icon: Smartphone,
    color: "text-cyan-600",
    bgColor: "bg-cyan-50 dark:bg-cyan-900/20",
    articles: [
      { id: "mo1", title: "Scaricare l'app Pipely su iPhone e Android", excerpt: "Link agli store e requisiti minimi di sistema per l'app mobile.", readTime: 2 },
      { id: "mo2", title: "Funzionalità disponibili sull'app mobile", excerpt: "Cosa puoi fare da mobile: affari, contatti, attività e notifiche push.", readTime: 4 },
      { id: "mo3", title: "Notifiche push: configurazione", excerpt: "Come attivare e personalizzare gli alert sullo smartphone.", readTime: 3 },
      { id: "mo4", title: "Accesso offline: cosa funziona senza connessione", excerpt: "Quali dati sono disponibili offline e come si sincronizzano alla riconnessione.", readTime: 4 },
      { id: "mo5", title: "Aggiungere contatti dalla rubrica del telefono", excerpt: "Importa i contatti direttamente dalla rubrica iOS o Android in Pipely.", readTime: 3 },
      { id: "mo6", title: "Problemi comuni sull'app mobile", excerpt: "Soluzioni per crash, errori di login e problemi di sincronizzazione su mobile.", readTime: 5 },
    ],
  },
  {
    id: "fatturazione",
    label: "Fatturazione & Piani",
    description: "Abbonamenti, pagamenti e gestione del piano",
    icon: CreditCard,
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
    articles: [
      { id: "fa1", title: "Piani disponibili e differenze", excerpt: "Confronto tra i piani Starter, Professional ed Enterprise di Pipely.", readTime: 4, popular: true },
      { id: "fa2", title: "Come effettuare l'upgrade del piano", excerpt: "Passare a un piano superiore: costi, prorata e attivazione immediata.", readTime: 3 },
      { id: "fa3", title: "Metodi di pagamento accettati", excerpt: "Carte di credito, SEPA, bonifico: come aggiornare i dati di pagamento.", readTime: 3 },
      { id: "fa4", title: "Scaricare le fatture e i ricevuti", excerpt: "Dove trovare lo storico pagamenti e come scaricare le fatture in PDF.", readTime: 2 },
      { id: "fa5", title: "Disdire o sospendere l'abbonamento", excerpt: "Come cancellare il piano e cosa succede ai tuoi dati dopo la disdetta.", readTime: 4 },
      { id: "fa6", title: "Sconto per pagamento annuale", excerpt: "Risparmia fino al 20% pagando l'abbonamento annualmente anziché mensilmente.", readTime: 2 },
    ],
  },
  {
    id: "problemi",
    label: "Risoluzione Problemi",
    description: "Errori frequenti, supporto e soluzioni rapide",
    icon: HelpCircle,
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    articles: [
      { id: "pb1", title: "Non riesco ad accedere al mio account", excerpt: "Procedura di recupero password e sblocco account dopo troppi tentativi.", readTime: 3, popular: true },
      { id: "pb2", title: "I dati non si sincronizzano correttamente", excerpt: "Cause comuni di mancata sincronizzazione e come forzare l'aggiornamento.", readTime: 4 },
      { id: "pb3", title: "Errore durante l'importazione dei contatti", excerpt: "Formati CSV supportati, errori di codifica e come correggere i file.", readTime: 5 },
      { id: "pb4", title: "Le email non vengono registrate in Pipely", excerpt: "Problemi di integrazione email: configurazione IMAP/SMTP e risoluzione errori.", readTime: 6 },
      { id: "pb5", title: "La pagina non si carica o è lenta", excerpt: "Come svuotare la cache, verificare la connessione e segnalare un'interruzione.", readTime: 3 },
      { id: "pb6", title: "Contattare il supporto Pipely", excerpt: "Come aprire un ticket, orari del supporto e canali di contatto disponibili.", readTime: 2 },
    ],
  },
  {
    id: "tutorial",
    label: "Tutorial Video",
    description: "Guide video passo-passo per sfruttare Pipely al massimo",
    icon: PlayCircle,
    color: "text-rose-600",
    bgColor: "bg-rose-50 dark:bg-rose-900/20",
    articles: [
      { id: "tv1", title: "Pipely in 5 minuti: la guida rapida", excerpt: "Video introduttivo che mostra le funzionalità principali di Pipely.", readTime: 5, popular: true },
      { id: "tv2", title: "Come configurare la pipeline in video", excerpt: "Walkthrough completo: dalla creazione degli stage alla prima trattativa.", readTime: 8, popular: true },
      { id: "tv3", title: "Gestire i contatti: video tutorial", excerpt: "Come aggiungere, modificare e importare contatti con la guida video.", readTime: 6 },
      { id: "tv4", title: "Automazioni avanzate: webinar registrato", excerpt: "1 ora di webinar con esempi pratici di workflow automatici.", readTime: 60 },
      { id: "tv5", title: "Report e analytics: video demo", excerpt: "Come leggere i grafici, filtrare per periodo ed esportare i dati.", readTime: 10 },
      { id: "tv6", title: "Tour completo dell'app mobile", excerpt: "Tutte le funzionalità dell'app iOS e Android in un video di 7 minuti.", readTime: 7 },
    ],
  },
];

const POPULAR_ARTICLES = CATEGORIES.flatMap((c) =>
  c.articles.filter((a) => a.popular).map((a) => ({ ...a, category: c.label, categoryId: c.id, color: c.color, bgColor: c.bgColor, icon: c.icon }))
).slice(0, 6);

// ─── Sub-components ──────────────────────────────────────────────────────────

function CategoryCard({ cat, onClick }: { cat: Category; onClick: () => void }) {
  const Icon = cat.icon;
  return (
    <button
      onClick={onClick}
      className="group text-left rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-5 hover:border-[var(--crm-primary)]/40 hover:shadow-md transition-all duration-200"
    >
      <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${cat.bgColor} mb-4 group-hover:scale-105 transition-transform`}>
        <Icon className={`h-5 w-5 ${cat.color}`} />
      </div>
      <h3 className="font-semibold text-sm text-[var(--crm-neutral-900)] dark:text-white mb-1 group-hover:text-[var(--crm-primary)] transition-colors">
        {cat.label}
      </h3>
      <p className="text-xs text-[var(--crm-neutral-500)] leading-relaxed">
        {cat.description}
      </p>
      <div className="flex items-center gap-1 mt-3 text-xs font-medium text-[var(--crm-primary)] opacity-0 group-hover:opacity-100 transition-opacity">
        <span>Vedi articoli</span>
        <ChevronRight className="h-3 w-3" />
      </div>
    </button>
  );
}

function ArticleView({ article, cat, onBack }: { article: Article; cat: Category; onBack: () => void }) {
  const Icon = cat.icon;
  return (
    <div className="space-y-6 max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-[var(--crm-neutral-500)]">
        <button onClick={onBack} className="hover:text-[var(--crm-primary)] transition-colors">
          Tutte le categorie
        </button>
        <ChevronRight className="h-3 w-3" />
        <button onClick={onBack} className="hover:text-[var(--crm-primary)] transition-colors">
          {cat.label}
        </button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-[var(--crm-neutral-900)] dark:text-white truncate">{article.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${cat.bgColor}`}>
          <Icon className={`h-6 w-6 ${cat.color}`} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--crm-neutral-900)] dark:text-white leading-snug">
            {article.title}
          </h1>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="flex items-center gap-1 text-xs text-[var(--crm-neutral-400)]">
              <Clock className="h-3 w-3" /> {article.readTime} min di lettura
            </span>
            {article.popular && (
              <span className="flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 text-xs font-medium text-amber-600">
                <Star className="h-2.5 w-2.5" /> Popolare
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {article.blocks ? (
        <div className="rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-6 space-y-5">
          {article.blocks.map((block, i) => {
            if (block.type === "heading") return (
              <h2 key={i} className="text-base font-semibold text-[var(--crm-neutral-900)] dark:text-white pt-2 first:pt-0">
                {block.text}
              </h2>
            );
            if (block.type === "para") return (
              <p key={i} className="text-sm text-[var(--crm-neutral-700)] dark:text-[var(--crm-neutral-300)] leading-relaxed">
                {block.text}
              </p>
            );
            if (block.type === "list") return (
              <ul key={i} className="space-y-1.5 pl-1">
                {block.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-[var(--crm-neutral-700)] dark:text-[var(--crm-neutral-300)]">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--crm-primary)] shrink-0" />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            );
            if (block.type === "steps") return (
              <ol key={i} className="space-y-2 pl-1">
                {block.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-3 text-sm text-[var(--crm-neutral-700)] dark:text-[var(--crm-neutral-300)]">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--crm-primary)]/10 text-[10px] font-bold text-[var(--crm-primary)] mt-0.5">
                      {j + 1}
                    </span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ol>
            );
            if (block.type === "tip") return (
              <div key={i} className="flex items-start gap-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 px-4 py-3">
                <Lightbulb className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">{block.text}</p>
              </div>
            );
            if (block.type === "warning") return (
              <div key={i} className="flex items-start gap-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">{block.text}</p>
              </div>
            );
            if (block.type === "link") return (
              <a key={i} href={block.href} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-[var(--crm-primary)] hover:underline">
                {block.text} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            );
            return null;
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--crm-neutral-200)] dark:border-white/10 p-10 text-center">
          <ListChecks className="h-8 w-8 text-[var(--crm-neutral-300)] mx-auto mb-3" />
          <p className="text-sm font-medium text-[var(--crm-neutral-500)]">Articolo in fase di redazione</p>
          <p className="text-xs text-[var(--crm-neutral-400)] mt-1">Questo contenuto sarà disponibile a breve.</p>
        </div>
      )}

      {/* Footer nav */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-[var(--crm-neutral-500)] hover:text-[var(--crm-primary)] transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Torna a {cat.label}
        </button>
        <div className="flex items-center gap-2 rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] px-4 py-2 text-xs text-[var(--crm-neutral-500)]">
          Questo articolo ti è stato utile?
          <button className="ml-2 text-lg hover:scale-125 transition-transform" title="Sì">👍</button>
          <button className="text-lg hover:scale-125 transition-transform" title="No">👎</button>
        </div>
      </div>
    </div>
  );
}

function ArticleRow({ article, compact = false, onClick }: { article: Article; compact?: boolean; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className="flex items-start gap-3 py-3 border-b border-[var(--crm-neutral-100)] dark:border-white/10 last:border-0 group cursor-pointer hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 -mx-4 px-4 rounded-lg transition-colors"
    >
      <BookOpen className="h-4 w-4 text-[var(--crm-primary)] mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--crm-neutral-900)] dark:text-white group-hover:text-[var(--crm-primary)] transition-colors">
          {article.title}
        </p>
        {!compact && (
          <p className="text-xs text-[var(--crm-neutral-500)] mt-0.5 line-clamp-1">{article.excerpt}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="flex items-center gap-1 text-xs text-[var(--crm-neutral-400)]">
          <Clock className="h-3 w-3" /> {article.readTime} min
        </span>
        {article.popular && (
          <span className="hidden sm:flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 text-xs font-medium text-amber-600">
            <Star className="h-2.5 w-2.5" /> Popolare
          </span>
        )}
        <ChevronRight className="h-3.5 w-3.5 text-[var(--crm-neutral-300)] group-hover:text-[var(--crm-primary)] transition-colors" />
      </div>
    </div>
  );
}

function CategoryDetail({ cat, onBack, onArticleClick }: { cat: Category; onBack: () => void; onArticleClick: (a: Article) => void }) {
  const Icon = cat.icon;
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-[var(--crm-neutral-500)] hover:text-[var(--crm-neutral-900)] dark:hover:text-white transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Tutte le categorie</span>
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${cat.bgColor}`}>
          <Icon className={`h-7 w-7 ${cat.color}`} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--crm-neutral-900)] dark:text-white">{cat.label}</h1>
          <p className="text-sm text-[var(--crm-neutral-500)] mt-0.5">{cat.description}</p>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-5">
        <h2 className="text-sm font-semibold text-[var(--crm-neutral-900)] dark:text-white mb-1">
          {cat.articles.length} articoli in questa categoria
        </h2>
        <p className="text-xs text-[var(--crm-neutral-500)] mb-4">Clicca su un articolo per leggere la guida completa.</p>
        <div>
          {cat.articles.map((a) => (
            <ArticleRow key={a.id} article={a} onClick={() => onArticleClick(a)} />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--crm-primary)]/20 bg-[var(--crm-primary)]/5 p-5 flex items-start gap-4">
        <HelpCircle className="h-5 w-5 text-[var(--crm-primary)] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-[var(--crm-neutral-900)] dark:text-white">
            Non hai trovato quello che cercavi?
          </p>
          <p className="text-xs text-[var(--crm-neutral-500)] mt-1">
            Il nostro team di supporto è disponibile dal lunedì al venerdì, 9:00–18:00 CET.
          </p>
          <button className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[var(--crm-primary)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--crm-primary-dark)] transition-colors">
            <ArrowUpRight className="h-3.5 w-3.5" /> Contatta il supporto
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function GuidaPage() {
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const searchResults = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return [];
    return CATEGORIES.flatMap((c) =>
      c.articles
        .filter((a) => a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q))
        .map((a) => ({ ...a, category: c.label, categoryId: c.id, catIcon: c.icon, color: c.color, bgColor: c.bgColor }))
    );
  }, [search]);

  if (selectedCat && selectedArticle && !search) {
    return (
      <div className="max-w-3xl mx-auto">
        <ArticleView
          article={selectedArticle}
          cat={selectedCat}
          onBack={() => setSelectedArticle(null)}
        />
      </div>
    );
  }

  if (selectedCat && !search) {
    return (
      <div className="max-w-3xl mx-auto space-y-0">
        <CategoryDetail
          cat={selectedCat}
          onBack={() => setSelectedCat(null)}
          onArticleClick={(a) => setSelectedArticle(a)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--crm-primary)] to-indigo-700 px-8 py-10 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 0%, transparent 60%)" }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-5 w-5 opacity-80" />
            <span className="text-sm font-medium opacity-80">Centro Assistenza Pipely</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Come possiamo aiutarti?</h1>
          <p className="text-sm opacity-80 mb-6">Guide, tutorial e risposte per usare Pipely al meglio.</p>

          {/* Search bar */}
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--crm-primary)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca tra gli articoli... (es. &quot;importare contatti&quot;, &quot;pipeline&quot;)"
              className="w-full rounded-xl bg-white text-[var(--crm-neutral-900)] placeholder:text-[var(--crm-neutral-400)] pl-11 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 shadow-lg"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[var(--crm-neutral-100)] text-[var(--crm-neutral-400)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick links */}
          <div className="flex flex-wrap gap-2 mt-4">
            {["Pipeline", "Contatti", "Campagne Email", "Automazioni", "SMTP"].map((tag) => (
              <button
                key={tag}
                onClick={() => setSearch(tag.toLowerCase())}
                className="rounded-full bg-white/15 hover:bg-white/25 px-3 py-1 text-xs font-medium transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search results */}
      {search && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--crm-neutral-900)] dark:text-white">
              {searchResults.length > 0
                ? `${searchResults.length} risultat${searchResults.length === 1 ? "o" : "i"} per "${search}"`
                : `Nessun risultato per "${search}"`}
            </h2>
            <button onClick={() => setSearch("")} className="text-xs text-[var(--crm-neutral-500)] hover:text-[var(--crm-primary)]">
              Annulla ricerca
            </button>
          </div>
          {searchResults.length > 0 ? (
            <div className="rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] divide-y divide-[var(--crm-neutral-100)] dark:divide-white/10">
              {searchResults.map((a) => {
                const Icon = a.catIcon;
                return (
                  <div
                    key={a.id}
                    className="flex items-start gap-4 px-5 py-4 hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 cursor-pointer transition-colors"
                    onClick={() => {
                      const cat = CATEGORIES.find((c) => c.id === a.categoryId);
                      if (cat) {
                        const art = cat.articles.find((x) => x.id === a.id);
                        setSearch(""); setSelectedCat(cat);
                        if (art) setSelectedArticle(art);
                      }
                    }}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${a.bgColor}`}>
                      <Icon className={`h-4 w-4 ${a.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--crm-neutral-900)] dark:text-white">{a.title}</p>
                      <p className="text-xs text-[var(--crm-neutral-500)] mt-0.5 line-clamp-1">{a.excerpt}</p>
                      <span className="text-xs text-[var(--crm-neutral-400)] mt-1 inline-block">{a.category}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[var(--crm-neutral-400)] shrink-0">
                      <Clock className="h-3 w-3" /> {a.readTime} min
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--crm-neutral-200)] dark:border-white/10 p-12 text-center">
              <Search className="h-8 w-8 text-[var(--crm-neutral-300)] mx-auto mb-3" />
              <p className="text-sm font-medium text-[var(--crm-neutral-500)]">Nessun articolo trovato</p>
              <p className="text-xs text-[var(--crm-neutral-400)] mt-1">Prova con parole chiave diverse o sfoglia le categorie qui sotto.</p>
              <button
                onClick={() => setSearch("")}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[var(--crm-primary)] px-4 py-2 text-xs font-medium text-white hover:bg-[var(--crm-primary-dark)] transition-colors"
              >
                Sfoglia le categorie
              </button>
            </div>
          )}
        </div>
      )}

      {!search && (
        <>
          {/* Getting started quick steps */}
          <div className="rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-6">
            <div className="flex items-center gap-2 mb-5">
              <Rocket className="h-4 w-4 text-[var(--crm-primary)]" />
              <h2 className="text-sm font-semibold text-[var(--crm-neutral-900)] dark:text-white">Inizia in 4 passi</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { step: "1", title: "Crea il tuo account", desc: "Registrati e configura la tua organizzazione", icon: CheckCircle2, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-900/20" },
                { step: "2", title: "Importa i contatti", desc: "Porta i tuoi dati esistenti con l'import CSV", icon: Users, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
                { step: "3", title: "Configura la pipeline", desc: "Definisci gli stage del tuo processo di vendita", icon: GitBranch, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
                { step: "4", title: "Inizia a vendere", desc: "Crea i tuoi primi affari e traccia le trattative", icon: ArrowUpRight, color: "text-[var(--crm-primary)]", bg: "bg-[var(--crm-primary)]/10" },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.step} className="flex items-start gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${s.bg}`}>
                      <Icon className={`h-4 w-4 ${s.color}`} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[var(--crm-neutral-900)] dark:text-white">
                        <span className="text-[var(--crm-neutral-400)] mr-1">Passo {s.step} ·</span>{s.title}
                      </p>
                      <p className="text-xs text-[var(--crm-neutral-500)] mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Popular articles */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-[var(--crm-neutral-900)] dark:text-white">Articoli più letti</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {POPULAR_ARTICLES.map((a) => {
                const Icon = a.icon;
                return (
                  <div
                    key={a.id}
                    className="group rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-4 cursor-pointer hover:border-[var(--crm-primary)]/40 hover:shadow-sm transition-all"
                    onClick={() => {
                      const cat = CATEGORIES.find((c) => c.id === a.categoryId);
                      if (cat) {
                        const art = cat.articles.find((x) => x.id === a.id);
                        setSelectedCat(cat);
                        if (art) setSelectedArticle(art);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${a.bgColor}`}>
                        <Icon className={`h-4 w-4 ${a.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--crm-neutral-900)] dark:text-white group-hover:text-[var(--crm-primary)] transition-colors line-clamp-2">
                          {a.title}
                        </p>
                        <p className="text-xs text-[var(--crm-neutral-400)] mt-1">{a.category} · {a.readTime} min</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* All categories */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-4 w-4 text-[var(--crm-primary)]" />
              <h2 className="text-sm font-semibold text-[var(--crm-neutral-900)] dark:text-white">Tutte le categorie</h2>
              <span className="rounded-full bg-[var(--crm-neutral-100)] dark:bg-white/10 px-2 py-0.5 text-xs text-[var(--crm-neutral-500)]">
                {CATEGORIES.length}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {CATEGORIES.map((cat) => (
                <CategoryCard key={cat.id} cat={cat} onClick={() => setSelectedCat(cat)} />
              ))}
            </div>
          </div>

          {/* Support banner */}
          <div className="rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-6 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--crm-primary)]/10">
              <HelpCircle className="h-7 w-7 text-[var(--crm-primary)]" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-[var(--crm-neutral-900)] dark:text-white">
                Hai ancora bisogno di aiuto?
              </h3>
              <p className="text-xs text-[var(--crm-neutral-500)] mt-1">
                Il team di supporto Pipely è disponibile dal lunedì al venerdì, 9:00–18:00 CET.
                Puoi anche consultare la nostra community o guardare i tutorial video.
              </p>
            </div>
            <div className="flex gap-2 shrink-0 flex-wrap justify-center">
              <button
                onClick={() => setSelectedCat(CATEGORIES.find((c) => c.id === "tutorial")!)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--crm-neutral-100)] dark:border-white/10 px-3 py-2 text-xs font-medium text-[var(--crm-neutral-700)] dark:text-white hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 transition-colors"
              >
                <PlayCircle className="h-3.5 w-3.5 text-rose-600" /> Video tutorial
              </button>
              <button className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--crm-primary)] px-3 py-2 text-xs font-medium text-white hover:bg-[var(--crm-primary-dark)] transition-colors">
                <ArrowUpRight className="h-3.5 w-3.5" /> Contatta il supporto
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
