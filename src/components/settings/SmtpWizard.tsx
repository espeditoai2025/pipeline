"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Mail, CheckCircle2, AlertCircle, Loader2, Trash2,
  Eye, EyeOff, ChevronRight, ChevronLeft, ExternalLink, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveSmtpConfig, testSmtpConfig, deleteSmtpConfig } from "@/server/actions/smtp";
import type { SmtpConfigPublic, SmtpProvider } from "@/server/actions/smtp";

const inputCls = "w-full rounded-lg border border-[var(--crm-neutral-200)] bg-white dark:bg-white/5 px-3 py-2.5 text-sm text-[var(--crm-neutral-900)] dark:text-white placeholder:text-[var(--crm-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] focus:border-transparent transition-colors";
const labelCls = "block text-xs font-medium text-[var(--crm-neutral-500)] uppercase tracking-wide mb-1.5";

// ─── Provider presets ─────────────────────────────────────────────────────────

type Preset = { label: string; host: string; port: number; secure: boolean; note?: string; helpUrl?: string };

const PROVIDERS: Record<SmtpProvider, Preset> = {
  gmail: {
    label: "Gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    note: "Gmail richiede una App Password (non la password dell'account). Attiva la verifica in due passaggi e genera un'App Password da Account Google → Sicurezza.",
    helpUrl: "https://myaccount.google.com/apppasswords",
  },
  aruba: {
    label: "Aruba",
    host: "smtps.aruba.it",
    port: 465,
    secure: true,
    note: "Usa le credenziali del tuo account email Aruba. Porta 465 con SSL.",
    helpUrl: "https://guide.aruba.it",
  },
  libero: {
    label: "Libero Mail",
    host: "smtp.libero.it",
    port: 587,
    secure: false,
    note: "Usa email e password del tuo account Libero. Porta 587 con STARTTLS.",
  },
  custom: {
    label: "Provider personalizzato",
    host: "",
    port: 587,
    secure: false,
    note: "Inserisci manualmente i dati SMTP del tuo provider.",
  },
};

const PROVIDER_ICONS: Record<SmtpProvider, React.ReactNode> = {
  gmail: (
    <svg viewBox="0 0 24 24" className="h-6 w-6">
      <path fill="#EA4335" d="M6 18V8.4L2.4 5.7A2 2 0 0 0 2 7v10a2 2 0 0 0 2 2h2z"/>
      <path fill="#34A853" d="M18 18h2a2 2 0 0 0 2-2V7a2 2 0 0 0-.4-1.3L18 8.4V18z"/>
      <path fill="#4285F4" d="M18 6l-6 4.5L6 6l-.6-.5H4a2 2 0 0 0-1.6.8L6 8.4l6 4.5 6-4.5 3.6-1.6A2 2 0 0 0 20 6h-1.4L18 6z"/>
      <path fill="#FBBC05" d="M6 6l-.6-.5-3 2.2L6 8.4V6zM18 6v2.4l3.6-1.7-3-2.2-.6.5z"/>
    </svg>
  ),
  aruba: (
    <div className="h-6 w-6 rounded bg-orange-500 flex items-center justify-center">
      <span className="text-white text-[10px] font-bold">A</span>
    </div>
  ),
  libero: (
    <div className="h-6 w-6 rounded bg-blue-700 flex items-center justify-center">
      <span className="text-white text-[10px] font-bold">L</span>
    </div>
  ),
  custom: (
    <div className="h-6 w-6 rounded bg-[var(--crm-neutral-400)] flex items-center justify-center">
      <Mail className="h-3.5 w-3.5 text-white" />
    </div>
  ),
};

// ─── Form schema ──────────────────────────────────────────────────────────────

const schema = z.object({
  provider: z.enum(["gmail", "aruba", "libero", "custom"]),
  host: z.string().min(1, "Host obbligatorio"),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  fromEmail: z.string().email("Email mittente non valida"),
  fromName: z.string().optional(),
  username: z.string().min(1, "Username obbligatorio"),
  password: z.string().min(1, "Password obbligatoria"),
});

type FormValues = z.infer<typeof schema>;

// ─── Component ────────────────────────────────────────────────────────────────

type Props = { initial: SmtpConfigPublic | null };

type Step = "provider" | "credentials" | "done";

export function SmtpWizard({ initial }: Props) {
  const [config, setConfig] = useState<SmtpConfigPublic | null>(initial);
  const [step, setStep] = useState<Step>(initial ? "done" : "provider");
  const [selectedProvider, setSelectedProvider] = useState<SmtpProvider | null>(
    initial?.provider ?? null
  );
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    register, handleSubmit, setValue, watch, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? {
          provider: initial.provider,
          host: initial.host,
          port: initial.port,
          secure: initial.secure,
          fromEmail: initial.fromEmail,
          fromName: initial.fromName ?? "",
          username: initial.username,
          password: "",
        }
      : { provider: "gmail", host: "smtp.gmail.com", port: 587, secure: false, fromEmail: "", fromName: "", username: "", password: "" },
  });

  const provider = watch("provider");
  const preset = provider ? PROVIDERS[provider] : null;

  function selectProvider(p: SmtpProvider) {
    setSelectedProvider(p);
    const pr = PROVIDERS[p];
    setValue("provider", p);
    if (p !== "custom") {
      setValue("host", pr.host);
      setValue("port", pr.port);
      setValue("secure", pr.secure);
    }
    setStep("credentials");
  }

  async function onSubmit(data: FormValues) {
    const res = await saveSmtpConfig(data);
    if (res.error) { toast.error(res.error); return; }
    setConfig(res.data!);
    setStep("done");
    toast.success("Configurazione salvata");
  }

  async function handleTest() {
    if (!config) return;
    setTesting(true);
    const res = await testSmtpConfig(config.id);
    setTesting(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      setConfig({ ...config, isVerified: true });
      toast.success(res.data!.message);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await deleteSmtpConfig();
    setDeleting(false);
    if (res.error) { toast.error(res.error); return; }
    setConfig(null);
    setStep("provider");
    setSelectedProvider(null);
    reset();
    toast.success("Configurazione rimossa");
  }

  // ── Step: provider selection ──────────────────────────────────────────────
  if (step === "provider") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[var(--crm-neutral-500)]">Seleziona il provider email da collegare:</p>
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(PROVIDERS) as SmtpProvider[]).map((p) => (
            <button
              key={p}
              onClick={() => selectProvider(p)}
              className="flex items-center gap-3 rounded-xl border-2 border-[var(--crm-neutral-100)] dark:border-white/10 p-4 text-left hover:border-[var(--crm-primary)] hover:bg-[var(--crm-primary)]/5 transition-all group"
            >
              {PROVIDER_ICONS[p]}
              <div>
                <p className="text-sm font-medium group-hover:text-[var(--crm-primary)]">{PROVIDERS[p].label}</p>
                <p className="text-xs text-[var(--crm-neutral-400)]">{PROVIDERS[p].host || "Host personalizzato"}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-[var(--crm-neutral-300)] group-hover:text-[var(--crm-primary)] ml-auto" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Step: credentials form ────────────────────────────────────────────────
  if (step === "credentials") {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setStep("provider")}
            className="flex items-center gap-1 text-sm text-[var(--crm-neutral-500)] hover:text-[var(--crm-neutral-900)] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Provider
          </button>
          <span className="text-[var(--crm-neutral-300)]">/</span>
          <div className="flex items-center gap-2">
            {selectedProvider && PROVIDER_ICONS[selectedProvider]}
            <span className="text-sm font-medium">{selectedProvider && PROVIDERS[selectedProvider].label}</span>
          </div>
        </div>

        {/* Provider note */}
        {preset?.note && (
          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700/30 p-4">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              {preset.note}
              {preset.helpUrl && (
                <a href={preset.helpUrl} target="_blank" rel="noopener noreferrer"
                  className="ml-2 inline-flex items-center gap-1 font-medium underline">
                  Apri guida <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register("provider")} />

          {/* SMTP settings — editable only for custom, readonly for others */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Host SMTP</label>
              <input
                {...register("host")}
                readOnly={provider !== "custom"}
                className={`${inputCls} ${provider !== "custom" ? "bg-[var(--crm-neutral-50)] dark:bg-white/10 text-[var(--crm-neutral-400)]" : ""}`}
                placeholder="smtp.esempio.it"
              />
              {errors.host && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.host.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Porta</label>
              <input
                {...register("port", { valueAsNumber: true })}
                type="number"
                readOnly={provider !== "custom"}
                className={`${inputCls} ${provider !== "custom" ? "bg-[var(--crm-neutral-50)] dark:bg-white/10 text-[var(--crm-neutral-400)]" : ""}`}
              />
            </div>
          </div>

          {provider === "custom" && (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register("secure")} className="rounded border-[var(--crm-neutral-300)]" />
                <span className="text-sm">SSL/TLS (porta 465)</span>
              </label>
              <span className="text-xs text-[var(--crm-neutral-400)]">— deseleziona per STARTTLS (porta 587)</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Email mittente *</label>
              <input {...register("fromEmail")} type="email" className={inputCls} placeholder="mario@esempio.it" />
              {errors.fromEmail && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.fromEmail.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Nome mittente</label>
              <input {...register("fromName")} className={inputCls} placeholder="Mario Rossi" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Username (email account)</label>
            <input {...register("username")} type="email" className={inputCls} placeholder="mario@esempio.it" autoComplete="username" />
            {errors.username && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.username.message}</p>}
          </div>

          <div>
            <label className={labelCls}>
              {provider === "gmail" ? "App Password" : "Password"}
            </label>
            <div className="relative">
              <input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                className={`${inputCls} pr-10`}
                placeholder={provider === "gmail" ? "xxxx xxxx xxxx xxxx" : "••••••••"}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--crm-neutral-400)] hover:text-[var(--crm-neutral-700)]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.password.message}</p>}
            <p className="mt-1 text-xs text-[var(--crm-neutral-400)]">
              La password viene cifrata con AES-256 prima di essere salvata.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("provider")}>
              Indietro
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salva configurazione
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // ── Step: done / status view ──────────────────────────────────────────────
  if (!config) return null;

  return (
    <div className="space-y-4">
      {/* Status card */}
      <div className={`rounded-xl border p-4 flex items-start gap-4 ${
        config.isVerified
          ? "border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800/40"
          : "border-[var(--crm-neutral-200)] bg-[var(--crm-neutral-50)] dark:bg-white/5"
      }`}>
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
          config.isVerified ? "bg-green-100 dark:bg-green-900/30" : "bg-[var(--crm-neutral-100)]"
        }`}>
          {config.isVerified
            ? <ShieldCheck className="h-5 w-5 text-green-600" />
            : <Mail className="h-5 w-5 text-[var(--crm-neutral-500)]" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold">
              {PROVIDER_ICONS[config.provider]}
            </p>
            <p className="text-sm font-semibold">{PROVIDERS[config.provider].label}</p>
            {config.isVerified
              ? <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-medium">✓ Verificato</span>
              : <span className="rounded-full bg-yellow-100 text-yellow-700 px-2 py-0.5 text-xs font-medium">Non testato</span>
            }
          </div>
          <p className="text-xs text-[var(--crm-neutral-500)] mt-1">
            {config.fromEmail} · {config.host}:{config.port}
          </p>
          <p className="text-xs text-[var(--crm-neutral-400)] mt-0.5">
            Aggiornato il {new Date(config.updatedAt).toLocaleDateString("it-IT")}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <Button
          onClick={handleTest}
          disabled={testing}
          className="bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white"
        >
          {testing
            ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Test in corso…</>
            : <><CheckCircle2 className="h-4 w-4 mr-2" /> Testa connessione</>
          }
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setValue("provider", config.provider);
            setValue("host", config.host);
            setValue("port", config.port);
            setValue("secure", config.secure);
            setValue("fromEmail", config.fromEmail);
            setValue("fromName", config.fromName ?? "");
            setValue("username", config.username);
            setValue("password", "");
            setSelectedProvider(config.provider);
            setStep("credentials");
          }}
        >
          Modifica
        </Button>
        <Button
          variant="outline"
          onClick={handleDelete}
          disabled={deleting}
          className="text-[var(--crm-danger)] border-[var(--crm-danger)]/30 hover:bg-red-50"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
          Rimuovi
        </Button>
      </div>

      {!config.isVerified && (
        <p className="text-xs text-[var(--crm-neutral-400)] flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />
          Clicca "Testa connessione" per verificare che le credenziali funzionino prima di usare il provider.
        </p>
      )}
    </div>
  );
}
