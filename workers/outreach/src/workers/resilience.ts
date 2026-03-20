/**
 * Resilience Workers — Sprint 2 PR4
 * Source: etapa2-workers-overview.md sec 6, ADR-0056, ADR-0057
 *
 * Workers:
 * - Retry Orchestrator (Network=3 exp, 429=5 fixed 60s, 4xx=0 DLQ, 5xx=3 exp)
 * - Business Hours Scheduler (09-18 Europe/Bucharest, weekends+holidays skip)
 * - Priority Queue Manager (1=alerts, 2=outreach, 3=cleanup)
 */
import { Worker, Job, Queue } from "bullmq";
import { DateTime } from "luxon";
import { Redis } from "ioredis";
import { QUEUES } from "@cerniq/worker-shared";
import { asBullmqConnection } from "../utils/bullmq-connection.js";

// =============================================================================
// Romanian public holidays 2026 — EXACT from ADR-0056 specification
// DO NOT modify without updating the ADR
// =============================================================================

export const ROMANIAN_HOLIDAYS_2026: readonly string[] = [
  "2026-01-01",
  "2026-01-02", // Anul Nou
  "2026-01-24", // Ziua Unirii
  "2026-04-13", // Paște Ortodox
  "2026-04-14", // A doua zi de Paște
  "2026-05-01", // Ziua Muncii
  "2026-06-01", // Ziua Copilului / Rusalii
  "2026-06-02", // A doua zi de Rusalii
  "2026-08-15", // Adormirea Maicii Domnului
  "2026-11-30", // Sf. Andrei
  "2026-12-01", // Ziua Națională
  "2026-12-25",
  "2026-12-26", // Crăciun
] as const;

export const BUSINESS_HOURS = {
  START_HOUR: 9,
  END_HOUR: 18,
  TIMEZONE: "Europe/Bucharest",
  WORKING_DAYS: [1, 2, 3, 4, 5], // Mon-Fri ISO weekday
} as const;

// =============================================================================
// Retry policies — EXACT from workers-overview sec 6.1
// =============================================================================

export const RETRY_POLICIES = {
  NETWORK: { attempts: 3, backoff: { type: "exponential" as const, delay: 1000 } },
  RATE_LIMITED: { attempts: 5, backoff: { type: "fixed" as const, delay: 60_000 } },
  CLIENT_ERROR: { attempts: 0 }, // 4xx → DLQ immediately
  SERVER_ERROR: { attempts: 3, backoff: { type: "exponential" as const, delay: 2000 } },
} as const;

export const DLQ_CONFIG = {
  OUTREACH_DLQ: "dlq:outreach",
  retentionDays: 7,
  alertThreshold: 100,
  reviewRequired: ["PHONE_BANNED", "ACCOUNT_SUSPENDED", "INVALID_LEAD"] as const,
};

// =============================================================================
// Business Hours helpers
// =============================================================================

export function isBusinessHours(tz = BUSINESS_HOURS.TIMEZONE): boolean {
  const now = DateTime.now().setZone(tz);
  const dateIso = now.toISODate();
  if (dateIso === null) {
    return false;
  }
  return (
    now.weekday <= 5 &&
    !ROMANIAN_HOLIDAYS_2026.includes(dateIso) &&
    now.hour >= BUSINESS_HOURS.START_HOUR &&
    now.hour < BUSINESS_HOURS.END_HOUR
  );
}

export function getNextBusinessSlot(tz = BUSINESS_HOURS.TIMEZONE): DateTime {
  let candidate = DateTime.now().setZone(tz);

  // If past business hours today, move to tomorrow 09:00
  if (candidate.hour >= BUSINESS_HOURS.END_HOUR) {
    candidate = candidate
      .plus({ days: 1 })
      .set({ hour: BUSINESS_HOURS.START_HOUR, minute: 0, second: 0, millisecond: 0 });
  } else if (candidate.hour < BUSINESS_HOURS.START_HOUR) {
    candidate = candidate.set({
      hour: BUSINESS_HOURS.START_HOUR,
      minute: 0,
      second: 0,
      millisecond: 0,
    });
  }

  // Skip weekends and Romanian holidays
  while (true) {
    const isoDate = candidate.toISODate();
    const isBlocked =
      candidate.weekday > 5 || (isoDate !== null && ROMANIAN_HOLIDAYS_2026.includes(isoDate));
    if (!isBlocked) break;
    candidate = candidate.plus({ days: 1 });
  }

  return candidate;
}

// =============================================================================
// Types
// =============================================================================

export interface RetryJobData {
  originalQueue: string;
  originalJobData: unknown;
  errorType: "NETWORK" | "RATE_LIMITED" | "CLIENT_ERROR" | "SERVER_ERROR";
  errorMessage: string;
  statusCode?: number;
  attemptsMade: number;
}

export interface SchedulerJobData {
  targetQueue: string;
  jobData: unknown;
  jobName?: string;
  /** If true, enforce business hours; default true */
  enforceBusinessHours?: boolean;
}

export interface SchedulerResult {
  scheduled: boolean;
  scheduledAt?: string;
  reason?: string;
}

