BEGIN;

ALTER TABLE "Invoice" ADD COLUMN "paidAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;

CREATE TABLE "InvoicePayment" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "amount" DECIMAL(65,30) NOT NULL,
  "paidAt" TIMESTAMP(3) NOT NULL,
  "method" TEXT NOT NULL,
  "reference" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "voidedAt" TIMESTAMP(3),
  "voidReason" TEXT,
  "voidedById" TEXT,
  CONSTRAINT "InvoicePayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InvoicePayment_amount_positive" CHECK ("amount" > 0),
  CONSTRAINT "InvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InvoicePayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InvoicePayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InvoicePayment_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "InvoicePayment_organizationId_requestId_key" ON "InvoicePayment"("organizationId", "requestId");
CREATE INDEX "InvoicePayment_invoiceId_voidedAt_idx" ON "InvoicePayment"("invoiceId", "voidedAt");
CREATE INDEX "Invoice_organizationId_status_dueDate_idx" ON "Invoice"("organizationId", "status", "dueDate");

-- Preserve previously recorded paid statuses as an explicit opening balance.
-- The date is historical when available; otherwise it is the last recorded update.
INSERT INTO "InvoicePayment" ("id", "invoiceId", "organizationId", "requestId", "amount", "paidAt", "method", "reference", "createdById", "createdAt")
SELECT 'legacy_' || "id", "id", "organizationId", 'legacy_' || "id", "total",
       COALESCE("paidAt", "updatedAt"), 'saldo_precedente', 'Saldo preesistente alla gestione incassi', "createdById", "updatedAt"
FROM "Invoice" WHERE "status" = 'PAID' AND "total" > 0;
UPDATE "Invoice" SET "paidAmount" = "total" WHERE "status" = 'PAID' AND "total" > 0;

COMMIT;
