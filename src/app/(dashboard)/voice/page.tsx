import { VoiceWorkspace } from "@/components/voice/VoiceWorkspace";
import { featureAccess } from "@/lib/feature-access";
import { getLimits } from "@/lib/plan";
import { listVoiceNotes } from "@/server/actions/voice";
import { db } from "@/lib/db";

export default async function VoicePage({ searchParams }: { searchParams: Promise<{ dealId?: string; contactId?: string }> }) {
  const access = await featureAccess(); const limits = getLimits(access.plan);
  const query = await searchParams;
  const deal = query.dealId ? await db.deal.findFirst({ where: { id: query.dealId, organizationId: access.orgId, status: { not: "DELETED" } }, select: { id: true, title: true } }) : null;
  const contact = !deal && query.contactId ? await db.contact.findFirst({ where: { id: query.contactId, organizationId: access.orgId }, select: { id: true, firstName: true, lastName: true } }) : null;
  const initialTarget = deal ? { id: deal.id, kind: "deal" as const, name: deal.title } : contact ? { id: contact.id, kind: "contact" as const, name: [contact.firstName, contact.lastName].filter(Boolean).join(" ") } : null;
  const result = await listVoiceNotes();
  if (result.error) return <p role="alert">{result.error}</p>;
  return <VoiceWorkspace initialNotes={result.data ?? []} initialTarget={initialTarget} canWrite={access.role !== "VIEWER"} canManage={["OWNER", "ADMIN"].includes(access.role)} userId={access.userId} ai={limits.ai} maxNotes={limits.maxVoiceNotes} />;
}
