/**
 * Verificare cotă SMS (read-only) — `sms:quota:check`
 * Folosește aceleași chei Redis ca `sms-send`, fără rezervare.
 */
import type { Job, Worker } from "bullmq";
import type { Redis } from "ioredis";
import { v4 as uuidv4 } from "uuid";
import { createServiceLogger } from "@cerniq/observability";
import { QUEUES, createWorker } from "@cerniq/worker-shared";
import { createOutreachJobLogger } from "../lib/outreach-job-logger.js";
import { logSmsJobFailureAndThrow } from "../lib/sms-job-failure-log.js";
import { getBucharestDateIsoForSms, getSmsQuotaUsage } from "../utils/sms-quota.js";

const svcLog = createServiceLogger("outreach-sms-quota-check", { etapa: "e2" });

export interface SmsQuotaCheckJobData {
  tenantId: string;
  /** Simulare consum viitor (default 1 segment). */
  probeSegments?: number;
  correlationId?: string;
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
      const correlationId = job.data.correlationId?.trim() || uuidv4();

      const jlog = createOutreachJobLogger(job, {
        workerName: "outreach-sms-quota-check",
        queueName: QUEUES.SMS_QUOTA_CHECK,
        tenantId,
        entityType: "sms_quota",
        entityId: tenantId,
        correlationId,
      });
      jlog.info("sms_quota_check", "start", { probeSegments });

      try {
        const dateIso = getBucharestDateIsoForSms();
        const [current, limit] = await Promise.all([
          getSmsQuotaUsage(redis, tenantId, dateIso),
          getSmsDailyLimit(tenantId),
        ]);
        const remaining = Math.max(0, limit - current);
        const allowed = current + probeSegments <= limit;
        const result = { allowed, current, limit, remaining, probeSegments };
        jlog.done("sms_quota_check", "complete", { allowed, remaining });
        svcLog.info({ tenantId, allowed, current, limit, correlationId }, "sms_quota_check_ok");
        return result;
      } catch (err) {
        logSmsJobFailureAndThrow(
          svcLog.error.bind(svcLog),
          jlog,
          err,
          "sms_quota_check_failed",
          "sms_quota_check",
          { tenantId },
        );
      }
    },
    { concurrency: 50 },
  );
  return worker;
}
