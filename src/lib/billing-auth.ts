import type { Session } from "next-auth";
import { db } from "@/lib/db";

/**
 * La gestione del piano e della fatturazione è riservata all'OWNER
 * dell'organizzazione (come dichiarato nella guida in-app: ADMIN ha pieni
 * poteri sui dati ma non su piano/fatturazione).
 *
 * Il ruolo viene riletto dal DB e non dal JWT: token.role è scritto al login e
 * non viene rinfrescato, quindi un utente degradato manterrebbe il vecchio
 * ruolo nel token fino alla scadenza della sessione.
 */
export async function assertBillingOwner(
  session: Session | null,
): Promise<{ orgId: string } | { error: string; status: number }> {
  const user = session?.user as { id?: string; organizationId?: string } | undefined;
  if (!user?.id) return { error: "Non autenticato", status: 401 };

  const orgId = user.organizationId;
  if (!orgId) return { error: "Organizzazione non trovata", status: 400 };

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { role: true, organizationId: true },
  });
  if (!dbUser || dbUser.organizationId !== orgId) {
    return { error: "Non autorizzato", status: 403 };
  }
  if (dbUser.role !== "OWNER") {
    return { error: "Solo il proprietario dell'organizzazione può gestire il piano", status: 403 };
  }

  return { orgId };
}
