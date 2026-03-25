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
import { Job, Queue } from "bullmq";
import type { Worker } from "bullmq";
import { DateTime } from "luxon";
import { v4 as uuidv4 } from "uuid";
import { Redis } from "ioredis";
import { QUEUES, createWorker } from "@cerniq/worker-shared";
import { ROMANIAN_HOLIDAYS_2026, BUSINESS_HOURS } from "./resilience.js";
import { asBullmqConnection } from "../utils/bullmq-connection.js";

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
}

export interface SequenceStatsJobData {
  tenantId: string;
  sequenceId: string;
}

// =============================================================================
// Worker: sequence:schedule:followup
// delay_hours + delay_minutes, skip weekends, skip RO holidays
// =============================================================================

export function createSequenceSchedulerWorker(redis: Redis): Worker {
  const connection = asBullmqConnection(redis);
  const advanceQueue = new Queue(QUEUES.SEQUENCE_ADVANCE, { connection });

  const { worker } = createWorker(
    QUEUES.SEQUENCE_SCHEDULE_FOLLOWUP,
    async (job: Job<ScheduleFollowupJobData>): Promise<ScheduleFollowupResult> => {
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
        .where(eq(outreachSequences.id, sequenceId))
        .limit(1);

      if (sequences.length === 0) {
        return { scheduled: false, reason: "SEQUENCE_NOT_FOUND" };
      }

      const sequence = sequences[0];

      const nextStepRows = await db
        .select()
        .from(outreachSequenceSteps)
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
          .where(eq(sequenceEnrollments.id, sequenceEnrollmentId));

        return { scheduled: false, reason: "SEQUENCE_COMPLETE" };
      }

      const nextStep = nextStepRows[0];

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
        .where(eq(leadJourney.id, journeyId));

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
    { externalConnection: connection, concurrency: 50 },
  );
  return worker;
}

// =============================================================================
// Worker: sequence:stop
// Stops active enrollment, clears next_action_at
// =============================================================================

export function createSequenceStopWorker(redis: Redis): Worker {
  const connection = asBullmqConnection(redis);
  const { worker } = createWorker(
    QUEUES.SEQUENCE_STOP,
    async (job: Job<SequenceStopJobData>): Promise<void> => {
      const { journeyId, reason = "LEAD_REPLIED" } = job.data;

      const { db } = await import("@cerniq/db");
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
        .where(eq(leadJourney.id, journeyId));
    },
    { externalConnection: connection, concurrency: 50 },
  );
  return worker;
}

// =============================================================================
// Worker: sequence:advance
// Dispatches next step message via channel router
// =============================================================================

export function createSequenceAdvanceWorker(redis: Redis): Worker {
  const connection = asBullmqConnection(redis);
  const channelSelectorQueue = new Queue(QUEUES.OUTREACH_CHANNEL_SELECTOR, { connection });

  const { worker } = createWorker(
    QUEUES.SEQUENCE_ADVANCE,
    async (job: Job<SequenceAdvanceJobData>): Promise<void> => {
      const { tenantId, journeyId, sequenceEnrollmentId } = job.data;

      const { db, setSessionTenantId } = await import("@cerniq/db");
      await setSessionTenantId(tenantId);
      const { leadJourney } = await import("@cerniq/db");
      const { sequenceEnrollments } = await import("@cerniq/db");
      const { eq } = await import("@cerniq/db");

      // Verify enrollment is still ACTIVE before dispatching
      const enrollments = await db
        .select()
        .from(sequenceEnrollments)
        .where(eq(sequenceEnrollments.id, sequenceEnrollmentId))
        .limit(1);

      if (enrollments.length === 0 || enrollments[0].status !== "ACTIVE") {
        return; // Enrollment stopped, skip
      }

      // Dispatch via channel router
      const journeys = await db
        .select()
        .from(leadJourney)
        .where(eq(leadJourney.id, journeyId))
        .limit(1);

      if (journeys.length === 0) return;

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
    { externalConnection: connection, concurrency: 50 },
  );
  return worker;
}

// =============================================================================
// Worker: sequence:create (Enrollment Manager)
// Enrolls lead in sequence, sets first step
// =============================================================================

export function createEnrollmentManagerWorker(redis: Redis): Worker {
  const connection = asBullmqConnection(redis);
  const schedulerQueue = new Queue(QUEUES.SEQUENCE_SCHEDULE_FOLLOWUP, { connection });

  const { worker } = createWorker(
    QUEUES.SEQUENCE_CREATE,
    async (job: Job<EnrollmentCreateJobData>): Promise<{ enrollmentId: string }> => {
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
    { externalConnection: connection, concurrency: 20 },
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
export function createMergedEmailColdAnalyticsWorker(redis: Redis): Worker {
  const connection = asBullmqConnection(redis);
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
    { externalConnection: connection, concurrency: 10 },
  );
  return worker;
}
