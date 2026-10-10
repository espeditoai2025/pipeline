import { db } from "@/lib/db";
import { getLimits } from "@/lib/plan";
import { workflowStepSchema } from "@/lib/workflow-schema";
import type { McpContext } from "./auth";
import type { z } from "zod";
import type * as s from "./schemas";

function safeTrigger(v: unknown) {
  const x = v as Record<string, unknown> | null;
  return {
    type: typeof x?.type === "string" ? x.type.slice(0, 100) : "UNKNOWN",
    fromStageId: typeof x?.fromStageId === "string" ? x.fromStageId : null,
    toStageId: typeof x?.toStageId === "string" ? x.toStageId : null,
    minValue: typeof x?.minValue === "number" ? x.minValue : null,
  };
}
export async function listMcpAutomationEffects(c: McpContext) {
  const [org, workflows, hooks] = await Promise.all([
    db.organization.findUniqueOrThrow({ where: { id: c.organizationId }, select: { plan: true } }),
    db.workflow.findMany({
      where: { organizationId: c.organizationId },
      select: {
        id: true,
        name: true,
        isActive: true,
        triggerOnImport: true,
        trigger: true,
        steps: true,
        updatedAt: true,
      },
      orderBy: { id: "asc" },
      take: 100,
    }),
    db.webhook.findMany({
      where: { organizationId: c.organizationId },
      select: { id: true, name: true, isActive: true, events: true, url: true, updatedAt: true },
      orderBy: { id: "asc" },
      take: 100,
    }),
  ]);
  const counts = await Promise.all([
    db.workflow.count({ where: { organizationId: c.organizationId } }),
    db.webhook.count({ where: { organizationId: c.organizationId } }),
  ]);
  return {
    automationsEnabled: getLimits(org.plan).automations,
    workflows: workflows.map((w) => ({
      ...w,
      trigger: safeTrigger(w.trigger),
      steps: (Array.isArray(w.steps) ? w.steps : []).map((step) => {
        const p = workflowStepSchema.safeParse(step);
        return p.success ? p.data : { action: { type: "UNKNOWN" } };
      }),
    })),
    webhooks: hooks.map(({ url, ...h }) => {
      let origin: string | null = null;
      try {
        origin = new URL(url).origin;
      } catch {}
      return { ...h, destinationOrigin: origin };
    }),
    truncated: { workflows: counts[0] > workflows.length, webhooks: counts[1] > hooks.length },
    instructions:
      "Configurazione corrente: può cambiare dopo questa lettura. Webhook senza segreto, credenziali, percorso o query. Import CSV/Excel, upsert e import_batch non accodano workflow/webhook né invii, anche con triggerOnImport attivo.",
  };
}
const events: Record<string, { triggers: string[]; hooks: string[] }> = {
  create_contact: { triggers: ["CONTACT_CREATED"], hooks: ["contact.created"] },
  update_contact: { triggers: [], hooks: ["contact.updated"] },
  create_company: { triggers: [], hooks: ["company.created"] },
  update_company: { triggers: [], hooks: ["company.updated"] },
  create_deal: { triggers: ["DEAL_CREATED"], hooks: ["deal.created"] },
  update_deal: {
    triggers: ["DEAL_WON", "DEAL_LOST", "DEAL_STAGE_CHANGED", "DEAL_VALUE_CHANGED"],
    hooks: ["deal.updated", "deal.won", "deal.lost", "deal.stage_changed"],
  },
  create_activity: { triggers: ["ACTIVITY_OVERDUE"], hooks: ["activity.created"] },
  // updateMcpActivity does not enqueue effects; the overdue scanner can enqueue later.
  update_activity: { triggers: ["ACTIVITY_OVERDUE"], hooks: [] },
  complete_activity: { triggers: [], hooks: ["activity.completed"] },
};
export async function predictMcpEffects(c: McpContext, input: z.infer<typeof s.effectsSchema>) {
  const cfg = await listMcpAutomationEffects(c);
  const event = events[input.operation] ?? { triggers: [], hooks: [] };
  const workflows = cfg.workflows.filter(
    (w) => cfg.automationsEnabled && w.isActive && event.triggers.includes(w.trigger.type),
  );
  const hooks = cfg.webhooks.filter(
    (h) => h.isActive && h.events.some((e) => event.hooks.includes(e)),
  );
  const silent = !event.triggers.length && !event.hooks.length;
  return {
    operation: input.operation,
    possibleWorkflows: workflows,
    possibleWebhooks: hooks,
    maySendEmail: silent
      ? false
      : workflows.some((w) => w.steps.some((s) => s.action.type === "SEND_EMAIL"))
        ? true
        : hooks.length || cfg.truncated.workflows || cfg.truncated.webhooks
          ? null
          : false,
    externalEffectsPossible: hooks.length > 0,
    complete: silent || (!cfg.truncated.workflows && !cfg.truncated.webhooks),
    instructions:
      "Previsione prudente, non garanzia: update_deal dipende dai campi modificati e filtri delle fasi; la configurazione può cambiare. Un webhook può causare effetti esterni. update_activity non accoda workflow/webhook né invia email direttamente: i workflow ACTIVITY_OVERDUE indicati sono possibili in una scansione successiva per attività aperte con scadenza idonea, anche dopo una ripianificazione. La previsione riguarda il tipo di operazione, non una specifica attività o nuova scadenza. Per un import senza invii usa upsert/import_batch: soppressione backend. Le esclusioni vengono ricontrollate al momento dell'invio.",
  };
}
