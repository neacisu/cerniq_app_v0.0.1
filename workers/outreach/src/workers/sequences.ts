/**
 * Sequence Management Workers — Sprint 3 PR2
 * Source: etapa2-workers-F-L-remaining.md Cat. H
 *
 * Workers:
 * - sequence:schedule:followup — delay_hours + delay_minutes, skip weekends
 * - sequence:stop              — stop on reply
 * - sequence:advance           — advance to next step
 * - sequence:create            — enrollment manager
 * - Sequence Stats Aggregator
 */
import type { Job, Worker } from "bullmq";
import { DateTime } from "luxon";
import { v4 as uuidv4 } from "uuid";
import { QUEUES, createWorker, createQueue, withCognitiveSpan } from "@cerniq/worker-shared";
import { ROMANIAN_HOLIDAYS_2026, BUSINESS_HOURS } from "./resilience.js";

// =============================================================================
// Types
// =============================================================================

export interface ScheduleFollowupJobData {
  tenantId: string;
  leadId: string;
  journeyId: string;
  sequenceId: string;
  sequenceEnrollmentId: string;
  currentStep: number;
}

export interface ScheduleFollowupResult {
  scheduled: boolean;
  nextStep?: number;
  scheduledAt?: string;
  channel?: string;
  reason?: string;
}

export interface SequenceStopJobData {
  tenantId: string;
  journeyId: string;
  reason?: string;
}

export interface SequenceAdvanceJobData {
  tenantId: string;
  journeyId: string;
  sequenceEnrollmentId: string;
  completedStep: number;
}

export interface EnrollmentCreateJobData {
  tenantId: string;
  leadId: string;
  journeyId: string;
  sequenceId: string;
  startAt?: string;
  traceId?: string;
  causationKey?: string;
  sourceEndpoint?: string;
  actorId?: string;
}

export interface SequenceStatsJobData {
  tenantId: string;
  sequenceId: string;
}

// =============================================================================
// Worker: sequence:schedule:followup
// delay_hours + delay_minutes, skip weekends, skip RO holidays
// =============================================================================

