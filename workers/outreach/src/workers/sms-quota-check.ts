/**
 * Verificare cotă SMS (read-only) — `sms:quota:check`
 * Folosește aceleași chei Redis ca `sms-send`, fără rezervare.
 */
import type { Job, Worker } from "bullmq";
import type { Redis } from "ioredis";
import { QUEUES, createWorker } from "@cerniq/worker-shared";
import { getBucharestDateIsoForSms, getSmsQuotaUsage } from "../utils/sms-quota.js";

export interface SmsQuotaCheckJobData {
  tenantId: string;
  /** Simulare consum viitor (default 1 segment). */
  probeSegments?: number;
}

export interface SmsQuotaCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  probeSegments: number;
}

async function getSmsDailyLimit(tenantId: string): Promise<number> {
  const env = Number(process.env.SMS_DAILY_LIMIT_PER_TENANT ?? "");
  if (Number.isFinite(env) && env > 0) {
    return env;
  }
  const { db, setSessionTenantId } = await import("@cerniq/db");
  const { outreachSettings } = await import("@cerniq/db");
  const { eq } = await import("@cerniq/db");
  await setSessionTenantId(tenantId);
  const [row] = await db
    .select({ dailyQuotaLimit: outreachSettings.dailyQuotaLimit })
    .from(outreachSettings)
    .where(eq(outreachSettings.tenantId, tenantId))
    .limit(1);
  return row?.dailyQuotaLimit ?? 200;
}

export function createSmsQuotaCheckWorker(redis: Redis): Worker {
  const { worker } = createWorker(
    QUEUES.SMS_QUOTA_CHECK,
    async (job: Job<SmsQuotaCheckJobData>): Promise<SmsQuotaCheckResult> => {
      const { tenantId, probeSegments = 1 } = job.data;
      const dateIso = getBucharestDateIsoForSms();
      const [current, limit] = await Promise.all([
        getSmsQuotaUsage(redis, tenantId, dateIso),
        getSmsDailyLimit(tenantId),
      ]);
      const remaining = Math.max(0, limit - current);
      const allowed = current + probeSegments <= limit;
      return { allowed, current, limit, remaining, probeSegments };
    },
    { concurrency: 50 },
  );
  return worker;
}
