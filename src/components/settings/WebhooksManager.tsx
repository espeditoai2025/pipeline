"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Loader2, Play, Eye, EyeOff, CheckCircle2, XCircle, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  getWebhooks, createWebhook, deleteWebhook, updateWebhook,
  testWebhook, getWebhookSecret, getWebhookDeliveries,
  getWebhookEvents, type WebhookItem,
} from "@/server/actions/webhooks";

const EVENT_LABELS: Record<string, string> = {
  "deal.created": "Affare creato",
  "deal.updated": "Affare aggiornato",
  "deal.won": "Affare vinto",
  "deal.lost": "Affare perso",
  "deal.stage_changed": "Cambio stage",
  "deal.deleted": "Affare eliminato",
  "contact.created": "Contatto creato",
  "contact.updated": "Contatto aggiornato",
  "contact.deleted": "Contatto eliminato",
  "company.created": "Azienda creata",
  "company.updated": "Azienda aggiornata",
  "lead.created": "Lead creato",
  "lead.converted": "Lead convertito",
  "activity.created": "Attività creata",
  "activity.completed": "Attività completata",
};

type Delivery = {
  id: string;
  event: string;
  statusCode: number | null;
  success: boolean;
  attempts: number;
  createdAt: string;
};

export function WebhooksManager() {
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [secretVisible, setSecretVisible] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<string[]>([]);

  useEffect(() => {
    getWebhooks().then((w) => { setWebhooks(w); setLoading(false); });
    getWebhookEvents().then((e) => setWebhookEvents([...e]));
  }, []);

  async function handleCreate() {
    setCreating(true);
    const res = await createWebhook({ name, url, events: selectedEvents });
    setCreating(false);
    if (res.error) { toast.error(res.error); return; }
    if (res.data) setWebhooks((prev) => [res.data!, ...prev]);
    setShowForm(false);
    setName("");
    setUrl("");
    setSelectedEvents([]);
    toast.success("Webhook creato");
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questo webhook?")) return;
    setDeletingId(id);
    const res = await deleteWebhook(id);
    setDeletingId(null);
    if (res.error) { toast.error(res.error); return; }
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
    toast.success("Webhook eliminato");
  }

  async function handleTest(id: string) {
    setTestingId(id);
    const res = await testWebhook(id);
    setTestingId(null);
    if (res.success) {
      toast.success(`Test OK — HTTP ${res.statusCode}`);
    } else {
      toast.error(`Test fallito: ${res.error}`);
    }
  }

  async function handleToggleActive(w: WebhookItem) {
    const res = await updateWebhook(w.id, { isActive: !w.isActive });
    if (res.error) { toast.error(res.error); return; }
    setWebhooks((prev) => prev.map((x) => x.id === w.id ? { ...x, isActive: !x.isActive } : x));
    toast.success(w.isActive ? "Webhook disattivato" : "Webhook attivato");
  }

  async function handleShowSecret(id: string) {
    if (secretVisible[id]) {
      setSecretVisible((prev) => { const n = { ...prev }; delete n[id]; return n; });
      return;
    }
    const res = await getWebhookSecret(id);
    if (res.error || !res.secret) { toast.error(res.error ?? "Errore"); return; }
    setSecretVisible((prev) => ({ ...prev, [id]: res.secret! }));
  }

  async function handleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    const d = await getWebhookDeliveries(id);
    setDeliveries(d);
  }

  function toggleEvent(event: string) {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-[var(--crm-neutral-400)]" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-[var(--crm-neutral-900)] dark:text-white">Webhook</h3>
          <p className="text-sm text-[var(--crm-neutral-500)] mt-0.5">
            Ricevi notifiche HTTP POST quando avvengono eventi nel CRM.
          </p>
        </div>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)} className="bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white">
            <Plus className="h-4 w-4 mr-1.5" /> Nuovo webhook
          </Button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[var(--crm-neutral-600)] mb-1 block">Nome</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Es: Slack notify"
                className="w-full rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--crm-neutral-600)] mb-1 block">URL endpoint</label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/webhook"
                className="w-full rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--crm-neutral-600)] mb-2 block">Eventi</label>
            <div className="flex flex-wrap gap-2">
              {webhookEvents.map((event) => (
                <button
                  key={event}
                  onClick={() => toggleEvent(event)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    selectedEvents.includes(event)
                      ? "bg-[var(--crm-primary)] text-white"
                      : "bg-[var(--crm-neutral-100)] text-[var(--crm-neutral-600)] hover:bg-[var(--crm-neutral-200)]"
                  }`}
                >
                  {EVENT_LABELS[event] ?? event}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => { setShowForm(false); setName(""); setUrl(""); setSelectedEvents([]); }}>
              Annulla
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={creating || !name || !url || selectedEvents.length === 0}
              className="bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Crea webhook
            </Button>
          </div>
        </div>
      )}

      {/* Webhook list */}
      {webhooks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--crm-neutral-200)] px-6 py-12 text-center">
          <Zap className="h-8 w-8 text-[var(--crm-neutral-300)] mx-auto mb-3" />
          <p className="text-sm font-medium text-[var(--crm-neutral-600)]">Nessun webhook configurato</p>
          <p className="text-xs text-[var(--crm-neutral-400)] mt-1">
            Crea il tuo primo webhook per ricevere notifiche quando avvengono eventi nel CRM.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((w) => (
            <div key={w.id} className="rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className={`h-2 w-2 rounded-full flex-shrink-0 ${w.isActive ? "bg-[var(--crm-success)]" : "bg-[var(--crm-neutral-300)]"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{w.name}</p>
                  <p className="text-xs text-[var(--crm-neutral-500)] truncate">{w.url}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-[var(--crm-neutral-400)]">
                  <span className="flex items-center gap-0.5">
                    <CheckCircle2 className="h-3 w-3 text-[var(--crm-success)]" />{w.deliveryStats.success}
                  </span>
                  {w.deliveryStats.failed > 0 && (
                    <span className="flex items-center gap-0.5">
                      <XCircle className="h-3 w-3 text-[var(--crm-danger)]" />{w.deliveryStats.failed}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleToggleActive(w)}
                    className={`rounded-lg px-2 py-1 text-[10px] font-medium transition-colors ${
                      w.isActive
                        ? "bg-green-50 text-green-700 hover:bg-green-100"
                        : "bg-[var(--crm-neutral-100)] text-[var(--crm-neutral-500)] hover:bg-[var(--crm-neutral-200)]"
                    }`}
                  >
                    {w.isActive ? "Attivo" : "Off"}
                  </button>
                  <button
                    onClick={() => handleShowSecret(w.id)}
                    className="p-1.5 rounded hover:bg-[var(--crm-neutral-100)] text-[var(--crm-neutral-400)]"
                    title="Mostra secret"
                  >
                    {secretVisible[w.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => handleTest(w.id)}
                    disabled={testingId === w.id}
                    className="p-1.5 rounded hover:bg-blue-50 text-[var(--crm-neutral-400)] hover:text-blue-600"
                    title="Testa webhook"
                  >
                    {testingId === w.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => handleExpand(w.id)}
                    className="p-1.5 rounded hover:bg-[var(--crm-neutral-100)] text-[var(--crm-neutral-400)]"
                    title="Log consegne"
                  >
                    <Zap className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(w.id)}
                    disabled={deletingId === w.id}
                    className="p-1.5 rounded hover:bg-red-50 text-[var(--crm-neutral-400)] hover:text-[var(--crm-danger)]"
                  >
                    {deletingId === w.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Secret */}
              {secretVisible[w.id] && (
                <div className="px-4 pb-2">
                  <code className="text-xs bg-[var(--crm-neutral-50)] dark:bg-white/5 rounded px-2 py-1 font-mono select-all">
                    {secretVisible[w.id]}
                  </code>
                </div>
              )}

              {/* Events */}
              <div className="px-4 pb-3 flex flex-wrap gap-1">
                {w.events.map((e) => (
                  <span key={e} className="rounded-full bg-[var(--crm-neutral-100)] px-2 py-0.5 text-[10px] font-medium text-[var(--crm-neutral-500)]">
                    {EVENT_LABELS[e] ?? e}
                  </span>
                ))}
              </div>

              {/* Deliveries log */}
              {expandedId === w.id && (
                <div className="border-t border-[var(--crm-neutral-100)] dark:border-white/10 px-4 py-3">
                  <p className="text-xs font-semibold text-[var(--crm-neutral-600)] mb-2">Ultime consegne</p>
                  {deliveries.length === 0 ? (
                    <p className="text-xs text-[var(--crm-neutral-400)]">Nessuna consegna ancora</p>
                  ) : (
                    <div className="space-y-1">
                      {deliveries.map((d) => (
                        <div key={d.id} className="flex items-center gap-2 text-xs">
                          {d.success ? (
                            <CheckCircle2 className="h-3 w-3 text-[var(--crm-success)] flex-shrink-0" />
                          ) : (
                            <XCircle className="h-3 w-3 text-[var(--crm-danger)] flex-shrink-0" />
                          )}
                          <span className="font-medium">{EVENT_LABELS[d.event] ?? d.event}</span>
                          <span className="text-[var(--crm-neutral-400)]">
                            {d.statusCode ? `HTTP ${d.statusCode}` : "Errore"}
                          </span>
                          <span className="text-[var(--crm-neutral-400)] ml-auto">
                            {new Date(d.createdAt).toLocaleString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Documentation */}
      <div className="rounded-xl bg-[var(--crm-neutral-50)] dark:bg-white/5 border border-[var(--crm-neutral-100)] dark:border-white/10 p-4 space-y-2">
        <p className="text-xs font-semibold text-[var(--crm-neutral-600)]">Documentazione</p>
        <p className="text-xs text-[var(--crm-neutral-500)]">
          Ogni richiesta include gli header <code className="bg-white dark:bg-white/10 rounded px-1">X-Webhook-Signature</code> (HMAC-SHA256),{" "}
          <code className="bg-white dark:bg-white/10 rounded px-1">X-Webhook-Event</code> e{" "}
          <code className="bg-white dark:bg-white/10 rounded px-1">X-Webhook-Id</code>.
          Verifica la firma confrontando <code className="bg-white dark:bg-white/10 rounded px-1">HMAC-SHA256(body, secret)</code> con il valore dell&apos;header.
        </p>
      </div>
    </div>
  );
}
