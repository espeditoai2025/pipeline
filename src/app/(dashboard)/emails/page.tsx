"use client";

import { useState } from "react";
import { Mail, FileText, PenSquare } from "lucide-react";
import { MOCK_EMAIL_THREADS, MOCK_EMAIL_TEMPLATES } from "@/lib/mock-emails";
import { InboxView } from "@/components/emails/InboxView";
import { ComposeEmailModal } from "@/components/emails/ComposeEmailModal";
import { TemplatesManager } from "@/components/emails/TemplatesManager";
import { Button } from "@/components/ui/button";
import type { EmailThread, EmailMessage } from "@/types/emails";

type Tab = "inbox" | "templates";

export default function EmailsPage() {
  const [tab, setTab] = useState<Tab>("inbox");
  const [threads, setThreads] = useState(MOCK_EMAIL_THREADS);
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyThread, setReplyThread] = useState<EmailThread | null>(null);

  const unreadCount = threads.reduce((s, t) => s + t.unreadCount, 0);

  function handleCompose(thread?: EmailThread) {
    setReplyThread(thread ?? null);
    setComposeOpen(true);
  }

  function handleSent(msg: EmailMessage) {
    // Add new thread or append to existing
    setThreads((prev) => {
      const existing = prev.find((t) => t.id === msg.threadId);
      if (existing) {
        return prev.map((t) => t.id === msg.threadId
          ? { ...t, messages: [...t.messages, msg], lastMessageAt: msg.createdAt }
          : t
        );
      }
      const newThread: EmailThread = {
        id: msg.threadId,
        subject: msg.subject,
        participants: [msg.from, ...msg.to],
        lastMessageAt: msg.createdAt,
        messages: [msg],
        dealId: msg.dealId,
        dealTitle: msg.dealTitle,
        contactId: msg.contactId,
        contactName: msg.contactName,
        unreadCount: 0,
      };
      return [newThread, ...prev];
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--crm-primary)]/10 relative">
            <Mail className="h-5 w-5 text-[var(--crm-primary)]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--crm-primary)] text-white text-[10px] font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold">Email</h1>
            <p className="text-sm text-[var(--crm-neutral-500)]">
              {threads.length} conversazioni{unreadCount > 0 && ` · ${unreadCount} non lette`}
            </p>
          </div>
        </div>

        <Button
          className="bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white"
          onClick={() => handleCompose()}
        >
          <PenSquare className="h-4 w-4 mr-1.5" /> Nuova email
        </Button>
      </div>

      {/* Tab switcher */}
      <div className="flex rounded-lg border border-[var(--crm-neutral-100)] overflow-hidden w-fit">
        <button
          onClick={() => setTab("inbox")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm transition-colors ${tab === "inbox" ? "bg-[var(--crm-primary)] text-white" : "text-[var(--crm-neutral-600)] hover:bg-[var(--crm-neutral-50)]"}`}
        >
          <Mail className="h-4 w-4" /> Inbox
          {unreadCount > 0 && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tab === "inbox" ? "bg-white/20 text-white" : "bg-[var(--crm-primary)]/10 text-[var(--crm-primary)]"}`}>
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("templates")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm transition-colors border-l border-[var(--crm-neutral-100)] ${tab === "templates" ? "bg-[var(--crm-primary)] text-white" : "text-[var(--crm-neutral-600)] hover:bg-[var(--crm-neutral-50)]"}`}
        >
          <FileText className="h-4 w-4" /> Template
        </button>
      </div>

      {tab === "inbox"
        ? <InboxView threads={threads} onCompose={handleCompose} />
        : <TemplatesManager initialTemplates={MOCK_EMAIL_TEMPLATES} />
      }

      <ComposeEmailModal
        open={composeOpen}
        onClose={() => { setComposeOpen(false); setReplyThread(null); }}
        replyThread={replyThread}
        templates={MOCK_EMAIL_TEMPLATES}
        onSent={handleSent}
      />
    </div>
  );
}
