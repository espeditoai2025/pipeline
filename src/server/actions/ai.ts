"use server";

import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { chatCompletion } from "@/lib/openrouter";
import type { AIInsight, AIEmailDraft } from "@/types/ai";
import { getOrgPlan, checkFeature } from "@/lib/plan";
import { getGuideContext } from "@/lib/guide-data";
import { CRM_MODES, DEFAULT_MODE, type CrmModeId } from "@/types/crm-modes";

type ActionResult<T> = { data?: T; error?: string };

function getOrgId(s: Session | null) {
  return (s?.user as { organizationId?: string } | undefined)?.organizationId ?? null;
}

// ─── CRM context builder ───────────────────────────────────────────────────

async function getOrgCrmMode(orgId: string): Promise<CrmModeId> {
  const org = await db.organization.findUnique({ where: { id: orgId }, select: { crmMode: true } });
  return (org?.crmMode as CrmModeId | null) ?? DEFAULT_MODE;
}

async function buildCrmContext(orgId: string): Promise<string> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400_000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400_000);

  const [allDeals, overdueActivities, recentWon, recentLost, openLeads, pipeline] = await Promise.all([
    db.deal.findMany({
      where: { organizationId: orgId, status: "OPEN" },
      select: { id: true, title: true, value: true, stageId: true, updatedAt: true },
      orderBy: { value: "desc" },
      take: 20,
    }),
    db.activity.count({
      where: { organizationId: orgId, completedAt: null, dueDate: { lt: now } },
    }),
    db.deal.count({
      where: { organizationId: orgId, status: "WON", closedAt: { gte: thirtyDaysAgo } },
    }),
    db.deal.count({
      where: { organizationId: orgId, status: "LOST", closedAt: { gte: thirtyDaysAgo } },
    }),
    db.lead.count({
      where: { organizationId: orgId, status: { in: ["NEW", "CONTACTED", "QUALIFIED"] } },
    }),
    db.pipeline.findFirst({
      where: { organizationId: orgId },
      include: { stages: { orderBy: { position: "asc" }, select: { id: true, name: true } } },
    }),
  ]);

  const stageMap = new Map((pipeline?.stages ?? []).map((s) => [s.id, s.name]));
  const totalPipelineValue = allDeals.reduce((s, d) => s + Number(d.value), 0);

  // Deals with no update in 14+ days
  const rottingDeals = allDeals.filter((d) => new Date(d.updatedAt) < fourteenDaysAgo);

  const lines: string[] = [
    `=== CONTESTO CRM PIPELY (${now.toLocaleDateString("it-IT")}) ===`,
    `Affari aperti: ${allDeals.length} (valore totale pipeline: €${totalPipelineValue.toLocaleString("it-IT")})`,
    `Affari vinti ultimi 30gg: ${recentWon} | Persi: ${recentLost}`,
    `Win rate 30gg: ${recentWon + recentLost > 0 ? Math.round((recentWon / (recentWon + recentLost)) * 100) : 0}%`,
    `Attività scadute non completate: ${overdueActivities}`,
    `Lead attivi in pipeline: ${openLeads}`,
    `Affari fermi da +14gg (rotting): ${rottingDeals.length}`,
  ];

  if (allDeals.length > 0) {
    lines.push("\nTop 5 affari aperti (per valore):");
    allDeals.slice(0, 5).forEach((d) => {
      const stage = stageMap.get(d.stageId) ?? "—";
      const daysOld = Math.floor((now.getTime() - new Date(d.updatedAt).getTime()) / 86400_000);
      lines.push(`  - "${d.title}" | Stage: ${stage} | €${Number(d.value).toLocaleString("it-IT")} | Aggiornato ${daysOld}gg fa`);
    });
  }

  if (rottingDeals.length > 0) {
    lines.push("\nAffari in rotting (senza aggiornamenti da +14gg):");
    rottingDeals.slice(0, 3).forEach((d) => {
      const stage = stageMap.get(d.stageId) ?? "—";
      lines.push(`  - "${d.title}" | Stage: ${stage} | €${Number(d.value).toLocaleString("it-IT")}`);
    });
  }

  return lines.join("\n");
}

// ─── Sector-specific context per CRM mode ─────────────────────────────────

