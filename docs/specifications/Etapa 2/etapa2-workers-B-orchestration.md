# CERNIQ.APP — ETAPA 2: WORKERS CATEGORIA B
## Outreach Orchestration (4 Workers)
### Versiunea 1.0 | 15 Ianuarie 2026

---

# 1. OVERVIEW

Orchestration workers coordonează fluxul principal de outreach, selectând lead-uri eligibile și distribuindu-le către canalele potrivite.

## 1.1 Worker Inventory

| # | Queue Name | Purpose | Concurrency |
|---|------------|---------|-------------|
| 5 | `outreach:orchestrator:dispatch` | Batch dispatcher | 20 |
| 6 | `outreach:orchestrator:router` | Job router | 50 |
| 7 | `outreach:phone:allocator` | Phone assignment | 50 |
| 8 | `outreach:channel:selector` | Channel selection | 50 |

---

# 2. WORKER #5: outreach:orchestrator:dispatch

## 2.1 Specifications

| Attribute | Value |
|-----------|-------|
| **Queue Name** | `outreach:orchestrator:dispatch` |
| **Concurrency** | 20 |
| **Timeout** | 30000ms |
| **Schedule** | Cron: `*/5 * * * *` (every 5 minutes) |
| **Purpose** | Fetch eligible leads and dispatch to channels |

## 2.2 Job Input Schema

```typescript
interface DispatchJobData {
  correlationId: string;
  tenantId: string;
  batchSize: number;           // Default: 100
  channelPreference?: 'WHATSAPP' | 'EMAIL' | 'AUTO';
  priorityFilter?: 'HIGH' | 'NORMAL' | 'LOW';
  sequenceFilter?: string;     // Specific sequence ID
}
```

## 2.3 Job Output Schema

```typescript
interface DispatchResult {
  totalEligibleLeads: number;
  dispatchedToWhatsApp: number;
  dispatchedToEmail: number;
  skippedQuotaExceeded: number;
  skippedOutsideHours: number;
  skippedNoChannel: number;
  skippedHumanReview: number;
  jobsCreated: Array<{
    jobId: string;
    leadId: string;
    channel: string;
    queue: string;
    phoneId?: string;
  }>;
  processingTimeMs: number;
  nextDispatchAt: string;
}
```

## 2.4 Implementation