export function createSequenceSchedulerWorker(): Worker {
  const advanceQueue = createQueue(QUEUES.SEQUENCE_ADVANCE);

  const { worker } = createWorker(
    QUEUES.SEQUENCE_SCHEDULE_FOLLOWUP,
    async (job: Job<ScheduleFollowupJobData>): Promise<ScheduleFollowupResult> => {
      return withCognitiveSpan(
        "e2:sequence:schedule-followup",
        async () => {
          const { tenantId, journeyId, sequenceId, sequenceEnrollmentId, currentStep } = job.data;

          const { db, setSessionTenantId } = await import("@cerniq/db");
          await setSessionTenantId(tenantId);
          const { outreachSequences } = await import("@cerniq/db");
          const { outreachSequenceSteps } = await import("@cerniq/db");
          const { sequenceEnrollments } = await import("@cerniq/db");
          const { leadJourney } = await import("@cerniq/db");
          const { eq, and } = await import("@cerniq/db");

          // Get sequence + steps
          const sequences = await db
            .select()
            .from(outreachSequences)
            .where(
              and(eq(outreachSequences.id, sequenceId), eq(outreachSequences.tenantId, tenantId)),
            )
            .limit(1);

          if (sequences.length === 0) {
            return { scheduled: false, reason: "SEQUENCE_NOT_FOUND" };
          }

          const sequence = sequences[0];

          const nextStepRows = await db
            .select()
            .from(outreachSequenceSteps)
            .innerJoin(
              outreachSequences,
              and(
                eq(outreachSequenceSteps.sequenceId, outreachSequences.id),
                eq(outreachSequences.tenantId, tenantId),
              ),
            )
            .where(
              and(
                eq(outreachSequenceSteps.sequenceId, sequenceId),
                eq(outreachSequenceSteps.stepNumber, currentStep + 1),
              ),
            )
            .limit(1);

          if (nextStepRows.length === 0) {
            // Sequence complete — update enrollment status
            await db
              .update(sequenceEnrollments)
              .set({ status: "COMPLETED", completedAt: new Date() })
              .where(
                and(
                  eq(sequenceEnrollments.id, sequenceEnrollmentId),
                  eq(sequenceEnrollments.tenantId, tenantId),
                ),
              );

            return { scheduled: false, reason: "SEQUENCE_COMPLETE" };
          }

          const nextStep = nextStepRows[0].outreach_sequence_steps;

          // Calculate next action time: delay_hours + delay_minutes
          let nextActionAt = DateTime.now()
            .setZone(BUSINESS_HOURS.TIMEZONE)
            .plus({
              hours: nextStep.delayHours ?? 24,
              minutes: nextStep.delayMinutes ?? 0,
            });

          // Skip weekends and RO holidays if sequence respects business hours
          if (sequence.respectBusinessHours) {
            while (true) {
              const isoDate = nextActionAt.toISODate();
              const isBlocked =
                nextActionAt.weekday > 5 ||
                (isoDate !== null && ROMANIAN_HOLIDAYS_2026.includes(isoDate));
              if (!isBlocked) break;
              nextActionAt = nextActionAt.plus({ days: 1 });
            }
            // Ensure within business hours (09-18)
            if (nextActionAt.hour < BUSINESS_HOURS.START_HOUR) {
              nextActionAt = nextActionAt.set({ hour: BUSINESS_HOURS.START_HOUR, minute: 0 });
            } else if (nextActionAt.hour >= BUSINESS_HOURS.END_HOUR) {
              nextActionAt = nextActionAt
                .plus({ days: 1 })
                .set({ hour: BUSINESS_HOURS.START_HOUR, minute: 0 });
            }
          }

          // Update lead journey with next action
          await db
            .update(leadJourney)
            .set({
              nextActionAt: nextActionAt.toJSDate(),
              sequenceStep: currentStep + 1,
              updatedAt: new Date(),
            })
            .where(and(eq(leadJourney.id, journeyId), eq(leadJourney.tenantId, tenantId)));

          // Schedule the advance job with delay
          const delayMs = Math.max(nextActionAt.toMillis() - Date.now(), 0);
          await advanceQueue.add(
            "advance",
            { tenantId, journeyId, sequenceEnrollmentId, completedStep: currentStep },
            { delay: delayMs, removeOnComplete: 100 },
          );

          const scheduledAt = nextActionAt.toISO();
          if (scheduledAt === null) {
            return { scheduled: false, reason: "INVALID_NEXT_ACTION_TIME" };
          }

          return {
            scheduled: true,
            nextStep: currentStep + 1,
            scheduledAt,
            channel: nextStep.channel,
          };
        },
        { tenantId: job.data.tenantId },
      );
    },
    { concurrency: 50 },
  );
  return worker;
}

// =============================================================================
// Worker: sequence:stop
// Stops active enrollment, clears next_action_at
// =============================================================================

export function createSequenceStopWorker(): Worker {
  const { worker } = createWorker(
    QUEUES.SEQUENCE_STOP,
    async (job: Job<SequenceStopJobData>): Promise<void> => {
      return withCognitiveSpan(
        "e2:sequence:stop",
        async () => {
          const { tenantId, journeyId, reason = "LEAD_REPLIED" } = job.data;

          const { db, setSessionTenantId } = await import("@cerniq/db");
          await setSessionTenantId(tenantId);
          const { sequenceEnrollments } = await import("@cerniq/db");
          const { leadJourney } = await import("@cerniq/db");
          const { eq, and } = await import("@cerniq/db");

          await db
            .update(sequenceEnrollments)
            .set({
              status: "STOPPED",
              stoppedReason: reason,
              lastStepExecutedAt: new Date(),
            })
            .where(
              and(
                eq(sequenceEnrollments.journeyId, journeyId),
                eq(sequenceEnrollments.tenantId, tenantId),
                eq(sequenceEnrollments.status, "ACTIVE"),
              ),
            );

          // Clear scheduled next action
          await db
            .update(leadJourney)
            .set({
              nextActionAt: null,
              sequencePaused: true,
              updatedAt: new Date(),
            })
            .where(and(eq(leadJourney.id, journeyId), eq(leadJourney.tenantId, tenantId)));
        },
        { tenantId: job.data.tenantId },
      );
    },
    { concurrency: 50 },
  );
  return worker;
}

