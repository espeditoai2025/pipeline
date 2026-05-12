import { MOCK_PIPELINE } from "@/lib/mock-data";
import { MOCK_CONTACTS, MOCK_LEADS } from "@/lib/mock-contacts";
import type { AIInsight, AIEmailDraft } from "@/types/ai";

function allDeals() {
  return MOCK_PIPELINE.stages.flatMap((s) => s.deals);
}

function fmt(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

// Deterministic mock: maps user query keywords → contextual response using real mock data
export function mockAIReply(message: string): string {
  const q = message.toLowerCase();
  const deals = allDeals();
  const openDeals = deals.filter((d) => d.status === "OPEN");
  const wonDeals  = deals.filter((d) => d.status === "WON");
  const lostDeals = deals.filter((d) => d.status === "LOST");
  const totalValue = openDeals.reduce((s, d) => s + d.value, 0);
  const rottingDeals = openDeals.filter((d) => d.daysInStage > 10);

  // Pipeline summary
  if (q.includes("pipeline") || q.includes("riassunto") || q.includes("sommario") || q.includes("panoramica")) {
    return `📊 **Panoramica pipeline attuale**\n\n` +
      `La pipeline ha **${openDeals.length} affari aperti** per un valore totale di **${fmt(totalValue)}**.\n\n` +
      `• ${wonDeals.length} affari vinti\n` +
      `• ${lostDeals.length} affari persi\n` +
      `• ${rottingDeals.length} affari in stallo (>10 giorni nello stesso stage)\n\n` +
      `Gli stage con più valore: **${MOCK_PIPELINE.stages.map(s => `${s.name} (${fmt(s.totalValue)})`).slice(0, 3).join(", ")}**.`;
  }

  // At-risk / rotting deals
  if (q.includes("rischio") || q.includes("stallo") || q.includes("bloccati") || q.includes("fermi")) {
    if (rottingDeals.length === 0) {
      return "✅ Ottima notizia! Nessun affare sembra in stallo in questo momento.";
    }
    const list = rottingDeals.slice(0, 4).map(d => `• **${d.title}** — ${d.daysInStage} giorni nello stesso stage (valore: ${fmt(d.value)})`).join("\n");
    return `⚠️ **${rottingDeals.length} affari a rischio stallo**\n\n${list}\n\n💡 Ti consiglio di contattare i decision-maker o aggiornare la data di chiusura prevista per questi affari.`;
  }

  // Win rate
  if (q.includes("win rate") || q.includes("tasso") || q.includes("conversione") || q.includes("percentuale vittorie")) {
    const total = wonDeals.length + lostDeals.length;
    const rate = total > 0 ? Math.round((wonDeals.length / total) * 100) : 0;
    return `🏆 **Win rate attuale: ${rate}%**\n\nSu ${total} affari conclusi, ${wonDeals.length} sono stati vinti e ${lostDeals.length} persi.\n\n` +
      (rate >= 50
        ? `📈 Il tuo tasso è sopra la media del settore (tipicamente 25–35%). Ottimo lavoro!`
        : `📉 C'è margine di miglioramento. Considera di analizzare i motivi di perdita più frequenti e rafforzare la fase di qualificazione dei lead.`);
  }

  // Leads
  if (q.includes("lead") || q.includes("prospect")) {
    const hotLeads = MOCK_LEADS.filter((l) => (l.score ?? 0) >= 70);
    const list = hotLeads.slice(0, 4).map(l => `• **${l.title}** — score ${l.score}/100 (${l.status})`).join("\n");
    return `🔥 **${hotLeads.length} lead caldi (score ≥ 70)**\n\n${list}\n\n💡 Prioritizza questi lead per le prossime attività di outreach.`;
  }

  // Contacts
  if (q.includes("contatt") || q.includes("client")) {
    const total = MOCK_CONTACTS.length;
    const withEmail = MOCK_CONTACTS.filter(c => c.email).length;
    return `👥 **Panoramica contatti**\n\nHai **${total} contatti** nel CRM, di cui ${withEmail} con email registrata.\n\nI contatti più recenti: ${MOCK_CONTACTS.slice(0, 3).map(c => `**${c.firstName} ${c.lastName}**`).join(", ")}.`;
  }

  // Forecast
  if (q.includes("forecast") || q.includes("previsione") || q.includes("fatturato") || q.includes("revenue")) {
    const stages = MOCK_PIPELINE.stages;
    const weighted = openDeals.reduce((s, d) => {
      const stage = stages.find(st => st.deals.some(sd => sd.id === d.id));
      const prob = (stage?.probability ?? 50) / 100;
      return s + d.value * prob;
    }, 0);
    return `📈 **Forecast revenue**\n\n` +
      `Valore pipeline ponderato per probabilità: **${fmt(weighted)}**\n\n` +
      `Questo considera le probabilità di chiusura di ogni stage:\n` +
      stages.map(s => `• ${s.name}: ${s.probability}% probabilità`).join("\n");
  }

  // Next actions / recommendations
  if (q.includes("consig") || q.includes("cosa fare") || q.includes("azione") || q.includes("next") || q.includes("sugger")) {
    const topDeal = openDeals.sort((a, b) => b.value - a.value)[0];
    return `💡 **Raccomandazioni AI per oggi**\n\n` +
      `1. 📞 Contatta i decision-maker degli **${rottingDeals.length} affari in stallo** prima che si raffreddino ulteriormente.\n` +
      `2. 🏆 Concentrati su **${topDeal ? topDeal.title : "il tuo affare principale"}** (${topDeal ? fmt(topDeal.value) : "—"}) — massima priorità per valore.\n` +
      `3. 🔥 Qualifica i ${MOCK_LEADS.filter(l => (l.score ?? 0) >= 70).length} lead caldi e crea affari per i più promettenti.\n` +
      `4. 📧 Invia email di follow-up ai contatti che non rispondono da più di 7 giorni.`;
  }

  // Specific deal lookup
  const matchedDeal = deals.find(d => q.includes(d.title.toLowerCase().split(" ").slice(0, 2).join(" ").toLowerCase()));
  if (matchedDeal) {
    const stage = MOCK_PIPELINE.stages.find(s => s.id === matchedDeal.stageId);
    return `📋 **${matchedDeal.title}**\n\n` +
      `• Valore: **${fmt(matchedDeal.value)}**\n` +
      `• Stage: **${stage?.name ?? matchedDeal.stageId}**\n` +
      `• Stato: **${matchedDeal.status}**\n` +
      `• Giorni nello stage corrente: **${matchedDeal.daysInStage}**\n` +
      `• Chiusura prevista: **${matchedDeal.expectedClose ?? "Non impostata"}**\n` +
      (matchedDeal.contact ? `• Contatto: **${matchedDeal.contact.firstName} ${matchedDeal.contact.lastName}**\n` : "") +
      (matchedDeal.daysInStage > 10 ? `\n⚠️ Questo affare è in stallo — considera di aggiornarlo.` : `\n✅ L'affare è in buono stato.`);
  }

  // Help
  if (q.includes("aiuto") || q.includes("help") || q.includes("cosa sai") || q.includes("cosa puoi")) {
    return `🤖 **Sono il tuo assistente CRM AI.** Ecco cosa puoi chiedermi:\n\n` +
      `• 📊 Panoramica pipeline e valore totale\n` +
      `• ⚠️ Affari a rischio o in stallo\n` +
      `• 🏆 Win rate e tasso di conversione\n` +
      `• 🔥 Lead caldi da prioritizzare\n` +
      `• 📈 Forecast revenue ponderato\n` +
      `• 💡 Raccomandazioni su cosa fare oggi\n` +
      `• 👥 Panoramica contatti\n\nProva con: *"Quali affari sono a rischio?"* o *"Dammi il forecast di questo mese"*`;
  }

  // Fallback
  const strs = [
    `Non ho trovato dati specifici per questa query, ma posso aiutarti con pipeline, forecast, lead o raccomandazioni. Prova con: *"Quali affari sono a rischio?"*`,
    `Interessante domanda! Per ora posso analizzare la pipeline, i lead e i contatti. Prova a chiedermi *"Dammi la panoramica pipeline"*.`,
    `Non ho abbastanza contesto per rispondere. Posso aiutarti con analisi della pipeline, win rate, forecast o raccomandazioni sulle azioni da intraprendere.`,
  ];
  return strs[Math.floor(Math.random() * strs.length)]!;
}

export function getAIInsights(): AIInsight[] {
  const deals = allDeals();
  const openDeals = deals.filter(d => d.status === "OPEN");
  const rottingDeals = openDeals.filter(d => d.daysInStage > 10);
  const hotLeads = MOCK_LEADS.filter(l => (l.score ?? 0) >= 70);
  const stages = MOCK_PIPELINE.stages;
  const weighted = openDeals.reduce((s, d) => {
    const stage = stages.find(st => st.deals.some(sd => sd.id === d.id));
    return s + d.value * ((stage?.probability ?? 50) / 100);
  }, 0);
  const wonDeals = deals.filter(d => d.status === "WON");
  const lostDeals = deals.filter(d => d.status === "LOST");
  const total = wonDeals.length + lostDeals.length;
  const winRate = total > 0 ? Math.round((wonDeals.length / total) * 100) : 0;
  const topDeal = [...openDeals].sort((a, b) => b.value - a.value)[0];

  const insights: AIInsight[] = [];

  if (rottingDeals.length > 0) {
    insights.push({
      id: "rotting",
      severity: "warning",
      title: `${rottingDeals.length} affari in stallo`,
      body: `${rottingDeals.map(d => d.title).slice(0, 2).join(", ")} e altri sono fermi da oltre 10 giorni. Intervieni prima che si raffreddino.`,
      action: { label: "Vedi pipeline", href: "/deals" },
    });
  }

  if (hotLeads.length > 0) {
    insights.push({
      id: "hot-leads",
      severity: "success",
      title: `${hotLeads.length} lead caldi da contattare`,
      body: `Hai ${hotLeads.length} lead con score ≥ 70. Qualificali ora per massimizzare la pipeline.`,
      action: { label: "Vedi lead", href: "/leads" },
    });
  }

  insights.push({
    id: "forecast",
    severity: "info",
    title: `Forecast ponderato: ${fmt(weighted)}`,
    body: `Pipeline pesata per le probabilità di chiusura di ogni stage. Win rate attuale: ${winRate}%.`,
    action: { label: "Vai ai report", href: "/reports" },
  });

  if (topDeal) {
    insights.push({
      id: "top-deal",
      severity: "info",
      title: `Affare prioritario: ${topDeal.title}`,
      body: `Vale ${fmt(topDeal.value)} ed è il maggiore in pipeline. ${topDeal.daysInStage > 7 ? "È fermo da " + topDeal.daysInStage + " giorni — intervieni." : "Procede regolarmente."}`,
      action: { label: "Vedi affari", href: "/deals" },
    });
  }

  return insights;
}

export function generateEmailDraft(prompt: string, context?: { contactName?: string; dealTitle?: string }): AIEmailDraft {
  const p = prompt.toLowerCase();
  const name = context?.contactName ?? "Cliente";
  const deal = context?.dealTitle ?? "la nostra proposta";
  const sender = "Mario Rossi";

  if (p.includes("follow") || p.includes("risposta") || p.includes("non risponde")) {
    return {
      subject: `Follow-up: ${deal}`,
      body: `Gentile ${name},\n\nMi permetto di ricontattarla in merito a ${deal}.\n\nSo che il suo tempo è prezioso, quindi sarò breve: vorrei capire se ci sono domande o dubbi che posso chiarire per aiutarla a prendere una decisione.\n\nSarei lieto di organizzare una breve chiamata di 15 minuti quando più le conviene.\n\nResto a disposizione,\n${sender}`,
    };
  }

  if (p.includes("proposta") || p.includes("offerta") || p.includes("preventivo")) {
    return {
      subject: `Proposta commerciale — ${deal}`,
      body: `Gentile ${name},\n\nCome discusso, allego la nostra proposta commerciale per ${deal}.\n\nIn sintesi, la nostra soluzione include:\n• [Elemento principale 1]\n• [Elemento principale 2]\n• Supporto dedicato e onboarding incluso\n\nLa proposta è valida fino al [data]. Sono disponibile per qualsiasi chiarimento.\n\nCordiali saluti,\n${sender}`,
    };
  }

  if (p.includes("ringrazi") || p.includes("meeting") || p.includes("incontro") || p.includes("call") || p.includes("demo")) {
    return {
      subject: `Grazie per il nostro incontro — ${deal}`,
      body: `Gentile ${name},\n\nLa ringrazio per il tempo che mi ha dedicato durante il nostro incontro di oggi.\n\nCome concordato, le invio un riepilogo dei punti discussi:\n• [Punto chiave 1]\n• [Punto chiave 2]\n• Prossimi passi: [azione]\n\nSono a sua disposizione per qualsiasi domanda.\n\nA presto,\n${sender}`,
    };
  }

  if (p.includes("scad") || p.includes("urgente") || p.includes("ultima")) {
    return {
      subject: `Promemoria: offerta in scadenza — ${deal}`,
      body: `Gentile ${name},\n\nLe scrivo per ricordarle che la nostra offerta per ${deal} è in scadenza a breve.\n\nPer garantirle le condizioni attuali, avremmo bisogno di una sua risposta entro i prossimi giorni.\n\nSe ha bisogno di ulteriori informazioni o di un ultimo confronto, sono disponibile immediatamente.\n\nCordiali saluti,\n${sender}`,
    };
  }

  // Generic professional email
  return {
    subject: `${deal} — aggiornamento`,
    body: `Gentile ${name},\n\nSpero che questo messaggio la trovi bene.\n\nLe scrivo in merito a ${deal} per aggiornarla sullo stato della situazione.\n\n[Inserisci qui il contenuto principale del messaggio]\n\nResto a sua disposizione per qualsiasi domanda.\n\nCordiali saluti,\n${sender}`,
  };
}
