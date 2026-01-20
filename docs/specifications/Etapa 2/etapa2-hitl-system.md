# CERNIQ.APP — ETAPA 2: HUMAN-IN-THE-LOOP SYSTEM
## HITL Approval & Review Workflows
### Versiunea 1.0 | 15 Ianuarie 2026

---

# 1. OVERVIEW

HITL (Human-in-the-Loop) pentru Etapa 2 gestionează:
- Review al răspunsurilor cu sentiment negativ/incert
- Aprobare mesaje AI înainte de trimitere
- Takeover manual al conversațiilor
- Escalări SLA-driven

## 1.1 HITL Triggers

| Trigger | Priority | SLA | Action Required |
|---------|----------|-----|-----------------|
| Sentiment < 0 | URGENT | 1h | Review + Respond |
| Sentiment 0-49 | MEDIUM | 24h | Review + Decide |
| Keyword trigger | HIGH | 4h | Review content |
| AI uncertain | MEDIUM | 24h | Validate AI suggestion |
| Bounce detected | LOW | 72h | Update contact |
| Manual flag | varies | varies | Custom action |

---

# 2. DATABASE SCHEMA

## 2.1 human_review_queue Table

```sql
CREATE TABLE human_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  -- References
  lead_journey_id UUID NOT NULL REFERENCES gold_lead_journey(id),
  communication_id UUID REFERENCES gold_communication_log(id),
  
  -- Review Details
  reason review_reason_enum NOT NULL,
  priority review_priority_enum NOT NULL DEFAULT 'MEDIUM',
  trigger_content TEXT,
  
  -- AI Analysis
  ai_analysis JSONB DEFAULT '{}',
  suggested_response TEXT,
  confidence_score DECIMAL(5,2),
  
  -- Assignment
  assigned_to UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  -- PENDING, ASSIGNED, IN_PROGRESS, RESOLVED, ESCALATED, EXPIRED
  
  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  resolution_action VARCHAR(50),
  -- APPROVED, REJECTED, EDITED, TAKEOVER, IGNORED
  resolution_notes TEXT,
  response_sent TEXT,
  
  -- SLA
  sla_due_at TIMESTAMPTZ NOT NULL,
  sla_breached BOOLEAN DEFAULT FALSE,
  escalated_at TIMESTAMPTZ,
  escalated_to UUID REFERENCES users(id),
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_review_tenant_status ON human_review_queue(tenant_id, status);
CREATE INDEX idx_review_priority ON human_review_queue(priority, created_at);
CREATE INDEX idx_review_sla ON human_review_queue(sla_due_at) WHERE status = 'PENDING';
CREATE INDEX idx_review_assigned ON human_review_queue(assigned_to) WHERE status = 'ASSIGNED';
```

## 2.2 hitl_audit_log Table

```sql
CREATE TABLE hitl_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES human_review_queue(id),
  
  -- Action Details
  action VARCHAR(50) NOT NULL,
  -- CREATED, ASSIGNED, VIEWED, EDITED, RESOLVED, ESCALATED, SLA_BREACH
  
  performed_by UUID REFERENCES users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Change Details
  previous_state JSONB,
  new_state JSONB,
  notes TEXT,
  
  -- Context
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_audit_review ON hitl_audit_log(review_id, performed_at DESC);
```

---

# 3. REVIEW QUEUE WORKER

## 3.1 Worker: human:review:queue

