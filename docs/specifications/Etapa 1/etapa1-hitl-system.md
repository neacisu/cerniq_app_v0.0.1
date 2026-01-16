# CERNIQ.APP — ETAPA 1: HITL SYSTEM
## Human-in-the-Loop Approval Architecture
### Versiunea 1.0 | 15 Ianuarie 2026

---

# 1. OVERVIEW

## 1.1 Purpose

HITL (Human-in-the-Loop) asigură supervizare umană pentru decizii critice în pipeline-ul de date:
- **Deduplicare fuzzy** (70-85% confidence)
- **Quality review** (score 40-70)
- **AI structuring review** (low confidence)
- **Data anomalies** (valori neașteptate)
- **Manual verification** (requested by system)

## 1.2 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        HITL SYSTEM                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Workers   │───▶│  Approval   │───▶│   Human     │         │
│  │  (trigger)  │    │   Service   │    │  Operator   │         │
│  └─────────────┘    └──────┬──────┘    └──────┬──────┘         │
│                            │                   │                 │
│                     ┌──────▼──────┐    ┌──────▼──────┐         │
│                     │  Task Queue │    │   Decision  │         │
│                     │  (BullMQ)   │    │    API      │         │
│                     └──────┬──────┘    └──────┬──────┘         │
│                            │                   │                 │
│                     ┌──────▼───────────────────▼──────┐         │
│                     │        PostgreSQL Tables         │         │
│                     │   approval_tasks, audit_log      │         │
│                     └─────────────────────────────────┘         │
│                                    │                             │
│                     ┌──────────────▼──────────────┐             │
│                     │     Resume Blocked Jobs      │             │
│                     │        (on decision)         │             │
│                     └─────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

---

# 2. DATABASE SCHEMA

## 2.1 Approval Tasks Table

```sql
-- migrations/0025_create_approval_tasks.sql

CREATE TYPE approval_status AS ENUM (
  'pending',
  'assigned', 
  'approved',
  'rejected',
  'escalated',
  'expired',
  'cancelled'
);

CREATE TYPE approval_priority AS ENUM (
  'critical',   -- 1h SLA
  'high',       -- 4h SLA
  'normal',     -- 24h SLA
  'low'         -- 72h SLA
);

CREATE TYPE approval_type AS ENUM (
  'dedup_review',
  'quality_review',
  'ai_structuring_review',
  'ai_merge_review',
  'low_confidence_review',
  'data_anomaly',
  'manual_verification',
  'error_review'
);

CREATE TABLE approval_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  -- Entity reference
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  
  -- Task configuration
  approval_type approval_type NOT NULL,
  pipeline_stage VARCHAR(10) NOT NULL DEFAULT 'E1',
  priority approval_priority NOT NULL DEFAULT 'normal',
  
  -- Assignment
  assigned_to UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ,
  
  -- Status tracking
  status approval_status NOT NULL DEFAULT 'pending',
  
  -- SLA
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_at TIMESTAMPTZ NOT NULL,
  decided_at TIMESTAMPTZ,
  
  -- Decision
  decision VARCHAR(20), -- 'approve', 'reject', 'merge', 'skip'
  decision_reason TEXT,
  decision_metadata JSONB DEFAULT '{}',
  
  -- Context
  metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Escalation
  escalation_level INTEGER DEFAULT 0,
  escalated_at TIMESTAMPTZ,
  escalated_to UUID REFERENCES users(id),
  
  -- Blocked job reference
  blocked_job_id VARCHAR(100),
  blocked_queue_name VARCHAR(100),
  
  -- Audit
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_approval_tasks_tenant_status 
  ON approval_tasks(tenant_id, status);
CREATE INDEX idx_approval_tasks_assigned 
  ON approval_tasks(assigned_to, status) WHERE status IN ('pending', 'assigned');
CREATE INDEX idx_approval_tasks_due 
  ON approval_tasks(due_at) WHERE status = 'pending';
CREATE INDEX idx_approval_tasks_entity 
  ON approval_tasks(entity_type, entity_id);
CREATE INDEX idx_approval_tasks_pipeline 
  ON approval_tasks(pipeline_stage, approval_type, status);

-- RLS
ALTER TABLE approval_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY approval_tasks_tenant_isolation ON approval_tasks
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

## 2.2 Approval Audit Log

```sql
-- migrations/0026_create_approval_audit_log.sql

