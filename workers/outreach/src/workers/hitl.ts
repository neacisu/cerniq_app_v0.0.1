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
import { Worker, Job, Queue } from "bullmq";
import { v4 as uuidv4 } from "uuid";
import { Redis } from "ioredis";
import { QUEUES } from "@cerniq/worker-shared";
import { reviewReasonEnum } from "@cerniq/db";
import { asBullmqConnection } from "../utils/bullmq-connection.js";

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
}

export interface TakeoverInitiateJobData {
  tenantId: string;
  leadId: string;
  journeyId: string;
  reviewId: string;
  assignedUserId: string;
  reason?: string;
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

export function createReviewQueueManagerWorker(redis: Redis): Worker {
  const connection = asBullmqConnection(redis);
  const slaEnforcerQueue = new Queue(QUEUES.HUMAN_APPROVE_MESSAGE, { connection });

  return new Worker(
    QUEUES.HUMAN_REVIEW_QUEUE,
    async (job: Job<ReviewQueueJobData>): Promise<{ reviewId: string }> => {
      const { tenantId, journeyId, priority, content } = job.data;
      const reason = toPersistedReviewReason(job.data.reason);

      const { db } = await import("@cerniq/db");
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
    },
    { connection, concurrency: 50 },
  );
}

// =============================================================================
// Worker: SLA Enforcer (delayed job)
// Checks if review was resolved before SLA breach
// =============================================================================

export function createSlaEnforcerWorker(redis: Redis): Worker {
  const connection = asBullmqConnection(redis);
  const escalationQueue = new Queue(QUEUES.HUMAN_TAKEOVER_COMPLETE, { connection });

  return new Worker(
    QUEUES.HUMAN_APPROVE_MESSAGE,
    async (job: Job<SlaEnforcerJobData>): Promise<void> => {
      const { tenantId, reviewId, priority } = job.data;

      const { db } = await import("@cerniq/db");
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
    },
    { connection, concurrency: 20 },
  );
}

// =============================================================================
// Worker: human:takeover:initiate (ADR-0064)
// Stops automation, flags as human controlled
// =============================================================================

export function createHumanTakeoverWorker(redis: Redis): Worker {
  const connection = asBullmqConnection(redis);
  const sequenceStopQueue = new Queue(QUEUES.SEQUENCE_STOP, { connection });

  return new Worker(
    QUEUES.HUMAN_TAKEOVER_INITIATE,
    async (job: Job<TakeoverInitiateJobData>): Promise<void> => {
      const { tenantId, journeyId, reviewId, assignedUserId, reason } = job.data;

      const { db } = await import("@cerniq/db");
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
        { journeyId, reason: reason ?? "HUMAN_TAKEOVER" },
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
    },
    { connection, concurrency: 20 },
  );
}

// =============================================================================
// Worker: human:takeover:complete — Resolution Handler
// Returns lead to automation after human resolution
// =============================================================================

export function createResolutionHandlerWorker(redis: Redis): Worker {
  const connection = asBullmqConnection(redis);
  return new Worker(
    QUEUES.HUMAN_TAKEOVER_COMPLETE,
    async (job: Job<TakeoverCompleteJobData>): Promise<void> => {
      const { tenantId, journeyId, reviewId, resolution, resolvedByUserId } = job.data;

      const { db } = await import("@cerniq/db");
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
    },
    { connection, concurrency: 20 },
  );
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

export function createHitlAuditLoggerWorker(redis: Redis): Worker {
  const connection = asBullmqConnection(redis);
  return new Worker(
    QUEUES.LEAD_ASSIGN_USER, // reuse for audit events
    async (job: Job<HitlAuditJobData>): Promise<void> => {
      const { tenantId, reviewId, actorUserId, eventType, payload } = job.data;

      const { db } = await import("@cerniq/db");
      const { hitlAuditLog } = await import("@cerniq/db");

      await db.insert(hitlAuditLog).values({
        id: uuidv4(),
        tenantId,
        reviewId,
        actorUserId,
        eventType,
        payload,
      });
    },
    { connection, concurrency: 50 },
  );
}

// =============================================================================
// Review Assignment Worker
// =============================================================================

export function createReviewAssignmentWorker(redis: Redis): Worker {
  const connection = asBullmqConnection(redis);
  const takeoverQueue = new Queue(QUEUES.HUMAN_TAKEOVER_INITIATE, { connection });

  return new Worker(
    QUEUES.HUMAN_REVIEW_ASSIGN,
    async (job: Job<ReviewAssignJobData>): Promise<void> => {
      const { reviewId, assignedUserId } = job.data;

      const { db } = await import("@cerniq/db");
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
    },
    { connection, concurrency: 20 },
  );
}

// =============================================================================
// Escalation Worker
// =============================================================================

export function createEscalationWorker(redis: Redis): Worker {
  const connection = asBullmqConnection(redis);
  return new Worker(
    QUEUES.HUMAN_TAKEOVER_COMPLETE,
    async (job: Job<EscalationJobData>): Promise<void> => {
      const { tenantId, reviewId, escalationReason } = job.data;

      const { db } = await import("@cerniq/db");
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
    },
    { connection, concurrency: 10 },
  );
}
