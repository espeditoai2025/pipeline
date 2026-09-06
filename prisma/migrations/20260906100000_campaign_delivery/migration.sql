-- Registro per destinatario delle campagne email.
-- Consente di riprendere un invio interrotto senza riscrivere a chi ha gia'
-- ricevuto e di contare aperture e clic una sola volta per persona.
CREATE TABLE "CampaignDelivery" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),

    CONSTRAINT "CampaignDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CampaignDelivery_campaignId_contactId_key" ON "CampaignDelivery"("campaignId", "contactId");
CREATE INDEX "CampaignDelivery_campaignId_idx" ON "CampaignDelivery"("campaignId");

ALTER TABLE "CampaignDelivery" ADD CONSTRAINT "CampaignDelivery_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "EmailCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignDelivery" ADD CONSTRAINT "CampaignDelivery_contactId_fkey"
    FOREIGN KEY ("contactId") REFERENCES "EmailListContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