CREATE TABLE approval_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  approval_task_id UUID NOT NULL REFERENCES approval_tasks(id),
  
  -- Action
  action VARCHAR(50) NOT NULL, -- 'created', 'assigned', 'decided', 'escalated', 'expired'
  
  -- Actor
  actor_id UUID REFERENCES users(id),
  actor_type VARCHAR(20) NOT NULL, -- 'user', 'system', 'scheduler'
  
  -- Change details
  previous_status approval_status,
  new_status approval_status,
  
  -- Context
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_approval_audit_task 
  ON approval_audit_log(approval_task_id);
CREATE INDEX idx_approval_audit_actor 
  ON approval_audit_log(actor_id, created_at DESC);
```

---

# 3. APPROVAL SERVICE

## 3.1 Core Service Implementation

```typescript
// packages/services/src/approval/approval.service.ts

import { db } from '@cerniq/db';
import { approvalTasks, approvalAuditLog } from '@cerniq/db/schema';
import { eq, and, lt, isNull } from 'drizzle-orm';
import { Queue } from 'bullmq';

interface CreateApprovalTaskInput {
  tenantId: string;
  entityType: string;
  entityId: string;
  approvalType: ApprovalType;
  pipelineStage?: string;
  priority?: ApprovalPriority;
  metadata?: Record<string, any>;
  blockedJobId?: string;
  blockedQueueName?: string;
  createdBy?: string;
}

interface DecisionInput {
  taskId: string;
  decision: 'approve' | 'reject' | 'merge' | 'skip';
  reason?: string;
  metadata?: Record<string, any>;
  actorId: string;
}

// SLA configurations (in hours)
const SLA_HOURS: Record<ApprovalPriority, number> = {
  critical: 1,
  high: 4,
  normal: 24,
  low: 72,
};

export class ApprovalService {
  private escalationQueue: Queue;
  private notificationQueue: Queue;

  constructor() {
    this.escalationQueue = new Queue('hitl:escalation');
    this.notificationQueue = new Queue('notifications:hitl');
  }

  /**
   * Create a new approval task
   */
  async createTask(input: CreateApprovalTaskInput): Promise<ApprovalTask> {
    const priority = input.priority || 'normal';
    const slaHours = SLA_HOURS[priority];
    const dueAt = new Date(Date.now() + slaHours * 60 * 60 * 1000);

    const [task] = await db.insert(approvalTasks).values({
      tenantId: input.tenantId,
      entityType: input.entityType,
      entityId: input.entityId,
      approvalType: input.approvalType,
      pipelineStage: input.pipelineStage || 'E1',
      priority,
      dueAt,
      metadata: input.metadata || {},
      blockedJobId: input.blockedJobId,
      blockedQueueName: input.blockedQueueName,
      createdBy: input.createdBy,
    }).returning();

    // Audit log
    await this.logAction(task.id, input.tenantId, 'created', {
      actorId: input.createdBy,
      actorType: input.createdBy ? 'user' : 'system',
      newStatus: 'pending',
      metadata: { approvalType: input.approvalType, priority },
    });

    // Schedule escalation check at 80% SLA
    await this.scheduleEscalationCheck(task.id, dueAt, slaHours);

    // Send notification
    await this.notificationQueue.add('new_task', {
      tenantId: input.tenantId,
      taskId: task.id,
      approvalType: input.approvalType,
      priority,
      dueAt,
    });

    return task;
  }

