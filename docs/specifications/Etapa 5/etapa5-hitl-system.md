# CERNIQ.APP — ETAPA 5: HITL SYSTEM
## Human-in-the-Loop pentru Nurturing Agentic
### Versiunea 1.0 | 19 Ianuarie 2026

---

## 1. HITL Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ETAPA 5 - HITL SYSTEM                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         TASK SOURCES                                     │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │ Churn Risk  │  │ NPS Detract │  │ Referral    │  │ Win-Back    │    │   │
│  │  │ Escalation  │  │ Followup    │  │ Approval    │  │ Review      │    │   │
│  │  │ B11         │  │ H44         │  │ E27         │  │ F32         │    │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │   │
│  │         │                │                │                │            │   │
│  │         └────────────────┴────────────────┴────────────────┘            │   │
│  │                                    │                                     │   │
│  │                                    ▼                                     │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                      UNIFIED HITL ENGINE                                 │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                          │   │
│  │  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐           │   │
│  │  │ Task Router   │───►│ SLA Manager   │───►│ Assignment    │           │   │
│  │  │               │    │               │    │ Engine        │           │   │
│  │  └───────────────┘    └───────────────┘    └───────────────┘           │   │
│  │                                                                          │   │
│  │  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐           │   │
│  │  │ Escalation    │◄───│ Resolution    │───►│ Audit Logger  │           │   │
│  │  │ Handler       │    │ Processor     │    │               │           │   │
│  │  └───────────────┘    └───────────────┘    └───────────────┘           │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         HITL DASHBOARD                                   │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │ Queue View  │  │ Task Detail │  │ Resolution  │  │ Analytics   │    │   │
│  │  │             │  │             │  │ Dialog      │  │ Dashboard   │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Task Types pentru Etapa 5

### 2.1 CHURN_INTERVENTION
```typescript
interface ChurnInterventionTask {
  taskType: 'CHURN_INTERVENTION';
  priority: 'CRITICAL' | 'HIGH';
  sla: {
    critical: '2 hours',
    high: '24 hours'
  };
  context: {
    clientId: string;
    clientName: string;
    churnScore: number;
    riskLevel: string;
    topSignals: ChurnSignal[];
    lastOrderAt: Date;
    totalRevenue: number;
    recommendedActions: string[];
  };
  resolutionOptions: [
    'CALL_SCHEDULED',
    'EMAIL_SENT',
    'OFFER_MADE',
    'FALSE_POSITIVE',
    'ESCALATED_TO_MANAGER'
  ];
}
```

### 2.2 NPS_FOLLOWUP
```typescript
interface NpsFollowupTask {
  taskType: 'NPS_FOLLOWUP';
  priority: 'HIGH' | 'NORMAL';
  sla: {
    high: '24 hours',    // NPS 0-3
    normal: '48 hours'   // NPS 4-6
  };
  context: {
    clientId: string;
    npsScore: number;
    npsCategory: 'DETRACTOR';
    openFeedback: string;
    feedbackTopics: string[];
    relatedOrderId?: string;
    previousNpsScores: number[];
  };
  resolutionOptions: [
    'ISSUE_RESOLVED',
    'COMPENSATION_OFFERED',
    'ESCALATED_TO_SUPPORT',
    'NO_ACTION_NEEDED'
  ];
}
```

### 2.3 REFERRAL_APPROVAL
```typescript
interface ReferralApprovalTask {
  taskType: 'REFERRAL_APPROVAL';
  priority: 'NORMAL';
  sla: {
    normal: '48 hours'
  };
  context: {
    referralId: string;
    referrerName: string;
    referrerClientId: string;
    referredName: string;
    referredPhone?: string;
    relationshipDescription: string;
    contextMessage: string;
    referralType: ReferralType;
    distanceKm?: number;
    suggestedApproachScript: string;
  };
  resolutionOptions: [
    'APPROVED',
    'REJECTED_INVALID_CONTACT',
    'REJECTED_COMPLIANCE',
    'NEEDS_MORE_INFO'
  ];
}
```