```typescript
// workers/outreach/orchestrator-dispatch.worker.ts

import { Job, FlowProducer } from 'bullmq';
import { db } from '@cerniq/db';
import { goldLeadJourney, waPhoneNumbers, goldCompanies } from '@cerniq/db/schema';
import { and, eq, lt, isNull, or, ne } from 'drizzle-orm';
import { logger } from '@cerniq/logger';

const flowProducer = new FlowProducer({ connection: REDIS_CONNECTION });

export async function orchestratorDispatchProcessor(
  job: Job<DispatchJobData>
): Promise<DispatchResult> {
  const { tenantId, batchSize = 100, channelPreference = 'AUTO' } = job.data;
  const startTime = Date.now();

  const result: DispatchResult = {
    totalEligibleLeads: 0,
    dispatchedToWhatsApp: 0,
    dispatchedToEmail: 0,
    skippedQuotaExceeded: 0,
    skippedOutsideHours: 0,
    skippedNoChannel: 0,
    skippedHumanReview: 0,
    jobsCreated: [],
    processingTimeMs: 0,
    nextDispatchAt: '',
  };

  // 1. Fetch eligible leads
  const eligibleLeads = await db
    .select({
      journey: goldLeadJourney,
      company: goldCompanies,
    })
    .from(goldLeadJourney)
    .innerJoin(goldCompanies, eq(goldLeadJourney.leadId, goldCompanies.id))
    .where(and(
      eq(goldLeadJourney.tenantId, tenantId),
      or(
        eq(goldLeadJourney.engagementStage, 'COLD'),
        eq(goldLeadJourney.engagementStage, 'CONTACTED_WA'),
        eq(goldLeadJourney.engagementStage, 'CONTACTED_EMAIL')
      ),
      or(
        isNull(goldLeadJourney.nextActionAt),
        lt(goldLeadJourney.nextActionAt, new Date())
      ),
      eq(goldLeadJourney.requiresHumanReview, false),
      ne(goldLeadJourney.engagementStage, 'PAUSED')
    ))
    .limit(batchSize)
    .orderBy(goldLeadJourney.nextActionAt);

  result.totalEligibleLeads = eligibleLeads.length;

  if (eligibleLeads.length === 0) {
    logger.info({ tenantId }, 'No eligible leads for dispatch');
    return result;
  }

  // 2. Get available WhatsApp phones (sorted by usage - least used first)
  const availablePhones = await db
    .select()
    .from(waPhoneNumbers)
    .where(and(
      eq(waPhoneNumbers.tenantId, tenantId),
      eq(waPhoneNumbers.status, 'ACTIVE'),
      eq(waPhoneNumbers.isEnabled, true)
    ))
    .orderBy(waPhoneNumbers.totalMessagesSent);

  let phoneIndex = 0;

  // 3. Process each lead
  for (const { journey, company } of eligibleLeads) {
    const isNewContact = journey.engagementStage === 'COLD';
    const hasPhone = company.telefonPrincipal && company.hlrReachable;
    const hasEmail = company.emailPrincipal && company.emailStatus === 'valid';

    // Skip if requires human review
    if (journey.requiresHumanReview) {
      result.skippedHumanReview++;
      continue;
    }

    // Determine best channel
    let selectedChannel: 'WHATSAPP' | 'EMAIL_COLD' | 'EMAIL_WARM' | null = null;

    if (channelPreference === 'AUTO') {
      if (hasPhone && availablePhones.length > 0 && !journey.whatsappOptedOut) {
        selectedChannel = 'WHATSAPP';
      } else if (hasEmail && !journey.emailOptedOut) {
        selectedChannel = isNewContact ? 'EMAIL_COLD' : 'EMAIL_WARM';
      }
    } else if (channelPreference === 'WHATSAPP' && hasPhone) {
      selectedChannel = 'WHATSAPP';
    } else if (channelPreference === 'EMAIL' && hasEmail) {
      selectedChannel = isNewContact ? 'EMAIL_COLD' : 'EMAIL_WARM';
    }

    if (!selectedChannel) {
      result.skippedNoChannel++;
      continue;
    }

    // 4. Create job based on channel
    if (selectedChannel === 'WHATSAPP') {
      // Get phone (sticky assignment or round-robin)
      const phoneId = journey.assignedPhoneId || 
        availablePhones[phoneIndex % availablePhones.length]?.id;

      if (!phoneId) {
        result.skippedQuotaExceeded++;
        continue;
      }

      const phoneNumber = availablePhones.find(p => p.id === phoneId)?.phoneNumber || 'XX';
      const queueSuffix = phoneNumber.slice(-2).padStart(2, '0');
      const jobId = `wa-${journey.leadId}-${Date.now()}`;

      // Add to per-phone queue
      await flowProducer.add({
        name: 'send-whatsapp-initial',
        queueName: `q:wa:phone_${queueSuffix}`,
        data: {
          correlationId: job.data.correlationId,
          tenantId,
          leadId: journey.leadId,
          phoneId,
          recipientPhone: company.telefonPrincipal,
          isNewContact,
          sequenceId: journey.currentSequenceId,
          sequenceStep: journey.sequenceStep,
          personalization: {
            companyName: company.denumire,
            contactName: company.contactPrincipalNume,
            judet: company.judet,
            localitate: company.localitate,
          },
        },
        opts: {
          jobId,
          priority: isNewContact ? 1 : 2,
        },
      });

      result.dispatchedToWhatsApp++;
      result.jobsCreated.push({
        jobId,
        leadId: journey.leadId,
        channel: 'WHATSAPP',
        queue: `q:wa:phone_${queueSuffix}`,
        phoneId,
      });

      // Update sticky assignment if new
      if (!journey.assignedPhoneId) {
        await db.update(goldLeadJourney)
          .set({
            assignedPhoneId: phoneId,
            assignedAt: new Date(),
          })
          .where(eq(goldLeadJourney.id, journey.id));
      }

      phoneIndex++;

    } else {
      // Email channel
      const emailQueue = selectedChannel === 'EMAIL_COLD' 
        ? 'q:email:cold' 
        : 'q:email:warm';
      const jobId = `email-${journey.leadId}-${Date.now()}`;

      await flowProducer.add({
        name: selectedChannel === 'EMAIL_COLD' ? 'send-email-cold' : 'send-email-warm',
        queueName: emailQueue,
        data: {
          correlationId: job.data.correlationId,
          tenantId,
          leadId: journey.leadId,
          recipientEmail: company.emailPrincipal,
          isNewContact,
          sequenceId: journey.currentSequenceId,
          sequenceStep: journey.sequenceStep,
          personalization: {
            companyName: company.denumire,
            contactName: company.contactPrincipalNume,
          },
        },
        opts: { jobId },
      });

      result.dispatchedToEmail++;
      result.jobsCreated.push({
        jobId,
        leadId: journey.leadId,
        channel: selectedChannel,
        queue: emailQueue,
      });
    }

    // Update progress
    await job.updateProgress(
      Math.round((result.dispatchedToWhatsApp + result.dispatchedToEmail) / 
        eligibleLeads.length * 100)
    );
  }

  result.processingTimeMs = Date.now() - startTime;
  result.nextDispatchAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  logger.info({
    total: result.totalEligibleLeads,
    whatsapp: result.dispatchedToWhatsApp,
    email: result.dispatchedToEmail,
    skipped: result.skippedQuotaExceeded + result.skippedNoChannel,
    duration: result.processingTimeMs,
  }, 'Dispatch batch completed');

  return result;
}
```

