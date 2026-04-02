/**
 * D25 — negotiation:reopen:request (concurrency: 3)
 *
 * Solicită redeschiderea unei negocieri DEAD (max 90 zile de la creare).
 * Necesită aprobare HITL — enqueue hitl:escalate.
 * Tranziția DEAD → DISCOVERY se face doar după aprobare HITL.
 */
import type { Processor } from "bullmq";
import { db, setSessionTenantId, goldNegotiations, eq, and } from "@cerniq/db";
import { createQueue, DEFAULT_JOB_OPTIONS } from "@cerniq/worker-shared";

const LOG = "[d25-negotiation-reopen-request]";

export interface NegotiationReopenRequestJobData {
  tenantId: string;
  negotiationId: string;
  requestedBy: string;
  reason: string;
}

export interface NegotiationReopenRequestResult {
  ok: true;
  negotiationId: string;
  escalated: true;
  message: string;
}

export const negotiationReopenRequestProcessor: Processor<
  NegotiationReopenRequestJobData,
  NegotiationReopenRequestResult
> = async (job) => {
  const { tenantId, negotiationId, requestedBy, reason } = job.data;
  await setSessionTenantId(tenantId);

  const rows = await db
    .select({
      id: goldNegotiations.id,
      currentState: goldNegotiations.currentState,
      createdAt: goldNegotiations.createdAt,
    })
    .from(goldNegotiations)
    .where(and(eq(goldNegotiations.tenantId, tenantId), eq(goldNegotiations.id, negotiationId)))
    .limit(1);

  if (rows.length === 0) {
    throw new Error(`Negotiation not found: ${negotiationId}`);
  }

  const neg = rows[0];

  if (neg.currentState !== "DEAD") {
    throw new Error(
      `Cannot reopen negotiation ${negotiationId}: currentState=${neg.currentState}, expected DEAD`,
    );
  }

  const createdAt = neg.createdAt instanceof Date ? neg.createdAt : new Date(neg.createdAt);
  const ageMs = Date.now() - createdAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  if (ageDays > 90) {
    throw new Error(
      `Cannot reopen negotiation ${negotiationId}: created ${Math.floor(ageDays)} days ago (max 90 days)`,
    );
  }

  const hitlQueue = createQueue("hitl:escalate", {
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });

  await hitlQueue.add("hitl:escalate", {
    discriminator: "negotiation-reopen",
    negotiationId,
    requestedBy,
    reason,
    tenantId,
  });

  await hitlQueue.close();

  console.info(
    `${LOG} HITL escalation queued: negotiation=${negotiationId} requestedBy=${requestedBy}`,
  );

  return {
    ok: true,
    negotiationId,
    escalated: true,
    message: "HITL approval required",
  };
};
