# CERNIQ.APP — UNIFIED HITL APPROVAL SYSTEM

## Human-in-the-Loop System Transversal pentru Toate Etapele

### Versiunea 1.0 | 19 Ianuarie 2026

---

**DOCUMENT STATUS:** NORMATIV — Subordonat Master Spec v1.2  
**SCOPE:** Sistem centralizat de aprobări umane pentru toate cele 5 etape  
**SURSA CANONICĂ:** [`master-specification.md`](./master-specification.md) § 5 HITL Core Contract

---

## CUPRINS

1. [Overview](#1-overview)
2. [Principiu Arhitectural](#2-principiu-arhitectural)
3. [Schema approval_tasks](#3-schema-approval_tasks)
4. [Approval Types per Etapă](#4-approval-types-per-etapă)
5. [SLA Tiers și Escalation](#5-sla-tiers-și-escalation)
6. [State Machine](#6-state-machine)
7. [API Endpoints](#7-api-endpoints)
8. [Workers HITL](#8-workers-hitl)
9. [KPIs și Monitoring](#9-kpis-și-monitoring)
10. [Migration Guide](#10-migration-guide)

---

## 1. OVERVIEW

### 1.1 Ce este HITL?

**Human-in-the-Loop (HITL)** este un sistem centralizat care permite intervenția umană în procesele automate ale platformei Cerniq.app.

### 1.2 De ce un sistem unificat?

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                     UNIFIED HITL APPROVAL ENGINE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐    │
│    │ ETAPA 1 │   │ ETAPA 2 │   │ ETAPA 3 │   │ ETAPA 4 │   │ ETAPA 5 │    │
│    │  Data   │   │Outreach │   │AI Sales │   │Post-Sale│   │Nurture  │    │
│    │ Quality │   │ Content │   │ Pricing │   │ Credit  │   │Campaign │    │
│    └────┬────┘   └────┬────┘   └────┬────┘   └────┬────┘   └────┬────┘    │
│         │             │             │             │             │          │
│         └─────────────┴─────────────┴─────────────┴─────────────┘          │
│                                    │                                        │
│                           ┌────────▼────────┐                               │
│                           │ approval_tasks  │                               │
│                           │ (Single Table)  │                               │
│                           └────────┬────────┘                               │
│                                    │                                        │
│                           ┌────────▼────────┐                               │
│                           │   Unified UI    │                               │
│                           │   (Inbox)       │                               │
│                           └─────────────────┘                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Beneficii

| Beneficiu | Descriere |
| --------- | --------- |
| **UI Unificat** | Un singur inbox pentru toate aprobările |
| **SLA Consistent** | Reguli de escalare consistente |
| **Audit Trail** | Log centralizat pentru compliance |
| **Flexibilitate** | Asocieri polimorfe (orice tip de entitate) |

---

## 2. PRINCIPIU ARHITECTURAL

### 2.1 Decizie Canonică

> **IMPORTANT:** Un singur sistem HITL transversal (`approval_tasks`), NU tabele per-etapă (`gold_hitl_tasks`).

### 2.2 Deprecation Notice

> ⚠️ **DEPRECATED:** Orice referință la `gold_hitl_tasks` în documentele anexă este **DEPRECATED**.
>
> Toate etapele (E1-E5) TREBUIE să scrie în `approval_tasks`.
>
> **Migrare obligatorie:**
>
> - `gold_hitl_tasks` → `approval_tasks`
> - `assigned_to` (email string) → `assigned_to` (UUID user.id)

### 2.3 User Identity Contract

| Câmp | Tip | Descriere |
| ---- | --- | --------- |
| `assigned_to` | UUID | **OBLIGATORIU** - referință la `users(id)` |
| `assigned_role` | VARCHAR | Rol funcțional (pentru routing) |
| `decided_by` | UUID | **OBLIGATORIU** la rezoluție - `users(id)` |
| `actor_user_id` | UUID | În audit log - întotdeauna UUID |

**Regula:** Nicăieri în sistem nu se stochează email-ul ca identificator de user. Lookup user ID din email se face la momentul asignării.

---

## 3. SCHEMA APPROVAL_TASKS

### 3.1 Tabelă Principală

```sql
-- TABELĂ CANONICĂ: approval_tasks (CENTRALIZATĂ)
CREATE TABLE approval_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    
    -- Referință polimorfă (orice tip entitate)
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    
    -- Context pipeline
    pipeline_stage VARCHAR(10) NOT NULL 
        CHECK (pipeline_stage IN ('E1', 'E2', 'E3', 'E4', 'E5')),
    approval_type VARCHAR(100) NOT NULL,
    
    -- Corelare BullMQ
    bullmq_job_id VARCHAR(255),
    bullmq_queue_name VARCHAR(255),
    correlation_id VARCHAR(255),
    
    -- State Machine
    status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending', 'assigned', 'in_review', 
            'approved', 'rejected', 'escalated', 'expired'
        )),
    current_level INTEGER DEFAULT 1,
    
    -- Assignment
    assigned_to UUID REFERENCES users(id),
    assigned_role VARCHAR(100),
    assigned_at TIMESTAMPTZ,
    
    -- SLA Tracking
    priority VARCHAR(20) DEFAULT 'normal' 
        CHECK (priority IN ('critical', 'high', 'normal', 'low')),
    sla_minutes INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    due_at TIMESTAMPTZ NOT NULL,
    paused_at TIMESTAMPTZ,
    total_paused_ms BIGINT DEFAULT 0,
    
    -- Payload specific domeniu (JSONB flexibil)
    metadata JSONB DEFAULT '{}',
    decision_context JSONB DEFAULT '{}',
    
    -- Rezoluție
    decided_by UUID REFERENCES users(id),
    decision VARCHAR(50),
    decision_reason TEXT,
    decided_at TIMESTAMPTZ
);
```

### 3.2 Indexuri Critice

```sql
-- Pentru inbox queries (Most Important)
CREATE INDEX idx_approvals_inbox ON approval_tasks(assigned_to, status) 
    WHERE status IN ('assigned', 'in_review');

-- Pentru SLA monitoring
CREATE INDEX idx_approvals_due ON approval_tasks(due_at) 
    WHERE status NOT IN ('approved', 'rejected', 'expired');

-- Pentru corelarea cu BullMQ jobs
CREATE INDEX idx_approvals_correlation ON approval_tasks(bullmq_job_id, bullmq_queue_name);

-- Pentru lookup by entity
CREATE INDEX idx_approvals_entity ON approval_tasks(entity_type, entity_id);

-- Pentru dashboard per tenant și etapă
CREATE INDEX idx_approvals_tenant ON approval_tasks(tenant_id, pipeline_stage, status);
```

### 3.3 RLS (Row Level Security)

```sql
ALTER TABLE approval_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_approvals ON approval_tasks
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

---

## 4. APPROVAL TYPES PER ETAPĂ

### 4.1 Matrice Approval Types

| Stage | approval_type | Trigger Condition | SLA | Timeout Action |
| ----- | ------------- | ----------------- | --- | -------------- |
| **E1** Data | `data_quality` | Completeness < 70% | 24h | Escalate |
| **E2** Outreach | `content_review` | First message to segment | 8h | Escalate |
| **E3** AI Sales | `pricing_approval` | Discount > 15% OR value > €50K | 4h | Escalate to VP |
| **E4** Post-Sale | `credit_approval` | Risk score > 0.5 OR value > €100K | 48h | Reject |
| **E5** Nurturing | `campaign_approval` | All campaigns | 72h | Escalate |

### 4.2 Schema approval_type_configs

```sql
-- TABELĂ CANONICĂ: approval_type_configs
CREATE TABLE approval_type_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_type VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    pipeline_stage VARCHAR(10) NOT NULL,
    
    -- SLA per priority (minute)
    sla_critical INTEGER DEFAULT 240,    -- 4 ore
    sla_high INTEGER DEFAULT 480,        -- 8 ore
    sla_normal INTEGER DEFAULT 1440,     -- 24 ore
    sla_low INTEGER DEFAULT 4320,        -- 72 ore
    
    -- Escalation chain
    escalation_chain JSONB DEFAULT '[
        {"level": 1, "role": "approver", "timeout_action": "escalate"},
        {"level": 2, "role": "manager", "timeout_action": "escalate"},
        {"level": 3, "role": "director", "timeout_action": "auto_reject"}
    ]',
    
    -- Routing rules
    auto_assign_rules JSONB DEFAULT '[]',
    threshold_rules JSONB DEFAULT '[]',
    
    -- UI configuration
    required_fields TEXT[],
    display_fields TEXT[],
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.3 Configurare Approval Types

```sql
-- Configurații per etapă
INSERT INTO approval_type_configs (approval_type, display_name, pipeline_stage, sla_normal) VALUES
    ('data_quality', 'Data Quality Review', 'E1', 1440),
    ('content_review', 'Message Content Approval', 'E2', 480),
    ('pricing_approval', 'Pricing & Discount Approval', 'E3', 240),
    ('credit_approval', 'Credit & Contract Approval', 'E4', 2880),
    ('campaign_approval', 'Campaign Launch Approval', 'E5', 4320);
```

### 4.3 Escalation Chain

```typescript
const DEFAULT_ESCALATION_CHAIN = [
  { level: 1, role: 'approver', timeout_action: 'escalate' },
  { level: 2, role: 'manager', timeout_action: 'escalate' },
  { level: 3, role: 'director', timeout_action: 'auto_reject' },
];
```

---

## 5. SLA TIERS ȘI ESCALATION

### 5.1 SLA per Priority

| Priority | Calendar Hours | Business Hours | Use Case |
| -------- | -------------- | -------------- | -------- |
| **Critical** | 4h | 4h (always on) | Security, production issues |
| **High** | 8h | 8h | Time-sensitive deals |
| **Normal** | 24h | 16h (2 business days) | Standard approvals |
| **Low** | 72h | 40h (5 business days) | Routine reviews |

### 5.2 SLA Calculation

```typescript
// Calcul SLA cu pause support
function calculateEffectiveSLA(task: ApprovalTask): number {
  const elapsed = Date.now() - task.created_at.getTime();
  const effectiveElapsed = elapsed - task.total_paused_ms;
  const slaMs = task.sla_minutes * 60 * 1000;
  
  return Math.max(0, slaMs - effectiveElapsed);
}

// SLA status
function getSLAStatus(task: ApprovalTask): 'ok' | 'warning' | 'breached' {
  const remaining = calculateEffectiveSLA(task);
  const total = task.sla_minutes * 60 * 1000;
  
  if (remaining <= 0) return 'breached';
  if (remaining < total * 0.2) return 'warning'; // < 20% remaining
  return 'ok';
}
```

---

## 6. STATE MACHINE

### 6.1 Diagrama Stări

```text
     ┌──────────────────────────────────────────────────────────────┐
     │                                                              │
     │   ┌─────────┐        ┌──────────┐        ┌───────────┐       │
     │   │ pending │───────▶│ assigned │───────▶│ in_review │       │
     │   └─────────┘ ASSIGN └────┬─────┘ START  └─────┬─────┘       │
     │                            │                     │           │
     │                   TIMEOUT  │                     │ APPROVE   │
     │                            ▼                     ▼           │
     │                     ┌───────────┐         ┌───────────┐      │
     │                     │ escalated │         │ approved  │      │
     │                     └─────┬─────┘         └───────────┘      │
     │                           │                     ▲            │
     │             MAX_ESCALATION│                     │            │
     │                           ▼                     │ REJECT     │
     │                     ┌───────────┐         ┌─────┴─────┐      │
     │                     │  expired  │         │ rejected  │      │
     │                     └───────────┘         └───────────┘      │
     │                                                              │
     └──────────────────────────────────────────────────────────────┘
```

### 6.2 XState Definition

```typescript
const approvalStates = {
  pending: {
    on: { ASSIGN: 'assigned', AUTO_ASSIGN: 'assigned' }
  },
  assigned: {
    on: { 
      START_REVIEW: 'in_review',
      REASSIGN: 'assigned',
      TIMEOUT: { target: 'escalated', guard: 'shouldEscalate' }
    }
  },
  in_review: {
    on: {
      APPROVE: { target: 'approved', guard: 'canApprove' },
      REJECT: 'rejected',
      REQUEST_INFO: 'pending_info',
      ESCALATE: 'escalated'
    }
  },
  pending_info: {
    entry: 'pauseSLA',
    exit: 'resumeSLA',
    on: { INFO_PROVIDED: 'in_review', TIMEOUT: 'escalated' }
  },
  escalated: {
    entry: 'incrementLevel',
    on: {
      ASSIGN: 'assigned',
      APPROVE: 'approved',
      REJECT: 'rejected',
      MAX_ESCALATION: 'expired'
    }
  },
  approved: { type: 'final', entry: 'notifyApproved' },
  rejected: { type: 'final', entry: 'notifyRejected' },
  expired: { type: 'final', entry: 'notifyExpired' }
};
```

---

## 7. API ENDPOINTS

### 7.1 HITL Queue

```typescript
// GET /api/v1/hitl/queue
interface HITLQueueParams {
  taskType?: string[];
  priority?: ('LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL')[];
  assignedRole?: string;
  slaStatus?: 'OK' | 'WARNING' | 'BREACHED';
  pipelineStage?: ('E1' | 'E2' | 'E3' | 'E4' | 'E5')[];
}

interface HITLQueueResponse {
  tasks: HITLTask[];
  summary: {
    total: number;
    critical: number;
    slaBreached: number;
    avgResolutionTime: number;
  };
}
```

### 7.2 Resolve Task

```typescript
// POST /api/v1/hitl/tasks/:taskId/resolve
interface ResolveHITLRequest {
  decision: 'APPROVED' | 'REJECTED';
  notes?: string;
  selectedOption?: string;
}

interface ResolveHITLResponse {
  task: HITLTask;
  executedActions: string[];
  resumedJobId?: string;
}
```

### 7.3 Reassign Task

```typescript
// POST /api/v1/hitl/tasks/:taskId/reassign
interface ReassignHITLRequest {
  assignToUserId?: string;  // UUID
  assignToRole?: string;
  reason: string;
}
```

---

## 8. WORKERS HITL

### 8.1 Worker Matrix per Etapă

| Etapă | Worker Category | Nr. Workers | Descriere |
| ----- | --------------- | ----------- | --------- |
| E1 | P. HITL | 4 | Data quality escalation |
| E2 | L. Human Intervention | 4 | Review, takeover |
| E3 | N. Human Intervention | 3 | Pricing escalation |
| E4 | K. Human Intervention | 6 | Credit/contract approval |
| E5 | K. Compliance | 3 | GDPR, competition checks |

### 8.2 Integration cu BullMQ

```typescript
// Pattern: Job waiting for HITL approval
async function processWithHITL(job: Job) {
  const needsApproval = await checkNeedsApproval(job.data);
  
  if (needsApproval) {
    // Create approval task
    const task = await createApprovalTask({
      entity_type: 'order',
      entity_id: job.data.orderId,
      pipeline_stage: 'E3',
      approval_type: 'pricing_approval',
      bullmq_job_id: job.id,
      bullmq_queue_name: job.queueName,
      correlation_id: job.data.correlationId,
      priority: determinePriority(job.data),
      metadata: { discount: job.data.discount },
    });
    
    // Job waits for approval
    return { status: 'waiting_approval', taskId: task.id };
  }
  
  // Continue processing
  return processOrder(job.data);
}
```

---

## 9. KPIs ȘI MONITORING

### 9.1 KPIs Dashboard

| KPI | Calcul | Target |
| --- | ------ | ------ |
| **Time-to-Approve** | `AVG(decided_at - created_at)` | < 24h |
| **Approval Rate** | `COUNT(approved) / COUNT(*)` | 70-90% |
| **Escalation Rate** | `COUNT(escalated) / COUNT(*)` | < 10% |
| **SLA Compliance** | `COUNT(decided_at < due_at) / COUNT(*)` | > 95% |
| **First-Touch Resolution** | `COUNT(level=1 AND resolved) / COUNT(*)` | > 80% |

### 9.2 Metrici Prometheus

```typescript
const HITL_METRICS = {
  'hitl_tasks_created_total': Counter,      // Labels: pipeline_stage, approval_type
  'hitl_tasks_resolved_total': Counter,     // Labels: pipeline_stage, decision
  'hitl_resolution_duration_seconds': Histogram,
  'hitl_sla_breached_total': Counter,
  'hitl_escalations_total': Counter,
  'hitl_queue_depth': Gauge,                // Labels: priority, pipeline_stage
};
```

### 9.3 Alerting

```yaml
alerts:
  - name: HITLQueueBacklog
    condition: hitl_queue_depth{priority="critical"} > 5
    severity: critical
    
  - name: HITLSLABreachRate
    condition: |
      rate(hitl_sla_breached_total[1h]) 
      / rate(hitl_tasks_resolved_total[1h]) > 0.05
    severity: warning
    
  - name: HITLEscalationSpike
    condition: |
      rate(hitl_escalations_total[30m]) > 10
    severity: warning
```

---

## 10. MIGRATION GUIDE

### 10.1 De la `gold_hitl_tasks` la `approval_tasks`

```sql
-- Step 1: Migrate existing tasks
INSERT INTO approval_tasks (
  tenant_id, entity_type, entity_id, 
  pipeline_stage, approval_type, status,
  assigned_to, created_at, metadata
)
SELECT 
  t.tenant_id,
  t.entity_type,
  t.entity_id,
  'E4' as pipeline_stage,  -- Adjust per source
  t.task_type,
  t.status,
  u.id as assigned_to,     -- Lookup by email
  t.created_at,
  t.metadata
FROM gold_hitl_tasks t
LEFT JOIN users u ON u.email = t.assigned_to_email
WHERE t.status NOT IN ('approved', 'rejected');

-- Step 2: Drop old table after verification
-- DROP TABLE gold_hitl_tasks;
```

### 10.2 Code Migration Checklist

- [ ] Replace `gold_hitl_tasks` imports with `approval_tasks`
- [ ] Update assigned_to from email to UUID lookup
- [ ] Add `pipeline_stage` to all insertions
- [ ] Update queries to use new indexes
- [ ] Test escalation chain
- [ ] Verify RLS policies

---

## REFERINȚE

| Document | Secțiuni |
| -------- | -------- |
| [`master-specification.md`](./master-specification.md) | § 5 HITL Core Contract |
| [`architecture.md`](../architecture/architecture.md) | § 5.3 Unified HITL, § 6.2 HITL Scenario |
| [`glossary.md`](../architecture/glossary.md) | § 4 HITL și Sistem Aprobare |
| [`coding-standards.md`](../developer-guide/coding-standards.md) | HITL patterns |

---

**Generat:** 19 Ianuarie 2026  
**Bazat pe:** master-specification.md § 5, architecture.md, etapa workers overview  
**Canonical:** Da — Subordonat Master Spec v1.2
