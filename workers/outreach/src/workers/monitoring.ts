/**
 * Stats, Monitoring, Alerts & Cleanup Workers — Sprint 3 PR6
 * Source: etapa2-workers-F-L-remaining.md Cat. K, Workers #41-46
 *
 * Workers:
 * - Stats Aggregator       — schedule: every 15 min, aggregate outreach_daily_stats
 * - Daily Report Generator — end of day summary
 * - Alert Worker           — threshold-based alerts
 * - Cleanup Worker         — retain 90 days, delete older
 * - Health Check Aggregator — pipeline health every minute
 */
import type { Job, Worker } from "bullmq";
import { v4 as uuidv4 } from "uuid";
import type { Redis } from "ioredis";
import { QUEUES, createWorker } from "@cerniq/worker-shared";

// =============================================================================
// Constants
// =============================================================================

const STATS_RETENTION_DAYS = 90; // Keep 90 days of stats
const LOW_PHONE_ALERT_THRESHOLD = 10; // Alert if < 10 phones online

// =============================================================================
// Types
// =============================================================================

export interface StatsAggregatorJobData {
  tenantId: string;
  statDate?: string; // ISO date, defaults to today
}

export interface DailyReportJobData {
  tenantId: string;
  reportDate: string;
}

export interface AlertJobData {
  tenantId: string;
  alertType: "QUOTA_HIGH" | "BOUNCE_HIGH" | "PHONE_OFFLINE" | "PHONE_BANNED" | "PIPELINE_DEGRADED";
  payload: Record<string, unknown>;
}

export interface CleanupJobData {
  tenantId?: string; // If omitted, cleans all tenants
  retainDays?: number; // Default 90
}

export interface HealthCheckJobData {
  tenantId?: string;
}

/** Agregări pe zi din `communication_log` (coloana temporală: `created_at` — acoperă și rânduri fără `sent_at`). */
export interface DayCommunicationRollup {
  waOutbound: number;
  waInbound: number;
  emailColdSent: number;
  emailColdReplies: number;
  emailColdBounces: number;
  emailWarmSent: number;
  emailWarmReplies: number;
  newContactsOutbound: number;
}

/**
 * Snapshot curent pe tenant (nu este filtrat pe zi) — folosit pentru `conversions` în daily_stats.
 */
export interface LeadPipelineSnapshot {
  converted: number;
  warmReplyLeads: number;
}

async function loadDayCommunicationRollup(
  tenantId: string,
  statDate: string,
): Promise<DayCommunicationRollup> {
  const { db } = await import("@cerniq/db");
  const { communicationLog } = await import("@cerniq/db");
  const { eq, and, gte, lt, sql } = await import("@cerniq/db");

  const dayStart = new Date(`${statDate}T00:00:00.000Z`);
  const dayNextUtc = new Date(dayStart);
  dayNextUtc.setUTCDate(dayNextUtc.getUTCDate() + 1);

  const [row] = await db
    .select({
      waOutbound: sql<number>`COUNT(*) FILTER (WHERE ${communicationLog.channel} = 'WHATSAPP' AND ${communicationLog.direction} = 'OUTBOUND')::int`,
      waInbound: sql<number>`COUNT(*) FILTER (WHERE ${communicationLog.channel} = 'WHATSAPP' AND ${communicationLog.direction} = 'INBOUND')::int`,
      emailColdSent: sql<number>`COUNT(*) FILTER (WHERE ${communicationLog.channel} = 'EMAIL_COLD' AND ${communicationLog.direction} = 'OUTBOUND')::int`,
      emailColdReplies: sql<number>`COUNT(*) FILTER (WHERE ${communicationLog.channel} = 'EMAIL_COLD' AND ${communicationLog.direction} = 'INBOUND')::int`,
      emailColdBounces: sql<number>`COUNT(*) FILTER (WHERE ${communicationLog.channel} = 'EMAIL_COLD' AND ${communicationLog.status} = 'BOUNCED')::int`,
      emailWarmSent: sql<number>`COUNT(*) FILTER (WHERE ${communicationLog.channel} = 'EMAIL_WARM' AND ${communicationLog.direction} = 'OUTBOUND')::int`,
      emailWarmReplies: sql<number>`COUNT(*) FILTER (WHERE ${communicationLog.channel} = 'EMAIL_WARM' AND ${communicationLog.direction} = 'INBOUND')::int`,
      newContactsOutbound: sql<number>`COUNT(*) FILTER (WHERE ${communicationLog.direction} = 'OUTBOUND' AND ${communicationLog.quotaCost} = 1)::int`,
    })
    .from(communicationLog)
    .where(
      and(
        eq(communicationLog.tenantId, tenantId),
        gte(communicationLog.createdAt, dayStart),
        lt(communicationLog.createdAt, dayNextUtc),
      ),
    );

  return {
    waOutbound: row?.waOutbound ?? 0,
    waInbound: row?.waInbound ?? 0,
    emailColdSent: row?.emailColdSent ?? 0,
    emailColdReplies: row?.emailColdReplies ?? 0,
    emailColdBounces: row?.emailColdBounces ?? 0,
    emailWarmSent: row?.emailWarmSent ?? 0,
    emailWarmReplies: row?.emailWarmReplies ?? 0,
    newContactsOutbound: row?.newContactsOutbound ?? 0,
  };
}

