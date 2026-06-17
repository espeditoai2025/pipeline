-- AlterTable
ALTER TABLE "WebhookDelivery" ADD COLUMN     "nextRetryAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "WebhookDelivery_success_nextRetryAt_idx" ON "WebhookDelivery"("success", "nextRetryAt");