## 2.5 Output Triggers

| Destination Queue | Condition |
|-------------------|-----------|
| `q:wa:phone_XX` | For each lead with WhatsApp |
| `q:email:cold` | For cold email (stage COLD) |
| `q:email:warm` | For warm email (stage != COLD) |

---

# 3. WORKER #6: outreach:orchestrator:router

## 3.1 Specifications

| Attribute | Value |
|-----------|-------|
| **Queue Name** | `outreach:orchestrator:router` |
| **Concurrency** | 50 |
| **Timeout** | 5000ms |
| **Purpose** | Route individual jobs to per-phone queues |

## 3.2 Implementation

```typescript
interface RouterJobData {
  leadId: string;
  phoneId: string;
  messageType: 'INITIAL' | 'FOLLOWUP';
  payload: any;
}

interface RouterResult {
  routed: boolean;
  targetQueue: string;
  jobId: string;
}

export async function orchestratorRouterProcessor(
  job: Job<RouterJobData>
): Promise<RouterResult> {
  const { phoneId, messageType, payload } = job.data;

  // Determine target queue
  const phone = await db.query.waPhoneNumbers.findFirst({
    where: eq(waPhoneNumbers.id, phoneId),
  });

  if (!phone || phone.status !== 'ACTIVE') {
    throw new Error(`Phone ${phoneId} not available`);
  }

  const queueSuffix = phone.phoneNumber.slice(-2).padStart(2, '0');
  const targetQueue = messageType === 'FOLLOWUP'
    ? `q:wa:phone_${queueSuffix}:followup`
    : `q:wa:phone_${queueSuffix}`;

  const jobId = `${messageType.toLowerCase()}-${job.data.leadId}-${Date.now()}`;

  await flowProducer.add({
    name: `send-whatsapp-${messageType.toLowerCase()}`,
    queueName: targetQueue,
    data: payload,
    opts: { jobId },
  });

  return {
    routed: true,
    targetQueue,
    jobId,
  };
}
```

---

# 4. WORKER #7: outreach:phone:allocator

## 4.1 Specifications

| Attribute | Value |
|-----------|-------|
| **Queue Name** | `outreach:phone:allocator` |
| **Concurrency** | 50 |
| **Timeout** | 3000ms |
| **Purpose** | Allocate WhatsApp phone to lead (round-robin weighted) |

