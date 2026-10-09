ALTER TABLE "Contact" ADD COLUMN "externalSource" TEXT, ADD COLUMN "externalId" TEXT, ADD COLUMN "operationalEmail" TEXT;
ALTER TABLE "Company" ADD COLUMN "externalSource" TEXT, ADD COLUMN "externalId" TEXT, ADD COLUMN "operationalEmail" TEXT;
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_external_pair" CHECK (("externalSource" IS NULL) = ("externalId" IS NULL));
ALTER TABLE "Company" ADD CONSTRAINT "Company_external_pair" CHECK (("externalSource" IS NULL) = ("externalId" IS NULL));
CREATE UNIQUE INDEX "Contact_organizationId_externalSource_externalId_key" ON "Contact"("organizationId", "externalSource", "externalId");
CREATE UNIQUE INDEX "Company_organizationId_externalSource_externalId_key" ON "Company"("organizationId", "externalSource", "externalId");
CREATE TYPE "RecipientPolicyStatus" AS ENUM ('DO_NOT_CONTACT', 'PERMANENT_BOUNCE', 'SUSPENDED', 'CLEARED');
CREATE TABLE "RecipientPolicy" (
  "id" TEXT NOT NULL PRIMARY KEY, "organizationId" TEXT NOT NULL, "address" TEXT NOT NULL,
  "status" "RecipientPolicyStatus" NOT NULL, "reason" TEXT NOT NULL, "source" TEXT NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL, "suspendedUntil" TIMESTAMP(3), "verification" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RecipientPolicy_address_normalized" CHECK ("address" = lower(btrim("address"))),
  CONSTRAINT "RecipientPolicy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RecipientPolicy_organizationId_address_key" ON "RecipientPolicy"("organizationId", "address");
CREATE TABLE "RecipientPolicyEvent" (
  "id" TEXT NOT NULL PRIMARY KEY, "policyId" TEXT NOT NULL, "status" "RecipientPolicyStatus" NOT NULL,
  "reason" TEXT NOT NULL, "source" TEXT NOT NULL, "effectiveAt" TIMESTAMP(3) NOT NULL,
  "suspendedUntil" TIMESTAMP(3), "verification" TEXT, "actorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecipientPolicyEvent_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "RecipientPolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
