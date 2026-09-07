CREATE TABLE "VoiceNote" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "authorId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "audio" BYTEA NOT NULL,
  "mimeType" TEXT NOT NULL,
  "byteSize" INTEGER NOT NULL,
  "duration" INTEGER NOT NULL,
  "transcript" TEXT NOT NULL DEFAULT '',
  "transcribingAt" TIMESTAMP(3),
  "dealId" TEXT,
  "contactId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VoiceNote_size_check" CHECK ("byteSize" > 0 AND "byteSize" <= 3145728 AND octet_length(audio) = "byteSize"),
  CONSTRAINT "VoiceNote_duration_check" CHECK (duration > 0 AND duration <= 120)
);
CREATE INDEX "VoiceNote_org_created" ON "VoiceNote"("organizationId", "createdAt");
CREATE TABLE "CrmCommand" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "authorId" TEXT NOT NULL,
  "input" TEXT NOT NULL,
  "proposal" JSONB NOT NULL,
  "context" JSONB NOT NULL,
  "result" JSONB,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "executedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "CrmCommand_org_author_created" ON "CrmCommand"("organizationId", "authorId", "createdAt");
CREATE TABLE "InvoicingConnection" (
  "organizationId" TEXT NOT NULL PRIMARY KEY REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "accessToken" TEXT NOT NULL,
  "refreshToken" TEXT,
  "expiresAt" TIMESTAMP(3),
  "companyId" INTEGER,
  "companyName" TEXT,
  "companyVat" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "InvoiceExport" (
  "invoiceId" TEXT NOT NULL PRIMARY KEY REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "companyId" INTEGER NOT NULL,
  "documentId" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'PREPARING',
  "remoteNumber" TEXT,
  "eInvoiceStatus" TEXT,
  "remoteTotal" DECIMAL(65,30),
  "payload" JSONB NOT NULL,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "InvoiceExport_company_document" ON "InvoiceExport"("organizationId", "companyId", "documentId");
CREATE INDEX "InvoiceExport_org_status" ON "InvoiceExport"("organizationId", "status");
CREATE TABLE "AiUsageDay" (
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "day" TEXT NOT NULL,
  "calls" INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY ("organizationId", "day")
);
