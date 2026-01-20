# CERNIQ.APP — ETAPA 2: WORKERS CATEGORIA C
## WhatsApp Workers - TimelinesAI Integration (7 Workers)
### Versiunea 1.0 | 15 Ianuarie 2026

---

# 1. OVERVIEW

WhatsApp workers gestionează comunicarea prin TimelinesAI API pentru cele 20 numere de telefon.

## 1.1 Worker Inventory

| # | Queue Name | Purpose | Concurrency |
|---|------------|---------|-------------|
| 9 | `q:wa:phone_{01-20}` | Send initial messages | 1 per queue |
| 10 | `q:wa:phone_{XX}:followup` | Send follow-ups | 1 per queue |
| 11 | `q:wa:reply` | Process replies | 10 |
| 12 | `wa:message:retry` | Retry failed messages | 5 |
| 13 | `wa:chat:history:fetch` | Fetch chat history | 20 |
| 14 | `wa:status:sync` | Sync phone status | 5 |
| 15 | `wa:media:send` | Send media messages | 5 |

## 1.2 TimelinesAI API Configuration

```typescript
const TIMELINESAI_CONFIG = {
  baseUrl: 'https://api.timelines.ai/v1',
  apiKey: process.env.TIMELINESAI_API_KEY,
  webhookSecret: process.env.TIMELINESAI_WEBHOOK_SECRET,
  
  rateLimits: {
    sendMessage: 50,      // per minute per account
    getChatHistory: 100,  // per minute
    getChats: 20,         // per minute
  },
  
  // 20 phones configuration
  phoneCount: 20,
  dailyQuotaPerPhone: 200,  // NEW contacts only
};
```

---

# 2. WORKER #9: q:wa:phone_{XX} (Initial Send)

## 2.1 Specifications

| Attribute | Value |
|-----------|-------|
| **Queue Name** | `q:wa:phone_01` to `q:wa:phone_20` |
| **Concurrency** | **1** (CRITICAL - human behavior) |
| **Timeout** | 60000ms |
| **Max Attempts** | 3 |
| **Backoff** | Exponential, 30000ms |

## 2.2 Job Input Schema

```typescript
interface WaSendInitialJobData {
  correlationId: string;
  tenantId: string;
  leadId: string;
  phoneId: string;
  recipientPhone: string;         // E.164 format
  templateId?: string;
  personalization: {
    companyName: string;
    contactName?: string;
    customFields?: Record<string, string>;
  };
  sequenceId: string;
  sequenceStep: number;
  scheduledAt?: string;
}
```

## 2.3 Job Output Schema

```typescript
interface WaSendInitialResult {
  success: boolean;
  messageId: string;
  chatId: string;
  deliveryStatus: 'SENT' | 'QUEUED' | 'FAILED';
  quotaCost: 1;
  messageContent: {
    preview: string;
    spintaxVariant: string;
    hash: string;
  };
  timing: {
    jitterApplied: number;
    actualSendTime: string;
  };
  timelinesaiResponse: {
    accountPhone: string;
    chatUrl: string;
  };
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}
```

## 2.4 Implementation

