export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-2">
          <div className="h-6 w-40 rounded-lg bg-[var(--crm-neutral-100)]" />
          <div className="h-4 w-60 rounded-lg bg-[var(--crm-neutral-100)]" />
        </div>
        <div className="h-9 w-28 rounded-lg bg-[var(--crm-neutral-100)]" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-5 space-y-3">
            <div className="h-4 w-24 rounded bg-[var(--crm-neutral-100)]" />
            <div className="h-8 w-16 rounded bg-[var(--crm-neutral-100)]" />
            <div className="h-3 w-20 rounded bg-[var(--crm-neutral-100)]" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-6 space-y-4">
        <div className="h-5 w-32 rounded bg-[var(--crm-neutral-100)]" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-[var(--crm-neutral-100)] flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 rounded bg-[var(--crm-neutral-100)]" />
              <div className="h-3 w-32 rounded bg-[var(--crm-neutral-100)]" />
            </div>
            <div className="h-6 w-20 rounded-full bg-[var(--crm-neutral-100)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
