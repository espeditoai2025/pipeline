import type { Metadata } from "next";
import { db } from "@/lib/db";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Disiscrizione completata — Pipely",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ cid?: string; lid?: string }>;
}) {
  const { cid, lid } = await searchParams;

  if (!cid || !lid) {
    return <Result ok={false} message="Link non valido o scaduto." />;
  }

  try {
    // Verifica che il contatto appartenga alla lista
    const entry = await db.emailListContact.findFirst({
      where: { id: cid, listId: lid },
    });

    if (!entry) {
      return <Result ok={false} message="Link non valido o contatto non trovato." />;
    }

    if (entry.unsubscribed) {
      return <Result ok={true} message="Sei già iscritto/a a non ricevere ulteriori email da questa lista." />;
    }

    await db.emailListContact.update({
      where: { id: entry.id },
      data: { unsubscribed: true },
    });

    return (
      <Result
        ok={true}
        message="Disiscrizione completata. Non riceverai più email da questa lista."
      />
    );
  } catch {
    return <Result ok={false} message="Errore durante la disiscrizione. Riprova o contatta support@pipely.it." />;
  }
}

function Result({ ok, message }: { ok: boolean; message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mb-4 flex justify-center">
          {ok ? (
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          ) : (
            <XCircle className="h-12 w-12 text-red-400" />
          )}
        </div>
        <h1 className="mb-3 text-xl font-semibold text-slate-900">
          {ok ? "Disiscrizione completata" : "Errore"}
        </h1>
        <p className="mb-6 text-slate-500">{message}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Torna alla home
        </Link>
        <p className="mt-6 text-xs text-slate-400">
          Per assistenza scrivi a{" "}
          <a href="mailto:privacy@pipely.it" className="underline hover:text-slate-600">
            privacy@pipely.it
          </a>
        </p>
      </div>
    </div>
  );
}
