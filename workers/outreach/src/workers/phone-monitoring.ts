/**
 * Phone Monitoring Workers — Sprint 2 PR6
 * Source: etapa2-workers-C-whatsapp.md sec 7, ADR-0067
 *
 * Workers:
 * - monitor:phone:health   — schedule: every 10 min, ADR-0067 health check
 * - wa:status:sync         — sync TimelinesAI status -> PG
 * - Phone Quarantine       — triggered on BANNED or reputation < 20
 * - Phone Reputation       — score 0-100, factors: delivery+reply-bounce-block
 */
import { Worker, Job, Queue } from "bullmq";
import { Redis } from "ioredis";
import { QUEUES } from "@cerniq/worker-shared";
import type { AccountStatusResponse } from "@cerniq/integrations";
import { getTimelinesAIClient } from "@cerniq/integrations";
import { phoneStatusEnum } from "@cerniq/db";
import { asBullmqConnection } from "../utils/bullmq-connection.js";

/** Valori `phone_status_enum` din DB (sursă: `outreach-enums.ts`). */
type WaPhoneRowStatus = (typeof phoneStatusEnum.enumValues)[number];

/**
 * TimelinesAI raportează `DISCONNECTED`; în Postgres folosim `OFFLINE` (ADR / schema outreach).
 */
function mapTimelinesAccountStatusToDb(api: AccountStatusResponse["status"]): WaPhoneRowStatus {
  switch (api) {
    case "ACTIVE":
      return "ACTIVE";
    case "BANNED":
      return "BANNED";
    case "RECONNECTING":
      return "RECONNECTING";
    case "DISCONNECTED":
      return "OFFLINE";
    default: {
      const _exhaustive: never = api;
      throw new Error(`Unknown TimelinesAI account status: ${String(_exhaustive)}`);
    }
  }
}

// =============================================================================
// Constants
// =============================================================================

const REPUTATION_QUARANTINE_THRESHOLD = 20; // Sub 20 -> quarantine
const PHONE_OFFLINE_ALERT_AFTER_MINUTES = 30; // Alert after 30 min offline

// =============================================================================
// Types
// =============================================================================

export interface PhoneHealthCheckJobData {
  tenantId: string;
}

export interface PhoneHealthCheckResult {
  checked: number;
  alerts: string[];
}

export interface PhoneStatusSyncJobData {
  tenantId: string;
}

export interface PhoneQuarantineJobData {
  tenantId: string;
  phoneId: string;
  reason: "BANNED" | "LOW_REPUTATION" | "MANUAL";
  currentReputationScore?: number;
}

export interface PhoneReputationJobData {
  tenantId: string;
  phoneId: string;
  /** Look-back window in hours for metric calculation */
  windowHours?: number;
}

export interface PhoneReputationResult {
  phoneId: string;
  score: number;
  factors: {
    deliveryRate: number;
    replyRate: number;
    bounceRate: number;
    blockRate: number;
  };
  quarantineTriggered: boolean;
}

// =============================================================================
// Worker: monitor:phone:health (ADR-0067)
// Cron: */10 * * * *
// Concurrency: 5
// Pings TimelinesAI for each enabled phone; alerts if offline
// =============================================================================

