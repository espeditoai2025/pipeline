"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Key, Loader2, Plug, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  createMcpToken,
  getMcpSettings,
  revokeMcpToken,
  type McpSettingsData,
} from "@/server/actions/mcp";

const endpoint = "https://www.pipely.it/api/mcp";
const date = (value: string) =>
  new Date(value).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
export function McpSettings({ initial }: { initial: McpSettingsData }) {
  const [data, setData] = useState(initial);
  const [name, setName] = useState("");
  const [canWrite, setCanWrite] = useState(false);
  const [days, setDays] = useState(90);
  const [key, setKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const inputClass =
    "w-full rounded-lg border border-[var(--crm-neutral-200)] bg-transparent px-3 py-2 text-sm";
  const card =
    "rounded-xl border border-[var(--crm-neutral-100)] bg-white p-5 dark:bg-[#1a1a2e] sm:p-6";
  async function reload() {
    const result = await getMcpSettings();
    if (result.data) setData(result.data);
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copiato");
    } catch {
      toast.error("Copia manualmente il testo selezionandolo");
    }
  }
  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setKey(null);
    try {
      const result = await createMcpToken({ name, canWrite, expiresInDays: days });
      if (result.error) {
        setError(result.error);
        return;
      }
      setKey(result.key ?? null);
      setName("");
      setCanWrite(false);
      await reload();
    } catch {
      setError("Connessione interrotta. Ricarica l'elenco delle chiavi prima di riprovare.");
    } finally {
      setBusy(false);
    }
  }
  async function revoke(id: string) {
    setRevoking(id);
    setError("");
    try {
      const result = await revokeMcpToken(id);
      if (result.error) setError(result.error);
      else {
        setKey(null);
        await reload();
        toast.success("Accesso revocato");
      }
    } catch {
      setError("Revoca non completata. Riprova.");
    } finally {
      setRevoking(null);
    }
  }
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <Link href="/settings" className="text-sm text-[var(--crm-primary)]">
          ← Impostazioni
        </Link>
        <h1 className="mt-3 flex items-center gap-2 text-2xl font-semibold">
          <Plug className="h-6 w-6" /> Collega agenti e piattaforme con MCP
        </h1>
        <p className="mt-2 text-sm text-[var(--crm-neutral-500)]">
          Condividi l’accesso al CRM con un agente AI o una piattaforma che supporta MCP tramite
          HTTP. Disponibile in tutti i piani, con gli stessi limiti del tuo CRM.
        </p>
      </div>
      <section className={card} aria-label="Configurazione connessione">
        <h2 className="font-semibold">Dati da inserire nella piattaforma esterna</h2>
        <p className="mt-2 text-sm">
          Trasporto: <strong>Streamable HTTP</strong>. Autenticazione: chiave Bearer.
        </p>
        <div className="mt-3 flex items-start gap-2">
          <code className="min-w-0 flex-1 rounded-lg bg-[var(--crm-neutral-50)] p-3 text-sm break-all dark:bg-white/5">
            {endpoint}
          </code>
          <Button variant="outline" onClick={() => copy(endpoint)} aria-label="Copia URL MCP">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <code className="mt-2 block text-xs break-all">
          Authorization: Bearer &lt;chiave MCP&gt;
        </code>
        <p className="mt-3 text-sm text-[var(--crm-neutral-500)]">
          La piattaforma deve permettere di configurare questo header. L’accesso OAuth con login
          automatico non è ancora disponibile. Per SaaS che usano normali richieste HTTP sono
          disponibili anche le API REST, in{" "}
          <Link href="/settings" className="text-[var(--crm-primary)] underline">
            Impostazioni → Sicurezza
          </Link>
          .
        </p>
      </section>
      <section className={card}>
        <h2 className="flex items-center gap-2 font-semibold">
          <Key className="h-4 w-4" /> Nuova chiave MCP
        </h2>
        <form onSubmit={create} className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Nome connessione</span>
              <input
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Es. Assistente commerciale"
                className={inputClass}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>Scadenza</span>
              <select
                aria-label="Scadenza"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className={inputClass}
              >
                <option value={30}>30 giorni</option>
                <option value={90}>90 giorni</option>
                <option value={365}>1 anno</option>
              </select>
            </label>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={canWrite}
              onChange={(e) => setCanWrite(e.target.checked)}
              className="mt-1"
            />
            <span>
              Consenti anche la scrittura nel CRM
              <span className="mt-1 block text-xs text-[var(--crm-neutral-500)]">
                La piattaforma potrà creare contatti, aziende, trattative, attività e note,
                aggiornare contatti, aziende e trattative e completare attività. Queste azioni
                possono attivare automazioni e webhook configurati.
              </span>
            </span>
          </label>
          <p className="flex items-center gap-2 text-xs text-[var(--crm-neutral-500)]">
            <ShieldCheck className="h-4 w-4 shrink-0" /> Senza questa opzione l’accesso è di sola
            lettura. Massimo 10 connessioni attive.
          </p>
          <Button type="submit" disabled={busy || !name.trim()}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Genera chiave MCP
          </Button>
        </form>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}
        {key && (
          <div
            role="status"
            className="mt-4 space-y-3 rounded-lg border border-green-300 bg-green-50 p-4 dark:bg-green-900/20"
          >
            <p className="text-sm font-semibold">
              Copia la chiave ora: verrà mostrata solo una volta.
            </p>
            <code className="block text-xs break-all">{key}</code>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => copy(key)}>
                Copia chiave
              </Button>
              <Button variant="ghost" onClick={() => setKey(null)}>
                Ho salvato la chiave
              </Button>
            </div>
          </div>
        )}
      </section>
      <section className={card} aria-label="Connessioni MCP">
        <h2 className="font-semibold">Connessioni</h2>
        {!data.tokens.length && (
          <p className="mt-3 text-sm text-[var(--crm-neutral-500)]">
            Non hai ancora creato chiavi MCP.
          </p>
        )}
        <div className="mt-3 space-y-3">
          {data.tokens.map((token) => {
            const active = !token.revokedAt && new Date(token.expiresAt).getTime() > now;
            return (
              <div
                key={token.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <p className="font-medium break-words">{token.name}</p>
                  <p className="mt-1 text-xs">
                    {token.canWrite ? "Lettura e scrittura" : "Sola lettura"} ·{" "}
                    {token.revokedAt ? "Revocata" : active ? "Attiva" : "Scaduta"}
                  </p>
                  <code className="text-xs text-[var(--crm-neutral-500)]">{token.prefix}••••</code>
                  <p className="mt-1 text-xs">Scadenza: {date(token.expiresAt)}</p>
                  <p className="text-xs text-[var(--crm-neutral-500)]">
                    Ultimo utilizzo: {token.lastUsedAt ? date(token.lastUsedAt) : "mai"}
                  </p>
                </div>
                {active && (
                  <Button
                    variant="outline"
                    disabled={revoking === token.id}
                    aria-label={`Revoca ${token.name}`}
                    onClick={() => revoke(token.id)}
                  >
                    {revoking === token.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Revoca
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </section>
      <section className={card}>
        <h2 className="font-semibold">Ultime scritture tramite MCP</h2>
        <p className="mt-2 text-xs text-[var(--crm-neutral-500)]">
          Ultime 30 operazioni completate. I tentativi ripetuti con lo stesso identificativo non
          creano altre operazioni.
        </p>
        {!data.operations.length ? (
          <p className="mt-3 text-sm">Nessuna scrittura registrata.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {data.operations.map((operation) => (
              <li key={operation.id} className="rounded-lg border p-3 text-xs">
                <p className="font-medium break-words">
                  {operation.tokenName} · {operation.tool.replace("pipely_", "")}
                </p>
                <p>{date(operation.createdAt)}</p>
                <p className="break-all">
                  {operation.result.entityType}: {operation.result.id}
                </p>
                <p className="break-all text-[var(--crm-neutral-500)]">
                  Richiesta: {operation.requestId}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
