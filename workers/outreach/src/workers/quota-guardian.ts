/**
 * Quota Guardian Workers — Sprint 2 PR1
 * Source: etapa2-workers-A-quota-guardian.md
 *
 * Workers:
 * - quota:guardian:check (concurrency=100, timeout=2000ms) — ADR-0056
 * - quota:guardian:increment (persist to PG)
 * - quota:guardian:reset (cron 0 0 * * *)
 */
import type { Job, Worker } from "bullmq";
import { Redis } from "ioredis";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import { QUEUES, createWorker, outreachWaQuotaUsage } from "@cerniq/worker-shared";
import { createOutreachJobLogger, OUTREACH_SYSTEM_TENANT } from "../lib/outreach-job-logger.js";
import { getQuotaKey, getPhoneStatusKey, DAILY_QUOTA_LIMIT } from "../utils/quota-lua.js";

const svcLog = createServiceLogger("outreach-quota-guardian", { etapa: "e2" });

// =============================================================================
// Types
// =============================================================================

export interface QuotaCheckJobData {
  correlationId: string;
  tenantId: string;
  phoneId: string;
  leadId: string;
  isNewContact: boolean;
  /** ISO date string e.g. "2026-03-20" */
  dateIso: string;
  /** Hour in Bucharest timezone (0-23) */
  currentHour: number;
}

export type QuotaCheckReason =
  | "QUOTA_OK"
  | "QUOTA_EXCEEDED"
  | "OUTSIDE_BUSINESS_HOURS"
  | "PHONE_OFFLINE"
  | "PHONE_BANNED";

export interface QuotaCheckResult {
  allowed: boolean;
  reason: QuotaCheckReason;
  currentUsage: number;
  remaining: number;
  costApplied: number;
}

export interface QuotaIncrementJobData {
  phoneId: string;
  dateIso: string;
  cost: 0 | 1;
  tenantId: string;
}

// =============================================================================
// Redis setup — DB 2 for Etapa 2 (from etapa2-environment-variables.md sec. 3)
// =============================================================================

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL;
  if (!url?.trim()) throw new Error("REDIS_URL is required");
  return new Redis(url, { db: 2, enableOfflineQueue: false, lazyConnect: true });
}

// =============================================================================
// Worker #1: quota:guardian:check
// Concurrency: 100, Timeout: 2000ms
// =============================================================================

/** Bucharest calendar date + hour for quota Lua (ADR-0056). */
export function getBucharestQuotaContext(now = new Date()): {
  dateIso: string;
  currentHour: number;
} {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  const h = parts.find((p) => p.type === "hour")?.value;
  return {
    dateIso: `${y}-${m}-${d}`,
    currentHour: Number(h ?? "12"),
  };
}

/**
 * Pre-send WA quota gate (same Lua as queue `quota:guardian:check`).
 * For new contacts (isNewContact=true), increments Redis usage when allowed.
 */
export async function quotaGuardianCheck(
  redis: Redis,
  luaSha: string,
  phoneId: string,
  ctx: {
    tenantId: string;
    leadId: string;
    isNewContact: boolean;
    correlationId?: string;
  },
): Promise<QuotaCheckResult> {
  const { dateIso, currentHour } = getBucharestQuotaContext();
  return executeQuotaCheck(redis, luaSha, {
    correlationId: ctx.correlationId ?? "",
    tenantId: ctx.tenantId,
    phoneId,
    leadId: ctx.leadId,
    isNewContact: ctx.isNewContact,
    dateIso,
    currentHour,
  });
}

/**
 * Core quota check logic — exported for testing without BullMQ.
 * Executes the Lua script atomically on Redis.
 */
export async function executeQuotaCheck(
  redis: Redis,
  luaSha: string,
  data: QuotaCheckJobData,
): Promise<QuotaCheckResult> {
  const quotaKey = getQuotaKey(data.phoneId, data.dateIso);
  const statusKey = getPhoneStatusKey(data.phoneId);
  const cost = data.isNewContact ? 1 : 0;

  const rawResult = await redis.evalsha(
    luaSha,
    2,
    quotaKey,
    statusKey,
    String(DAILY_QUOTA_LIMIT),
    String(cost),
    String(data.currentHour),
  );

  const parsed = JSON.parse(rawResult as string);

  const result = {
    allowed: parsed.allowed === true,
    reason: parsed.reason as QuotaCheckReason,
    currentUsage: Number(parsed.current_usage ?? 0),
    remaining: Number(parsed.remaining ?? 0),
    costApplied: Number(parsed.cost_applied ?? 0),
  };

  outreachWaQuotaUsage.set(
    { phone_id: data.phoneId, tenant_id: data.tenantId },
    result.currentUsage,
  );

  return result;
}

