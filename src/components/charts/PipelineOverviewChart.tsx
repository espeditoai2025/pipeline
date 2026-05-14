"use client";

type StageData = { name: string; affari: number; valore: number };

type Props = { data: StageData[] };

function formatEur(value: number) {
  if (value === 0) return "0 €";
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString("it-IT", { maximumFractionDigits: 1 })}M €`;
  if (value >= 1_000) return `${(value / 1_000).toLocaleString("it-IT", { maximumFractionDigits: 1 })}k €`;
  return `${value.toLocaleString("it-IT", { maximumFractionDigits: 0 })} €`;
}

export function PipelineOverviewChart({ data }: Props) {
  if (data.length === 0 || data.every((d) => d.affari === 0)) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-[var(--crm-neutral-400)]">
        Nessun affare in pipeline
      </div>
    );
  }

  const maxValore = Math.max(...data.map((d) => d.valore), 1);
  const totalAffari = data.reduce((s, d) => s + d.affari, 0);
  const totalValore = data.reduce((s, d) => s + d.valore, 0);

  return (
    <div className="space-y-1">
      {data.map((stage) => {
        const barPct = maxValore > 0 ? (stage.valore / maxValore) * 100 : 0;
        const isEmpty = stage.affari === 0;
        return (
          <div key={stage.name} className="group">
            <div className="flex items-center gap-3 py-2">
              {/* Stage name */}
              <span className={`w-28 shrink-0 text-xs font-medium truncate ${isEmpty ? "text-[var(--crm-neutral-400)]" : "text-[var(--crm-neutral-700)] dark:text-white/80"}`}>
                {stage.name}
              </span>

              {/* Bar */}
              <div className="flex-1 h-6 rounded-md bg-[var(--crm-neutral-100)] dark:bg-white/5 overflow-hidden">
                {!isEmpty && (
                  <div
                    className="h-full rounded-md bg-[var(--crm-primary)] transition-all duration-500"
                    style={{ width: `${Math.max(barPct, 2)}%` }}
                  />
                )}
              </div>

              {/* Value */}
              <span className={`w-16 shrink-0 text-right text-xs font-semibold tabular-nums ${isEmpty ? "text-[var(--crm-neutral-400)]" : "text-[var(--crm-neutral-900)] dark:text-white"}`}>
                {formatEur(stage.valore)}
              </span>

              {/* Count badge */}
              <span className={`w-6 shrink-0 text-center text-xs font-medium rounded-full px-1.5 py-0.5 ${isEmpty ? "text-[var(--crm-neutral-400)] bg-[var(--crm-neutral-100)] dark:bg-white/5" : "text-[var(--crm-primary)] bg-[var(--crm-primary)]/10"}`}>
                {stage.affari}
              </span>
            </div>
          </div>
        );
      })}

      {/* Totals row */}
      <div className="mt-1 flex items-center gap-3 border-t border-[var(--crm-neutral-100)] dark:border-white/10 pt-3">
        <span className="w-28 shrink-0 text-xs font-semibold text-[var(--crm-neutral-700)] dark:text-white/70">Totale</span>
        <div className="flex-1" />
        <span className="w-16 shrink-0 text-right text-xs font-bold text-[var(--crm-neutral-900)] dark:text-white tabular-nums">
          {formatEur(totalValore)}
        </span>
        <span className="w-6 shrink-0 text-center text-xs font-bold text-[var(--crm-primary)]">
          {totalAffari}
        </span>
      </div>
    </div>
  );
}
