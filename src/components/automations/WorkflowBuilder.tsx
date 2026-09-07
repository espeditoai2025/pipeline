"use client";

import { useState, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Loader2, ArrowDown, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetBody, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { createWorkflow, updateWorkflow, getWorkflowChoices } from "@/server/actions/workflows";
import { workflowSchema } from "@/lib/workflow-schema";
import { getTemplates } from "@/server/actions/emails";
import type { EmailTemplate } from "@/types/emails";
import { TRIGGER_CONFIG, ACTION_CONFIG } from "./WorkflowConfig";
import { UpgradeModal } from "@/components/shared/UpgradeModal";
import { isPlanError } from "@/lib/plan-client";
import type { Workflow, TriggerType, ActionType, WorkflowStep } from "@/types/workflows";

const schema = z.object({
  name: z.string().min(1, "Nome obbligatorio"),
  description: z.string().optional(),
  triggerType: z.enum([
    "DEAL_CREATED",
    "DEAL_STAGE_CHANGED",
    "DEAL_WON",
    "DEAL_LOST",
    "CONTACT_CREATED",
    "ACTIVITY_OVERDUE",
    "LEAD_CREATED",
    "DEAL_VALUE_CHANGED",
  ]),
  fromStageId: z.string().optional(),
  toStageId: z.string().optional(),
  minValue: z.string().optional(),
  triggerOnImport: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  workflow?: Workflow | null;
  onSaved: (w: Workflow) => void;
};

const inputCls =
  "w-full rounded-lg border border-[var(--crm-neutral-200)] bg-white dark:bg-white/5 px-3 py-2.5 text-sm text-[var(--crm-neutral-900)] dark:text-white placeholder:text-[var(--crm-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] focus:border-transparent transition-colors";

const DEFAULT_ACTIONS: Record<ActionType, object> = {
  SEND_EMAIL: { type: "SEND_EMAIL", templateId: "", to: "contact" },
  CREATE_ACTIVITY: {
    type: "CREATE_ACTIVITY",
    activityType: "CALL",
    subject: "Follow-up",
    dueDays: 1,
  },
  UPDATE_DEAL_STAGE: { type: "UPDATE_DEAL_STAGE", stageId: "" },
  ASSIGN_OWNER: { type: "ASSIGN_OWNER", userId: "" },
  SEND_NOTIFICATION: { type: "SEND_NOTIFICATION", message: "Notifica automazione" },
  WAIT: { type: "WAIT", days: 1 },
};

export function WorkflowBuilder({ open, onClose, workflow, onSaved }: Props) {
  const isEditing = !!workflow;
  const [steps, setSteps] = useState<WorkflowStep[]>(workflow?.steps ?? []);
  const [upgradeMsg, setUpgradeMsg] = useState<string | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [choices, setChoices] = useState<Awaited<ReturnType<typeof getWorkflowChoices>>>({
    stages: [],
    users: [],
  });

  useEffect(() => {
    if (open) {
      getTemplates()
        .then(setTemplates)
        .catch(() => toast.error("Impossibile caricare i template"));
      getWorkflowChoices()
        .then(setChoices)
        .catch(() => toast.error("Impossibile caricare fasi e responsabili"));
    }
  }, [open]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", triggerType: "DEAL_STAGE_CHANGED" },
  });
  const triggerType = useWatch({ control, name: "triggerType" });
  const fromStageId = useWatch({ control, name: "fromStageId" });
  const toStageId = useWatch({ control, name: "toStageId" });

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSteps(workflow?.steps ?? []);
      reset(
        workflow
          ? {
              name: workflow.name,
              description: workflow.description ?? "",
              triggerType: workflow.trigger.type,
              fromStageId: workflow.trigger.fromStageId ?? "",
              toStageId: workflow.trigger.toStageId ?? "",
              minValue: workflow.trigger.minValue?.toString() ?? "",
              triggerOnImport: workflow.triggerOnImport ?? false,
            }
          : {
              name: "",
              description: "",
              triggerType: "DEAL_STAGE_CHANGED",
              fromStageId: "",
              toStageId: "",
              minValue: "",
              triggerOnImport: false,
            },
      );
    }
  }, [open, workflow, reset]);

  function addStep(type: ActionType) {
    const step: WorkflowStep = {
      id: crypto.randomUUID(),
      action: (type === "SEND_EMAIL" && triggerType === "LEAD_CREATED"
        ? { type, templateId: "", to: "lead" }
        : DEFAULT_ACTIONS[type]) as WorkflowStep["action"],
    };
    setSteps((prev) => [...prev, step]);
  }

  function removeStep(id: string) {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }

  function updateStepField(id: string, field: string, value: string | number) {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, action: { ...s.action, [field]: value } as WorkflowStep["action"] }
          : s,
      ),
    );
  }

  async function onSubmit(data: FormValues) {
    if (steps.length === 0) {
      toast.error("Aggiungi almeno un'azione");
      return;
    }
    const missingTemplate = steps.find(
      (s) => s.action.type === "SEND_EMAIL" && !s.action.templateId,
    );
    if (missingTemplate) {
      toast.error("Seleziona un template email per l'azione SEND_EMAIL");
      return;
    }

    const payload = {
      name: data.name,
      description: data.description,
      trigger: {
        type: data.triggerType as TriggerType,
        ...(data.triggerType === "DEAL_STAGE_CHANGED"
          ? { fromStageId: data.fromStageId || undefined, toStageId: data.toStageId || undefined }
          : {}),
        ...(data.triggerType === "DEAL_VALUE_CHANGED" && data.minValue
          ? { minValue: Number(data.minValue) }
          : {}),
      },
      triggerOnImport: data.triggerOnImport ?? false,
      steps,
    };
    const parsed = workflowSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Controlla la configurazione");
      return;
    }

    const result = isEditing
      ? await updateWorkflow({ id: workflow!.id, updatedAt: workflow!.updatedAt, ...parsed.data })
      : await createWorkflow(parsed.data);

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
                <label className="mb-1 block text-sm font-medium">Nome *</label>
                <input
                  {...register("name")}
                  aria-label="Nome automazione"
                  className={inputCls}
                  placeholder="es. Follow-up dopo proposta"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.name.message}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Descrizione</label>
                <textarea
                  aria-label="Descrizione"
                  {...register("description")}
                  rows={2}
                  className={`${inputCls} resize-none`}
                  placeholder="Descrizione opzionale..."
                />
              </div>

              {/* Trigger */}
              <div>
                <label className="mb-2 block text-sm font-medium">Trigger</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(TRIGGER_CONFIG) as TriggerType[]).map((t) => {
                    const { label, icon: Icon, color } = TRIGGER_CONFIG[t];
                    return (
                      <label key={t} className="cursor-pointer">
                        <input
                          {...register("triggerType")}
                          type="radio"
                          value={t}
                          className="peer sr-only"
                        />
                        <div className="flex items-center gap-2 rounded-lg border-2 border-[var(--crm-neutral-100)] p-2.5 text-xs font-medium transition-colors peer-checked:border-[var(--crm-primary)] peer-checked:bg-[var(--crm-primary)]/5 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500">
                          <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${color}`} />
                          <span className="truncate">{label}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Steps */}
              {triggerType === "DEAL_STAGE_CHANGED" && (
                <div className="grid gap-3">
                  <label className="text-sm">
                    Dalla fase
                    <select
                      aria-label="Dalla fase"
                      {...register("fromStageId")}
                      value={fromStageId ?? ""}
                      className={inputCls}
                    >
                      <option value="">Qualsiasi fase</option>
                      {choices.stages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    Alla fase
                    <select
                      aria-label="Alla fase"
                      {...register("toStageId")}
                      value={toStageId ?? ""}
                      className={inputCls}
                    >
                      <option value="">Qualsiasi fase</option>
                      {choices.stages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
              {triggerType === "DEAL_VALUE_CHANGED" && (
                <label className="block text-sm">
                  Quando il valore raggiunge la soglia
                  <input
                    {...register("minValue")}
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputCls}
                    placeholder="Vuoto: qualsiasi variazione"
                  />
                </label>
              )}
              {["DEAL_CREATED", "CONTACT_CREATED", "LEAD_CREATED"].includes(triggerType) && (
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" {...register("triggerOnImport")} />
                  Esegui anche sui nuovi record importati. Le azioni, incluse le email, partiranno
                  per ogni nuovo record.
                </label>
              )}
              <p className="text-xs text-[var(--crm-neutral-500)]">
                Variabili: {"{{nome}}, {{cognome}}, {{email}}, {{deal}}, {{lead}}"}. Le attese
                vengono controllate ogni 5 minuti; il registro mostra la prossima ripresa.
              </p>
              <div>
                <label className="mb-2 block text-sm font-medium">Azioni ({steps.length})</label>

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
                        {i > 0 && (
                          <div className="flex justify-center py-0.5">
                            <ArrowDown className="h-3 w-3 text-[var(--crm-neutral-400)]" />
                          </div>
                        )}
                        <div className="space-y-2 rounded-lg border border-[var(--crm-neutral-100)] p-3">
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-3.5 w-3.5 text-[var(--crm-neutral-300)]" />
                            <StepIcon className={`h-3.5 w-3.5 ${cfg.color}`} />
                            <span className="flex-1 text-xs font-medium">{cfg.label}</span>
                            <button
                              type="button"
                              aria-label={`Rimuovi azione ${i + 1}`}
                              onClick={() => removeStep(step.id)}
                              className="text-[var(--crm-neutral-400)] hover:text-[var(--crm-danger)]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Action-specific fields */}
                          {step.action.type === "UPDATE_DEAL_STAGE" && (
                            <label className="block text-xs">
                              Fase di destinazione
                              <select
                                aria-label="Fase di destinazione"
                                value={step.action.stageId}
                                onChange={(e) =>
                                  updateStepField(step.id, "stageId", e.target.value)
                                }
                                className={inputCls}
                              >
                                <option value="">Seleziona una fase</option>
                                {choices.stages.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                          {step.action.type === "ASSIGN_OWNER" && (
                            <label className="block text-xs">
                              Nuovo responsabile
                              <select
                                aria-label="Nuovo responsabile"
                                value={step.action.userId}
                                onChange={(e) => updateStepField(step.id, "userId", e.target.value)}
                                className={inputCls}
                              >
                                <option value="">Seleziona una persona</option>
                                {choices.users.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                          {step.action.type === "CREATE_ACTIVITY" && (
                            <div className="grid grid-cols-2 gap-2">
                              <label className="col-span-2 text-xs">
                                Tipo attività
                                <select
                                  aria-label="Tipo attività"
                                  value={step.action.activityType}
                                  onChange={(e) =>
                                    updateStepField(step.id, "activityType", e.target.value)
                                  }
                                  className={inputCls}
                                >
                                  {[
                                    ["CALL", "Chiamata"],
                                    ["MEETING", "Riunione"],
                                    ["TASK", "Attività"],
                                    ["DEADLINE", "Scadenza"],
                                    ["EMAIL", "Email da preparare"],
                                    ["LUNCH", "Pranzo"],
                                  ].map(([value, label]) => (
                                    <option key={value} value={value}>
                                      {label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <input
                                aria-label="Oggetto attività"
                                value={step.action.subject}
                                onChange={(e) =>
                                  updateStepField(step.id, "subject", e.target.value)
                                }
                                className={inputCls}
                                placeholder="Oggetto attività"
                              />
                              <input
                                aria-label="Scadenza attività in giorni"
                                type="number"
                                min={0}
                                max={365}
                                step={1}
                                value={step.action.dueDays}
                                onChange={(e) =>
                                  updateStepField(step.id, "dueDays", Number(e.target.value))
                                }
                                className={inputCls}
                                placeholder="Giorni"
                              />
                            </div>
                          )}
                          {step.action.type === "SEND_NOTIFICATION" && (
                            <div className="space-y-2">
                              <label className="block text-xs">
                                Destinatari notifica
                                <select
                                  value={step.action.to ?? "owner"}
                                  onChange={(e) => updateStepField(step.id, "to", e.target.value)}
                                  className={inputCls}
                                >
                                  <option value="owner">Responsabile</option>
                                  <option value="team">Tutto il team</option>
                                </select>
                              </label>
                              <input
                                aria-label="Messaggio notifica"
                                value={step.action.message}
                                onChange={(e) =>
                                  updateStepField(step.id, "message", e.target.value)
                                }
                                className={inputCls}
                                placeholder="Messaggio notifica"
                              />
                            </div>
                          )}
                          {step.action.type === "WAIT" && (
                            <div className="flex items-center gap-2">
                              <input
                                aria-label="Giorni di attesa"
                                type="number"
                                min={1}
                                max={365}
                                step={1}
                                value={step.action.days}
                                onChange={(e) =>
                                  updateStepField(step.id, "days", Number(e.target.value))
                                }
                                className={`${inputCls} w-20`}
                              />
                              <span className="text-xs text-[var(--crm-neutral-500)]">
                                giorni di attesa
                              </span>
                            </div>
                          )}
                          {step.action.type === "SEND_EMAIL" && (
                            <div className="space-y-2">
                              <select
                                aria-label="Template email"
                                value={step.action.templateId}
                                onChange={(e) =>
                                  updateStepField(step.id, "templateId", e.target.value)
                                }
                                className={inputCls}
                              >
                                <option value="">— Seleziona template email —</option>
                                {templates.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name}
                                  </option>
                                ))}
                              </select>
                              <label className="block text-xs">
                                Destinatario email
                                <select
                                  value={
                                    ["contact", "owner", "lead"].includes(step.action.to)
                                      ? step.action.to
                                      : "custom"
                                  }
                                  onChange={(e) =>
                                    updateStepField(
                                      step.id,
                                      "to",
                                      e.target.value === "custom" ? "" : e.target.value,
                                    )
                                  }
                                  className={inputCls}
                                >
                                  <option value="contact">Contatto collegato</option>
                                  <option value="owner">Responsabile</option>
                                  <option value="lead">Lead</option>
                                  <option value="custom">Indirizzo specifico</option>
                                </select>
                              </label>
                              {!["contact", "owner", "lead"].includes(step.action.to) && (
                                <input
                                  aria-label="Indirizzo destinatario"
                                  type="email"
                                  value={step.action.to}
                                  onChange={(e) => updateStepField(step.id, "to", e.target.value)}
                                  className={inputCls}
                                  placeholder="nome@azienda.it"
                                />
                              )}
                              {templates.length === 0 && (
                                <p className="text-xs text-[var(--crm-neutral-400)]">
                                  Nessun template disponibile — creane uno in Comunicazioni →
                                  Template
                                </p>
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
                  <p className="mb-1.5 text-xs font-medium text-[var(--crm-neutral-500)]">
                    Aggiungi azione:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(ACTION_CONFIG) as ActionType[])
                      .filter((t) => !ACTION_CONFIG[t].disabled)
                      .map((t) => {
                        const { label, icon: Icon, color } = ACTION_CONFIG[t];
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => addStep(t)}
                            className="flex items-center gap-1 rounded-full border border-[var(--crm-neutral-100)] px-2.5 py-1 text-xs transition-colors hover:border-[var(--crm-primary)] hover:bg-[var(--crm-primary)]/5"
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
                <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-[var(--crm-primary)] text-white hover:bg-[var(--crm-primary-dark)]"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isEditing ? (
                    "Salva"
                  ) : (
                    "Crea"
                  )}
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