```typescript
// workers/whatsapp/send-initial.worker.ts

import { Job } from 'bullmq';
import axios from 'axios';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@cerniq/db';
import { goldLeadJourney, goldCommunicationLog, waPhoneNumbers } from '@cerniq/db/schema';
import { processSpintax } from '@cerniq/utils/spintax';
import { logger } from '@cerniq/logger';

const TIMELINESAI_API = 'https://api.timelines.ai/v1';

export async function waSendInitialProcessor(
  job: Job<WaSendInitialJobData>
): Promise<WaSendInitialResult> {
  const {
    leadId, phoneId, recipientPhone, templateId,
    personalization, correlationId, sequenceId, sequenceStep, tenantId
  } = job.data;

  // 1. Apply jitter (30s + random 0-120s) for human behavior
  const jitterMs = 30000 + Math.random() * 120000;
  logger.debug({ jitterMs, leadId }, 'Applying jitter delay');
  await sleep(jitterMs);

  // 2. Get template and process spintax
  const template = await getTemplate(templateId || 'default_initial');
  const processedContent = processSpintax(template.content, personalization);
  const contentHash = createHash('sha256').update(processedContent).digest('hex').slice(0, 16);

  // 3. Get phone configuration
  const phoneConfig = await db.query.waPhoneNumbers.findFirst({
    where: eq(waPhoneNumbers.id, phoneId),
  });

  if (!phoneConfig || phoneConfig.status !== 'ACTIVE') {
    throw new Error(`Phone ${phoneId} is not active`);
  }

  // 4. Send via TimelinesAI API
  try {
    const response = await axios.post(
      `${TIMELINESAI_API}/messages/send`,
      {
        phone: phoneConfig.timelinesaiAccountId,
        recipient: recipientPhone,
        message: processedContent,
        // Don't include URLs in first message (anti-spam)
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.TIMELINESAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const messageId = response.data.message_id;
    const chatId = response.data.chat_id;
    const chatUrl = response.data.chat_url;

    // 5. Update lead state
    await db.update(goldLeadJourney)
      .set({
        engagementStage: 'CONTACTED_WA',
        previousStage: 'COLD',
        stageChangedAt: new Date(),
        quotaConsumptionDate: new Date().toISOString().split('T')[0],
        isNewContact: false,
        lastChannelUsed: 'WHATSAPP',
        firstContactAt: sql`COALESCE(first_contact_at, NOW())`,
        lastContactAt: new Date(),
        sequenceStep: sequenceStep,
        nextActionAt: await calculateNextFollowUp(sequenceId, sequenceStep),
        updatedAt: new Date(),
      })
      .where(eq(goldLeadJourney.leadId, leadId));

    // 6. Log communication
    await db.insert(goldCommunicationLog).values({
      id: uuidv4(),
      tenantId,
      leadJourneyId: leadId,
      channel: 'WHATSAPP',
      direction: 'OUTBOUND',
      templateId,
      content: processedContent,
      contentRendered: processedContent,
      externalMessageId: messageId,
      threadId: chatId,
      phoneId,
      phoneNumber: phoneConfig.phoneNumber,
      status: 'SENT',
      sentAt: new Date(),
      quotaCost: 1,
      sequenceId,
      sequenceStep,
      rawRequest: { recipient: recipientPhone, message: processedContent },
      rawResponse: response.data,
    });

    // 7. Update phone metrics
    await db.execute(sql`
      UPDATE wa_phone_numbers 
      SET total_messages_sent = total_messages_sent + 1,
          last_message_sent_at = NOW(),
          updated_at = NOW()
      WHERE id = ${phoneId}
    `);

    // 8. Trigger follow-up scheduling
    await scheduleFollowUp(leadId, sequenceId, sequenceStep);

    logger.info({
      leadId,
      messageId,
      chatId,
      phone: recipientPhone.slice(0, -4) + '****',
    }, 'WhatsApp initial message sent');

    return {
      success: true,
      messageId,
      chatId,
      deliveryStatus: 'SENT',
      quotaCost: 1,
      messageContent: {
        preview: processedContent.substring(0, 100),
        spintaxVariant: processedContent,
        hash: contentHash,
      },
      timing: {
        jitterApplied: Math.round(jitterMs / 1000),
        actualSendTime: new Date().toISOString(),
      },
      timelinesaiResponse: {
        accountPhone: phoneConfig.phoneNumber,
        chatUrl,
      },
    };

  } catch (error) {
    return handleTimelinesAIError(error, phoneId, leadId);
  }
}

async function handleTimelinesAIError(
  error: any, 
  phoneId: string, 
  leadId: string
): Promise<never> {
  if (axios.isAxiosError(error)) {
    const statusCode = error.response?.status;
    const errorMessage = error.response?.data?.message || error.message;

    // Rate limited
    if (statusCode === 429) {
      logger.warn({ phoneId, leadId }, 'TimelinesAI rate limited');
      throw new Error('TIMELINESAI_RATE_LIMITED');
    }

    // Auth error - mark phone offline
    if (statusCode === 401 || statusCode === 403) {
      await db.update(waPhoneNumbers)
        .set({ 
          status: 'OFFLINE', 
          statusChangedAt: new Date(),
          statusReason: errorMessage,
        })
        .where(eq(waPhoneNumbers.id, phoneId));
      
      await triggerAlert('phone:offline', { phoneId, error: errorMessage });
      throw new Error(`PHONE_AUTH_ERROR: ${errorMessage}`);
    }

    // Ban detection
    if (errorMessage?.toLowerCase().includes('blocked') || 
        errorMessage?.toLowerCase().includes('banned')) {
      await db.update(waPhoneNumbers)
        .set({ 
          status: 'BANNED', 
          statusChangedAt: new Date(),
          statusReason: errorMessage,
        })
        .where(eq(waPhoneNumbers.id, phoneId));
      
      await triggerAlert('phone:banned', { phoneId });
      throw new Error('PHONE_BANNED');
    }

    // Invalid number
    if (statusCode === 400 && errorMessage?.includes('invalid')) {
      logger.warn({ leadId, phoneId }, 'Invalid recipient number');
      throw new Error('INVALID_RECIPIENT_NUMBER');
    }
  }

  throw error;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

## 2.5 Output Triggers

| Destination Queue | Condition |
|-------------------|-----------|
| `sequence:schedule:followup` | After success |
| `alert:phone:banned` | If PHONE_BANNED |
| `alert:phone:offline` | If PHONE_AUTH_ERROR |
| `wa:message:retry` | If retriable error |

---

# 3. WORKER #10: q:wa:phone_{XX}:followup

## 3.1 Specifications

| Attribute | Value |
|-----------|-------|
| **Queue Name** | `q:wa:phone_XX:followup` |
| **Concurrency** | 1 per queue |
| **Timeout** | 60000ms |
| **Quota Cost** | **0** (unlimited) |

## 3.2 Key Difference from Initial

```typescript
// Follow-up does NOT consume quota
const quotaCost = 0;

