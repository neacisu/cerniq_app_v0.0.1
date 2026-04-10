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
import { auditWriter, createServiceLogger, enrichError } from "@cerniq/observability";
import {
  QUEUES,
  createWorker,
  createQueue,
  withCognitiveSpan,
  fsmTransitions,
} from "@cerniq/worker-shared";
import { ensureJobDataCorrelationId } from "../lib/ensure-job-data-correlation.js";
import { createOutreachJobLogger } from "../lib/outreach-job-logger.js";
import {
  validateTransition,
  isLeadJourneyFsmStateValue,
  listValidNextStates,
} from "./lead-fsm-transitions.js";

export {
  validateTransition,
  VALID_TRANSITIONS,
  listValidNextStates,
  isLeadJourneyFsmStateValue,
} from "./lead-fsm-transitions.js";
export type { LeadJourneyFsmStateValue } from "./lead-fsm-transitions.js";
const svcLog = createServiceLogger("outreach-lead-fsm", { etapa: "e2" });

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
  correlationId?: string;
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
  /** Propagare din API (F5) — opționale */
  requestId?: string;
  httpCorrelationId?: string;
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

        const jlog = createOutreachJobLogger(job, {
          workerName: "outreach-lead-fsm",
          queueName: QUEUES.LEAD_STATE_TRANSITION,
          tenantId,
          entityType: "journey",
          entityId: journeyId,
          correlationId: job.data.correlationId,
          traceId: job.data.traceId,
        });

        const { db, setSessionTenantId } = await import("@cerniq/db");
        await setSessionTenantId(tenantId);
        const { leadJourney, goldLeadJourney } = await import("@cerniq/db");
        const { eq, and } = await import("@cerniq/db");

        // Fetch current state
        const journeys = await db
          .select()
          .from(leadJourney)
          .where(and(eq(leadJourney.id, journeyId), eq(leadJourney.tenantId, tenantId)))
          .limit(1);

        if (journeys.length === 0) {
          const err = new Error(`Journey ${journeyId} not found for tenant ${tenantId}`);
          const enr = enrichError(err, { tenantId, journeyId, leadId });
          jlog.error("fsm_transition", "journey_not_found", {
            fingerprint: enr.fingerprint,
            errorType: enr.errorType,
          });
          throw err;
        }

        const journey = journeys[0];
        const currentState = journey.currentState;

        // Validate transition — invalid: log + metric, return (no throw) to avoid BullMQ retries
        if (!validateTransition(currentState, newState)) {
          jlog.warn("fsm_transition", "invalid_transition", {
            fromState: currentState,
            toState: newState,
            leadId,
          });
          svcLog.warn(
            {
              tenantId,
              leadId,
              journeyId,
              fromState: currentState,
              toState: newState,
              correlationId: job.data.correlationId,
            },
            "Invalid FSM transition rejected",
          );
          auditWriter.write({
            method: "WORKER",
            routePattern: "e2:lead:state-transition",
            statusCode: 409,
            tenantId,
            correlationId: job.data.correlationId ?? null,
            traceId: job.data.traceId ?? null,
            userId: job.data.actorId ?? null,
            action: "lead_state_transition_rejected",
            resource: "lead",
            resourceId: leadId,
            metadata: {
              journeyId,
              fromState: currentState,
              toState: newState,
              trigger,
              reason: reason ?? null,
            },
          });
          fsmTransitions.inc({ from: currentState, to: "INVALID" });
          return {
            success: false,
            previousState: currentState,
            newState,
            sideEffects: [],
            error: `FSM invalid transition from ${currentState} to ${newState} for lead ${leadId}`,
          };
        }
        if (!isLeadJourneyFsmStateValue(currentState) || !isLeadJourneyFsmStateValue(newState)) {
          const err = new Error(
            `[FSM] Invariant: stări canonice așteptate după validare (${currentState} → ${newState})`,
          );
          const enr = enrichError(err, { tenantId, journeyId, currentState, newState });
          jlog.error("fsm_transition", "invariant_violation", {
            fingerprint: enr.fingerprint,
            errorType: enr.errorType,
          });
          throw err;
        }

        // Execute transition
        await db
          .update(leadJourney)
          .set({
            currentState: newState,
            previousState: currentState,
            stateChangedAt: new Date(),
            stateChangeReason: reason ?? `Triggered by ${trigger}`,
            updatedAt: new Date(),
            ...(newState === "CONVERTED" ? { convertedAt: new Date() } : {}),
          })
          .where(eq(leadJourney.id, journeyId));

        await db.insert(goldLeadJourney).values({
          tenantId,
          companyId: journey.leadId,
          eventType: "FSM_STATE_TRANSITION",
          fromState: currentState,
          toState: newState,
          metadata: {
            trigger,
            journeyId,
            reason: reason ?? null,
            leadId,
            source: "outreach.lead_fsm",
          },
          correlationId: job.data.traceId ?? undefined,
        });

        fsmTransitions.inc({ from: currentState, to: newState });

        jlog.info("fsm_transition", "applied", {
          from: currentState,
          to: newState,
          leadId,
          tenantId,
          trigger,
        });
        auditWriter.write({
          method: "WORKER",
          routePattern: "e2:lead:state-transition",
          statusCode: 200,
          tenantId,
          correlationId: job.data.correlationId ?? null,
          traceId: job.data.traceId ?? null,
          userId: job.data.actorId ?? null,
          action: "lead_state_transition",
          resource: "lead",
          resourceId: leadId,
          metadata: {
            journeyId,
            fromState: currentState,
            toState: newState,
            trigger,
            reason: reason ?? null,
          },
        });

        // Side effects
        const sideEffects: string[] = [];

        if (newState === "WARM_REPLY") {
          // Stop active sequences for this lead
          await sequenceStopQueue.add(
            "stop",
            ensureJobDataCorrelationId({
              tenantId,
              journeyId,
              reason: "LEAD_REPLIED",
              correlationId: job.data.correlationId,
            }),
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

        jlog.done("fsm_transition", "complete", { newState, sideEffectsCount: sideEffects.length });
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
  correlationId?: string;
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
        const validTransitions = [...listValidNextStates(fromState)];

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
