"use client";

import { useState, useEffect } from "react";
import { Sparkles, AlertTriangle, TrendingUp, Info, CheckCircle2, ChevronRight, X, Loader2 } from "lucide-react";
import { fetchAIInsights } from "@/server/actions/ai";
import type { AIInsight, AIInsightSeverity } from "@/types/ai";
import Link from "next/link";

const SEVERITY_CONFIG: Record<AIInsightSeverity, {
  bg: string; border: string; icon: React.ElementType; iconClass: string;
}> = {
  warning: { bg: "bg-amber-50 dark:bg-amber-900/20",  border: "border-amber-200",  icon: AlertTriangle, iconClass: "text-amber-500" },
  danger:  { bg: "bg-red-50 dark:bg-red-900/20",      border: "border-red-200",    icon: AlertTriangle, iconClass: "text-red-500"   },
  success: { bg: "bg-green-50 dark:bg-green-900/20",  border: "border-green-200",  icon: CheckCircle2,  iconClass: "text-green-600" },
  info:    { bg: "bg-blue-50 dark:bg-blue-900/20",    border: "border-blue-200",   icon: TrendingUp,    iconClass: "text-blue-500"  },
};

type Props = { compact?: boolean };

export function AIInsightsStrip({ compact = false }: Props) {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAIInsights()
      .then((r) => { if (r.data) setInsights(r.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const visible = insights.filter((i) => !dismissed.has(i.id));

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] px-4 py-3 text-sm text-[var(--crm-neutral-500)]">
        <Loader2 className="h-4 w-4 animate-spin text-[var(--crm-primary)]" />
        <span>Analisi AI in corso...</span>
      </div>
    );
  }

  if (visible.length === 0) return null;

  if (compact) {
    const topInsight = visible[0]!;
    const cfg = SEVERITY_CONFIG[topInsight.severity];
    const Icon = cfg.icon;
    return (
      <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${cfg.bg} ${cfg.border}`}>
        <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
          <Sparkles className="h-3.5 w-3.5 text-[var(--crm-primary)]" />
          <Icon className={`h-4 w-4 ${cfg.iconClass}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{topInsight.title}</p>
          <p className="text-xs text-[var(--crm-neutral-600)] mt-0.5">{topInsight.body}</p>
        </div>
        {topInsight.action && (
          <Link href={topInsight.action.href} className="flex items-center gap-1 text-xs text-[var(--crm-primary)] font-medium flex-shrink-0 hover:underline">
            {topInsight.action.label} <ChevronRight className="h-3 w-3" />
          </Link>
        )}
        <button onClick={() => setDismissed((s) => new Set([...s, topInsight.id]))} className="text-[var(--crm-neutral-400)] hover:text-[var(--crm-neutral-600)] flex-shrink-0">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[var(--crm-primary)]" />
        <h3 className="text-sm font-semibold">AI Insights</h3>
        <span className="rounded-full bg-[var(--crm-primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--crm-primary)]">{visible.length}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {visible.map((insight) => {
          const cfg = SEVERITY_CONFIG[insight.severity];
          const Icon = cfg.icon;
          return (
            <div key={insight.id} className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${cfg.bg} ${cfg.border}`}>
              <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${cfg.iconClass}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{insight.title}</p>
                <p className="text-xs text-[var(--crm-neutral-600)] mt-0.5 leading-relaxed">{insight.body}</p>
                {insight.action && (
                  <Link href={insight.action.href} className="mt-1.5 inline-flex items-center gap-1 text-xs text-[var(--crm-primary)] font-medium hover:underline">
                    {insight.action.label} <ChevronRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
              <button onClick={() => setDismissed((s) => new Set([...s, insight.id]))} className="text-[var(--crm-neutral-400)] hover:text-[var(--crm-neutral-600)] flex-shrink-0 mt-0.5">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
