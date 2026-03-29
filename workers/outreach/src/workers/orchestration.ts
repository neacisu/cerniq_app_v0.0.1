/**
 * Outreach Orchestration Workers — Sprint 2 PR3
 * Source: etapa2-workers-B-orchestration.md
 *
 * Workers:
 * - outreach:orchestrator:dispatch (schedule: every 5 min, concurrency=20, batch=100)
 * - outreach:phone:allocator (STICKY ADR-0055)
 * - outreach:channel:selector (channel routing with scoring)
 */
import type { Job, Queue, Worker } from "bullmq";
import type { Redis } from "../utils/bullmq-connection.js";
import type * as CerniqDb from "@cerniq/db";
import {
  QUEUES,
  getWaPhoneQueueName,
  createWorker,
  createQueue,
  withCognitiveSpan,
  outreachDispatched,
} from "@cerniq/worker-shared";
import { getPhoneStatusKey } from "../utils/quota-lua.js";
import { isRedisStatusAllowingStickyWa } from "../utils/wa-sticky-redis-status.js";

type DbClient = typeof CerniqDb.db;
type EqFn = typeof CerniqDb.eq;
type AndFn = typeof CerniqDb.and;

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

export function createDispatchWorker(): Worker {
  const phoneAllocatorQueue = createQueue(QUEUES.OUTREACH_PHONE_ALLOCATOR);

  const { worker } = createWorker(
    QUEUES.OUTREACH_ORCHESTRATOR_DISPATCH,
    async (job: Job<DispatchJobData>): Promise<DispatchResult> => {
      return withCognitiveSpan("e2:outreach:orchestrator-dispatch", async () => {
        const { tenantId, batchSize = 100 } = job.data;
        const startTime = Date.now();

        const { db, setSessionTenantId } = await import("@cerniq/db");
        await setSessionTenantId(tenantId);
        const { leadJourney, goldCompanies } = await import("@cerniq/db");
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

        const goldIds = eligibleLeads.map((l) => l.leadId);
        const dncRows =
          goldIds.length === 0
            ? []
            : await db
                .select({ id: goldCompanies.id })
                .from(goldCompanies)
                .where(
                  and(
                    eq(goldCompanies.tenantId, tenantId),
                    inArray(goldCompanies.id, goldIds),
                    eq(goldCompanies.doNotContact, true),
                  ),
                );
        const doNotContactSet = new Set(dncRows.map((r) => r.id));

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
          if (doNotContactSet.has(lead.leadId)) {
            continue;
          }
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

          outreachDispatched.inc({ channel: "PENDING" });

          result.jobsCreated.push({
            jobId: allocJob.id ?? "",
            leadId: lead.leadId,
            channel: "PENDING",
            queue: QUEUES.OUTREACH_PHONE_ALLOCATOR,
          });
        }

        result.processingTimeMs = Date.now() - startTime;
        return result;
      });
    },
    { concurrency: 20 },
  );
  return worker;
}

async function fetchJourneyCurrentStateForPhoneAllocator(
  db: DbClient,
  leadJourney: typeof CerniqDb.leadJourney,
  eq: EqFn,
  and: AndFn,
  journeyId: string,
  tenantId: string,
): Promise<string> {
  const [journeyStateRow] = await db
    .select({ currentState: leadJourney.currentState })
    .from(leadJourney)
    .where(and(eq(leadJourney.id, journeyId), eq(leadJourney.tenantId, tenantId)))
    .limit(1);
  return journeyStateRow?.currentState ?? "COLD";
}

