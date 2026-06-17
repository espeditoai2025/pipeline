import type { Metadata } from "next";
import { UnsubscribeConfirm } from "@/components/emails/UnsubscribeConfirm";

export const metadata: Metadata = {
  title: "Disiscrizione — Pipely",
  robots: { index: false, follow: false },
};

/**
 * GET never mutates state (email clients prefetch links, which previously caused
 * accidental unsubscribes). It only renders a confirmation button that POSTs to
 * /api/emails/unsubscribe.
 */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ cid?: string; lid?: string; sig?: string }>;
}) {
  const { cid, lid, sig } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {!cid || !lid ? (
          <p className="text-slate-500">Link non valido o scaduto.</p>
        ) : (
          <UnsubscribeConfirm cid={cid} lid={lid} sig={sig ?? ""} />
        )}
      </div>
    </div>
  );
}
