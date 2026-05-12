"use client";

import { useState } from "react";
import { ArrowLeft, Briefcase, User, ChevronDown, ChevronUp, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrackingBadge } from "./TrackingBadge";
import type { EmailThread, EmailMessage } from "@/types/emails";

type Props = {
  thread: EmailThread;
  onBack: () => void;
  onReply: (thread: EmailThread) => void;
};

const ME = "mario@acme.com";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function MessageBubble({ msg, defaultOpen }: { msg: EmailMessage; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const isMe = msg.from === ME;

  return (
    <div className={`rounded-xl border border-[var(--crm-neutral-100)] overflow-hidden ${isMe ? "ml-8" : "mr-8"}`}>
      <button
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isMe ? "bg-[var(--crm-primary)] text-white" : "bg-[var(--crm-neutral-200)] text-[var(--crm-neutral-700)]"}`}>
            {msg.fromName[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0">
            <span className="font-medium text-sm">{msg.fromName}</span>
            {!open && <span className="ml-2 text-xs text-[var(--crm-neutral-500)] truncate">{msg.body.split("\n")[0]}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <TrackingBadge tracking={msg.tracking} status={msg.status} />
          <span className="text-xs text-[var(--crm-neutral-500)]">{formatDate(msg.sentAt ?? msg.createdAt)}</span>
          {open ? <ChevronUp className="h-4 w-4 text-[var(--crm-neutral-400)]" /> : <ChevronDown className="h-4 w-4 text-[var(--crm-neutral-400)]" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4">
          <div className="mb-3 text-xs text-[var(--crm-neutral-500)] space-y-0.5">
            <div><span className="font-medium">Da:</span> {msg.fromName} &lt;{msg.from}&gt;</div>
            <div><span className="font-medium">A:</span> {msg.to.join(", ")}</div>
            {msg.cc.length > 0 && <div><span className="font-medium">CC:</span> {msg.cc.join(", ")}</div>}
          </div>
          <div className="text-sm whitespace-pre-wrap text-[var(--crm-neutral-800)] dark:text-[var(--crm-neutral-200)] leading-relaxed border-t border-[var(--crm-neutral-100)] pt-3">
            {msg.body}
          </div>
          {msg.tracking === "OPENED" && msg.openedAt && (
            <p className="mt-2 text-xs text-[var(--crm-neutral-400)]">
              Aperta il {formatDate(msg.openedAt)}
            </p>
          )}
          {msg.tracking === "CLICKED" && msg.clickedAt && (
            <p className="mt-2 text-xs text-[var(--crm-neutral-400)]">
              Link cliccato il {formatDate(msg.clickedAt)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function ThreadDetail({ thread, onBack, onReply }: Props) {
  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <button onClick={onBack} className="mt-0.5 rounded-lg border border-[var(--crm-neutral-100)] p-1.5 hover:bg-[var(--crm-neutral-50)] flex-shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h2 className="font-semibold text-base truncate">{thread.subject}</h2>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {thread.dealTitle && (
                <span className="flex items-center gap-1 text-xs text-[var(--crm-neutral-500)]">
                  <Briefcase className="h-3 w-3" />{thread.dealTitle}
                </span>
              )}
              {thread.contactName && (
                <span className="flex items-center gap-1 text-xs text-[var(--crm-neutral-500)]">
                  <User className="h-3 w-3" />{thread.contactName}
                </span>
              )}
              <span className="text-xs text-[var(--crm-neutral-400)]">
                {thread.messages.length} {thread.messages.length === 1 ? "messaggio" : "messaggi"}
              </span>
            </div>
          </div>
        </div>
        <Button
          size="sm"
          className="bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white flex-shrink-0"
          onClick={() => onReply(thread)}
        >
          <Reply className="h-4 w-4 mr-1.5" /> Rispondi
        </Button>
      </div>

      {/* Messages */}
      <div className="space-y-3">
        {thread.messages.map((msg, i) => (
          <MessageBubble key={msg.id} msg={msg} defaultOpen={i === thread.messages.length - 1} />
        ))}
      </div>
    </div>
  );
}