// Uses existing chatId
const response = await axios.post(
  `${TIMELINESAI_API}/messages/send`,
  {
    chat_id: existingChatId,  // Use existing chat
    message: processedContent,
  },
  { headers }
);
```

## 3.3 Implementation

```typescript
export async function waSendFollowupProcessor(
  job: Job<WaSendFollowupJobData>
): Promise<WaSendFollowupResult> {
  const { leadId, phoneId, chatId, templateId, personalization, sequenceStep } = job.data;

  // Apply jitter (same as initial)
  const jitterMs = 30000 + Math.random() * 120000;
  await sleep(jitterMs);

  // Get template
  const template = await getTemplate(templateId || `followup_step_${sequenceStep}`);
  const processedContent = processSpintax(template.content, personalization);

  // Send to existing chat (no quota cost)
  const response = await axios.post(
    `${TIMELINESAI_API}/messages/send`,
    {
      chat_id: chatId,
      message: processedContent,
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.TIMELINESAI_API_KEY}`,
      },
      timeout: 30000,
    }
  );

  // Log communication (quotaCost = 0)
  await db.insert(goldCommunicationLog).values({
    // ... same fields
    quotaCost: 0,  // KEY DIFFERENCE
  });

  // Update lead journey
  await db.update(goldLeadJourney)
    .set({
      lastContactAt: new Date(),
      sequenceStep: sequenceStep,
      nextActionAt: await calculateNextFollowUp(sequenceId, sequenceStep),
    })
    .where(eq(goldLeadJourney.leadId, leadId));

  return {
    success: true,
    messageId: response.data.message_id,
    quotaCost: 0,
    // ...
  };
}
```

---

# 4. WORKER #11: q:wa:reply

## 4.1 Specifications

| Attribute | Value |
|-----------|-------|
| **Queue Name** | `q:wa:reply` |
| **Concurrency** | 10 |
| **Timeout** | 30000ms |
| **Purpose** | Process inbound replies and trigger AI/human |

## 4.2 Implementation

```typescript
interface WaReplyJobData {
  chatId: string;
  messageId: string;
  content: string;
  senderPhone: string;
  timestamp: string;
}

export async function waReplyProcessor(
  job: Job<WaReplyJobData>
): Promise<WaReplyResult> {
  const { chatId, content, senderPhone, timestamp } = job.data;

  // Find lead by chatId
  const commLog = await db.query.goldCommunicationLog.findFirst({
    where: eq(goldCommunicationLog.threadId, chatId),
  });

  if (!commLog) {
    logger.warn({ chatId }, 'No lead found for chat');
    return { processed: false, reason: 'LEAD_NOT_FOUND' };
  }

  const leadId = commLog.leadJourneyId;

  // Update lead state
  await db.update(goldLeadJourney)
    .set({
      engagementStage: 'WARM_REPLY',
      previousStage: sql`engagement_stage`,
      stageChangedAt: new Date(),
      lastReplyAt: new Date(),
      replyCount: sql`reply_count + 1`,
    })
    .where(eq(goldLeadJourney.leadId, leadId));

  // Log inbound message
  await db.insert(goldCommunicationLog).values({
    id: uuidv4(),
    leadJourneyId: leadId,
    channel: 'WHATSAPP',
    direction: 'INBOUND',
    content,
    externalMessageId: job.data.messageId,
    threadId: chatId,
    status: 'DELIVERED',
    sentAt: new Date(timestamp),
  });

  // Stop any pending follow-ups
  await triggerQueue('sequence:stop', { leadId });

  // Trigger sentiment analysis
  await triggerQueue('ai:sentiment:analyze', { 
    leadId, 
    content,
    source: 'WHATSAPP_REPLY',
  });

  // Check for urgent keywords requiring human review
  if (requiresHumanReview(content)) {
    await db.update(goldLeadJourney)
      .set({
        requiresHumanReview: true,
        humanReviewReason: 'KEYWORD_TRIGGER',
        humanReviewPriority: 'HIGH',
      })
      .where(eq(goldLeadJourney.leadId, leadId));

    await triggerQueue('human:review:queue', { leadId, reason: 'KEYWORD_TRIGGER' });
  }

  return {
    processed: true,
    leadId,
    newState: 'WARM_REPLY',
    triggeredActions: ['STOP_SEQUENCE', 'SENTIMENT_ANALYSIS'],
  };
}

function requiresHumanReview(content: string): boolean {
  const urgentKeywords = [
    'urgent', 'problema', 'reclamație', 'nemulțumit',
    'dezabonare', 'stop', 'anulare', 'preț', 'discount',
    'manager', 'șef', 'director', 'avocat'
  ];
  
  const lower = content.toLowerCase();
  return urgentKeywords.some(kw => lower.includes(kw));
}
```

---

# 5. WORKER #12: wa:message:retry

## 5.1 Specifications

| Attribute | Value |
|-----------|-------|
| **Queue Name** | `wa:message:retry` |
| **Concurrency** | 5 |
| **Rate Limit** | 10/min |
| **Purpose** | Retry failed messages with backoff |

## 5.2 Implementation

```typescript
export async function waMessageRetryProcessor(
  job: Job<WaRetryJobData>
): Promise<WaRetryResult> {
  const { originalJobId, leadId, phoneId, attemptNumber } = job.data;

  // Check if we should retry
  if (attemptNumber > 3) {
    logger.warn({ originalJobId, attemptNumber }, 'Max retries exceeded');
    
    // Mark as failed
    await db.update(goldCommunicationLog)
      .set({ status: 'FAILED' })
      .where(eq(goldCommunicationLog.jobId, originalJobId));

    return { retried: false, reason: 'MAX_RETRIES_EXCEEDED' };
  }

  // Re-queue to phone queue
  const phone = await db.query.waPhoneNumbers.findFirst({
    where: eq(waPhoneNumbers.id, phoneId),
  });

  if (!phone || phone.status !== 'ACTIVE') {
    return { retried: false, reason: 'PHONE_NOT_AVAILABLE' };
  }

  const queueSuffix = phone.phoneNumber.slice(-2);
  
  await flowProducer.add({
    name: 'retry-send',
    queueName: `q:wa:phone_${queueSuffix}`,
    data: {
      ...job.data.originalPayload,
      isRetry: true,
      attemptNumber: attemptNumber + 1,
    },
    opts: {
      delay: Math.pow(2, attemptNumber) * 30000, // Exponential backoff
    },
  });

  return { retried: true, nextAttempt: attemptNumber + 1 };
}
```

---

# 6. WORKER #13: wa:chat:history:fetch

## 6.1 Specifications

| Attribute | Value |
|-----------|-------|
| **Queue Name** | `wa:chat:history:fetch` |
| **Concurrency** | 20 |
| **Rate Limit** | 100/min (TimelinesAI limit) |
| **Purpose** | Fetch full chat history for context |

## 6.2 Implementation

```typescript
export async function waChatHistoryFetchProcessor(
  job: Job<{ chatId: string; phoneId: string }>
): Promise<ChatHistoryResult> {
  const { chatId, phoneId } = job.data;

  const phone = await db.query.waPhoneNumbers.findFirst({
    where: eq(waPhoneNumbers.id, phoneId),
  });

  const response = await axios.get(
    `${TIMELINESAI_API}/chats/${chatId}/messages`,
    {
      params: { limit: 100 },
      headers: {
        'Authorization': `Bearer ${process.env.TIMELINESAI_API_KEY}`,
      },
    }
  );

  const messages = response.data.messages;

  // Store in database for context
  for (const msg of messages) {
    await db.insert(goldCommunicationLog)
      .values({
        // ... message data
      })
      .onConflictDoNothing();
  }

  return {
    chatId,
    messagesCount: messages.length,
    oldestMessage: messages[messages.length - 1]?.timestamp,
    newestMessage: messages[0]?.timestamp,
  };
}
```

---

# 7. WORKER #14: wa:status:sync

## 7.1 Specifications

| Attribute | Value |
|-----------|-------|
| **Queue Name** | `wa:status:sync` |
| **Concurrency** | 5 |
| **Schedule** | Cron: `*/10 * * * *` (every 10 min) |
| **Purpose** | Sync phone connection status from TimelinesAI |

## 7.2 Implementation

```typescript
export async function waStatusSyncProcessor(
  job: Job<{ tenantId: string }>
): Promise<StatusSyncResult> {
  const { tenantId } = job.data;

  const phones = await db.select()
    .from(waPhoneNumbers)
    .where(eq(waPhoneNumbers.tenantId, tenantId));

  const results: PhoneStatus[] = [];

  for (const phone of phones) {
    try {
      const response = await axios.get(
        `${TIMELINESAI_API}/accounts/${phone.timelinesaiAccountId}/status`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.TIMELINESAI_API_KEY}`,
          },
        }
      );

      const isOnline = response.data.connected;
      const newStatus = isOnline ? 'ACTIVE' : 'OFFLINE';

      if (phone.status !== newStatus) {
        await db.update(waPhoneNumbers)
          .set({
            status: newStatus,
            statusChangedAt: new Date(),
            isOnline,
            lastHealthCheckAt: new Date(),
          })
          .where(eq(waPhoneNumbers.id, phone.id));

        if (!isOnline && phone.status === 'ACTIVE') {
          await triggerAlert('phone:offline', { phoneId: phone.id });
        }
      }

      results.push({ phoneId: phone.id, status: newStatus });

    } catch (error) {
      logger.error({ phoneId: phone.id, error }, 'Failed to sync phone status');
      results.push({ phoneId: phone.id, status: 'ERROR' });
    }
  }

  return { syncedPhones: results.length, results };
}
```

---

# 8. WORKER #15: wa:media:send

## 8.1 Specifications

| Attribute | Value |
|-----------|-------|
| **Queue Name** | `wa:media:send` |
| **Concurrency** | 5 |
| **Rate Limit** | 10/min |
| **Purpose** | Send media messages (images, documents) |

## 8.2 Implementation

```typescript
interface WaMediaSendJobData {
  leadId: string;
  chatId: string;
  phoneId: string;
  mediaType: 'image' | 'document' | 'video';
  mediaUrl: string;
  caption?: string;
}

