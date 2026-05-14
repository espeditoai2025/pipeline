export type Settore = {
  slug: string;
  nome: string;
  h1: string;
  description: string;
  badge: string;
  tagline: string;
  painPoints: { emoji: string; title: string; description: string }[];
  faqs: { q: string; a: string }[];
  stats: { value: string; label: string }[];
};

export const SETTORI: Settore[] = [
  {
    slug: "crm-per-agenti-di-commercio",
    nome: "Agenti di Commercio",
    h1: "CRM per Agenti di Commercio: pipeline, clienti e provvigioni",
    description: "Il CRM pensato per agenti di commercio italiani. Gestisci clienti, trattative, visite e provvigioni in un unico strumento. Gratis nel piano Starter.",
    badge: "CRM per Agenti di Commercio",
    tagline: "Tutto il tuo portafoglio clienti sempre sotto controllo.",
    painPoints: [
      { emoji: "📋", title: "Clienti e trattative su foglietti e Excel", description: "I tuoi clienti sono sparsi tra block note, email e fogli Excel. Quando sei in trasferta non trovi le informazioni che ti servono al momento giusto." },
      { emoji: "🔔", title: "Perdi ordini per follow-up mancati", description: "Un cliente ti ha chiesto un preventivo, ma tre settimane dopo non l'hai ancora ricontattato. L'ordine è andato alla concorrenza." },
      { emoji: "📊", title: "Non riesci a prevedere le provvigioni", description: "Senza una pipeline chiara, è impossibile stimare i ricavi del mese prossimo e pianificare gli spostamenti in modo efficiente." },
    ],
    faqs: [
      { q: "Posso usare Pipely anche da smartphone in trasferta?", a: "Sì. Pipely è ottimizzato per mobile e funziona su qualsiasi browser dello smartphone. Puoi aggiornare le trattative, aggiungere note e creare attività anche mentre sei dal cliente." },
      { q: "Posso gestire più mandanti con Pipely?", a: "Puoi creare pipeline separate per mandante diverso o usare tag per distinguere i clienti per mandante. Il piano Pro permette pipeline illimitate." },
      { q: "Pipely si integra con i gestionali ordini?", a: "Pipely ha un'API aperta che permette l'integrazione con gestionali esterni tramite webhook e Zapier. Per integrazioni personalizzate, contattaci." },
    ],
    stats: [
      { value: "0€", label: "Piano Starter" },
      { value: "5 min", label: "Setup iniziale" },
      { value: "100%", label: "In italiano" },
      { value: "Mobile", label: "Sempre con te" },
    ],
  },
  {
    slug: "crm-per-studi-legali",
    nome: "Studi Legali",
    h1: "CRM per Studi Legali: gestisci clienti e pratiche in modo professionale",
    description: "CRM italiano per avvocati e studi legali. Traccia clienti, contatti, follow-up e comunicazioni. Semplice, sicuro, 100% in italiano.",
    badge: "CRM per Avvocati e Studi Legali",
    tagline: "Più tempo per i clienti, meno tempo per l'organizzazione.",
    painPoints: [
      { emoji: "📁", title: "Clienti e pratiche difficili da tracciare", description: "Ogni pratica coinvolge più persone, scadenze diverse e comunicazioni distribuite su email e telefono. Tenere tutto sotto controllo richiede troppo sforzo." },
      { emoji: "⏰", title: "Scadenze a rischio per mancanza di promemoria", description: "Un'udienza mancata o un termine scaduto per dimenticanza è un problema serio. Affidarsi alla memoria umana non è sostenibile." },
      { emoji: "📧", title: "Comunicazioni non tracciate con i clienti", description: "Non ricordi quando hai parlato l'ultima volta con un cliente o cosa è stato concordato. Ogni telefonata riparte da zero." },
    ],
    faqs: [
      { q: "Pipely è adatto per uno studio legale con pochi avvocati?", a: "Sì. Pipely è progettato per team piccoli (1-20 persone) e si adatta bene a studi legali che vogliono organizzare clienti, comunicazioni e attività senza strumenti complessi." },
      { q: "I dati dei clienti sono al sicuro?", a: "Sì. I dati sono crittografati in transito (HTTPS/TLS) e a riposo. Il database è su infrastruttura europea. Per i dettagli consulta la nostra Privacy Policy." },
    ],
    stats: [
      { value: "0€", label: "Piano Starter" },
      { value: "HTTPS", label: "Dati crittografati" },
      { value: "100%", label: "In italiano" },
      { value: "UE", label: "Server in Europa" },
    ],
  },
  {
    slug: "crm-per-commercialisti",
    nome: "Commercialisti",
    h1: "CRM per Commercialisti: clienti, scadenze e comunicazioni organizzati",
    description: "Il CRM italiano per studi di commercialisti e consulenti fiscali. Gestisci il portafoglio clienti, pianifica attività e tieni traccia di ogni comunicazione.",
    badge: "CRM per Commercialisti e CAF",
    tagline: "Il tuo studio più organizzato, i tuoi clienti più soddisfatti.",
    painPoints: [
      { emoji: "📅", title: "Scadenze fiscali difficili da gestire su molti clienti", description: "Hai decine di clienti con scadenze diverse: 730, IVA, F24, bilanci. Tenere tutto sotto controllo con Excel è diventato rischioso." },
      { emoji: "📞", title: "Clienti che ti chiamano senza che tu ricordi il contesto", description: "Un cliente chiama e non ricordi immediatamente la sua situazione, l'ultimo documento inviato o l'ultima comunicazione avuta." },
      { emoji: "📋", title: "Onboarding nuovi clienti lento e disorganizzato", description: "Raccogliere i documenti per un nuovo cliente richiede troppe email avanti e indietro. Non c'è un processo standardizzato." },
    ],
    faqs: [
      { q: "Posso usare Pipely per gestire le scadenze fiscali dei clienti?", a: "Puoi creare attività con scadenza per ogni cliente e ricevere notifiche in anticipo. La pipeline può essere usata per tracciare lo stato delle pratiche (es. Documenti raccolti → In lavorazione → Inviato)." },
      { q: "Posso invitare i miei collaboratori di studio?", a: "Sì. Il piano Pro permette l'accesso multi-utente con ruoli differenziati: Admin, Manager, Sales e Viewer. Puoi assegnare i clienti a collaboratori specifici." },
    ],
    stats: [
      { value: "0€", label: "Piano Starter" },
      { value: "Multi-utente", label: "Piano Pro" },
      { value: "100%", label: "In italiano" },
      { value: "5 min", label: "Setup" },
    ],
  },
  {
    slug: "crm-per-architetti",
    nome: "Architetti e Studi Tecnici",
    h1: "CRM per Architetti e Studi Tecnici: clienti e commesse organizzate",
    description: "CRM italiano per architetti, ingegneri e studi tecnici. Gestisci clienti, commesse e comunicazioni in modo semplice e professionale.",
    badge: "CRM per Studi di Architettura",
    tagline: "Concentrati sul progetto, non sull'organizzazione.",
    painPoints: [
      { emoji: "🏗️", title: "Commesse e clienti confusi tra loro", description: "Con più commesse attive in parallelo, le comunicazioni con i clienti si intrecciano e diventa difficile tenere traccia di chi ha chiesto cosa e quando." },
      { emoji: "💼", title: "Preventivi inviati e poi dimenticati", description: "Hai mandato un preventivo a un potenziale cliente tre settimane fa. Non hai fatto follow-up. L'incarico è andato a un altro studio." },
      { emoji: "📄", title: "Nessuna visione sui clienti potenziali in attesa", description: "Non sai quanti preventivi aperti hai, il loro valore totale o in quale fase si trovano. Impossibile fare previsioni sul fatturato futuro." },
    ],
    faqs: [
      { q: "Pipely funziona per studi tecnici mono-professionista?", a: "Assolutamente. Il piano Starter è gratuito per sempre ed è ideale per un professionista singolo che vuole organizzare i propri clienti e commesse senza costi." },
      { q: "Posso collegare clienti privati e aziende nello stesso CRM?", a: "Sì. Pipely gestisce sia contatti privati (persona fisica) che aziende, con la possibilità di collegare persone fisiche all'azienda di appartenenza." },
    ],
    stats: [
      { value: "0€", label: "Piano Starter" },
      { value: "5 min", label: "Setup" },
      { value: "100%", label: "In italiano" },
      { value: "Illimitati", label: "Contatti nel Pro" },
    ],
  },
  {
    slug: "crm-per-agenzie-viaggio",
    nome: "Agenzie di Viaggio",
    h1: "CRM per Agenzie di Viaggio: clienti, preventivi e viaggi organizzati",
    description: "CRM italiano per agenzie di viaggio e tour operator. Gestisci clienti, preventivi e follow-up. Piano gratuito disponibile.",
    badge: "CRM per Agenzie di Viaggio",
    tagline: "Più prenotazioni, meno caos organizzativo.",
    painPoints: [
      { emoji: "✈️", title: "Clienti che non prenotano per mancanza di follow-up", description: "Un cliente ha chiesto un preventivo per il viaggio di nozze. Tre giorni dopo non l'hai ricontattato. Ha prenotato altrove." },
      { emoji: "📅", title: "Scadenze pagamenti e pratiche difficili da gestire", description: "Con decine di pratiche in corso, le scadenze dei pagamenti e i check-in delle partenze si sovrappongono e si perde qualcosa." },
      { emoji: "🔄", title: "Clienti fedeli che non tornano per mancanza di nurturing", description: "I tuoi clienti soddisfatti potrebbero prenotare di nuovo, ma non li ricontatti sistematicamente. Il passaparola non si attiva da solo." },
    ],
    faqs: [
      { q: "Posso gestire le pratiche dei clienti per destinazione?", a: "Puoi usare tag e categorie per organizzare i clienti per destinazione, tipologia di viaggio o status della pratica. La pipeline può riflettere le fasi del processo (richiesta → preventivo → acconto → saldo → partenza)." },
      { q: "Pipely mi avvisa delle scadenze imminenti?", a: "Sì. Puoi creare attività con scadenza per ogni cliente e ricevere notifiche via email o nell'app. Puoi anche impostare automazioni che creano promemoria automatici." },
    ],
    stats: [
      { value: "0€", label: "Piano Starter" },
      { value: "5 min", label: "Setup" },
      { value: "100%", label: "In italiano" },
      { value: "Notifiche", label: "Scadenze automatiche" },
    ],
  },
  {
    slug: "crm-per-formazione-e-coaching",
    nome: "Formatori e Coach",
    h1: "CRM per Coach e Formatori: clienti, corsi e follow-up gestiti",
    description: "CRM italiano per coach, formatori e consulenti. Gestisci lead, clienti, sessioni e comunicazioni in un unico strumento semplice.",
    badge: "CRM per Coaching e Formazione",
    tagline: "Più tempo per formare, meno tempo per organizzarti.",
    painPoints: [
      { emoji: "🎯", title: "Lead interessati che non si convertono", description: "Qualcuno ti ha contattato per un corso, hai risposto, e poi il silenzio. Non sai quanti lead attivi hai e a che punto è ciascuno." },
      { emoji: "📆", title: "Difficile tenere traccia dei clienti attivi vs. ex-clienti", description: "Chi ha fatto quale corso? Chi è ancora in percorso? Chi ha completato e potrebbe fare upsell su un programma avanzato?" },
      { emoji: "📬", title: "Comunicazioni post-corso non strutturate", description: "Dopo un corso non c'è un sistema per raccogliere feedback, proporre follow-up o offrire prodotti complementari ai partecipanti." },
    ],
    faqs: [
      { q: "Posso usare Pipely per gestire i miei corsisti e sessioni one-to-one?", a: "Sì. Puoi creare un contatto per ogni cliente, collegarlo agli affari (es. un percorso di coaching) e usare le attività per pianificare le sessioni e i follow-up." },
      { q: "Posso inviare email ai miei iscritti direttamente da Pipely?", a: "Con il piano Pro puoi inviare campagne email con tracking aperture e click. È utile per comunicazioni post-corso, newsletter o offerte speciali." },
    ],
    stats: [
      { value: "0€", label: "Piano Starter" },
      { value: "Email", label: "Marketing incluso Pro" },
      { value: "100%", label: "In italiano" },
      { value: "Mobile", label: "Ovunque" },
    ],
  },
  {
    slug: "crm-per-eventi-e-wedding-planner",
    nome: "Organizzatori di Eventi",
    h1: "CRM per Wedding Planner ed Organizzatori di Eventi",
    description: "CRM italiano per wedding planner, event manager e organizzatori di eventi. Gestisci clienti, preventivi, fornitori e scadenze in un solo posto.",
    badge: "CRM per Wedding & Events",
    tagline: "Ogni evento al suo posto, ogni cliente al primo posto.",
    painPoints: [
      { emoji: "💍", title: "Preventivi e dettagli di ogni evento confusi tra loro", description: "Gestisci 5 matrimoni in contemporanea, ciascuno con dettagli, fornitori e scadenze diverse. Tenere tutto in testa è impossibile." },
      { emoji: "📞", title: "Follow-up con coppie e clienti business non sistematici", description: "Una coppia ha chiesto un preventivo per il matrimonio. Dopo due settimane non le hai ancora ricontattate. Hanno firmato con un altro." },
      { emoji: "💳", title: "Scadenze pagamenti e acconti difficili da monitorare", description: "Acconti, saldi, pagamenti fornitori: senza un sistema centralizzato, si perde qualcosa. E perdere un pagamento è stressante." },
    ],
    faqs: [
      { q: "Posso tracciare sia clienti privati (sposi) che aziende (corporate events)?", a: "Sì. Pipely gestisce sia contatti privati che aziende, con pipeline separate o tag per distinguere i tipi di evento." },
      { q: "Posso allegare file e contratti ai clienti?", a: "Puoi aggiungere link e note ai profili clienti. Per allegati diretti, la funzionalità è in roadmap per i prossimi aggiornamenti." },
    ],
    stats: [
      { value: "0€", label: "Piano Starter" },
      { value: "Pipeline", label: "Multi-evento" },
      { value: "100%", label: "In italiano" },
      { value: "5 min", label: "Setup" },
    ],
  },
  {
    slug: "crm-per-msp-e-it-services",
    nome: "MSP e Servizi IT",
    h1: "CRM per MSP e Aziende IT: clienti, contratti e opportunità gestiti",
    description: "CRM italiano per Managed Service Provider, system integrator e aziende IT. Pipeline vendite, gestione clienti e automazioni per il settore tech.",
    badge: "CRM per MSP e IT Services",
    tagline: "Gestisci clienti IT con la stessa cura con cui gestisci i loro sistemi.",
    painPoints: [
      { emoji: "🖥️", title: "Rinnovi contratti e licenze senza sistema di allerta", description: "Un cliente non rinnova il contratto di manutenzione perché nessuno lo ha ricontattato in tempo. Entrate ricorrenti perse." },
      { emoji: "📊", title: "Pipeline vendite non tracciata su progetti e upsell", description: "Opportunità di upgrade, nuovi progetti e referral non vengono gestite in modo strutturato. Il fatturato potenziale non si realizza." },
      { emoji: "🔄", title: "Handoff vendite-tecnico senza passaggio di contesto", description: "Il commerciale chiude il contratto ma il tecnico non sa nulla del cliente: storico, promesse fatte, esigenze specifiche." },
    ],
    faqs: [
      { q: "Pipely si integra con strumenti di ticketing come Zendesk o Freshdesk?", a: "Pipely ha webhook e API aperta che permette integrazioni con strumenti esterni tramite Zapier. L'integrazione nativa con ticketing è in roadmap." },
      { q: "Posso gestire contratti ricorrenti e rinnovi nel CRM?", a: "Puoi creare attività ricorrenti per i rinnovi e usare automazioni per notificare il team prima della scadenza. La pipeline può modellare il ciclo del rinnovo." },
    ],
    stats: [
      { value: "API", label: "Integrazioni aperte" },
      { value: "0€", label: "Piano Starter" },
      { value: "100%", label: "In italiano" },
      { value: "Multi-utente", label: "Collaborazione team" },
    ],
  },
  {
    slug: "crm-per-telecomunicazioni",
    nome: "Telecomunicazioni",
    h1: "CRM per Agenti Telecomunicazioni: lead, offerte e rinnovi",
    description: "CRM italiano per agenti e rivenditori nel settore telecomunicazioni. Pipeline offerte, gestione lead e automazioni follow-up.",
    badge: "CRM per Telco",
    tagline: "Più attivazioni, meno opportunità perse.",
    painPoints: [
      { emoji: "📱", title: "Lead da fonti diverse impossibili da gestire", description: "Lead dal sito, da campagne, da passaparola, da fiere: senza un sistema centralizzato si perdono opportunità e si lavora in modo disorganizzato." },
      { emoji: "🔄", title: "Follow-up sui rinnovi non sistematico", description: "Clienti a scadenza contratto che non vengono ricontattati in tempo migrano alla concorrenza. Entrate ricorrenti perse per mancanza di sistema." },
      { emoji: "📊", title: "Impossibile prevedere le attivazioni mensili", description: "Senza una pipeline strutturata, è impossibile stimare le attivazioni del mese prossimo e pianificare l'attività commerciale." },
    ],
    faqs: [
      { q: "Posso gestire sia clienti business che consumer con Pipely?", a: "Sì. Puoi creare pipeline separate per i due segmenti o usare tag per distinguerli. I form e le note possono essere adattati ai dati rilevanti per ciascun tipo." },
      { q: "Posso importare i clienti esistenti dal mio gestionale attuale?", a: "Sì. Pipely accetta import da CSV ed Excel. Esporta i clienti dal tuo gestionale attuale e importali in Pipely con il wizard guidato." },
    ],
    stats: [
      { value: "0€", label: "Piano Starter" },
      { value: "Pipeline", label: "Multi-segmento" },
      { value: "100%", label: "In italiano" },
      { value: "Import", label: "Da Excel/CSV" },
    ],
  },
  {
    slug: "crm-per-retail-e-negozi",
    nome: "Retail e Negozi",
    h1: "CRM per Retail: gestisci clienti fedeli e aumenta il ritorno",
    description: "CRM italiano per negozi, retailer e punti vendita. Tieni traccia dei clienti abituali, gestisci campagne email e aumenta la fidelizzazione.",
    badge: "CRM per Retail",
    tagline: "Clienti che tornano, perché li ricordi.",
    painPoints: [
      { emoji: "🛍️", title: "Clienti abituali senza storia acquisti tracciata", description: "Il tuo cliente più fedele entra in negozio e non ricordi le sue preferenze, l'ultimo acquisto o il suo compleanno. Un'occasione di personalizzazione persa." },
      { emoji: "📬", title: "Comunicazioni promozionali non mirate", description: "Invii la stessa email a tutti i tuoi clienti senza segmentazione. Il tasso di apertura è basso e molti si disiscriscono." },
      { emoji: "🔄", title: "Clienti che smettono di venire senza che tu te ne accorga", description: "Non hai un sistema che ti avvisi quando un cliente abituale non compra da 60 giorni. Non riesci a recuperarli in tempo." },
    ],
    faqs: [
      { q: "Pipely è adatto per un piccolo negozio con pochi clienti?", a: "Assolutamente. Il piano Starter gratuito è perfetto per un negozio che vuole iniziare a tracciare i clienti abituali, le loro preferenze e gestire comunicazioni personalizzate." },
      { q: "Posso inviare email promozionali ai clienti con Pipely?", a: "Sì. Il piano Pro include campagne email con editor, tracking aperture e click, e gestione liste di contatti. Puoi segmentare per categoria cliente." },
    ],
    stats: [
      { value: "0€", label: "Piano Starter" },
      { value: "Email", label: "Marketing nel Pro" },
      { value: "100%", label: "In italiano" },
      { value: "5 min", label: "Setup" },
    ],
  },
  {
    slug: "crm-per-risorse-umane",
    nome: "Risorse Umane e Recruiting",
    h1: "CRM per HR e Recruiting: candidati, aziende e pipeline di selezione",
    description: "CRM italiano per professionisti HR e recruiter. Gestisci candidati, aziende clienti e pipeline di selezione in un unico strumento.",
    badge: "CRM per HR e Recruiting",
    tagline: "Le persone giuste, al posto giusto, al momento giusto.",
    painPoints: [
      { emoji: "👥", title: "Candidati sparsi tra email e fogli Excel", description: "I CV arrivano via email, LinkedIn, portali. Tenere traccia di tutti i candidati per ogni posizione aperta è caotico e time-consuming." },
      { emoji: "📋", title: "Nessuna visione sulle posizioni in corso", description: "Quante posizioni stai gestendo? A che punto è ciascuna? Quanti candidati sono in shortlist? Senza pipeline, è impossibile rispondere." },
      { emoji: "🤝", title: "Relazioni con aziende clienti non coltivate", description: "Le aziende che ti danno incarichi sono clienti che vanno coltivati. Senza un sistema di follow-up, i rapporti si raffreddano tra un incarico e l'altro." },
    ],
    faqs: [
      { q: "Posso usare Pipely sia per tracking candidati che per gestire le aziende clienti?", a: "Sì. Puoi creare due pipeline separate: una per il processo di selezione (candidati) e una per il ciclo commerciale (aziende clienti). I contatti possono essere collegati alle rispettive aziende." },
      { q: "È possibile collaborare con più recruiter sullo stesso account?", a: "Sì. Il piano Pro permette multi-utente con assegnazione candidati/deal ai singoli recruiter." },
    ],
    stats: [
      { value: "0€", label: "Piano Starter" },
      { value: "Pipeline", label: "Multipla" },
      { value: "100%", label: "In italiano" },
      { value: "Multi-utente", label: "Lavora in team" },
    ],
  },
  {
    slug: "crm-per-installatori",
    nome: "Installatori e Impiantisti",
    h1: "CRM per Installatori e Impiantisti: preventivi, clienti e cantieri",
    description: "CRM italiano per installatori, idraulici, elettricisti e impiantisti. Gestisci preventivi, clienti e interventi in modo semplice, anche da mobile.",
    badge: "CRM per Installatori",
    tagline: "Meno carta, più lavoro fatto.",
    painPoints: [
      { emoji: "🔧", title: "Preventivi inviati e poi dimenticati", description: "Hai mandato un preventivo per un impianto fotovoltaico. Due settimane dopo il cliente non ha risposto e tu non hai fatto follow-up. Lavoro perso." },
      { emoji: "📞", title: "Clienti che richiamano senza che tu ricordi il contesto", description: "Un cliente ti chiama e non ricordi quale intervento hai fatto l'anno scorso, cosa è stato installato o se c'è una garanzia in corso." },
      { emoji: "📅", title: "Interventi di manutenzione non pianificati sistematicamente", description: "I tuoi clienti hanno contratti di manutenzione annuale, ma non hai un sistema che ti avvisi quando è il momento di ricontattarli." },
    ],
    faqs: [
      { q: "Posso usare Pipely dal cantiere con lo smartphone?", a: "Sì. Pipely è ottimizzato per mobile. Puoi aggiornare lo stato di un intervento, aggiungere note e creare attività direttamente dallo smartphone, anche con una mano sola." },
      { q: "Come gestisco i preventivi aperti in Pipely?", a: "Puoi creare una pipeline con stage tipo: Richiesta → Sopralluogo → Preventivo inviato → Confermato → In lavorazione → Completato. Ogni preventivo è un affare con valore e data di scadenza." },
    ],
    stats: [
      { value: "0€", label: "Piano Starter" },
      { value: "Mobile", label: "Sempre in cantiere" },
      { value: "100%", label: "In italiano" },
      { value: "5 min", label: "Setup" },
    ],
  },
  {
    slug: "crm-per-dentisti-e-cliniche",
    nome: "Dentisti e Cliniche",
    h1: "CRM per Dentisti e Cliniche: pazienti, preventivi e richiami",
    description: "CRM italiano per studi dentistici e cliniche. Gestisci i contatti dei pazienti, i preventivi e le comunicazioni di richiamo in modo semplice.",
    badge: "CRM per Studi Dentistici",
    tagline: "Pazienti soddisfatti che tornano e portano altri.",
    painPoints: [
      { emoji: "🦷", title: "Pazienti che non tornano per i controlli periodici", description: "Hai centinaia di pazienti che non vengono a fare la profilassi da anni. Non hai un sistema per ricordarti di contattarli." },
      { emoji: "💰", title: "Preventivi di piani di cura non seguiti", description: "Hai presentato un piano di cura implantologico da €8.000. Il paziente ha detto 'ci penso'. Tre mesi dopo non l'hai più sentito." },
      { emoji: "📋", title: "Gestione contatti non strutturata", description: "I contatti dei pazienti sono nel gestionale clinico ma non hai modo di tracciare le comunicazioni commerciali, i follow-up preventivi e le campagne di richiamo." },
    ],
    faqs: [
      { q: "Pipely si affianca al software gestionale dello studio?", a: "Sì. Pipely non sostituisce il software clinico/gestionale ma lo affianca per la parte CRM: follow-up preventivi, gestione lead, campagne di richiamo e comunicazioni non cliniche." },
      { q: "Posso inviare email di richiamo ai pazienti da Pipely?", a: "Sì. Con il piano Pro puoi creare campagne email per richiami periodici, aggiornamenti promozionali o comunicazioni di benvenuto ai nuovi pazienti." },
    ],
    stats: [
      { value: "0€", label: "Piano Starter" },
      { value: "Email", label: "Richiami automatici" },
      { value: "100%", label: "In italiano" },
      { value: "GDPR", label: "Compliant" },
    ],
  },
  {
    slug: "crm-per-palestre-e-wellness",
    nome: "Palestre e Wellness",
    h1: "CRM per Palestre e Centri Wellness: iscritti, lead e rinnovi",
    description: "CRM italiano per palestre, centri fitness e wellness. Gestisci lead, iscritti, rinnovi abbonamenti e campagne email. Piano Starter gratuito.",
    badge: "CRM per Fitness & Wellness",
    tagline: "Più iscritti, meno abbandoni.",
    painPoints: [
      { emoji: "🏋️", title: "Lead da social e sito non gestiti sistematicamente", description: "Ogni giorno arrivano richieste di informazioni dal sito, Instagram e WhatsApp. Senza un sistema, molti vengono gestiti in ritardo o persi." },
      { emoji: "🔄", title: "Rinnovi abbonamenti non proattivi", description: "Gli abbonamenti scadono e aspetti che sia il cliente a rinnovarsi. Molti non lo fanno — non perché siano insoddisfatti, ma per inerzia." },
      { emoji: "😕", title: "Iscritti inattivi che abbandonano senza preavviso", description: "Un iscritto non viene da 3 settimane. Se non lo ricontatti, probabilmente non rinnova. Ma non sai chi è inattivo finché non è troppo tardi." },
    ],
    faqs: [
      { q: "Pipely si integra con il software di gestione abbonamenti?", a: "Pipely ha webhook e API aperta. Se il tuo gestionale supporta export CSV, puoi importare i contatti regolarmente. Per integrazioni in tempo reale, usa Zapier." },
      { q: "Posso inviare promozioni stagionali ai miei iscritti con Pipely?", a: "Sì. Con il piano Pro puoi creare campagne email per promozioni, rinnovi anticipati o eventi speciali. Il tracking mostra chi apre e chi clicca." },
    ],
    stats: [
      { value: "0€", label: "Piano Starter" },
      { value: "Email", label: "Campagne Pro" },
      { value: "100%", label: "In italiano" },
      { value: "Mobile", label: "Gestisci ovunque" },
    ],
  },
  {
    slug: "crm-per-immobiliare",
    nome: "Immobiliare",
    h1: "CRM per il Settore Immobiliare: clienti, immobili e trattative",
    description: "CRM italiano per professionisti immobiliari, agenti e gestori di patrimoni. Gestisci acquirenti, venditori, affitti e trattative in modo semplice.",
    badge: "CRM per Real Estate",
    tagline: "Ogni immobile ha il suo cliente. Trovalo prima.",
    painPoints: [
      { emoji: "🏠", title: "Acquirenti e venditori sparsi senza sistema", description: "Le schede dei clienti sono su block note, email e Excel. Quando cambia qualcosa in un immobile, non riesci a notificare rapidamente chi potrebbe essere interessato." },
      { emoji: "⏰", title: "Follow-up mancati su trattative in corso", description: "Un acquirente interessato non sente nulla da una settimana. Ha visitato altri immobili e potrebbe comprare altrove." },
      { emoji: "📊", title: "Nessuna visione sul portafoglio trattative", description: "Quante trattative sono in corso? Qual è il valore totale? Quante sono ferme? Senza pipeline, impossible avere risposta." },
    ],
    faqs: [
      { q: "Posso usare Pipely per gestire sia acquisti che affitti?", a: "Sì. Puoi creare pipeline separate per compravendite e affitti, con stage personalizzati per ciascun processo. I contatti possono essere taggati per tipo (acquirente, venditore, locatario, proprietario)." },
      { q: "Posso collegare un immobile a più potenziali acquirenti?", a: "Puoi creare un affare per ogni trattativa e collegarlo al contatto dell'acquirente. Se più persone sono interessate allo stesso immobile, crei un affare separato per ognuna." },
    ],
    stats: [
      { value: "0€", label: "Piano Starter" },
      { value: "Pipeline", label: "Multi-tipo" },
      { value: "100%", label: "In italiano" },
      { value: "5 min", label: "Setup" },
    ],
  },
];

export function getSettore(slug: string): Settore | undefined {
  return SETTORI.find((s) => s.slug === slug);
}
