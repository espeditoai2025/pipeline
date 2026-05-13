"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Building2, Users, Package, Briefcase, Calendar,
  CheckCircle2, ChevronRight, X, Sparkles, Rocket, GitMerge,
  Mail, Zap, ListChecks, Megaphone,
} from "lucide-react";
import confetti from "canvas-confetti";
import type { OnboardingStatus } from "@/server/actions/dashboard";

const STORAGE_KEY = "pipely_onboarding_dismissed";

type Step = {
  id: keyof OnboardingStatus;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  cta: string;
  href: string;
};

const STEPS: Step[] = [
  {
    id: "hasPipeline",
    icon: GitMerge,
    iconBg: "bg-violet-100 dark:bg-violet-900/30",
    iconColor: "text-violet-600",
    title: "Configura la pipeline",
    description: "Crea gli stage del tuo processo di vendita: Prospect, Qualificato, Proposta, Chiuso.",
    cta: "Vai alle pipeline",
    href: "/deals",
  },
  {
    id: "hasCompany",
    icon: Building2,
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600",
    title: "Aggiungi un'azienda",
    description: "Inserisci i tuoi clienti o prospect. Includi referente, settore e contatti.",
    cta: "Aggiungi azienda",
    href: "/companies",
  },
  {
    id: "hasContact",
    icon: Users,
    iconBg: "bg-teal-100 dark:bg-teal-900/30",
    iconColor: "text-teal-600",
    title: "Crea un contatto",
    description: "Aggiungi le persone con cui lavori: nome, email, ruolo e azienda collegata.",
    cta: "Aggiungi contatto",
    href: "/contacts",
  },
  {
    id: "hasProduct",
    icon: Package,
    iconBg: "bg-orange-100 dark:bg-orange-900/30",
    iconColor: "text-orange-600",
    title: "Inserisci un prodotto",
    description: "Carica il tuo catalogo con prezzi, IVA e categoria. Poi collegalo agli affari.",
    cta: "Aggiungi prodotto",
    href: "/products",
  },
  {
    id: "hasDeal",
    icon: Briefcase,
    iconBg: "bg-green-100 dark:bg-green-900/30",
    iconColor: "text-green-600",
    title: "Crea il primo affare",
    description: "Apri una trattativa, assegnale un valore e posizionala nella pipeline.",
    cta: "Crea affare",
    href: "/deals",
  },
  {
    id: "hasActivity",
    icon: Calendar,
    iconBg: "bg-pink-100 dark:bg-pink-900/30",
    iconColor: "text-pink-600",
    title: "Pianifica un'attività",
    description: "Aggiungi una chiamata, un meeting o un task su un affare o contatto.",
    cta: "Pianifica attività",
    href: "/activities",
  },
  {
    id: "hasSmtp",
    icon: Mail,
    iconBg: "bg-sky-100 dark:bg-sky-900/30",
    iconColor: "text-sky-600",
    title: "Collega il tuo account email",
    description: "Configura Gmail, Aruba, Libero o un provider SMTP custom per inviare email reali da Pipely.",
    cta: "Configura email",
    href: "/settings",
  },
  {
    id: "hasWorkflow",
    icon: Zap,
    iconBg: "bg-yellow-100 dark:bg-yellow-900/30",
    iconColor: "text-yellow-600",
    title: "Crea un'automazione",
    description: "Automatizza follow-up, notifiche e assegnazioni con workflow trigger-action senza codice.",
    cta: "Crea automazione",
    href: "/automations",
  },
  {
    id: "hasEmailList",
    icon: ListChecks,
    iconBg: "bg-indigo-100 dark:bg-indigo-900/30",
    iconColor: "text-indigo-600",
    title: "Crea una lista email",
    description: "Organizza i tuoi contatti in liste per le campagne. Importa da CSV o Excel.",
    cta: "Crea lista",
    href: "/emails",
  },
  {
    id: "hasCampaign",
    icon: Megaphone,
    iconBg: "bg-rose-100 dark:bg-rose-900/30",
    iconColor: "text-rose-600",
    title: "Lancia la prima campagna",
    description: "Crea e invia una campagna email alla tua lista. Monitora aperture e click in tempo reale.",
    cta: "Crea campagna",
    href: "/emails",
  },
];

type Props = { status: OnboardingStatus };