export interface PriorityJobData {
  targetQueue: string;
  jobData: unknown;
  jobName: string;
  /** 1=Highest (alerts), 2=Normal (outreach), 3=Low (cleanup) */
  priority: 1 | 2 | 3;
}

function computeRetryDelayMs(
  policy: (typeof RETRY_POLICIES)[keyof typeof RETRY_POLICIES],
  attemptsMade: number,
): number {
  if (!("backoff" in policy)) return 0;
  if (policy.backoff.type === "exponential") {
    return policy.backoff.delay * Math.pow(2, attemptsMade);
  }
  return policy.backoff.delay;
}

// =============================================================================
// Worker: Retry Orchestrator
// Classifies errors and re-queues with correct backoff
// =============================================================================

export function createRetryOrchestratorWorker(redis: Redis): Worker {
  const connection = asBullmqConnection(redis);
  const dlqQueue = new Queue(DLQ_CONFIG.OUTREACH_DLQ, { connection });

  return new Worker(
    QUEUES.WA_MESSAGE_RETRY,
    async (job: Job<RetryJobData>): Promise<void> => {
      const { originalQueue, originalJobData, errorType, errorMessage, statusCode, attemptsMade } =
        job.data;

      const policy = RETRY_POLICIES[errorType];

      // 4xx errors go straight to DLQ (0 retries)
      if (errorType === "CLIENT_ERROR" || (statusCode && statusCode >= 400 && statusCode < 500)) {
        await dlqQueue.add(
          "failed",
          { originalQueue, originalJobData, errorMessage, statusCode },
          {
            removeOnComplete: false,
            removeOnFail: { age: DLQ_CONFIG.retentionDays * 86400 },
          },
        );
        return;
      }

      if (attemptsMade >= ("attempts" in policy ? policy.attempts : 0)) {
        // Exhausted retries → DLQ
        await dlqQueue.add(
          "exhausted",
          { originalQueue, originalJobData, errorMessage, attemptsMade },
          { removeOnFail: { age: DLQ_CONFIG.retentionDays * 86400 } },
        );
        return;
      }

      const targetQueue = new Queue(originalQueue, { connection });
      const delay = computeRetryDelayMs(policy, attemptsMade);

      await targetQueue.add("retry", originalJobData, {
        delay,
        attempts: ("attempts" in policy ? policy.attempts : 0) - attemptsMade,
        backoff: "backoff" in policy ? policy.backoff : undefined,
      });
    },
    { connection, concurrency: 50 },
  );
}

// =============================================================================
// Worker: Business Hours Scheduler (ADR-0056)
// Enforces 09-18 Europe/Bucharest, no weekends, no RO holidays
// =============================================================================

export function createBusinessHoursSchedulerWorker(redis: Redis): Worker {
  const connection = asBullmqConnection(redis);
  return new Worker(
    QUEUES.QUOTA_BUSINESS_HOURS_CHECK,
    async (job: Job<SchedulerJobData>): Promise<SchedulerResult> => {
      const { targetQueue, jobData, jobName = "scheduled", enforceBusinessHours = true } = job.data;

      if (enforceBusinessHours && !isBusinessHours()) {
        const nextSlot = getNextBusinessSlot();
        const delayMs = nextSlot.toMillis() - Date.now();
        const scheduledAt = nextSlot.toISO();
        if (scheduledAt === null) {
          throw new Error(
            `BUG: getNextBusinessSlot returned invalid DateTime (tz=${BUSINESS_HOURS.TIMEZONE})`,
          );
        }

        const queue = new Queue(targetQueue, { connection });
        await queue.add(jobName, jobData as object, {
          delay: Math.max(delayMs, 0),
          removeOnComplete: { count: 1000 },
        });

        return {
          scheduled: true,
          scheduledAt,
          reason: "RESCHEDULED_OUTSIDE_BUSINESS_HOURS",
        };
      }

      const queue = new Queue(targetQueue, { connection });
      await queue.add(jobName, jobData as object, {
        removeOnComplete: { count: 1000 },
      });

      return { scheduled: true };
    },
    { connection, concurrency: 20 },
  );
}

// =============================================================================
// Worker: Priority Queue Manager
// Routes jobs to target queues with BullMQ native priority
// Priority: 1=Highest (alerts), 2=Normal (outreach), 3=Low (cleanup/stats)
// =============================================================================

export function createPriorityQueueManagerWorker(redis: Redis): Worker {
  const connection = asBullmqConnection(redis);
  return new Worker(
    QUEUES.PIPELINE_OUTREACH_METRICS,
    async (job: Job<PriorityJobData>): Promise<void> => {
      const { targetQueue, jobData, jobName, priority } = job.data;

      // Validate priority is 1, 2, or 3 only
      if (![1, 2, 3].includes(priority)) {
        throw new Error(`Invalid priority ${priority}. Must be 1, 2, or 3.`);
      }

      const queue = new Queue(targetQueue, { connection });
      await queue.add(jobName, jobData as object, {
        priority,
        removeOnComplete: { count: 1000 },
      });
    },
    { connection, concurrency: 50 },
  );
}
