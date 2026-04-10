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
import type { Job, Worker } from "bullmq";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import { ensureJobDataCorrelationId } from "../lib/ensure-job-data-correlation.js";
import {
  QUEUES,
  createWorker,
  createQueue,
  outreachPhoneStatus,
  phoneBlockRateGauge,
} from "@cerniq/worker-shared";
import type { AccountStatusResponse } from "@cerniq/integrations";
import { getTimelinesAIClient } from "@cerniq/integrations";
import { phoneStatusEnum } from "@cerniq/db";

/** Valori `phone_status_enum` din DB (sursă: `outreach-enums.ts`). */
type WaPhoneRowStatus = (typeof phoneStatusEnum.enumValues)[number];
const svcLog = createServiceLogger("outreach-phone-monitoring", { etapa: "e2" });

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
  correlationId?: string;
  tenantId: string;
  phoneId?: string;
  traceId?: string;
  causationKey?: string;
  sourceEndpoint?: string;
  actorId?: string;
  requestId?: string;
  httpCorrelationId?: string;
}

export interface PhoneHealthCheckResult {
  checked: number;
  alerts: string[];
}

export interface PhoneStatusSyncJobData {
  correlationId?: string;
  tenantId: string;
}

/** Payload strict pentru coada `alert:phone:banned` (notificare / audit). */
export interface PhoneBannedAlertJobData {
  correlationId?: string;
  tenantId: string;
  phoneId: string;
  phoneNumber: string;
  reason: "BANNED";
  bannedAt: string;
}

/** Payload pentru coada `phone:quarantine:trigger` (efect DB + realocare). */
export interface PhoneQuarantineTriggerJobData {
  correlationId?: string;
  tenantId: string;
  phoneId: string;
  reason: "BANNED" | "LOW_REPUTATION" | "MANUAL";
  currentReputationScore?: number;
  /** Pragul care a declanșat quarantine (ex. reputație). */
  reputationThreshold?: number;
}

/** @deprecated Folosiți PhoneQuarantineTriggerJobData */
export type PhoneQuarantineJobData = PhoneQuarantineTriggerJobData;

/** Payload canonic pentru `alert:phone:banned` (health monitor). */
export function isPhoneBannedAlertPayload(data: unknown): data is PhoneBannedAlertJobData {
  if (!data || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  return (
    typeof o.tenantId === "string" &&
    typeof o.phoneId === "string" &&
    typeof o.phoneNumber === "string" &&
    o.reason === "BANNED" &&
    typeof o.bannedAt === "string"
  );
}

/**
 * Job vechi pe `alert:phone:banned` cu formă quarantine (reputație) — redirecționare către PHONE_QUARANTINE.
 */
export function isPhoneQuarantineLegacyOnBannedQueue(
  data: unknown,
): data is PhoneQuarantineTriggerJobData & { score?: number; threshold?: number } {
  if (!data || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  if (typeof o.tenantId !== "string" || typeof o.phoneId !== "string") return false;
  if (o.reason === "BANNED") return false;
  if (typeof o.score === "number" || typeof o.threshold === "number") return true;
  if (
    typeof o.reason === "string" &&
    /reputation|quarantine|score|low\s+reputation/i.test(o.reason)
  ) {
    return true;
  }
  return false;
}

export interface PhoneReputationJobData {
  correlationId?: string;
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

export function createPhoneHealthMonitorWorker(): Worker {
  const alertQueue = createQueue(QUEUES.ALERT_PHONE_OFFLINE);
  const bannedAlertQueue = createQueue(QUEUES.ALERT_PHONE_BANNED);
  const quarantineTriggerQueue = createQueue(QUEUES.PHONE_QUARANTINE);

  const { worker } = createWorker(
    QUEUES.MONITOR_PHONE_HEALTH,
    async (job: Job<PhoneHealthCheckJobData>): Promise<PhoneHealthCheckResult> => {
      const { tenantId } = job.data;

      const { db, setSessionTenantId } = await import("@cerniq/db");
      await setSessionTenantId(tenantId);
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
              const bannedAt = new Date().toISOString();
              const bannedPayload: PhoneBannedAlertJobData = {
                correlationId: job.data.correlationId,
                tenantId,
                phoneId: phone.id,
                phoneNumber: phone.phoneNumber,
                reason: "BANNED",
                bannedAt,
              };
              await bannedAlertQueue.add("banned", ensureJobDataCorrelationId(bannedPayload), {
                priority: 1,
              });
              await quarantineTriggerQueue.add(
                "quarantine",
                ensureJobDataCorrelationId({
                  correlationId: job.data.correlationId,
                  tenantId,
                  phoneId: phone.id,
                  reason: "BANNED",
                } satisfies PhoneQuarantineTriggerJobData),
                { priority: 1 },
              );
              alerts.push(`BANNED:${phone.id}`);
            } else if (newStatus === "OFFLINE" && phone.status === "ACTIVE") {
              const offlineSince = new Date().toISOString();
              await alertQueue.add(
                "offline",
                ensureJobDataCorrelationId({
                  correlationId: job.data.correlationId,
                  tenantId,
                  phoneId: phone.id,
                  phoneNumber: phone.phoneNumber,
                  offlineSince,
                  status: "OFFLINE",
                  message: `WhatsApp phone ${phone.phoneNumber} (${phone.id}) reported OFFLINE; was ACTIVE until ${offlineSince}`,
                }),
                { delay: PHONE_OFFLINE_ALERT_AFTER_MINUTES * 60 * 1000, priority: 2 },
              );
              alerts.push(`OFFLINE:${phone.id}`);
            }
            outreachPhoneStatus.set(
              { phone_id: phone.id, status: newStatus, tenant_id: tenantId },
              newStatus === "ACTIVE" ? 1 : 0,
            );
          }
        } catch (err) {
          const enr = enrichError(err, { tenantId, phoneId: phone.id });
          svcLog.error(
            { err, ...enr, tenantId, phoneId: phone.id },
            "Health check failed for phone",
          );
          alerts.push(`ERROR:${phone.id}`);
        }
      }

      return { checked: phones.length, alerts };
    },
    { concurrency: 5 },
  );
  return worker;
}