export function OnboardingWizard({ status }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [celebrated, setCelebrated] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDismissed(localStorage.getItem(STORAGE_KEY) === "1");
    }
  }, []);

  const completedCount = STEPS.filter((s) => status[s.id]).length;
  const totalCount = STEPS.length;
  const allDone = completedCount === totalCount;
  const progressPct = Math.round((completedCount / totalCount) * 100);

  const celebrate = useCallback(() => {
    if (celebrated) return;
    setCelebrated(true);
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors: ["#3b82f6", "#10b981", "#6366f1", "#f59e0b"] });
    setTimeout(() => confetti({ particleCount: 60, spread: 100, origin: { y: 0.4 }, angle: 60 }), 300);
    setTimeout(() => confetti({ particleCount: 60, spread: 100, origin: { y: 0.4 }, angle: 120 }), 500);
  }, [celebrated]);

  useEffect(() => {
    if (allDone && !dismissed) celebrate();
  }, [allDone, dismissed, celebrate]);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <div className="rounded-2xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="relative px-6 py-5 bg-gradient-to-r from-[var(--crm-primary)] to-indigo-600">
        <button
          onClick={dismiss}
          className="absolute right-4 top-4 p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          title="Nascondi guida"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 flex-shrink-0">
            {allDone ? <Sparkles className="h-5 w-5 text-yellow-300" /> : <Rocket className="h-5 w-5 text-white" />}
          </div>
          <div className="flex-1 pr-8">
            <h2 className="text-base font-semibold text-white">
              {allDone ? "🎉 Sei pronto a vendere!" : "Inizia con Pipely"}
            </h2>
            <p className="text-sm text-white/70 mt-0.5">
              {allDone
                ? "Hai completato tutti i passi. Buon lavoro!"
                : `${completedCount} di ${totalCount} passi completati — ci vorranno pochi minuti`}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-white/70">Completamento</span>
            <span className="text-xs font-semibold text-white">{progressPct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-2 rounded-full bg-white transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Steps grid */}
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {STEPS.map((step) => {
          const done = status[step.id];
          const isActive = activeStep === step.id;
          const Icon = step.icon;

          return (
            <div
              key={step.id}
              onClick={() => !done && setActiveStep(isActive ? null : step.id)}
              className={`relative rounded-xl border p-4 transition-all cursor-pointer group ${
                done
                  ? "border-green-200 dark:border-green-800/40 bg-green-50/50 dark:bg-green-900/10"
                  : isActive
                  ? "border-[var(--crm-primary)] bg-[var(--crm-primary)]/5 shadow-sm"
                  : "border-[var(--crm-neutral-100)] dark:border-white/10 hover:border-[var(--crm-primary)]/50 hover:shadow-sm"
              }`}
            >
              {/* Step number badge */}
              {!done && (
                <span className="absolute top-3 right-3 text-[10px] font-bold text-[var(--crm-neutral-400)]">
                  {STEPS.indexOf(step) + 1}/{totalCount}
                </span>
              )}

              <div className="flex items-start gap-3">
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${done ? "bg-green-100 dark:bg-green-900/30" : step.iconBg}`}>
                  {done
                    ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                    : <Icon className={`h-5 w-5 ${step.iconColor}`} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold leading-snug ${done ? "line-through text-[var(--crm-neutral-400)]" : "text-[var(--crm-neutral-900)] dark:text-white"}`}>
                    {step.title}
                  </p>
                  <p className={`text-xs mt-0.5 leading-relaxed ${done ? "text-[var(--crm-neutral-400)]" : "text-[var(--crm-neutral-500)]"}`}>
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Expanded CTA */}
              {!done && isActive && (
                <div className="mt-3 pt-3 border-t border-[var(--crm-primary)]/20">
                  <Link
                    href={step.href}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--crm-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--crm-primary-dark)] transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {step.cta} <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}

              {done && (
                <div className="mt-2">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Completato
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {allDone && (
        <div className="px-5 pb-5">
          <button
            onClick={dismiss}
            className="w-full rounded-xl border border-[var(--crm-neutral-200)] py-2.5 text-sm font-medium text-[var(--crm-neutral-600)] hover:bg-[var(--crm-neutral-50)] transition-colors"
          >
            Nascondi questa guida
          </button>
        </div>
      )}
    </div>
  );
}
