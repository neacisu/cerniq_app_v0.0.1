/**
 * Lead State Machine Workers — Sprint 3 PR3
 * Source: etapa2-workers-F-L-remaining.md Cat. I, ADR-0062
 *
 * Workers:
 * - lead:state:transition (FSM executor)
 * - lead:state:validate (validator, reject invalid)
 * - State Change Notifier (inline side effects)
 */
import type { Job, Worker } from "bullmq";
import {
  QUEUES,
  createWorker,
  createQueue,
  withCognitiveSpan,
  fsmTransitions,
} from "@cerniq/worker-shared";

// =============================================================================
// VALID_TRANSITIONS — EXACT from ADR-0062
// DO NOT modify this map without an ADR amendment
// =============================================================================

export const VALID_TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  COLD: ["CONTACTED_WA", "CONTACTED_EMAIL", "DEAD"],
  CONTACTED_WA: ["WARM_REPLY", "CONTACTED_EMAIL", "DEAD"],
  CONTACTED_EMAIL: ["WARM_REPLY", "CONTACTED_WA", "DEAD"],
  WARM_REPLY: ["NEGOTIATION", "DEAD", "PAUSED"],
  NEGOTIATION: ["CONVERTED", "DEAD", "PAUSED", "WARM_REPLY"],
  CONVERTED: [], // FINAL state — no transitions out
  DEAD: ["COLD"], // Can be resurrected
  PAUSED: ["COLD", "WARM_REPLY", "NEGOTIATION"],
} as const;

/**
 * Valori `current_state_enum` / `previous_state` în PG.
 * Sursă: `packages/db/src/schemas/outreach-enums.ts` + ADR-0062.
 * După `validateTransition(from, to)`, `to` aparține acestei reuniuni.
 */
type LeadJourneyFsmState =
  | "COLD"
  | "CONTACTED_WA"
  | "CONTACTED_EMAIL"
  | "WARM_REPLY"
  | "NEGOTIATION"
  | "CONVERTED"
  | "DEAD"
  | "PAUSED";

/**
 * Pure function to validate a state transition.
 * Exported for reuse in UI (StateChangeDialog) and worker.
 */
export function validateTransition(fromState: string, toState: string): boolean {
  const validNext = VALID_TRANSITIONS[fromState];
  if (!validNext) return false;
  return validNext.includes(toState);
}

// =============================================================================
// Types
// =============================================================================

export type TransitionTrigger =
  | "MANUAL"
  | "WEBHOOK_REPLY"
  | "SEQUENCE_COMPLETE"
  | "TIMEOUT"
  | "AI_SENTIMENT"
  | "SYSTEM";

export interface StateTransitionJobData {
  tenantId: string;
  leadId: string;
  journeyId: string;
  newState: string;
  reason?: string;
  trigger: TransitionTrigger;
  traceId?: string;
  causationKey?: string;
  sourceEndpoint?: string;
  actorId?: string;
}

export interface StateTransitionResult {
  success: boolean;
  previousState: string;
  newState: string;
  sideEffects: string[];
  error?: string;
}

// =============================================================================
// Worker #35: lead:state:transition
// Concurrency: 50
// =============================================================================

export function createStateTransitionWorker(): Worker {
  const sequenceStopQueue = createQueue(QUEUES.SEQUENCE_STOP);

  const { worker } = createWorker(
    QUEUES.LEAD_STATE_TRANSITION,
    async (job: Job<StateTransitionJobData>): Promise<StateTransitionResult> => {
      return withCognitiveSpan("e2:lead:state-transition", async () => {
        const { tenantId, leadId, journeyId, newState, reason, trigger } = job.data;

        const { db, setSessionTenantId } = await import("@cerniq/db");
        await setSessionTenantId(tenantId);
        const { leadJourney } = await import("@cerniq/db");
        const { eq, and } = await import("@cerniq/db");

        // Fetch current state
        const journeys = await db
          .select()
          .from(leadJourney)
          .where(and(eq(leadJourney.id, journeyId), eq(leadJourney.tenantId, tenantId)))
          .limit(1);

        if (journeys.length === 0) {
          throw new Error(`Journey ${journeyId} not found for tenant ${tenantId}`);
        }

        const journey = journeys[0];
        const currentState = journey.currentState;

        // Validate transition
        if (!validateTransition(currentState, newState)) {
          throw new Error(
            `FSM invalid transition from ${currentState} to ${newState} for lead ${leadId}`,
          );
        }

        // Execute transition
        await db
          .update(leadJourney)
          .set({
            currentState: newState as LeadJourneyFsmState,
            previousState: currentState as LeadJourneyFsmState,
            stateChangedAt: new Date(),
            stateChangeReason: reason ?? `Triggered by ${trigger}`,
            updatedAt: new Date(),
            ...(newState === "CONVERTED" ? { convertedAt: new Date() } : {}),
          })
          .where(eq(leadJourney.id, journeyId));

        fsmTransitions.inc({ from: currentState, to: newState });

        // Side effects
        const sideEffects: string[] = [];

        if (newState === "WARM_REPLY") {
          // Stop active sequences for this lead
          await sequenceStopQueue.add(
            "stop",
            { tenantId, journeyId, reason: "LEAD_REPLIED" },
            { removeOnComplete: 100 },
          );
          sideEffects.push("STOPPED_SEQUENCE");
        }

        if (newState === "CONVERTED") {
          sideEffects.push("CONVERSION_NOTIFICATION");
        }

        if (newState === "DEAD") {
          sideEffects.push("LOGGED_DEAD");
        }

        return {
          success: true,
          previousState: currentState,
          newState,
          sideEffects,
        };
      });
    },
    { concurrency: 50 },
  );
  return worker;
}

// =============================================================================
// Worker: lead:state:validate
// Rejects invalid transitions without making changes
// =============================================================================

export interface StateValidateJobData {
  tenantId: string;
  journeyId: string;
  fromState: string;
  toState: string;
}

export interface StateValidateResult {
  valid: boolean;
  fromState: string;
  toState: string;
  validTransitions: string[];
  error?: string;
}

export function createStateValidateWorker(): Worker {
  const { worker } = createWorker(
    QUEUES.LEAD_STATE_VALIDATE,
    async (job: Job<StateValidateJobData>): Promise<StateValidateResult> => {
      return withCognitiveSpan("e2:lead:state-validate", async () => {
        const { fromState, toState } = job.data;
        const valid = validateTransition(fromState, toState);
        const validTransitions = (VALID_TRANSITIONS[fromState] as string[]) ?? [];

        return {
          valid,
          fromState,
          toState,
          validTransitions,
          ...(!valid && {
            error: `Invalid transition from ${fromState} to ${toState}. Valid: [${validTransitions.join(", ")}]`,
          }),
        };
      });
    },
    { concurrency: 50 },
  );
  return worker;
}
