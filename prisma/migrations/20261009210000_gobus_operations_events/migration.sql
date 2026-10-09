ALTER TABLE "Pipeline" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "CustomField" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Deal" ADD COLUMN "acceptanceEvidence" TEXT, ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Activity" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "firstCompletedAt" TIMESTAMP(3), ADD COLUMN "companyId" TEXT;
UPDATE "Activity" SET "firstCompletedAt" = "completedAt" WHERE "completedAt" IS NOT NULL;
ALTER TABLE "Pipeline" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "CustomField" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "Activity" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Note" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Note" ADD CONSTRAINT "Note_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Note_companyId_idx" ON "Note"("companyId");
CREATE TABLE "ActivityEvent" (
  "id" TEXT PRIMARY KEY, "activityId" TEXT NOT NULL, "action" TEXT NOT NULL,
  "actorId" TEXT NOT NULL, "completedAt" TIMESTAMP(3), "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityEvent_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ActivityEvent_activityId_createdAt_idx" ON "ActivityEvent"("activityId", "createdAt");
CREATE TABLE "GobusProfile" (
  "id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "companyId" TEXT NOT NULL,
  "source" TEXT NOT NULL, "segment" TEXT, "companyType" TEXT,
  "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED', "lifecycle" TEXT NOT NULL DEFAULT 'PROSPECT',
  "basePlan" TEXT, "trialUpgrade" TEXT, "trialEndsAt" TIMESTAMP(3), "activatedAt" TIMESTAMP(3),
  "firstServiceAt" TIMESTAMP(3), "nextAction" TEXT, "isTest" BOOLEAN NOT NULL DEFAULT false,
  "feeAmount" DECIMAL(65,30), "feeCurrency" TEXT NOT NULL DEFAULT 'EUR', "feePeriod" TEXT,
  "feeVat" TEXT NOT NULL DEFAULT 'UNKNOWN', "feeSource" TEXT, "feeVerifiedAt" TIMESTAMP(3), "feeEvidence" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GobusProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GobusProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GobusProfile_feeAmount_check" CHECK ("feeAmount" IS NULL OR "feeAmount" >= 0)
);
CREATE UNIQUE INDEX "GobusProfile_companyId_key" ON "GobusProfile"("companyId");
CREATE INDEX "GobusProfile_organizationId_source_segment_idx" ON "GobusProfile"("organizationId", "source", "segment");
CREATE TABLE "ExternalEvent" (
  "id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "source" TEXT NOT NULL, "externalId" TEXT NOT NULL,
  "identityKey" TEXT, "kind" TEXT NOT NULL, "state" TEXT NOT NULL, "direction" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL, "companyId" TEXT, "contactId" TEXT, "recipient" TEXT,
  "recipientVerified" BOOLEAN NOT NULL DEFAULT false, "account" TEXT, "mailbox" TEXT, "uidValidity" TEXT,
  "uid" TEXT, "messageId" TEXT, "messageRef" TEXT, "evidence" TEXT, "isTest" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExternalEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ExternalEvent_organizationId_source_externalId_key" ON "ExternalEvent"("organizationId", "source", "externalId");
CREATE UNIQUE INDEX "ExternalEvent_organizationId_identityKey_key" ON "ExternalEvent"("organizationId", "identityKey");
CREATE INDEX "ExternalEvent_organizationId_companyId_occurredAt_idx" ON "ExternalEvent"("organizationId", "companyId", "occurredAt");
CREATE TABLE "ExternalEventRevision" (
  "id" TEXT PRIMARY KEY, "eventId" TEXT NOT NULL, "snapshot" JSONB NOT NULL, "actorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExternalEventRevision_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ExternalEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ExternalEventRevision_eventId_createdAt_idx" ON "ExternalEventRevision"("eventId", "createdAt");
