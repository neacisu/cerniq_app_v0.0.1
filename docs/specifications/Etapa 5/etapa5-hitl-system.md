# CERNIQ.APP — ETAPA 5: HITL SYSTEM
## Human-in-the-Loop pentru Nurturing Agentic
### Versiunea 1.1 | 20 Ianuarie 2026

---

> **IMPORTANT:** Acest document utilizează sistemul **HITL UNIFICAT** conform [Master Specification](../master-specification.md) § 5 și [hitl-unified-system.md](../hitl-unified-system.md).
>
> ⚠️ **DEPRECATED:** Schema `gold_hitl_tasks_e5` a fost eliminată. Toate task-urile HITL din Etapa 5 folosesc tabela canonică `approval_tasks` cu `pipeline_stage='E5'`.

---

## 1. HITL Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ETAPA 5 - HITL INTEGRATION                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         TASK SOURCES (E5)                                │   │
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
│  │              UNIFIED HITL ENGINE (approval_tasks)                        │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                          │   │
│  │  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐           │   │
│  │  │ Task Router   │───►│ SLA Manager   │───►│ Assignment    │           │   │
│  │  │ pipeline_stage│    │ approval_type │    │ Engine        │           │   │
│  │  │ = 'E5'        │    │ _configs      │    │               │           │   │
│  │  └───────────────┘    └───────────────┘    └───────────────┘           │   │
│  │                                                                          │   │
│  │  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐           │   │
│  │  │ Escalation    │◄───│ Resolution    │───►│ Audit Logger  │           │   │
│  │  │ Handler       │    │ Processor     │    │               │           │   │
│  │  └───────────────┘    └───────────────┘    └───────────────┘           │   │
│  │                                                                          │   │
│  │  📌 Schema: approval_tasks (vezi hitl-unified-system.md § 3)            │   │
│  │  📌 Config: approval_type_configs (vezi hitl-unified-system.md § 4.2)   │   │
│  │                                                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                    UNIFIED HITL INBOX (all stages)                       │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │ Queue View  │  │ Task Detail │  │ Resolution  │  │ Analytics   │    │   │
│  │  │ filter: E5  │  │             │  │ Dialog      │  │ Dashboard   │    │   │
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

## 3. SLA Configuration (via approval_type_configs)

