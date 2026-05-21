"use client";

import { useState, useEffect } from "react";
import { Trophy, TrendingUp, Target, CheckCircle2, Briefcase, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTeamPerformance, type TeamMember } from "@/server/actions/dashboard";

function formatEur(v: number) {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}k`;
  return `€${Math.round(v)}`;
}

const PERIODS = [
  { label: "7gg", days: 7 },
  { label: "30gg", days: 30 },
  { label: "90gg", days: 90 },
] as const;

const MEDAL = ["bg-amber-400", "bg-gray-300", "bg-amber-600"];

export function TeamLeaderboard() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    setLoading(true);
    getTeamPerformance(period).then((data) => {
      setTeam(data);
      setLoading(false);
    });
  }, [period]);

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-5 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--crm-neutral-400)]" />
        </div>
      </div>
    );
  }

  if (team.length <= 1) return null;

  const maxRevenue = Math.max(...team.map((m) => m.revenue), 1);

  return (
    <div className="rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h2 className="text-sm font-semibold text-[var(--crm-neutral-900)] dark:text-white">Classifica Team Vendite</h2>
        </div>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              onClick={() => setPeriod(p.days)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
                period === p.days
                  ? "bg-[var(--crm-primary)] text-white"
                  : "text-[var(--crm-neutral-500)] hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {team.map((member, i) => (
          <div
            key={member.id}
            className="flex items-center gap-3 rounded-lg border border-[var(--crm-neutral-100)] dark:border-white/5 px-3 py-2.5 hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 transition-colors"
          >
            {/* Rank */}
            <div className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              i < 3 ? `${MEDAL[i]} text-white` : "bg-[var(--crm-neutral-100)] dark:bg-white/10 text-[var(--crm-neutral-500)]",
            )}>
              {i + 1}
            </div>

            {/* Name + avatar */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{member.name}</p>
              <div className="flex items-center gap-3 text-[10px] text-[var(--crm-neutral-400)] mt-0.5">
                <span className="flex items-center gap-0.5"><Trophy className="h-3 w-3" /> {member.dealsWon} vinti</span>
                <span className="flex items-center gap-0.5"><Briefcase className="h-3 w-3" /> {member.dealsOpen} aperti</span>
                <span className="flex items-center gap-0.5"><CheckCircle2 className="h-3 w-3" /> {member.activitiesDone} attività</span>
                <span className="flex items-center gap-0.5"><Target className="h-3 w-3" /> {member.winRate}% win</span>
              </div>
            </div>

            {/* Revenue bar */}
            <div className="w-24 shrink-0">
              <div className="flex justify-end text-xs font-bold text-[var(--crm-neutral-800)] dark:text-white mb-1">
                {formatEur(member.revenue)}
              </div>
              <div className="h-1.5 w-full rounded-full bg-[var(--crm-neutral-100)] dark:bg-white/10 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    i === 0 ? "bg-amber-400" : "bg-[var(--crm-primary)]",
                  )}
                  style={{ width: `${(member.revenue / maxRevenue) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
