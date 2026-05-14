import Link from "next/link";
import { PipelyAppIcon, PipelyWordmark } from "@/components/shared/PipelyLogo";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white font-sans">
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/">
            <PipelyWordmark />
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <Link href="/#features" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Funzionalità</Link>
            <Link href="/#pricing" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Prezzi</Link>
            <Link href="/contatti" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Contatti</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Accedi
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Inizia gratis
            </Link>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="bg-slate-900 px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              <PipelyAppIcon size={28} className="rounded-lg" />
              <span className="font-semibold text-white">Pipely</span>
            </div>
            <div className="flex flex-wrap justify-center gap-5 text-sm text-slate-400">
              <Link href="/#features" className="hover:text-white transition-colors">Funzionalità</Link>
              <Link href="/#pricing" className="hover:text-white transition-colors">Prezzi</Link>
              <Link href="/contatti" className="hover:text-white transition-colors">Contatti</Link>
              <Link href="/login" className="hover:text-white transition-colors">Accedi</Link>
              <Link href="/register" className="hover:text-white transition-colors">Registrati</Link>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <div className="text-sm text-slate-500">
                © {new Date().getFullYear()} Pipely. Tutti i diritti riservati.
              </div>
              <div className="flex gap-4 text-xs text-slate-600">
                <Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
                <Link href="/termini" className="hover:text-slate-300 transition-colors">Termini</Link>
                <Link href="/cookie" className="hover:text-slate-300 transition-colors">Cookie</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