// =============================================================================
// Worker: wa:status:sync
// Cron: */10 * * * *
// Syncs TimelinesAI status -> wa_phone_numbers
// Status enum EXACT: ACTIVE, PAUSED, OFFLINE, BANNED, RECONNECTING
// =============================================================================

export function createPhoneStatusSyncWorker(): Worker {
  const { worker } = createWorker(
    QUEUES.WA_STATUS_SYNC,
    async (job: Job<PhoneStatusSyncJobData>): Promise<{ synced: number }> => {
      const { tenantId } = job.data;

      const { db, setSessionTenantId } = await import("@cerniq/db");
      await setSessionTenantId(tenantId);
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
        } catch (err) {
          const enr = enrichError(err, { tenantId, phoneId: phone.id });
          svcLog.error(
            { err, ...enr, tenantId, phoneId: phone.id },
            "Status sync failed for phone",
          );
        }
      }

      return { synced };
    },
    { concurrency: 5 },
  );
  return worker;
}

// =============================================================================
// Worker: Phone Quarantine
// Triggered on BANNED or reputation < 20
// Sets is_enabled=false, redistributes leads
// =============================================================================

export function createPhoneQuarantineWorker(): Worker {
  const allocatorQueue = createQueue(QUEUES.OUTREACH_PHONE_ALLOCATOR);

  const { worker } = createWorker(
    QUEUES.PHONE_QUARANTINE,
    async (job: Job<PhoneQuarantineTriggerJobData>): Promise<void> => {
      const { tenantId, phoneId, reason, currentReputationScore, reputationThreshold } = job.data;

      const quarantineAudit: Record<string, unknown> = { tenantId, phoneId, reason };
      if (currentReputationScore !== undefined) {
        quarantineAudit.currentReputationScore = currentReputationScore;
      }
      if (reputationThreshold !== undefined) {
        quarantineAudit.reputationThreshold = reputationThreshold;
      }
      svcLog.info(
        { ...quarantineAudit, correlationId: job.data.correlationId },
        "Phone quarantine start",
      );

      const { db, setSessionTenantId } = await import("@cerniq/db");
      await setSessionTenantId(tenantId);
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
        .select({ id: leadJourney.id, leadId: leadJourney.leadId })
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
          ensureJobDataCorrelationId({
            correlationId: job.data.correlationId,
            tenantId,
            leadId: lead.leadId,
            journeyId: lead.id,
            currentAssignedPhoneId: undefined,
            forceReassign: true,
          }),
          { priority: 1, removeOnComplete: 100 },
        );
      }
    },
    { concurrency: 5 },
  );
  return worker;
}

