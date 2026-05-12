"use client";

import { useState } from "react";
import { Search, Briefcase, User } from "lucide-react";
import { TrackingBadge } from "./TrackingBadge";
import { ThreadDetail } from "./ThreadDetail";
import type { EmailThread } from "@/types/emails";

type Props = {
  threads: EmailThread[];
  onCompose: (replyThread?: EmailThread) => void;
};

const ME = "mario@acme.com";

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}min fa`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h fa`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}g fa`;
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function getOtherParticipant(thread: EmailThread): string {
  const other = thread.participants.find((p) => p !== ME);
  if (!other) return thread.participants[0] ?? "";
  return thread.contactName ?? other;
}

export function InboxView({ threads, onCompose }: Props) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<EmailThread | null>(null);

  const filtered = threads.filter((t) =>
    !search || t.subject.toLowerCase().includes(search.toLowerCase()) ||
    (t.contactName?.toLowerCase().includes(search.toLowerCase()))
  );

  const lastMsg = (t: EmailThread) => t.messages[t.messages.length - 1];

  if (selected) {
    return (
      <ThreadDetail
        thread={selected}
        onBack={() => setSelected(null)}
        onReply={(thread) => onCompose(thread)}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--crm-neutral-400)]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca email..."
          className="w-full rounded-lg border border-[var(--crm-neutral-100)] pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)]"
        />
      </div>

      <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] divide-y divide-[var(--crm-neutral-100)] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-[var(--crm-neutral-400)] text-sm">
            Nessuna email trovata
          </div>
        ) : (
          filtered.map((thread) => {
            const last = lastMsg(thread);
            const other = getOtherParticipant(thread);
            const isUnread = thread.unreadCount > 0;
            return (
              <button
                key={thread.id}
                className="w-full flex items-start gap-4 px-4 py-4 text-left hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 transition-colors"
                onClick={() => setSelected(thread)}
              >
                {/* Avatar */}
                <div className="h-9 w-9 rounded-full bg-[var(--crm-primary)]/10 text-[var(--crm-primary)] flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {getInitials(other)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm truncate ${isUnread ? "font-bold" : "font-medium"}`}>{other}</span>
                    <span className="text-xs text-[var(--crm-neutral-500)] flex-shrink-0">
                      {formatRelative(thread.lastMessageAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-0.5">
                    <p className={`text-sm truncate flex-1 ${isUnread ? "font-semibold text-[var(--crm-neutral-800)]" : "text-[var(--crm-neutral-600)]"}`}>
                      {thread.subject}
                    </p>
                    {last && <TrackingBadge tracking={last.tracking} status={last.status} />}
                    {isUnread && (
                      <span className="h-2 w-2 rounded-full bg-[var(--crm-primary)] flex-shrink-0" />
                    )}
                  </div>

                  {last && (
                    <p className="text-xs text-[var(--crm-neutral-400)] truncate mt-0.5">
                      {last.body.split("\n")[0]}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {thread.dealTitle && (
                      <span className="flex items-center gap-1 text-xs text-[var(--crm-neutral-400)]">
                        <Briefcase className="h-3 w-3" />{thread.dealTitle}
                      </span>
                    )}
                    {thread.contactName && (
                      <span className="flex items-center gap-1 text-xs text-[var(--crm-neutral-400)]">
                        <User className="h-3 w-3" />{thread.contactName}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      <p className="text-xs text-[var(--crm-neutral-500)]">{filtered.length} conversazioni</p>
    </div>
  );
}
