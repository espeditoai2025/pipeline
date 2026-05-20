"use client";

import { useState, useEffect, useTransition } from "react";
import { Mail, FileText, PenSquare, Megaphone, Users } from "lucide-react";
import { InboxView } from "@/components/emails/InboxView";
import dynamic from "next/dynamic";
const ComposeEmailModal = dynamic(() => import("@/components/emails/ComposeEmailModal").then(m => m.ComposeEmailModal), { ssr: false });
import { TemplatesManager } from "@/components/emails/TemplatesManager";
import { EmailListsTab } from "@/components/emails/EmailListsTab";
import { CampaignsTab } from "@/components/emails/CampaignsTab";
import { Button } from "@/components/ui/button";
import { getEmails, getTemplates, getMyPlanFeatures } from "@/server/actions/emails";
import { getEmailLists, getCampaigns } from "@/server/actions/campaigns";
import type { EmailThread, EmailMessage, EmailTemplate, EmailList, EmailCampaign } from "@/types/emails";

type Tab = "inbox" | "templates" | "lists" | "campaigns";

function groupIntoThreads(messages: EmailMessage[]): EmailThread[] {
  const map = new Map<string, EmailThread>();
  for (const msg of messages) {
    const tid = msg.threadId;
    if (map.has(tid)) {
      const t = map.get(tid)!;
      t.messages.push(msg);
      if (msg.createdAt > t.lastMessageAt) t.lastMessageAt = msg.createdAt;
    } else {
      map.set(tid, {
        id: tid,
        subject: msg.subject,
        participants: [...new Set([msg.from, ...msg.to])],
        lastMessageAt: msg.createdAt,
        messages: [msg],
        dealId: msg.dealId,
        dealTitle: msg.dealTitle,
        contactId: msg.contactId,
        contactName: msg.contactName,
        unreadCount: 0,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
}

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "inbox",     label: "Inbox",      icon: <Mail className="h-4 w-4" /> },
  { id: "templates", label: "Template",   icon: <FileText className="h-4 w-4" /> },
  { id: "lists",     label: "Liste",      icon: <Users className="h-4 w-4" /> },
  { id: "campaigns", label: "Campagne",   icon: <Megaphone className="h-4 w-4" /> },
];

export default function EmailsPage() {
  const [tab, setTab] = useState<Tab>("inbox");
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [lists, setLists] = useState<EmailList[]>([]);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [canUseCampaigns, setCanUseCampaigns] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyThread, setReplyThread] = useState<EmailThread | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const [msgs, tpls, lsts, camps, features] = await Promise.all([
        getEmails(), getTemplates(), getEmailLists(), getCampaigns(), getMyPlanFeatures(),
      ]);
      setThreads(groupIntoThreads(msgs));
      setTemplates(tpls);
      setLists(lsts);
      setCampaigns(camps);
      setCanUseCampaigns(features.emailCampaigns);
    });
  }, []);

  const unreadCount = threads.reduce((s, t) => s + t.unreadCount, 0);

  function handleCompose(thread?: EmailThread) {
    setReplyThread(thread ?? null);
    setComposeOpen(true);
  }

  function handleSent(msg: EmailMessage) {
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
              {threads.length} conversazioni · {campaigns.length} campagne · {lists.length} liste
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            className="bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white"
            onClick={() => handleCompose()}
          >
            <PenSquare className="h-4 w-4 mr-1.5" /> Nuova email
          </Button>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex rounded-lg border border-[var(--crm-neutral-100)] overflow-hidden w-fit">
        {TABS.map((t, i) => {
          const badge =
            t.id === "inbox" && unreadCount > 0 ? unreadCount :
            t.id === "templates" && templates.length > 0 ? templates.length :
            t.id === "lists" && lists.length > 0 ? lists.length :
            t.id === "campaigns" && campaigns.length > 0 ? campaigns.length :
            null;

          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm transition-colors ${i > 0 ? "border-l border-[var(--crm-neutral-100)]" : ""} ${tab === t.id ? "bg-[var(--crm-primary)] text-white" : "text-[var(--crm-neutral-600)] hover:bg-[var(--crm-neutral-50)]"}`}
            >
              {t.icon} {t.label}
              {badge !== null && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tab === t.id ? "bg-white/20 text-white" : "bg-[var(--crm-neutral-200)] text-[var(--crm-neutral-600)]"}`}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === "inbox"     && <InboxView threads={threads} onCompose={handleCompose} />}
      {tab === "templates" && <TemplatesManager initialTemplates={templates} />}
      {tab === "lists"     && <EmailListsTab lists={lists} onChange={setLists} />}
      {tab === "campaigns" && <CampaignsTab campaigns={campaigns} lists={lists} templates={templates} onChange={setCampaigns} canUseCampaigns={canUseCampaigns} />}

      <ComposeEmailModal
        open={composeOpen}
        onClose={() => { setComposeOpen(false); setReplyThread(null); }}
        replyThread={replyThread}
        templates={templates}
        onSent={handleSent}
      />
    </div>
  );
}