export function createPhoneHealthMonitorWorker(redis: Redis): Worker {
  const connection = asBullmqConnection(redis);
  const alertQueue = new Queue(QUEUES.ALERT_PHONE_OFFLINE, { connection });
  const bannedAlertQueue = new Queue(QUEUES.ALERT_PHONE_BANNED, { connection });

  return new Worker(
    QUEUES.MONITOR_PHONE_HEALTH,
    async (job: Job<PhoneHealthCheckJobData>): Promise<PhoneHealthCheckResult> => {
      const { tenantId } = job.data;

      const { db } = await import("@cerniq/db");
      const { waPhoneNumbers } = await import("@cerniq/db");
      const { eq, and } = await import("@cerniq/db");

      const timelinesClient = getTimelinesAIClient();

      const phones = await db
        .select()
        .from(waPhoneNumbers)
        .where(and(eq(waPhoneNumbers.tenantId, tenantId), eq(waPhoneNumbers.isEnabled, true)));

      const alerts: string[] = [];

      for (const phone of phones) {
        try {
          const accountStatus = await timelinesClient.getAccountStatus(phone.timelinesaiAccountId);

          const newStatus = mapTimelinesAccountStatusToDb(accountStatus.status);

          if (newStatus === phone.status) {
            // Status neschimbat: doar heartbeat (Sonar S7735: condiție pozitivă pe ramura „no-op” logic).
            await db
              .update(waPhoneNumbers)
              .set({ lastHealthCheckAt: new Date(), updatedAt: new Date() })
              .where(eq(waPhoneNumbers.id, phone.id));
          } else {
            await db
              .update(waPhoneNumbers)
              .set({
                status: newStatus,
                lastStatusChange: new Date(),
                isConnected: newStatus === "ACTIVE",
                lastHealthCheckAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(waPhoneNumbers.id, phone.id));

            if (newStatus === "BANNED") {
              await bannedAlertQueue.add(
                "banned",
                { tenantId, phoneId: phone.id, phoneNumber: phone.phoneNumber },
                { priority: 1 },
              );
              alerts.push(`BANNED:${phone.id}`);
            } else if (newStatus === "OFFLINE" && phone.status === "ACTIVE") {
              await alertQueue.add(
                "offline",
                { tenantId, phoneId: phone.id, offlineSince: new Date().toISOString() },
                { delay: PHONE_OFFLINE_ALERT_AFTER_MINUTES * 60 * 1000, priority: 2 },
              );
              alerts.push(`OFFLINE:${phone.id}`);
            }
          }
        } catch {
          alerts.push(`ERROR:${phone.id}`);
        }
      }

      return { checked: phones.length, alerts };
    },
    { connection, concurrency: 5 },
  );
}

// =============================================================================
// Worker: wa:status:sync
// Cron: */10 * * * *
// Syncs TimelinesAI status -> wa_phone_numbers
// Status enum EXACT: ACTIVE, PAUSED, OFFLINE, BANNED, RECONNECTING
// =============================================================================

export function createPhoneStatusSyncWorker(redis: Redis): Worker {
  const connection = asBullmqConnection(redis);
  return new Worker(
    QUEUES.WA_STATUS_SYNC,
    async (job: Job<PhoneStatusSyncJobData>): Promise<{ synced: number }> => {
      const { tenantId } = job.data;

      const { db } = await import("@cerniq/db");
      const { waPhoneNumbers } = await import("@cerniq/db");
      const { eq } = await import("@cerniq/db");

      const timelinesClient = getTimelinesAIClient();

      const phones = await db
        .select()
        .from(waPhoneNumbers)
        .where(eq(waPhoneNumbers.tenantId, tenantId));

      let synced = 0;

      for (const phone of phones) {
        try {
          const accountStatus = await timelinesClient.getAccountStatus(phone.timelinesaiAccountId);
          const newStatus = mapTimelinesAccountStatusToDb(accountStatus.status);

          if (phone.status !== newStatus) {
            await db
              .update(waPhoneNumbers)
              .set({
                status: newStatus,
                lastStatusChange: new Date(),
                isConnected: newStatus === "ACTIVE",
                lastHealthCheckAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(waPhoneNumbers.id, phone.id));
          }
          synced++;
        } catch {
          // Log but continue with other phones
        }
      }

      return { synced };
    },
    { connection, concurrency: 5 },
  );
}

// =============================================================================
// Worker: Phone Quarantine
// Triggered on BANNED or reputation < 20
// Sets is_enabled=false, redistributes leads
// =============================================================================

export function createPhoneQuarantineWorker(redis: Redis): Worker {
  const connection = asBullmqConnection(redis);
  const allocatorQueue = new Queue(QUEUES.OUTREACH_PHONE_ALLOCATOR, { connection });

  return new Worker(
    QUEUES.ALERT_PHONE_BANNED, // reuses alert queue as trigger mechanism
    async (job: Job<PhoneQuarantineJobData>): Promise<void> => {
      const { tenantId, phoneId, reason } = job.data;

      const { db } = await import("@cerniq/db");
      const { waPhoneNumbers } = await import("@cerniq/db");
      const { leadJourney } = await import("@cerniq/db");
      const { eq, and, sql } = await import("@cerniq/db");

      // 1. Quarantine: disable phone
      await db
        .update(waPhoneNumbers)
        .set({
          status: "PAUSED",
          isEnabled: false,
          updatedAt: new Date(),
        })
        .where(eq(waPhoneNumbers.id, phoneId));

      // 2. Find leads assigned to this quarantined phone
      const affectedLeads = await db
        .select({ id: leadJourney.id })
        .from(leadJourney)
        .where(
          and(
            eq(leadJourney.tenantId, tenantId),
            eq(leadJourney.assignedPhoneId, phoneId),
            sql`${leadJourney.currentState} NOT IN ('CONVERTED', 'DEAD')`,
          ),
        );

      // 3. Trigger re-allocation for each affected lead
      for (const lead of affectedLeads) {
        await allocatorQueue.add(
          "reassign",
          {
            tenantId,
            journeyId: lead.id,
            reason: `PHONE_QUARANTINED_${reason}`,
            forceReassign: true,
          },
          { priority: 1, removeOnComplete: 100 },
        );
      }
    },
    { connection, concurrency: 5 },
  );
}

// =============================================================================
// Worker: Phone Reputation Calculator
// Score 0-100, factors: delivery_rate, reply_rate, bounce_rate (neg), block_rate (neg)
// Sub 20: trigger quarantine
// Data from outreach.communication_log
// =============================================================================

export function createPhoneReputationWorker(redis: Redis): Worker {
  const connection = asBullmqConnection(redis);
  const quarantineQueue = new Queue(QUEUES.ALERT_PHONE_BANNED, { connection });

  return new Worker(
    QUEUES.MONITOR_QUOTA_USAGE, // monitors phone metrics alongside quota
    async (job: Job<PhoneReputationJobData>): Promise<PhoneReputationResult> => {
      const { tenantId, phoneId, windowHours = 24 } = job.data;

      const { db } = await import("@cerniq/db");
      const { communicationLog } = await import("@cerniq/db");
      const { waPhoneNumbers } = await import("@cerniq/db");
      const { eq, and, gte, sql } = await import("@cerniq/db");

      /** ms/oră — grupuri de 3 cifre (Sonar S7749), echivalent `windowHours * 3_600_000`. */
      const windowStart = new Date(Date.now() - windowHours * 3_600_000);

      // Count message metrics from communication_log
      const metrics = await db
        .select({
          total: sql<number>`COUNT(*)::int`,
          delivered: sql<number>`COUNT(*) FILTER (WHERE ${communicationLog.status} IN ('DELIVERED','READ'))::int`,
          replied: sql<number>`COUNT(*) FILTER (WHERE ${communicationLog.direction} = 'INBOUND')::int`,
          bounced: sql<number>`COUNT(*) FILTER (WHERE ${communicationLog.status} = 'FAILED')::int`,
        })
        .from(communicationLog)
        .where(
          and(
            eq(communicationLog.tenantId, tenantId),
            eq(communicationLog.phoneId, phoneId),
            eq(communicationLog.direction, "OUTBOUND"),
            gte(communicationLog.sentAt, windowStart),
          ),
        );

      const m = metrics[0];
      const total = m?.total ?? 0;

      if (total === 0) {
        return {
          phoneId,
          score: 100, // Default score when no data
          factors: { deliveryRate: 1, replyRate: 0, bounceRate: 0, blockRate: 0 },
          quarantineTriggered: false,
        };
      }

      const deliveryRate = m.delivered / total; // 0-1
      const replyRate = m.replied / total; // 0-1 (positive)
      const bounceRate = m.bounced / total; // 0-1 (negative)
      // blockRate: not directly tracked — use 0 when unavailable
      const blockRate = 0;

      // Reputation formula from spec (normalized to 0-100)
      // Positive factors: delivery_rate * 50 + reply_rate * 30
      // Negative factors: bounce_rate * 60 + block_rate * 80
      const rawScore = deliveryRate * 50 + replyRate * 30 - bounceRate * 60 - blockRate * 80;

      const score = Math.min(100, Math.max(0, Math.round(rawScore)));

      // Update reputation score in wa_phone_numbers
      await db
        .update(waPhoneNumbers)
        .set({
          reputationScore: score,
          updatedAt: new Date(),
        })
        .where(eq(waPhoneNumbers.id, phoneId));

      let quarantineTriggered = false;

      // Sub 20: trigger quarantine
      if (score < REPUTATION_QUARANTINE_THRESHOLD) {
        await quarantineQueue.add(
          "quarantine",
          {
            tenantId,
            phoneId,
            reason: "LOW_REPUTATION",
            currentReputationScore: score,
          },
          { priority: 1 },
        );
        quarantineTriggered = true;
      }

      return {
        phoneId,
        score,
        factors: { deliveryRate, replyRate, bounceRate, blockRate },
        quarantineTriggered,
      };
    },
    { connection, concurrency: 10 },
  );
}