async function loadLeadPipelineSnapshot(tenantId: string): Promise<LeadPipelineSnapshot> {
  const { db } = await import("@cerniq/db");
  const { leadJourney } = await import("@cerniq/db");
  const { eq, sql } = await import("@cerniq/db");

  const [row] = await db
    .select({
      converted: sql<number>`COUNT(*) FILTER (WHERE ${leadJourney.currentState} = 'CONVERTED')::int`,
      warmReplyLeads: sql<number>`COUNT(*) FILTER (WHERE ${leadJourney.currentState} = 'WARM_REPLY')::int`,
    })
    .from(leadJourney)
    .where(eq(leadJourney.tenantId, tenantId));

  return {
    converted: row?.converted ?? 0,
    warmReplyLeads: row?.warmReplyLeads ?? 0,
  };
}

function rollupToDailyStatsColumns(m: DayCommunicationRollup, pipeline: LeadPipelineSnapshot) {
  const messagesSent = m.waOutbound + m.emailColdSent + m.emailWarmSent;
  const messagesReceived = m.waInbound + m.emailColdReplies + m.emailWarmReplies;
  return {
    messagesSent,
    messagesReceived,
    newContacts: m.newContactsOutbound,
    /** Mesaje inbound în interval (canal unic în `replies` până la extindere schemă). */
    replies: messagesReceived,
    conversions: pipeline.converted,
    bounceCount: m.emailColdBounces,
    quotaUsageAvg: 0,
  };
}

// =============================================================================
// Worker: Stats Aggregator (cron */15)
// Writes to outreach.outreach_daily_stats (schema sec. 9 — nu există wa_sent / email_cold_*)
// =============================================================================

export async function executeStatsAggregatorJob(job: Job<StatsAggregatorJobData>): Promise<void> {
  const { tenantId } = job.data;
  const statDate = job.data.statDate ?? new Date().toISOString().split("T")[0];

  const { db, setSessionTenantId } = await import("@cerniq/db");
  await setSessionTenantId(tenantId);
  const { outreachDailyStats } = await import("@cerniq/db");
  const { sql } = await import("@cerniq/db");

  const m = await loadDayCommunicationRollup(tenantId, statDate);
  const pipeline = await loadLeadPipelineSnapshot(tenantId);
  const cols = rollupToDailyStatsColumns(m, pipeline);

  await db
    .insert(outreachDailyStats)
    .values({
      tenantId,
      statDate,
      ...cols,
    })
    .onConflictDoUpdate({
      target: [outreachDailyStats.tenantId, outreachDailyStats.statDate],
      set: {
        messagesSent: sql`EXCLUDED.messages_sent`,
        messagesReceived: sql`EXCLUDED.messages_received`,
        newContacts: sql`EXCLUDED.new_contacts`,
        replies: sql`EXCLUDED.replies`,
        conversions: sql`EXCLUDED.conversions`,
        bounceCount: sql`EXCLUDED.bounce_count`,
        quotaUsageAvg: sql`EXCLUDED.quota_usage_avg`,
        updatedAt: new Date(),
      },
    });
}

