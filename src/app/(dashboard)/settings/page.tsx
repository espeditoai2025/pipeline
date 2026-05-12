"use client";

import { useState } from "react";
import {
  User, Shield, CreditCard, Sliders, Building2,
  Save, Loader2, Eye, EyeOff, Plus, Trash2, Download,
  CheckCircle2, XCircle, Clock, Key, Users, LogOut,
  Smartphone, Monitor,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  MOCK_SESSIONS, MOCK_API_KEYS, MOCK_INVOICES, MOCK_TEAM_MEMBERS, USAGE,
  type Session, type ApiKey, type TeamMember,
} from "@/lib/mock-settings";

type Tab = "profile" | "security" | "billing" | "preferences" | "organization";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile",      label: "Profilo",        icon: User },
  { id: "security",     label: "Sicurezza",      icon: Shield },
  { id: "billing",      label: "Billing",        icon: CreditCard },
  { id: "preferences",  label: "Preferenze",     icon: Sliders },
  { id: "organization", label: "Organizzazione", icon: Building2 },
];

const PLANS = [
  {
    id: "starter", name: "Starter", price: 29, currency: "€", period: "mese",
    features: ["100 affari", "500 contatti", "5 GB storage", "5.000 email/mese", "10 automazioni"],
    current: false,
  },
  {
    id: "pro", name: "Pro", price: 79, currency: "€", period: "mese",
    features: ["Affari illimitati", "5.000 contatti", "50 GB storage", "50.000 email/mese", "Automazioni illimitate", "AI Assistant", "Report avanzati"],
    current: true,
  },
  {
    id: "enterprise", name: "Enterprise", price: null, currency: "€", period: "mese",
    features: ["Tutto di Pro", "Contatti illimitati", "Storage illimitato", "SLA 99.9%", "SSO / SAML", "Supporto dedicato"],
    current: false,
  },
];

const ROLE_LABELS: Record<TeamMember["role"], string> = {
  ADMIN: "Admin", MANAGER: "Manager", SALES: "Sales", VIEWER: "Viewer",
};
const ROLE_COLORS: Record<TeamMember["role"], string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  MANAGER: "bg-blue-100 text-blue-700",
  SALES: "bg-green-100 text-green-700",
  VIEWER: "bg-gray-100 text-gray-600",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "Adesso";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} min fa`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} ore fa`;
  return `${Math.floor(diff / 86400_000)} giorni fa`;
}

