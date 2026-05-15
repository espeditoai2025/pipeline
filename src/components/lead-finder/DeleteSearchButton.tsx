"use client";

import { useState, useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteSearch } from "@/server/actions/lead-finder";

export function DeleteSearchButton({ searchId }: { searchId: string }) {
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm) { setConfirm(true); return; }
    startTransition(async () => {
      await deleteSearch(searchId);
      router.refresh();
    });
  }

  function handleBlur() {
    setTimeout(() => setConfirm(false), 200);
  }

  return (
    <button
      onClick={handleClick}
      onBlur={handleBlur}
      disabled={isPending}
      title={confirm ? "Clicca ancora per confermare" : "Elimina ricerca"}
      className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-50
        ${confirm
          ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 text-red-700 dark:text-red-300"
          : "bg-[var(--crm-neutral-50)] dark:bg-white/5 border border-[var(--crm-neutral-200)] dark:border-white/10 text-[var(--crm-neutral-500)] hover:text-red-600 hover:border-red-200 dark:hover:border-red-700/40"
        }`}
    >
      {isPending
        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
        : <Trash2 className="h-3.5 w-3.5" />}
      {confirm ? "Conferma" : ""}
    </button>
  );
}
