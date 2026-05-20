"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PipelyAppIcon } from "@/components/shared/PipelyLogo";
import Link from "next/link";
import { CheckCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) { setError("Link non valido. Richiedi un nuovo link."); return; }
    if (password.length < 8) { setError("La password deve avere almeno 8 caratteri"); return; }
    if (password !== confirm) { setError("Le password non coincidono"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? "Errore"); return; }
      setDone(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch {
      setError("Errore di rete. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[var(--crm-neutral-100)] p-8">
      <div className="mb-8 text-center">
        <PipelyAppIcon size={48} className="mx-auto mb-4 rounded-xl" />
        <h1 className="text-2xl font-semibold text-[var(--crm-neutral-900)]">Nuova password</h1>
        <p className="mt-1 text-sm text-[var(--crm-neutral-500)]">Scegli una nuova password per il tuo account</p>
      </div>

      {done ? (
        <div className="text-center space-y-4">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
          <p className="text-sm font-medium text-[var(--crm-neutral-900)]">Password aggiornata!</p>
          <p className="text-xs text-[var(--crm-neutral-500)]">Verrai reindirizzato al login tra pochi secondi…</p>
          <Link href="/login" className="text-sm text-[var(--crm-primary)] hover:underline">Vai al login →</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--crm-neutral-700)] mb-1">Nuova password</label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimo 8 caratteri"
                className="w-full rounded-lg border border-[var(--crm-neutral-200)] px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)]"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--crm-neutral-400)]"
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--crm-neutral-700)] mb-1">Conferma password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Ripeti la password"
              className="w-full rounded-lg border border-[var(--crm-neutral-200)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)]"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Imposta nuova password
          </Button>

          <p className="text-center text-xs text-[var(--crm-neutral-500)]">
            <Link href="/login" className="text-[var(--crm-primary)] hover:underline">← Torna al login</Link>
          </p>
        </form>
      )}
    </div>
  );
}
