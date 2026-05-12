import type { Workflow, WorkflowLog } from "@/types/workflows";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export const MOCK_WORKFLOWS: Workflow[] = [
  {
    id: "wf-1",
    name: "Follow-up automatico dopo proposta",
    description: "Quando un affare entra nello stage Proposta, crea automaticamente un'attività di follow-up dopo 3 giorni.",
    isActive: true,
    trigger: { type: "DEAL_STAGE_CHANGED", toStageId: "stage-3" },
    steps: [
      { id: "s1", action: { type: "WAIT", days: 3 }, delayDays: 0 },
      { id: "s2", action: { type: "CREATE_ACTIVITY", activityType: "CALL", subject: "Follow-up proposta", dueDays: 3 } },
      { id: "s3", action: { type: "SEND_NOTIFICATION", message: "Ricorda: fai follow-up sull'affare in fase Proposta" } },
    ],
    organizationId: "org-1",
    executionCount: 14,
    lastRunAt: daysAgo(1),
    createdAt: daysAgo(30),
    updatedAt: daysAgo(5),
  },
  {
    id: "wf-2",
    name: "Email di benvenuto nuovo contatto",
    description: "Invia automaticamente un'email di benvenuto quando viene creato un nuovo contatto.",
    isActive: true,
    trigger: { type: "CONTACT_CREATED" },
    steps: [
      { id: "s1", action: { type: "SEND_EMAIL", templateId: "tpl-5", to: "contact" } },
      { id: "s2", action: { type: "CREATE_ACTIVITY", activityType: "TASK", subject: "Verifica dati nuovo contatto", dueDays: 1 } },
    ],
    organizationId: "org-1",
    executionCount: 10,
    lastRunAt: daysAgo(2),
    createdAt: daysAgo(25),
    updatedAt: daysAgo(10),
  },
  {
    id: "wf-3",
    name: "Notifica affare vinto",
    description: "Quando un affare viene segnato come vinto, notifica il team e crea un'attività di onboarding.",
    isActive: true,
    trigger: { type: "DEAL_WON" },
    steps: [
      { id: "s1", action: { type: "SEND_NOTIFICATION", message: "🎉 Affare vinto! Avvia l'onboarding del cliente." } },
      { id: "s2", action: { type: "SEND_EMAIL", templateId: "tpl-4", to: "contact" } },
      { id: "s3", action: { type: "CREATE_ACTIVITY", activityType: "MEETING", subject: "Kickoff onboarding cliente", dueDays: 7 } },
    ],
    organizationId: "org-1",
    executionCount: 7,
    lastRunAt: daysAgo(3),
    createdAt: daysAgo(20),
    updatedAt: daysAgo(3),
  },
  {
    id: "wf-4",
    name: "Sollecito attività scaduta",
    description: "Invia una notifica quando un'attività supera la data di scadenza senza essere completata.",
    isActive: false,
    trigger: { type: "ACTIVITY_OVERDUE" },
    steps: [
      { id: "s1", action: { type: "SEND_NOTIFICATION", message: "Attenzione: hai un'attività scaduta da completare." } },
    ],
    organizationId: "org-1",
    executionCount: 0,
    lastRunAt: null,
    createdAt: daysAgo(15),
    updatedAt: daysAgo(15),
  },
  {
    id: "wf-5",
    name: "Recupero lead perso",
    description: "Quando un affare viene perso, invia un'email di follow-up al contatto dopo 30 giorni.",
    isActive: false,
    trigger: { type: "DEAL_LOST" },
    steps: [
      { id: "s1", action: { type: "WAIT", days: 30 } },
      { id: "s2", action: { type: "SEND_EMAIL", templateId: "tpl-3", to: "contact" } },
      { id: "s3", action: { type: "CREATE_ACTIVITY", activityType: "CALL", subject: "Re-engagement cliente perso", dueDays: 31 } },
    ],
    organizationId: "org-1",
    executionCount: 3,
    lastRunAt: daysAgo(10),
    createdAt: daysAgo(10),
    updatedAt: daysAgo(10),
  },
];

export const MOCK_WORKFLOW_LOGS: WorkflowLog[] = [
  { id: "log-1", workflowId: "wf-1", workflowName: "Follow-up automatico dopo proposta", status: "SUCCESS", trigger: "Affare spostato in Proposta", entityType: "deal", entityId: "deal-3", entityLabel: "Fornitura ERP Gamma", stepsExecuted: 3, error: null, executedAt: daysAgo(1) },
  { id: "log-2", workflowId: "wf-2", workflowName: "Email di benvenuto nuovo contatto", status: "SUCCESS", trigger: "Nuovo contatto creato", entityType: "contact", entityId: "cnt-9", entityLabel: "Davide Bruno", stepsExecuted: 2, error: null, executedAt: daysAgo(2) },
  { id: "log-3", workflowId: "wf-3", workflowName: "Notifica affare vinto", status: "SUCCESS", trigger: "Affare segnato come vinto", entityType: "deal", entityId: "deal-2", entityLabel: "Consulenza Beta Q3", stepsExecuted: 3, error: null, executedAt: daysAgo(3) },
  { id: "log-4", workflowId: "wf-1", workflowName: "Follow-up automatico dopo proposta", status: "FAILED", trigger: "Affare spostato in Proposta", entityType: "deal", entityId: "deal-1", entityLabel: "Pipely Enterprise Acme", stepsExecuted: 1, error: "Email non inviata: contatto senza email", executedAt: daysAgo(5) },
  { id: "log-5", workflowId: "wf-5", workflowName: "Recupero lead perso", status: "SUCCESS", trigger: "Affare segnato come perso", entityType: "deal", entityId: "deal-4", entityLabel: "Soluzione Finance Delta", stepsExecuted: 3, error: null, executedAt: daysAgo(10) },
  { id: "log-6", workflowId: "wf-2", workflowName: "Email di benvenuto nuovo contatto", status: "SKIPPED", trigger: "Nuovo contatto creato", entityType: "contact", entityId: "cnt-10", entityLabel: "Elena Serra", stepsExecuted: 0, error: null, executedAt: daysAgo(7) },
  { id: "log-7", workflowId: "wf-3", workflowName: "Notifica affare vinto", status: "SUCCESS", trigger: "Affare segnato come vinto", entityType: "deal", entityId: "deal-5", entityLabel: "Progetto Media Epsilon", stepsExecuted: 3, error: null, executedAt: daysAgo(8) },
];