export function createQuotaCheckWorker(redis: Redis, luaSha: string): Worker {
  const { worker } = createWorker(
    QUEUES.QUOTA_GUARDIAN_CHECK,
    async (job: Job<QuotaCheckJobData>): Promise<QuotaCheckResult> => {
      const jlog = createOutreachJobLogger(job, {
        workerName: "outreach-quota-guardian-check",
        queueName: QUEUES.QUOTA_GUARDIAN_CHECK,
        tenantId: job.data.tenantId,
        entityType: "wa_phone",
        entityId: job.data.phoneId,
        correlationId: job.data.correlationId,
      });
      jlog.info("quota_check", "start", {
        leadId: job.data.leadId,
        dateIso: job.data.dateIso,
        isNewContact: job.data.isNewContact,
      });
      try {
        const result = await executeQuotaCheck(redis, luaSha, job.data);
        jlog.done("quota_check", "complete", {
          allowed: result.allowed,
          reason: result.reason,
          currentUsage: result.currentUsage,
        });
        return result;
      } catch (err: unknown) {
        const enr = enrichError(err, {
          tenantId: job.data.tenantId,
          phoneId: job.data.phoneId,
        });
        svcLog.error(
          { err, ...enr, tenantId: job.data.tenantId, phoneId: job.data.phoneId },
          "quota_check_failed",
        );
        jlog.error("quota_check", "failed", {
          error: err instanceof Error ? err.message : String(err),
          fingerprint: enr.fingerprint,
          errorType: enr.errorType,
        });
        throw err;
      }
    },
    {
      concurrency: 100,
      removeOnFail: { count: 1000 },
      removeOnComplete: { count: 1000 },
    },
  );
  return worker;
}

// =============================================================================
// Worker #2: quota:guardian:increment
// Persists Redis quota to PostgreSQL wa_quota_usage
// =============================================================================

export interface QuotaIncrementResult {
  phoneId: string;
  dateIso: string;
  newTotal: number;
}

export async function createQuotaIncrementWorker(redis: Redis): Promise<Worker> {
  // Dynamic import to avoid circular deps
  const { db, sql, setSessionTenantId } = await import("@cerniq/db");
  const { waQuotaUsage } = await import("@cerniq/db");

  const { worker } = createWorker(
    QUEUES.QUOTA_GUARDIAN_INCREMENT,
    async (job: Job<QuotaIncrementJobData>): Promise<QuotaIncrementResult> => {
      const { phoneId, dateIso, cost, tenantId } = job.data;
      const jlog = createOutreachJobLogger(job, {
        workerName: "outreach-quota-guardian-increment",
        queueName: QUEUES.QUOTA_GUARDIAN_INCREMENT,
        tenantId,
        entityType: "wa_phone",
        entityId: phoneId,
      });
      jlog.info("quota_increment", "start", { dateIso, cost });
      await setSessionTenantId(tenantId);

      await db
        .insert(waQuotaUsage)
        .values({
          tenantId,
          phoneId,
          usageDate: dateIso,
          messagesSent: cost,
          newContacts: cost,
          followUps: cost === 0 ? 1 : 0,
        })
        .onConflictDoUpdate({
          target: [waQuotaUsage.phoneId, waQuotaUsage.usageDate],
          set: {
            messagesSent: sql`${waQuotaUsage.messagesSent} + ${cost}`,
            newContacts: sql`${waQuotaUsage.newContacts} + ${cost}`,
            followUps: sql`${waQuotaUsage.followUps} + ${cost === 0 ? 1 : 0}`,
            updatedAt: new Date(),
          },
        });

      const quotaKey = getQuotaKey(phoneId, dateIso);
      const current = await redis.get(quotaKey);

      const out = {
        phoneId,
        dateIso,
        newTotal: Number(current ?? 0),
      };
      jlog.done("quota_increment", "complete", { newTotal: out.newTotal });
      return out;
    },
    {
      concurrency: 50,
      removeOnFail: { count: 1000 },
      removeOnComplete: { count: 500 },
    },
  );
  return worker;
}