### 2.4 RECOVERY_CALL / WINBACK_CALL
```typescript
interface WinbackCallTask {
  taskType: 'WINBACK_CALL';
  priority: 'HIGH';
  sla: {
    high: '24 hours'
  };
  context: {
    clientId: string;
    clientName: string;
    campaignId: string;
    campaignType: string;
    daysDormant: number;
    lastOrderValue: number;
    totalHistoricalRevenue: number;
    suggestedOffer: {
      type: string;
      value: number;
    };
    talkingPoints: string[];
  };
  resolutionOptions: [
    'CALL_COMPLETED_INTERESTED',
    'CALL_COMPLETED_NOT_INTERESTED',
    'CALL_SCHEDULED',
    'NO_ANSWER_RETRY',
    'WRONG_NUMBER'
  ];
}
```

### 2.5 CLUSTER_STRATEGY
```typescript
interface ClusterStrategyTask {
  taskType: 'CLUSTER_STRATEGY';
  priority: 'NORMAL' | 'LOW';
  sla: {
    normal: '1 week',
    low: '2 weeks'
  };
  context: {
    clusterId: string;
    clusterName: string;
    clusterType: ClusterType;
    memberCount: number;
    currentPenetration: number;
    kolClientId?: string;
    kolName?: string;
    topProspects: Array<{
      name: string;
      distanceKm: number;
      relationshipToKol?: string;
    }>;
    suggestedStrategy: string;
  };
  resolutionOptions: [
    'STRATEGY_APPROVED',
    'STRATEGY_MODIFIED',
    'CLUSTER_TOO_SMALL',
    'DEFER_TO_NEXT_QUARTER'
  ];
}
```

### 2.6 COMPLIANCE_REVIEW
```typescript
interface ComplianceReviewTask {
  taskType: 'COMPLIANCE_REVIEW';
  priority: 'HIGH';
  sla: {
    high: '4 hours'
  };
  context: {
    reviewType: 'COMPETITOR_INTEL' | 'GDPR_CONSENT' | 'PRICE_DATA';
    entityId: string;
    flaggedContent: string;
    flagReason: string;
    suggestedAction: string;
  };
  resolutionOptions: [
    'APPROVED',
    'REDACTED',
    'DELETED',
    'ESCALATED_TO_LEGAL'
  ];
}
```

---

## 3. SLA Configuration

```typescript
// configs/hitl/etapa5-sla.ts
export const ETAPA5_HITL_SLA = {
  CHURN_INTERVENTION: {
    CRITICAL: { hours: 2, escalateAfter: 1 },
    HIGH: { hours: 24, escalateAfter: 12 }
  },
  NPS_FOLLOWUP: {
    HIGH: { hours: 24, escalateAfter: 12 },
    NORMAL: { hours: 48, escalateAfter: 24 }
  },
  REFERRAL_APPROVAL: {
    NORMAL: { hours: 48, escalateAfter: 36 }
  },
  WINBACK_CALL: {
    HIGH: { hours: 24, escalateAfter: 12 }
  },
  CLUSTER_STRATEGY: {
    NORMAL: { days: 7, escalateAfter: 5 },
    LOW: { days: 14, escalateAfter: 10 }
  },
  COMPLIANCE_REVIEW: {
    HIGH: { hours: 4, escalateAfter: 2 }
  }
};
```

---

## 4. HITL Database Schema

