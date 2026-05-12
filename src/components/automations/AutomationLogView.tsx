"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, SkipForward, Briefcase, User, ChevronDown, ChevronRight } from "lucide-react";
import type { WorkflowLog, LogStatus } from "@/types/workflows";

type Props = {
  logs: WorkflowLog[];
};

const STATUS_CONFIG: Record<LogStatus, { label: string; className: string; Icon: React.ElementType }> = {
  SUCCESS: { label: "Successo",     className: "text-[var(--crm-success)]", Icon: CheckCircle2 },
  FAILED:  { label: "Errore",       className: "text-[var(--crm-danger)]",  Icon: XCircle },
  SKIPPED: { label: "Saltata",      className: "text-[var(--crm-neutral-500)]", Icon: SkipForward },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export function AutomationLogView({ logs }: Props) {
  const [filter, setFilter] = useState<LogStatus | "">("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = filter ? logs.filter((l) => l.status === filter) : logs;

  const successCount = logs.filter((l) => l.status === "SUCCESS").length;
  const failedCount  = logs.filter((l) => l.status === "FAILED").length;
  const skippedCount = logs.filter((l) => l.status === "SKIPPED").length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex gap-4 flex-wrap">
        {[
          { status: "SUCCESS" as LogStatus, count: successCount,  label: "Riuscite" },
          { status: "FAILED"  as LogStatus, count: failedCount,   label: "Errori" },
          { status: "SKIPPED" as LogStatus, count: skippedCount,  label: "Saltate" },
        ].map(({ status, count, label }) => {
          const cfg = STATUS_CONFIG[status];
          return (
            <button
              key={status}
              onClick={() => setFilter((f) => f === status ? "" : status)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${filter === status ? "border-[var(--crm-primary)] bg-[var(--crm-primary)]/5" : "border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] hover:border-[var(--crm-neutral-200)]"}`}
            >
              <cfg.Icon className={`h-4 w-4 ${cfg.className}`} />
              <span className="font-semibold">{count}</span>
              <span className="text-[var(--crm-neutral-500)]">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Log table */}
      <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] divide-y divide-[var(--crm-neutral-100)] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center text-[var(--crm-neutral-400)] text-sm">Nessun log trovato</div>
        ) : (
          filtered.map((log) => {
            const cfg = STATUS_CONFIG[log.status];
            const isExp = expanded === log.id;
            return (
              <div key={log.id}>
                <button
                  className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 transition-colors"
                  onClick={() => setExpanded((v) => v === log.id ? null : log.id)}
                >
                  <cfg.Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${cfg.className}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{log.workflowName}</span>
                      <span className={`text-xs font-medium ${cfg.className}`}>{cfg.label}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-[var(--crm-neutral-500)]">
                        {log.entityType === "deal" ? <Briefcase className="h-3 w-3" /> : <User className="h-3 w-3" />}
                        {log.entityLabel}
                      </span>
                      <span className="text-xs text-[var(--crm-neutral-400)]">{log.stepsExecuted} step</span>
                      <span className="text-xs text-[var(--crm-neutral-400)]">{formatDate(log.executedAt)}</span>
                    </div>
                  </div>

                  {isExp ? <ChevronDown className="h-4 w-4 text-[var(--crm-neutral-400)] flex-shrink-0 mt-0.5" /> : <ChevronRight className="h-4 w-4 text-[var(--crm-neutral-400)] flex-shrink-0 mt-0.5" />}
                </button>

                {isExp && (
                  <div className="px-4 pb-3 space-y-1.5">
                    <div className="rounded-lg bg-[var(--crm-neutral-50)] dark:bg-white/5 px-3 py-2 text-xs space-y-1">
                      <p><span className="font-medium">Trigger:</span> {log.trigger}</p>
                      <p><span className="font-medium">Entità:</span> {log.entityType} — {log.entityLabel} ({log.entityId})</p>
                      <p><span className="font-medium">Step eseguiti:</span> {log.stepsExecuted}</p>
                      {log.error && (
                        <p className="text-[var(--crm-danger)]"><span className="font-medium">Errore:</span> {log.error}</p>
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