/** Un singur procesor pe `MONITOR_QUOTA_USAGE`: stats zilnice vs. reputație telefon (după `phoneId` în payload). */
export function createMergedMonitorQuotaWorker(redis: Redis): Worker {
  const { worker } = createWorker(
    QUEUES.MONITOR_QUOTA_USAGE,
    async (
      job: Job<StatsAggregatorJobData | import("./phone-monitoring.js").PhoneReputationJobData>,
    ): Promise<void | import("./phone-monitoring.js").PhoneReputationResult> => {
      const data = job.data as { phoneId?: string };
      if (data.phoneId) {
        const { executePhoneReputationJob } = await import("./phone-monitoring.js");
        return executePhoneReputationJob(
          redis,
          job as Job<import("./phone-monitoring.js").PhoneReputationJobData>,
        );
      }
      await executeStatsAggregatorJob(job as Job<StatsAggregatorJobData>);
    },
    { concurrency: 10 },
  );
  return worker;
}

// =============================================================================
// Worker: Daily Report Generator
// End-of-day summary per tenant
// =============================================================================

export async function executeDailyReportJob(
  job: Job<DailyReportJobData>,
): Promise<Record<string, unknown>> {
  const { tenantId, reportDate } = job.data;

  const { db, setSessionTenantId } = await import("@cerniq/db");
  await setSessionTenantId(tenantId);
  const { outreachDailyStats } = await import("@cerniq/db");
  const { eq, and } = await import("@cerniq/db");

  const m = await loadDayCommunicationRollup(tenantId, reportDate);
  const pipeline = await loadLeadPipelineSnapshot(tenantId);

  const commTotal =
    m.waOutbound +
    m.waInbound +
    m.emailColdSent +
    m.emailColdReplies +
    m.emailWarmSent +
    m.emailWarmReplies;

  const [s] = await db
    .select()
    .from(outreachDailyStats)
    .where(
      and(eq(outreachDailyStats.tenantId, tenantId), eq(outreachDailyStats.statDate, reportDate)),
    )
    .limit(1);

  if (!s && commTotal === 0) {
    return { date: reportDate, noData: true };
  }

  const waReplyRate = m.waOutbound > 0 ? m.waInbound / m.waOutbound : 0;
  const coldReplyRate = m.emailColdSent > 0 ? m.emailColdReplies / m.emailColdSent : 0;
  const coldBounceRate = m.emailColdSent > 0 ? m.emailColdBounces / m.emailColdSent : 0;

  const totalSentRollup = m.waOutbound + m.emailColdSent + m.emailWarmSent;

  return {
    date: reportDate,
    rollupSource: "communication_log.created_at",
    persistedDailyStatsRow: s ?? null,
    summary: {
      messagesSent: s?.messagesSent ?? totalSentRollup,
      messagesReceived: s?.messagesReceived,
      newContacts: s?.newContacts,
      replies: s?.replies,
      conversions: s?.conversions ?? pipeline.converted,
      warmReplyLeads: pipeline.warmReplyLeads,
      bounceCount: s?.bounceCount ?? m.emailColdBounces,
    },
    whatsapp: { sent: m.waOutbound, replies: m.waInbound, replyRate: waReplyRate },
    emailCold: {
      sent: m.emailColdSent,
      replies: m.emailColdReplies,
      bounces: m.emailColdBounces,
      replyRate: coldReplyRate,
      bounceRate: coldBounceRate,
    },
    emailWarm: { sent: m.emailWarmSent, replies: m.emailWarmReplies },
  };
}

// =============================================================================
// Worker: Alert Worker (threshold-based)
// =============================================================================

