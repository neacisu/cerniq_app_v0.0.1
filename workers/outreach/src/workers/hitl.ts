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
import { v4 as uuidv4 } from "uuid";
import { QUEUES, createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";
import { reviewReasonEnum } from "@cerniq/db";

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
}

export interface SlaEnforcerJobData {
  tenantId: string;
  reviewId: string;
  priority: ReviewPriority;
  slaDueAt: string;
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
  traceId?: string;
  causationKey?: string;
  sourceEndpoint?: string;
  actorId?: string;
}

export interface TakeoverCompleteJobData {
  tenantId: string;
  leadId: string;
  journeyId: string;
  reviewId: string;
  resolution: string;
  resolvedByUserId: string;
}

export interface ReviewAssignJobData {
  tenantId: string;
  reviewId: string;
  assignedUserId: string;
}

export interface EscalationJobData {
  tenantId: string;
  reviewId: string;
  escalationReason: "SLA_BREACH" | "UNRESOLVED" | "MANUAL";
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

        const { db, setSessionTenantId } = await import("@cerniq/db");
        await setSessionTenantId(tenantId);
        const { humanReviewQueue } = await import("@cerniq/db");
        const { leadJourney } = await import("@cerniq/db");
        const { eq } = await import("@cerniq/db");

        const slaHours = SLA_HOURS[priority] ?? 24;
        const slaDueAt = new Date(Date.now() + slaHours * 3_600_000);

        const reviewId = uuidv4();

        await db.insert(humanReviewQueue).values({
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

        // Mark lead as requires_human_review
        await db
          .update(leadJourney)
          .set({
            requiresHumanReview: true,
            humanReviewReason: reason,
            humanReviewPriority: priority,
            updatedAt: new Date(),
          })
          .where(eq(leadJourney.id, journeyId));

        // Schedule SLA enforcement check
        await slaEnforcerQueue.add(
          "sla-check",
          { tenantId, reviewId, priority, slaDueAt: slaDueAt.toISOString() },
          { delay: slaHours * 3_600_000, removeOnComplete: 100 },
        );

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

        const { db, setSessionTenantId } = await import("@cerniq/db");
        await setSessionTenantId(tenantId);
        const { humanReviewQueue } = await import("@cerniq/db");
        const { hitlAuditLog } = await import("@cerniq/db");
        const { eq } = await import("@cerniq/db");

        const reviews = await db
          .select()
          .from(humanReviewQueue)
          .where(eq(humanReviewQueue.id, reviewId))
          .limit(1);

        if (reviews.length === 0) return;

        const review = reviews[0];

        // If not resolved yet → SLA breach
        if (!["RESOLVED", "ESCALATED"].includes(review.status)) {
          await db
            .update(humanReviewQueue)
            .set({ slaBreached: true, status: "ESCALATED", updatedAt: new Date() })
            .where(eq(humanReviewQueue.id, reviewId));

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

          // Trigger escalation
          await escalationQueue.add(
            "escalate",
            { tenantId, reviewId, escalationReason: "SLA_BREACH" },
            { priority: 1, removeOnComplete: 100 },
          );
        }
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

        const { db, setSessionTenantId } = await import("@cerniq/db");
        await setSessionTenantId(tenantId);
        const { leadJourney } = await import("@cerniq/db");
        const { humanReviewQueue } = await import("@cerniq/db");
        const { hitlAuditLog } = await import("@cerniq/db");
        const { eq } = await import("@cerniq/db");

        // ADR-0064: Stop all automation for this lead
        await db
          .update(leadJourney)
          .set({
            isHumanControlled: true,
            assignedToUser: assignedUserId,
            requiresHumanReview: true,
            updatedAt: new Date(),
          })
          .where(eq(leadJourney.id, journeyId));

        // Coloană DB: assigned_to (nu assignedUserId)
        await db
          .update(humanReviewQueue)
          .set({
            status: "ASSIGNED",
            assignedTo: assignedUserId,
            assignedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(humanReviewQueue.id, reviewId));

        // Stop active sequences
        await sequenceStopQueue.add(
          "human-takeover",
          { tenantId, journeyId, reason: reason ?? "HUMAN_TAKEOVER" },
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

        const { db, setSessionTenantId } = await import("@cerniq/db");
        await setSessionTenantId(tenantId);
        const { leadJourney } = await import("@cerniq/db");
        const { humanReviewQueue } = await import("@cerniq/db");
        const { hitlAuditLog } = await import("@cerniq/db");
        const { eq } = await import("@cerniq/db");

        await db
          .update(humanReviewQueue)
          .set({
            status: "RESOLVED",
            resolvedAt: new Date(),
            resolvedBy: resolvedByUserId,
            resolutionAction: "RETURN_TO_AUTOMATION",
            resolutionNotes: resolution,
            updatedAt: new Date(),
          })
          .where(eq(humanReviewQueue.id, reviewId));

        // Return lead to automation
        await db
          .update(leadJourney)
          .set({
            isHumanControlled: false,
            requiresHumanReview: false,
            updatedAt: new Date(),
          })
          .where(eq(leadJourney.id, journeyId));

        // Audit log
        await db.insert(hitlAuditLog).values({
          id: uuidv4(),
          tenantId,
          reviewId,
          actorUserId: resolvedByUserId,
          eventType: "RESOLVED",
          payload: { resolution, journeyId },
        });
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

        if (rows.length === 0) return;

        const row = rows[0];
        await setSessionTenantId(row.tenantId);
        await takeoverQueue.add(
          "assign",
          {
            tenantId: row.tenantId,
            leadId: row.leadId,
            journeyId: row.journeyId,
            reviewId,
            assignedUserId,
          },
          { priority: 1, removeOnComplete: 100 },
        );
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

        const { db, setSessionTenantId } = await import("@cerniq/db");
        await setSessionTenantId(tenantId);
        const { humanReviewQueue } = await import("@cerniq/db");
        const { hitlAuditLog } = await import("@cerniq/db");
        const { eq } = await import("@cerniq/db");

        await db
          .update(humanReviewQueue)
          .set({ status: "ESCALATED", updatedAt: new Date() })
          .where(eq(humanReviewQueue.id, reviewId));

        await db.insert(hitlAuditLog).values({
          id: uuidv4(),
          tenantId,
          reviewId,
          eventType: "ESCALATED",
          payload: { reason: escalationReason, escalatedAt: new Date().toISOString() },
        });
      });
    },
    { concurrency: 10 },
  );
  return worker;
}