```sql
CREATE TABLE gold_hitl_tasks_e5 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Task Identity
    task_type VARCHAR(50) NOT NULL,
    task_number SERIAL,
    
    -- Priority & SLA
    priority VARCHAR(20) NOT NULL,
    sla_deadline TIMESTAMPTZ NOT NULL,
    sla_warning_at TIMESTAMPTZ,
    sla_status VARCHAR(20) DEFAULT 'OK',  -- OK, WARNING, BREACHED
    
    -- References
    client_id UUID REFERENCES gold_clients(id),
    entity_type VARCHAR(30),
    entity_id UUID,
    
    -- Assignment
    assigned_to UUID REFERENCES users(id),
    assigned_at TIMESTAMPTZ,
    assignment_method VARCHAR(30),  -- AUTO, MANUAL, ROUND_ROBIN
    
    -- Context (polymorphic JSONB)
    context JSONB NOT NULL,
    
    -- Resolution
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING, IN_PROGRESS, RESOLVED, EXPIRED
    resolution VARCHAR(50),
    resolution_notes TEXT,
    action_taken TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    
    -- Followup
    followup_scheduled BOOLEAN DEFAULT FALSE,
    followup_at TIMESTAMPTZ,
    followup_task_id UUID REFERENCES gold_hitl_tasks_e5(id),
    
    -- Escalation
    escalation_level INTEGER DEFAULT 0,
    escalated_at TIMESTAMPTZ,
    escalated_to UUID REFERENCES users(id),
    escalation_reason TEXT,
    
    -- Correlation
    correlation_id UUID,
    source_worker VARCHAR(100),
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_hitl_e5_tenant_status ON gold_hitl_tasks_e5(tenant_id, status, priority);
CREATE INDEX idx_hitl_e5_assigned ON gold_hitl_tasks_e5(assigned_to, status);
CREATE INDEX idx_hitl_e5_sla ON gold_hitl_tasks_e5(sla_deadline) WHERE status = 'PENDING';
CREATE INDEX idx_hitl_e5_client ON gold_hitl_tasks_e5(client_id);
```

---

## 5. HITL Workers

### L1: hitl:task:create
```typescript
export const hitlTaskCreateWorker = new Worker(
  'hitl',
  async (job) => {
    const { tenantId, taskType, priority, clientId, entityId, context, sourceWorker } = job.data;
    
    // Calculate SLA deadline
    const slaConfig = ETAPA5_HITL_SLA[taskType][priority];
    const slaDeadline = slaConfig.hours 
      ? addHours(new Date(), slaConfig.hours)
      : addDays(new Date(), slaConfig.days);
    
    const slaWarningAt = slaConfig.hours
      ? addHours(new Date(), slaConfig.escalateAfter)
      : addDays(new Date(), slaConfig.escalateAfter);
    
    // Create task
    const task = await db.insert(goldHitlTasksE5).values({
      tenantId,
      taskType,
      priority,
      slaDeadline,
      slaWarningAt,
      clientId,
      entityId,
      context,
      sourceWorker,
      correlationId: job.data.correlationId
    }).returning();
    
    // Auto-assign if configured
    const assignee = await autoAssign(tenantId, taskType);
    if (assignee) {
      await db.update(goldHitlTasksE5)
        .set({ assignedTo: assignee, assignedAt: new Date(), assignmentMethod: 'AUTO' })
        .where(eq(goldHitlTasksE5.id, task.id));
    }
    
    // Schedule SLA warning check
    await hitlQueue.add('hitl:sla:check', { taskId: task.id }, {
      delay: slaWarningAt.getTime() - Date.now()
    });
    
    // Send notification
    await notificationService.notifyHitlTask(task);
    
    return { taskId: task.id };
  }
);
```