## 4.2 Job Schema

```typescript
interface PhoneAllocationJobData {
  tenantId: string;
  leadId: string;
  preferExisting?: boolean;  // Use sticky assignment if exists
}

interface PhoneAllocationResult {
  leadId: string;
  allocatedPhoneId: string;
  allocationType: 'NEW' | 'STICKY' | 'FALLBACK';
  phoneQuotaStatus: {
    currentUsage: number;
    remaining: number;
  };
  reason: string;
}
```

## 4.3 Implementation

```typescript
export async function phoneAllocatorProcessor(
  job: Job<PhoneAllocationJobData>
): Promise<PhoneAllocationResult> {
  const { tenantId, leadId, preferExisting = true } = job.data;

  // Check for existing sticky assignment
  if (preferExisting) {
    const journey = await db.query.goldLeadJourney.findFirst({
      where: eq(goldLeadJourney.leadId, leadId),
    });

    if (journey?.assignedPhoneId) {
      const phone = await db.query.waPhoneNumbers.findFirst({
        where: eq(waPhoneNumbers.id, journey.assignedPhoneId),
      });

      if (phone?.status === 'ACTIVE') {
        const quota = await getPhoneQuota(phone.id);
        return {
          leadId,
          allocatedPhoneId: phone.id,
          allocationType: 'STICKY',
          phoneQuotaStatus: quota,
          reason: 'Existing sticky assignment',
        };
      }
    }
  }

  // Round-robin allocation weighted by available quota
  const phones = await db.select()
    .from(waPhoneNumbers)
    .where(and(
      eq(waPhoneNumbers.tenantId, tenantId),
      eq(waPhoneNumbers.status, 'ACTIVE')
    ));

  // Sort by available quota (descending)
  const phonesWithQuota = await Promise.all(
    phones.map(async (phone) => ({
      phone,
      quota: await getPhoneQuota(phone.id),
    }))
  );

  const sortedPhones = phonesWithQuota
    .filter(p => p.quota.remaining > 0)
    .sort((a, b) => b.quota.remaining - a.quota.remaining);

  if (sortedPhones.length === 0) {
    throw new Error('No phones with available quota');
  }

  const selected = sortedPhones[0];

  // Update sticky assignment
  await db.update(goldLeadJourney)
    .set({
      assignedPhoneId: selected.phone.id,
      assignedAt: new Date(),
    })
    .where(eq(goldLeadJourney.leadId, leadId));

  return {
    leadId,
    allocatedPhoneId: selected.phone.id,
    allocationType: 'NEW',
    phoneQuotaStatus: selected.quota,
    reason: `Allocated phone with ${selected.quota.remaining} remaining quota`,
  };
}

async function getPhoneQuota(phoneId: string): Promise<{
  currentUsage: number;
  remaining: number;
}> {
  const dateIso = DateTime.now().toISODate();
  const usage = await redis.get(`quota:wa:${phoneId}:${dateIso}`);
  const current = parseInt(usage || '0');
  return {
    currentUsage: current,
    remaining: 200 - current,
  };
}
```

---

# 5. WORKER #8: outreach:channel:selector

## 5.1 Specifications

| Attribute | Value |
|-----------|-------|
| **Queue Name** | `outreach:channel:selector` |
| **Concurrency** | 50 |
| **Timeout** | 2000ms |
| **Purpose** | Select optimal channel for lead |

## 5.2 Job Schema

```typescript
interface ChannelSelectionJobData {
  tenantId: string;
  leadId: string;
  preferredChannel?: 'WHATSAPP' | 'EMAIL' | 'AUTO';
}

interface ChannelSelectionResult {
  leadId: string;
  selectedChannel: 'WHATSAPP' | 'EMAIL_COLD' | 'EMAIL_WARM' | null;
  reasoning: {
    hasVerifiedPhone: boolean;
    hasVerifiedEmail: boolean;
    phoneOptedOut: boolean;
    emailOptedOut: boolean;
    currentStage: string;
    preferenceScore: Record<string, number>;
    previousEngagement: string | null;
  };
  fallbackChannel?: string;
}
```