  /**
   * Assign task to user
   */
  async assignTask(taskId: string, userId: string, actorId: string): Promise<ApprovalTask> {
    const [task] = await db.update(approvalTasks)
      .set({
        assignedTo: userId,
        assignedAt: new Date(),
        status: 'assigned',
        updatedAt: new Date(),
      })
      .where(eq(approvalTasks.id, taskId))
      .returning();

    await this.logAction(taskId, task.tenantId, 'assigned', {
      actorId,
      actorType: 'user',
      previousStatus: 'pending',
      newStatus: 'assigned',
      metadata: { assignedTo: userId },
    });

    return task;
  }

  /**
   * Record decision and resume blocked job
   */
  async decide(input: DecisionInput): Promise<ApprovalTask> {
    const existingTask = await db.query.approvalTasks.findFirst({
      where: eq(approvalTasks.id, input.taskId),
    });

    if (!existingTask) {
      throw new Error('Task not found');
    }

    if (!['pending', 'assigned'].includes(existingTask.status)) {
      throw new Error(`Cannot decide on task with status: ${existingTask.status}`);
    }

    const newStatus = input.decision === 'approve' || input.decision === 'merge' 
      ? 'approved' 
      : 'rejected';

    const [task] = await db.update(approvalTasks)
      .set({
        status: newStatus,
        decision: input.decision,
        decisionReason: input.reason,
        decisionMetadata: input.metadata || {},
        decidedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(approvalTasks.id, input.taskId))
      .returning();

    // Audit log
    await this.logAction(input.taskId, task.tenantId, 'decided', {
      actorId: input.actorId,
      actorType: 'user',
      previousStatus: existingTask.status,
      newStatus,
      metadata: { 
        decision: input.decision, 
        reason: input.reason,
      },
    });

    // Resume blocked job if exists
    if (task.blockedJobId && task.blockedQueueName) {
      await this.resumeBlockedJob(task);
    }

    return task;
  }

  /**
   * Escalate task
   */
  async escalate(taskId: string, escalateTo: string, reason: string): Promise<ApprovalTask> {
    const existingTask = await db.query.approvalTasks.findFirst({
      where: eq(approvalTasks.id, taskId),
    });

    if (!existingTask) {
      throw new Error('Task not found');
    }

    const [task] = await db.update(approvalTasks)
      .set({
        status: 'escalated',
        escalationLevel: (existingTask.escalationLevel || 0) + 1,
        escalatedAt: new Date(),
        escalatedTo: escalateTo,
        updatedAt: new Date(),
      })
      .where(eq(approvalTasks.id, taskId))
      .returning();

    await this.logAction(taskId, task.tenantId, 'escalated', {
      actorType: 'system',
      previousStatus: existingTask.status,
      newStatus: 'escalated',
      metadata: { 
        escalateTo, 
        reason,
        escalationLevel: task.escalationLevel,
      },
    });

    // Notify escalation target
    await this.notificationQueue.add('escalation', {
      tenantId: task.tenantId,
      taskId,
      escalateTo,
      reason,
      priority: 'critical',
    });

    return task;
  }

  /**
   * Resume blocked job after approval
   */
  private async resumeBlockedJob(task: ApprovalTask): Promise<void> {
    const queue = new Queue(task.blockedQueueName!);

    // Add continuation job with approval result
    await queue.add('resume_after_approval', {
      originalJobId: task.blockedJobId,
      approvalTaskId: task.id,
      decision: task.decision,
      decisionMetadata: task.decisionMetadata,
      entityType: task.entityType,
      entityId: task.entityId,
      tenantId: task.tenantId,
    });
  }

  /**
   * Schedule escalation check
   */
  private async scheduleEscalationCheck(
    taskId: string, 
    dueAt: Date, 
    slaHours: number
  ): Promise<void> {
    // Warning at 80% SLA
    const warningDelay = slaHours * 0.8 * 60 * 60 * 1000;
    await this.escalationQueue.add('warning', { taskId }, { delay: warningDelay });

    // Escalation at 100% SLA
    const escalationDelay = slaHours * 60 * 60 * 1000;
    await this.escalationQueue.add('escalate', { taskId }, { delay: escalationDelay });
  }

  /**
   * Log audit action
   */
  private async logAction(
    taskId: string,
    tenantId: string,
    action: string,
    details: {
      actorId?: string;
      actorType: string;
      previousStatus?: ApprovalStatus;
      newStatus?: ApprovalStatus;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    await db.insert(approvalAuditLog).values({
      tenantId,
      approvalTaskId: taskId,
      action,
      actorId: details.actorId,
      actorType: details.actorType,
      previousStatus: details.previousStatus,
      newStatus: details.newStatus,
      metadata: details.metadata || {},
    });
  }

  /**
   * Get pending tasks for user
   */
  async getPendingTasks(
    tenantId: string,
    userId?: string,
    filters?: {
      approvalType?: ApprovalType;
      pipelineStage?: string;
      priority?: ApprovalPriority;
    }
  ): Promise<ApprovalTask[]> {
    let query = db.select()
      .from(approvalTasks)
      .where(
        and(
          eq(approvalTasks.tenantId, tenantId),
          eq(approvalTasks.status, 'pending'),
          userId ? eq(approvalTasks.assignedTo, userId) : isNull(approvalTasks.assignedTo)
        )
      )
      .orderBy(approvalTasks.dueAt);

    return query;
  }

  /**
   * Get task statistics
   */
  async getStats(tenantId: string, pipelineStage?: string): Promise<ApprovalStats> {
    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'assigned') as assigned,
        COUNT(*) FILTER (WHERE status IN ('approved', 'rejected')) as completed,
        COUNT(*) FILTER (WHERE status = 'pending' AND due_at < NOW()) as overdue,
        AVG(EXTRACT(EPOCH FROM (decided_at - created_at))/3600) 
          FILTER (WHERE decided_at IS NOT NULL) as avg_resolution_hours
      FROM approval_tasks
      WHERE tenant_id = ${tenantId}
        ${pipelineStage ? sql`AND pipeline_stage = ${pipelineStage}` : sql``}
    `);

    return stats[0];
  }
}

export const approvalService = new ApprovalService();
```

---

# 4. HITL WORKERS

## 4.1 Escalation Worker

```typescript
// apps/workers/src/hitl/escalation.worker.ts

import { createWorker } from '@cerniq/queue';
import { approvalService } from '@cerniq/services/approval';
import { db, approvalTasks, users } from '@cerniq/db';
import { eq, and } from 'drizzle-orm';

export const escalationWarningWorker = createWorker({
  queueName: 'hitl:escalation',
  concurrency: 5,

  processor: async (job, logger) => {
    const { taskId } = job.data;
    const jobType = job.name; // 'warning' or 'escalate'

    const task = await db.query.approvalTasks.findFirst({
      where: eq(approvalTasks.id, taskId),
    });

    if (!task || task.status !== 'pending') {
      logger.info({ taskId, status: task?.status }, 'Task already processed');
      return { status: 'skipped' };
    }

    if (jobType === 'warning') {
      // Send warning notification
      logger.warn({ taskId, dueAt: task.dueAt }, 'HITL task approaching SLA');

      await notificationQueue.add('sla_warning', {
        tenantId: task.tenantId,
        taskId,
        assignedTo: task.assignedTo,
        dueAt: task.dueAt,
        timeRemaining: Math.round((task.dueAt.getTime() - Date.now()) / 60000),
      });

      return { status: 'warning_sent' };
    }

    if (jobType === 'escalate') {
      // Find escalation target
      const escalationTarget = await findEscalationTarget(
        task.tenantId,
        task.assignedTo,
        task.escalationLevel
      );

      if (escalationTarget) {
        await approvalService.escalate(taskId, escalationTarget, 'SLA breach');
        logger.error({ taskId, escalateTo: escalationTarget }, 'HITL task escalated');
      } else {
        // Mark as expired if no escalation target
        await db.update(approvalTasks)
          .set({ status: 'expired', updatedAt: new Date() })
          .where(eq(approvalTasks.id, taskId));
        
        logger.error({ taskId }, 'HITL task expired - no escalation target');
      }

      return { status: 'escalated' };
    }
  },
});

async function findEscalationTarget(
  tenantId: string,
  currentAssignee: string | null,
  escalationLevel: number
): Promise<string | null> {
  // Escalation hierarchy:
  // Level 0: Any available operator
  // Level 1: Team lead
  // Level 2: Manager
  // Level 3: Admin

  const roleHierarchy = ['operator', 'team_lead', 'manager', 'admin'];
  const targetRole = roleHierarchy[Math.min(escalationLevel + 1, roleHierarchy.length - 1)];

  const escalationTarget = await db.query.users.findFirst({
    where: and(
      eq(users.tenantId, tenantId),
      eq(users.role, targetRole),
      eq(users.active, true)
    ),
  });

  return escalationTarget?.id || null;
}
```

## 4.2 Resume Worker

```typescript
// apps/workers/src/hitl/resume.worker.ts

export const resumeAfterApprovalWorker = createWorker({
  queueName: 'hitl:resume',
  concurrency: 10,

  processor: async (job, logger) => {
    const { 
      approvalTaskId, 
      decision, 
      decisionMetadata,
      entityType,
      entityId,
      tenantId 
    } = job.data;

    logger.info({ approvalTaskId, decision }, 'Resuming after HITL decision');

    // Get approval task details
    const task = await db.query.approvalTasks.findFirst({
      where: eq(approvalTasks.id, approvalTaskId),
    });

    if (!task) {
      return { status: 'task_not_found' };
    }

    // Handle based on approval type
    switch (task.approvalType) {
      case 'dedup_review':
        await handleDedupDecision(task, decision, decisionMetadata);
        break;

      case 'quality_review':
        await handleQualityDecision(task, decision, decisionMetadata);
        break;

      case 'ai_structuring_review':
      case 'ai_merge_review':
        await handleAiDecision(task, decision, decisionMetadata);
        break;

      case 'error_review':
        await handleErrorDecision(task, decision, decisionMetadata);
        break;

      default:
        logger.warn({ approvalType: task.approvalType }, 'Unknown approval type');
    }

    return { status: 'success', decision };
  },
});

async function handleDedupDecision(
  task: ApprovalTask,
  decision: string,
  metadata: Record<string, any>
): Promise<void> {
  const { companyAId, companyBId } = task.metadata;

  if (decision === 'merge') {
    // Perform merge
    await db.update(silverCompanies)
      .set({
        isMasterRecord: false,
        masterRecordId: companyBId,
        duplicateConfidence: metadata.confirmedConfidence || 0.85,
        duplicateMethod: 'hitl_confirmed',
        dedupCheckedAt: new Date(),
      })
      .where(eq(silverCompanies.id, companyAId));

    // Update dedup candidate status
    await db.update(silverDedupCandidates)
      .set({ status: 'merged', decidedAt: new Date() })
      .where(and(
        eq(silverDedupCandidates.companyAId, companyAId),
        eq(silverDedupCandidates.companyBId, companyBId)
      ));

    // Trigger data merge
    await mergeCompanyDataQueue.add('merge', {
      masterId: companyBId,
      duplicateId: companyAId,
    });

  } else if (decision === 'reject') {
    // Not duplicates - mark both as master
    await db.update(silverCompanies)
      .set({ isMasterRecord: true, dedupCheckedAt: new Date() })
      .where(eq(silverCompanies.id, companyAId));

    await db.update(silverDedupCandidates)
      .set({ status: 'rejected', decidedAt: new Date() })
      .where(and(
        eq(silverDedupCandidates.companyAId, companyAId),
        eq(silverDedupCandidates.companyBId, companyBId)
      ));
  }

  // Continue pipeline
  await pipelineOrchestratorQueue.add('orchestrate', {
    tenantId: task.tenantId,
    companyId: companyAId,
    stage: 'post_enrichment',
  });
}

async function handleQualityDecision(
  task: ApprovalTask,
  decision: string,
  metadata: Record<string, any>
): Promise<void> {
  const companyId = task.entityId;

  if (decision === 'approve') {
    // Override quality and promote
    await db.update(silverCompanies)
      .set({
        promotionStatus: 'eligible',
        promotionOverrideBy: metadata.operatorId,
        promotionOverrideReason: metadata.reason,
      })
      .where(eq(silverCompanies.id, companyId));

    // Trigger promotion
    await promoterQueue.add('promote', {
      tenantId: task.tenantId,
      companyId,
      force: true,
    });

  } else if (decision === 'reject') {
    // Block promotion
    await db.update(silverCompanies)
      .set({
        promotionStatus: 'blocked',
        promotionBlockedReason: metadata.reason || 'Rejected by HITL review',
      })
      .where(eq(silverCompanies.id, companyId));
  }
}

async function handleAiDecision(
  task: ApprovalTask,
  decision: string,
  metadata: Record<string, any>
): Promise<void> {
  const companyId = task.entityId;

  if (decision === 'approve') {
    // Apply AI-suggested data
    const suggestedData = task.metadata.structuredData || task.metadata.mergedData;

    await db.update(silverCompanies)
      .set({
        ...mapAiDataToCompany(suggestedData),
        aiDataApprovedBy: metadata.operatorId,
        aiDataApprovedAt: new Date(),
      })
      .where(eq(silverCompanies.id, companyId));

  } else if (decision === 'reject') {
    // Discard AI suggestions
    await db.update(silverCompanies)
      .set({
        aiDataRejectedBy: metadata.operatorId,
        aiDataRejectedAt: new Date(),
        aiDataRejectedReason: metadata.reason,
      })
      .where(eq(silverCompanies.id, companyId));
  }

  // Continue pipeline
  await pipelineOrchestratorQueue.add('orchestrate', {
    tenantId: task.tenantId,
    companyId,
    stage: 'post_enrichment',
  });
}
```

---

# 5. HITL API ENDPOINTS

```typescript
// apps/api/src/routes/approvals.ts

import { Router } from 'express';
import { approvalService } from '@cerniq/services/approval';
import { z } from 'zod';
import { validateRequest } from '../middleware/validate';

const router = Router();

// GET /api/v1/approvals - List pending approvals
router.get('/', async (req, res) => {
  const { 
    status = 'pending',
    approvalType,
    pipelineStage,
    priority,
    assignedTo,
    page = 1,
    limit = 20,
  } = req.query;

  const tasks = await approvalService.getPendingTasks(
    req.tenantId,
    assignedTo as string,
    { approvalType, pipelineStage, priority }
  );

  res.json({
    success: true,
    data: tasks,
    meta: { page, limit, total: tasks.length },
  });
});

// GET /api/v1/approvals/stats - Get approval statistics
router.get('/stats', async (req, res) => {
  const { pipelineStage } = req.query;
  
  const stats = await approvalService.getStats(
    req.tenantId,
    pipelineStage as string
  );

  res.json({
    success: true,
    data: stats,
  });
});

// GET /api/v1/approvals/:id - Get approval details
router.get('/:id', async (req, res) => {
  const task = await db.query.approvalTasks.findFirst({
    where: eq(approvalTasks.id, req.params.id),
  });

  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  // Get entity data based on type
  let entityData = null;
  if (task.entityType === 'company') {
    entityData = await db.query.silverCompanies.findFirst({
      where: eq(silverCompanies.id, task.entityId),
    });
  }

  res.json({
    success: true,
    data: {
      ...task,
      entity: entityData,
    },
  });
});

// POST /api/v1/approvals/:id/assign - Assign task
const assignSchema = z.object({
  userId: z.string().uuid(),
});

router.post('/:id/assign', validateRequest(assignSchema), async (req, res) => {
  const task = await approvalService.assignTask(
    req.params.id,
    req.body.userId,
    req.userId
  );

  res.json({
    success: true,
    data: task,
  });
});

// POST /api/v1/approvals/:id/decide - Make decision
const decideSchema = z.object({
  decision: z.enum(['approve', 'reject', 'merge', 'skip']),
  reason: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

router.post('/:id/decide', validateRequest(decideSchema), async (req, res) => {
  const task = await approvalService.decide({
    taskId: req.params.id,
    decision: req.body.decision,
    reason: req.body.reason,
    metadata: req.body.metadata,
    actorId: req.userId,
  });

  res.json({
    success: true,
    data: task,
  });
});

export default router;
```

---

# 6. FRONTEND COMPONENTS

## 6.1 Approval Inbox Page

```tsx
// apps/web/src/pages/approvals/ApprovalInbox.tsx

import { useList, useNavigation } from '@refinedev/core';
import { List, useDataGrid } from '@refinedev/mui';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { ApprovalTask } from '@cerniq/types';
import { SLACountdown } from '@/components/sla-countdown';
import { Badge } from '@/components/ui/badge';

export const ApprovalInbox: React.FC = () => {
  const { push } = useNavigation();

  const columns: GridColDef<ApprovalTask>[] = [
    {
      field: 'priority',
      headerName: 'Priority',
      width: 100,
      renderCell: ({ value }) => (
        <Badge variant={
          value === 'critical' ? 'destructive' :
          value === 'high' ? 'warning' :
          value === 'normal' ? 'secondary' : 'outline'
        }>
          {value}
        </Badge>
      ),
    },
    {
      field: 'approvalType',
      headerName: 'Type',
      width: 150,
      renderCell: ({ value }) => (
        <Badge variant="outline">{formatApprovalType(value)}</Badge>
      ),
    },
    {
      field: 'entitySummary',
      headerName: 'Entity',
      flex: 1,
      valueGetter: (_, row) => {
        if (row.entityType === 'company') {
          return row.metadata?.companyAName || row.metadata?.denumire || 'Company';
        }
        return row.entityId;
      },
    },
    {
      field: 'dueAt',
      headerName: 'SLA',
      width: 150,
      renderCell: ({ value }) => <SLACountdown dueAt={value} />,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: ({ value }) => (
        <Badge variant={value === 'pending' ? 'secondary' : 'default'}>
          {value}
        </Badge>
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 150,
      valueFormatter: ({ value }) => formatRelativeTime(value),
    },
  ];

  const { dataGridProps } = useDataGrid<ApprovalTask>({
    resource: 'approvals',
    filters: {
      permanent: [{ field: 'status', operator: 'eq', value: 'pending' }],
    },
    sorters: {
      initial: [{ field: 'dueAt', order: 'asc' }],
    },
  });

  return (
    <List title="Approval Inbox">
      <DataGrid
        {...dataGridProps}
        columns={columns}
        autoHeight
        onRowClick={(params) => push(`/approvals/${params.id}`)}
        sx={{
          '& .MuiDataGrid-row': { cursor: 'pointer' },
          '& .MuiDataGrid-row:hover': { backgroundColor: 'action.hover' },
        }}
      />
    </List>
  );
};

function formatApprovalType(type: string): string {
  const labels: Record<string, string> = {
    dedup_review: 'Duplicate Review',
    quality_review: 'Quality Review',
    ai_structuring_review: 'AI Data Review',
    ai_merge_review: 'AI Merge Review',
    low_confidence_review: 'Low Confidence',
    data_anomaly: 'Data Anomaly',
    manual_verification: 'Manual Verify',
    error_review: 'Error Review',
  };
  return labels[type] || type;
}
```

## 6.2 Approval Review Component

```tsx
// apps/web/src/components/approvals/ApprovalReview.tsx

import { useState } from 'react';
import { useOne, useUpdate } from '@refinedev/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { SLACountdown } from '@/components/sla-countdown';
import { DedupReviewPanel } from './DedupReviewPanel';
import { QualityReviewPanel } from './QualityReviewPanel';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface ApprovalReviewProps {
  taskId: string;
}

export const ApprovalReview: React.FC<ApprovalReviewProps> = ({ taskId }) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, isLoading } = useOne({
    resource: 'approvals',
    id: taskId,
  });

  const { mutate: decide } = useUpdate();

  const task = data?.data;

  if (isLoading || !task) {
    return <div>Loading...</div>;
  }

  const handleDecision = async (decision: string) => {
    setIsSubmitting(true);
    try {
      await decide({
        resource: 'approvals',
        id: taskId,
        values: { decision, reason },
        meta: { action: 'decide' },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Badge variant={
                task.priority === 'critical' ? 'destructive' :
                task.priority === 'high' ? 'warning' : 'secondary'
              }>
                {task.priority}
              </Badge>
              {formatApprovalType(task.approvalType)}
            </CardTitle>
            <SLACountdown dueAt={task.dueAt} showLabel />
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Pipeline Stage</dt>
              <dd className="font-medium">{task.pipelineStage}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="font-medium">{formatDate(task.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Entity Type</dt>
              <dd className="font-medium">{task.entityType}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd><Badge>{task.status}</Badge></dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Type-specific review panel */}
      {task.approvalType === 'dedup_review' && (
        <DedupReviewPanel task={task} />
      )}
      {task.approvalType === 'quality_review' && (
        <QualityReviewPanel task={task} />
      )}

      {/* Decision panel */}
      <Card>
        <CardHeader>
          <CardTitle>Decision</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Reason (optional)</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for decision..."
              rows={3}
            />
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={() => handleDecision('approve')}
              disabled={isSubmitting}
              className="flex-1"
              variant="default"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </Button>
            
            {task.approvalType === 'dedup_review' && (
              <Button
                onClick={() => handleDecision('merge')}
                disabled={isSubmitting}
                className="flex-1"
                variant="secondary"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Merge
              </Button>
            )}
            
            <Button
              onClick={() => handleDecision('reject')}
              disabled={isSubmitting}
              className="flex-1"
              variant="destructive"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
```

---

# 7. SLA CONFIGURATION

```typescript
// packages/config/src/hitl-sla.config.ts

export const HITL_SLA_CONFIG = {
  // Priority SLA in hours
  priorities: {
    critical: {
      slaHours: 1,
      warningPercent: 0.5,   // Warn at 30 min
      escalatePercent: 1.0,  // Escalate at 1h
    },
    high: {
      slaHours: 4,
      warningPercent: 0.75,  // Warn at 3h
      escalatePercent: 1.0,  // Escalate at 4h
    },
    normal: {
      slaHours: 24,
      warningPercent: 0.8,   // Warn at 19.2h
      escalatePercent: 1.0,  // Escalate at 24h
    },
    low: {
      slaHours: 72,
      warningPercent: 0.9,   // Warn at 64.8h
      escalatePercent: 1.0,  // Escalate at 72h
    },
  },

  // Approval type default priorities
  typeDefaults: {
    dedup_review: 'normal',
    quality_review: 'normal',
    ai_structuring_review: 'low',
    ai_merge_review: 'low',
    low_confidence_review: 'normal',
    data_anomaly: 'high',
    manual_verification: 'normal',
    error_review: 'high',
  },

  // Escalation chain
  escalation: {
    maxLevels: 3,
    roles: ['operator', 'team_lead', 'manager', 'admin'],
  },

  // Auto-actions
  autoActions: {
    expireAfterHours: 168, // 7 days
    autoApproveOnExpiry: false,
  },
};
```

---

**Document generat:** 15 Ianuarie 2026
**Conformitate:** Master Spec v1.2, Unified HITL System
