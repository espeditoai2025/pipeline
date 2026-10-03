CREATE TABLE "McpToken" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "canWrite" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "McpToken_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "McpOperation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "McpOperation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "McpToken_keyHash_key" ON "McpToken"("keyHash");
CREATE INDEX "McpToken_organizationId_createdAt_idx" ON "McpToken"("organizationId", "createdAt");
CREATE UNIQUE INDEX "McpOperation_tokenId_requestId_key" ON "McpOperation"("tokenId", "requestId");
CREATE INDEX "McpOperation_organizationId_createdAt_idx" ON "McpOperation"("organizationId", "createdAt");
ALTER TABLE "McpToken" ADD CONSTRAINT "McpToken_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "McpToken" ADD CONSTRAINT "McpToken_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "McpOperation" ADD CONSTRAINT "McpOperation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "McpOperation" ADD CONSTRAINT "McpOperation_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "McpToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;
