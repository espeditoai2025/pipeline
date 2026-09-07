type ReportDeal = {
  value: unknown;
  status: string;
  stageId?: string;
  closedAt: Date | null;
  createdAt: Date;
  ownerId?: string;
};
type ReportInput = {
  allDeals: ReportDeal[];
  trendDeals: ReportDeal[];
  stages: { id: string; name: string }[];
  activities: { type: string }[];
  users: { id: string; name: string | null; email: string }[];
};
/** Open stock is current; won/lost input is selected by closure date and a single currency. */
export function calculateReport(
  { allDeals, trendDeals, stages, activities, users }: ReportInput,
  now = new Date(),
) {
  const open = allDeals.filter((d) => d.status === "OPEN");
  const won = allDeals.filter((d) => d.status === "WON");
  const lost = allDeals.filter((d) => d.status === "LOST");

  const totalValue = open.reduce((s, d) => s + Number(d.value), 0);
  const wonValue = won.reduce((s, d) => s + Number(d.value), 0);
  const convRate =
    won.length + lost.length > 0 ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;
  const avgDeal = won.length > 0 ? wonValue / won.length : 0;

  // Funnel
  const funnel = stages.map((s) => {
    const stageDeals = open.filter((d) => d.stageId === s.id);
    return {
      stage: s.name,
      count: stageDeals.length,
      value: stageDeals.reduce((sum, d) => sum + Number(d.value), 0),
    };
  });

  // Trend (last 6 months) — uses dedicated trendDeals query with closedAt
  const trend: { label: string; vinti: number; persi: number; valore: number; pipeline: number }[] =
    [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString("it-IT", { month: "short" });
    const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const mDeals = trendDeals.filter((x) => {
      const at = x.closedAt ? new Date(x.closedAt) : new Date(x.createdAt);
      return at >= mStart && at < mEnd;
    });
    trend.push({
      label,
      vinti: mDeals.filter((x) => x.status === "WON").length,
      persi: mDeals.filter((x) => x.status === "LOST").length,
      valore: mDeals.filter((x) => x.status === "WON").reduce((s, x) => s + Number(x.value), 0),
      pipeline: mDeals.filter((x) => x.status === "OPEN").reduce((s, x) => s + Number(x.value), 0),
    });
  }

  // Activities by type
  const typeCount: Record<string, number> = {};
  for (const a of activities) {
    typeCount[a.type] = (typeCount[a.type] ?? 0) + 1;
  }
  const byType = Object.entries(typeCount).map(([type, count]) => ({ type, count }));

  // Top performers
  const performers = users
    .map((u) => {
      const uDeals = allDeals.filter((d) => d.ownerId === u.id);
      const uWon = uDeals.filter((d) => d.status === "WON");
      return {
        id: u.id,
        name: u.name ?? u.email,
        won: uWon.length,
        revenue: uWon.reduce((s, d) => s + Number(d.value), 0),
        pipeline: uDeals
          .filter((d) => d.status === "OPEN")
          .reduce((s, d) => s + Number(d.value), 0),
        convRate:
          uDeals.filter((d) => d.status === "WON" || d.status === "LOST").length > 0
            ? Math.round(
                (uWon.length /
                  uDeals.filter((d) => d.status === "WON" || d.status === "LOST").length) *
                  100,
              )
            : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  return {
    kpis: {
      openDeals: open.length,
      totalValue,
      wonDeals: won.length,
      lostDeals: lost.length,
      wonValue,
      convRate,
      avgDeal,
      activities: activities.length,
    },
    funnel,
    trend,
    byType,
    performers,
  };
}