```typescript
// workers/human/review-queue.worker.ts

import { Job } from 'bullmq';
import { db } from '@cerniq/db';
import { humanReviewQueue, goldLeadJourney } from '@cerniq/db/schema';
import { DateTime } from 'luxon';
import { v4 as uuidv4 } from 'uuid';
import { sendSlackNotification } from '@cerniq/notifications';

interface ReviewQueueJobData {
  tenantId: string;
  leadId: string;
  communicationId?: string;
  reason: 'NEGATIVE_SENTIMENT' | 'KEYWORD_TRIGGER' | 'AI_UNCERTAIN' | 'BOUNCE_DETECTED' | 'MANUAL_FLAG';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  triggerContent?: string;
  aiAnalysis?: {
    sentimentScore: number;
    intent: string;
    suggestedResponse?: string;
    confidence: number;
  };
}

// SLA hours by priority
const SLA_HOURS: Record<string, number> = {
  URGENT: 1,
  HIGH: 4,
  MEDIUM: 24,
  LOW: 72,
};

export async function reviewQueueProcessor(
  job: Job<ReviewQueueJobData>
): Promise<{ reviewId: string; slaDueAt: string }> {
  const { tenantId, leadId, communicationId, reason, priority, triggerContent, aiAnalysis } = job.data;

  // Calculate SLA due time
  const slaHours = SLA_HOURS[priority];
  const slaDueAt = DateTime.now().plus({ hours: slaHours }).toJSDate();

  // Create review item
  const reviewId = uuidv4();
  
  await db.insert(humanReviewQueue).values({
    id: reviewId,
    tenantId,
    leadJourneyId: leadId,
    communicationId,
    reason,
    priority,
    triggerContent,
    aiAnalysis: aiAnalysis || {},
    suggestedResponse: aiAnalysis?.suggestedResponse,
    confidenceScore: aiAnalysis?.confidence,
    slaDueAt,
    status: 'PENDING',
  });

  // Update lead journey
  await db.update(goldLeadJourney)
    .set({
      requiresHumanReview: true,
      humanReviewReason: reason,
      humanReviewPriority: priority,
    })
    .where(eq(goldLeadJourney.leadId, leadId));

  // Notify team based on priority
  if (priority === 'URGENT' || priority === 'HIGH') {
    await sendSlackNotification({
      channel: '#sales-urgent',
      text: `🚨 ${priority} Review Required`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${priority} Priority Review*\nReason: ${reason}\nSLA: ${slaHours}h`,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Review Now' },
              url: `https://app.cerniq.app/outreach/review/${reviewId}`,
              style: 'danger',
            },
          ],
        },
      ],
    });
  }

  // Schedule SLA check
  await triggerQueue('hitl:sla:check', { reviewId }, {
    delay: slaHours * 60 * 60 * 1000, // Convert to ms
    jobId: `sla-check-${reviewId}`,
  });

  logger.info({
    reviewId,
    leadId,
    reason,
    priority,
    slaDueAt: slaDueAt.toISOString(),
  }, 'Review item created');

  return {
    reviewId,
    slaDueAt: slaDueAt.toISOString(),
  };
}
```

## 3.2 Worker: human:takeover:initiate

```typescript
// workers/human/takeover-initiate.worker.ts

interface TakeoverJobData {
  tenantId: string;
  leadId: string;
  userId: string;
  reason: string;
}

export async function takeoverInitiateProcessor(
  job: Job<TakeoverJobData>
): Promise<void> {
  const { leadId, userId, reason } = job.data;

  // Stop all automation
  await triggerQueue('sequence:stop', { leadId, reason: 'HUMAN_TAKEOVER' });

  // Update lead
  await db.update(goldLeadJourney)
    .set({
      isHumanControlled: true,
      assignedToUser: userId,
      sequencePaused: true,
      nextActionAt: null,
    })
    .where(eq(goldLeadJourney.leadId, leadId));

  // Log takeover
  await db.insert(hitlAuditLog).values({
    reviewId: job.data.reviewId,
    action: 'TAKEOVER_INITIATED',
    performedBy: userId,
    notes: reason,
  });

  logger.info({ leadId, userId, reason }, 'Human takeover initiated');
}
```

## 3.3 Worker: human:takeover:complete

```typescript
// workers/human/takeover-complete.worker.ts

interface TakeoverCompleteJobData {
  leadId: string;
  userId: string;
  returnToAutomation: boolean;
  newSequenceId?: string;
}

export async function takeoverCompleteProcessor(
  job: Job<TakeoverCompleteJobData>
): Promise<void> {
  const { leadId, userId, returnToAutomation, newSequenceId } = job.data;

  await db.update(goldLeadJourney)
    .set({
      isHumanControlled: false,
      requiresHumanReview: false,
      sequencePaused: !returnToAutomation,
      currentSequenceId: newSequenceId || null,
    })
    .where(eq(goldLeadJourney.leadId, leadId));

  if (returnToAutomation && newSequenceId) {
    await triggerQueue('sequence:enroll', { leadId, sequenceId: newSequenceId });
  }

  logger.info({ leadId, returnToAutomation }, 'Human takeover completed');
}
```

## 3.4 Worker: human:approve:message

```typescript
// workers/human/approve-message.worker.ts

interface ApproveMessageJobData {
  reviewId: string;
  leadId: string;
  userId: string;
  action: 'APPROVE' | 'EDIT' | 'REJECT';
  editedContent?: string;
  notes?: string;
}

