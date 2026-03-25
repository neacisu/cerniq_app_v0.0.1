/**
 * Email Workers — Sprint 2 PR7 (Cold) + PR8 (Warm)
 * Source: etapa2-workers-D-E-email.md
 * ADR-0059: Channel Segregation — Cold=Instantly, Warm=Resend
 * ADR-0066: Circuit Breaker Bounce 3%
 *
 * Workers:
 * PR7:
 * - q:email:cold         — Email Cold Sender (Instantly addLead, ADR-0059 guard)
 * - email:cold:lead:status — Email Cold Tracking
 * - monitor:email:deliverability — Bounce Rate Monitor 3%
 * PR8:
 * - q:email:warm         — Email Warm Sender (Resend, ADR-0059 guard WARM_REPLY/NEGOTIATION)
 * - email:warm:reply     — Email Warm Reply Processor
 * - email:warm:tracking  — Email Warm Tracking
 */
import { Job, Queue } from "bullmq";
import type { Worker } from "bullmq";
import { v4 as uuidv4 } from "uuid";
import { Redis } from "ioredis";
import { QUEUES, createWorker } from "@cerniq/worker-shared";
import { messageStatusEnum } from "@cerniq/db";
import { asBullmqConnection } from "../utils/bullmq-connection.js";

type CommunicationLogStatus = (typeof messageStatusEnum.enumValues)[number];

// =============================================================================
// ADR-0059 Channel Segregation constants
// =============================================================================

/** States allowed for COLD email (Instantly) */
const COLD_EMAIL_ALLOWED_STATES = ["COLD", "CONTACTED_WA", "CONTACTED_EMAIL"] as const;
/** States allowed for WARM email (Resend) */
const WARM_EMAIL_ALLOWED_STATES = ["WARM_REPLY", "NEGOTIATION"] as const;

/** ADR-0066: Bounce threshold 3% — DO NOT MODIFY */
const BOUNCE_THRESHOLD = 0.03;
/** Rolling window for bounce rate calculation */
const BOUNCE_WINDOW_HOURS = 24;

// =============================================================================
// Types
// =============================================================================

export interface EmailColdSendJobData {
  correlationId: string;
  tenantId: string;
  leadId: string;
  journeyId: string;
  campaignId: string;
  recipientEmail: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  currentState: string;
  sequenceId: string;
  sequenceStep: number;
  sequenceEnrollmentId: string;
  variables?: Record<string, string>;
}

export interface EmailColdTrackingJobData {
  tenantId: string;
  leadId: string;
  journeyId: string;
  externalLeadId?: string;
  /** Events: email_sent, email_opened, reply_received, email_bounced, lead_unsubscribed */
  eventType:
    | "email_sent"
    | "email_opened"
    | "reply_received"
    | "email_bounced"
    | "lead_unsubscribed";
  email: string;
  campaignId: string;
  timestamp: string;
  replyContent?: string;
}

export interface BounceMonitorJobData {
  tenantId: string;
  campaignId: string;
}

export interface EmailWarmSendJobData {
  correlationId: string;
  tenantId: string;
  leadId: string;
  journeyId: string;
  recipientEmail: string;
  fromEmail: string;
  fromName: string;
  subject: string;
  htmlBody: string;
  tags?: { name: string; value: string }[];
  currentState: string;
  sequenceId: string;
  sequenceStep: number;
}

export interface EmailWarmReplyJobData {
  tenantId: string;
  leadId: string;
  journeyId: string;
  emailId: string;
  replyContent: string;
  replyFrom: string;
  timestamp: string;
  eventType: "email.replied" | "email.clicked";
}

// =============================================================================
// Worker: q:email:cold — Email Cold Sender (Instantly)
// ADR-0059: ONLY for COLD/CONTACTED_WA/CONTACTED_EMAIL states
// =============================================================================

