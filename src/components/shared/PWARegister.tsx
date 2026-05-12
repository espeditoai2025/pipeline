"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

export function PWARegister() {
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .catch(() => {/* SW registration failed silently in dev */});

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (installPrompt as any).prompt();
    setInstallPrompt(null);
    setShowBanner(false);
  }

  if (!showBanner) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 rounded-xl border border-[var(--crm-neutral-100)] bg-white dark:bg-[#1a1a2e] px-4 py-3 shadow-lg">
      <Download className="h-4 w-4 text-[var(--crm-primary)] flex-shrink-0" />
      <p className="text-sm font-medium">Installa Pipeline CRM sul tuo dispositivo</p>
      <button
        onClick={handleInstall}
        className="rounded-lg bg-[var(--crm-primary)] text-white px-3 py-1.5 text-xs font-medium hover:bg-[var(--crm-primary-dark)] transition-colors"
      >
        Installa
      </button>
      <button
        onClick={() => setShowBanner(false)}
        className="text-[var(--crm-neutral-400)] hover:text-[var(--crm-neutral-600)]"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
