"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
  User, Shield, CreditCard, Sliders, Building2, Mail,
  Save, Loader2, Eye, EyeOff, Plus, Trash2,
  CheckCircle2, Clock, Key, Users, LogOut,
  Monitor, Package, Briefcase, Activity,
  Zap, BarChart3, Send, X, ChevronDown, SlidersHorizontal, DollarSign,
  Download, AlertTriangle, ExternalLink, Receipt, Calendar, ClipboardList, MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  getOrgData, updateOrgDetails, getTeamMembers, getUsageStats,
  inviteTeamMember, getInvitations, revokeInvitation, removeMember, updateMemberRole,
  deleteAccount, changePassword, getApiKeys, createApiKey, revokeApiKey,
  getMyProfile, updateProfile, logoutAllDevices,
} from "@/server/actions/settings";
import { useUIStore } from "@/stores/ui";
import type { ApiKeyPublic } from "@/server/actions/settings";
import { getSmtpConfig } from "@/server/actions/smtp";
import dynamic from "next/dynamic";
const SmtpWizard = dynamic(() => import("@/components/settings/SmtpWizard").then(m => m.SmtpWizard), { ssr: false, loading: () => <div className="h-12 animate-pulse rounded-lg bg-[var(--crm-neutral-100)]" /> });
import { CustomFieldsManager } from "@/components/settings/CustomFieldsManager";
import { WebhooksManager } from "@/components/settings/WebhooksManager";
import { InvoicesManager } from "@/components/invoices/InvoicesManager";
import { BookingPagesManager } from "@/components/bookings/BookingPagesManager";
import { SurveysManager } from "@/components/surveys/SurveysManager";
import { ChatWidgetManager } from "@/components/settings/ChatWidgetManager";
import { BillingTypesManager } from "@/components/settings/BillingTypesManager";
import type { SmtpConfigPublic } from "@/server/actions/smtp";
type Role = "OWNER" | "ADMIN" | "MANAGER" | "SALES" | "VIEWER";

type Tab = "profile" | "security" | "billing" | "preferences" | "organization" | "email" | "fields" | "pricing" | "webhooks" | "invoices" | "bookings" | "surveys" | "chatbot";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile",      label: "Profilo",        icon: User },
  { id: "security",     label: "Sicurezza",      icon: Shield },
  { id: "billing",      label: "Billing",        icon: CreditCard },
  { id: "preferences",  label: "Preferenze",     icon: Sliders },
  { id: "organization", label: "Organizzazione", icon: Building2 },
  { id: "email",        label: "Email",          icon: Mail },
  { id: "fields",       label: "Campi",          icon: SlidersHorizontal },
  { id: "pricing",      label: "Prezzi",         icon: DollarSign },
  { id: "webhooks",     label: "Webhook",        icon: Zap },
  { id: "invoices",     label: "Fatture",        icon: Receipt },
  { id: "bookings",     label: "Prenotazioni",   icon: Calendar },
  { id: "surveys",      label: "Sondaggi",       icon: ClipboardList },
  { id: "chatbot",      label: "Chatbot",        icon: MessageCircle },
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
  OWNER: "Owner", ADMIN: "Admin", MANAGER: "Manager", SALES: "Sales", VIEWER: "Viewer",
};
const ASSIGNABLE_ROLES: Role[] = ["ADMIN", "MANAGER", "SALES", "VIEWER"];
const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-yellow-100 text-yellow-700",
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


const inputCls = "w-full rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] bg-transparent";

