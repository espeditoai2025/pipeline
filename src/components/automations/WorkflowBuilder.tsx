"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Loader2, ArrowDown, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetBody, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { createWorkflow, updateWorkflow } from "@/server/actions/workflows";
import { getTemplates } from "@/server/actions/emails";
import type { EmailTemplate } from "@/types/emails";
import { TRIGGER_CONFIG, ACTION_CONFIG } from "./WorkflowConfig";
import { UpgradeModal } from "@/components/shared/UpgradeModal";
import { isPlanError } from "@/lib/plan-client";
import type { Workflow, TriggerType, ActionType, WorkflowStep } from "@/types/workflows";

const schema = z.object({
  name: z.string().min(1, "Nome obbligatorio"),
  description: z.string().optional(),
  triggerType: z.enum(["DEAL_CREATED", "DEAL_STAGE_CHANGED", "DEAL_WON", "DEAL_LOST", "CONTACT_CREATED", "ACTIVITY_OVERDUE", "LEAD_CREATED", "DEAL_VALUE_CHANGED"]),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  workflow?: Workflow | null;
  onSaved: (w: Workflow) => void;
};

const inputCls = "w-full rounded-lg border border-[var(--crm-neutral-200)] bg-white dark:bg-white/5 px-3 py-2.5 text-sm text-[var(--crm-neutral-900)] dark:text-white placeholder:text-[var(--crm-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] focus:border-transparent transition-colors";

const DEFAULT_ACTIONS: Record<ActionType, object> = {
  SEND_EMAIL:         { type: "SEND_EMAIL",        templateId: "", to: "contact" },
  CREATE_ACTIVITY:    { type: "CREATE_ACTIVITY",   activityType: "CALL", subject: "Follow-up", dueDays: 1 },
  UPDATE_DEAL_STAGE:  { type: "UPDATE_DEAL_STAGE", stageId: "" },
  ASSIGN_OWNER:       { type: "ASSIGN_OWNER",      userId: "" },
  SEND_NOTIFICATION:  { type: "SEND_NOTIFICATION", message: "Notifica automazione" },
  WAIT:               { type: "WAIT",              days: 1 },
};

export function WorkflowBuilder({ open, onClose, workflow, onSaved }: Props) {
  const isEditing = !!workflow;
  const [steps, setSteps] = useState<WorkflowStep[]>(workflow?.steps ?? []);
  const [upgradeMsg, setUpgradeMsg] = useState<string | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const stepIdRef = useRef(0);
  const nextStepId = () => `step-${++stepIdRef.current}`;

  useEffect(() => {
    if (open) getTemplates().then(setTemplates);
  }, [open]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", triggerType: "DEAL_STAGE_CHANGED" },
  });

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSteps(workflow?.steps ?? []);
      reset(workflow
        ? { name: workflow.name, description: workflow.description ?? "", triggerType: workflow.trigger.type }
        : { name: "", description: "", triggerType: "DEAL_STAGE_CHANGED" }
      );
    }
  }, [open, workflow, reset]);

  function addStep(type: ActionType) {
    const step: WorkflowStep = {
      id: nextStepId(),
      action: DEFAULT_ACTIONS[type] as WorkflowStep["action"],
    };
    setSteps((prev) => [...prev, step]);
  }

  function removeStep(id: string) {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }

  function updateStepField(id: string, field: string, value: string | number) {
    setSteps((prev) => prev.map((s) =>
      s.id === id ? { ...s, action: { ...s.action, [field]: value } as WorkflowStep["action"] } : s
    ));
  }

  async function onSubmit(data: FormValues) {
    if (steps.length === 0) {
      toast.error("Aggiungi almeno un'azione");
      return;
    }
    const missingTemplate = steps.find(s => s.action.type === "SEND_EMAIL" && !s.action.templateId);
    if (missingTemplate) {
      toast.error("Seleziona un template email per l'azione SEND_EMAIL");
      return;
    }

    const payload = {
      name: data.name,
      description: data.description,
      trigger: { type: data.triggerType as TriggerType },
      steps,
    };

    const result = isEditing
      ? await updateWorkflow({ id: workflow!.id, ...payload })
      : await createWorkflow(payload);

    if (result.error) {
      if (isPlanError(result.error)) setUpgradeMsg(result.error);
      else toast.error(result.error);
    } else {
      toast.success(isEditing ? "Automazione aggiornata" : "Automazione creata");
      onSaved(result.data!);
      onClose();
    }
  }

  return (
    <>
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Modifica automazione" : "Nuova automazione"}</SheetTitle>
        </SheetHeader>

        <SheetBody>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Name & description */}
          <div>
            <label className="block text-sm font-medium mb-1">Nome *</label>
            <input {...register("name")} className={inputCls} placeholder="es. Follow-up dopo proposta" />
            {errors.name && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descrizione</label>
            <textarea {...register("description")} rows={2} className={`${inputCls} resize-none`} placeholder="Descrizione opzionale..." />
          </div>

          {/* Trigger */}
          <div>
            <label className="block text-sm font-medium mb-2">Trigger</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(TRIGGER_CONFIG) as TriggerType[]).map((t) => {
                const { label, icon: Icon, color } = TRIGGER_CONFIG[t];
                return (
                  <label key={t} className="cursor-pointer">
                    <input {...register("triggerType")} type="radio" value={t} className="sr-only peer" />
                    <div className="flex items-center gap-2 rounded-lg border-2 border-[var(--crm-neutral-100)] p-2.5 text-xs font-medium transition-colors peer-checked:border-[var(--crm-primary)] peer-checked:bg-[var(--crm-primary)]/5">
                      <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${color}`} />
                      <span className="truncate">{label}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Steps */}
          <div>
            <label className="block text-sm font-medium mb-2">Azioni ({steps.length})</label>

            {steps.length === 0 && (
              <div className="rounded-lg border border-dashed border-[var(--crm-neutral-200)] p-4 text-center text-xs text-[var(--crm-neutral-400)]">
                Aggiungi almeno un&apos;azione qui sotto
              </div>
            )}

            <div className="space-y-2">
              {steps.map((step, i) => {
                const cfg = ACTION_CONFIG[step.action.type];
                const StepIcon = cfg.icon;
                return (
                  <div key={step.id}>
                    {i > 0 && <div className="flex justify-center py-0.5"><ArrowDown className="h-3 w-3 text-[var(--crm-neutral-400)]" /></div>}
                    <div className="rounded-lg border border-[var(--crm-neutral-100)] p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-3.5 w-3.5 text-[var(--crm-neutral-300)]" />
                        <StepIcon className={`h-3.5 w-3.5 ${cfg.color}`} />
                        <span className="text-xs font-medium flex-1">{cfg.label}</span>
                        <button type="button" onClick={() => removeStep(step.id)} className="text-[var(--crm-neutral-400)] hover:text-[var(--crm-danger)]">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Action-specific fields */}
                      {step.action.type === "CREATE_ACTIVITY" && (
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            value={step.action.subject}
                            onChange={(e) => updateStepField(step.id, "subject", e.target.value)}
                            className={inputCls} placeholder="Oggetto attività"
                          />
                          <input
                            type="number" min={0}
                            value={step.action.dueDays}
                            onChange={(e) => updateStepField(step.id, "dueDays", Number(e.target.value))}
                            className={inputCls} placeholder="Giorni"
                          />
                        </div>
                      )}
                      {step.action.type === "SEND_NOTIFICATION" && (
                        <input
                          value={step.action.message}
                          onChange={(e) => updateStepField(step.id, "message", e.target.value)}
                          className={inputCls} placeholder="Messaggio notifica"
                        />
                      )}
                      {step.action.type === "WAIT" && (
                        <div className="flex items-center gap-2">
                          <input
                            type="number" min={1}
                            value={step.action.days}
                            onChange={(e) => updateStepField(step.id, "days", Number(e.target.value))}
                            className={`${inputCls} w-20`}
                          />
                          <span className="text-xs text-[var(--crm-neutral-500)]">giorni di attesa</span>
                        </div>
                      )}
                      {step.action.type === "SEND_EMAIL" && (
                        <div className="space-y-2">
                          <select
                            value={step.action.templateId}
                            onChange={(e) => updateStepField(step.id, "templateId", e.target.value)}
                            className={inputCls}
                          >
                            <option value="">— Seleziona template email —</option>
                            {templates.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                          {templates.length === 0 && (
                            <p className="text-xs text-[var(--crm-neutral-400)]">Nessun template disponibile — creane uno in Comunicazioni → Template</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add action */}
            <div className="mt-3">
              <p className="text-xs font-medium text-[var(--crm-neutral-500)] mb-1.5">Aggiungi azione:</p>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(ACTION_CONFIG) as ActionType[]).filter((t) => !ACTION_CONFIG[t].disabled).map((t) => {
                  const { label, icon: Icon, color } = ACTION_CONFIG[t];
                  return (
                    <button
                      key={t} type="button"
                      onClick={() => addStep(t)}
                      className="flex items-center gap-1 rounded-full border border-[var(--crm-neutral-100)] px-2.5 py-1 text-xs hover:border-[var(--crm-primary)] hover:bg-[var(--crm-primary)]/5 transition-colors"
                    >
                      <Icon className={`h-3 w-3 ${color}`} />
                      <Plus className="h-2.5 w-2.5 text-[var(--crm-neutral-400)]" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Annulla</Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? "Salva" : "Crea"}
            </Button>
          </div>
        </form>
        </SheetBody>
      </SheetContent>
    </Sheet>
    {upgradeMsg && <UpgradeModal message={upgradeMsg} onClose={() => setUpgradeMsg(null)} />}
    </>
  );
}