> **REFERINȚĂ CANONICĂ:** SLA-urile sunt definite în tabela `approval_type_configs`. Vezi [hitl-unified-system.md § 4.2](../hitl-unified-system.md#42-schema-approval_type_configs).

### 3.1 SLA Mapping pentru Etapa 5

| approval_type | Priority | SLA (minute) | Escalate After | Timeout Action |
|---------------|----------|--------------|----------------|----------------|
| `churn_intervention` | critical | 120 (2h) | 60 (1h) | escalate → VP |
| `churn_intervention` | high | 1440 (24h) | 720 (12h) | escalate |
| `nps_followup` | high | 1440 (24h) | 720 (12h) | escalate |
| `nps_followup` | normal | 2880 (48h) | 1440 (24h) | escalate |
| `referral_approval` | normal | 2880 (48h) | 2160 (36h) | escalate |
| `winback_call` | high | 1440 (24h) | 720 (12h) | escalate |
| `cluster_strategy` | normal | 10080 (7d) | 7200 (5d) | escalate |
| `cluster_strategy` | low | 20160 (14d) | 14400 (10d) | defer |
| `compliance_review` | high | 240 (4h) | 120 (2h) | escalate → Legal |

### 3.2 Configurare în approval_type_configs

```sql
-- Query pentru a vedea configurațiile E5:
SELECT 
    approval_type,
    display_name,
    sla_critical,
    sla_high,
    sla_normal,
    sla_low,
    escalation_chain
FROM approval_type_configs
WHERE pipeline_stage = 'E5';
```

### 3.3 Helper TypeScript (Convenience Wrapper)

```typescript
// utils/hitl/e5-sla-helper.ts
import { getApprovalTypeConfig } from '@cerniq/hitl-unified';

export async function getE5SlaMinutes(
  approvalType: E5ApprovalType, 
  priority: Priority
): Promise<number> {
  const config = await getApprovalTypeConfig(approvalType);
  return config[`sla_${priority}`] ?? config.sla_normal;
}

// Type safety pentru approval types E5
export type E5ApprovalType = 
  | 'churn_intervention'
  | 'nps_followup'
  | 'referral_approval'
  | 'winback_call'
  | 'cluster_strategy'
  | 'compliance_review';
```

---

## 4. HITL Database Schema

> **REFERINȚĂ CANONICĂ:** Schema HITL este definită în [hitl-unified-system.md § 3](../hitl-unified-system.md#3-schema-approval_tasks).
>
> ⚠️ **DEPRECATED:** Tabela `gold_hitl_tasks_e5` a fost **eliminată**. Nu mai există tabele HITL per-etapă.

### 4.1 Tabela Canonică: `approval_tasks`

Etapa 5 folosește tabela unificată `approval_tasks` cu următorul pattern:

```sql
-- Task-urile E5 sunt identificate prin:
--   pipeline_stage = 'E5'
--   approval_type IN ('churn_intervention', 'nps_followup', 'referral_approval', 
--                     'winback_call', 'cluster_strategy', 'compliance_review')

-- Exemplu query pentru inbox E5:
SELECT * FROM approval_tasks
WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
  AND pipeline_stage = 'E5'
  AND status IN ('pending', 'assigned', 'in_review')
ORDER BY priority DESC, due_at ASC;
```

### 4.2 Mapping Câmpuri E5 → approval_tasks

| Câmp Legacy (gold_hitl_tasks_e5) | Câmp Canonic (approval_tasks) | Note |
|----------------------------------|-------------------------------|------|
| `task_type` | `approval_type` | Vezi § 4.3 pentru tipuri E5 |
| `priority` (CRITICAL/HIGH/NORMAL/LOW) | `priority` (critical/high/normal/low) | Lowercase în canonic |
| `sla_deadline` | `due_at` | Calculat din `sla_minutes` |
| `sla_status` | Calculat din `due_at - NOW()` | Vezi SLA functions în unified |
| `client_id` | `metadata.client_id` | Stocat în JSONB |
| `entity_type`, `entity_id` | `entity_type`, `entity_id` | Identic |
| `context` | `metadata` | JSONB flexibil |
| `status` (PENDING/IN_PROGRESS/RESOLVED) | `status` (pending/assigned/in_review/approved/rejected) | State machine extins |
| `resolution` | `decision` | APPROVED/REJECTED |
| `resolution_notes` | `decision_reason` | Text |
| `resolved_by` | `decided_by` | UUID user |
| `resolved_at` | `decided_at` | Timestamp |
| `escalation_level` | `current_level` | Integer |
| `correlation_id` | `correlation_id` | Identic |
| `source_worker` | `metadata.source_worker` | Stocat în JSONB |

### 4.3 Approval Types pentru Etapa 5

```sql
-- Configurații specifice E5 în approval_type_configs
INSERT INTO approval_type_configs (approval_type, display_name, pipeline_stage, sla_normal, sla_high, sla_critical) VALUES
    ('churn_intervention', 'Intervenție Churn', 'E5', 1440, 480, 120),     -- 24h/8h/2h
    ('nps_followup', 'NPS Followup Detractor', 'E5', 2880, 1440, NULL),    -- 48h/24h
    ('referral_approval', 'Aprobare Referral', 'E5', 2880, NULL, NULL),    -- 48h
    ('winback_call', 'Win-Back Call Review', 'E5', 1440, NULL, NULL),      -- 24h
    ('cluster_strategy', 'Strategie Cluster', 'E5', 10080, 5040, NULL),    -- 1w/3.5d
    ('compliance_review', 'Review Compliance', 'E5', 240, NULL, NULL);     -- 4h
```

---

## 5. HITL Workers (Unified Pattern)

> **REFERINȚĂ:** Pentru implementarea completă a workerilor HITL, vezi [hitl-unified-system.md § 8](../hitl-unified-system.md#8-workers-hitl).

### L1: hitl:task:create (Pattern Unificat pentru E5)

```typescript
import { createApprovalTask, getApprovalTypeConfig } from '@cerniq/hitl-unified';

export const hitlTaskCreateWorker = new Worker(
  'hitl',
  async (job) => {
    const { tenantId, approvalType, priority, clientId, entityId, context, sourceWorker } = job.data;
    
    // Get SLA from unified config
    const config = await getApprovalTypeConfig(approvalType);
    const slaMinutes = config[`sla_${priority}`] || config.sla_normal;
    
    // Create task in UNIFIED approval_tasks table
    const task = await createApprovalTask({
      tenant_id: tenantId,
      entity_type: 'nurturing_client',
      entity_id: entityId,
      pipeline_stage: 'E5',                    // ← Marker pentru Etapa 5
      approval_type: approvalType,             // ← churn_intervention, nps_followup, etc.
      bullmq_job_id: job.id,
      bullmq_queue_name: job.queueName,
      correlation_id: job.data.correlationId,
      priority: priority.toLowerCase(),        // ← lowercase în schema canonică
      sla_minutes: slaMinutes,
      metadata: {
        client_id: clientId,
        source_worker: sourceWorker,
        ...context
      }
    });
    
    // Auto-assign if configured (via unified assignment engine)
    if (config.auto_assign_rules?.length > 0) {
      await hitlQueue.add('hitl:auto:assign', { taskId: task.id });
    }
    
    // Notification via unified service
    await notificationService.notifyHitlTask(task);
    
    return { taskId: task.id };
  }
);
```

### L2: hitl:task:resolve (Pattern Unificat pentru E5)

```typescript
import { resolveApprovalTask } from '@cerniq/hitl-unified';

export const hitlTaskResolveWorker = new Worker(
  'hitl',
  async (job) => {
    const { taskId, decision, reason, decidedBy, followupAt } = job.data;
    
    // Resolve task in UNIFIED approval_tasks table
    const task = await resolveApprovalTask(taskId, {
      decision,                    // 'approved' | 'rejected'
      decision_reason: reason,
      decided_by: decidedBy,       // UUID user.id
      decided_at: new Date()
    });
    
    // Trigger downstream actions based on approval_type and decision
    if (task.approval_type === 'referral_approval' && decision === 'approved') {
      await referralQueue.add('referral:outreach:execute', {
        referralId: task.entity_id
      });
    }
    
    if (task.approval_type === 'winback_call' && decision === 'approved') {
      const campaignId = task.metadata?.campaignId;
      await winbackQueue.add('winback:step:execute', {
        campaignId,
        stepIndex: 'OFFER'
      });
    }
    
    // Schedule followup if needed (creates new task in approval_tasks)
    if (followupAt) {
      await hitlQueue.add('hitl:task:create', {
        tenantId: task.tenant_id,
        approvalType: 'nps_followup',
        priority: 'normal',
        clientId: task.metadata?.client_id,
        entityId: task.entity_id,
        context: { originalTaskId: taskId, followupReason: reason }
      }, {
        delay: new Date(followupAt).getTime() - Date.now()
      });
    }
    
    // Resume BullMQ job if waiting
    if (task.bullmq_job_id && task.bullmq_queue_name) {
      await resumeWaitingJob(task.bullmq_queue_name, task.bullmq_job_id, {
        decision,
        taskId: task.id
      });
    }
    
    // Audit trail (unified)
    await complianceQueue.add('audit:trail:record', {
      action: 'HITL_RESOLUTION',
      entityType: 'approval_task',
      entityId: taskId,
      pipelineStage: 'E5',
      details: { decision, decidedBy }
    });
    
    return { resolved: true };
  }
);
```

### L3: hitl:sla:monitor (Unified SLA Worker)

```typescript
// SLA monitoring este gestionat de sistemul HITL unificat.
// Vezi hitl-unified-system.md § 5 pentru SLA calculation și escalation.

// Worker-ul E5 doar înregistrează task-uri; SLA monitoring e centralizat:
// - hitl:sla:scan - Cron job global pentru toate etapele
// - hitl:escalate - Handler escalare unificat

// Configurația SLA pentru E5 este în approval_type_configs:
// SELECT * FROM approval_type_configs WHERE pipeline_stage = 'E5';
```

---

## 6. HITL UI Components (Unified Inbox)

> **REFERINȚĂ:** UI-ul HITL este unificat pentru toate etapele. Componentele folosesc filtre pentru `pipeline_stage='E5'`.
>
> Vezi [hitl-unified-system.md § 7](../hitl-unified-system.md#7-api-endpoints) pentru API-ul UI.

### 6.1 Unified HITL Inbox cu filtru E5

```typescript
// Accesare inbox pentru Etapa 5:
// GET /api/v1/hitl/queue?pipelineStage=E5

interface HITLQueueParams {
  pipelineStage?: ('E1' | 'E2' | 'E3' | 'E4' | 'E5')[];  // Filter pentru E5
  approvalType?: string[];     // e.g., ['churn_intervention', 'nps_followup']
  priority?: ('critical' | 'high' | 'normal' | 'low')[];
  status?: ('pending' | 'assigned' | 'in_review')[];
  assignedTo?: string;         // UUID
  slaStatus?: 'ok' | 'warning' | 'breached';
}
```

### 6.2 TaskQueueTable (Unified Component)

```typescript
// Componenta este aceeași pentru toate etapele - doar filtrul diferă
const E5TaskQueue = () => (
  <UnifiedHITLQueue 
    defaultFilters={{ pipelineStage: ['E5'] }}
    columns={[
      { key: 'priority', header: '', render: PriorityIndicator, width: 40 },
      { key: 'approval_type', header: 'Type', render: ApprovalTypeBadge },
      { key: 'metadata.client_name', header: 'Client' },
      { key: 'due_at', header: 'SLA', render: SlaCountdown },
      { key: 'assigned_to', header: 'Assigned', render: UserAvatar },
      { key: 'created_at', header: 'Created', render: RelativeTime },
      { key: 'actions', header: '', render: ActionsDropdown }
    ]}
  />
);
```

### 6.3 TaskResolutionDialog (Unified)

```typescript
// Dialog de rezoluție folosește approval_type pentru a determina opțiunile
interface ResolveApprovalTaskRequest {
  decision: 'approved' | 'rejected';
  decision_reason?: string;
  // Extensii E5-specifice în metadata response:
  metadata_updates?: {
    action_taken?: string;
    followup_scheduled?: boolean;
    followup_at?: string;
  };
}

// Opțiunile de rezoluție sunt configurate per approval_type în approval_type_configs.required_fields
```

---

## 7. Migration de la gold_hitl_tasks_e5 la approval_tasks

> **NOTĂ:** Această secțiune documentează migrarea conceptuală. Schema `gold_hitl_tasks_e5` nu mai există.

### 7.1 Checklist Migrare Cod

- [x] Înlocuit `gold_hitl_tasks_e5` cu `approval_tasks`
- [x] Adăugat `pipeline_stage = 'E5'` la toate inserțiile
- [x] Convertit `task_type` în `approval_type` (lowercase, snake_case)
- [x] Mutat `client_id` și `source_worker` în `metadata` JSONB
- [x] Actualizat queries pentru noul naming (`sla_deadline` → `due_at`)
- [x] Aliniat statusuri: PENDING→pending, IN_PROGRESS→in_review, RESOLVED→approved/rejected

### 7.2 Backward Compatibility

```typescript
// Helper pentru tranziție (deprecated - doar pentru referință)
function mapLegacyTaskType(legacyType: string): E5ApprovalType {
  const mapping: Record<string, E5ApprovalType> = {
    'CHURN_INTERVENTION': 'churn_intervention',
    'NPS_FOLLOWUP': 'nps_followup',
    'REFERRAL_APPROVAL': 'referral_approval',
    'WINBACK_CALL': 'winback_call',
    'CLUSTER_STRATEGY': 'cluster_strategy',
    'COMPLIANCE_REVIEW': 'compliance_review'
  };
  return mapping[legacyType] ?? 'compliance_review';
}
```

---

## REFERINȚE

| Document | Secțiuni Relevante |
|----------|-------------------|
| [`master-specification.md`](../master-specification.md) | § 5 HITL Core Contract |
| [`hitl-unified-system.md`](../hitl-unified-system.md) | § 3 Schema, § 4 Approval Types, § 7 API |
| [`architecture.md`](../../architecture/architecture.md) | § 5.3 Unified HITL |

---

**Document generat**: 2026-01-20  
**Versiunea**: 1.1 (Aliniat la HITL Unificat)  
**Status**: ACTUALIZAT ✅