type OrgData = Awaited<ReturnType<typeof getOrgData>>;
type Members = Awaited<ReturnType<typeof getTeamMembers>>;
type Usage = Awaited<ReturnType<typeof getUsageStats>>;
type Invitations = Awaited<ReturnType<typeof getInvitations>>;

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");
  const { data: session } = useSession();

  // Profile
  const [profile, setProfile] = useState({ name: "", email: "", phone: "", timezone: "Europe/Rome", jobTitle: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  // Security — password change
  const [showPwd, setShowPwd] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeyPublic[]>([]);
  const [creatingKey, setCreatingKey] = useState(false);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);

  // Preferences — il tema usa lo store UI persistito (applicato dal ThemeProvider)
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  // Billing — upgrade via Stripe checkout
  const [upgrading, setUpgrading] = useState(false);

  // Org — real data
  const [orgData, setOrgData] = useState<OrgData>(null);
  const [orgDetails, setOrgDetails] = useState({
    name: "", website: "", phone: "", vatNumber: "",
    address: "", city: "", country: "", sector: "",
  });
  const [savingOrg, setSavingOrg] = useState(false);
  const [members, setMembers] = useState<Members>([]);
  const [usage, setUsage] = useState<Usage>(null);

  // Invitations
  const [invitations, setInvitations] = useState<Invitations>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("SALES");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  // Delete account
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteZone, setShowDeleteZone] = useState(false);

  // Data export
  const [exportingData, setExportingData] = useState(false);

  // SMTP
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfigPublic | null>(null);
  const [smtpLoaded, setSmtpLoaded] = useState(false);

  useEffect(() => {
    getMyProfile().then((p) => { if (p) setProfile(p); });
    getOrgData().then((d) => {
      setOrgData(d);
      if (d) setOrgDetails({
        name: d.name ?? "",
        website: d.website ?? "",
        phone: d.phone ?? "",
        vatNumber: d.vatNumber ?? "",
        address: d.address ?? "",
        city: d.city ?? "",
        country: d.country ?? "",
        sector: d.sector ?? "",
      });
    });
    getTeamMembers().then(setMembers);
    getUsageStats().then(setUsage);
    getInvitations().then(setInvitations);
    getSmtpConfig().then((c) => { setSmtpConfig(c); setSmtpLoaded(true); });
    getApiKeys().then(setApiKeys);
  }, []);

  async function handleSaveProfile() {
    setSavingProfile(true);
    try {
      const res = await updateProfile({
        name: profile.name,
        phone: profile.phone,
        jobTitle: profile.jobTitle,
        timezone: profile.timezone,
      });
      if (res.error) toast.error(res.error);
      else toast.success("Profilo aggiornato");
    } catch {
      toast.error("Errore durante il salvataggio. Riprova.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleLogoutAllDevices() {
    setLoggingOutAll(true);
    try {
      const res = await logoutAllDevices();
      if (res.error) {
        toast.error(res.error);
        return;
      }
      // Anche questa sessione è invalidata: torna al login.
      await signOut({ callbackUrl: "/login" });
    } catch {
      toast.error("Errore durante la disconnessione. Riprova.");
    } finally {
      setLoggingOutAll(false);
    }
  }

  async function handleUpgrade() {
    setUpgrading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) { window.location.href = data.url; return; }
      toast.error(data.error ?? "Impossibile avviare il checkout");
    } catch {
      toast.error("Impossibile avviare il checkout. Riprova più tardi.");
    } finally {
      setUpgrading(false);
    }
  }

  async function handleSaveOrg() {
    setSavingOrg(true);
    const res = await updateOrgDetails(orgDetails);
    setSavingOrg(false);
    if (res.error) toast.error(res.error);
    else { setOrgData((d) => d ? { ...d, ...orgDetails } : d); toast.success("Organizzazione aggiornata"); }
  }

  async function handleSendInvite() {
    if (!inviteEmail.trim()) { toast.error("Inserisci un'email"); return; }
    setSendingInvite(true);
    const res = await inviteTeamMember(inviteEmail.trim(), inviteRole);
    setSendingInvite(false);
    if (res.error) { toast.error(res.error); return; }
    const link = `${window.location.origin}/register?invite=${res.token}`;
    setGeneratedInviteLink(link);
    setInviteEmail("");
    toast.success("Invito creato!");
    getInvitations().then(setInvitations);
  }

  async function handleRevokeInvite(id: string) {
    const res = await revokeInvitation(id);
    if (res.error) toast.error(res.error);
    else { setInvitations((arr) => arr.filter((i) => i.id !== id)); toast.success("Invito revocato"); }
  }

  async function handleRemoveMember(id: string) {
    setRemovingId(id);
    const res = await removeMember(id);
    setRemovingId(null);
    if (res.error) toast.error(res.error);
    else { setMembers((arr) => arr.filter((m) => m.id !== id)); toast.success("Membro rimosso"); }
  }

  async function handleUpdateRole(id: string, role: Role) {
    setUpdatingRoleId(id);
    const res = await updateMemberRole(id, role);
    setUpdatingRoleId(null);
    if (res.error) toast.error(res.error);
    else { setMembers((arr) => arr.map((m) => m.id === id ? { ...m, role } : m)); toast.success("Ruolo aggiornato"); }
  }

  async function handleChangePassword() {
    if (!currentPwd) { toast.error("Inserisci la password attuale"); return; }
    if (newPwd.length < 8) { toast.error("La nuova password deve avere almeno 8 caratteri"); return; }
    if (newPwd !== confirmPwd) { toast.error("Le password non coincidono"); return; }
    setSavingPwd(true);
    const res = await changePassword(currentPwd, newPwd);
    setSavingPwd(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success("Password aggiornata con successo");
    setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== "ELIMINA") { toast.error('Scrivi "ELIMINA" per confermare'); return; }
    setDeletingAccount(true);
    const res = await deleteAccount(deleteConfirmText);
    setDeletingAccount(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success("Account eliminato. Arrivederci!");
    await signOut({ callbackUrl: "/" });
  }

  async function handleExportData() {
    setExportingData(true);
    try {
      const res = await fetch("/api/export");
      if (!res.ok) { toast.error("Errore durante l'esportazione"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pipely-export-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Esportazione completata!");
    } catch {
      toast.error("Errore durante l'esportazione");
    } finally {
      setExportingData(false);
    }
  }

  async function handleGenerateKey() {
    if (!newKeyName.trim()) { toast.error("Inserisci un nome per la chiave"); return; }
    setCreatingKey(true);
    const res = await createApiKey(newKeyName.trim());
    setCreatingKey(false);
    if (res.error) { toast.error(res.error); return; }
    setGeneratedKey(res.key);
    setNewKeyName("");
    toast.success("Chiave API generata — copiala ora!");
    getApiKeys().then(setApiKeys);
  }

  async function handleRevokeKey(id: string) {
    setRevokingKeyId(id);
    const res = await revokeApiKey(id);
    setRevokingKeyId(null);
    if (res.error) { toast.error(res.error); return; }
    setApiKeys((arr) => arr.filter((k) => k.id !== id));
    toast.success("Chiave revocata");
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
                  <input type="email" value={profile.email} disabled title="L'email di accesso non può essere modificata" className={`${inputCls} opacity-60 cursor-not-allowed`} />
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
                      <input
                        type={showPwd ? "text" : "password"}
                        value={currentPwd}
                        onChange={(e) => setCurrentPwd(e.target.value)}
                        className={`${inputCls} pr-10`}
                        placeholder="••••••••"
                      />
                      <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--crm-neutral-400)]">
                        {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Nuova password</label>
                    <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className={inputCls} placeholder="Min. 8 caratteri" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Conferma nuova</label>
                    <input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} className={inputCls} placeholder="••••••••" />
                  </div>
                </div>
                <Button
                  onClick={handleChangePassword}
                  disabled={savingPwd}
                  className="bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white"
                >
                  {savingPwd ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Aggiorna password
                </Button>
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
                  onClick={handleLogoutAllDevices}
                  disabled={loggingOutAll}
                  className="flex items-center gap-1.5 text-xs text-[var(--crm-danger)] hover:underline disabled:opacity-50"
                >
                  {loggingOutAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
                  Disconnetti da tutti i dispositivi
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
                  <input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleGenerateKey()} placeholder="Nome chiave (es. Zapier)" className={`${inputCls} flex-1`} />
                  <Button variant="outline" onClick={handleGenerateKey} disabled={creatingKey}>
                    {creatingKey ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />} Genera
                  </Button>
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
                        <button onClick={() => handleRevokeKey(k.id)} disabled={revokingKeyId === k.id} className="text-[var(--crm-neutral-400)] hover:text-[var(--crm-danger)]">
                          {revokingKeyId === k.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* API Docs Reference */}
              <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-6 space-y-4">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-[var(--crm-primary)]" /> Documentazione API REST
                </h2>
                <p className="text-sm text-[var(--crm-neutral-500)]">
                  Usa le chiavi API per integrare Pipely con Zapier, Make, n8n o qualsiasi sistema esterno.
                </p>

                <div className="rounded-lg bg-[var(--crm-neutral-50)] dark:bg-white/5 p-4 space-y-3">
                  <p className="text-xs font-semibold text-[var(--crm-neutral-600)]">Base URL</p>
                  <code className="block text-xs font-mono bg-black/5 dark:bg-white/10 px-2 py-1 rounded">
                    https://www.pipely.it/api/v1
                  </code>

                  <p className="text-xs font-semibold text-[var(--crm-neutral-600)] mt-3">Autenticazione</p>
                  <code className="block text-xs font-mono bg-black/5 dark:bg-white/10 px-2 py-1 rounded">
                    Authorization: Bearer pip_live_xxxxx
                  </code>

                  <p className="text-xs font-semibold text-[var(--crm-neutral-600)] mt-3">Endpoints disponibili</p>
                  <div className="space-y-1.5 text-xs font-mono">
                    {[
                      { method: "GET", path: "/deals", desc: "Lista affari (filtri: search, status, pipeline_id)" },
                      { method: "POST", path: "/deals", desc: "Crea affare" },
                      { method: "GET", path: "/deals/:id", desc: "Dettaglio affare" },
                      { method: "PATCH", path: "/deals/:id", desc: "Aggiorna affare" },
                      { method: "DELETE", path: "/deals/:id", desc: "Elimina affare" },
                      { method: "GET", path: "/contacts", desc: "Lista contatti (filtri: search, company_id)" },
                      { method: "POST", path: "/contacts", desc: "Crea contatto" },
                      { method: "GET", path: "/contacts/:id", desc: "Dettaglio contatto" },
                      { method: "PATCH", path: "/contacts/:id", desc: "Aggiorna contatto" },
                      { method: "DELETE", path: "/contacts/:id", desc: "Elimina contatto" },
                      { method: "GET", path: "/companies", desc: "Lista aziende" },
                      { method: "POST", path: "/companies", desc: "Crea azienda" },
                      { method: "GET", path: "/companies/:id", desc: "Dettaglio azienda" },
                      { method: "PATCH", path: "/companies/:id", desc: "Aggiorna azienda" },
                      { method: "DELETE", path: "/companies/:id", desc: "Elimina azienda" },
                      { method: "GET", path: "/leads", desc: "Lista lead (filtri: search, status, source)" },
                      { method: "POST", path: "/leads", desc: "Crea lead" },
                      { method: "GET", path: "/leads/:id", desc: "Dettaglio lead" },
                      { method: "PATCH", path: "/leads/:id", desc: "Aggiorna lead" },
                      { method: "DELETE", path: "/leads/:id", desc: "Elimina lead" },
                    ].map((ep) => (
                      <div key={ep.method + ep.path} className="flex items-center gap-2">
                        <span className={`inline-block w-14 text-center rounded px-1 py-0.5 text-[10px] font-bold ${
                          ep.method === "GET" ? "bg-blue-100 text-blue-700" :
                          ep.method === "POST" ? "bg-green-100 text-green-700" :
                          ep.method === "PATCH" ? "bg-amber-100 text-amber-700" :
                          "bg-red-100 text-red-700"
                        }`}>{ep.method}</span>
                        <span className="text-[var(--crm-neutral-700)] dark:text-white/80">{ep.path}</span>
                        <span className="text-[var(--crm-neutral-400)] font-sans text-[10px] hidden sm:inline">— {ep.desc}</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs font-semibold text-[var(--crm-neutral-600)] mt-3">Paginazione</p>
                  <p className="text-xs text-[var(--crm-neutral-500)]">
                    Tutti gli endpoint lista supportano <code className="bg-black/5 dark:bg-white/10 px-1 rounded">?page=1&per_page=25</code> (max 100 per pagina).
                  </p>

                  <p className="text-xs font-semibold text-[var(--crm-neutral-600)] mt-3">Esempio cURL</p>
                  <pre className="text-[10px] font-mono bg-black/5 dark:bg-white/10 px-2 py-1.5 rounded overflow-x-auto whitespace-pre-wrap">
{`curl -H "Authorization: Bearer pip_live_xxxxx" \\
  https://www.pipely.it/api/v1/deals?status=open&page=1`}
                  </pre>
                </div>
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
                    const TIER_ORDER: Record<string, number> = { starter: 0, pro: 1, enterprise: 2 };
                    const currentTier = orgData?.plan === "PRO" ? 1 : orgData?.plan === "ENTERPRISE" ? 2 : 0;
                    // Mostra il bottone solo per veri upgrade: il downgrade passa dal portale Stripe in /billing.
                    const isUpgrade = (TIER_ORDER[plan.id] ?? 0) > currentTier;
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
                        {!isCurrent && isUpgrade && (
                          <Button size="sm" variant={plan.id === "enterprise" ? "outline" : "default"}
                            disabled={upgrading}
                            className={plan.id !== "enterprise" ? "bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white w-full" : "w-full"}
                            onClick={() => {
                              if (plan.id === "enterprise") {
                                window.location.href = "mailto:support@pipely.it?subject=Piano%20Enterprise";
                              } else {
                                handleUpgrade();
                              }
                            }}>
                            {plan.id === "enterprise" ? "Contatta sales" : upgrading ? "Reindirizzamento…" : "Upgrade"}
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

              <div className="rounded-xl border border-[var(--crm-neutral-100)] p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 text-[var(--crm-primary)] flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Fatture e storico pagamenti</p>
                    <p className="text-xs text-[var(--crm-neutral-500)]">Visualizza, scarica e gestisci le tue fatture</p>
                  </div>
                </div>
                <Link href="/billing" className="flex items-center gap-1.5 text-xs font-medium text-[var(--crm-primary)] hover:underline whitespace-nowrap flex-shrink-0">
                  Vai a Billing →
                </Link>
              </div>
            </div>
          )}

          {/* ── PREFERENZE ── */}
          {tab === "preferences" && (
            <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-6 space-y-5">
              <h2 className="text-base font-semibold">Preferenze</h2>

              <div>
                <label className="block text-sm font-medium mb-2">Tema</label>
                <div className="flex gap-2">
                  {(["light", "dark", "system"] as const).map((t) => (
                    <button key={t} onClick={() => setTheme(t)}
                      className={`rounded-lg border-2 px-4 py-2 text-sm capitalize transition-colors ${theme === t ? "border-[var(--crm-primary)] bg-[var(--crm-primary)]/5" : "border-[var(--crm-neutral-100)]"}`}>
                      {t === "light" ? "Chiaro" : t === "dark" ? "Scuro" : "Sistema"}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[var(--crm-neutral-500)] mt-2">
                  Applicato subito e memorizzato su questo browser.
                </p>
              </div>
            </div>
          )}

          {/* ── ORGANIZZAZIONE ── */}
          {tab === "organization" && (
            <div className="space-y-4">
              {/* Dettagli aziendali */}
              <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-6 space-y-4">
                <h2 className="text-base font-semibold">Dettagli organizzazione</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1">Nome organizzazione *</label>
                    <input value={orgDetails.name} onChange={(e) => setOrgDetails(d => ({ ...d, name: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Sito web</label>
                    <input value={orgDetails.website} onChange={(e) => setOrgDetails(d => ({ ...d, website: e.target.value }))} placeholder="https://esempio.it" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Telefono</label>
                    <input value={orgDetails.phone} onChange={(e) => setOrgDetails(d => ({ ...d, phone: e.target.value }))} placeholder="+39 02 1234567" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Partita IVA</label>
                    <input value={orgDetails.vatNumber} onChange={(e) => setOrgDetails(d => ({ ...d, vatNumber: e.target.value }))} placeholder="IT12345678901" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Settore</label>
                    <input value={orgDetails.sector} onChange={(e) => setOrgDetails(d => ({ ...d, sector: e.target.value }))} placeholder="es. SaaS, Manifatturiero, Consulenza" className={inputCls} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1">Indirizzo</label>
                    <input value={orgDetails.address} onChange={(e) => setOrgDetails(d => ({ ...d, address: e.target.value }))} placeholder="Via Roma 1" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Città</label>
                    <input value={orgDetails.city} onChange={(e) => setOrgDetails(d => ({ ...d, city: e.target.value }))} placeholder="Milano" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Paese</label>
                    <select value={orgDetails.country} onChange={(e) => setOrgDetails(d => ({ ...d, country: e.target.value }))} className={inputCls}>
                      <option value="">Seleziona...</option>
                      <option value="IT">Italia</option>
                      <option value="DE">Germania</option>
                      <option value="FR">Francia</option>
                      <option value="ES">Spagna</option>
                      <option value="GB">Regno Unito</option>
                      <option value="US">Stati Uniti</option>
                      <option value="CH">Svizzera</option>
                      <option value="AT">Austria</option>
                    </select>
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
                    </>
                  )}
                </div>
                <Button onClick={handleSaveOrg} disabled={savingOrg} className="bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white">
                  {savingOrg ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Salva modifiche
                </Button>
              </div>

              {/* Invita collaboratori */}
              <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-6 space-y-4">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <Send className="h-4 w-4 text-[var(--crm-primary)]" /> Invita collaboratori
                </h2>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendInvite()}
                    placeholder="email@esempio.it"
                    type="email"
                    className={`${inputCls} flex-1`}
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as Role)}
                    className={`${inputCls} sm:w-36`}
                  >
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                  <Button onClick={handleSendInvite} disabled={sendingInvite} className="bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white whitespace-nowrap">
                    {sendingInvite ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    <span className="ml-1.5">Invia invito</span>
                  </Button>
                </div>

                {generatedInviteLink && (
                  <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 px-3 py-2.5 space-y-1.5">
                    <p className="text-xs font-semibold text-green-700 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Link di invito generato — condividilo!
                    </p>
                    <code className="block text-xs font-mono text-green-800 break-all">{generatedInviteLink}</code>
                    <div className="flex gap-3">
                      <button onClick={() => { navigator.clipboard.writeText(generatedInviteLink); toast.success("Link copiato!"); }} className="text-xs text-green-600 hover:underline">Copia link</button>
                      <button onClick={() => setGeneratedInviteLink(null)} className="text-xs text-green-600 hover:underline">Chiudi</button>
                    </div>
                  </div>
                )}

                {invitations.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-[var(--crm-neutral-500)] mb-2">Inviti in sospeso</p>
                    <div className="space-y-1.5">
                      {invitations.map((inv) => (
                        <div key={inv.id} className="flex items-center gap-3 rounded-lg border border-[var(--crm-neutral-100)] px-3 py-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{inv.email}</p>
                            <p className="text-xs text-[var(--crm-neutral-400)]">
                              Scade {new Date(inv.expiresAt).toLocaleDateString("it-IT")} · {ROLE_LABELS[inv.role] ?? inv.role}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRevokeInvite(inv.id)}
                            className="text-[var(--crm-neutral-400)] hover:text-[var(--crm-danger)] transition-colors flex-shrink-0"
                            title="Revoca invito"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Esporta dati (Art. 20 GDPR) */}
              <div className="rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] p-6 space-y-3">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <Download className="h-4 w-4 text-[var(--crm-primary)]" /> Esporta i tuoi dati
                </h2>
                <p className="text-sm text-[var(--crm-neutral-500)]">
                  Scarica una copia completa di tutti i dati della tua organizzazione in formato JSON (Art. 20 GDPR — portabilità).
                </p>
                <Button variant="outline" onClick={handleExportData} disabled={exportingData}>
                  {exportingData ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                  {exportingData ? "Preparazione..." : "Esporta dati (JSON)"}
                </Button>
              </div>

              {/* Membri del team */}
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
                    {members.map((m) => {
                      const isMe = m.email === session?.user?.email;
                      const myRole = members.find(mb => mb.email === session?.user?.email)?.role;
                      const canManage = (myRole === "OWNER" || myRole === "ADMIN") && !isMe && m.role !== "OWNER";
                      const canChangeRole = myRole === "OWNER" && !isMe && m.role !== "OWNER";
                      return (
                        <div key={m.id} className="flex items-center gap-3 py-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--crm-primary)]/10 text-sm font-bold text-[var(--crm-primary)] flex-shrink-0">
                            {(m.name ?? m.email).split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{m.name ?? "—"} {isMe && <span className="text-xs text-[var(--crm-neutral-400)]">(tu)</span>}</p>
                            <p className="text-xs text-[var(--crm-neutral-500)]">{m.email}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {canChangeRole ? (
                              <div className="relative">
                                <select
                                  value={m.role}
                                  onChange={(e) => handleUpdateRole(m.id, e.target.value as Role)}
                                  disabled={updatingRoleId === m.id}
                                  className="rounded-full text-xs font-medium px-2 py-0.5 border border-[var(--crm-neutral-200)] bg-white appearance-none pr-5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--crm-primary)]"
                                >
                                  {ASSIGNABLE_ROLES.map((r) => (
                                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                                  ))}
                                </select>
                                <ChevronDown className="h-3 w-3 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--crm-neutral-400)]" />
                              </div>
                            ) : (
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[m.role] ?? "bg-gray-100 text-gray-600"}`}>
                                {ROLE_LABELS[m.role] ?? m.role}
                              </span>
                            )}
                            <span className="text-xs text-[var(--crm-neutral-400)] hidden sm:flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {timeAgo(m.createdAt.toISOString())}
                            </span>
                            {canManage && (
                              <button
                                onClick={() => handleRemoveMember(m.id)}
                                disabled={removingId === m.id}
                                className="text-[var(--crm-neutral-400)] hover:text-[var(--crm-danger)] transition-colors"
                                title="Rimuovi membro"
                              >
                                {removingId === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Zona pericolosa — solo OWNER */}
              {members.find((m) => m.email === session?.user?.email)?.role === "OWNER" && (
                <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 p-6 space-y-4">
                  <h2 className="text-base font-semibold text-red-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Zona pericolosa
                  </h2>
                  <p className="text-sm text-red-600">
                    Elimina definitivamente l&apos;account e tutti i dati dell&apos;organizzazione (contatti, affari, campagne, ecc.).
                    Questa operazione è irreversibile ai sensi dell&apos;Art. 17 GDPR.
                  </p>

                  {!showDeleteZone ? (
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteZone(true)}
                      className="border-red-300 text-red-600 hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Elimina account
                    </Button>
                  ) : (
                    <div className="space-y-3 rounded-lg border border-red-300 bg-white dark:bg-red-950/30 p-4">
                      <p className="text-sm font-medium text-red-700">
                        Scrivi <strong>ELIMINA</strong> nel campo sottostante per confermare:
                      </p>
                      <input
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="ELIMINA"
                        className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-transparent"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={handleDeleteAccount}
                          disabled={deletingAccount || deleteConfirmText !== "ELIMINA"}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          {deletingAccount ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                          Elimina definitivamente
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => { setShowDeleteZone(false); setDeleteConfirmText(""); }}
                        >
                          Annulla
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "fields" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold">Campi personalizzati</h2>
                <p className="text-sm text-[var(--crm-neutral-500)] mt-0.5">
                  Aggiungi campi extra a Affari, Contatti e Aziende per raccogliere le informazioni specifiche del tuo settore.
                </p>
              </div>
              <CustomFieldsManager />
            </div>
          )}

          {tab === "pricing" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold">Tipi di fatturazione</h2>
                <p className="text-sm text-[var(--crm-neutral-500)] mt-0.5">
                  Gestisci i tipi di pagamento disponibili per i tuoi prodotti: abbonamenti, noleggi, affitti e tipi personalizzati.
                </p>
              </div>
              <BillingTypesManager />
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

          {tab === "webhooks" && <WebhooksManager />}

          {tab === "invoices" && <InvoicesManager />}

          {tab === "bookings" && <BookingPagesManager />}

          {tab === "surveys" && <SurveysManager />}

          {tab === "chatbot" && <ChatWidgetManager />}

        </div>
      </div>
    </div>
  );
}