export function createEmailColdSenderWorker(redis: Redis): Worker {
  const connection = asBullmqConnection(redis);
  const stateTransitionQueue = new Queue(QUEUES.LEAD_STATE_TRANSITION, { connection });

  return createWorker(
    QUEUES.EMAIL_COLD, // q:email:cold
    async (job: Job<EmailColdSendJobData>): Promise<void> => {
      const {
        tenantId,
        leadId,
        journeyId,
        campaignId,
        recipientEmail,
        firstName,
        lastName,
        companyName,
        currentState,
        sequenceId,
        sequenceStep,
        variables,
      } = job.data;

      // ADR-0059 GUARD: Reject warm leads from cold channel
      if (
        !COLD_EMAIL_ALLOWED_STATES.includes(
          currentState as (typeof COLD_EMAIL_ALLOWED_STATES)[number],
        )
      ) {
        throw new Error(
          `ADR-0059 violation: Lead state ${currentState} is not allowed in cold email channel. Use warm email for WARM_REPLY/NEGOTIATION.`,
        );
      }

      const { getInstantlyClient } = await import("@cerniq/integrations");
      const { db, setSessionTenantId } = await import("@cerniq/db");
      await setSessionTenantId(tenantId);
      const { communicationLog } = await import("@cerniq/db");

      const instantlyClient = getInstantlyClient();

      // addLead — Instantly manages the actual sending
      await instantlyClient.addLead({
        email: recipientEmail,
        first_name: firstName,
        last_name: lastName,
        campaign_id: campaignId,
        variables: {
          company_name: companyName ?? "",
          ...variables,
        },
      });

      // Log to outreach.communication_log
      await db.insert(communicationLog).values({
        id: uuidv4(),
        tenantId,
        leadJourneyId: journeyId,
        channel: "EMAIL_COLD",
        direction: "OUTBOUND",
        status: "SENT",
        statusUpdatedAt: new Date(),
        externalMessageId: `instantly-${campaignId}-${recipientEmail}`,
        content: `Campaign: ${campaignId}`,
        sentAt: new Date(),
        sequenceId,
        sequenceStep,
        quotaCost: 1,
      });

      // Transition state to CONTACTED_EMAIL if still COLD
      if (currentState === "COLD") {
        await stateTransitionQueue.add(
          "transition",
          {
            tenantId,
            leadId,
            journeyId,
            newState: "CONTACTED_EMAIL",
            trigger: "SYSTEM",
            reason: "Cold email sent via Instantly",
          },
          { removeOnComplete: 100 },
        );
      }
    },
    { connection, concurrency: 50 },
  ).worker;
}

// =============================================================================
// Worker: email:cold:lead:status — Email Cold Tracking (Instantly events)
// Events: email_sent, email_opened, reply_received, email_bounced, lead_unsubscribed
// =============================================================================

