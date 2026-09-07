"use client";

import { useState } from "react";
import Link from "next/link";
import { getInvoicingSettings, listInvoicingCompanies, selectInvoicingCompany, disconnectInvoicing } from "@/server/actions/invoicing";

type Settings = NonNullable<Awaited<ReturnType<typeof getInvoicingSettings>>["data"]>;
const buttonClass = "rounded-lg border px-4 py-2 text-sm disabled:opacity-50";
export function InvoicingSettings({ initial, connectionResult }: { initial: Settings; connectionResult?: string }) {
  const [settings, setSettings] = useState(initial);
  const [companies, setCompanies] = useState<{ id: number; name: string; vatNumber: string }[]>([]);
  const [selected, setSelected] = useState(String(initial.connection?.companyId ?? ""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(connectionResult === "error" ? "Autorizzazione non completata. Riprova a collegare Fatture in Cloud." : "");
  const [disconnect, setDisconnect] = useState(false);
  async function run(operation: () => Promise<{ error?: string }>) {
    if (busy) return; setBusy(true); setError("");
    try { const result = await operation(); if (result.error) setError(result.error); else { const current = await getInvoicingSettings(); if (current.data) setSettings(current.data); } }
    catch { setError("Operazione non riuscita. Riprova."); }
    finally { setBusy(false); }
  }
  return <div className="mx-auto max-w-2xl space-y-5">
    <Link href="/settings" className="text-sm underline">← Impostazioni</Link>
    <h1 className="text-2xl font-bold">Fatture in Cloud</h1>
    <p className="text-sm">Collega la tua azienda per creare fatture ordinarie italiane in EUR dalle bozze Pipely, validarle e inviarle allo SdI. Servono un account Fatture in Cloud con accesso API e i permessi sulle fatture.</p>
    <p className="text-sm text-[var(--crm-neutral-500)]">Casse previdenziali, ritenute, bollo, IVA a zero, estero e PA si gestiscono direttamente nel servizio di fatturazione. Gli incassi restano registrati in Pipely: questa versione non li sincronizza automaticamente.</p>
    {error && <p role="alert" className="rounded border border-rose-300 p-3 text-sm text-rose-700">{error}</p>}
    {connectionResult === "success" && <p role="status" className="text-sm text-emerald-700">Autorizzazione ricevuta. Seleziona l’azienda da usare.</p>}
    {!settings.available && <p>Disponibile dal <Link href="/billing" className="underline">piano Pro</Link>.</p>}
    {!settings.configured && <p className="rounded border p-3 text-sm">Il collegamento deve essere attivato dal gestore di Pipely prima di poter autorizzare il tuo account.</p>}
    {settings.connected && <div className="rounded-xl border p-4"><p className="font-semibold">{settings.connection?.companyName ?? "Account autorizzato — azienda da selezionare"}</p><p className="text-sm">{settings.connection?.companyVat}</p></div>}
    {!settings.canManage && <p className="text-sm">Il collegamento è gestito dal titolare o da un amministratore.</p>}
    {settings.canManage && <div className="space-y-4">
      {settings.available && settings.configured && <button disabled={busy} className={buttonClass} onClick={() => run(async () => { const response = await fetch("/api/integrations/fatture-in-cloud/connect", { method: "POST" }); const result = await response.json(); if (result.url) location.assign(result.url); return result; })}>{settings.connected ? "Ricollega account" : "Collega Fatture in Cloud"}</button>}
      {settings.connected && settings.available && <>
        <button disabled={busy} className={buttonClass} onClick={() => run(async () => { const result = await listInvoicingCompanies(); if (result.data) setCompanies(result.data); return result; })}>Carica aziende autorizzate</button>
        {companies.length > 0 && <div className="space-y-2"><label className="block text-sm">Azienda Fatture in Cloud<select className="mt-1 w-full rounded border bg-transparent p-3" disabled={busy} value={selected} onChange={e => setSelected(e.target.value)}><option value="">Seleziona azienda</option>{companies.map(company => <option key={company.id} value={company.id}>{company.name} · {company.vatNumber}</option>)}</select></label><p className="text-xs">La partita IVA deve coincidere con quella nelle impostazioni dell’organizzazione Pipely.</p><button disabled={busy || !selected} className={buttonClass} onClick={() => run(() => selectInvoicingCompany(Number(selected)))}>Usa questa azienda</button></div>}
      </>}
      {settings.connected && <button disabled={busy} className={buttonClass} onClick={() => setDisconnect(true)}>Scollega</button>}
      {disconnect && <div className="space-y-2 rounded border p-3 text-sm"><p>Rimuovere il collegamento da Pipely? I documenti restano nei due servizi. Puoi revocare anche l’autorizzazione in Fatture in Cloud → Applicazioni collegate.</p><button disabled={busy} className={buttonClass} onClick={() => run(async () => { const result = await disconnectInvoicing(); if (!result.error) setDisconnect(false); return result; })}>Conferma scollegamento</button><button disabled={busy} className={buttonClass} onClick={() => setDisconnect(false)}>Annulla</button></div>}
    </div>}
  </div>;
}
