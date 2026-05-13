"use client";

import { useState } from "react";
import { Sparkles, Loader2, Check, RefreshCw } from "lucide-react";
import { generateEmail } from "@/server/actions/ai";
import { UpgradeModal } from "@/components/shared/UpgradeModal";
import { isPlanError } from "@/lib/plan";
import type { AIEmailDraft } from "@/types/ai";

type Props = {
  context?: { contactName?: string; dealTitle?: string };
  onApply: (draft: AIEmailDraft) => void;
};

const QUICK_PROMPTS = [
  "Follow-up dopo demo",
  "Invia proposta commerciale",
  "Ringraziamento per l'incontro",
  "Sollecito offerta in scadenza",
];

export function AIEmailWriter({ context, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [draft, setDraft] = useState<AIEmailDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState<string | null>(null);

  async function generate(text?: string) {
    const p = text ?? prompt;
    if (!p.trim()) return;
    setLoading(true);
    setDraft(null);
    const res = await generateEmail(p, context);
    setLoading(false);
    if (res.error && isPlanError(res.error)) { setUpgradeMsg(res.error); return; }
    if (res.data) setDraft(res.data);
  }

  function handleApply() {
    if (draft) {
      onApply(draft);
      setOpen(false);
      setDraft(null);
      setPrompt("");
    }
  }

  return (
    <>
    <div className="rounded-xl border border-[var(--crm-primary)]/20 bg-[var(--crm-primary)]/5 overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--crm-primary)]/10 transition-colors"
      >
        <Sparkles className="h-3.5 w-3.5 text-[var(--crm-primary)]" />
        <span className="text-xs font-medium text-[var(--crm-primary)]">Scrivi con AI</span>
        <span className="ml-auto text-xs text-[var(--crm-neutral-500)]">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-[var(--crm-primary)]/10 px-3 pb-3 pt-2 space-y-3">
          {/* Quick prompts */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => { setPrompt(p); generate(p); }}
                className="rounded-full border border-[var(--crm-primary)]/30 px-2.5 py-1 text-xs text-[var(--crm-primary)] hover:bg-[var(--crm-primary)]/10 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Free-form prompt */}
          <div className="flex gap-2">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generate()}
              placeholder="Descrivi l'email da generare..."
              className="flex-1 rounded-lg border border-[var(--crm-neutral-100)] px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--crm-primary)] bg-white dark:bg-[#1a1a2e]"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => generate()}
              disabled={!prompt.trim() || loading}
              className="flex items-center gap-1 rounded-lg bg-[var(--crm-primary)] text-white px-3 py-1.5 text-xs disabled:opacity-40 hover:bg-[var(--crm-primary-dark)] transition-colors"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              Genera
            </button>
          </div>

          {/* Generated draft */}
          {draft && (
            <div className="rounded-lg border border-[var(--crm-primary)]/20 bg-white dark:bg-[#1a1a2e] p-3 space-y-2">
              <div>
                <p className="text-xs text-[var(--crm-neutral-500)] font-medium mb-0.5">Oggetto:</p>
                <p className="text-xs font-semibold">{draft.subject}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--crm-neutral-500)] font-medium mb-0.5">Corpo:</p>
                <pre className="text-xs text-[var(--crm-neutral-700)] dark:text-white/80 whitespace-pre-wrap font-sans leading-relaxed max-h-40 overflow-y-auto">{draft.body}</pre>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleApply}
                  className="flex items-center gap-1.5 rounded-lg bg-[var(--crm-primary)] text-white px-3 py-1.5 text-xs hover:bg-[var(--crm-primary-dark)] transition-colors"
                >
                  <Check className="h-3 w-3" /> Usa questa email
                </button>
                <button
                  type="button"
                  onClick={() => generate()}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--crm-neutral-100)] px-3 py-1.5 text-xs hover:bg-[var(--crm-neutral-50)] transition-colors"
                >
                  <RefreshCw className="h-3 w-3" /> Rigenera
                </button>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-[var(--crm-neutral-500)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--crm-primary)]" />
              Generazione in corso...
            </div>
          )}
        </div>
      )}
    </div>
    {upgradeMsg && <UpgradeModal message={upgradeMsg} onClose={() => setUpgradeMsg(null)} />}
    </>
  );
}