export function createEmailColdTrackingWorker(redis: Redis): Worker {
  const connection = asBullmqConnection(redis);
  const sentimentQueue = new Queue(QUEUES.AI_SENTIMENT_ANALYZE, { connection });
  const stateTransitionQueue = new Queue(QUEUES.LEAD_STATE_TRANSITION, { connection });
  const sequenceStopQueue = new Queue(QUEUES.SEQUENCE_STOP, { connection });
  const bounceMonitorQueue = new Queue(QUEUES.MONITOR_EMAIL_DELIVERABILITY, { connection });

  return createWorker(
    QUEUES.EMAIL_COLD_LEAD_STATUS,
    async (job: Job<EmailColdTrackingJobData>): Promise<void> => {
      const { tenantId, leadId, journeyId, eventType, campaignId, timestamp, replyContent } =
        job.data;

      const { db, setSessionTenantId } = await import("@cerniq/db");
      await setSessionTenantId(tenantId);
      const { communicationLog } = await import("@cerniq/db");
      const { leadJourney } = await import("@cerniq/db");
      const { eq, and, sql } = await import("@cerniq/db");

      switch (eventType) {
        case "email_sent":
          await db
            .update(communicationLog)
            .set({
              status: "SENT",
              sentAt: new Date(timestamp),
              statusUpdatedAt: new Date(),
            })
            .where(
              and(
                eq(communicationLog.leadJourneyId, journeyId),
                eq(communicationLog.channel, "EMAIL_COLD"),
              ),
            );
          break;

        case "email_opened":
          await db
            .update(communicationLog)
            .set({
              status: "OPENED",
              openedAt: new Date(timestamp),
              statusUpdatedAt: new Date(),
            })
            .where(
              and(
                eq(communicationLog.leadJourneyId, journeyId),
                eq(communicationLog.channel, "EMAIL_COLD"),
              ),
            );
          // Update open count on journey
          await db
            .update(leadJourney)
            .set({ openCount: sql`${leadJourney.openCount} + 1`, updatedAt: new Date() })
            .where(eq(leadJourney.id, journeyId));
          break;

        case "reply_received": {
          // Log inbound reply
          await db.insert(communicationLog).values({
            id: uuidv4(),
            tenantId,
            leadJourneyId: journeyId,
            channel: "EMAIL_COLD",
            direction: "INBOUND",
            status: "REPLIED",
            statusUpdatedAt: new Date(),
            content: replyContent ?? "",
            repliedAt: new Date(timestamp),
            quotaCost: 0,
          });

          // Trigger: lead state transition + sentiment analysis + sequence stop
          await stateTransitionQueue.add(
            "reply-received",
            { tenantId, leadId, journeyId, newState: "WARM_REPLY", trigger: "WEBHOOK_REPLY" },
            { priority: 1, removeOnComplete: 100 },
          );
          await sentimentQueue.add(
            "analyze",
            { tenantId, leadId, journeyId, content: replyContent, channel: "EMAIL_COLD" },
            { priority: 2, removeOnComplete: 100 },
          );
          await sequenceStopQueue.add(
            "stop",
            { journeyId, reason: "LEAD_REPLIED_EMAIL" },
            { removeOnComplete: 100 },
          );
          break;
        }

        case "email_bounced":
          await db
            .update(communicationLog)
            .set({
              status: "BOUNCED",
              bouncedAt: new Date(timestamp),
              bounceReason: "BOUNCED",
              statusUpdatedAt: new Date(),
            })
            .where(
              and(
                eq(communicationLog.leadJourneyId, journeyId),
                eq(communicationLog.channel, "EMAIL_COLD"),
              ),
            );
          // Trigger bounce rate monitor check
          await bounceMonitorQueue.add(
            "check",
            { tenantId, campaignId },
            { removeOnComplete: 100 },
          );
          break;

        case "lead_unsubscribed":
          // State -> DEAD
          await stateTransitionQueue.add(
            "unsubscribed",
            {
              tenantId,
              leadId,
              journeyId,
              newState: "DEAD",
              trigger: "WEBHOOK_REPLY",
              reason: "Email unsubscribe",
            },
            { priority: 1, removeOnComplete: 100 },
          );
          // Mark email opted out
          await db
            .update(leadJourney)
            .set({ emailOptedOut: true, updatedAt: new Date() })
            .where(eq(leadJourney.id, journeyId));
          break;
      }
    },
    { connection, concurrency: 50 },
  ).worker;
}

// =============================================================================
// Worker: monitor:email:deliverability — Bounce Rate Monitor
// ADR-0066: threshold 3%, rolling 24h window
// Triggers: email:cold:campaign:pause + alert:bounce:high
// =============================================================================

export function createBounceRateMonitorWorker(redis: Redis): Worker {
  const connection = asBullmqConnection(redis);
  const campaignPauseQueue = new Queue(QUEUES.EMAIL_COLD_CAMPAIGN_PAUSE, { connection });
  const bounceAlertQueue = new Queue(QUEUES.ALERT_BOUNCE_HIGH, { connection });

  return createWorker(
    QUEUES.MONITOR_EMAIL_DELIVERABILITY,
    async (job: Job<BounceMonitorJobData>): Promise<void> => {
      const { tenantId, campaignId } = job.data;

      const { db, setSessionTenantId } = await import("@cerniq/db");
      await setSessionTenantId(tenantId);
      const { communicationLog } = await import("@cerniq/db");
      const { eq, and, gte, sql } = await import("@cerniq/db");

      const windowStart = new Date(Date.now() - BOUNCE_WINDOW_HOURS * 3_600_000);

      const stats = await db
        .select({
          total: sql<number>`COUNT(*) FILTER (WHERE ${communicationLog.direction} = 'OUTBOUND')::int`,
          bounced: sql<number>`COUNT(*) FILTER (WHERE ${communicationLog.direction} = 'OUTBOUND' AND ${communicationLog.status} = 'BOUNCED')::int`,
        })
        .from(communicationLog)
        .where(
          and(
            eq(communicationLog.tenantId, tenantId),
            eq(communicationLog.channel, "EMAIL_COLD"),
            gte(communicationLog.sentAt, windowStart),
          ),
        );

      const s = stats[0];
      if (!s || s.total === 0) return;

      const bounceRate = s.bounced / s.total;

      // ADR-0066: Pause campaign if bounce rate > 3%
      if (bounceRate > BOUNCE_THRESHOLD) {
        await campaignPauseQueue.add(
          "pause",
          { tenantId, campaignId, bounceRate, bounced: s.bounced, total: s.total },
          { priority: 1 },
        );
        await bounceAlertQueue.add(
          "alert",
          { tenantId, campaignId, bounceRate, threshold: BOUNCE_THRESHOLD },
          { priority: 1 },
        );
      }
    },
    { connection, concurrency: 10 },
  ).worker;
}

