import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

type References = {
  companyId?: string | null;
  contactId?: string | null;
  dealId?: string | null;
  pipelineId?: string | null;
  stageId?: string | null;
};

type Client = Pick<Prisma.TransactionClient, "company" | "contact" | "deal" | "pipeline" | "stage">;

/** Foreign keys must belong to the caller's workspace, even when supplied outside the UI. */
export async function validateCrmReferences(
  organizationId: string,
  references: References,
  client: Client = db,
): Promise<string | null> {
  const { companyId, contactId, dealId, pipelineId, stageId } = references;
  const checks = await Promise.all([
    companyId ? client.company.findFirst({ where: { id: companyId, organizationId }, select: { id: true } }).then(Boolean) : true,
    contactId ? client.contact.findFirst({ where: { id: contactId, organizationId }, select: { id: true } }).then(Boolean) : true,
    dealId ? client.deal.findFirst({ where: { id: dealId, organizationId, status: { not: "DELETED" } }, select: { id: true } }).then(Boolean) : true,
    pipelineId ? client.pipeline.findFirst({ where: { id: pipelineId, organizationId }, select: { id: true } }).then(Boolean) : true,
    stageId ? client.stage.findFirst({
      where: { id: stageId, pipeline: { organizationId }, ...(pipelineId ? { pipelineId } : {}) },
      select: { id: true },
    }).then(Boolean) : true,
  ]);
  const messages = [
    "Azienda non disponibile nella tua organizzazione",
    "Contatto non disponibile nella tua organizzazione",
    "Affare non disponibile nella tua organizzazione",
    "Pipeline non disponibile nella tua organizzazione",
    "Fase non disponibile nella pipeline selezionata",
  ];
  const failed = checks.indexOf(false);
  return failed < 0 ? null : messages[failed]!;
}
