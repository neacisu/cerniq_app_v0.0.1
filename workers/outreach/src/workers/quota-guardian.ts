/**
 * Quota Guardian Workers — Sprint 2 PR1
 * Source: etapa2-workers-A-quota-guardian.md
 *
 * Workers:
 * - quota:guardian:check (concurrency=100, timeout=2000ms) — ADR-0056
 * - quota:guardian:increment (persist to PG)
 * - quota:guardian:reset (cron 0 0 * * *)
 */
import { Job } from "bullmq";
import type { Worker } from "bullmq";
import { Redis } from "ioredis";
import { QUEUES, createWorker } from "@cerniq/worker-shared";
import { getQuotaKey, getPhoneStatusKey, DAILY_QUOTA_LIMIT } from "../utils/quota-lua.js";

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

  return {
    allowed: parsed.allowed === true,
    reason: parsed.reason as QuotaCheckReason,
    currentUsage: Number(parsed.current_usage ?? 0),
    remaining: Number(parsed.remaining ?? 0),
    costApplied: Number(parsed.cost_applied ?? 0),
  };
}

export function createQuotaCheckWorker(redis: Redis, luaSha: string): Worker {
  const { worker } = createWorker<QuotaCheckJobData>(
    QUEUES.QUOTA_GUARDIAN_CHECK,
    async (job: Job<QuotaCheckJobData>): Promise<QuotaCheckResult> => {
      return executeQuotaCheck(redis, luaSha, job.data);
    },
    {
      externalConnection: redis,
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
  const { db, sql, setSessionTenantId } = await import("@cerniq/db");
  const { waQuotaUsage } = await import("@cerniq/db");

  const { worker } = createWorker<QuotaIncrementJobData>(
    QUEUES.QUOTA_GUARDIAN_INCREMENT,
    async (job: Job<QuotaIncrementJobData>): Promise<QuotaIncrementResult> => {
      const { phoneId, dateIso, cost, tenantId } = job.data;
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

      return {
        phoneId,
        dateIso,
        newTotal: Number(current ?? 0),
      };
    },
    {
      externalConnection: redis,
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
    async (): Promise<{ keysDeleted: number }> => {
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

      return { keysDeleted };
    },
    {
      externalConnection: redis,
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
