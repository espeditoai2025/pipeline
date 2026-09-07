-- Preserve recordings: detach orphaned or cross-organization references before enforcing relations.
UPDATE "VoiceNote" v SET "contactId" = NULL
WHERE v."contactId" IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM "Contact" c WHERE c.id = v."contactId" AND c."organizationId" = v."organizationId"
);
UPDATE "VoiceNote" v SET "dealId" = NULL
WHERE v."dealId" IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM "Deal" d WHERE d.id = v."dealId" AND d."organizationId" = v."organizationId"
);
CREATE INDEX "VoiceNote_contactId_idx" ON "VoiceNote"("contactId");
CREATE INDEX "VoiceNote_dealId_idx" ON "VoiceNote"("dealId");
ALTER TABLE "VoiceNote" ADD CONSTRAINT "VoiceNote_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VoiceNote" ADD CONSTRAINT "VoiceNote_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
