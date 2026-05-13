"use client";

import { useState, useTransition } from "react";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { deleteOrganization } from "@/server/actions/admin";
import { useRouter } from "next/navigation";

export function DeleteOrgButton({ orgId, orgName }: { orgId: string; orgName: string }) {
  const [confirm, setConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteOrganization(orgId);
      if (result.error) {
        setError(result.error);
      } else {
        router.push("/admin/organizations");
      }
    });
  }

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="flex items-center gap-1.5 rounded-lg border border-red-800/50 bg-red-900/20 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-900/40 transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Elimina organizzazione
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-red-800/50 bg-red-900/20 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-300">Eliminare «{orgName}»?</p>
          <p className="text-xs text-red-400/80 mt-0.5">
            Questa operazione è irreversibile. Verranno eliminati tutti gli utenti, affari,
            contatti, campagne e dati associati.
          </p>
        </div>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => setConfirm(false)}
          className="flex-1 rounded-lg border border-white/10 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          Annulla
        </button>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-red-600 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Sì, elimina
        </button>
      </div>
    </div>
  );
}
