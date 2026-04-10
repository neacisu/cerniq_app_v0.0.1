/**
 * Worker: lead:assign:user — atribuie `assigned_to_user` pe `outreach.lead_journey` (ADR-0064).
 * Coada era înregistrată în registry fără consumator; job-urile rămâneau blocate.
 */
import type { Job, Worker } from "bullmq";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import { QUEUES, createWorker, withCognitiveSpan } from "@cerniq/worker-shared";
import { createOutreachJobLogger } from "../lib/outreach-job-logger.js";

const svcLog = createServiceLogger("outreach-lead-assign-user", { etapa: "e2" });

export interface LeadAssignUserJobData {
  tenantId: string;
  journeyId: string;
  assignedToUserId: string;
  /** Dacă true, oprește automatizarea pentru lead (comportament explicit față de simpla atribuire). */
  setHumanControlled?: boolean;
  reason?: string;
  correlationId?: string;
  traceId?: string;
  causationKey?: string;
  sourceEndpoint?: string;
  actorId?: string;
}

export function createLeadAssignUserWorker(): Worker {
  const { worker } = createWorker(
    QUEUES.LEAD_ASSIGN_USER,
    async (job: Job<LeadAssignUserJobData>): Promise<{ ok: true }> => {
      return withCognitiveSpan("e2:lead:assign-user", async () => {
        const { tenantId, journeyId, assignedToUserId, setHumanControlled } = job.data;

        const jlog = createOutreachJobLogger(job, {
          workerName: "outreach-lead-assign-user",
          queueName: QUEUES.LEAD_ASSIGN_USER,
          tenantId,
          entityType: "journey",
          entityId: journeyId,
          correlationId: job.data.correlationId,
          traceId: job.data.traceId,
        });
        jlog.info("lead_assign", "start", {
          assignedToUserId,
          setHumanControlled: setHumanControlled === true,
        });

        const { db, setSessionTenantId } = await import("@cerniq/db");
        await setSessionTenantId(tenantId);
        const { leadJourney } = await import("@cerniq/db");
        const { eq, and } = await import("@cerniq/db");

        const rows = await db
          .select({ id: leadJourney.id })
          .from(leadJourney)
          .where(and(eq(leadJourney.id, journeyId), eq(leadJourney.tenantId, tenantId)))
          .limit(1);

        if (rows.length === 0) {
          const err = new Error(
            `lead_journey not found: journeyId=${journeyId} tenantId=${tenantId}`,
          );
          const enr = enrichError(err, { tenantId, journeyId, assignedToUserId });
          jlog.error("lead_assign", "journey_not_found", {
            journeyId,
            fingerprint: enr.fingerprint,
            errorType: enr.errorType,
            errorCode: enr.errorCode,
          });
          svcLog.warn(
            {
              tenantId,
              journeyId,
              fingerprint: enr.fingerprint,
              errorType: enr.errorType,
            },
            "lead_assign_journey_missing",
          );
          throw err;
        }

        await db
          .update(leadJourney)
          .set({
            assignedToUser: assignedToUserId,
            ...(setHumanControlled === true
              ? { isHumanControlled: true, requiresHumanReview: true }
              : {}),
            updatedAt: new Date(),
          })
          .where(eq(leadJourney.id, journeyId));

        jlog.done("lead_assign", "complete", { assignedToUserId });
        svcLog.info({ tenantId, journeyId, assignedToUserId }, "lead_assign_user_updated");
        return { ok: true };
      });
    },
    { concurrency: 20 },
  );
  return worker;
}
