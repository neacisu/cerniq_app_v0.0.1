/**
 * D19 — negotiation:state:transition (concurrency: 10)
 *
 * Execută o tranziție de stare FSM pentru o negociere.
 * Validarea se face prin trigger-ul validate_state_transition() din DB.
 * Dacă tranziția e invalidă, DB aruncă SQLSTATE P0001 "FSM: tranzitie invalida".
 */
import type { Processor } from "bullmq";
import { db, setSessionTenantId, goldNegotiations, eq, and } from "@cerniq/db";
import { createQueue, DEFAULT_JOB_OPTIONS } from "@cerniq/worker-shared";

const LOG = "[d19-negotiation-state-transition]";

const STATES_NEEDING_RESERVATION = new Set(["PROPOSAL", "NEGOTIATION", "CLOSING", "PROFORMA_SENT"]);

export interface NegotiationStateTransitionJobData {
  tenantId: string;
  negotiationId: string;
  toState: string;
  changedBy?: string;
  reason?: string;
}

export interface NegotiationStateTransitionResult {
  ok: true;
  negotiationId: string;
  fromState: string;
  toState: string;
}

export class InvalidFSMTransitionError extends Error {
  constructor(fromState: string, toState: string) {
    super(`Invalid FSM transition: ${fromState} → ${toState}`);
    this.name = "InvalidFSMTransitionError";
  }
}

export const negotiationStateTransitionProcessor: Processor<
  NegotiationStateTransitionJobData,
  NegotiationStateTransitionResult
> = async (job) => {
  const { tenantId, negotiationId, toState, changedBy, reason } = job.data;
  await setSessionTenantId(tenantId);

  const existing = await db
    .select({ currentState: goldNegotiations.currentState })
    .from(goldNegotiations)
    .where(and(eq(goldNegotiations.tenantId, tenantId), eq(goldNegotiations.id, negotiationId)))
    .limit(1);

  if (existing.length === 0) {
    throw new Error(`Negotiation not found: ${negotiationId}`);
  }

  const fromState = existing[0].currentState;

  try {
    await db
      .update(goldNegotiations)
      .set({ currentState: toState, updatedAt: new Date() })
      .where(and(eq(goldNegotiations.tenantId, tenantId), eq(goldNegotiations.id, negotiationId)));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("FSM: tranzitie invalida")) {
      throw new InvalidFSMTransitionError(fromState, toState);
    }
    throw err;
  }

  console.info(`${LOG} ${fromState} → ${toState} negotiation=${negotiationId} tenant=${tenantId}`);

  const historyQueue = createQueue("negotiation:history:log", {
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
  await historyQueue.add("negotiation:history:log", {
    tenantId,
    negotiationId,
    fromState,
    toState,
    changedBy: changedBy ?? null,
    reason: reason ?? null,
  });
  await historyQueue.close();

  if (STATES_NEEDING_RESERVATION.has(toState)) {
    const itemsQueue = createQueue("negotiation:items:update", {
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
    await itemsQueue.add("negotiation:items:update", {
      tenantId,
      negotiationId,
      action: "upsert",
      items: [],
    });
    await itemsQueue.close();
  }

  return { ok: true, negotiationId, fromState, toState };
};
