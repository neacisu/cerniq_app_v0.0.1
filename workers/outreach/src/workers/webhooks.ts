/**
 * Webhook Processing Pipeline — Sprint 3 PR1
 * Source: etapa2-workers-F-L-remaining.md Cat. G, ADR-0061
 *
 * Workers:
 * - webhook:normalize          — Normalize all webhooks to SystemEvent (ADR-0061)
 * - webhook:timelinesai:ingest — TimelinesAI events, skip from_me
 * - webhook:instantly:ingest   — Instantly events (5 types)
 * - webhook:resend:ingest      — Resend events (5 types)
 * - Event Deduplication        — Redis-based idempotency
 * - Event Archive              — outreach.webhook_event_archive (ADR-0061; not hitl_audit_log)
 */
import { Job, Queue } from "bullmq";
import type { Worker } from "bullmq";
import { v4 as uuidv4 } from "uuid";
import { Redis } from "ioredis";
import { QUEUES, createWorker } from "@cerniq/worker-shared";
import { asBullmqConnection } from "../utils/bullmq-connection.js";
import type { CleanupJobData, HealthCheckJobData } from "./monitoring.js";
import type { PriorityJobData } from "./resilience.js";

// =============================================================================
// SystemEvent — ADR-0061 EXACT format
// {eventId, source, eventType, timestamp, payload, rawEvent}
// =============================================================================

export interface SystemEvent {
  eventId: string;
  source: "TIMELINESAI" | "INSTANTLY" | "RESEND";
  eventType: string;
  timestamp: string;
  payload: Record<string, unknown>;
  rawEvent: unknown;
  leadId?: string;
  tenantId?: string;
  externalMessageId?: string;
  channel?: "WHATSAPP" | "EMAIL_COLD" | "EMAIL_WARM";
}

// Deduplication TTL: 24h in seconds
const DEDUP_TTL_SECONDS = 86400;

// =============================================================================
// Types
// =============================================================================

export interface TimelinesAIWebhookJobData {
  tenantId: string;
  rawEvent: {
    message_id: string;
    chat_id: string;
    from_me: boolean;
    message: string;
    timestamp: string;
    sender_phone?: string;
    event_type?: string;
    status?: "SENT" | "DELIVERED" | "READ" | "FAILED";
  };
}

export interface InstantlyWebhookJobData {
  tenantId: string;
  rawEvent: {
    event_type:
      | "email_sent"
      | "email_opened"
      | "reply_received"
      | "email_bounced"
      | "lead_unsubscribed";
    lead_email: string;
    campaign_id: string;
    timestamp: string;
    reply_content?: string;
    bounce_type?: string;
  };
}

export interface ResendWebhookJobData {
  tenantId: string;
  rawEvent: {
    type: "email.sent" | "email.delivered" | "email.bounced" | "email.opened" | "email.clicked";
    data: {
      email_id: string;
      to: string[];
      tags?: { name: string; value: string }[];
      created_at?: string;
    };
  };
}

// =============================================================================
// Worker: webhook:normalize (ADR-0061)
// Routes normalized SystemEvents to their specific processors
// =============================================================================

export function createWebhookNormalizerWorker(redis: Redis): Worker {
  const connection = asBullmqConnection(redis);
  const timelinesQueue = new Queue(QUEUES.WEBHOOK_TIMELINESAI_INGEST, { connection });
  const instantlyQueue = new Queue(QUEUES.WEBHOOK_INSTANTLY_INGEST, { connection });
  const resendQueue = new Queue(QUEUES.WEBHOOK_RESEND_INGEST, { connection });

  const { worker } = createWorker(
    QUEUES.WEBHOOK_NORMALIZE,
    async (
      job: Job<{ source: string; tenantId: string; rawEvent: unknown }>,
    ): Promise<SystemEvent> => {
      const { source, tenantId, rawEvent } = job.data;

      // Build normalized SystemEvent — ADR-0061
      const event: SystemEvent = {
        eventId: `${source.toLowerCase()}-${uuidv4()}`,
        source: source as SystemEvent["source"],
        eventType: extractEventType(source, rawEvent),
        timestamp: new Date().toISOString(),
        payload: rawEvent as Record<string, unknown>,
        rawEvent,
        tenantId,
        channel: getChannel(source),
      };

      // Route to appropriate processor
      switch (source) {
        case "TIMELINESAI":
          await timelinesQueue.add("ingest", { tenantId, rawEvent }, { removeOnComplete: 100 });
          break;
        case "INSTANTLY":
          await instantlyQueue.add("ingest", { tenantId, rawEvent }, { removeOnComplete: 100 });
          break;
        case "RESEND":
          await resendQueue.add("ingest", { tenantId, rawEvent }, { removeOnComplete: 100 });
          break;
      }

      return event;
    },
    { externalConnection: connection, concurrency: 100 },
  );
  return worker;
}