export async function approveMessageProcessor(
  job: Job<ApproveMessageJobData>
): Promise<void> {
  const { reviewId, leadId, userId, action, editedContent, notes } = job.data;

  // Get review and journey
  const review = await db.query.humanReviewQueue.findFirst({
    where: eq(humanReviewQueue.id, reviewId),
  });

  const journey = await db.query.goldLeadJourney.findFirst({
    where: eq(goldLeadJourney.leadId, leadId),
  });

  // Update review status
  await db.update(humanReviewQueue)
    .set({
      status: 'RESOLVED',
      resolvedAt: new Date(),
      resolvedBy: userId,
      resolutionAction: action === 'EDIT' ? 'EDITED' : action,
      resolutionNotes: notes,
      responseSent: editedContent || review?.suggestedResponse,
    })
    .where(eq(humanReviewQueue.id, reviewId));

  // Take action based on decision
  if (action === 'APPROVE' || action === 'EDIT') {
    const content = editedContent || review?.suggestedResponse;
    
    if (content && journey?.assignedPhoneId) {
      // Send the approved/edited message
      const phone = await db.query.waPhoneNumbers.findFirst({
        where: eq(waPhoneNumbers.id, journey.assignedPhoneId),
      });
      
      await triggerQueue(`q:wa:phone_${phone?.phoneNumber.slice(-2)}:followup`, {
        leadId,
        chatId: journey.lastChatId,
        content,
        isHumanApproved: true,
        approvedBy: userId,
      });
    }
  }

  // Clear review flag
  await db.update(goldLeadJourney)
    .set({
      requiresHumanReview: false,
      humanReviewReason: null,
    })
    .where(eq(goldLeadJourney.leadId, leadId));

  // Audit log
  await db.insert(hitlAuditLog).values({
    reviewId,
    action: `MESSAGE_${action}`,
    performedBy: userId,
    notes,
    newState: { action, editedContent },
  });
}
```

---

# 4. SLA MANAGEMENT

## 4.1 SLA Check Worker

```typescript
// workers/human/sla-check.worker.ts

export async function slaCheckProcessor(
  job: Job<{ reviewId: string }>
): Promise<void> {
  const { reviewId } = job.data;

  const review = await db.query.humanReviewQueue.findFirst({
    where: eq(humanReviewQueue.id, reviewId),
  });

  if (!review || review.status !== 'PENDING') {
    return; // Already resolved
  }

  // Mark SLA breached
  await db.update(humanReviewQueue)
    .set({
      slaBreached: true,
    })
    .where(eq(humanReviewQueue.id, reviewId));

  // Escalate
  await triggerQueue('hitl:escalate', {
    reviewId,
    reason: 'SLA_BREACH',
    originalPriority: review.priority,
  });

  // Alert
  await triggerAlert('sla:breach', {
    reviewId,
    leadId: review.leadJourneyId,
    priority: review.priority,
    slaDueAt: review.slaDueAt,
  });
}
```

## 4.2 Escalation Worker

```typescript
// workers/human/escalate.worker.ts

interface EscalateJobData {
  reviewId: string;
  reason: 'SLA_BREACH' | 'MANUAL' | 'COMPLEXITY';
  originalPriority: string;
}

export async function escalateProcessor(
  job: Job<EscalateJobData>
): Promise<void> {
  const { reviewId, reason, originalPriority } = job.data;

  // Get escalation target (e.g., team lead)
  const escalationTarget = await getEscalationTarget(originalPriority);

  await db.update(humanReviewQueue)
    .set({
      status: 'ESCALATED',
      escalatedAt: new Date(),
      escalatedTo: escalationTarget.userId,
      priority: 'URGENT', // Escalations become urgent
    })
    .where(eq(humanReviewQueue.id, reviewId));

  // Notify escalation target
  await sendSlackNotification({
    channel: escalationTarget.slackChannel,
    text: `⚠️ Escalated Review - ${reason}`,
  });

  await sendEmailNotification({
    to: escalationTarget.email,
    subject: `[URGENT] Escalated Review - ${reason}`,
    template: 'escalation',
    data: { reviewId, reason },
  });
}

async function getEscalationTarget(priority: string): Promise<{
  userId: string;
  email: string;
  slackChannel: string;
}> {
  // Logic to determine escalation target based on priority and availability
  // Could be team lead, manager, etc.
  return {
    userId: 'team-lead-id',
    email: 'teamlead@company.com',
    slackChannel: '#escalations',
  };
}
```

---

# 5. REVIEW DASHBOARD API

## 5.1 Endpoints

```typescript
// apps/api/src/features/hitl/routes.ts

import { FastifyInstance } from 'fastify';
import { z } from 'zod';