## 5.3 Implementation

```typescript
export async function channelSelectorProcessor(
  job: Job<ChannelSelectionJobData>
): Promise<ChannelSelectionResult> {
  const { leadId, preferredChannel = 'AUTO' } = job.data;

  // Get lead data
  const journey = await db.query.goldLeadJourney.findFirst({
    where: eq(goldLeadJourney.leadId, leadId),
    with: { goldCompany: true },
  });

  if (!journey) {
    throw new Error(`Lead ${leadId} not found`);
  }

  const company = journey.goldCompany;

  const reasoning = {
    hasVerifiedPhone: !!(company.telefonPrincipal && company.hlrReachable),
    hasVerifiedEmail: !!(company.emailPrincipal && company.emailStatus === 'valid'),
    phoneOptedOut: journey.whatsappOptedOut,
    emailOptedOut: journey.emailOptedOut,
    currentStage: journey.engagementStage,
    preferenceScore: {
      WHATSAPP: 0,
      EMAIL_COLD: 0,
      EMAIL_WARM: 0,
    },
    previousEngagement: journey.lastChannelUsed,
  };

  // Calculate preference scores
  if (reasoning.hasVerifiedPhone && !reasoning.phoneOptedOut) {
    reasoning.preferenceScore.WHATSAPP = 100;  // WhatsApp preferred
  }
  if (reasoning.hasVerifiedEmail && !reasoning.emailOptedOut) {
    if (journey.engagementStage === 'COLD') {
      reasoning.preferenceScore.EMAIL_COLD = 70;
    } else {
      reasoning.preferenceScore.EMAIL_WARM = 80;
    }
  }

  // Boost score for previously used channel
  if (journey.lastChannelUsed === 'WHATSAPP') {
    reasoning.preferenceScore.WHATSAPP += 20;
  }

  // Select channel
  let selectedChannel: 'WHATSAPP' | 'EMAIL_COLD' | 'EMAIL_WARM' | null = null;

  if (preferredChannel === 'AUTO') {
    const scores = reasoning.preferenceScore;
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore > 0) {
      selectedChannel = Object.keys(scores).find(
        k => scores[k as keyof typeof scores] === maxScore
      ) as any;
    }
  } else if (preferredChannel === 'WHATSAPP' && reasoning.preferenceScore.WHATSAPP > 0) {
    selectedChannel = 'WHATSAPP';
  } else if (preferredChannel === 'EMAIL') {
    selectedChannel = journey.engagementStage === 'COLD' ? 'EMAIL_COLD' : 'EMAIL_WARM';
  }

  // Determine fallback
  let fallbackChannel: string | undefined;
  if (selectedChannel === 'WHATSAPP' && reasoning.hasVerifiedEmail) {
    fallbackChannel = 'EMAIL_COLD';
  } else if (selectedChannel?.startsWith('EMAIL') && reasoning.hasVerifiedPhone) {
    fallbackChannel = 'WHATSAPP';
  }

  return {
    leadId,
    selectedChannel,
    reasoning,
    fallbackChannel,
  };
}
```

---

# 6. CRON CONFIGURATION

```typescript
// Register cron job for dispatcher
import { Queue } from 'bullmq';

const dispatchQueue = new Queue('outreach:orchestrator:dispatch', {
  connection: REDIS_CONNECTION,
});

// Run every 5 minutes
await dispatchQueue.add(
  'scheduled-dispatch',
  {
    correlationId: `cron-${Date.now()}`,
    tenantId: 'ALL', // Will be expanded to all active tenants
    batchSize: 100,
    channelPreference: 'AUTO',
  },
  {
    repeat: {
      pattern: '*/5 * * * *',
    },
    jobId: 'dispatch-cron',
  }
);
```

---

**Document generat:** 15 Ianuarie 2026
**Total Workers:** 4
**Conformitate:** Master Spec v1.2