// =============================================================================
// Worker: sequence:advance
// Dispatches next step message via channel router
// =============================================================================

export function createSequenceAdvanceWorker(): Worker {
  const channelSelectorQueue = createQueue(QUEUES.OUTREACH_CHANNEL_SELECTOR);

  const { worker } = createWorker(
    QUEUES.SEQUENCE_ADVANCE,
    async (job: Job<SequenceAdvanceJobData>): Promise<void> => {
      return withCognitiveSpan(
        "e2:sequence:advance",
        async () => {
          const { tenantId, journeyId, sequenceEnrollmentId } = job.data;

          const { db, setSessionTenantId } = await import("@cerniq/db");
          await setSessionTenantId(tenantId);
          const { leadJourney } = await import("@cerniq/db");
          const { sequenceEnrollments } = await import("@cerniq/db");
          const { eq, and } = await import("@cerniq/db");

          // Verify enrollment is still ACTIVE before dispatching
          const enrollments = await db
            .select()
            .from(sequenceEnrollments)
            .where(
              and(
                eq(sequenceEnrollments.id, sequenceEnrollmentId),
                eq(sequenceEnrollments.tenantId, tenantId),
              ),
            )
            .limit(1);

          if (enrollments.length === 0) {
            console.warn(
              `[sequence:advance] skip: enrollment ${sequenceEnrollmentId} not found (tenantId=${tenantId})`,
            );
            return;
          }
          if (enrollments[0].status !== "ACTIVE") {
            console.warn(
              `[sequence:advance] skip: enrollment ${sequenceEnrollmentId} status=${enrollments[0].status} (tenantId=${tenantId}, journeyId=${journeyId})`,
            );
            return;
          }

          // Dispatch via channel router
          const journeys = await db
            .select()
            .from(leadJourney)
            .where(and(eq(leadJourney.id, journeyId), eq(leadJourney.tenantId, tenantId)))
            .limit(1);

          if (journeys.length === 0) {
            console.warn(
              `[sequence:advance] skip: journey ${journeyId} not found for tenant ${tenantId}`,
            );
            return;
          }

          await channelSelectorQueue.add(
            "route",
            {
              tenantId,
              journeyId,
              leadId: journeys[0].leadId,
              isFollowup: true,
            },
            { priority: 2, removeOnComplete: 100 },
          );
        },
        { tenantId: job.data.tenantId },
      );
    },
    { concurrency: 50 },
  );
  return worker;
}

// =============================================================================
// Worker: sequence:create (Enrollment Manager)
// Enrolls lead in sequence, sets first step
// =============================================================================

export function createEnrollmentManagerWorker(): Worker {
  const schedulerQueue = createQueue(QUEUES.SEQUENCE_SCHEDULE_FOLLOWUP);

  const { worker } = createWorker(
    QUEUES.SEQUENCE_CREATE,
    async (job: Job<EnrollmentCreateJobData>): Promise<{ enrollmentId: string }> => {
      return withCognitiveSpan(
        "e2:sequence:create",
        async () => {
          const { tenantId, leadId, journeyId, sequenceId, startAt } = job.data;

          const { db, setSessionTenantId } = await import("@cerniq/db");
          await setSessionTenantId(tenantId);
          const { sequenceEnrollments } = await import("@cerniq/db");
          const { leadJourney } = await import("@cerniq/db");
          const { eq } = await import("@cerniq/db");

          const enrollmentId = uuidv4();

          await db.insert(sequenceEnrollments).values({
            id: enrollmentId,
            tenantId,
            journeyId,
            sequenceId,
            status: "ACTIVE",
            currentStep: 0,
            enrolledAt: startAt ? new Date(startAt) : new Date(),
          });

          // Update lead journey to track current sequence
          await db
            .update(leadJourney)
            .set({
              currentSequenceId: sequenceId,
              sequenceStep: 0,
              sequencePaused: false,
              updatedAt: new Date(),
            })
            .where(eq(leadJourney.id, journeyId));

          // Schedule first step immediately (step 0)
          await schedulerQueue.add(
            "schedule-first",
            {
              tenantId,
              leadId,
              journeyId,
              sequenceId,
              sequenceEnrollmentId: enrollmentId,
              currentStep: -1,
            },
            { removeOnComplete: 100 },
          );

          return { enrollmentId };
        },
        { tenantId: job.data.tenantId },
      );
    },
    { concurrency: 20 },
  );
  return worker;
}

