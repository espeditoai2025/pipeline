"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Telescope, Loader2, ChevronDown } from "lucide-react";
import { createSearch, runSearch } from "@/server/actions/lead-finder";

const SECTORS = [
  "Tecnologia / Software",
  "Manifattura / Industria",
  "Retail / E-commerce",
  "Finanza / Banche / Assicurazioni",
  "Sanità / Medicale",
  "Consulenza / Servizi Professionali",
  "Immobiliare / Costruzioni",
  "Trasporti / Logistica",
  "Energia / Utilities",
  "Formazione / Education",
  "Marketing / Pubblicità",
  "Turismo / Ospitalità",
  "Alimentare / Agroalimentare",
  "Altro",
];

const COMPANY_SIZES = [
  { value: "", label: "Qualsiasi dimensione" },
  { value: "1-10", label: "1-10 dipendenti" },
  { value: "11-50", label: "11-50 dipendenti" },
  { value: "51-200", label: "51-200 dipendenti" },
  { value: "201-1000", label: "201-1000 dipendenti" },
  { value: "1000+", label: "1000+ dipendenti" },
];

export function SearchForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    sector: "",
    location: "",
    companySize: "",
    keywords: "",
    idealCustomer: "",
    maxResults: 10,
  });

  function set(field: keyof typeof form, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Inserisci un nome per la ricerca"); return; }
    setError(null);

    startTransition(async () => {
      const { data: search, error: createErr } = await createSearch({
        name: form.name.trim(),
        sector: form.sector || undefined,
        location: form.location || undefined,
        companySize: form.companySize || undefined,
        keywords: form.keywords || undefined,
        idealCustomer: form.idealCustomer || undefined,
        maxResults: form.maxResults,
      });

      if (createErr || !search) { setError(createErr ?? "Errore creazione ricerca"); return; }

      const { error: runErr } = await runSearch(search.id);
      if (runErr) { setError(runErr); return; }

      router.push(`/lead-finder/${search.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Nome ricerca */}
      <div>
        <label className="block text-sm font-medium text-[var(--crm-neutral-700)] dark:text-white mb-1.5">
          Nome ricerca <span className="text-red-500">*</span>
        </label>
        <input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder='es. "Tech SaaS Milano", "PMI manifatturiero Nord Italia"'
          className="w-full rounded-xl border border-[var(--crm-neutral-200)] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] dark:text-white"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Settore */}
        <div>
          <label className="block text-sm font-medium text-[var(--crm-neutral-700)] dark:text-white mb-1.5">Settore</label>
          <div className="relative">
            <select
              value={form.sector}
              onChange={(e) => set("sector", e.target.value)}
              className="w-full appearance-none rounded-xl border border-[var(--crm-neutral-200)] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] dark:text-white"
            >
              <option value="">Qualsiasi settore</option>
              {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--crm-neutral-400)] pointer-events-none" />
          </div>
        </div>

        {/* Dimensione */}
        <div>
          <label className="block text-sm font-medium text-[var(--crm-neutral-700)] dark:text-white mb-1.5">Dimensione azienda</label>
          <div className="relative">
            <select
              value={form.companySize}
              onChange={(e) => set("companySize", e.target.value)}
              className="w-full appearance-none rounded-xl border border-[var(--crm-neutral-200)] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] dark:text-white"
            >
              {COMPANY_SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--crm-neutral-400)] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Paese/Città */}
      <div>
        <label className="block text-sm font-medium text-[var(--crm-neutral-700)] dark:text-white mb-1.5">Paese / Città</label>
        <input
          value={form.location}
          onChange={(e) => set("location", e.target.value)}
          placeholder='es. "Milano", "Nord Italia", "Italia", "Europa"'
          className="w-full rounded-xl border border-[var(--crm-neutral-200)] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] dark:text-white"
        />
      </div>

      {/* Parole chiave */}
      <div>
        <label className="block text-sm font-medium text-[var(--crm-neutral-700)] dark:text-white mb-1.5">Parole chiave</label>
        <input
          value={form.keywords}
          onChange={(e) => set("keywords", e.target.value)}
          placeholder='es. "SaaS, B2B, software ERP, gestionale"'
          className="w-full rounded-xl border border-[var(--crm-neutral-200)] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] dark:text-white"
        />
      </div>

      {/* Cliente ideale */}
      <div>
        <label className="block text-sm font-medium text-[var(--crm-neutral-700)] dark:text-white mb-1.5">
          Descrizione cliente ideale
          <span className="ml-1 text-xs font-normal text-[var(--crm-neutral-400)]">(opzionale — aiuta l'AI a essere più precisa)</span>
        </label>
        <textarea
          value={form.idealCustomer}
          onChange={(e) => set("idealCustomer", e.target.value)}
          rows={3}
          placeholder='es. "Aziende manifatturiere con 20-100 dipendenti che usano ancora Excel per gestire i clienti e vogliono digitalizzare il processo commerciale"'
          className="w-full rounded-xl border border-[var(--crm-neutral-200)] dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] dark:text-white resize-none"
        />
      </div>

      {/* Numero risultati */}
      <div>
        <label className="block text-sm font-medium text-[var(--crm-neutral-700)] dark:text-white mb-1.5">
          Numero massimo candidati: <span className="text-[var(--crm-primary)] font-bold">{form.maxResults}</span>
        </label>
        <input
          type="range"
          min={3}
          max={20}
          step={1}
          value={form.maxResults}
          onChange={(e) => set("maxResults", parseInt(e.target.value))}
          className="w-full accent-[var(--crm-primary)]"
        />
        <div className="flex justify-between text-xs text-[var(--crm-neutral-400)] mt-1">
          <span>3</span>
          <span>20</span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="flex items-center gap-2 rounded-xl bg-[var(--crm-primary)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--crm-primary-dark)] disabled:opacity-60 transition-colors"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Ricerca in corso… (può richiedere 10-20 secondi)
          </>
        ) : (
          <>
            <Telescope className="h-4 w-4" />
            Cerca lead →
          </>
        )}
      </button>
    </form>
  );
}