function UsageMeter({ label, used, limit, unit }: { label: string; used: number; limit: number; unit?: string }) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const color = pct >= 90 ? "bg-[var(--crm-danger)]" : pct >= 70 ? "bg-[var(--crm-warning)]" : "bg-[var(--crm-primary)]";
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm">{label}</span>
        <span className="text-xs text-[var(--crm-neutral-500)]">{used}{unit ?? ""} / {limit}{unit ?? ""} ({pct}%)</span>
      </div>
      <div className="h-2 w-full rounded-full bg-[var(--crm-neutral-100)]">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] bg-transparent";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");

  // Profile state
  const [profile, setProfile] = useState({ name: "Mario Rossi", email: "mario@acme.com", phone: "+39 02 1234567", timezone: "Europe/Rome", jobTitle: "Sales Director" });
  const [savingProfile, setSavingProfile] = useState(false);

  // Security state
  const [showPwd, setShowPwd] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [sessions, setSessions] = useState<Session[]>(MOCK_SESSIONS);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(MOCK_API_KEYS);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  // Preferences state
  const [prefs, setPrefs] = useState({ language: "it", emailNotif: true, pushNotif: false, weeklyReport: true, theme: "system" });

  // Org state
  const [orgName, setOrgName] = useState("Acme S.r.l.");
  const [members] = useState<TeamMember[]>(MOCK_TEAM_MEMBERS);

  async function handleSaveProfile() {
    setSavingProfile(true);
    await new Promise((r) => setTimeout(r, 600));
    setSavingProfile(false);
    toast.success("Profilo aggiornato");
  }

  function handleRevokeSession(id: string) {
    setSessions((s) => s.filter((x) => x.id !== id));
    toast.success("Sessione revocata");
  }

  function handleGenerateKey() {
    if (!newKeyName.trim()) { toast.error("Inserisci un nome per la chiave"); return; }
    const raw = `crm_live_${Math.random().toString(36).slice(2, 14)}`;
    setGeneratedKey(raw);
    const key: ApiKey = {
      id: `key-${Date.now()}`,
      name: newKeyName,
      prefix: raw.slice(0, 14),
      scopes: ["deals:read", "contacts:read"],
      lastUsed: null,
      createdAt: new Date().toISOString(),
      expiresAt: null,
    };
    setApiKeys((k) => [key, ...k]);
    setNewKeyName("");
    toast.success("Chiave API generata — copiala ora, non sarà più visibile");
  }

  function handleRevokeKey(id: string) {
    setApiKeys((k) => k.filter((x) => x.id !== id));
    toast.success("Chiave API revocata");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Impostazioni</h1>
        <p className="text-sm text-[var(--crm-neutral-500)]">Gestisci il tuo account, sicurezza e fatturazione</p>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Sidebar tabs */}
        <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible shrink-0 lg:w-48">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${tab === id ? "bg-[var(--crm-primary)] text-white" : "text-[var(--crm-neutral-600)] hover:bg-[var(--crm-neutral-100)]"}`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* ── PROFILO ── */}
          {tab === "profile" && (
            <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-6 space-y-5">
              <h2 className="text-base font-semibold">Informazioni personali</h2>

              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--crm-primary)]/10 text-2xl font-bold text-[var(--crm-primary)]">
                  {profile.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <p className="font-semibold">{profile.name}</p>
                  <p className="text-sm text-[var(--crm-neutral-500)]">{profile.email}</p>
                  <button className="mt-1 text-xs text-[var(--crm-primary)] hover:underline">Cambia avatar</button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nome completo</label>
                  <input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Telefono</label>
                  <input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ruolo / Titolo</label>
                  <input value={profile.jobTitle} onChange={e => setProfile(p => ({ ...p, jobTitle: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fuso orario</label>
                  <select value={profile.timezone} onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))} className={inputCls}>
                    <option value="Europe/Rome">Europe/Rome (CET)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                  </select>
                </div>
              </div>

              <Button onClick={handleSaveProfile} disabled={savingProfile} className="bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white">
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salva modifiche
              </Button>
            </div>
          )}

          {/* ── SICUREZZA ── */}
          {tab === "security" && (
            <div className="space-y-4">
              {/* Password */}
              <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-6 space-y-4">
                <h2 className="text-base font-semibold">Cambio password</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1">Password attuale</label>
                    <div className="relative">
                      <input type={showPwd ? "text" : "password"} className={`${inputCls} pr-10`} placeholder="••••••••" />
                      <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--crm-neutral-400)]">
                        {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Nuova password</label>
                    <input type="password" className={inputCls} placeholder="••••••••" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Conferma nuova</label>
                    <input type="password" className={inputCls} placeholder="••••••••" />
                  </div>
                </div>
                <Button variant="outline" onClick={() => toast.success("Password aggiornata (simulazione)")}>
                  Aggiorna password
                </Button>
              </div>

              {/* 2FA */}
              <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-semibold">Autenticazione a due fattori</h2>
                    <p className="text-sm text-[var(--crm-neutral-500)] mt-0.5">Aggiunge un ulteriore livello di sicurezza al tuo account</p>
                  </div>
                  <button
                    onClick={() => { setTwoFAEnabled(v => !v); toast.success(twoFAEnabled ? "2FA disabilitato" : "2FA abilitato (simulazione)"); }}
                    className={`relative h-5 w-9 rounded-full transition-colors flex-shrink-0 ${twoFAEnabled ? "bg-[var(--crm-primary)]" : "bg-[var(--crm-neutral-200)]"}`}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${twoFAEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                </div>
                {twoFAEnabled && (
                  <div className="mt-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 px-3 py-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <p className="text-xs text-green-700">2FA attivo — account protetto con app di autenticazione</p>
                  </div>
                )}
              </div>

              {/* Sessions */}
              <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-6 space-y-3">
                <h2 className="text-base font-semibold">Sessioni attive</h2>
                <div className="space-y-2">
                  {sessions.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2.5">
                      {s.device.includes("iPhone") || s.device.includes("Mobile")
                        ? <Smartphone className="h-4 w-4 text-[var(--crm-neutral-500)] flex-shrink-0" />
                        : <Monitor className="h-4 w-4 text-[var(--crm-neutral-500)] flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{s.device} · {s.browser}</p>
                        <p className="text-xs text-[var(--crm-neutral-500)]">{s.location} · {s.ip} · {timeAgo(s.lastActive)}</p>
                      </div>
                      {s.isCurrent
                        ? <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-medium flex-shrink-0">Corrente</span>
                        : (
                          <button
                            onClick={() => handleRevokeSession(s.id)}
                            className="flex items-center gap-1 text-xs text-[var(--crm-danger)] hover:underline flex-shrink-0"
                          >
                            <LogOut className="h-3 w-3" /> Revoca
                          </button>
                        )}
                    </div>
                  ))}
                </div>
              </div>

              {/* API Keys */}
              <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-6 space-y-3">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <Key className="h-4 w-4 text-[var(--crm-primary)]" /> Chiavi API
                </h2>

                {generatedKey && (
                  <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 px-3 py-2 space-y-1">
                    <p className="text-xs font-semibold text-green-700">Chiave generata — copiala ora!</p>
                    <code className="block text-xs font-mono text-green-800 break-all">{generatedKey}</code>
                    <button
                      onClick={() => { navigator.clipboard.writeText(generatedKey); toast.success("Copiata negli appunti"); }}
                      className="text-xs text-green-600 hover:underline"
                    >Copia negli appunti</button>
                    <button onClick={() => setGeneratedKey(null)} className="ml-4 text-xs text-green-600 hover:underline">Chiudi</button>
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="Nome chiave (es. Integrazione Zapier)"
                    className={`${inputCls} flex-1`}
                  />
                  <Button variant="outline" onClick={handleGenerateKey}>
                    <Plus className="h-4 w-4 mr-1.5" /> Genera
                  </Button>
                </div>

                <div className="space-y-2">
                  {apiKeys.map((k) => (
                    <div key={k.id} className="flex items-center gap-3 rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2.5">
                      <Key className="h-4 w-4 text-[var(--crm-neutral-400)] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{k.name}</p>
                        <p className="text-xs font-mono text-[var(--crm-neutral-500)]">{k.prefix}••••••••</p>
                        <p className="text-xs text-[var(--crm-neutral-400)]">
                          {k.lastUsed ? `Usata ${timeAgo(k.lastUsed)}` : "Mai usata"}
                          {k.expiresAt && ` · scade ${new Date(k.expiresAt).toLocaleDateString("it-IT")}`}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1 mr-2">
                        {k.scopes.map(sc => (
                          <span key={sc} className="rounded-full bg-[var(--crm-neutral-100)] px-1.5 py-0.5 text-xs">{sc}</span>
                        ))}
                      </div>
                      <button
                        onClick={() => handleRevokeKey(k.id)}
                        className="text-[var(--crm-neutral-400)] hover:text-[var(--crm-danger)]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── BILLING ── */}
          {tab === "billing" && (
            <div className="space-y-4">
              {/* Plans */}
              <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-6 space-y-4">
                <h2 className="text-base font-semibold">Piano attuale</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PLANS.map((plan) => (
                    <div
                      key={plan.id}
                      className={`rounded-xl border-2 p-4 transition-colors ${plan.current ? "border-[var(--crm-primary)] bg-[var(--crm-primary)]/5" : "border-[var(--crm-neutral-100)]"}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold">{plan.name}</p>
                        {plan.current && <span className="rounded-full bg-[var(--crm-primary)] text-white text-xs px-2 py-0.5">Attivo</span>}
                      </div>
                      <p className="text-2xl font-bold mb-3">
                        {plan.price ? `${plan.currency}${plan.price}` : "Custom"}
                        {plan.price && <span className="text-sm font-normal text-[var(--crm-neutral-500)]">/{plan.period}</span>}
                      </p>
                      <ul className="space-y-1 mb-4">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-center gap-1.5 text-xs text-[var(--crm-neutral-600)]">
                            <CheckCircle2 className="h-3 w-3 text-[var(--crm-success)] flex-shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      {!plan.current && (
                        <Button
                          size="sm"
                          variant={plan.id === "enterprise" ? "outline" : "default"}
                          className={plan.id !== "enterprise" ? "bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white w-full" : "w-full"}
                          onClick={() => toast.info(`Contatta il sales per passare al piano ${plan.name}`)}
                        >
                          {plan.id === "enterprise" ? "Contatta sales" : "Upgrade"}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Usage */}
              <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-6 space-y-4">
                <h2 className="text-base font-semibold">Utilizzo piano</h2>
                <div className="space-y-3">
                  <UsageMeter label="Affari" used={USAGE.deals.used} limit={USAGE.deals.limit} />
                  <UsageMeter label="Contatti" used={USAGE.contacts.used} limit={USAGE.contacts.limit} />
                  <UsageMeter label="Storage" used={USAGE.storage.used} limit={USAGE.storage.limit} unit=" GB" />
                  <UsageMeter label="Email inviate" used={USAGE.emails.used} limit={USAGE.emails.limit} />
                  <UsageMeter label="Automazioni" used={USAGE.automations.used} limit={USAGE.automations.limit} />
                </div>
              </div>

              {/* Invoices */}
              <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-6 space-y-3">
                <h2 className="text-base font-semibold">Storico fatture</h2>
                <div className="divide-y divide-[var(--crm-neutral-100)]">
                  {MOCK_INVOICES.map((inv) => (
                    <div key={inv.id} className="flex items-center gap-3 py-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{inv.description}</p>
                        <p className="text-xs text-[var(--crm-neutral-500)]">{new Date(inv.date).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}</p>
                      </div>
                      <p className="font-semibold text-sm">{inv.currency === "EUR" ? "€" : inv.currency}{inv.amount}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${inv.status === "paid" ? "bg-green-100 text-green-700" : inv.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                        {inv.status === "paid" ? "Pagata" : inv.status === "pending" ? "In attesa" : "Fallita"}
                      </span>
                      <button
                        onClick={() => toast.info("Download fattura (simulazione)")}
                        className="p-1.5 rounded hover:bg-[var(--crm-neutral-100)] text-[var(--crm-neutral-500)]"
                        title="Scarica PDF"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── PREFERENZE ── */}
          {tab === "preferences" && (
            <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-6 space-y-5">
              <h2 className="text-base font-semibold">Preferenze</h2>

              <div>
                <label className="block text-sm font-medium mb-1">Lingua interfaccia</label>
                <select
                  value={prefs.language}
                  onChange={(e) => setPrefs(p => ({ ...p, language: e.target.value }))}
                  className={`${inputCls} max-w-xs`}
                >
                  <option value="it">Italiano</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tema</label>
                <div className="flex gap-2">
                  {["light", "dark", "system"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setPrefs(p => ({ ...p, theme: t }))}
                      className={`rounded-lg border-2 px-4 py-2 text-sm capitalize transition-colors ${prefs.theme === t ? "border-[var(--crm-primary)] bg-[var(--crm-primary)]/5" : "border-[var(--crm-neutral-100)]"}`}
                    >
                      {t === "light" ? "Chiaro" : t === "dark" ? "Scuro" : "Sistema"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Notifiche</p>
                {[
                  { key: "emailNotif", label: "Notifiche email", desc: "Ricevi aggiornamenti su affari e attività via email" },
                  { key: "pushNotif", label: "Notifiche push", desc: "Notifiche browser in tempo reale" },
                  { key: "weeklyReport", label: "Report settimanale", desc: "Riepilogo performance ogni lunedì mattina" },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-[var(--crm-neutral-500)]">{desc}</p>
                    </div>
                    <button
                      onClick={() => setPrefs(p => ({ ...p, [key]: !p[key as keyof typeof p] }))}
                      className={`relative h-5 w-9 rounded-full flex-shrink-0 transition-colors mt-0.5 ${prefs[key as keyof typeof prefs] ? "bg-[var(--crm-primary)]" : "bg-[var(--crm-neutral-200)]"}`}
                    >
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${prefs[key as keyof typeof prefs] ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                ))}
              </div>

              <Button onClick={() => toast.success("Preferenze salvate")} className="bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white">
                <Save className="h-4 w-4 mr-2" /> Salva preferenze
              </Button>
            </div>
          )}

          {/* ── ORGANIZZAZIONE ── */}
          {tab === "organization" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-6 space-y-4">
                <h2 className="text-base font-semibold">Dettagli organizzazione</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1">Nome organizzazione</label>
                    <input value={orgName} onChange={(e) => setOrgName(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Dominio email</label>
                    <input defaultValue="acme.com" className={inputCls} placeholder="acme.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Settore</label>
                    <select className={inputCls}>
                      <option>Tecnologia</option>
                      <option>Manifattura</option>
                      <option>Servizi</option>
                      <option>Retail</option>
                    </select>
                  </div>
                </div>
                <Button onClick={() => toast.success("Organizzazione aggiornata")} className="bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white">
                  <Save className="h-4 w-4 mr-2" /> Salva
                </Button>
              </div>

              <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-[var(--crm-primary)]" /> Membri del team ({members.length})
                  </h2>
                  <Button size="sm" variant="outline" onClick={() => toast.info("Invita membro (simulazione)")}>
                    <Plus className="h-4 w-4 mr-1.5" /> Invita
                  </Button>
                </div>
                <div className="divide-y divide-[var(--crm-neutral-100)]">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 py-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--crm-primary)]/10 text-sm font-bold text-[var(--crm-primary)] flex-shrink-0">
                        {m.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{m.name}</p>
                        <p className="text-xs text-[var(--crm-neutral-500)]">{m.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[m.role]}`}>{ROLE_LABELS[m.role]}</span>
                        {m.lastLogin && (
                          <span className="text-xs text-[var(--crm-neutral-400)] hidden sm:block">
                            <Clock className="h-3 w-3 inline mr-0.5" />{timeAgo(m.lastLogin)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
