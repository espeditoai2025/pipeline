import type { EmailThread, EmailMessage, EmailTemplate } from "@/types/emails";

const ME = "mario@acme.com";
const ME_NAME = "Mario Rossi";

function daysAgo(n: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

const THREAD_MESSAGES: Record<string, EmailMessage[]> = {
  "thread-1": [
    {
      id: "msg-1a", threadId: "thread-1",
      subject: "Proposta Pipely Enterprise — Acme S.r.l.",
      body: `Gentile Luca,\n\ncome concordato in chiamata, allego la proposta commerciale per l'implementazione di Pipely Enterprise.\n\nIl pacchetto include:\n• Licenze per 20 utenti\n• Onboarding e formazione (3 giorni)\n• Supporto dedicato 12 mesi\n• Personalizzazioni su richiesta\n\nPrezzo totale: €48.000 + IVA\n\nResto a disposizione per qualsiasi chiarimento.\n\nCordiali saluti,\nMario`,
      from: ME, fromName: ME_NAME, to: ["luca.bianchi@acme.it"], cc: [],
      status: "SENT", tracking: "OPENED", openedAt: daysAgo(4, 14), clickedAt: null,
      sentAt: daysAgo(5, 9), createdAt: daysAgo(5, 9),
      dealId: "deal-1", dealTitle: "Pipely Enterprise Acme", contactId: "cnt-1", contactName: "Luca Bianchi",
    },
    {
      id: "msg-1b", threadId: "thread-1",
      subject: "RE: Proposta Pipely Enterprise — Acme S.r.l.",
      body: `Ciao Mario,\n\ngrazie per la proposta. L'ho condivisa con il nostro CFO.\n\nAvremmo bisogno di chiarimenti sul piano di formazione: è possibile estenderlo a 5 giorni? E il supporto include assistenza nel weekend?\n\nAttendo risposta.\n\nLuca`,
      from: "luca.bianchi@acme.it", fromName: "Luca Bianchi", to: [ME], cc: [],
      status: "RECEIVED", tracking: "NONE", openedAt: null, clickedAt: null,
      sentAt: daysAgo(4, 11), createdAt: daysAgo(4, 11),
      dealId: "deal-1", dealTitle: "Pipely Enterprise Acme", contactId: "cnt-1", contactName: "Luca Bianchi",
    },
    {
      id: "msg-1c", threadId: "thread-1",
      subject: "RE: Proposta Pipely Enterprise — Acme S.r.l.",
      body: `Ciao Luca,\n\nottime domande. Possiamo sicuramente estendere la formazione a 5 giorni con un piccolo supplemento di €2.000.\n\nPer il supporto weekend, lo includiamo nel pacchetto Enterprise senza costi aggiuntivi.\n\nPosso fissare una call domani pomeriggio per discutere i dettagli?\n\nMario`,
      from: ME, fromName: ME_NAME, to: ["luca.bianchi@acme.it"], cc: [],
      status: "SENT", tracking: "SENT", openedAt: null, clickedAt: null,
      sentAt: daysAgo(3, 16), createdAt: daysAgo(3, 16),
      dealId: "deal-1", dealTitle: "Pipely Enterprise Acme", contactId: "cnt-1", contactName: "Luca Bianchi",
    },
  ],
  "thread-2": [
    {
      id: "msg-2a", threadId: "thread-2",
      subject: "Offerta Consulenza Q3 — Beta Consulting",
      body: `Gentile Marco,\n\nfaccio seguito alla nostra riunione di ieri. In allegato trovate l'offerta per la consulenza Q3.\n\nSomma: €15.000 per 3 mesi, con revisione mensile degli obiettivi.\n\nMario`,
      from: ME, fromName: ME_NAME, to: ["marco@betaconsulting.it"], cc: ["sofia.ferrari@acme.it"],
      status: "SENT", tracking: "CLICKED", openedAt: daysAgo(2, 10), clickedAt: daysAgo(2, 10),
      sentAt: daysAgo(3, 9), createdAt: daysAgo(3, 9),
      dealId: "deal-2", dealTitle: "Consulenza Beta Q3", contactId: "cnt-3", contactName: "Marco Ricci",
    },
    {
      id: "msg-2b", threadId: "thread-2",
      subject: "RE: Offerta Consulenza Q3 — Beta Consulting",
      body: `Ciao Mario,\n\nperfetto, procediamo. Possiamo firmare il contratto la settimana prossima?\n\nMarco`,
      from: "marco@betaconsulting.it", fromName: "Marco Ricci", to: [ME], cc: [],
      status: "RECEIVED", tracking: "NONE", openedAt: null, clickedAt: null,
      sentAt: daysAgo(2, 15), createdAt: daysAgo(2, 15),
      dealId: "deal-2", dealTitle: "Consulenza Beta Q3", contactId: "cnt-3", contactName: "Marco Ricci",
    },
  ],
  "thread-3": [
    {
      id: "msg-3a", threadId: "thread-3",
      subject: "Follow-up demo ERP — Gamma Industrie",
      body: `Gentile Roberto,\n\ngrazie per il tempo dedicatoci ieri durante la demo.\n\nCome da richiesta, vi invio il documento tecnico con le specifiche dell'integrazione ERP.\n\nResto a disposizione.\nMario`,
      from: ME, fromName: ME_NAME, to: ["r.esposito@gammaindustrie.it"], cc: [],
      status: "SENT", tracking: "OPENED", openedAt: daysAgo(0, 9), clickedAt: null,
      sentAt: daysAgo(1, 8), createdAt: daysAgo(1, 8),
      dealId: "deal-3", dealTitle: "Fornitura ERP Gamma", contactId: "cnt-5", contactName: "Roberto Esposito",
    },
  ],
  "thread-4": [
    {
      id: "msg-4a", threadId: "thread-4",
      subject: "Presentazione piattaforma — Delta Finance",
      body: `Gentile Anna,\n\ncome concordato con il vostro team, vi presento la nostra piattaforma di gestione finanziaria integrata.\n\nSarei lieto di organizzare una demo personalizzata.\n\nMario`,
      from: ME, fromName: ME_NAME, to: ["anna.m@deltafinance.com"], cc: [],
      status: "DRAFT", tracking: "NONE", openedAt: null, clickedAt: null,
      sentAt: null, createdAt: daysAgo(0, 8),
      dealId: "deal-4", dealTitle: "Soluzione Finance Delta", contactId: "cnt-6", contactName: "Anna Mancini",
    },
  ],
};

export const MOCK_EMAIL_THREADS: EmailThread[] = [
  {
    id: "thread-1", subject: "Proposta Pipely Enterprise — Acme S.r.l.",
    participants: [ME, "luca.bianchi@acme.it"],
    lastMessageAt: daysAgo(3, 16),
    messages: THREAD_MESSAGES["thread-1"]!,
    dealId: "deal-1", dealTitle: "Pipely Enterprise Acme",
    contactId: "cnt-1", contactName: "Luca Bianchi",
    unreadCount: 0,
  },
  {
    id: "thread-2", subject: "Offerta Consulenza Q3 — Beta Consulting",
    participants: [ME, "marco@betaconsulting.it", "sofia.ferrari@acme.it"],
    lastMessageAt: daysAgo(2, 15),
    messages: THREAD_MESSAGES["thread-2"]!,
    dealId: "deal-2", dealTitle: "Consulenza Beta Q3",
    contactId: "cnt-3", contactName: "Marco Ricci",
    unreadCount: 1,
  },
  {
    id: "thread-3", subject: "Follow-up demo ERP — Gamma Industrie",
    participants: [ME, "r.esposito@gammaindustrie.it"],
    lastMessageAt: daysAgo(1, 8),
    messages: THREAD_MESSAGES["thread-3"]!,
    dealId: "deal-3", dealTitle: "Fornitura ERP Gamma",
    contactId: "cnt-5", contactName: "Roberto Esposito",
    unreadCount: 0,
  },
  {
    id: "thread-4", subject: "Presentazione piattaforma — Delta Finance",
    participants: [ME, "anna.m@deltafinance.com"],
    lastMessageAt: daysAgo(0, 8),
    messages: THREAD_MESSAGES["thread-4"]!,
    dealId: "deal-4", dealTitle: "Soluzione Finance Delta",
    contactId: "cnt-6", contactName: "Anna Mancini",
    unreadCount: 0,
  },
];

export const MOCK_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "tpl-1", name: "Prima proposta commerciale", category: "Vendita",
    subject: "Proposta commerciale — {{azienda}}",
    body: `Gentile {{nome}},\n\nfaccio seguito al nostro incontro del {{data}}.\n\nIn allegato la nostra proposta per {{azienda}}.\n\nResto a disposizione per qualsiasi chiarimento.\n\nCordiali saluti,\n{{mittente}}`,
    usageCount: 12, createdAt: daysAgo(30), updatedAt: daysAgo(5),
  },
  {
    id: "tpl-2", name: "Follow-up dopo demo", category: "Vendita",
    subject: "RE: Demo {{prodotto}} — Prossimi passi",
    body: `Ciao {{nome}},\n\ngrazie per il tempo dedicatoci durante la demo di {{prodotto}}.\n\nCome discusso, i prossimi passi sarebbero:\n1. Revisione proposta tecnica\n2. Call con il team IT\n3. Firma contratto\n\nQuando sei disponibile per una call questa settimana?\n\n{{mittente}}`,
    usageCount: 8, createdAt: daysAgo(25), updatedAt: daysAgo(10),
  },
  {
    id: "tpl-3", name: "Sollecito risposta", category: "Follow-up",
    subject: "RE: {{oggetto}} — Gentile sollecito",
    body: `Ciao {{nome}},\n\nvolevo fare un breve follow-up sulla mia email del {{data}}.\n\nHai avuto modo di valutare la nostra proposta? Sono disponibile per rispondere a qualsiasi domanda.\n\n{{mittente}}`,
    usageCount: 15, createdAt: daysAgo(20), updatedAt: daysAgo(2),
  },
  {
    id: "tpl-4", name: "Invio contratto", category: "Chiusura",
    subject: "Contratto {{prodotto}} — {{azienda}}",
    body: `Gentile {{nome}},\n\nin allegato il contratto per l'erogazione dei servizi concordati.\n\nTi chiedo di:\n1. Leggere attentamente i termini\n2. Firmare digitalmente entro {{scadenza}}\n3. Restituirmi copia via email\n\nPer qualsiasi domanda sono a disposizione.\n\nCordiali saluti,\n{{mittente}}`,
    usageCount: 6, createdAt: daysAgo(15), updatedAt: daysAgo(15),
  },
  {
    id: "tpl-5", name: "Benvenuto nuovo cliente", category: "Onboarding",
    subject: "Benvenuto in {{prodotto}} — Prossimi passi",
    body: `Caro {{nome}},\n\nbenvenuto! Siamo felici di averti come cliente.\n\nEcco cosa succederà nei prossimi giorni:\n• Giorno 1: Accesso alle credenziali\n• Giorno 2-3: Sessione di onboarding\n• Giorno 5: Check-in di follow-up\n\nIl tuo punto di riferimento sarà {{mittente}}.\n\nA presto!`,
    usageCount: 4, createdAt: daysAgo(10), updatedAt: daysAgo(10),
  },
];