export function createAlertWorker(redis: Redis): Worker {
  const { worker } = createWorker(
    QUEUES.ALERT_BOUNCE_HIGH,
    async (job: Job<AlertJobData>): Promise<void> => {
      const { tenantId, alertType, payload } = job.data;

      const { setSessionTenantId } = await import("@cerniq/db");
      await setSessionTenantId(tenantId);

      // Log alert to Redis for dashboard visibility
      const alertKey = `alert:${tenantId}:${alertType}:${Date.now()}`;
      await redis.set(
        alertKey,
        JSON.stringify({ alertType, payload, timestamp: new Date().toISOString() }),
        "EX",
        86400,
      );

      // hitl_audit_log cere review_id; alertele operaționale merg în webhook_event_archive (sursă OPS_MONITORING).
      if (["PHONE_BANNED", "BOUNCE_HIGH"].includes(alertType)) {
        const { db } = await import("@cerniq/db");
        const { webhookEventArchive } = await import("@cerniq/db");

        const eventId = `ops-alert-${alertType}-${uuidv4()}`;
        await db
          .insert(webhookEventArchive)
          .values({
            tenantId,
            eventId,
            source: "OPS_MONITORING",
            eventType: alertType,
            eventTimestamp: new Date(),
            payload: { alertType, ...payload },
          })
          .onConflictDoNothing({
            target: [webhookEventArchive.tenantId, webhookEventArchive.eventId],
          });
      }
    },
    { concurrency: 20 },
  );
  return worker;
}

// =============================================================================
// Worker: Cleanup Worker (retain 90 days)
// Deletes communication_log, daily_stats older than 90 days
// =============================================================================

export async function executeCleanupJob(job: Job<CleanupJobData>): Promise<{ deleted: number }> {
  const retainDays = job.data.retainDays ?? STATS_RETENTION_DAYS;
  const cutoffDate = new Date(Date.now() - retainDays * 86_400_000);

  const { db } = await import("@cerniq/db");
  const { communicationLog } = await import("@cerniq/db");
  const { lt } = await import("@cerniq/db");

  const removed = await db
    .delete(communicationLog)
    .where(lt(communicationLog.createdAt, cutoffDate))
    .returning({ id: communicationLog.id });

  return { deleted: removed.length };
}

// =============================================================================
// Worker: Health Check Aggregator
// Pipeline health: queues active, phones online, jobs waiting/failed
// =============================================================================

export async function executeHealthCheckAggregatorJob(
  _redis: Redis,
  _job: Job<HealthCheckJobData>,
): Promise<Record<string, unknown>> {
  const { db } = await import("@cerniq/db");
  const { waPhoneNumbers } = await import("@cerniq/db");
  const { sql } = await import("@cerniq/db");

  const phoneStats = await db
    .select({
      total: sql<number>`COUNT(*)::int`,
      active: sql<number>`COUNT(*) FILTER (WHERE ${waPhoneNumbers.status} = 'ACTIVE' AND ${waPhoneNumbers.isEnabled} = true)::int`,
      offline: sql<number>`COUNT(*) FILTER (WHERE ${waPhoneNumbers.status} = 'OFFLINE')::int`,
      banned: sql<number>`COUNT(*) FILTER (WHERE ${waPhoneNumbers.status} = 'BANNED')::int`,
    })
    .from(waPhoneNumbers);

  const p = phoneStats[0];
  const phonesActive = p?.active ?? 0;

  if (phonesActive < LOW_PHONE_ALERT_THRESHOLD) {
    console.warn(
      `[health-aggregator] pipeline degraded: active phones ${phonesActive} < threshold ${LOW_PHONE_ALERT_THRESHOLD} (not enqueued — ALERT_PHONE_OFFLINE requires tenant-scoped phone payload)`,
    );
  }

  return {
    timestamp: new Date().toISOString(),
    phones: {
      total: p?.total ?? 0,
      active: phonesActive,
      offline: p?.offline ?? 0,
      banned: p?.banned ?? 0,
    },
    healthy: phonesActive >= LOW_PHONE_ALERT_THRESHOLD,
  };
}