export async function hitlRoutes(fastify: FastifyInstance) {
  
  // GET /api/v1/hitl/reviews - List review items
  fastify.get('/reviews', {
    schema: {
      querystring: z.object({
        status: z.enum(['PENDING', 'ASSIGNED', 'RESOLVED', 'ESCALATED']).optional(),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
        assignedTo: z.string().uuid().optional(),
        page: z.coerce.number().default(1),
        limit: z.coerce.number().default(20),
      }),
    },
  }, async (request) => {
    const { status, priority, assignedTo, page, limit } = request.query;
    
    const where = and(
      eq(humanReviewQueue.tenantId, request.tenantId),
      status ? eq(humanReviewQueue.status, status) : undefined,
      priority ? eq(humanReviewQueue.priority, priority) : undefined,
      assignedTo ? eq(humanReviewQueue.assignedTo, assignedTo) : undefined,
    );
    
    const [items, total] = await Promise.all([
      db.select()
        .from(humanReviewQueue)
        .where(where)
        .orderBy(desc(humanReviewQueue.priority), asc(humanReviewQueue.slaDueAt))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ count: count() })
        .from(humanReviewQueue)
        .where(where),
    ]);
    
    return {
      items,
      meta: {
        page,
        limit,
        total: total[0].count,
        pages: Math.ceil(total[0].count / limit),
      },
    };
  });

  // GET /api/v1/hitl/reviews/:id - Get review detail
  fastify.get('/reviews/:id', async (request) => {
    const { id } = request.params;
    
    const review = await db.query.humanReviewQueue.findFirst({
      where: and(
        eq(humanReviewQueue.id, id),
        eq(humanReviewQueue.tenantId, request.tenantId),
      ),
      with: {
        leadJourney: {
          with: {
            goldCompany: true,
            communications: {
              limit: 10,
              orderBy: desc(goldCommunicationLog.createdAt),
            },
          },
        },
      },
    });
    
    return review;
  });

  // POST /api/v1/hitl/reviews/:id/assign - Assign to user
  fastify.post('/reviews/:id/assign', {
    schema: {
      body: z.object({
        userId: z.string().uuid(),
      }),
    },
  }, async (request) => {
    const { id } = request.params;
    const { userId } = request.body;
    
    await db.update(humanReviewQueue)
      .set({
        assignedTo: userId,
        assignedAt: new Date(),
        status: 'ASSIGNED',
      })
      .where(eq(humanReviewQueue.id, id));
    
    return { success: true };
  });

  // POST /api/v1/hitl/reviews/:id/resolve - Resolve review
  fastify.post('/reviews/:id/resolve', {
    schema: {
      body: z.object({
        action: z.enum(['APPROVED', 'REJECTED', 'EDITED', 'TAKEOVER', 'IGNORED']),
        notes: z.string().optional(),
        editedContent: z.string().optional(),
      }),
    },
  }, async (request) => {
    const { id } = request.params;
    const { action, notes, editedContent } = request.body;
    
    await triggerQueue('human:approve:message', {
      reviewId: id,
      leadId: review.leadJourneyId,
      userId: request.userId,
      action,
      editedContent,
      notes,
    });
    
    return { success: true };
  });

  // GET /api/v1/hitl/stats - Dashboard stats
  fastify.get('/stats', async (request) => {
    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
        COUNT(*) FILTER (WHERE status = 'ASSIGNED') as assigned,
        COUNT(*) FILTER (WHERE status = 'ESCALATED') as escalated,
        COUNT(*) FILTER (WHERE sla_breached = TRUE) as sla_breached,
        COUNT(*) FILTER (WHERE priority = 'URGENT') as urgent,
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/60) 
          FILTER (WHERE resolved_at IS NOT NULL) as avg_resolution_minutes
      FROM human_review_queue
      WHERE tenant_id = ${request.tenantId}
        AND created_at > NOW() - INTERVAL '24 hours'
    `);
    
    return stats[0];
  });
}
```

---

# 6. METRICS & ALERTS

## 6.1 HITL Metrics

```typescript
// Prometheus metrics
const hitlPending = new Gauge({
  name: 'cerniq_hitl_pending_total',
  help: 'Number of pending review items',
  labelNames: ['tenant_id', 'priority'],
});

const hitlResolutionTime = new Histogram({
  name: 'cerniq_hitl_resolution_seconds',
  help: 'Time to resolve review items',
  labelNames: ['priority', 'action'],
  buckets: [60, 300, 900, 3600, 14400, 86400], // 1m, 5m, 15m, 1h, 4h, 24h
});

const hitlSlaBreaches = new Counter({
  name: 'cerniq_hitl_sla_breaches_total',
  help: 'Number of SLA breaches',
  labelNames: ['priority'],
});
```

---

**Document generat:** 15 Ianuarie 2026
**Total Workers HITL:** 6
**Conformitate:** Master Spec v1.2, Unified HITL System