// =============================================================================
// Worker #3: quota:guardian:reset
// Cron 0 0 * * * Europe/Bucharest — resets all Redis quota keys
// Does NOT touch PostgreSQL (wa_quota_usage preserves history)
// =============================================================================

export function createQuotaDailyResetWorker(redis: Redis): Worker {
  const { worker } = createWorker(
    QUEUES.QUOTA_GUARDIAN_RESET,
    async (job: Job): Promise<{ keysDeleted: number }> => {
      const jlog = createOutreachJobLogger(job, {
        workerName: "outreach-quota-guardian-reset",
        queueName: QUEUES.QUOTA_GUARDIAN_RESET,
        tenantId: OUTREACH_SYSTEM_TENANT,
      });
      jlog.info("quota_reset", "start", {});
      const pattern = "quota:wa:*";
      let cursor = "0";
      let keysDeleted = 0;

      do {
        const [newCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
        cursor = newCursor;
        if (keys.length > 0) {
          await redis.del(...keys);
          keysDeleted += keys.length;
        }
      } while (cursor !== "0");

      const smsPattern = "sms:quota:*";
      cursor = "0";
      do {
        const [newCursor, keys] = await redis.scan(cursor, "MATCH", smsPattern, "COUNT", 100);
        cursor = newCursor;
        if (keys.length > 0) {
          await redis.del(...keys);
          keysDeleted += keys.length;
        }
      } while (cursor !== "0");

      const result = { keysDeleted };
      jlog.done("quota_reset", "complete", result);
      svcLog.info(result, "quota_daily_reset_completed");
      return result;
    },
    {
      concurrency: 1,
      removeOnFail: { count: 100 },
      removeOnComplete: { count: 100 },
    },
  );
  return worker;
}

// =============================================================================
// Quota Monitoring Dashboard Data
// Returns per-phone quota usage for the dashboard QuotaUsageGrid component
// Source: E2.S2.PR2.003
// =============================================================================

export interface PhoneQuotaStatus {
  phoneId: string;
  phoneLabel: string;
  currentUsage: number;
  dailyLimit: number;
  percentage: number;
  status: "active" | "near_limit" | "exhausted" | "offline";
}

export async function getQuotaDashboardData(
  redis: Redis,
  tenantId: string,
): Promise<PhoneQuotaStatus[]> {
  const { db, setSessionTenantId } = await import("@cerniq/db");
  await setSessionTenantId(tenantId);
  const { waPhoneNumbers } = await import("@cerniq/db");
  const { eq } = await import("@cerniq/db");

  const phones = await db
    .select()
    .from(waPhoneNumbers)
    .where(eq(waPhoneNumbers.tenantId, tenantId));

  const today = new Date().toISOString().split("T")[0];
  const results: PhoneQuotaStatus[] = [];

  for (const phone of phones) {
    const quotaKey = getQuotaKey(phone.id, today);
    const current = await redis.get(quotaKey);
    const currentUsage = Number(current ?? 0);
    const dailyLimit = phone.dailyNewContactLimit;
    const percentage = dailyLimit > 0 ? Math.round((currentUsage / dailyLimit) * 100) : 0;

    let status: PhoneQuotaStatus["status"] = "active";
    if (phone.status !== "ACTIVE") {
      status = "offline";
    } else if (currentUsage >= dailyLimit) {
      status = "exhausted";
    } else if (percentage >= 90) {
      status = "near_limit";
    }

    results.push({
      phoneId: phone.id,
      phoneLabel: phone.displayName ?? phone.phoneNumber,
      currentUsage,
      dailyLimit,
      percentage,
      status,
    });
  }

  return results;
}

export { createRedisClient };
export { QUOTA_CHECK_LUA, DAILY_QUOTA_LIMIT, QUOTA_KEY_TTL_SECONDS } from "../utils/quota-lua.js";
