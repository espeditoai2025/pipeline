"use client";

import { useEffect, useState } from "react";

const COLUMNS = [
  { label: "Lead",       color: "bg-slate-500",  dot: "bg-slate-500",   deals: [85, 60, 75] },
  { label: "Qualificato",color: "bg-blue-600",   dot: "bg-blue-500",    deals: [90, 50] },
  { label: "Proposta",   color: "bg-violet-600", dot: "bg-violet-500",  deals: [70, 80, 55] },
  { label: "Chiuso ✓",  color: "bg-teal-600",   dot: "bg-teal-400",    deals: [65, 95] },
];

// Which card is "highlighted" as if being dragged — cycles every 2.5s
const HIGHLIGHT_SEQUENCE = [
  { col: 0, row: 0 },
  { col: 1, row: 0 },
  { col: 2, row: 1 },
  { col: 3, row: 0 },
];

export function KanbanPreview() {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setStep(s => (s + 1) % HIGHLIGHT_SEQUENCE.length), 2500);
    return () => clearInterval(id);
  }, []);

  const highlighted = HIGHLIGHT_SEQUENCE[step] ?? HIGHLIGHT_SEQUENCE[0]!;

  return (
    <div
      className="rounded-2xl border border-white/10 bg-slate-800/60 p-1 shadow-2xl shadow-black/40 backdrop-blur-sm"
      style={{ animation: "floatBoard 6s ease-in-out infinite" }}
    >
      <style>{`
        @keyframes floatBoard {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes barFill {
          from { width: 0%; }
          to   { width: var(--bar-w); }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
          50%       { box-shadow: 0 0 0 4px rgba(99,102,241,0.45); }
        }
      `}</style>

      <div className="rounded-xl bg-slate-900 p-4">
        {/* Window chrome */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500/60" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
            <div className="h-3 w-3 rounded-full bg-green-500/60" />
          </div>
          <div className="h-6 flex-1 rounded-md bg-slate-700/50" />
        </div>

        {/* Kanban columns */}
        <div className="grid grid-cols-4 gap-3">
          {COLUMNS.map((col, ci) => (
            <div key={col.label} className="flex flex-col gap-2">
              {/* Column header */}
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${col.dot}`}
                  style={{ animation: ci === highlighted.col ? "glowPulse 1.2s ease-in-out infinite" : undefined }}
                />
                <span className="text-xs font-medium text-slate-400">{col.label}</span>
              </div>

              {/* Deal cards */}
              {col.deals.map((w, ri) => {
                const isActive = ci === highlighted.col && ri === highlighted.row;
                const delay = mounted ? `${(ci * 2 + ri) * 80}ms` : "0ms";
                return (
                  <div
                    key={ri}
                    className="rounded-lg bg-slate-700/60 p-2.5 border border-slate-600/30 transition-all duration-500"
                    style={{
                      animation: mounted ? `slideUp 0.5s ease-out ${delay} both` : undefined,
                      ...(isActive ? { animation: `glowPulse 1.2s ease-in-out infinite`, borderColor: "rgba(139,92,246,0.6)", background: "rgba(139,92,246,0.12)" } : {}),
                    }}
                  >
                    {/* Title bar */}
                    <div
                      className="mb-1.5 h-2 rounded bg-slate-500/60 transition-all duration-700"
                      style={{
                        ["--bar-w" as string]: `${w}%`,
                        width: mounted ? `${w}%` : "0%",
                        animation: mounted ? `barFill 0.8s ease-out ${delay} both` : undefined,
                      }}
                    />
                    <div className="h-1.5 w-1/2 rounded bg-slate-600/60" />
                    <div className="mt-2 flex items-center justify-between">
                      <div className={`h-4 w-4 rounded-full ${isActive ? "bg-violet-500/70" : "bg-blue-500/50"} transition-colors duration-500`} />
                      <div className={`h-1.5 w-8 rounded ${isActive ? "bg-violet-400/60" : "bg-teal-500/50"} transition-colors duration-500`} />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