export async function waMediaSendProcessor(
  job: Job<WaMediaSendJobData>
): Promise<WaMediaSendResult> {
  const { chatId, phoneId, mediaType, mediaUrl, caption } = job.data;

  // Apply jitter
  await sleep(30000 + Math.random() * 60000);

  const response = await axios.post(
    `${TIMELINESAI_API}/messages/send-media`,
    {
      chat_id: chatId,
      media_type: mediaType,
      media_url: mediaUrl,
      caption,
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.TIMELINESAI_API_KEY}`,
      },
    }
  );

  return {
    success: true,
    messageId: response.data.message_id,
    mediaType,
  };
}
```

---

# 9. PER-PHONE QUEUE ARCHITECTURE

## 9.1 Queue Creation

```typescript
// Create 20 phone queues at startup
const PHONE_QUEUES: Queue[] = [];

for (let i = 1; i <= 20; i++) {
  const suffix = i.toString().padStart(2, '0');
  
  // Initial messages queue
  PHONE_QUEUES.push(new Queue(`q:wa:phone_${suffix}`, {
    connection: REDIS_CONNECTION,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 30000 },
    },
  }));
  
  // Follow-up queue (same phone)
  PHONE_QUEUES.push(new Queue(`q:wa:phone_${suffix}:followup`, {
    connection: REDIS_CONNECTION,
  }));
}
```

## 9.2 Why Separate Queues?

1. **Head-of-Line Blocking Prevention**: One stuck job doesn't block others
2. **Phone Isolation**: Issues with one phone don't affect others
3. **Fair Distribution**: Equal processing across all phones
4. **Debugging**: Easy to identify per-phone issues
5. **Scaling**: Can adjust concurrency per phone

---

**Document generat:** 15 Ianuarie 2026
**Total Workers:** 7 (+ 20 phone queues × 2 = 47 total queues)
**Conformitate:** Master Spec v1.2
