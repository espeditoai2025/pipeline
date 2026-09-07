import { config } from "dotenv";
import { writeFile } from "node:fs/promises";
config({ path: ".env.local", quiet: true });

// Explicit, bounded production smoke test. Email can target only Resend's documented test inbox.
const orgId = "release-smoke-20260907";
const slug = "release-smoke-20260907";
const userId = "release-smoke-20260907-user";
const contactId = "release-smoke-20260907-contact";
const workflowId = "release-smoke-20260907-workflow";

async function main() {
  const { db } = await import("../src/lib/db");
  try {
    const action = process.argv[2];
    if (action === "seed") {
      const { enqueueWorkflows } = await import("../src/lib/workflow-events");
      await db.$transaction(async (tx) => {
        if (await tx.organization.findUnique({ where: { id: orgId } })) {
          throw new Error(
            "Smoke fixture already exists; inspect it instead of creating duplicates",
          );
        }
        await tx.organization.create({
          data: {
            id: orgId,
            slug,
            name: "Verifica tecnica rilascio 7 settembre — temporanea",
            plan: "PRO",
          },
        });
        await tx.user.create({
          data: {
            id: userId,
            name: "Verifica tecnica",
            email: "release-20260907@pipely-smoke.invalid",
            role: "OWNER",
            organizationId: orgId,
          },
        });
        await tx.contact.create({
          data: {
            id: contactId,
            firstName: "Verifica tecnica",
            organizationId: orgId,
            ownerId: userId,
          },
        });
        await tx.workflow.create({
          data: {
            id: workflowId,
            name: "Verifica cron rilascio 7 settembre",
            organizationId: orgId,
            isActive: true,
            trigger: { type: "CONTACT_CREATED" },
            steps: [
              {
                id: "activity",
                action: {
                  type: "CREATE_ACTIVITY",
                  activityType: "TASK",
                  subject: "Verifica automatica rilascio",
                  dueDays: 1,
                },
              },
              {
                id: "notice",
                action: {
                  type: "SEND_NOTIFICATION",
                  to: "owner",
                  message: "Verifica cron completata",
                },
              },
            ],
          },
        });
        await enqueueWorkflows(
          tx,
          {
            trigger: "CONTACT_CREATED",
            orgId,
            contactId,
            contactName: "Verifica tecnica",
            ownerId: userId,
            source: "manual",
          },
          "release-smoke-20260907-contact-created",
        );
      });
      process.stdout.write(
        "Fixture accodata: attesa del cron Vercel, nessun worker avviato dal locale.\n",
      );
    } else if (action === "seed-mail") {
      const { enqueueWorkflows } = await import("../src/lib/workflow-events");
      await db.$transaction(async (tx) => {
        const org = await tx.organization.findUnique({ where: { id: orgId } });
        if (!org || org.slug !== slug) throw new Error("Fixture identity mismatch");
        const leadId = `${orgId}-lead`;
        const templateId = `${orgId}-template`;
        await tx.lead.create({
          data: {
            id: leadId,
            title: "Verifica invio Resend",
            data: {},
            email: "delivered+pipely-release-20260907@resend.dev",
            organizationId: orgId,
            ownerId: userId,
          },
        });
        await tx.emailTemplate.create({
          data: {
            id: templateId,
            name: "Verifica tecnica",
            subject: "Pipely — verifica rilascio 7 settembre",
            body: "<p>Verifica tecnica dell’integrazione email Pipely. Nessun dato cliente.</p>",
            category: "TEST",
            organizationId: orgId,
          },
        });
        await tx.workflow.create({
          data: {
            id: `${orgId}-mail-workflow`,
            name: "Verifica invio al destinatario di test Resend",
            organizationId: orgId,
            isActive: true,
            trigger: { type: "LEAD_CREATED" },
            steps: [{ id: "mail", action: { type: "SEND_EMAIL", templateId, to: "lead" } }],
          },
        });
        await enqueueWorkflows(
          tx,
          {
            trigger: "LEAD_CREATED",
            orgId,
            leadId,
            leadTitle: "Verifica invio Resend",
            ownerId: userId,
            source: "manual",
          },
          "release-smoke-20260907-mail",
        );
      });
      process.stdout.write("Accodato un invio al solo destinatario di test ufficiale Resend.\n");
    } else if (action === "status") {
      const [jobs, activities, notices, executions, emails] = await Promise.all([
        db.workflowQueue.findMany({
          where: { orgId },
          select: {
            status: true,
            stepIndex: true,
            attempts: true,
            logs: true,
            error: true,
            createdAt: true,
          },
        }),
        db.activity.count({
          where: { organizationId: orgId, subject: "Verifica automatica rilascio" },
        }),
        db.notification.count({ where: { userId } }),
        db.workflowExecution.count({ where: { workflow: { organizationId: orgId } } }),
        db.email.findMany({
          where: { organizationId: orgId },
          select: { status: true, sentAt: true, toAddresses: true },
        }),
      ]);
      const result = {
        checkedAt: new Date().toISOString(),
        jobs,
        activities,
        notices,
        executions,
        emails,
      };
      if (process.argv.includes("--save"))
        await writeFile(
          "docs/RILASCIO-2026-09-07-smoke.json",
          JSON.stringify(result, null, 2) + "\n",
        );
      process.stdout.write(JSON.stringify(result) + "\n");
    } else if (action === "cleanup") {
      const org = await db.organization.findUnique({ where: { id: orgId } });
      if (org && (org.slug !== slug || !org.name.startsWith("Verifica tecnica rilascio")))
        throw new Error("Fixture identity mismatch");
      if (
        await db.workflowQueue.count({
          where: { orgId, status: { in: ["PENDING", "PAUSED", "RUNNING"] } },
        })
      )
        throw new Error("Wait for fixture jobs to finish before cleanup");
      await db.$transaction(async (tx) => {
        // Email.organizationId has no cascading FK: remove only this exact test message.
        await tx.email.deleteMany({
          where: {
            organizationId: orgId,
            subject: "Pipely — verifica rilascio 7 settembre",
            toAddresses: { equals: ["delivered+pipely-release-20260907@resend.dev"] },
          },
        });
        if (await tx.email.count({ where: { organizationId: orgId } }))
          throw new Error("Unexpected email in fixture; inspect before cleanup");
        if (org) await tx.organization.delete({ where: { id: orgId, slug } });
      });
      process.stdout.write("Rimossa esclusivamente l'organizzazione temporanea del collaudo.\n");
    } else throw new Error("Use seed, seed-mail, status or cleanup");
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Smoke check failed");
  process.exitCode = 1;
});
