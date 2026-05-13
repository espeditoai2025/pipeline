"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Send, BarChart2, Calendar, CheckCircle2, Clock, PauseCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteCampaign, sendCampaign } from "@/server/actions/campaigns";
import { CampaignForm } from "./CampaignForm";
import type { EmailCampaign, EmailList, EmailTemplate } from "@/types/emails";

type Props = {
  campaigns: EmailCampaign[];
  lists: EmailList[];
  templates: EmailTemplate[];
  onChange: (campaigns: EmailCampaign[]) => void;
};

const STATUS_CONFIG: Record<EmailCampaign["status"], { label: string; cls: string; icon: React.ReactNode }> = {
  DRAFT:     { label: "Bozza",       cls: "bg-gray-100 text-gray-600",    icon: <Clock className="h-3 w-3" /> },
  SCHEDULED: { label: "Programmata", cls: "bg-blue-100 text-blue-700",    icon: <Calendar className="h-3 w-3" /> },
  SENDING:   { label: "In invio",    cls: "bg-yellow-100 text-yellow-700", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  SENT:      { label: "Inviata",     cls: "bg-green-100 text-green-700",  icon: <CheckCircle2 className="h-3 w-3" /> },
  PAUSED:    { label: "In pausa",    cls: "bg-orange-100 text-orange-700", icon: <PauseCircle className="h-3 w-3" /> },
};

function openRate(c: EmailCampaign): string {
  if (c.totalSent === 0) return "—";
  return `${Math.round((c.totalOpened / c.totalSent) * 100)}%`;
}

function clickRate(c: EmailCampaign): string {
  if (c.totalSent === 0) return "—";
  return `${Math.round((c.totalClicked / c.totalSent) * 100)}%`;
}

export function CampaignsTab({ campaigns, lists, templates, onChange }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EmailCampaign | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function openNew() { setEditing(null); setFormOpen(true); }
  function openEdit(c: EmailCampaign) { setEditing(c); setFormOpen(true); }

  function handleSaved(c: EmailCampaign) {
    if (editing) {
      onChange(campaigns.map((x) => x.id === c.id ? c : x));
    } else {
      onChange([c, ...campaigns]);
    }
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteCampaign(id);
      if (res.error) { toast.error(res.error); return; }
      onChange(campaigns.filter((c) => c.id !== id));
      toast.success("Campagna eliminata");
    });
  }

  function handleSend(campaign: EmailCampaign) {
    setSendingId(campaign.id);
    startTransition(async () => {
      const res = await sendCampaign(campaign.id);
      setSendingId(null);
      if (res.error) { toast.error(res.error); return; }
      const { sent, failed } = res.data!;
      toast.success(`Campagna inviata: ${sent} email${failed > 0 ? `, ${failed} fallite` : ""}`);
      onChange(campaigns.map((c) => c.id === campaign.id
        ? { ...c, status: "SENT", totalSent: sent, sentAt: new Date().toISOString() }
        : c
      ));
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--crm-neutral-500)]">{campaigns.length} campagne</p>
        <Button
          size="sm"
          className="bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white"
          onClick={openNew}
        >
          <Plus className="h-4 w-4 mr-1.5" /> Nuova campagna
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--crm-neutral-200)] p-12 text-center">
          <BarChart2 className="h-10 w-10 text-[var(--crm-neutral-300)] mx-auto mb-3" />
          <p className="text-sm font-medium text-[var(--crm-neutral-600)]">Nessuna campagna</p>
          <p className="text-xs text-[var(--crm-neutral-400)] mt-1">Crea la tua prima campagna email</p>
          <Button size="sm" className="mt-4 bg-[var(--crm-primary)] text-white" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1.5" /> Crea campagna
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--crm-neutral-100)] overflow-hidden divide-y divide-[var(--crm-neutral-100)]">
          {campaigns.map((c) => {
            const st = STATUS_CONFIG[c.status];
            const isSending = sendingId === c.id;
            return (
              <div key={c.id} className="p-4 hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}>
                        {st.icon} {st.label}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--crm-neutral-500)] mt-0.5 truncate">{c.subject}</p>
                    <p className="text-xs text-[var(--crm-neutral-400)] mt-0.5">Lista: {c.listName}</p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {(c.status === "DRAFT" || c.status === "SCHEDULED") && (
                      <button
                        onClick={() => handleSend(c)}
                        disabled={isSending}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-[var(--crm-primary)] text-white hover:bg-[var(--crm-primary-dark)] transition-colors disabled:opacity-50"
                      >
                        {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        Invia ora
                      </button>
                    )}
                    {c.status !== "SENT" && (
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1.5 rounded-lg text-[var(--crm-neutral-400)] hover:text-[var(--crm-primary)] hover:bg-[var(--crm-primary)]/10 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-1.5 rounded-lg text-[var(--crm-neutral-400)] hover:text-[var(--crm-danger)] hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {c.status === "SENT" && (
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    {[
                      { label: "Inviati", value: c.totalSent.toString() },
                      { label: "Apertura", value: openRate(c) },
                      { label: "Click", value: clickRate(c) },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-lg bg-[var(--crm-neutral-50)] dark:bg-white/5 px-3 py-2 text-center">
                        <p className="text-base font-semibold">{value}</p>
                        <p className="text-xs text-[var(--crm-neutral-400)]">{label}</p>
                      </div>
                    ))}
                  </div>
                )}

                {c.sentAt && (
                  <p className="mt-2 text-xs text-[var(--crm-neutral-400)]">
                    Inviata il {new Date(c.sentAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CampaignForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        campaign={editing}
        lists={lists}
        templates={templates}
        onSaved={handleSaved}
      />
    </div>
  );
}
