import { after } from "next/server";
import { processWorkflowQueue } from "@/lib/workflow-engine";
import { logger } from "@/lib/logger";

/** Best effort latency; persisted jobs are also drained by cron. Call after commit. */
export function wakeWorkflows(orgId: string) {
  after(async () => {
    try {
      await processWorkflowQueue({ orgId, limit: 10, budgetMs: 20_000 });
    } catch (error) {
      logger.error("workflow-worker", "Ripresa rimandata al cron", { error: String(error) });
    }
  });
}