const SECTOR_CONTEXT: Partial<Record<string, string>> = {
  IMMOBILIARE: `=== CONTESTO SETTORE IMMOBILIARE ===
Terminologia settore: le "Trattative" sono acquisti/vendite/affitti di immobili, gli "Acquirenti/Venditori" sono i lead. Usa sempre questa terminologia nelle risposte.
Focus operativo:
- Pipeline compravendite e affitti: monitora ogni trattativa dallo stage "Valutazione immobile" fino al "Rogito firmato"
- Database acquirenti e venditori: tieni traccia delle preferenze (zona, budget, metratura, tipologia)
- Follow-up post-visita: attività pianificate entro 24-48h da ogni sopralluogo sono critiche
- Campi personalizzati: budget massimo, preferenze zona, tipo immobile (residenziale/commerciale), metratura desiderata
- Report provvigioni: traccia valore trattativa × percentuale per calcolo commissioni
- Affari fermi = trattative senza aggiornamento → rischio perdita mandato
- Priorità azioni: follow-up visite scaduti > trattative senza documenti > acquirenti non ricontattati`,

  ASSICURAZIONI: `=== CONTESTO SETTORE ASSICURAZIONI ===
Terminologia settore: le "Polizze" sono gli affari/deal, i "Clienti assicurati" sono i contatti. Usa questa terminologia.
Focus operativo:
- Portfolio polizze: ogni cliente ha una o più polizze attive — il valore pipeline è premio annuo × clienti
- Scadenzario rinnovi: le polizze in scadenza nei prossimi 30/60/90 giorni sono la priorità assoluta
- Cross-selling: a ogni cliente vita proponi danni/auto, e viceversa — usa campi personalizzati per tipo polizza
- Lead qualificati: chi ha richiesto un preventivo nelle ultime 2 settimane va contattato entro 48h
- Affari fermi = polizze in trattativa senza contatti → rischio che il cliente firmi con un competitor
- Attività scadute = rinnovi non gestiti → perdita diretta di portafoglio
- Priorità azioni: rinnovi in scadenza < 30gg > preventivi non seguiti > cross-selling clienti monoprodotto`,

  ECOMMERCE: `=== CONTESTO SETTORE ECOMMERCE B2B ===
Terminologia settore: gli "Ordini ricorrenti" sono affari/deal, i "Clienti wholesale" sono i contatti B2B. Usa questa terminologia.
Focus operativo:
- Pipeline ordini ricorrenti: traccia contratti con buyer grossisti, distributori, marketplace B2B
- Segmentazione LTV: clienti con alto lifetime value (ordini frequenti + alto importo) richiedono account manager dedicato
- Clienti inattivi: buyer B2B senza ordine da 60+ giorni = rischio churn → pianifica riattivazione
- Contratti in rinnovo: clienti con accordo quadro annuale in scadenza = priorità commerciale
- Lead B2B qualificati: aziende che hanno richiesto catalogo o listino prezzi → contatto entro 24h
- Affari fermi = trattative B2B bloccate → spesso richiedono approvazione interna cliente
- Priorità azioni: contratti in scadenza > clienti inattivi 60gg > lead con richiesta listino`,
};

// ─── askAssistant ─────────────────────────────────────────────────────────

