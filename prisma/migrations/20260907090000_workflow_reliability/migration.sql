-- Preserve queued work and snapshot its configuration before switching workers.
ALTER TABLE "Activity" ADD COLUMN "workflowOverdueAt" TIMESTAMP(3);
ALTER TABLE "Workflow" ADD COLUMN "triggerOnImport" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "WorkflowQueue"
  ADD COLUMN "eventKey" TEXT,
  ADD COLUMN "steps" JSONB,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lockToken" TEXT,
  ADD COLUMN "lockedUntil" TIMESTAMP(3),
  ADD COLUMN "emailInFlight" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "error" TEXT,
  ADD COLUMN "logs" JSONB[] NOT NULL DEFAULT ARRAY[]::JSONB[];
UPDATE "WorkflowQueue" q
SET "eventKey" = 'legacy:' || q.id, "steps" = w.steps, "status" = 'PAUSED'
FROM "Workflow" w WHERE w.id = q."workflowId";
ALTER TABLE "WorkflowQueue" ALTER COLUMN "eventKey" SET NOT NULL, ALTER COLUMN "steps" SET NOT NULL;
CREATE UNIQUE INDEX "WorkflowQueue_workflowId_eventKey_key" ON "WorkflowQueue"("workflowId", "eventKey");
CREATE INDEX "WorkflowQueue_status_resumeAt_idx" ON "WorkflowQueue"("status", "resumeAt");
ALTER TABLE "WorkflowExecution" ADD COLUMN "queueId" TEXT;
CREATE UNIQUE INDEX "WorkflowExecution_queueId_key" ON "WorkflowExecution"("queueId");
ALTER TABLE "WorkflowExecution" ADD CONSTRAINT "WorkflowExecution_queueId_fkey"
FOREIGN KEY ("queueId") REFERENCES "WorkflowQueue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Older manual validations must not be counted as real runs.
UPDATE "WorkflowExecution" SET status = 'VALIDATION' WHERE payload->>'entityId' = 'test';

ALTER TABLE "Organization" ADD COLUMN "stripeCheckoutSessionId" TEXT;