// =============================================================================
// Worker: q:email:warm — Email Warm Sender (Resend)
// ADR-0059: ONLY for WARM_REPLY/NEGOTIATION states
// =============================================================================

export function createEmailWarmSenderWorker(redis: Redis): Worker {
  const connection = asBullmqConnection(redis);
  return createWorker(
    QUEUES.EMAIL_WARM, // q:email:warm
    async (job: Job<EmailWarmSendJobData>): Promise<void> => {
      const {
        tenantId,
        leadId,
        journeyId,
        recipientEmail,
        subject,
        htmlBody,
        tags,
        currentState,
        sequenceId,
        sequenceStep,
      } = job.data;

      // ADR-0059 GUARD: WARM email ONLY for WARM_REPLY/NEGOTIATION
      if (
        !WARM_EMAIL_ALLOWED_STATES.includes(
          currentState as (typeof WARM_EMAIL_ALLOWED_STATES)[number],
        )
      ) {
        throw new Error(
          `LEAD_NOT_WARM: ADR-0059 violation. Lead state ${currentState} is not allowed in warm email channel. Only WARM_REPLY/NEGOTIATION.`,
        );
      }

      const { getResendClient } = await import("@cerniq/integrations");
      const { db, setSessionTenantId } = await import("@cerniq/db");
      await setSessionTenantId(tenantId);
      const { communicationLog } = await import("@cerniq/db");

      // Identitatea From este definită în ResendClient (job-ul poate include fromEmail/fromName în viitor).
      const resendClient = getResendClient();
      const result = await resendClient.sendEmail({
        to: recipientEmail,
        subject,
        html: htmlBody,
        tags: [
          { name: "lead_id", value: leadId },
          { name: "tenant_id", value: tenantId },
          ...(tags ?? []),
        ],
      });

      // Log to outreach.communication_log with channel=EMAIL_WARM
      await db.insert(communicationLog).values({
        id: uuidv4(),
        tenantId,
        leadJourneyId: journeyId,
        channel: "EMAIL_WARM",
        direction: "OUTBOUND",
        status: "SENT",
        statusUpdatedAt: new Date(),
        externalMessageId: result.id,
        content: subject,
        subject,
        sentAt: new Date(),
        sequenceId,
        sequenceStep,
        quotaCost: 0,
      });
    },
    { connection, concurrency: 50 },
  ).worker;
}

// =============================================================================
// Worker: email warm reply processor
// Processes webhook:resend:ingest email.replied/clicked events
// =============================================================================

