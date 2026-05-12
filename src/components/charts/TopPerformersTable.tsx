type Performer = {
  name: string;
  vinti: number;
  valore: number;
  winRate: number;
};

type Props = { data: Performer[] };

function formatEur(v: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

export function TopPerformersTable({ data }: Props) {
  const max = data[0]?.valore ?? 1;
  return (
    <div className="space-y-3">
      {data.map((p, i) => (
        <div key={p.name} className="flex items-center gap-3">
          <span className="w-5 text-xs font-bold text-[var(--crm-neutral-400)] text-right">{i + 1}</span>
          <div className="h-7 w-7 rounded-full bg-[var(--crm-primary)] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
            {p.name[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm font-medium truncate">{p.name}</span>
              <span className="text-sm font-semibold ml-2 flex-shrink-0">{formatEur(p.valore)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-[var(--crm-neutral-100)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--crm-primary)]"
                  style={{ width: `${(p.valore / max) * 100}%` }}
                />
              </div>
              <span className="text-xs text-[var(--crm-neutral-500)] flex-shrink-0">
                {p.vinti} vinti · {p.winRate}% win rate
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