export async function askAssistant(message: string): Promise<ActionResult<string>> {
  if (!message.trim()) return { error: "Messaggio vuoto" };

  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  const plan = await getOrgPlan(orgId);
  const featureError = checkFeature(plan, "ai");
  if (featureError) return { error: featureError };

  try {
    const [crmContext, guideContext, crmMode] = await Promise.all([
      buildCrmContext(orgId),
      Promise.resolve(getGuideContext(message)),
      getOrgCrmMode(orgId),
    ]);
    const mode = CRM_MODES[crmMode];
    const modeContext = `Setup CRM attivo: ${mode.name} (${mode.category}) — terminologia: "${mode.dealLabel}" per gli affari, "${mode.leadLabel}" per i lead.`;

    const isGuideContent = guideContext.startsWith("=== DOCUMENTAZIONE");
    const sectorContext = SECTOR_CONTEXT[crmMode] ?? "";

    const reply = await chatCompletion([
      {
        role: "system",
        content: `Sei l'assistente AI di Pipely, un CRM italiano per team di vendita.
Rispondi sempre in italiano, in modo conciso e diretto (max 3-4 paragrafi).
Usa i dati reali del CRM forniti per rispondere con precisione.
Se la domanda riguarda come usare Pipely, usa la documentazione fornita.
Se non hai abbastanza dati per rispondere, dillo chiaramente.
Non inventare dati o numeri non presenti nel contesto.

Funzionalità chiave di Pipely (per domande su come si usa):
- Ricerca globale: Cmd+K (Mac) o Ctrl+K (Windows) da qualsiasi pagina apre la ricerca universale. Cerca in tempo reale su contatti, affari, aziende e lead. I risultati linkano direttamente alle pagine di dettaglio. Senza testo mostra navigazione rapida e azioni rapide (nuovo affare, contatto, lead, attività).
- Setup CRM (verticali): 4 modalità — Classic (B2B), Immobiliare, Assicurazioni, Ecommerce. Ogni modalità adatta la terminologia (es. "Affare" diventa "Polizza" per Assicurazioni). Modificabile dalla dashboard.
- Campi personalizzati: in Impostazioni → Campi puoi aggiungere campi extra (testo, numero, data, select, multiselect, booleano) per Affari, Contatti e Aziende.
- Tipi di fatturazione: in Impostazioni → Prezzi puoi gestire tipi di pagamento personalizzati oltre ai 7 predefiniti (una tantum, mensile, annuale, noleggio mensile/annuale, affitto mensile/annuale). I tipi appaiono nel form prodotto.
- Categorie prodotto: in Impostazioni → Prezzi puoi aggiungere categorie personalizzate (es. Formazione, Energia) oltre alle 9 predefinite (Software, Hardware, Servizio, Supporto, Licenza, SaaS, Sito Web, Agenti AI, Altro).
- Pagine di dettaglio: affari, contatti, aziende e lead hanno pagine dedicate. Contatti includono pannello note. Aziende mostrano contatti e affari collegati. Lead mostrano status, score e pulsante conversione.
- Notifiche in-app: campana nella topbar con badge non lette, notifiche da workflow automatici (azione SEND_NOTIFICATION), pulsante "Segna tutte lette".
- Automazioni: 8 trigger (DEAL_CREATED, DEAL_STAGE_CHANGED, DEAL_WON, DEAL_LOST, DEAL_VALUE_CHANGED, CONTACT_CREATED, ACTIVITY_OVERDUE, LEAD_CREATED) e 6 azioni (SEND_EMAIL, CREATE_ACTIVITY, UPDATE_DEAL_STAGE, ASSIGN_OWNER, SEND_NOTIFICATION, WAIT). WAIT mette in pausa il workflow per N giorni. Testa workflow prima di attivarlo. Log esecuzioni con stato SUCCESS/FAILED.
- Importazione contatti: CSV/XLS/XLSX, crea automaticamente le aziende collegate.
- Mobile: navigazione con hamburger menu e drawer laterale, tabelle scrollabili orizzontalmente.

${modeContext}${sectorContext ? `\n\n${sectorContext}` : ""}

${crmContext}${isGuideContent ? `\n\n${guideContext}` : ""}`,
      },
      { role: "user", content: message },
    ], { maxTokens: 500, temperature: 0.6 });

    return { data: reply };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Errore AI";
    console.error("[askAssistant]", msg);
    return { error: msg };
  }
}

// ─── fetchAIInsights (rule-based su dati reali, nessuna chiamata AI) ───────

