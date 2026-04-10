/**
 * Human Review System (HITL) Workers — Sprint 3 PR5
 * Source: etapa2-workers-F-L-remaining.md Cat. L, etapa2-hitl-system.md
 *
 * SLA: URGENT=1h, HIGH=4h, MEDIUM=24h, LOW=72h
 * ADR-0064: Human Takeover (stop automation, assign user)
 *
 * Workers:
 * - human:review:queue       — Review Queue Manager
 * - SLA Enforcer             — delayed job SLA breach check
 * - human:takeover:initiate  — ADR-0064 stop automation
 * - human:takeover:complete  — Return to automation
 * - HITL Audit Logger
 * - Review Assignment
 * - Escalation Worker
 */
import type { Job, Worker } from "bullmq";
import { UnrecoverableError } from "bullmq";
import { v4 as uuidv4 } from "uuid";
import { auditWriter, createServiceLogger, enrichError } from "@cerniq/observability";
import { QUEUES, createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";
import { reviewReasonEnum } from "@cerniq/db";
import { ensureJobDataCorrelationId } from "../lib/ensure-job-data-correlation.js";
import { createOutreachJobLogger, OUTREACH_SYSTEM_TENANT } from "../lib/outreach-job-logger.js";

const svcLog = createServiceLogger("outreach-hitl", { etapa: "e2" });

/** Valori `review_reason_enum` (Postgres) — sursă: `outreach-enums.ts`. */
export type ReviewReason = (typeof reviewReasonEnum.enumValues)[number];

/**
 * Job payload poate folosi aliasul istoric `AI_FLAGGED` (înlocuit de `AI_UNCERTAIN` în DB).
 */
export type ReviewReasonJobInput = ReviewReason | "AI_FLAGGED";

export function toPersistedReviewReason(reason: ReviewReasonJobInput): ReviewReason {
  return reason === "AI_FLAGGED" ? "AI_UNCERTAIN" : reason;
}

// =============================================================================
// SLA configuration — EXACT from spec
// =============================================================================

export const SLA_HOURS: Record<string, number> = {
  URGENT: 1,
  HIGH: 4,
  MEDIUM: 24,
  LOW: 72,
} as const;

// =============================================================================
// Types
// =============================================================================

export type ReviewStatus =
  | "PENDING"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "ESCALATED"
  | "EXPIRED";
export type ReviewPriority = "URGENT" | "HIGH" | "MEDIUM" | "LOW";
export type HitlEventType =
  | "CREATED"
  | "ASSIGNED"
  | "VIEWED"
  | "EDITED"
  | "RESOLVED"
  | "ESCALATED"
  | "SLA_BREACH";

export interface ReviewQueueJobData {
  tenantId: string;
  leadId: string;
  journeyId: string;
  reason: ReviewReasonJobInput;
  priority: ReviewPriority;
  content?: string;
  channel?: string;
  correlationId?: string;
}

export interface SlaEnforcerJobData {
  tenantId: string;
  reviewId: string;
  priority: ReviewPriority;
  slaDueAt: string;
  correlationId?: string;
  traceId?: string;
  causationKey?: string;
  sourceEndpoint?: string;
  actorId?: string;
}

export interface TakeoverInitiateJobData {
  tenantId: string;
  leadId: string;
  journeyId: string;
  reviewId: string;
  assignedUserId: string;
  reason?: string;
  correlationId?: string;
  traceId?: string;
  causationKey?: string;
  sourceEndpoint?: string;
  actorId?: string;
  requestId?: string;
  httpCorrelationId?: string;
}

export interface TakeoverCompleteJobData {
  tenantId: string;
  leadId: string;
  journeyId: string;
  reviewId: string;
  resolution: string;
  resolvedByUserId: string;
  correlationId?: string;
}

export interface ReviewAssignJobData {
  tenantId?: string;
  reviewId: string;
  assignedUserId: string;
  correlationId?: string;
}

export interface EscalationJobData {
  tenantId: string;
  reviewId: string;
  escalationReason: "SLA_BREACH" | "UNRESOLVED" | "MANUAL";
  correlationId?: string;
}

/**
 * Evită dublarea auditului ESCALATED când enforcer-ul SLA a marcat deja review-ul ESCALATED
 * și enfilează același job de escaladare (idempotent la nivel operațional).
 */
export function isRedundantSlaEscalationJob(
  currentStatus: string,
  escalationReason: EscalationJobData["escalationReason"],
): boolean {
  return escalationReason === "SLA_BREACH" && currentStatus === "ESCALATED";
}

// =============================================================================
// Worker: human:review:queue — Review Queue Manager
// SLA: URGENT=1h, HIGH=4h, MEDIUM=24h, LOW=72h
// =============================================================================

export function createReviewQueueManagerWorker(): Worker {
  const slaEnforcerQueue = createQueue(QUEUES.HITL_SLA_ENFORCE);

  const { worker } = createWorker(
    QUEUES.HUMAN_REVIEW_QUEUE,
    async (job: Job<ReviewQueueJobData>): Promise<{ reviewId: string }> => {
      return withCognitiveSpan("e2:human:review-queue", async () => {
        const { tenantId, journeyId, priority, content } = job.data;
        const reason = toPersistedReviewReason(job.data.reason);

        const jlog = createOutreachJobLogger(job, {
          workerName: "outreach-hitl-review-queue",
          queueName: QUEUES.HUMAN_REVIEW_QUEUE,
          tenantId,
          entityType: "journey",
          entityId: journeyId,
          correlationId: job.data.correlationId,
        });
        jlog.info("hitl_review", "start", { priority, reason });

        const { db, setSessionTenantId } = await import("@cerniq/db");
        await setSessionTenantId(tenantId);
        const { humanReviewQueue } = await import("@cerniq/db");
        const { leadJourney } = await import("@cerniq/db");
        const { eq, and } = await import("@cerniq/db");

        const journeyRows = await db
          .select({ id: leadJourney.id })
          .from(leadJourney)
          .where(and(eq(leadJourney.id, journeyId), eq(leadJourney.tenantId, tenantId)))
          .limit(1);

        if (journeyRows.length === 0) {
          const err = new Error("hitl_review_lead_journey_not_found_for_tenant");
          svcLog.warn(
            {
              ...enrichError(err, { tenantId, journeyId, priority, reason }),
            },
            "hitl_review_queue_journey_missing",
          );
          auditWriter.write({
            method: "WORKER",
            routePattern: "e2:human:review-queue",
            statusCode: 404,
            tenantId,
            correlationId: job.data.correlationId ?? null,
            userId: null,
            action: "hitl_review_journey_not_found",
            resource: "lead_journey",
            resourceId: journeyId,
            metadata: { priority, reason },
          });
          jlog.warn("hitl_review", "journey_not_found", { journeyId });
          throw new UnrecoverableError(err.message);
        }

        const slaHours = SLA_HOURS[priority] ?? 24;
        const slaDueAt = new Date(Date.now() + slaHours * 3_600_000);

        const reviewId = uuidv4();

        try {
          await db.transaction(async (tx) => {
            await tx.insert(humanReviewQueue).values({
              id: reviewId,
              tenantId,
              journeyId,
              reason,
              priority,
              status: "PENDING",
              triggerContent: content,
              slaDueAt,
              slaBreached: false,
            });

            const journeyUpdated = await tx
              .update(leadJourney)
              .set({
                requiresHumanReview: true,
                humanReviewReason: reason,
                humanReviewPriority: priority,
                updatedAt: new Date(),
              })
              .where(and(eq(leadJourney.id, journeyId), eq(leadJourney.tenantId, tenantId)))
              .returning({ id: leadJourney.id });

            if (journeyUpdated.length === 0) {
              throw new Error("hitl_review_lead_journey_update_zero_rows");
            }
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg === "hitl_review_lead_journey_update_zero_rows") {
            jlog.error("hitl_review", "journey_update_failed", { journeyId, reviewId });
            auditWriter.write({
              method: "WORKER",
              routePattern: "e2:human:review-queue",
              statusCode: 409,
              tenantId,
              correlationId: job.data.correlationId ?? null,
              userId: null,
              action: "hitl_review_journey_update_conflict",
              resource: "lead_journey",
              resourceId: journeyId,
              metadata: { reviewId, priority, reason },
            });
            throw new UnrecoverableError(msg);
          }
          throw e;
        }

        // Schedule SLA enforcement check
        await slaEnforcerQueue.add(
          "sla-check",
          ensureJobDataCorrelationId({
            tenantId,
            reviewId,
            priority,
            slaDueAt: slaDueAt.toISOString(),
            correlationId: job.data.correlationId,
          }),
          { delay: slaHours * 3_600_000, removeOnComplete: 100 },
        );

        auditWriter.write({
          method: "WORKER",
          routePattern: "e2:human:review-queue",
          statusCode: 201,
          tenantId,
          correlationId: job.data.correlationId ?? null,
          userId: null,
          action: "hitl_review_created",
          resource: "human_review",
          resourceId: reviewId,
          metadata: { journeyId, priority, reason },
        });
        jlog.done("hitl_review", "review_created", { reviewId });
        return { reviewId };
      });
    },
    { concurrency: 50 },
  );
  return worker;
}

// =============================================================================
// Worker: SLA Enforcer (delayed job)
// Checks if review was resolved before SLA breach
// =============================================================================

export function createSlaEnforcerWorker(): Worker {
  const escalationQueue = createQueue(QUEUES.HUMAN_REVIEW_ESCALATION);

  const { worker } = createWorker(
    QUEUES.HITL_SLA_ENFORCE,
    async (job: Job<SlaEnforcerJobData>): Promise<void> => {
      return withCognitiveSpan("e2:human:hitl-sla-enforce", async () => {
        const { tenantId, reviewId, priority } = job.data;

        const jlog = createOutreachJobLogger(job, {
          workerName: "outreach-hitl-sla-enforce",
          queueName: QUEUES.HITL_SLA_ENFORCE,
          tenantId,
          entityType: "review",
          entityId: reviewId,
          correlationId: job.data.correlationId,
          traceId: job.data.traceId,
        });
        jlog.info("hitl_sla", "start", { priority });

        const { db, setSessionTenantId } = await import("@cerniq/db");
        await setSessionTenantId(tenantId);
        const { humanReviewQueue } = await import("@cerniq/db");
        const { hitlAuditLog } = await import("@cerniq/db");
        const { eq, and } = await import("@cerniq/db");

        const reviews = await db
          .select()
          .from(humanReviewQueue)
          .where(and(eq(humanReviewQueue.id, reviewId), eq(humanReviewQueue.tenantId, tenantId)))
          .limit(1);

        if (reviews.length === 0) {
          const err = new Error("hitl_sla_review_not_found");
          svcLog.warn(
            { ...enrichError(err, { tenantId, reviewId, priority }) },
            "hitl_sla_review_missing",
          );
          auditWriter.write({
            method: "WORKER",
            routePattern: "e2:human:hitl-sla-enforce",
            statusCode: 404,
            tenantId,
            correlationId: job.data.correlationId ?? null,
            traceId: job.data.traceId ?? null,
            userId: null,
            action: "hitl_sla_review_missing",
            resource: "human_review",
            resourceId: reviewId,
            metadata: { priority },
          });
          jlog.warn("hitl_sla", "review_missing", { reviewId });
          return;
        }

        const review = reviews[0];

        // If not resolved yet → SLA breach
        if (!["RESOLVED", "ESCALATED"].includes(review.status)) {
          const updated = await db
            .update(humanReviewQueue)
            .set({ slaBreached: true, status: "ESCALATED", updatedAt: new Date() })
            .where(and(eq(humanReviewQueue.id, reviewId), eq(humanReviewQueue.tenantId, tenantId)))
            .returning({ id: humanReviewQueue.id });

          if (updated.length === 0) {
            const err = new Error("hitl_sla_breach_update_zero_rows");
            svcLog.warn(
              { ...enrichError(err, { tenantId, reviewId, priority }) },
              "hitl_sla_breach_update_missed",
            );
            jlog.warn("hitl_sla", "breach_update_skipped", { reviewId });
            return;
          }

          const { outreachNotifications } = await import("@cerniq/db");
          await db.insert(outreachNotifications).values({
            tenantId,
            type: "SLA_BREACH",
            title: "SLA review depășit",
            body: `Review ${reviewId} — prioritate ${priority}`,
            resourceType: "human_review",
            resourceId: reviewId,
            isRead: false,
          });

          // Log SLA breach to audit
          await db.insert(hitlAuditLog).values({
            id: uuidv4(),
            tenantId,
            reviewId,
            eventType: "SLA_BREACH",
            payload: { priority, breachedAt: new Date().toISOString() },
          });
          auditWriter.write({
            method: "WORKER",
            routePattern: "e2:human:hitl-sla-enforce",
            statusCode: 200,
            tenantId,
            correlationId: job.data.correlationId ?? null,
            traceId: job.data.traceId ?? null,
            userId: null,
            action: "hitl_sla_breach",
            resource: "human_review",
            resourceId: reviewId,
            metadata: { priority, eventType: "SLA_BREACH" },
          });

          // Trigger escalation
          await escalationQueue.add(
            "escalate",
            ensureJobDataCorrelationId({
              tenantId,
              reviewId,
              escalationReason: "SLA_BREACH",
              correlationId: job.data.correlationId,
            }),
            { priority: 1, removeOnComplete: 100 },
          );
          jlog.warn("hitl_sla", "breach_escalated", { reviewId, priority });
          return;
        }
        jlog.done("hitl_sla", "within_sla_or_resolved", { reviewId, status: review.status });
      });
    },
    { concurrency: 20 },
  );
  return worker;
}

// =============================================================================
// Worker: human:takeover:initiate (ADR-0064)
// Stops automation, flags as human controlled
// =============================================================================

export function createHumanTakeoverWorker(): Worker {
  const sequenceStopQueue = createQueue(QUEUES.SEQUENCE_STOP);

  const { worker } = createWorker(
    QUEUES.HUMAN_TAKEOVER_INITIATE,
    async (job: Job<TakeoverInitiateJobData>): Promise<void> => {
      return withCognitiveSpan("e2:human:takeover-initiate", async () => {
        const { tenantId, journeyId, reviewId, assignedUserId, reason } = job.data;

        const jlog = createOutreachJobLogger(job, {
          workerName: "outreach-hitl-takeover-initiate",
          queueName: QUEUES.HUMAN_TAKEOVER_INITIATE,
          tenantId,
          entityType: "journey",
          entityId: journeyId,
          correlationId: job.data.correlationId ?? job.data.traceId,
          traceId: job.data.traceId,
        });
        jlog.info("hitl_takeover", "start", { reviewId, assignedUserId });

        const { db, setSessionTenantId } = await import("@cerniq/db");
        await setSessionTenantId(tenantId);
        const { leadJourney } = await import("@cerniq/db");
        const { humanReviewQueue } = await import("@cerniq/db");
        const { hitlAuditLog } = await import("@cerniq/db");
        const { eq, and } = await import("@cerniq/db");

        // ADR-0064: Stop all automation for this lead
        const journeyRows = await db
          .update(leadJourney)
          .set({
            isHumanControlled: true,
            assignedToUser: assignedUserId,
            requiresHumanReview: true,
            updatedAt: new Date(),
          })
          .where(and(eq(leadJourney.id, journeyId), eq(leadJourney.tenantId, tenantId)))
          .returning({ id: leadJourney.id });

        if (journeyRows.length === 0) {
          const err = new Error("hitl_takeover_journey_not_found");
          jlog.error("hitl_takeover", "journey_update_zero_rows", { journeyId });
          auditWriter.write({
            method: "WORKER",
            routePattern: "e2:human:takeover-initiate",
            statusCode: 404,
            tenantId,
            correlationId: job.data.correlationId ?? job.data.traceId ?? null,
            traceId: job.data.traceId ?? null,
            userId: assignedUserId,
            action: "hitl_takeover_journey_missing",
            resource: "lead_journey",
            resourceId: journeyId,
            metadata: { reviewId },
          });
          throw new UnrecoverableError(err.message);
        }

        // Coloană DB: assigned_to (nu assignedUserId)
        const reviewRows = await db
          .update(humanReviewQueue)
          .set({
            status: "ASSIGNED",
            assignedTo: assignedUserId,
            assignedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(and(eq(humanReviewQueue.id, reviewId), eq(humanReviewQueue.tenantId, tenantId)))
          .returning({ id: humanReviewQueue.id });

        if (reviewRows.length === 0) {
          const err = new Error("hitl_takeover_review_not_found");
          jlog.error("hitl_takeover", "review_update_zero_rows", { reviewId });
          auditWriter.write({
            method: "WORKER",
            routePattern: "e2:human:takeover-initiate",
            statusCode: 404,
            tenantId,
            correlationId: job.data.correlationId ?? job.data.traceId ?? null,
            traceId: job.data.traceId ?? null,
            userId: assignedUserId,
            action: "hitl_takeover_review_missing",
            resource: "human_review",
            resourceId: reviewId,
            metadata: { journeyId },
          });
          throw new UnrecoverableError(err.message);
        }

        // Stop active sequences
        await sequenceStopQueue.add(
          "human-takeover",
          ensureJobDataCorrelationId({
            tenantId,
            journeyId,
            reason: reason ?? "HUMAN_TAKEOVER",
            correlationId: job.data.correlationId ?? job.data.traceId,
          }),
          { priority: 1, removeOnComplete: 100 },
        );

        // Audit log
        await db.insert(hitlAuditLog).values({
          id: uuidv4(),
          tenantId,
          reviewId,
          actorUserId: assignedUserId,
          eventType: "ASSIGNED",
          payload: { journeyId, reason },
        });
        auditWriter.write({
          method: "WORKER",
          routePattern: "e2:human:takeover-initiate",
          statusCode: 200,
          tenantId,
          correlationId: job.data.correlationId ?? job.data.traceId ?? null,
          traceId: job.data.traceId ?? null,
          userId: assignedUserId,
          action: "hitl_takeover_initiated",
          resource: "human_review",
          resourceId: reviewId,
          metadata: { journeyId, reason: reason ?? null },
        });
        jlog.done("hitl_takeover", "initiated", { reviewId, journeyId });
      });
    },
    { concurrency: 20 },
  );
  return worker;
}

// =============================================================================
// Worker: human:takeover:complete — Resolution Handler
// Returns lead to automation after human resolution
// =============================================================================

export function createResolutionHandlerWorker(): Worker {
  const { worker } = createWorker(
    QUEUES.HUMAN_TAKEOVER_COMPLETE,
    async (job: Job<TakeoverCompleteJobData>): Promise<void> => {
      return withCognitiveSpan("e2:human:takeover-complete", async () => {
        const { tenantId, journeyId, reviewId, resolution, resolvedByUserId } = job.data;

        const jlog = createOutreachJobLogger(job, {
          workerName: "outreach-hitl-takeover-complete",
          queueName: QUEUES.HUMAN_TAKEOVER_COMPLETE,
          tenantId,
          entityType: "journey",
          entityId: journeyId,
          correlationId: job.data.correlationId,
        });
        jlog.info("hitl_takeover", "complete_start", { reviewId });

        const { db, setSessionTenantId } = await import("@cerniq/db");
        await setSessionTenantId(tenantId);
        const { leadJourney } = await import("@cerniq/db");
        const { humanReviewQueue } = await import("@cerniq/db");
        const { hitlAuditLog } = await import("@cerniq/db");
        const { eq, and } = await import("@cerniq/db");

        const reviewDone = await db
          .update(humanReviewQueue)
          .set({
            status: "RESOLVED",
            resolvedAt: new Date(),
            resolvedBy: resolvedByUserId,
            resolutionAction: "RETURN_TO_AUTOMATION",
            resolutionNotes: resolution,
            updatedAt: new Date(),
          })
          .where(and(eq(humanReviewQueue.id, reviewId), eq(humanReviewQueue.tenantId, tenantId)))
          .returning({ id: humanReviewQueue.id });

        if (reviewDone.length === 0) {
          const err = new Error("hitl_resolution_review_not_found");
          jlog.error("hitl_takeover", "review_resolve_zero_rows", { reviewId });
          auditWriter.write({
            method: "WORKER",
            routePattern: "e2:human:takeover-complete",
            statusCode: 404,
            tenantId,
            correlationId: job.data.correlationId ?? null,
            userId: resolvedByUserId,
            action: "hitl_resolution_review_missing",
            resource: "human_review",
            resourceId: reviewId,
            metadata: { journeyId },
          });
          throw new UnrecoverableError(err.message);
        }

        // Return lead to automation
        const journeyDone = await db
          .update(leadJourney)
          .set({
            isHumanControlled: false,
            requiresHumanReview: false,
            updatedAt: new Date(),
          })
          .where(and(eq(leadJourney.id, journeyId), eq(leadJourney.tenantId, tenantId)))
          .returning({ id: leadJourney.id });

        if (journeyDone.length === 0) {
          const err = new Error("hitl_resolution_journey_not_found");
          jlog.error("hitl_takeover", "journey_resolve_zero_rows", { journeyId });
          auditWriter.write({
            method: "WORKER",
            routePattern: "e2:human:takeover-complete",
            statusCode: 404,
            tenantId,
            correlationId: job.data.correlationId ?? null,
            userId: resolvedByUserId,
            action: "hitl_resolution_journey_missing",
            resource: "lead_journey",
            resourceId: journeyId,
            metadata: { reviewId },
          });
          throw new UnrecoverableError(err.message);
        }

        // Audit log
        await db.insert(hitlAuditLog).values({
          id: uuidv4(),
          tenantId,
          reviewId,
          actorUserId: resolvedByUserId,
          eventType: "RESOLVED",
          payload: { resolution, journeyId },
        });
        auditWriter.write({
          method: "WORKER",
          routePattern: "e2:human:takeover-complete",
          statusCode: 200,
          tenantId,
          correlationId: job.data.correlationId ?? null,
          userId: resolvedByUserId,
          action: "hitl_resolved",
          resource: "human_review",
          resourceId: reviewId,
          metadata: { journeyId, resolutionSummary: String(resolution).slice(0, 500) },
        });
        jlog.done("hitl_takeover", "completed", { reviewId, journeyId });
      });
    },
    { concurrency: 20 },
  );
  return worker;
}

// =============================================================================
// HITL Audit Logger — logs all review events
// =============================================================================

export interface HitlAuditJobData {
  tenantId: string;
  reviewId: string;
  actorUserId?: string;
  eventType: HitlEventType;
  payload: Record<string, unknown>;
}

export function createHitlAuditLoggerWorker(): Worker {
  const { worker } = createWorker(
    QUEUES.HUMAN_REVIEW_AUDIT_LOG,
    async (job: Job<HitlAuditJobData>): Promise<void> => {
      return withCognitiveSpan("e2:human:audit-log", async () => {
        const { tenantId, reviewId, actorUserId, eventType, payload } = job.data;

        const jlog = createOutreachJobLogger(job, {
          workerName: "outreach-hitl-audit-log",
          queueName: QUEUES.HUMAN_REVIEW_AUDIT_LOG,
          tenantId,
          entityType: "review",
          entityId: reviewId,
        });
        jlog.info("hitl_audit", "persist_start", { eventType, actorUserId });

        const { db, setSessionTenantId } = await import("@cerniq/db");
        await setSessionTenantId(tenantId);
        const { hitlAuditLog } = await import("@cerniq/db");

        await db.insert(hitlAuditLog).values({
          id: uuidv4(),
          tenantId,
          reviewId,
          actorUserId,
          eventType,
          payload,
        });
        auditWriter.write({
          method: "WORKER",
          routePattern: "e2:human:audit-log",
          statusCode: 200,
          tenantId,
          userId: actorUserId ?? null,
          action: `hitl_${String(eventType).toLowerCase()}`,
          resource: "human_review",
          resourceId: reviewId,
          metadata: {
            eventType,
            payloadKeys: Object.keys(payload).sort((a, b) => a.localeCompare(b)),
          },
        });
        jlog.done("hitl_audit", "persisted", { eventType });
      });
    },
    { concurrency: 50 },
  );
  return worker;
}

// =============================================================================
// Review Assignment Worker
// =============================================================================

export function createReviewAssignmentWorker(): Worker {
  const takeoverQueue = createQueue(QUEUES.HUMAN_TAKEOVER_INITIATE);

  const { worker } = createWorker(
    QUEUES.HUMAN_REVIEW_ASSIGN,
    async (job: Job<ReviewAssignJobData>): Promise<void> => {
      return withCognitiveSpan("e2:human:review-assign", async () => {
        const { reviewId, assignedUserId } = job.data;

        const jlog = createOutreachJobLogger(job, {
          workerName: "outreach-hitl-review-assign",
          queueName: QUEUES.HUMAN_REVIEW_ASSIGN,
          tenantId: job.data.tenantId?.trim() || OUTREACH_SYSTEM_TENANT,
          entityType: "review",
          entityId: reviewId,
          correlationId: job.data.correlationId,
        });
        jlog.info("hitl_assign", "start", { assignedUserId });

        const { db, setSessionTenantId } = await import("@cerniq/db");
        const { humanReviewQueue } = await import("@cerniq/db");
        const { leadJourney } = await import("@cerniq/db");
        const { eq } = await import("@cerniq/db");

        const rows = await db
          .select({
            tenantId: humanReviewQueue.tenantId,
            journeyId: humanReviewQueue.journeyId,
            leadId: leadJourney.leadId,
          })
          .from(humanReviewQueue)
          .innerJoin(leadJourney, eq(humanReviewQueue.journeyId, leadJourney.id))
          .where(eq(humanReviewQueue.id, reviewId))
          .limit(1);

        if (rows.length === 0) {
          const err = new Error("hitl_assign_review_not_found");
          svcLog.warn(
            { ...enrichError(err, { reviewId, tenantHint: job.data.tenantId ?? null }) },
            "hitl_assign_review_missing",
          );
          auditWriter.write({
            method: "WORKER",
            routePattern: "e2:human:review-assign",
            statusCode: 404,
            tenantId: job.data.tenantId?.trim() || OUTREACH_SYSTEM_TENANT,
            correlationId: job.data.correlationId ?? null,
            userId: null,
            action: "hitl_assign_review_not_found",
            resource: "human_review",
            resourceId: reviewId,
            metadata: { assignedUserId },
          });
          jlog.warn("hitl_assign", "review_not_found", { reviewId });
          return;
        }

        const row = rows[0];
        await setSessionTenantId(row.tenantId);
        svcLog.info(
          { tenantId: row.tenantId, reviewId, journeyId: row.journeyId },
          "hitl_review_assignment_dispatched",
        );
        await takeoverQueue.add(
          "assign",
          ensureJobDataCorrelationId({
            tenantId: row.tenantId,
            leadId: row.leadId,
            journeyId: row.journeyId,
            reviewId,
            assignedUserId,
            correlationId: job.data.correlationId,
          }),
          { priority: 1, removeOnComplete: 100 },
        );
        jlog.done("hitl_assign", "takeover_enqueued", {
          tenantId: row.tenantId,
          journeyId: row.journeyId,
        });
      });
    },
    { concurrency: 20 },
  );
  return worker;
}

// =============================================================================
// Escalation Worker
// =============================================================================

export function createEscalationWorker(): Worker {
  const { worker } = createWorker(
    QUEUES.HUMAN_REVIEW_ESCALATION,
    async (job: Job<EscalationJobData>): Promise<void> => {
      return withCognitiveSpan("e2:human:review-escalation", async () => {
        const { tenantId, reviewId, escalationReason } = job.data;

        const jlog = createOutreachJobLogger(job, {
          workerName: "outreach-hitl-escalation",
          queueName: QUEUES.HUMAN_REVIEW_ESCALATION,
          tenantId,
          entityType: "review",
          entityId: reviewId,
          correlationId: job.data.correlationId,
        });
        jlog.info("hitl_escalation", "start", { escalationReason });

        const { db, setSessionTenantId } = await import("@cerniq/db");
        await setSessionTenantId(tenantId);
        const { humanReviewQueue } = await import("@cerniq/db");
        const { hitlAuditLog } = await import("@cerniq/db");
        const { eq, and } = await import("@cerniq/db");

        const existing = await db
          .select({ status: humanReviewQueue.status })
          .from(humanReviewQueue)
          .where(and(eq(humanReviewQueue.id, reviewId), eq(humanReviewQueue.tenantId, tenantId)))
          .limit(1);

        if (existing.length === 0) {
          const err = new Error("hitl_escalation_review_not_found");
          svcLog.warn(
            { ...enrichError(err, { tenantId, reviewId, escalationReason }) },
            "hitl_escalation_review_missing",
          );
          auditWriter.write({
            method: "WORKER",
            routePattern: "e2:human:review-escalation",
            statusCode: 404,
            tenantId,
            correlationId: job.data.correlationId ?? null,
            userId: null,
            action: "hitl_escalation_review_missing",
            resource: "human_review",
            resourceId: reviewId,
            metadata: { escalationReason },
          });
          jlog.warn("hitl_escalation", "review_not_found", { reviewId });
          return;
        }

        if (isRedundantSlaEscalationJob(existing[0].status, escalationReason)) {
          jlog.info("hitl_escalation", "skip_redundant_sla_escalation", {
            reviewId,
            status: existing[0].status,
          });
          return;
        }

        const updated = await db
          .update(humanReviewQueue)
          .set({ status: "ESCALATED", updatedAt: new Date() })
          .where(and(eq(humanReviewQueue.id, reviewId), eq(humanReviewQueue.tenantId, tenantId)))
          .returning({ id: humanReviewQueue.id });

        if (updated.length === 0) {
          const err = new Error("hitl_escalation_update_zero_rows");
          jlog.warn("hitl_escalation", "update_skipped", { reviewId });
          svcLog.warn(
            { ...enrichError(err, { tenantId, reviewId, escalationReason }) },
            "hitl_escalation_update_missed",
          );
          return;
        }

        await db.insert(hitlAuditLog).values({
          id: uuidv4(),
          tenantId,
          reviewId,
          eventType: "ESCALATED",
          payload: { reason: escalationReason, escalatedAt: new Date().toISOString() },
        });
        auditWriter.write({
          method: "WORKER",
          routePattern: "e2:human:review-escalation",
          statusCode: 200,
          tenantId,
          correlationId: job.data.correlationId ?? null,
          userId: null,
          action: "hitl_escalated",
          resource: "human_review",
          resourceId: reviewId,
          metadata: { escalationReason },
        });
        jlog.done("hitl_escalation", "complete", { escalationReason });
      });
    },
    { concurrency: 10 },
  );
  return worker;
}