### L2: hitl:task:resolve
```typescript
export const hitlTaskResolveWorker = new Worker(
  'hitl',
  async (job) => {
    const { taskId, resolution, notes, actionTaken, resolvedBy, followupAt } = job.data;
    
    // Update task
    await db.update(goldHitlTasksE5)
      .set({
        status: 'RESOLVED',
        resolution,
        resolutionNotes: notes,
        actionTaken,
        resolvedBy,
        resolvedAt: new Date(),
        followupScheduled: !!followupAt,
        followupAt
      })
      .where(eq(goldHitlTasksE5.id, taskId));
    
    // Get task for context
    const task = await db.query.goldHitlTasksE5.findFirst({
      where: eq(goldHitlTasksE5.id, taskId)
    });
    
    // Trigger downstream actions based on task type and resolution
    if (task.taskType === 'REFERRAL_APPROVAL' && resolution === 'APPROVED') {
      await referralQueue.add('referral:outreach:execute', {
        referralId: task.entityId
      });
    }
    
    if (task.taskType === 'WINBACK_CALL' && resolution === 'CALL_COMPLETED_INTERESTED') {
      await winbackQueue.add('winback:step:execute', {
        campaignId: task.context.campaignId,
        stepIndex: 'OFFER'
      });
    }
    
    // Schedule followup if needed
    if (followupAt) {
      await hitlQueue.add('hitl:task:create', {
        tenantId: task.tenantId,
        taskType: 'FOLLOWUP',
        priority: 'NORMAL',
        clientId: task.clientId,
        context: { originalTaskId: taskId, followupReason: notes }
      }, {
        delay: new Date(followupAt).getTime() - Date.now()
      });
    }
    
    // Audit trail
    await complianceQueue.add('audit:trail:record', {
      action: 'HITL_RESOLUTION',
      entityType: 'HITL_TASK',
      entityId: taskId,
      details: { resolution, actionTaken, resolvedBy }
    });
    
    return { resolved: true };
  }
);
```

### L3: hitl:sla:check
```typescript
export const hitlSlaCheckWorker = new Worker(
  'hitl',
  async (job) => {
    const { taskId } = job.data;
    
    const task = await db.query.goldHitlTasksE5.findFirst({
      where: eq(goldHitlTasksE5.id, taskId)
    });
    
    if (!task || task.status !== 'PENDING') return { skipped: true };
    
    const now = new Date();
    
    if (now >= task.slaDeadline) {
      // SLA Breached
      await db.update(goldHitlTasksE5)
        .set({ slaStatus: 'BREACHED' })
        .where(eq(goldHitlTasksE5.id, taskId));
      
      await hitlQueue.add('hitl:escalate', { taskId, reason: 'SLA_BREACHED' });
    } else if (now >= task.slaWarningAt) {
      // SLA Warning
      await db.update(goldHitlTasksE5)
        .set({ slaStatus: 'WARNING' })
        .where(eq(goldHitlTasksE5.id, taskId));
      
      await notificationService.notifySlaWarning(task);
      
      // Schedule final check
      await hitlQueue.add('hitl:sla:check', { taskId }, {
        delay: task.slaDeadline.getTime() - Date.now()
      });
    }
    
    return { checked: true, slaStatus: task.slaStatus };
  }
);
```

---

## 6. HITL UI Components

### TaskQueueTable
```typescript
interface TaskQueueTableProps {
  tasks: HITLTask[];
  onResolve: (taskId: string) => void;
  onAssign: (taskId: string, userId: string) => void;
  filters: {
    taskType?: string[];
    priority?: string[];
    status?: string[];
    assignedTo?: string;
  };
}

const columns = [
  { key: 'priority', header: '', render: PriorityIndicator, width: 40 },
  { key: 'taskType', header: 'Type', render: TaskTypeBadge },
  { key: 'clientName', header: 'Client' },
  { key: 'slaDeadline', header: 'SLA', render: SlaCountdown },
  { key: 'assignedTo', header: 'Assigned', render: UserAvatar },
  { key: 'createdAt', header: 'Created', render: RelativeTime },
  { key: 'actions', header: '', render: ActionsDropdown }
];
```

### TaskResolutionDialog
```typescript
interface TaskResolutionDialogProps {
  task: HITLTask;
  isOpen: boolean;
  onClose: () => void;
  onResolve: (resolution: Resolution) => void;
}

// Shows:
// - Full task context
// - Resolution options based on task type
// - Notes field
// - Action taken field
// - Optional followup scheduling
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
