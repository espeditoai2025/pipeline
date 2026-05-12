"use client";

import { useState } from "react";
import { Workflow as WorkflowIcon, Plus, ScrollText } from "lucide-react";
import { MOCK_WORKFLOWS, MOCK_WORKFLOW_LOGS } from "@/lib/mock-workflows";
import { WorkflowCard } from "@/components/automations/WorkflowCard";
import { WorkflowBuilder } from "@/components/automations/WorkflowBuilder";
import { AutomationLogView } from "@/components/automations/AutomationLogView";
import { Button } from "@/components/ui/button";
import type { Workflow } from "@/types/workflows";

type Tab = "workflows" | "logs";

export default function AutomationsPage() {
  const [tab, setTab] = useState<Tab>("workflows");
  const [workflows, setWorkflows] = useState(MOCK_WORKFLOWS);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editing, setEditing] = useState<Workflow | null>(null);

  const activeCount = workflows.filter((w) => w.isActive).length;
  const totalRuns = workflows.reduce((s, w) => s + w.executionCount, 0);

  function handleSaved(saved: Workflow) {
    setWorkflows((prev) =>
      editing ? prev.map((w) => w.id === saved.id ? saved : w) : [saved, ...prev]
    );
    setBuilderOpen(false);
    setEditing(null);
  }

  function handleEdit(w: Workflow) {
    setEditing(w);
    setBuilderOpen(true);
  }

  function handleDeleted(id: string) {
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
  }

  function handleToggled(id: string, isActive: boolean) {
    setWorkflows((prev) => prev.map((w) => w.id === id ? { ...w, isActive } : w));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--crm-primary)]/10">
            <WorkflowIcon className="h-5 w-5 text-[var(--crm-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Automazioni</h1>
            <p className="text-sm text-[var(--crm-neutral-500)]">
              {activeCount} attive · {totalRuns} esecuzioni totali
            </p>
          </div>
        </div>

        <Button
          className="bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white"
          onClick={() => { setEditing(null); setBuilderOpen(true); }}
        >
          <Plus className="h-4 w-4 mr-1.5" /> Nuova automazione
        </Button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Automazioni totali",  value: workflows.length },
          { label: "Attive",              value: activeCount },
          { label: "Esecuzioni totali",   value: totalRuns },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] px-4 py-3 text-center">
            <p className="text-2xl font-bold text-[var(--crm-primary)]">{s.value}</p>
            <p className="text-xs text-[var(--crm-neutral-500)] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="flex rounded-lg border border-[var(--crm-neutral-100)] overflow-hidden w-fit">
        <button
          onClick={() => setTab("workflows")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm transition-colors ${tab === "workflows" ? "bg-[var(--crm-primary)] text-white" : "text-[var(--crm-neutral-600)] hover:bg-[var(--crm-neutral-50)]"}`}
        >
          <WorkflowIcon className="h-4 w-4" /> Automazioni
        </button>
        <button
          onClick={() => setTab("logs")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm transition-colors border-l border-[var(--crm-neutral-100)] ${tab === "logs" ? "bg-[var(--crm-primary)] text-white" : "text-[var(--crm-neutral-600)] hover:bg-[var(--crm-neutral-50)]"}`}
        >
          <ScrollText className="h-4 w-4" /> Log esecuzioni
        </button>
      </div>

      {/* Content */}
      {tab === "workflows" ? (
        <div className="space-y-3">
          {workflows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--crm-neutral-200)] p-12 text-center">
              <WorkflowIcon className="h-8 w-8 text-[var(--crm-neutral-300)] mx-auto mb-3" />
              <p className="text-sm font-medium text-[var(--crm-neutral-500)]">Nessuna automazione configurata</p>
              <p className="text-xs text-[var(--crm-neutral-400)] mt-1">Crea la tua prima automazione per automatizzare i processi di vendita</p>
              <Button
                size="sm"
                className="mt-4 bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white"
                onClick={() => { setEditing(null); setBuilderOpen(true); }}
              >
                <Plus className="h-4 w-4 mr-1.5" /> Crea automazione
              </Button>
            </div>
          ) : (
            workflows.map((w) => (
              <WorkflowCard
                key={w.id}
                workflow={w}
                onEdit={handleEdit}
                onDeleted={handleDeleted}
                onToggled={handleToggled}
              />
            ))
          )}
        </div>
      ) : (
        <AutomationLogView logs={MOCK_WORKFLOW_LOGS} />
      )}

      <WorkflowBuilder
        open={builderOpen}
        onClose={() => { setBuilderOpen(false); setEditing(null); }}
        workflow={editing}
        onSaved={handleSaved}
      />
    </div>
  );
}