function extractEventType(source: string, rawEvent: unknown): string {
  const ev = rawEvent as Record<string, unknown>;
  if (source === "TIMELINESAI") return (ev.event_type as string) ?? "message";
  if (source === "INSTANTLY") return (ev.event_type as string) ?? "unknown";
  if (source === "RESEND") return (ev.type as string) ?? "unknown";
  return "unknown";
}

function getChannel(source: string): SystemEvent["channel"] {
  if (source === "TIMELINESAI") return "WHATSAPP";
  if (source === "INSTANTLY") return "EMAIL_COLD";
  if (source === "RESEND") return "EMAIL_WARM";
  return undefined;
}

// =============================================================================
// Worker: webhook:timelinesai:ingest
// CRITICAL: skip from_me=true messages
// Find lead by chat_id -> thread_id
// Trigger: lead:state:transition + ai:sentiment:analyze
// =============================================================================

export function createTimelinesAIEventProcessorWorker(redis: Redis): Worker {
  const connection = asBullmqConnection(redis);
  const stateQueue = new Queue(QUEUES.LEAD_STATE_TRANSITION, { connection });
  const sentimentQueue = new Queue(QUEUES.AI_SENTIMENT_ANALYZE, { connection });
  const deliveryQueue = new Queue(QUEUES.WA_REPLY, { connection });

  const { worker } = createWorker(
    QUEUES.WEBHOOK_TIMELINESAI_INGEST,
    async (job: Job<TimelinesAIWebhookJobData>): Promise<void> => {
      const { tenantId, rawEvent } = job.data;

      // CRITICAL: Skip messages sent BY us (from_me=true)
      if (rawEvent.from_me === true) {
        return;
      }

      // Delivery status events (not replies)
      if (rawEvent.status && !rawEvent.message) {
        await deliveryQueue.add(
          "delivery-update",
          {
            tenantId,
            externalMessageId: rawEvent.message_id,
            chatId: rawEvent.chat_id,
            status: rawEvent.status,
            timestamp: rawEvent.timestamp,
          },
          { removeOnComplete: 100 },
        );
        return;
      }

      // Inbound reply — find lead by chat_id (thread_id)
      const { db, setSessionTenantId } = await import("@cerniq/db");
      await setSessionTenantId(tenantId);
      const { communicationLog } = await import("@cerniq/db");
      const { leadJourney } = await import("@cerniq/db");
      const { eq, and } = await import("@cerniq/db");

      // Look up journey via thread_id = chat_id
      const logs = await db
        .select({ leadJourneyId: communicationLog.leadJourneyId })
        .from(communicationLog)
        .where(
          and(
            eq(communicationLog.tenantId, tenantId),
            eq(communicationLog.threadId, rawEvent.chat_id),
            eq(communicationLog.channel, "WHATSAPP"),
          ),
        )
        .limit(1);

      if (logs.length === 0) {
        return; // Cannot identify lead — ignore
      }

      const journeyId = logs[0].leadJourneyId;
      const journeys = await db
        .select({ leadId: leadJourney.leadId })
        .from(leadJourney)
        .where(eq(leadJourney.id, journeyId))
        .limit(1);

      const leadId = journeys[0]?.leadId;

      // Log inbound message
      await db.insert(communicationLog).values({
        id: uuidv4(),
        tenantId,
        leadJourneyId: journeyId,
        channel: "WHATSAPP",
        direction: "INBOUND",
        status: "REPLIED",
        statusUpdatedAt: new Date(),
        externalMessageId: rawEvent.message_id,
        threadId: rawEvent.chat_id,
        content: rawEvent.message,
        repliedAt: new Date(rawEvent.timestamp),
        quotaCost: 0,
      });

      const { outreachNotifications } = await import("@cerniq/db");
      await db.insert(outreachNotifications).values({
        tenantId,
        type: "REPLY_WHATSAPP",
        title: "Răspuns nou pe WhatsApp",
        body: String(rawEvent.message ?? "").slice(0, 500),
        resourceType: "lead_journey",
        resourceId: journeyId,
        isRead: false,
      });

      // Trigger state transition to WARM_REPLY
      await stateQueue.add(
        "reply",
        { tenantId, leadId, journeyId, newState: "WARM_REPLY", trigger: "WEBHOOK_REPLY" },
        { priority: 1, removeOnComplete: 100 },
      );

      // Trigger AI sentiment analysis
      await sentimentQueue.add(
        "analyze",
        { tenantId, leadId, journeyId, content: rawEvent.message, channel: "WHATSAPP" },
        { priority: 2, removeOnComplete: 100 },
      );
    },
    { externalConnection: connection, concurrency: 100 },
  );
  return worker;
}

