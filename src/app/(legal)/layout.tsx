import Link from "next/link";
import { PipelyAppIcon } from "@/components/shared/PipelyLogo";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white/95 sticky top-0 z-40 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <PipelyAppIcon size={28} className="rounded-lg" />
            <span className="font-semibold text-slate-900">Pipely</span>
          </Link>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
            ← Torna alla home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 mx-auto w-full max-w-4xl px-6 py-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-slate-50 py-8 px-6">
        <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <span>© {new Date().getFullYear()} Pipely — Tutti i diritti riservati</span>
          <div className="flex gap-5">
            <Link href="/contatti" className="hover:text-slate-700 transition-colors">Contatti</Link>
            <Link href="/privacy" className="hover:text-slate-700 transition-colors">Privacy Policy</Link>
            <Link href="/termini" className="hover:text-slate-700 transition-colors">Termini di Servizio</Link>
            <Link href="/cookie" className="hover:text-slate-700 transition-colors">Cookie Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
