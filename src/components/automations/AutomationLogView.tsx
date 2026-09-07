"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  XCircle,
  SkipForward,
  Briefcase,
  User,
  ChevronDown,
  ChevronRight,
  Clock,
  Pause,
  Play,
} from "lucide-react";
import { resumeWorkflowJob } from "@/server/actions/workflows";
import { toast } from "sonner";
import type { WorkflowLog, LogStatus } from "@/types/workflows";

type Props = {
  logs: WorkflowLog[];
  onRefresh?: () => void;
};

const STATUS_CONFIG: Record<
  LogStatus,
  { label: string; className: string; Icon: React.ElementType }
> = {
  PENDING: { label: "In coda", className: "text-blue-600", Icon: Clock },
  RUNNING: { label: "In corso", className: "text-blue-600", Icon: Play },
  PAUSED: { label: "In attesa", className: "text-amber-700", Icon: Clock },
  SUSPENDED: { label: "Sospesa", className: "text-amber-700", Icon: Pause },
  VALIDATION: { label: "Validazione", className: "text-gray-500", Icon: CheckCircle2 },
  SUCCESS: { label: "Successo", className: "text-[var(--crm-success)]", Icon: CheckCircle2 },
  FAILED: { label: "Errore", className: "text-[var(--crm-danger)]", Icon: XCircle },
  SKIPPED: { label: "Saltata", className: "text-[var(--crm-neutral-500)]", Icon: SkipForward },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AutomationLogView({ logs, onRefresh }: Props) {
  const [filter, setFilter] = useState<LogStatus | "">("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  function resume(log: WorkflowLog) {
    if (!log.queueId) return;
    const confirmed = log.emailInFlight
      ? window.confirm(
          "L'email potrebbe essere già stata inviata. Hai verificato nel provider e vuoi riprovare? Con SMTP l'invio potrebbe essere duplicato.",
        )
      : false;
    if (log.emailInFlight && !confirmed) return;
    startTransition(async () => {
      const result = await resumeWorkflowJob(log.queueId!, confirmed);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Esecuzione rimessa in coda");
        onRefresh?.();
      }
    });
  }

  const filtered = filter ? logs.filter((l) => l.status === filter) : logs;

  const successCount = logs.filter((l) => l.status === "SUCCESS").length;
  const failedCount = logs.filter((l) => l.status === "FAILED").length;
  const skippedCount = logs.filter((l) => l.status === "SKIPPED").length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <label className="block text-sm">
        Stato dell’esecuzione
        <select
          aria-label="Filtra per stato"
          value={filter}
          onChange={(e) => setFilter(e.target.value as LogStatus | "")}
          className="ml-2 rounded border p-2"
        >
          <option value="">Tutti</option>
          {Object.entries(STATUS_CONFIG).map(([value, config]) => (
            <option key={value} value={value}>
              {config.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-4">
        {[
          { status: "SUCCESS" as LogStatus, count: successCount, label: "Riuscite" },
          { status: "FAILED" as LogStatus, count: failedCount, label: "Errori" },
          { status: "SKIPPED" as LogStatus, count: skippedCount, label: "Saltate" },
        ].map(({ status, count, label }) => {
          const cfg = STATUS_CONFIG[status];
          return (
            <button
              key={status}
              onClick={() => setFilter((f) => (f === status ? "" : status))}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${filter === status ? "border-[var(--crm-primary)] bg-[var(--crm-primary)]/5" : "border-[var(--crm-neutral-100)] bg-white hover:border-[var(--crm-neutral-200)] dark:bg-[#1a1a2e]"}`}
            >
              <cfg.Icon className={`h-4 w-4 ${cfg.className}`} />
              <span className="font-semibold">{count}</span>
              <span className="text-[var(--crm-neutral-500)]">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Log table */}
      <div className="divide-y divide-[var(--crm-neutral-100)] overflow-hidden rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e]">
        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-[var(--crm-neutral-400)]">
            Nessun log trovato
          </div>
        ) : (
          filtered.map((log) => {
            const cfg = STATUS_CONFIG[log.status];
            const isExp = expanded === log.id;
            return (
              <div key={log.id}>
                <button
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5"
                  onClick={() => setExpanded((v) => (v === log.id ? null : log.id))}
                >
                  <cfg.Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${cfg.className}`} />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium">{log.workflowName}</span>
                      <span className={`text-xs font-medium ${cfg.className}`}>{cfg.label}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1 text-xs text-[var(--crm-neutral-500)]">
                        {log.entityType === "deal" ? (
                          <Briefcase className="h-3 w-3" />
                        ) : (
                          <User className="h-3 w-3" />
                        )}
                        {log.entityLabel}
                      </span>
                      <span className="text-xs text-[var(--crm-neutral-400)]">
                        {log.stepsExecuted} step
                      </span>
                      <span className="text-xs text-[var(--crm-neutral-400)]">
                        {formatDate(log.executedAt)}
                      </span>
                    </div>
                  </div>

                  {isExp ? (
                    <ChevronDown className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--crm-neutral-400)]" />
                  ) : (
                    <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--crm-neutral-400)]" />
                  )}
                </button>

                {isExp && (
                  <div className="space-y-1.5 px-4 pb-3">
                    <div className="space-y-1 rounded-lg bg-[var(--crm-neutral-50)] px-3 py-2 text-xs dark:bg-white/5">
                      <p>
                        <span className="font-medium">Trigger:</span> {log.trigger}
                      </p>
                      <p>
                        <span className="font-medium">Entità:</span> {log.entityType} —{" "}
                        {log.entityLabel} ({log.entityId})
                      </p>
                      <p>
                        <span className="font-medium">Step eseguiti:</span> {log.stepsExecuted}
                      </p>
                      {log.error && (
                        <p className="text-[var(--crm-danger)]">
                          <span className="font-medium">Errore:</span> {log.error}
                        </p>
                      )}
                      {log.status === "PAUSED" && log.resumeAt && (
                        <p>
                          Ripresa prevista dal {formatDate(log.resumeAt)}. Controllo ogni 5 minuti.
                        </p>
                      )}
                      {log.logs?.map((line, index) => (
                        <p key={index}>{line}</p>
                      ))}
                      {log.queueId && ["FAILED", "SUSPENDED"].includes(log.status) && (
                        <button
                          disabled={pending}
                          onClick={() => resume(log)}
                          className="rounded border px-3 py-2 font-medium disabled:opacity-50"
                        >
                          Riprendi dal passo interrotto
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <p className="text-xs text-[var(--crm-neutral-500)]">{filtered.length} log</p>
    </div>
  );
}
