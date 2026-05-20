import Link from "next/link";
import { PipelyAppIcon } from "@/components/shared/PipelyLogo";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center bg-[var(--crm-neutral-50)] dark:bg-[#0f0f1a]">
      <PipelyAppIcon size={48} className="rounded-xl opacity-80" />
      <div className="space-y-2">
        <p className="text-6xl font-bold text-[var(--crm-primary)] leading-none">404</p>
        <h1 className="text-xl font-semibold text-[var(--crm-neutral-900)] dark:text-white">
          Pagina non trovata
        </h1>
        <p className="text-sm text-[var(--crm-neutral-500)] max-w-xs">
          La pagina che stai cercando non esiste o è stata spostata.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 rounded-lg bg-[var(--crm-primary)] text-white px-5 py-2.5 text-sm font-medium hover:bg-[var(--crm-primary-dark)] transition-colors"
      >
        Torna alla dashboard →
      </Link>
    </div>
  );
}
