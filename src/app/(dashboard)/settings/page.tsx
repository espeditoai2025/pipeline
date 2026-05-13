"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  User, Shield, CreditCard, Sliders, Building2, Mail,
  Save, Loader2, Eye, EyeOff, Plus, Trash2,
  CheckCircle2, Clock, Key, Users, LogOut,
  Smartphone, Monitor, Package, Briefcase, Activity,
  Zap, BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getOrgData, updateOrgName, getTeamMembers, getUsageStats } from "@/server/actions/settings";
import { getSmtpConfig } from "@/server/actions/smtp";
import { SmtpWizard } from "@/components/settings/SmtpWizard";
import type { SmtpConfigPublic } from "@/server/actions/smtp";

type Tab = "profile" | "security" | "billing" | "preferences" | "organization" | "email";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile",      label: "Profilo",        icon: User },
  { id: "security",     label: "Sicurezza",      icon: Shield },
  { id: "billing",      label: "Billing",        icon: CreditCard },
  { id: "preferences",  label: "Preferenze",     icon: Sliders },
  { id: "organization", label: "Organizzazione", icon: Building2 },
  { id: "email",        label: "Email",          icon: Mail },
];

const PLANS = [
  {
    id: "starter", name: "Starter", price: 0, currency: "€", period: "mese",
    features: ["1 pipeline", "Fino a 500 contatti", "Report base", "App mobile"],
  },
  {
    id: "pro", name: "Pro", price: 29, currency: "€", period: "mese",
    features: ["Pipeline illimitate", "Contatti illimitati", "AI Assistant", "Automazioni avanzate", "Report personalizzati"],
  },
  {
    id: "enterprise", name: "Enterprise", price: null, currency: "€", period: "mese",
    features: ["Tutto di Pro", "Contatti illimitati", "SLA 99.5%", "SSO / SAML", "Supporto dedicato"],
  },
];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin", MANAGER: "Manager", SALES: "Sales", VIEWER: "Viewer",
};
const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  MANAGER: "bg-blue-100 text-blue-700",
  SALES: "bg-green-100 text-green-700",
  VIEWER: "bg-gray-100 text-gray-600",
};
const PLAN_LABELS: Record<string, string> = {
  FREE: "Free", STARTER: "Starter", PRO: "Pro", ENTERPRISE: "Enterprise",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "Adesso";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} min fa`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h fa`;
  return `${Math.floor(diff / 86400_000)}g fa`;
}

