/**
 * Worker: lead:assign:user — atribuie `assigned_to_user` pe `outreach.lead_journey` (ADR-0064).
 * Coada era înregistrată în registry fără consumator; job-urile rămâneau blocate.
 */
import type { Job, Worker } from "bullmq";
import { QUEUES, createWorker, withCognitiveSpan } from "@cerniq/worker-shared";

export interface LeadAssignUserJobData {
  tenantId: string;
  journeyId: string;
  assignedToUserId: string;
  /** Dacă true, oprește automatizarea pentru lead (comportament explicit față de simpla atribuire). */
  setHumanControlled?: boolean;
  reason?: string;
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
          throw new Error(`lead_journey not found: journeyId=${journeyId} tenantId=${tenantId}`);
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

        return { ok: true };
      });
    },
    { concurrency: 20 },
  );
  return worker;
}
