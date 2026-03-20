/**
 * Outreach Orchestration Workers — Sprint 2 PR3
 * Source: etapa2-workers-B-orchestration.md
 *
 * Workers:
 * - outreach:orchestrator:dispatch (schedule: every 5 min, concurrency=20, batch=100)
 * - outreach:phone:allocator (STICKY ADR-0055)
 * - outreach:channel:selector (channel routing with scoring)
 */
import { Worker, Job, Queue } from "bullmq";
import { Redis } from "ioredis";
import { QUEUES, getWaPhoneQueueName } from "@cerniq/worker-shared";
import { getPhoneStatusKey } from "../utils/quota-lua.js";
import { asBullmqConnection } from "../utils/bullmq-connection.js";

// =============================================================================
// Types
// =============================================================================

export interface DispatchJobData {
  correlationId: string;
  tenantId: string;
  batchSize: number;
}

export interface DispatchResult {
  totalEligibleLeads: number;
  dispatchedToWhatsApp: number;
  dispatchedToEmail: number;
  skippedQuotaExceeded: number;
  skippedHumanReview: number;
  jobsCreated: Array<{ jobId: string; leadId: string; channel: string; queue: string }>;
  processingTimeMs: number;
}

export interface PhoneAllocatorJobData {
  tenantId: string;
  leadId: string;
  journeyId: string;
  /** Existing assignment (for sticky check) */
  currentAssignedPhoneId?: string;
}

export interface PhoneAllocatorResult {
  phoneId: string;
  phoneNumber: string;
  isNewAssignment: boolean;
}

export interface ChannelSelectorJobData {
  tenantId: string;
  leadId: string;
  journeyId: string;
  currentState: string;
  hasPhone: boolean;
  phoneId?: string;
}

export interface ChannelSelectorResult {
  channel: "WHATSAPP" | "EMAIL_COLD" | "EMAIL_WARM";
  targetQueue: string;
  score: number;
}

// =============================================================================
// Worker #5: outreach:orchestrator:dispatch
// Eligible leads: state IN (COLD, CONTACTED_WA, CONTACTED_EMAIL)
//                 AND next_action_at <= NOW()
//                 AND requires_human_review = false
//                 AND is_human_controlled = false
// =============================================================================

export function createDispatchWorker(redis: Redis): Worker {
  const conn = asBullmqConnection(redis);
  const phoneAllocatorQueue = new Queue(QUEUES.OUTREACH_PHONE_ALLOCATOR, { connection: conn });

  return new Worker(
    QUEUES.OUTREACH_ORCHESTRATOR_DISPATCH,
    async (job: Job<DispatchJobData>): Promise<DispatchResult> => {
      const { tenantId, batchSize = 100 } = job.data;
      const startTime = Date.now();

      const { db } = await import("@cerniq/db");
      const { leadJourney } = await import("@cerniq/db");
      const { and, eq, lte, inArray, isNull, or } = await import("@cerniq/db");

      // Fetch eligible leads — EXACT query from etapa2-workers-B-orchestration.md sec. 2
      const eligibleLeads = await db
        .select()
        .from(leadJourney)
        .where(
          and(
            eq(leadJourney.tenantId, tenantId),
            inArray(leadJourney.currentState, ["COLD", "CONTACTED_WA", "CONTACTED_EMAIL"]),
            or(isNull(leadJourney.nextActionAt), lte(leadJourney.nextActionAt, new Date())),
            eq(leadJourney.requiresHumanReview, false),
            eq(leadJourney.isHumanControlled, false),
          ),
        )
        .limit(batchSize);

      const result: DispatchResult = {
        totalEligibleLeads: eligibleLeads.length,
        dispatchedToWhatsApp: 0,
        dispatchedToEmail: 0,
        skippedQuotaExceeded: 0,
        skippedHumanReview: 0,
        jobsCreated: [],
        processingTimeMs: 0,
      };

      // Dispatch each lead to phone allocator
      for (const lead of eligibleLeads) {
        const allocJob = await phoneAllocatorQueue.add(
          "allocate",
          {
            tenantId,
            leadId: lead.leadId,
            journeyId: lead.id,
            currentAssignedPhoneId: lead.assignedPhoneId ?? undefined,
          } satisfies PhoneAllocatorJobData,
          { removeOnComplete: 100 },
        );

        result.jobsCreated.push({
          jobId: allocJob.id ?? "",
          leadId: lead.leadId,
          channel: "PENDING",
          queue: QUEUES.OUTREACH_PHONE_ALLOCATOR,
        });
      }

      result.processingTimeMs = Date.now() - startTime;
      return result;
    },
    { connection: conn, concurrency: 20 },
  );
}

// =============================================================================
// Worker #7: outreach:phone:allocator (STICKY ADR-0055)
// Reuses existing phone assignment when valid + active.
// Selects phone with minimum usage for new contacts.
// =============================================================================

