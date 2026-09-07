"use client";

import { useState } from "react";
import { companyFieldLabels, extractCompanyText, type CompanyField, type CompanySuggestion } from "@/lib/company-autofill";
import { findCompanySuggestions } from "@/server/actions/company-autofill";

export function CompanyAutofill({ current, onApply }: { current: () => Partial<Record<CompanyField, string>>; onApply: (fields: CompanySuggestion["fields"]) => void }) {
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CompanySuggestion[]>([]);
  const [selected, setSelected] = useState<CompanySuggestion | null>(null);
  const [checked, setChecked] = useState<CompanyField[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  function preview(suggestion: CompanySuggestion) {
    setSelected(suggestion);
    const existing = current();
    setChecked((Object.keys(suggestion.fields) as CompanyField[]).filter(key => !existing[key]?.trim()));
    setMessage(Object.keys(suggestion.fields).length ? "" : "Nessun campo riconosciuto. Usa etichette come Ragione sociale: e Partita IVA:.");
  }
  async function search() {
    setBusy(true); setMessage(""); setSelected(null); setSuggestions([]);
    try {
      const result = await findCompanySuggestions(query);
      setSuggestions(result.data ?? []);
      setMessage(result.error ?? (result.data?.length ? "" : "Nessuna azienda trovata nel tuo archivio."));
    } catch { setMessage("Ricerca non riuscita. Riprova."); }
    finally { setBusy(false); }
  }
  return <details className="rounded-xl border border-[var(--crm-neutral-200)] p-3 text-sm">
    <summary className="cursor-pointer font-medium">Compila dai tuoi dati</summary>
    <p className="my-3 text-xs text-[var(--crm-neutral-500)]">Recupera un’azienda dal tuo archivio o incolla una firma email / anagrafica. Nessun servizio esterno e nessun dato inventato.</p>
    <label className="block">Nome o partita IVA<input className="my-1 w-full rounded border bg-transparent p-2" value={query} maxLength={200} onChange={e => setQuery(e.target.value)} /></label>
    <button type="button" disabled={busy || query.trim().length < 3} onClick={search} className="rounded border px-3 py-2 disabled:opacity-50">{busy ? "Ricerca…" : "Cerca in Pipely"}</button>
    {suggestions.map((suggestion, index) => <button key={index} type="button" onClick={() => preview(suggestion)} className="mt-2 block w-full rounded border p-2 text-left">{suggestion.source}</button>)}
    <label className="mt-4 block">Testo aziendale<textarea rows={4} maxLength={20000} value={text} onChange={e => setText(e.target.value)} className="my-1 w-full rounded border bg-transparent p-2" placeholder={"Ragione sociale: Studio Rossi\nPartita IVA: …\nIndirizzo: Via Roma 10"} /></label>
    <button type="button" disabled={!text.trim()} onClick={() => preview(extractCompanyText(text))} className="rounded border px-3 py-2 disabled:opacity-50">Estrai dal testo</button>
    {message && <p role="status" className="mt-2">{message}</p>}
    {selected && <div className="mt-3 space-y-2">
      <p className="text-xs">Fonte: {selected.source}. I campi già compilati restano esclusi finché non li selezioni.</p>
      {Object.entries(selected.fields).map(([field, value]) => <label key={field} className="flex items-start gap-2 break-all rounded bg-[var(--crm-neutral-50)] p-2"><input type="checkbox" checked={checked.includes(field as CompanyField)} onChange={e => setChecked(prev => e.target.checked ? [...prev, field as CompanyField] : prev.filter(key => key !== field))} /><span>{companyFieldLabels[field as CompanyField]}: <strong>{value}</strong></span></label>)}
      {selected.warnings.map(warning => <p key={warning} className="text-xs text-amber-700 dark:text-amber-300">{warning}</p>)}
      <button type="button" disabled={!checked.length} onClick={() => { onApply(Object.fromEntries(checked.map(key => [key, selected.fields[key]]))); setSelected(null); setMessage("Campi compilati. Controllali e salva l’azienda."); }} className="rounded bg-[var(--crm-primary)] px-3 py-2 text-white disabled:opacity-50">Applica i campi selezionati</button>
    </div>}
  </details>;
}