// =============================================================================
// Worker: Sequence Stats Aggregator
// Calculates stats per sequence: sent, opened, replied, converted rates
// =============================================================================

export interface SequenceStatsResult {
  sequenceId: string;
  totalEnrolled: number;
  totalCompleted: number;
  /** Înrolări oprite mid-sequence: `status = PAUSED` și `stopped_reason` setat (vezi `createSequenceStopWorker`). */
  totalStopped: number;
  stats: {
    sent: number;
    opened: number;
    replied: number;
    converted: number;
    openRate: number;
    replyRate: number;
    conversionRate: number;
  };
}

export async function executeSequenceStatsJob(
  job: Job<SequenceStatsJobData>,
): Promise<SequenceStatsResult> {
  const { tenantId, sequenceId } = job.data;

  const { db, setSessionTenantId } = await import("@cerniq/db");
  await setSessionTenantId(tenantId);
  const { sequenceEnrollments } = await import("@cerniq/db");
  const { communicationLog } = await import("@cerniq/db");
  const { eq, and, sql } = await import("@cerniq/db");

  const enrollmentStats = await db
    .select({
      totalEnrolled: sql<number>`COUNT(*)::int`,
      totalCompleted: sql<number>`COUNT(*) FILTER (WHERE ${sequenceEnrollments.status} = 'COMPLETED')::int`,
      totalStopped: sql<number>`COUNT(*) FILTER (WHERE ${sequenceEnrollments.status} = 'STOPPED' OR (${sequenceEnrollments.status} = 'PAUSED' AND ${sequenceEnrollments.stoppedReason} IS NOT NULL))::int`,
    })
    .from(sequenceEnrollments)
    .where(
      and(
        eq(sequenceEnrollments.tenantId, tenantId),
        eq(sequenceEnrollments.sequenceId, sequenceId),
      ),
    );

  const msgStats = await db
    .select({
      sent: sql<number>`COUNT(*) FILTER (WHERE ${communicationLog.direction} = 'OUTBOUND')::int`,
      opened: sql<number>`COUNT(*) FILTER (WHERE ${communicationLog.direction} = 'OUTBOUND' AND ${communicationLog.status} IN ('DELIVERED','READ','OPENED'))::int`,
      replied: sql<number>`COUNT(*) FILTER (WHERE ${communicationLog.direction} = 'INBOUND')::int`,
    })
    .from(communicationLog)
    .where(
      and(eq(communicationLog.tenantId, tenantId), eq(communicationLog.sequenceId, sequenceId)),
    );

  const e = enrollmentStats[0];
  const m = msgStats[0];
  const sent = m?.sent ?? 0;

  return {
    sequenceId,
    totalEnrolled: e?.totalEnrolled ?? 0,
    totalCompleted: e?.totalCompleted ?? 0,
    totalStopped: e?.totalStopped ?? 0,
    stats: {
      sent,
      opened: m?.opened ?? 0,
      replied: m?.replied ?? 0,
      converted: 0,
      openRate: sent > 0 ? (m?.opened ?? 0) / sent : 0,
      replyRate: sent > 0 ? (m?.replied ?? 0) / sent : 0,
      conversionRate: 0,
    },
  };
}

/** Un singur worker pe `EMAIL_COLD_ANALYTICS_FETCH`: raport zilnic vs. agregare stats secvență. */
export function createMergedEmailColdAnalyticsWorker(): Worker {
  const { worker } = createWorker(
    QUEUES.EMAIL_COLD_ANALYTICS_FETCH,
    async (
      job: Job<SequenceStatsJobData | import("./monitoring.js").DailyReportJobData>,
    ): Promise<SequenceStatsResult | Record<string, unknown>> => {
      const d = job.data as { sequenceId?: string };
      if (d.sequenceId) {
        return executeSequenceStatsJob(job as Job<SequenceStatsJobData>);
      }
      const { executeDailyReportJob } = await import("./monitoring.js");
      return executeDailyReportJob(job as Job<import("./monitoring.js").DailyReportJobData>);
    },
    { concurrency: 10 },
  );
  return worker;
}
