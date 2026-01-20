# CERNIQ.APP — ETAPA 4: HITL SYSTEM
## Human-in-the-Loop Approval System
### Versiunea 1.0 | 19 Ianuarie 2026

---

# CUPRINS

1. [HITL Architecture](#1-architecture)
2. [Approval Matrix](#2-matrix)
3. [Task Types](#3-task-types)
4. [SLA & Escalation](#4-sla)
5. [Database Schema](#5-schema)
6. [API Endpoints](#6-api)
7. [UI Components](#7-ui)

---

## 1. HITL Architecture {#1-architecture}

```
┌─────────────────────────────────────────────────────────────────┐
│                    HITL APPROVAL SYSTEM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐                                               │
│  │   TRIGGER    │ Credit Override, Refund, Payment Match        │
│  │   SOURCES    │ Contract Atypical, Fraud Alert               │
│  └──────┬───────┘                                               │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────┐                                               │
│  │    QUEUE     │ hitl_approvals table                          │
│  │   MANAGER    │ BullMQ delayed jobs for SLA                   │
│  └──────┬───────┘                                               │
│         │                                                        │
│    ┌────┴────┬─────────────┐                                    │
│    ▼         ▼             ▼                                    │
│ ┌──────┐ ┌──────┐     ┌──────┐                                 │
│ │ WEB  │ │SLACK │     │EMAIL │  Notification Channels           │
│ │ UI   │ │ALERT │     │NOTIF │                                  │
│ └──┬───┘ └──────┘     └──────┘                                 │
│    │                                                             │
│    ▼                                                             │
│ ┌──────────────┐                                                │
│ │   APPROVER   │  Reviews task, makes decision                  │
│ │   INTERFACE  │  APPROVE / REJECT with notes                   │
│ └──────┬───────┘                                                │
│        │                                                         │
│        ▼                                                         │
│ ┌──────────────┐                                                │
│ │   EXECUTOR   │  K52: hitl:task:resolve                        │
│ │   WORKER     │  Executes business logic based on decision     │
│ └──────────────┘                                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Approval Matrix {#2-matrix}

| Task Type | Trigger Condition | Approver | SLA | Escalate To |
|-----------|-------------------|----------|-----|-------------|
| `credit:override:small` | Credit depășire <10% | SALES_MANAGER | 4h | CFO |
| `credit:override:large` | Credit depășire >10% | CFO | 2h | CEO |
| `credit:limit:high` | Limită propusă >50K EUR | CFO | 4h | CEO |
| `refund:large` | Refund >1000 EUR | FINANCE_MANAGER | 4h | CFO |
| `contract:atypical` | Clauze modificate manual | LEGAL | 24h | CEO |
| `payment:unmatched` | Reconciliere fuzzy <85% | ACCOUNTING | 8h | CFO |
| `fraud:alert` | Nume client ≠ cont bancar | COMPLIANCE | 1h | CEO |

---

## 3. Task Types {#3-task-types}

### Credit Override
```typescript
interface CreditOverrideTask {
  taskType: 'credit:override:small' | 'credit:override:large';
  metadata: {
    orderId: string;
    clientId: string;
    profileId: string;
    orderTotal: number;
    creditAvailable: number;
    overage: number;
    overagePercent: number;
    clientName: string;
    clientCui: string;
  };
  actions: {
    onApprove: 'RESERVE_CREDIT_WITH_OVERRIDE';
    onReject: 'CANCEL_ORDER';
  };
}
```

### Refund Large
```typescript
interface RefundLargeTask {
  taskType: 'refund:large';
  metadata: {
    returnId: string;
    orderId: string;
    orderNumber: string;
    itemsValue: number;
    items: Array<{ name: string; quantity: number; unitPrice: number }>;
    reason: string;
    clientName: string;
  };
  actions: {
    onApprove: 'PROCESS_REFUND';
    onReject: 'REJECT_RETURN';
  };
}
```

### Payment Unmatched
```typescript
interface PaymentUnmatchedTask {
  taskType: 'payment:unmatched';
  metadata: {
    paymentId: string;
    amount: number;
    currency: string;
    counterpartyName: string;
    counterpartyAccount: string;
    description: string;
    transactionDate: string;
    candidates: Array<{
      invoiceId: string;
      invoiceNumber: string;
      clientName: string;
      amount: number;
      matchScore: number;
    }>;
  };
  actions: {
    onApprove: 'RECONCILE_WITH_SELECTED_INVOICE';
    onReject: 'MARK_AS_DISPUTED';
  };
}
```

---

## 4. SLA & Escalation {#4-sla}

```typescript
// SLA Configuration
const SLA_CONFIG = {
  escalationLevels: [
    { level: 1, afterHours: 0, notifyRole: 'ASSIGNED' },
    { level: 2, afterHours: 2, notifyRole: 'MANAGER' },
    { level: 3, afterHours: 4, notifyRole: 'DIRECTOR' },
    { level: 4, afterHours: 8, notifyRole: 'CEO' }
  ],
  
  priorityMultipliers: {
    LOW: 2.0,       // 2x SLA time
    NORMAL: 1.0,    // Standard SLA
    HIGH: 0.5,      // Half SLA time
    CRITICAL: 0.25  // Quarter SLA time
  },
  
  workingHours: {
    start: 9,
    end: 18,
    timezone: 'Europe/Bucharest',
    workDays: [1, 2, 3, 4, 5] // Monday-Friday
  }
};

// Calculate effective SLA deadline
function calculateSLADeadline(baseHours: number, priority: string): Date {
  const multiplier = SLA_CONFIG.priorityMultipliers[priority] || 1;
  const effectiveHours = baseHours * multiplier;
  
  let deadline = new Date();
  let hoursRemaining = effectiveHours;
  
  while (hoursRemaining > 0) {
    deadline = addHours(deadline, 1);
    if (isWorkingHour(deadline)) {
      hoursRemaining--;
    }
  }
  
  return deadline;
}
```

---

## 5. Database Schema {#5-schema}

```sql
CREATE TABLE hitl_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    -- Task Info
    task_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Entity Reference
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    
    -- Priority & Status
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    
    -- Assignment
    assigned_role VARCHAR(50) NOT NULL,
    assigned_user_id UUID REFERENCES users(id),
    escalate_to VARCHAR(50),
    
    -- SLA
    sla_deadline TIMESTAMPTZ NOT NULL,
    escalated_at TIMESTAMPTZ,
    escalation_count INTEGER DEFAULT 0,
    
    -- Resolution
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    resolution VARCHAR(20), -- APPROVED, REJECTED
    resolution_notes TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    correlation_id UUID,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_hitl_tenant_status ON hitl_approvals(tenant_id, status);
CREATE INDEX idx_hitl_assigned_role ON hitl_approvals(assigned_role, status);
CREATE INDEX idx_hitl_sla ON hitl_approvals(sla_deadline) WHERE status = 'PENDING';
CREATE INDEX idx_hitl_entity ON hitl_approvals(entity_type, entity_id);
```

---

## 6. API Endpoints {#6-api}

```typescript
// GET /api/v1/hitl/queue
// List pending tasks for current user
app.get('/api/v1/hitl/queue', async (req, reply) => {
  const tasks = await hitlService.getQueueForUser(req.user.id, req.user.role);
  return { tasks };
});

// GET /api/v1/hitl/tasks/:taskId
// Get task details
app.get('/api/v1/hitl/tasks/:taskId', async (req, reply) => {
  const task = await hitlService.getTask(req.params.taskId);
  return task;
});

// POST /api/v1/hitl/tasks/:taskId/resolve
// Resolve a task
app.post('/api/v1/hitl/tasks/:taskId/resolve', async (req, reply) => {
  const { decision, notes, selectedOption } = req.body;
  
  await flowProducer.add({
    queueName: 'hitl:task:resolve',
    data: {
      approvalId: req.params.taskId,
      decision,
      notes,
      selectedOption,
      userId: req.user.id
    }
  });
  
  return { status: 'processing' };
});

// POST /api/v1/hitl/tasks/:taskId/reassign
// Reassign task to another user
app.post('/api/v1/hitl/tasks/:taskId/reassign', async (req, reply) => {
  const { assignToUserId, reason } = req.body;
  await hitlService.reassignTask(req.params.taskId, assignToUserId, reason);
  return { status: 'reassigned' };
});
```

---

## 7. UI Components {#7-ui}

### HITL Queue Page
```tsx
export function HITLQueuePage() {
  const { data: tasks } = useQuery({ queryKey: ['hitl-queue'], queryFn: fetchHitlQueue });
  
  return (
    <PageLayout title="Aprobare Manuală" breadcrumbs={['Monitoring', 'HITL']}>
      <div className="space-y-4">
        {tasks?.map(task => (
          <HITLTaskCard key={task.id} task={task} />
        ))}
        {tasks?.length === 0 && (
          <EmptyState icon={CheckCircle} message="Nu există sarcini în așteptare" />
        )}
      </div>
    </PageLayout>
  );
}
```

### HITL Task Card
```tsx
function HITLTaskCard({ task }: { task: HITLTask }) {
  const [showDialog, setShowDialog] = useState(false);
  const slaStatus = getSLAStatus(task.slaDeadline);
  
  return (
    <Card className={slaStatus === 'BREACHED' ? 'border-red-500' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium">{task.title}</h3>
              <Badge variant={getPriorityVariant(task.priority)}>{task.priority}</Badge>
            </div>
            <p className="text-sm text-gray-600 mb-2">{task.description}</p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>Tip: {task.taskType}</span>
              <span>Asignat: {task.assignedRole}</span>
              <SLAIndicator deadline={task.slaDeadline} />
            </div>
          </div>
          <Button onClick={() => setShowDialog(true)}>Procesează</Button>
        </div>
      </CardContent>
      
      <HITLApprovalDialog task={task} open={showDialog} onClose={() => setShowDialog(false)} />
    </Card>
  );
}
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