export function createPhoneAllocatorWorker(redis: Redis): Worker {
  const conn = asBullmqConnection(redis);
  const channelSelectorQueue = new Queue(QUEUES.OUTREACH_CHANNEL_SELECTOR, { connection: conn });

  return new Worker(
    QUEUES.OUTREACH_PHONE_ALLOCATOR,
    async (job: Job<PhoneAllocatorJobData>): Promise<PhoneAllocatorResult> => {
      const { tenantId, leadId, journeyId, currentAssignedPhoneId } = job.data;

      const { db } = await import("@cerniq/db");
      const { waPhoneNumbers, leadJourney } = await import("@cerniq/db");
      const { eq, and } = await import("@cerniq/db");

      // STICKY: Reuse existing assignment if phone is still ACTIVE (ADR-0055)
      if (currentAssignedPhoneId) {
        const existingPhone = await db
          .select()
          .from(waPhoneNumbers)
          .where(
            and(
              eq(waPhoneNumbers.id, currentAssignedPhoneId),
              eq(waPhoneNumbers.status, "ACTIVE"),
              eq(waPhoneNumbers.isEnabled, true),
            ),
          )
          .limit(1);

        if (existingPhone.length > 0) {
          // Verify quota before confirming sticky assignment
          const statusKey = getPhoneStatusKey(currentAssignedPhoneId);
          const status = await redis.get(statusKey);
          if (!status || status === "ACTIVE") {
            // Dispatch to channel selector
            await channelSelectorQueue.add(
              "select",
              {
                tenantId,
                leadId,
                journeyId,
                currentState: "COLD",
                hasPhone: true,
                phoneId: currentAssignedPhoneId,
              } satisfies ChannelSelectorJobData,
              { removeOnComplete: 100 },
            );

            return {
              phoneId: currentAssignedPhoneId,
              phoneNumber: existingPhone[0].phoneNumber,
              isNewAssignment: false,
            };
          }
        }
      }

      // New assignment: select phone with minimum usage today that is ACTIVE
      const today = new Date().toISOString().split("T")[0];
      const activePhones = await db
        .select()
        .from(waPhoneNumbers)
        .where(
          and(
            eq(waPhoneNumbers.tenantId, tenantId),
            eq(waPhoneNumbers.isEnabled, true),
            eq(waPhoneNumbers.status, "ACTIVE"),
          ),
        );

      if (activePhones.length === 0) {
        throw new Error(`No active phones available for tenant ${tenantId}`);
      }

      // Find phone with minimum current quota usage from Redis
      let selectedPhone = activePhones[0];
      let minUsage = Infinity;

      for (const phone of activePhones) {
        const quotaKey = `quota:wa:${phone.id}:${today}`;
        const usage = Number((await redis.get(quotaKey)) ?? 0);
        if (usage < minUsage) {
          minUsage = usage;
          selectedPhone = phone;
        }
      }

      // Update journey with new phone assignment
      await db
        .update(leadJourney)
        .set({
          assignedPhoneId: selectedPhone.id,
          assignedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(leadJourney.id, journeyId));

      // Dispatch to channel selector
      await channelSelectorQueue.add(
        "select",
        {
          tenantId,
          leadId,
          journeyId,
          currentState: "COLD",
          hasPhone: true,
          phoneId: selectedPhone.id,
        } satisfies ChannelSelectorJobData,
        { removeOnComplete: 100 },
      );

      return {
        phoneId: selectedPhone.id,
        phoneNumber: selectedPhone.phoneNumber,
        isNewAssignment: true,
      };
    },
    { connection: conn, concurrency: 20 },
  );
}

// =============================================================================
// Worker #8: outreach:channel:selector
// Channel routing with scoring (ADR-0059 channel segregation):
//   WA = 100, Email Warm = 80, Email Cold = 70
// Cold/Email Cold: ONLY for COLD/CONTACTED_WA/CONTACTED_EMAIL
// Warm Email: ONLY for WARM_REPLY/NEGOTIATION
// =============================================================================

const CHANNEL_SCORES = {
  WHATSAPP: 100,
  EMAIL_WARM: 80,
  EMAIL_COLD: 70,
} as const;

// Allowed stages per channel (ADR-0059)
const EMAIL_COLD_STAGES = new Set(["COLD", "CONTACTED_WA", "CONTACTED_EMAIL"]);
const EMAIL_WARM_STAGES = new Set(["WARM_REPLY", "NEGOTIATION"]);

export function createChannelSelectorWorker(redis: Redis): Worker {
  const conn = asBullmqConnection(redis);
  return new Worker(
    QUEUES.OUTREACH_CHANNEL_SELECTOR,
    async (job: Job<ChannelSelectorJobData>): Promise<ChannelSelectorResult> => {
      const { tenantId, currentState, hasPhone, phoneId } = job.data;

      // Get phone index to determine which queue (1-indexed)
      let phoneIndex = 1;
      if (phoneId) {
        const { db } = await import("@cerniq/db");
        const { waPhoneNumbers } = await import("@cerniq/db");
        const { eq, and } = await import("@cerniq/db");

        const phones = await db
          .select()
          .from(waPhoneNumbers)
          .where(
            and(
              eq(waPhoneNumbers.tenantId, tenantId),
              eq(waPhoneNumbers.status, "ACTIVE"),
              eq(waPhoneNumbers.isEnabled, true),
            ),
          )
          .orderBy(waPhoneNumbers.priority);

        const phoneIdx = phones.findIndex((p) => p.id === phoneId);
        phoneIndex = phoneIdx >= 0 ? phoneIdx + 1 : 1;
      }

      // Route by channel scoring (ADR-0059)
      if (hasPhone && phoneId) {
        return {
          channel: "WHATSAPP",
          targetQueue: getWaPhoneQueueName(Math.min(phoneIndex, 20)),
          score: CHANNEL_SCORES.WHATSAPP,
        };
      }

      if (EMAIL_WARM_STAGES.has(currentState)) {
        return {
          channel: "EMAIL_WARM",
          targetQueue: QUEUES.EMAIL_WARM,
          score: CHANNEL_SCORES.EMAIL_WARM,
        };
      }

      if (EMAIL_COLD_STAGES.has(currentState)) {
        return {
          channel: "EMAIL_COLD",
          targetQueue: QUEUES.EMAIL_COLD,
          score: CHANNEL_SCORES.EMAIL_COLD,
        };
      }

      throw new Error(`No channel available for state ${currentState}`);
    },
    { connection: conn, concurrency: 20 },
  );
}