export function createEmailWarmReplyWorker(redis: Redis): Worker {
  const connection = asBullmqConnection(redis);
  const sentimentQueue = new Queue(QUEUES.AI_SENTIMENT_ANALYZE, { connection });
  const stateTransitionQueue = new Queue(QUEUES.LEAD_STATE_TRANSITION, { connection });
  const sequenceStopQueue = new Queue(QUEUES.SEQUENCE_STOP, { connection });

  return createWorker(
    QUEUES.EMAIL_WARM_PROFORMA, // reused for warm reply processing
    async (job: Job<EmailWarmReplyJobData>): Promise<void> => {
      const { tenantId, leadId, journeyId, emailId, replyContent, timestamp } = job.data;

      const { db, setSessionTenantId } = await import("@cerniq/db");
      await setSessionTenantId(tenantId);
      const { communicationLog } = await import("@cerniq/db");

      // Log INBOUND warm reply
      await db.insert(communicationLog).values({
        id: uuidv4(),
        tenantId,
        leadJourneyId: journeyId,
        channel: "EMAIL_WARM",
        direction: "INBOUND",
        status: "REPLIED",
        statusUpdatedAt: new Date(),
        externalMessageId: emailId,
        content: replyContent,
        repliedAt: new Date(timestamp),
        quotaCost: 0,
      });

      // Trigger: state transition + sentiment + sequence stop
      await stateTransitionQueue.add(
        "reply",
        {
          tenantId,
          leadId,
          journeyId,
          newState: "NEGOTIATION",
          trigger: "WEBHOOK_REPLY",
          reason: "Warm email reply",
        },
        { priority: 1, removeOnComplete: 100 },
      );
      await sentimentQueue.add(
        "analyze",
        { tenantId, leadId, journeyId, content: replyContent, channel: "EMAIL_WARM" },
        { priority: 2, removeOnComplete: 100 },
      );
      await sequenceStopQueue.add(
        "stop",
        { journeyId, reason: "WARM_REPLY_RECEIVED" },
        { removeOnComplete: 100 },
      );
    },
    { connection, concurrency: 50 },
  ).worker;
}

// =============================================================================
// Worker: email warm tracking (email.sent, email.delivered, email.bounced, email.opened)
// =============================================================================

export interface EmailWarmTrackingJobData {
  tenantId: string;
  leadId: string;
  journeyId: string;
  emailId: string;
  /** Events: email.sent, email.delivered, email.bounced, email.opened, email.clicked */
  eventType: "email.sent" | "email.delivered" | "email.bounced" | "email.opened" | "email.clicked";
  timestamp: string;
}

export function createEmailWarmTrackingWorker(redis: Redis): Worker {
  const connection = asBullmqConnection(redis);
  return createWorker(
    QUEUES.EMAIL_WARM_DOCUMENT, // reused for warm email tracking
    async (job: Job<EmailWarmTrackingJobData>): Promise<void> => {
      const { tenantId, journeyId, emailId, eventType, timestamp } = job.data;

      const { db, setSessionTenantId } = await import("@cerniq/db");
      await setSessionTenantId(tenantId);
      const { communicationLog } = await import("@cerniq/db");
      const { leadJourney } = await import("@cerniq/db");
      const { eq, and, sql } = await import("@cerniq/db");

      const statusMap: Record<EmailWarmTrackingJobData["eventType"], CommunicationLogStatus> = {
        "email.sent": "SENT",
        "email.delivered": "DELIVERED",
        "email.bounced": "BOUNCED",
        "email.opened": "OPENED",
        "email.clicked": "CLICKED",
      };

      const newStatus = statusMap[eventType];

      await db
        .update(communicationLog)
        .set({
          status: newStatus,
          statusUpdatedAt: new Date(),
          ...(eventType === "email.sent" ? { sentAt: new Date(timestamp) } : {}),
          ...(eventType === "email.delivered" ? { deliveredAt: new Date(timestamp) } : {}),
          ...(eventType === "email.bounced"
            ? { bouncedAt: new Date(timestamp), bounceReason: "BOUNCED" }
            : {}),
          ...(eventType === "email.opened" ? { openedAt: new Date(timestamp) } : {}),
          ...(eventType === "email.clicked" ? { clickedAt: new Date(timestamp) } : {}),
        })
        .where(
          and(
            eq(communicationLog.externalMessageId, emailId),
            eq(communicationLog.tenantId, tenantId),
            eq(communicationLog.channel, "EMAIL_WARM"),
          ),
        );

      // Update journey engagement metrics
      if (eventType === "email.opened") {
        await db
          .update(leadJourney)
          .set({ openCount: sql`${leadJourney.openCount} + 1`, updatedAt: new Date() })
          .where(eq(leadJourney.id, journeyId));
      } else if (eventType === "email.clicked") {
        await db
          .update(leadJourney)
          .set({ clickCount: sql`${leadJourney.clickCount} + 1`, updatedAt: new Date() })
          .where(eq(leadJourney.id, journeyId));
      }
    },
    { connection, concurrency: 50 },
  ).worker;
}