async function tryReuseStickyWaPhoneAssignment(params: {
  tenantId: string;
  leadId: string;
  journeyId: string;
  journeyCurrentState: string;
  currentAssignedPhoneId: string | undefined;
  redis: Redis;
  channelSelectorQueue: Queue;
  db: DbClient;
  waPhoneNumbers: typeof CerniqDb.waPhoneNumbers;
  eq: EqFn;
  and: AndFn;
}): Promise<PhoneAllocatorResult | null> {
  const {
    tenantId,
    leadId,
    journeyId,
    journeyCurrentState,
    currentAssignedPhoneId,
    redis,
    channelSelectorQueue,
    db,
    waPhoneNumbers,
    eq,
    and,
  } = params;

  if (!currentAssignedPhoneId) {
    return null;
  }

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

  if (existingPhone.length === 0) {
    return null;
  }

  const statusKey = getPhoneStatusKey(currentAssignedPhoneId);
  const status = await redis.get(statusKey);
  if (!isRedisStatusAllowingStickyWa(status)) {
    return null;
  }

  await channelSelectorQueue.add(
    "select",
    {
      tenantId,
      leadId,
      journeyId,
      currentState: journeyCurrentState,
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

async function allocateNewWaPhoneWithMinimumQuota(params: {
  tenantId: string;
  leadId: string;
  journeyId: string;
  journeyCurrentState: string;
  redis: Redis;
  channelSelectorQueue: Queue;
  db: DbClient;
  waPhoneNumbers: typeof CerniqDb.waPhoneNumbers;
  leadJourney: typeof CerniqDb.leadJourney;
  eq: EqFn;
  and: AndFn;
}): Promise<PhoneAllocatorResult> {
  const {
    tenantId,
    leadId,
    journeyId,
    journeyCurrentState,
    redis,
    channelSelectorQueue,
    db,
    waPhoneNumbers,
    leadJourney,
    eq,
    and,
  } = params;

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

  let candidates = activePhones.slice();
  let selectedPhone: (typeof activePhones)[0] | null = null;

  while (candidates.length > 0) {
    let best = candidates[0];
    let minUsage = Infinity;
    for (const phone of candidates) {
      const quotaKey = `quota:wa:${phone.id}:${today}`;
      const usage = Number((await redis.get(quotaKey)) ?? 0);
      if (usage < minUsage) {
        minUsage = usage;
        best = phone;
      }
    }
    const lockKey = `phone:lock:${best.id}`;
    const acquired = await redis.set(lockKey, leadId, "EX", 30, "NX");
    if (acquired === "OK") {
      selectedPhone = best;
      break;
    }
    candidates = candidates.filter((p) => p.id !== best.id);
  }

  if (!selectedPhone) {
    throw new Error(`Could not acquire phone allocation lock for tenant ${tenantId}`);
  }

  await db
    .update(leadJourney)
    .set({
      assignedPhoneId: selectedPhone.id,
      assignedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(leadJourney.id, journeyId));

  await channelSelectorQueue.add(
    "select",
    {
      tenantId,
      leadId,
      journeyId,
      currentState: journeyCurrentState,
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
}

// =============================================================================
// Worker #7: outreach:phone:allocator (STICKY ADR-0055)
// Reuses existing phone assignment when valid + active.
// Selects phone with minimum usage for new contacts.
// =============================================================================

export function createPhoneAllocatorWorker(redis: Redis): Worker {
  const channelSelectorQueue = createQueue(QUEUES.OUTREACH_CHANNEL_SELECTOR);

  const { worker } = createWorker(
    QUEUES.OUTREACH_PHONE_ALLOCATOR,
    async (job: Job<PhoneAllocatorJobData>): Promise<PhoneAllocatorResult> => {
      return withCognitiveSpan("e2:outreach:phone-allocator", async () => {
        const { tenantId, leadId, journeyId, currentAssignedPhoneId } = job.data;

        const { db, setSessionTenantId } = await import("@cerniq/db");
        await setSessionTenantId(tenantId);
        const { waPhoneNumbers, leadJourney } = await import("@cerniq/db");
        const { eq, and } = await import("@cerniq/db");

        const journeyCurrentState = await fetchJourneyCurrentStateForPhoneAllocator(
          db,
          leadJourney,
          eq,
          and,
          journeyId,
          tenantId,
        );

        const sticky = await tryReuseStickyWaPhoneAssignment({
          tenantId,
          leadId,
          journeyId,
          journeyCurrentState,
          currentAssignedPhoneId,
          redis,
          channelSelectorQueue,
          db,
          waPhoneNumbers,
          eq,
          and,
        });
        if (sticky) {
          return sticky;
        }

        return allocateNewWaPhoneWithMinimumQuota({
          tenantId,
          leadId,
          journeyId,
          journeyCurrentState,
          redis,
          channelSelectorQueue,
          db,
          waPhoneNumbers,
          leadJourney,
          eq,
          and,
        });
      });
    },
    { concurrency: 20 },
  );
  return worker;
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

export function createChannelSelectorWorker(): Worker {
  const { worker } = createWorker(
    QUEUES.OUTREACH_CHANNEL_SELECTOR,
    async (job: Job<ChannelSelectorJobData>): Promise<ChannelSelectorResult> => {
      return withCognitiveSpan("e2:outreach:channel-selector", async () => {
        const { tenantId, leadId, currentState, hasPhone, phoneId, journeyId } = job.data;

        const { db, setSessionTenantId } = await import("@cerniq/db");
        await setSessionTenantId(tenantId);
        const { waPhoneNumbers, goldCompanies, leadJourney } = await import("@cerniq/db");
        const { eq, and } = await import("@cerniq/db");

        // ── GDPR / DNC per-channel gate (real-time query, not stale data) ──
        const [dncFlags] = await db
          .select({
            doNotWhatsapp: goldCompanies.doNotWhatsapp,
            doNotEmail: goldCompanies.doNotEmail,
            consentWhatsapp: goldCompanies.consentWhatsapp,
            consentEmailMarketing: goldCompanies.consentEmailMarketing,
            emailOptedOut: leadJourney.emailOptedOut,
            whatsappOptedOut: leadJourney.whatsappOptedOut,
          })
          .from(leadJourney)
          .innerJoin(goldCompanies, eq(leadJourney.leadId, goldCompanies.id))
          .where(and(eq(leadJourney.id, journeyId), eq(leadJourney.tenantId, tenantId)))
          .limit(1);

        const waBlocked =
          dncFlags?.doNotWhatsapp === true ||
          dncFlags?.whatsappOptedOut === true ||
          dncFlags?.consentWhatsapp === false;
        const emailBlocked =
          dncFlags?.doNotEmail === true ||
          dncFlags?.emailOptedOut === true ||
          dncFlags?.consentEmailMarketing === false;

        if (waBlocked && emailBlocked) {
          throw new Error(
            `All channels blocked by DNC/consent for lead ${leadId} (journey ${journeyId}). ` +
              `WA blocked=${waBlocked}, Email blocked=${emailBlocked}`,
          );
        }

        // ── Phone index for WA queue routing ──
        let phoneIndex = 1;
        if (phoneId) {
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

        // ── Route by channel scoring (ADR-0059) with GDPR enforcement ──
        if (hasPhone && phoneId && !waBlocked) {
          return {
            channel: "WHATSAPP",
            targetQueue: getWaPhoneQueueName(Math.min(phoneIndex, 20)),
            score: CHANNEL_SCORES.WHATSAPP,
          };
        }

        if (EMAIL_WARM_STAGES.has(currentState) && !emailBlocked) {
          return {
            channel: "EMAIL_WARM",
            targetQueue: QUEUES.EMAIL_WARM,
            score: CHANNEL_SCORES.EMAIL_WARM,
          };
        }

        if (EMAIL_COLD_STAGES.has(currentState) && !emailBlocked) {
          return {
            channel: "EMAIL_COLD",
            targetQueue: QUEUES.EMAIL_COLD,
            score: CHANNEL_SCORES.EMAIL_COLD,
          };
        }

        // Fallback: WA was preferred but blocked → email cold if allowed by ADR-0059
        if (!emailBlocked && EMAIL_COLD_STAGES.has(currentState)) {
          return {
            channel: "EMAIL_COLD",
            targetQueue: QUEUES.EMAIL_COLD,
            score: CHANNEL_SCORES.EMAIL_COLD,
          };
        }

        throw new Error(
          `No available channel for state=${currentState}, waBlocked=${waBlocked}, emailBlocked=${emailBlocked}`,
        );
      });
    },
    { concurrency: 20 },
  );
  return worker;
}