// =============================================================================
// Worker: Phone Reputation Calculator
// Score 0-100, factors: delivery_rate, reply_rate, bounce_rate (neg), block_rate (neg)
// Sub 20: trigger quarantine
// Data from outreach.communication_log
// =============================================================================

/** Logica reutilizabilă — un singur worker BullMQ pe `MONITOR_QUOTA_USAGE` (merge cu stats). */
export async function executePhoneReputationJob(
  _redis: unknown,
  job: Job<PhoneReputationJobData>,
): Promise<PhoneReputationResult> {
  const quarantineQueue = createQueue(QUEUES.PHONE_QUARANTINE);

  const { tenantId, phoneId, windowHours = 24 } = job.data;

  const { db, setSessionTenantId } = await import("@cerniq/db");
  await setSessionTenantId(tenantId);
  const { communicationLog } = await import("@cerniq/db");
  const { waPhoneNumbers } = await import("@cerniq/db");
  const { eq, and, gte, sql } = await import("@cerniq/db");

  /** ms/oră — grupuri de 3 cifre (Sonar S7749), echivalent `windowHours * 3_600_000`. */
  const windowStart = new Date(Date.now() - windowHours * 3_600_000);

  const metrics = await db
    .select({
      total: sql<number>`COUNT(*)::int`,
      delivered: sql<number>`COUNT(*) FILTER (WHERE ${communicationLog.status} IN ('DELIVERED','READ'))::int`,
      replied: sql<number>`COUNT(*) FILTER (WHERE ${communicationLog.direction} = 'INBOUND')::int`,
      bounced: sql<number>`COUNT(*) FILTER (WHERE ${communicationLog.status} = 'FAILED')::int`,
      blocked: sql<number>`COUNT(*) FILTER (WHERE ${communicationLog.status} = 'BLOCKED')::int`,
    })
    .from(communicationLog)
    .where(
      and(
        eq(communicationLog.tenantId, tenantId),
        eq(communicationLog.phoneId, phoneId),
        eq(communicationLog.channel, "WHATSAPP"),
        eq(communicationLog.direction, "OUTBOUND"),
        gte(communicationLog.sentAt, windowStart),
      ),
    );

  const m = metrics[0];
  const total = m?.total ?? 0;

  if (total === 0) {
    phoneBlockRateGauge.set({ tenant_id: tenantId, phone_id: phoneId }, 0);
    return {
      phoneId,
      score: 100,
      factors: { deliveryRate: 1, replyRate: 0, bounceRate: 0, blockRate: 0 },
      quarantineTriggered: false,
    };
  }

  const deliveryRate = m.delivered / total;
  const replyRate = m.replied / total;
  const bounceRate = m.bounced / total;
  const blockedCount = m.blocked ?? 0;
  const blockRate = blockedCount / total;

  const rawScore = deliveryRate * 50 + replyRate * 30 - bounceRate * 60 - blockRate * 80;
  const score = Math.min(100, Math.max(0, Math.round(rawScore)));

  phoneBlockRateGauge.set({ tenant_id: tenantId, phone_id: phoneId }, blockRate);

  await db
    .update(waPhoneNumbers)
    .set({
      reputationScore: score,
      updatedAt: new Date(),
    })
    .where(eq(waPhoneNumbers.id, phoneId));

  let quarantineTriggered = false;

  if (score < REPUTATION_QUARANTINE_THRESHOLD) {
    await quarantineQueue.add(
      "quarantine",
      ensureJobDataCorrelationId({
        correlationId: job.data.correlationId,
        tenantId,
        phoneId,
        reason: "LOW_REPUTATION",
        currentReputationScore: score,
        reputationThreshold: REPUTATION_QUARANTINE_THRESHOLD,
      } satisfies PhoneQuarantineTriggerJobData),
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
}
