"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Loader2, Minimize2, Maximize2, Sparkles } from "lucide-react";
import { askAssistant } from "@/server/actions/ai";
import { UpgradeModal } from "@/components/shared/UpgradeModal";
import { isPlanError } from "@/lib/plan-client";
import type { AIMessage } from "@/types/ai";

function parseMarkdown(text: string): string {
  // Escape HTML first so model output (which echoes CRM data) can't inject active
  // markup, then apply the limited markdown transforms on the escaped text.
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br />");
}

const SUGGESTIONS = [
  "Quali affari sono a rischio?",
  "Dammi la panoramica pipeline",
  "Cosa mi consigli di fare oggi?",
  "Come funziona la ricerca globale?",
];

export function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Ciao! 👋 Sono il tuo assistente AI di Pipely. Posso analizzare la tua pipeline, identificare affari a rischio, fare forecast e suggerire le prossime azioni. Come posso aiutarti?",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const msgIdRef = useRef(0);
  const nextMsgId = (prefix: string) => `${prefix}-${++msgIdRef.current}`;

  useEffect(() => {
    if (open && !minimized) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open, minimized]);

  async function handleSend(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");

    const userMsg: AIMessage = {
      id: nextMsgId("u"),
      role: "user",
      content: msg,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    const res = await askAssistant(msg);
    setLoading(false);

    if (res.error && isPlanError(res.error)) {
      setUpgradeMsg(res.error);
      return;
    }

    const assistantMsg: AIMessage = {
      id: nextMsgId("a"),
      role: "assistant",
      content: res.error ? `❌ Errore: ${res.error}` : (res.data ?? ""),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMsg]);
  }

  return (
    <>
      {/* Floating trigger */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--crm-primary)] text-white shadow-lg hover:bg-[var(--crm-primary-dark)] transition-all hover:scale-105"
          title="Assistente AI"
        >
          <Sparkles className="h-5 w-5" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] shadow-2xl transition-all ${minimized ? "h-14 w-72" : "h-[520px] w-80 sm:w-96"}`}
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[var(--crm-neutral-100)] rounded-t-2xl bg-gradient-to-r from-[var(--crm-primary)] to-[var(--crm-primary-dark)]">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Assistente AI</p>
              {!minimized && <p className="text-xs text-white/70">Pipely Intelligence</p>}
            </div>
            <button
              onClick={() => setMinimized((v) => !v)}
              className="text-white/70 hover:text-white transition-colors"
            >
              {minimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    {msg.role === "assistant" && (
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--crm-primary)]/10 mt-0.5">
                        <Bot className="h-3.5 w-3.5 text-[var(--crm-primary)]" />
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-3 py-2 text-xs max-w-[80%] leading-relaxed ${
                        msg.role === "user"
                          ? "bg-[var(--crm-primary)] text-white rounded-tr-sm"
                          : "bg-[var(--crm-neutral-50)] dark:bg-white/5 text-[var(--crm-neutral-700)] dark:text-white rounded-tl-sm"
                      }`}
                      dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }}
                    />
                  </div>
                ))}

                {loading && (
                  <div className="flex gap-2">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--crm-primary)]/10">
                      <Bot className="h-3.5 w-3.5 text-[var(--crm-primary)]" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-[var(--crm-neutral-50)] dark:bg-white/5 px-3 py-2">
                      <div className="flex gap-1 items-center h-4">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--crm-neutral-400)] animate-bounce [animation-delay:0ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--crm-neutral-400)] animate-bounce [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--crm-neutral-400)] animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Suggestions (only when no user messages yet) */}
              {messages.length === 1 && (
                <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSend(s)}
                      className="rounded-full border border-[var(--crm-neutral-100)] px-2.5 py-1 text-xs text-[var(--crm-neutral-600)] hover:border-[var(--crm-primary)] hover:text-[var(--crm-primary)] transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="border-t border-[var(--crm-neutral-100)] p-3">
                <div className="flex gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    placeholder="Fai una domanda alla pipeline..."
                    className="flex-1 rounded-xl border border-[var(--crm-neutral-100)] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] bg-transparent"
                    disabled={loading}
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || loading}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--crm-primary)] text-white disabled:opacity-40 hover:bg-[var(--crm-primary-dark)] transition-colors"
                  >
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
      {upgradeMsg && <UpgradeModal message={upgradeMsg} onClose={() => setUpgradeMsg(null)} />}
    </>
  );
}