export async function fetchAIInsights(): Promise<ActionResult<AIInsight[]>> {
  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { data: [] };

  const plan = await getOrgPlan(orgId);
  if (checkFeature(plan, "ai")) return { data: [] };

  try {
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400_000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400_000);

    const [overdueCount, rottingCount, recentWon, recentLost, openLeads, openDeals] = await Promise.all([
      db.activity.count({ where: { organizationId: orgId, completedAt: null, dueDate: { lt: now } } }),
      db.deal.count({ where: { organizationId: orgId, status: "OPEN", updatedAt: { lt: fourteenDaysAgo } } }),
      db.deal.count({ where: { organizationId: orgId, status: "WON", closedAt: { gte: thirtyDaysAgo } } }),
      db.deal.count({ where: { organizationId: orgId, status: "LOST", closedAt: { gte: thirtyDaysAgo } } }),
      db.lead.count({ where: { organizationId: orgId, status: "NEW" } }),
      db.deal.count({ where: { organizationId: orgId, status: "OPEN" } }),
    ]);

    const insights: AIInsight[] = [];

    if (overdueCount > 0) {
      insights.push({
        id: "overdue-activities",
        severity: overdueCount >= 5 ? "danger" : "warning",
        title: `${overdueCount} attività scadut${overdueCount === 1 ? "a" : "e"}`,
        body: `Hai ${overdueCount} attività non completate oltre la scadenza. Completale per mantenere il ritmo di vendita.`,
        action: { label: "Vai alle attività", href: "/activities" },
      });
    }

    if (rottingCount > 0) {
      insights.push({
        id: "rotting-deals",
        severity: rottingCount >= 3 ? "danger" : "warning",
        title: `${rottingCount} affare${rottingCount === 1 ? "" : "i"} fermo${rottingCount === 1 ? "" : "i"}`,
        body: `${rottingCount} affare${rottingCount === 1 ? "" : "i"} senza aggiornamenti da oltre 14 giorni. Pianifica un follow-up.`,
        action: { label: "Vedi pipeline", href: "/deals" },
      });
    }

    if (openLeads > 0) {
      insights.push({
        id: "new-leads",
        severity: "info",
        title: `${openLeads} lead nuov${openLeads === 1 ? "o" : "i"} da qualificare`,
        body: `Hai ${openLeads} lead in attesa di qualificazione. Contattali mentre sono ancora caldi.`,
        action: { label: "Gestisci lead", href: "/leads" },
      });
    }

    const total = recentWon + recentLost;
    if (total >= 3) {
      const winRate = Math.round((recentWon / total) * 100);
      if (winRate >= 50) {
        insights.push({
          id: "win-rate-good",
          severity: "success",
          title: `Win rate ${winRate}% negli ultimi 30gg`,
          body: `Ottimo lavoro! Hai vinto ${recentWon} affare${recentWon === 1 ? "" : "i"} su ${total} chiusi. Continua così.`,
          action: { label: "Vedi report", href: "/reports" },
        });
      } else if (winRate < 25) {
        insights.push({
          id: "win-rate-low",
          severity: "warning",
          title: `Win rate basso: ${winRate}%`,
          body: `Negli ultimi 30gg hai vinto ${recentWon} su ${total} affari chiusi. Analizza i motivi di perdita.`,
          action: { label: "Analizza report", href: "/reports" },
        });
      }
    }

    if (openDeals === 0 && insights.length === 0) {
      insights.push({
        id: "empty-pipeline",
        severity: "info",
        title: "Pipeline vuota",
        body: "Non hai affari aperti. Converti i lead in pipeline per iniziare a tracciare le trattative.",
        action: { label: "Aggiungi affare", href: "/deals" },
      });
    }

    return { data: insights };
  } catch (err) {
    console.error("[fetchAIInsights]", err);
    return { data: [] };
  }
}

// ─── generateEmail ────────────────────────────────────────────────────────

export async function generateEmail(
  prompt: string,
  context?: { contactName?: string; dealTitle?: string }
): Promise<ActionResult<AIEmailDraft>> {
  if (!prompt.trim()) return { error: "Prompt vuoto" };

  const session = await auth();
  const orgId = getOrgId(session);
  if (!orgId) return { error: "Non autorizzato" };

  const plan = await getOrgPlan(orgId);
  const featureError = checkFeature(plan, "ai");
  if (featureError) return { error: featureError };

  try {
    const contextNote = [
      context?.contactName ? `Destinatario: ${context.contactName}` : "",
      context?.dealTitle ? `Affare di riferimento: ${context.dealTitle}` : "",
    ].filter(Boolean).join(" | ");

    const systemPrompt = `Sei un assistente di vendita professionale che scrive email commerciali in italiano.
Scrivi email concise, professionali e persuasive.
Rispondi SEMPRE con questo formato JSON esatto (nessun testo extra):
{"subject":"<oggetto email>","body":"<corpo email con \\n per andare a capo>"}`;

    const userPrompt = contextNote
      ? `Scrivi una email per: ${prompt}\nContesto: ${contextNote}`
      : `Scrivi una email per: ${prompt}`;

    const raw = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { maxTokens: 400, temperature: 0.7 }
    );

    // Extract JSON robustly
    const match = raw.match(/\{[\s\S]*"subject"[\s\S]*"body"[\s\S]*\}/);
    if (!match) throw new Error("Formato risposta non valido");

    const draft = JSON.parse(match[0]) as AIEmailDraft;
    if (!draft.subject || !draft.body) throw new Error("Email incompleta");

    // Sanitize output: strip any HTML tags from AI-generated content
    // to prevent XSS if the body is rendered as HTML downstream
    const stripTags = (s: string) => s.replace(/<[^>]*>/g, "");
    return {
      data: {
        subject: stripTags(draft.subject).trim(),
        body: stripTags(draft.body).trim(),
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Errore generazione email";
    console.error("[generateEmail]", msg);
    return { error: msg };
  }
}