// =============================================================================
// Worker: webhook:instantly:ingest
// Events: email_sent, email_opened, reply_received, email_bounced, lead_unsubscribed
// =============================================================================

export function createInstantlyEventProcessorWorker(redis: Redis): Worker {
  const connection = asBullmqConnection(redis);
  const trackingQueue = new Queue(QUEUES.EMAIL_COLD_LEAD_STATUS, { connection });

  const { worker } = createWorker(
    QUEUES.WEBHOOK_INSTANTLY_INGEST,
    async (job: Job<InstantlyWebhookJobData>): Promise<void> => {
      const { tenantId, rawEvent } = job.data;
      const { db, setSessionTenantId } = await import("@cerniq/db");
      await setSessionTenantId(tenantId);
      const { communicationLog } = await import("@cerniq/db");
      const { leadJourney } = await import("@cerniq/db");
      const { eq, and } = await import("@cerniq/db");

      // Find lead by recipient email
      const logs = await db
        .select({ leadJourneyId: communicationLog.leadJourneyId })
        .from(communicationLog)
        .where(
          and(eq(communicationLog.tenantId, tenantId), eq(communicationLog.channel, "EMAIL_COLD")),
        )
        .limit(1);

      const journeyId = logs[0]?.leadJourneyId;
      const leadId = journeyId
        ? (
            await db
              .select({ leadId: leadJourney.leadId })
              .from(leadJourney)
              .where(eq(leadJourney.id, journeyId))
              .limit(1)
          )[0]?.leadId
        : undefined;

      // Route to email cold tracking worker
      await trackingQueue.add(
        rawEvent.event_type,
        {
          tenantId,
          leadId,
          journeyId,
          eventType: rawEvent.event_type,
          email: rawEvent.lead_email,
          campaignId: rawEvent.campaign_id,
          timestamp: rawEvent.timestamp,
          replyContent: rawEvent.reply_content,
        },
        { priority: rawEvent.event_type === "reply_received" ? 1 : 3, removeOnComplete: 100 },
      );
    },
    { externalConnection: connection, concurrency: 100 },
  );
  return worker;
}

// =============================================================================
// Worker: webhook:resend:ingest
// Events: email.sent, email.delivered, email.bounced, email.opened, email.clicked
// Lookup by tags lead_id,tenant_id
// =============================================================================

export function createResendEventProcessorWorker(redis: Redis): Worker {
  const connection = asBullmqConnection(redis);
  const warmTrackingQueue = new Queue(QUEUES.EMAIL_WARM_DOCUMENT, { connection });
  const warmReplyQueue = new Queue(QUEUES.EMAIL_WARM_PROFORMA, { connection });

  const { worker } = createWorker(
    QUEUES.WEBHOOK_RESEND_INGEST,
    async (job: Job<ResendWebhookJobData>): Promise<void> => {
      const { tenantId, rawEvent } = job.data;
      const { type, data } = rawEvent;

      // Lookup lead_id and tenant_id from tags
      const leadIdTag = data.tags?.find((t) => t.name === "lead_id");
      const leadId = leadIdTag?.value;

      const { db, setSessionTenantId } = await import("@cerniq/db");
      await setSessionTenantId(tenantId);
      const { leadJourney } = await import("@cerniq/db");
      const { eq, and } = await import("@cerniq/db");

      const journeys = leadId
        ? await db
            .select({ id: leadJourney.id })
            .from(leadJourney)
            .where(and(eq(leadJourney.leadId, leadId), eq(leadJourney.tenantId, tenantId)))
            .limit(1)
        : [];

      const journeyId = journeys[0]?.id;

      if (type === "email.clicked") {
        // Treat as potential warm reply indicator
        await warmReplyQueue.add(
          "clicked",
          {
            tenantId,
            leadId,
            journeyId,
            emailId: data.email_id,
            replyContent: "",
            replyFrom: data.to[0] ?? "",
            timestamp: data.created_at ?? new Date().toISOString(),
            eventType: "email.clicked",
          },
          { removeOnComplete: 100 },
        );
      }

      // Always track delivery events
      await warmTrackingQueue.add(
        type,
        {
          tenantId,
          leadId,
          journeyId,
          emailId: data.email_id,
          eventType: type,
          timestamp: data.created_at ?? new Date().toISOString(),
        },
        { removeOnComplete: 100 },
      );
    },
    { externalConnection: connection, concurrency: 100 },
  );
  return worker;
}