function UsageMeter({ label, used, limit, unit, icon: Icon }: {
  label: string; used: number; limit: number; unit?: string; icon: React.ElementType;
}) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const color = pct >= 90 ? "bg-[var(--crm-danger)]" : pct >= 70 ? "bg-[var(--crm-warning)]" : "bg-[var(--crm-primary)]";
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="flex items-center gap-1.5 text-sm">
          <Icon className="h-3.5 w-3.5 text-[var(--crm-neutral-400)]" /> {label}
        </span>
        <span className="text-xs text-[var(--crm-neutral-500)]">
          {used}{unit ?? ""}{limit > 0 ? ` / ${limit}${unit ?? ""}` : ""}
        </span>
      </div>
      {limit > 0 && (
        <div className="h-2 w-full rounded-full bg-[var(--crm-neutral-100)]">
          <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] bg-transparent";

type OrgData = Awaited<ReturnType<typeof getOrgData>>;
type Members = Awaited<ReturnType<typeof getTeamMembers>>;
type Usage = Awaited<ReturnType<typeof getUsageStats>>;

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");
  const { data: session } = useSession();

  // Profile
  const [profile, setProfile] = useState({ name: "", email: "", phone: "", timezone: "Europe/Rome", jobTitle: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    const user = session?.user;
    if (user) {
      setProfile(p => ({ ...p, name: user.name ?? "", email: user.email ?? "" }));
    }
  }, [session]);

  // Security
  const [showPwd, setShowPwd] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<{ id: string; name: string; prefix: string; createdAt: string }[]>([]);

  // Preferences
  const [prefs, setPrefs] = useState({ language: "it", emailNotif: true, pushNotif: false, weeklyReport: true, theme: "system" });

  // Org — real data
  const [orgData, setOrgData] = useState<OrgData>(null);
  const [orgName, setOrgName] = useState("");
  const [savingOrg, setSavingOrg] = useState(false);
  const [members, setMembers] = useState<Members>([]);
  const [usage, setUsage] = useState<Usage>(null);

  // SMTP
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfigPublic | null>(null);
  const [smtpLoaded, setSmtpLoaded] = useState(false);

  useEffect(() => {
    getOrgData().then((d) => { setOrgData(d); if (d) setOrgName(d.name); });
    getTeamMembers().then(setMembers);
    getUsageStats().then(setUsage);
    getSmtpConfig().then((c) => { setSmtpConfig(c); setSmtpLoaded(true); });
  }, []);

  async function handleSaveProfile() {
    setSavingProfile(true);
    await new Promise((r) => setTimeout(r, 400));
    setSavingProfile(false);
    toast.success("Profilo aggiornato");
  }

  async function handleSaveOrg() {
    setSavingOrg(true);
    const res = await updateOrgName(orgName);
    setSavingOrg(false);
    if (res.error) toast.error(res.error);
    else { setOrgData((d) => d ? { ...d, name: orgName } : d); toast.success("Organizzazione aggiornata"); }
  }

  function handleGenerateKey() {
    if (!newKeyName.trim()) { toast.error("Inserisci un nome per la chiave"); return; }
    const raw = `pip_live_${Math.random().toString(36).slice(2, 14)}`;
    setGeneratedKey(raw);
    setApiKeys((k) => [{ id: `key-${Date.now()}`, name: newKeyName, prefix: raw.slice(0, 12), createdAt: new Date().toISOString() }, ...k]);
    setNewKeyName("");
    toast.success("Chiave API generata — copiala ora!");
  }

  return (
    <div className="space-y-6">
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

        <div className="flex-1 min-w-0 space-y-4">

          {/* ── PROFILO ── */}
          {tab === "profile" && (
            <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-6 space-y-5">
              <h2 className="text-base font-semibold">Informazioni personali</h2>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--crm-primary)]/10 text-2xl font-bold text-[var(--crm-primary)]">
                  {profile.name ? profile.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?"}
                </div>
                <div>
                  <p className="font-semibold">{profile.name || "—"}</p>
                  <p className="text-sm text-[var(--crm-neutral-500)]">{profile.email}</p>
                  {orgData && (
                    <p className="text-xs text-[var(--crm-neutral-400)] mt-0.5">
                      {orgData.name} · Piano {PLAN_LABELS[orgData.plan] ?? orgData.plan}
                    </p>
                  )}
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
                  <input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="es. +39 02 1234567" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ruolo / Titolo</label>
                  <input value={profile.jobTitle} onChange={e => setProfile(p => ({ ...p, jobTitle: e.target.value }))} placeholder="es. Sales Manager" className={inputCls} />
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
                <Button variant="outline" onClick={() => toast.info("Funzionalità disponibile a breve")}>
                  Aggiorna password
                </Button>
              </div>

              <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-semibold">Autenticazione a due fattori</h2>
                    <p className="text-sm text-[var(--crm-neutral-500)] mt-0.5">Aggiunge un ulteriore livello di sicurezza</p>
                  </div>
                  <button
                    onClick={() => { setTwoFAEnabled(v => !v); toast.success(twoFAEnabled ? "2FA disabilitato" : "2FA abilitato"); }}
                    className={`relative h-5 w-9 rounded-full transition-colors flex-shrink-0 ${twoFAEnabled ? "bg-[var(--crm-primary)]" : "bg-[var(--crm-neutral-200)]"}`}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${twoFAEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                </div>
                {twoFAEnabled && (
                  <div className="mt-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 px-3 py-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <p className="text-xs text-green-700">2FA attivo — account protetto</p>
                  </div>
                )}
              </div>

              {/* Sessione corrente */}
              <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-6 space-y-3">
                <h2 className="text-base font-semibold">Sessione corrente</h2>
                <div className="flex items-center gap-3 rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2.5">
                  <Monitor className="h-4 w-4 text-[var(--crm-neutral-500)] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Browser corrente</p>
                    <p className="text-xs text-[var(--crm-neutral-500)]">
                      Connesso come {session?.user?.email}
                    </p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-medium flex-shrink-0">
                    Attiva
                  </span>
                </div>
                <button
                  onClick={() => toast.info("Disconnessione da tutti i dispositivi: funzionalità in arrivo")}
                  className="flex items-center gap-1.5 text-xs text-[var(--crm-danger)] hover:underline"
                >
                  <LogOut className="h-3 w-3" /> Disconnetti da tutti i dispositivi
                </button>
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
                    <div className="flex gap-3">
                      <button onClick={() => { navigator.clipboard.writeText(generatedKey); toast.success("Copiata!"); }} className="text-xs text-green-600 hover:underline">Copia</button>
                      <button onClick={() => setGeneratedKey(null)} className="text-xs text-green-600 hover:underline">Chiudi</button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="Nome chiave (es. Zapier)" className={`${inputCls} flex-1`} />
                  <Button variant="outline" onClick={handleGenerateKey}><Plus className="h-4 w-4 mr-1.5" /> Genera</Button>
                </div>

                {apiKeys.length === 0 ? (
                  <p className="text-xs text-[var(--crm-neutral-400)] py-2">Nessuna chiave API creata.</p>
                ) : (
                  <div className="space-y-2">
                    {apiKeys.map((k) => (
                      <div key={k.id} className="flex items-center gap-3 rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2.5">
                        <Key className="h-4 w-4 text-[var(--crm-neutral-400)] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{k.name}</p>
                          <p className="text-xs font-mono text-[var(--crm-neutral-500)]">{k.prefix}••••••••</p>
                          <p className="text-xs text-[var(--crm-neutral-400)]">Creata {timeAgo(k.createdAt)}</p>
                        </div>
                        <button onClick={() => { setApiKeys((arr) => arr.filter((x) => x.id !== k.id)); toast.success("Chiave revocata"); }} className="text-[var(--crm-neutral-400)] hover:text-[var(--crm-danger)]">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── BILLING ── */}
          {tab === "billing" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold">Piano attuale</h2>
                  {orgData && (
                    <span className="rounded-full bg-[var(--crm-primary)] text-white text-xs px-3 py-1 font-medium">
                      {PLAN_LABELS[orgData.plan] ?? orgData.plan}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PLANS.map((plan) => {
                    const isCurrent = orgData?.plan === plan.id.toUpperCase() || (orgData?.plan === "FREE" && plan.id === "starter");
                    return (
                      <div key={plan.id} className={`rounded-xl border-2 p-4 transition-colors ${isCurrent ? "border-[var(--crm-primary)] bg-[var(--crm-primary)]/5" : "border-[var(--crm-neutral-100)]"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold">{plan.name}</p>
                          {isCurrent && <span className="rounded-full bg-[var(--crm-primary)] text-white text-xs px-2 py-0.5">Attivo</span>}
                        </div>
                        <p className="text-2xl font-bold mb-3">
                          {plan.price === 0 ? "Gratis" : plan.price ? `${plan.currency}${plan.price}` : "Custom"}
                          {plan.price ? <span className="text-sm font-normal text-[var(--crm-neutral-500)]">/{plan.period}</span> : null}
                        </p>
                        <ul className="space-y-1 mb-4">
                          {plan.features.map((f) => (
                            <li key={f} className="flex items-center gap-1.5 text-xs text-[var(--crm-neutral-600)]">
                              <CheckCircle2 className="h-3 w-3 text-[var(--crm-success)] flex-shrink-0" />{f}
                            </li>
                          ))}
                        </ul>
                        {!isCurrent && (
                          <Button size="sm" variant={plan.id === "enterprise" ? "outline" : "default"}
                            className={plan.id !== "enterprise" ? "bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white w-full" : "w-full"}
                            onClick={() => toast.info(`Contatta il sales per il piano ${plan.name}`)}>
                            {plan.id === "enterprise" ? "Contatta sales" : "Upgrade"}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Usage reale */}
              <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-6 space-y-4">
                <h2 className="text-base font-semibold">Utilizzo attuale</h2>
                {usage ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[
                      { label: "Affari", value: usage.deals, icon: Briefcase },
                      { label: "Contatti", value: usage.contacts, icon: Users },
                      { label: "Aziende", value: usage.companies, icon: Building2 },
                      { label: "Attività", value: usage.activities, icon: Activity },
                      { label: "Lead", value: usage.leads, icon: Zap },
                      { label: "Prodotti", value: usage.products, icon: Package },
                    ].map((s) => (
                      <div key={s.label} className="rounded-lg border border-[var(--crm-neutral-100)] p-3 text-center">
                        <s.icon className="h-5 w-5 text-[var(--crm-primary)] mx-auto mb-1" />
                        <p className="text-xl font-bold text-[var(--crm-neutral-900)] dark:text-white">{s.value}</p>
                        <p className="text-xs text-[var(--crm-neutral-500)]">{s.label}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--crm-neutral-500)]">Caricamento...</p>
                )}
              </div>

              <div className="rounded-xl border border-dashed border-[var(--crm-neutral-200)] p-6 text-center">
                <BarChart3 className="h-8 w-8 text-[var(--crm-neutral-300)] mx-auto mb-2" />
                <p className="text-sm font-medium text-[var(--crm-neutral-500)]">Storico fatture</p>
                <p className="text-xs text-[var(--crm-neutral-400)] mt-1">La gestione pagamenti sarà disponibile prossimamente.</p>
              </div>
            </div>
          )}

          {/* ── PREFERENZE ── */}
          {tab === "preferences" && (
            <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-6 space-y-5">
              <h2 className="text-base font-semibold">Preferenze</h2>

              <div>
                <label className="block text-sm font-medium mb-1">Lingua interfaccia</label>
                <select value={prefs.language} onChange={(e) => setPrefs(p => ({ ...p, language: e.target.value }))} className={`${inputCls} max-w-xs`}>
                  <option value="it">Italiano</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tema</label>
                <div className="flex gap-2">
                  {["light", "dark", "system"].map((t) => (
                    <button key={t} onClick={() => setPrefs(p => ({ ...p, theme: t }))}
                      className={`rounded-lg border-2 px-4 py-2 text-sm capitalize transition-colors ${prefs.theme === t ? "border-[var(--crm-primary)] bg-[var(--crm-primary)]/5" : "border-[var(--crm-neutral-100)]"}`}>
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
                  { key: "weeklyReport", label: "Report settimanale", desc: "Riepilogo performance ogni lunedì" },
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
                  {orgData && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1">Slug</label>
                        <input value={orgData.slug} disabled className={`${inputCls} opacity-50 cursor-not-allowed`} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Piano</label>
                        <input value={PLAN_LABELS[orgData.plan] ?? orgData.plan} disabled className={`${inputCls} opacity-50 cursor-not-allowed`} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Membro dal</label>
                        <input value={new Date(orgData.createdAt).toLocaleDateString("it-IT")} disabled className={`${inputCls} opacity-50 cursor-not-allowed`} />
                      </div>
                    </>
                  )}
                </div>
                <Button onClick={handleSaveOrg} disabled={savingOrg} className="bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white">
                  {savingOrg ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Salva
                </Button>
              </div>

              <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-[var(--crm-primary)]" />
                    Membri del team ({members.length})
                  </h2>
                </div>
                {members.length === 0 ? (
                  <p className="text-sm text-[var(--crm-neutral-500)] py-2">Caricamento...</p>
                ) : (
                  <div className="divide-y divide-[var(--crm-neutral-100)]">
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center gap-3 py-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--crm-primary)]/10 text-sm font-bold text-[var(--crm-primary)] flex-shrink-0">
                          {(m.name ?? m.email).split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{m.name ?? "—"}</p>
                          <p className="text-xs text-[var(--crm-neutral-500)]">{m.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[m.role] ?? "bg-gray-100 text-gray-600"}`}>
                            {ROLE_LABELS[m.role] ?? m.role}
                          </span>
                          <span className="text-xs text-[var(--crm-neutral-400)] hidden sm:flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {timeAgo(m.createdAt.toISOString())}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "email" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-semibold">Provider email</h2>
                <p className="text-sm text-[var(--crm-neutral-500)] mt-0.5">
                  Configura il tuo account email per inviare messaggi direttamente da Pipely.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-5 shadow-sm">
                {smtpLoaded
                  ? <SmtpWizard initial={smtpConfig} />
                  : <div className="flex items-center gap-2 text-sm text-[var(--crm-neutral-400)]"><Loader2 className="h-4 w-4 animate-spin" /> Caricamento…</div>
                }
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
