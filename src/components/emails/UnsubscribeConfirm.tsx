"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2, MailX } from "lucide-react";

type Props = { cid: string; lid: string; sig: string };
type State = "idle" | "loading" | "done" | "error";

export function UnsubscribeConfirm({ cid, lid, sig }: Props) {
  const [state, setState] = useState<State>("idle");

  async function handleConfirm() {
    setState("loading");
    const qs = new URLSearchParams({ cid, lid, ...(sig ? { sig } : {}) }).toString();
    try {
      const res = await fetch(`/api/emails/unsubscribe?${qs}`, { method: "POST" });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <>
        <div className="mb-4 flex justify-center"><CheckCircle2 className="h-12 w-12 text-emerald-500" /></div>
        <h1 className="mb-3 text-xl font-semibold text-slate-900">Disiscrizione completata</h1>
        <p className="mb-6 text-slate-500">Non riceverai più email da questa lista.</p>
        <Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors">Torna alla home</Link>
      </>
    );
  }

  if (state === "error") {
    return (
      <>
        <div className="mb-4 flex justify-center"><XCircle className="h-12 w-12 text-red-400" /></div>
        <h1 className="mb-3 text-xl font-semibold text-slate-900">Errore</h1>
        <p className="mb-6 text-slate-500">Link non valido o errore durante la disiscrizione. Scrivi a <a href="mailto:privacy@pipely.it" className="underline">privacy@pipely.it</a>.</p>
      </>
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-center"><MailX className="h-12 w-12 text-slate-400" /></div>
      <h1 className="mb-3 text-xl font-semibold text-slate-900">Vuoi disiscriverti?</h1>
      <p className="mb-6 text-slate-500">Non riceverai più email da questa lista.</p>
      <button
        onClick={handleConfirm}
        disabled={state === "loading"}
        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
      >
        {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Conferma disiscrizione"}
      </button>
    </>
  );
}