// =============================================================================
// Worker: Event Deduplication (Redis-based idempotency)
// =============================================================================

export interface EventDeduplicateJobData {
  eventId: string;
  source: string;
  tenantId: string;
}

export async function executeEventDedupJob(
  redis: Redis,
  job: Job<EventDeduplicateJobData>,
): Promise<{ isDuplicate: boolean }> {
  const { eventId, source, tenantId } = job.data;
  const dedupKey = `dedup:${tenantId}:${source}:${eventId}`;
  const result = await redis.set(dedupKey, "1", "EX", DEDUP_TTL_SECONDS, "NX");
  const isDuplicate = result === null;
  return { isDuplicate };
}

// =============================================================================
// Worker: Event Archive (persist to audit table for compliance)
// =============================================================================

export interface EventArchiveJobData {
  tenantId: string;
  event: SystemEvent;
}

export async function executeEventArchiveJob(job: Job<EventArchiveJobData>): Promise<void> {
  const { tenantId, event } = job.data;
  const { db, setSessionTenantId } = await import("@cerniq/db");
  await setSessionTenantId(tenantId);
  const { webhookEventArchive } = await import("@cerniq/db");

  const eventTimestamp = Number.isNaN(Date.parse(event.timestamp))
    ? new Date()
    : new Date(event.timestamp);

  await db
    .insert(webhookEventArchive)
    .values({
      tenantId,
      eventId: event.eventId,
      source: event.source,
      eventType: event.eventType,
      eventTimestamp,
      payload: event.payload,
      rawEvent: event.rawEvent as Record<string, unknown>,
    })
    .onConflictDoNothing({
      target: [webhookEventArchive.tenantId, webhookEventArchive.eventId],
    });
}

// ---------------------------------------------------------------------------
// Merged workers — o singură instanță BullMQ per coadă (evită procesare dublă)
// ---------------------------------------------------------------------------

/** Dedup + cleanup pe `PIPELINE_OUTREACH_HEALTH`. */
export function createMergedPipelineHealthWorker(redis: Redis): Worker {
  const connection = asBullmqConnection(redis);
  const { worker } = createWorker(
    QUEUES.PIPELINE_OUTREACH_HEALTH,
    async (job: Job<EventDeduplicateJobData | CleanupJobData>) => {
      const d = job.data as { eventId?: string };
      if (d.eventId) {
        return executeEventDedupJob(redis, job as Job<EventDeduplicateJobData>);
      }
      const { executeCleanupJob } = await import("./monitoring.js");
      return executeCleanupJob(job as Job<CleanupJobData>);
    },
    { externalConnection: connection, concurrency: 50 },
  );
  return worker;
}

/** Priority router + archive + health pe `PIPELINE_OUTREACH_METRICS`. */
export function createMergedPipelineMetricsWorker(redis: Redis): Worker {
  const connection = asBullmqConnection(redis);
  const { worker } = createWorker(
    QUEUES.PIPELINE_OUTREACH_METRICS,
    async (
      job: Job<PriorityJobData | EventArchiveJobData | HealthCheckJobData>,
    ): Promise<void | Record<string, unknown>> => {
      const raw = job.data as Record<string, unknown>;
      if (typeof raw.targetQueue === "string") {
        const { executePriorityRouteJob } = await import("./resilience.js");
        return executePriorityRouteJob(redis, job as Job<PriorityJobData>);
      }
      if (raw.event && typeof raw.event === "object") {
        return executeEventArchiveJob(job as Job<EventArchiveJobData>);
      }
      const { executeHealthCheckAggregatorJob } = await import("./monitoring.js");
      return executeHealthCheckAggregatorJob(redis, job as Job<HealthCheckJobData>);
    },
    { externalConnection: connection, concurrency: 10 },
  );
  return worker;
}
