"use client";

import { useState } from "react";
import { Pencil, Trash2, Play, ChevronDown, ChevronRight, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { toggleWorkflow, deleteWorkflow, testWorkflow } from "@/server/actions/workflows";
import { TRIGGER_CONFIG, ACTION_CONFIG } from "./WorkflowConfig";
import type { Workflow } from "@/types/workflows";
import type { EmailTemplate } from "@/types/emails";

type Props = {
  workflow: Workflow;
  templates?: EmailTemplate[];
  onEdit: (w: Workflow) => void;
  onDeleted: (id: string) => void;
  onToggled: (id: string, isActive: boolean) => void;
};

function formatDate(iso: string | null): string {
  if (!iso) return "Mai eseguita";
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function WorkflowCard({ workflow, templates = [], onEdit, onDeleted, onToggled }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testLog, setTestLog] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [toggling, setToggling] = useState(false);

  const triggerCfg = TRIGGER_CONFIG[workflow.trigger.type];
  const TriggerIcon = triggerCfg.icon;

  async function handleToggle() {
    setToggling(true);
    const res = await toggleWorkflow(workflow.id, !workflow.isActive);
    setToggling(false);
    if (res.error) { toast.error(res.error); return; }
    onToggled(workflow.id, !workflow.isActive);
    toast.success(workflow.isActive ? "Automazione disattivata" : "Automazione attivata");
  }

  async function handleDelete() {
    if (!confirm(`Eliminare "${workflow.name}"?`)) return;
    const res = await deleteWorkflow(workflow.id);
    if (res.error) { toast.error(res.error); return; }
    onDeleted(workflow.id);
    toast.success("Automazione eliminata");
  }

  async function handleTest() {
    setTesting(true);
    setTestLog([]);
    setTestOpen(true);
    const res = await testWorkflow(workflow.id);
    setTesting(false);
    if (res.error) { toast.error(res.error); return; }
    setTestLog(res.log);
    toast.success(`Test completato: ${res.stepsRun} step eseguiti`);
  }

  return (
    <div className={`rounded-xl border bg-white dark:bg-[#1a1a2e] overflow-hidden transition-colors ${workflow.isActive ? "border-[var(--crm-primary)]/30" : "border-[var(--crm-neutral-100)]"}`}>
      {/* Header */}
      <div className="flex items-start gap-4 p-4">
        {/* Active indicator */}
        <div className={`mt-0.5 h-2.5 w-2.5 rounded-full flex-shrink-0 ${workflow.isActive ? "bg-[var(--crm-success)] shadow-[0_0_6px_var(--crm-success)]" : "bg-[var(--crm-neutral-300)]"}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-sm">{workflow.name}</h3>
              {workflow.description && (
                <p className="text-xs text-[var(--crm-neutral-500)] mt-0.5">{workflow.description}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                title="Test esecuzione"
                className="p-1.5 rounded hover:bg-[var(--crm-neutral-100)] text-[var(--crm-neutral-500)] hover:text-[var(--crm-primary)]"
                onClick={handleTest}
              >
                <Play className="h-3.5 w-3.5" />
              </button>
              <button
                className="p-1.5 rounded hover:bg-[var(--crm-neutral-100)] text-[var(--crm-neutral-500)]"
                onClick={() => onEdit(workflow)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                className="p-1.5 rounded hover:bg-red-50 text-[var(--crm-neutral-500)] hover:text-[var(--crm-danger)]"
                onClick={handleDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Trigger pill + stats */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--crm-neutral-100)] px-2 py-0.5 text-xs">
              <TriggerIcon className={`h-3 w-3 ${triggerCfg.color}`} />
              {triggerCfg.label}
            </span>
            <span className="text-xs text-[var(--crm-neutral-500)]">{workflow.steps.length} azioni</span>
            <span className="text-xs text-[var(--crm-neutral-500)]">{workflow.executionCount} esecuzioni</span>
            <span className="text-xs text-[var(--crm-neutral-400)]">Ultima: {formatDate(workflow.lastRunAt)}</span>
          </div>
        </div>

        {/* Toggle switch */}
        <button
          disabled={toggling}
          onClick={handleToggle}
          className={`relative flex-shrink-0 h-5 w-9 rounded-full transition-colors ${workflow.isActive ? "bg-[var(--crm-primary)]" : "bg-[var(--crm-neutral-200)]"} ${toggling ? "opacity-50" : ""}`}
          aria-label={workflow.isActive ? "Disattiva" : "Attiva"}
        >
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${workflow.isActive ? "translate-x-4" : "translate-x-0.5"}`} />
        </button>
      </div>

      {/* Expand steps */}
      <button
        className="w-full flex items-center gap-2 px-4 py-2 text-xs text-[var(--crm-neutral-500)] hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 transition-colors border-t border-[var(--crm-neutral-100)]"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {expanded ? "Nascondi flusso" : "Mostra flusso"}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 space-y-2">
          {/* Trigger node */}
          <div className="flex items-center gap-2 rounded-lg border border-[var(--crm-primary)]/30 bg-[var(--crm-primary)]/5 px-3 py-2">
            <TriggerIcon className={`h-4 w-4 ${triggerCfg.color} flex-shrink-0`} />
            <div>
              <p className="text-xs font-semibold">Trigger: {triggerCfg.label}</p>
              <p className="text-xs text-[var(--crm-neutral-500)]">{triggerCfg.description}</p>
            </div>
          </div>

          {/* Steps */}
          {workflow.steps.map((step, i) => {
            const cfg = ACTION_CONFIG[step.action.type];
            const StepIcon = cfg.icon;
            return (
              <div key={step.id}>
                <div className="flex justify-center py-0.5">
                  <ArrowDown className="h-3 w-3 text-[var(--crm-neutral-400)]" />
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-[var(--crm-neutral-100)] bg-[var(--crm-neutral-50)] dark:bg-white/5 px-3 py-2">
                  <StepIcon className={`h-4 w-4 ${cfg.color} flex-shrink-0`} />
                  <div>
                    <p className="text-xs font-medium">
                      Step {i + 1}: {cfg.label}
                    </p>
                    <p className="text-xs text-[var(--crm-neutral-500)]">
                      {step.action.type === "CREATE_ACTIVITY" && `"${step.action.subject}" tra ${step.action.dueDays}g`}
                      {step.action.type === "SEND_EMAIL" && (() => {
                        const a = step.action as { type: "SEND_EMAIL"; templateId: string; to: string };
                        const tpl = templates.find(t => t.id === a.templateId);
                        const label = tpl ? tpl.name : a.templateId || "Nessun template";
                        return `${label} → ${a.to}`;
                      })()}
                      {step.action.type === "SEND_NOTIFICATION" && `"${step.action.message}"`}
                      {step.action.type === "WAIT" && `${step.action.days} giorni`}
                      {step.action.type === "UPDATE_DEAL_STAGE" && `Stage: ${step.action.stageId}`}
                      {step.action.type === "ASSIGN_OWNER" && `Owner: ${step.action.userId}`}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Test log */}
      {testOpen && (
        <div className="border-t border-[var(--crm-neutral-100)] px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-[var(--crm-neutral-600)]">Log esecuzione test</p>
            <button className="text-xs text-[var(--crm-neutral-400)] hover:text-[var(--crm-neutral-600)]" onClick={() => setTestOpen(false)}>✕</button>
          </div>
          <div className="rounded-lg bg-[var(--crm-neutral-900)] dark:bg-black/50 p-3 font-mono text-xs space-y-1 max-h-40 overflow-y-auto">
            {testing && <p className="text-green-400">Esecuzione in corso...</p>}
            {testLog.map((line, i) => (
              <p key={i} className={line.includes("✓") ? "text-green-400" : line.includes("Completato") ? "text-blue-400" : "text-[var(--crm-neutral-300)]"}>{line}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
