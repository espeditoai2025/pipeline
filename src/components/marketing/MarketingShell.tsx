import Link from "next/link";
import { PipelyAppIcon, PipelyWordmark } from "@/components/shared/PipelyLogo";

const footerSections = [
  {
    title: "CRM per team",
    links: [
      { href: "/crm-per-pmi", label: "CRM per PMI" },
      { href: "/crm-commerciale", label: "CRM commerciale" },
      { href: "/crm-per-agenzie", label: "CRM per agenzie" },
      { href: "/crm-per-consulenti", label: "CRM per consulenti" },
      { href: "/crm-email-marketing", label: "CRM email marketing" },
    ],
  },
  {
    title: "CRM per settore",
    links: [
      { href: "/crm-per-agenti-di-commercio", label: "Agenti di commercio" },
      { href: "/crm-per-studi-legali", label: "Studi legali" },
      { href: "/crm-per-commercialisti", label: "Commercialisti" },
      { href: "/crm-per-agenzie-immobiliari", label: "Agenzie immobiliari" },
      { href: "/crm-per-ecommerce", label: "Ecommerce" },
    ],
  },
  {
    title: "Confronti",
    links: [
      { href: "/alternativa-pipedrive", label: "Alternativa Pipedrive" },
      { href: "/alternativa-hubspot", label: "Alternativa HubSpot" },
      { href: "/migliori-crm-italiani", label: "Migliori CRM italiani" },
      { href: "/blog", label: "Blog CRM" },
      { href: "/chi-siamo", label: "Chi siamo" },
    ],
  },
];

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white font-sans">
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/">
            <PipelyWordmark />
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <Link
              href="/#features"
              className="text-sm text-slate-500 transition-colors hover:text-slate-900"
            >
              Funzionalità
            </Link>
            <Link
              href="/#pricing"
              className="text-sm text-slate-500 transition-colors hover:text-slate-900"
            >
              Prezzi
            </Link>
            <Link
              href="/blog"
              className="text-sm text-slate-500 transition-colors hover:text-slate-900"
            >
              Blog
            </Link>
            <Link
              href="/contatti"
              className="text-sm text-slate-500 transition-colors hover:text-slate-900"
            >
              Contatti
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              Accedi
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Inizia gratis
            </Link>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="bg-slate-900 px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 border-b border-white/10 pb-10 md:grid-cols-[1.2fr_repeat(3,1fr)]">
            <div>
              <div className="flex items-center gap-3">
                <PipelyAppIcon size={28} className="rounded-lg" />
                <span className="font-semibold text-white">Pipely</span>
              </div>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
                CRM italiano con pipeline Kanban, automazioni, email marketing e AI Assistant per
                team di vendita.
              </p>
            </div>

            {footerSections.map((section) => (
              <div key={section.title}>
                <h2 className="text-sm font-semibold text-white">{section.title}</h2>
                <div className="mt-4 grid gap-2.5 text-sm text-slate-400">
                  {section.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-5 md:flex-row">
            <div className="flex flex-wrap justify-center gap-5 text-sm text-slate-400">
              <Link href="/#features" className="transition-colors hover:text-white">
              Funzionalità
              </Link>
              <Link href="/#pricing" className="transition-colors hover:text-white">
                Prezzi
              </Link>
              <Link href="/contatti" className="transition-colors hover:text-white">
                Contatti
              </Link>
              <Link href="/login" className="transition-colors hover:text-white">
                Accedi
              </Link>
              <Link href="/register" className="transition-colors hover:text-white">
                Registrati
              </Link>
            </div>
            <div className="flex flex-col items-center gap-1.5 md:items-end">
              <div className="text-sm text-slate-500">
                © {new Date().getFullYear()} Pipely. Tutti i diritti riservati.
              </div>
              <div className="flex gap-4 text-xs text-slate-600">
                <Link href="/privacy" className="transition-colors hover:text-slate-300">
                  Privacy Policy
                </Link>
                <Link href="/termini" className="transition-colors hover:text-slate-300">
                  Termini
                </Link>
                <Link href="/cookie" className="transition-colors hover:text-slate-300">
                  Cookie
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
