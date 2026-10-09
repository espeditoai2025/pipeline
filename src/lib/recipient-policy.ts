import { db } from "@/lib/db";
import { z } from "zod";

const email = z.string().trim().toLowerCase().email();
export type MailPurpose = "MARKETING" | "MANUAL" | "SUPPORT";

/** Check at delivery time, including queued messages and every CC recipient. */
export async function checkRecipientPolicy(
  organizationId: string,
  addresses: string[],
  purpose: MailPurpose = "MARKETING",
  listContactId?: string,
): Promise<{ blocked: boolean; error?: string }> {
  const recipients = new Set<string>();
  for (const raw of addresses.flatMap((value) => value.split(/[,;]/))) {
    const parsed = email.safeParse(raw);
    if (!parsed.success) return { blocked: true, error: "Recapito destinatario non valido" };
    recipients.add(parsed.data);
  }
  if (listContactId) {
    const entry = await db.emailListContact.findFirst({
      where: { id: listContactId, list: { organizationId } },
      select: { email: true, unsubscribed: true },
    });
    if (!entry || entry.unsubscribed || !recipients.has(entry.email.trim().toLowerCase()))
      return { blocked: true, error: "Destinatario disiscritto o non disponibile nella lista" };
  }
  const policies = await db.recipientPolicy.findMany({
    where: { organizationId, address: { in: [...recipients] } },
  });
  for (const policy of policies) {
    if (policy.status === "CLEARED") continue;
    if (policy.status === "PERMANENT_BOUNCE")
      return { blocked: true, error: "Recapito con rimbalzo permanente: invio bloccato" };
    if (purpose !== "MARKETING") continue;
    if (
      policy.status === "SUSPENDED" &&
      policy.suspendedUntil &&
      policy.suspendedUntil <= new Date()
    )
      continue;
    return { blocked: true, error: "Recapito escluso dal marketing: invio bloccato" };
  }
  return { blocked: false };
}
