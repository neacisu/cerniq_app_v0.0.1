# CERNIQ.APP — TESTE CROSS-CUTTING: HITL SYSTEM

## Teste transversale pentru Human-in-the-Loop Approval

**Scope:** Toate etapele (E1-E5) | **Referință:** [hitl-unified-system.md](file:///var/www/CerniqAPP/docs/specifications/hitl-unified-system.md)

---

## SUMAR HITL PER ETAPĂ

| Etapă | Approval Types | Priority |
| ----- | -------------- | -------- |
| E1 | dedup_review, quality_review, data_validation | CRITICAL |
| E2 | message_review, ban_recovery, sequence_approval | HIGH |
| E3 | price_override, contract_approval, discount_approval | CRITICAL |
| E4 | refund_approval, credit_approval, contract_signature | CRITICAL |
| E5 | winback_approval, kol_approval, churn_intervention | MEDIUM |

---

## 1. APPROVAL SERVICE TESTS

### 1.1 Task Creation

```typescript
// packages/hitl/tests/approval-service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ApprovalService } from '../src/approval.service';
import { createTestDb, seedApprovalConfig } from '@cerniq/test-utils';

describe('ApprovalService', () => {
  let service: ApprovalService;
  let db: TestDatabase;
  
  beforeEach(async () => {
    db = await createTestDb();
    await seedApprovalConfig(db);
    service = new ApprovalService(db);
  });
  
  describe('createTask', () => {
    it('should create task with correct SLA for priority', async () => {
      const task = await service.createTask({
        tenantId: 'tenant-123',
        entityType: 'dedup_candidate',
        entityId: 'entity-123',
        approvalType: 'dedup_review',
        priority: 'high',
        pipelineStage: 'E1',
      });
      
      expect(task.id).toBeDefined();
      expect(task.status).toBe('pending');
      expect(task.slaMinutes).toBe(30); // High priority = 30 min
      expect(task.dueAt).toBeInstanceOf(Date);
      expect(task.dueAt.getTime()).toBeGreaterThan(Date.now());
    });
    
    it('should calculate SLA based on approval type config', async () => {
      const normalTask = await service.createTask({
        tenantId: 'tenant-123',
        entityType: 'silver_company',
        entityId: 'entity-456',
        approvalType: 'quality_review',
        priority: 'normal',
        pipelineStage: 'E1',
      });
      
      expect(normalTask.slaMinutes).toBe(120); // Normal = 2 hours
    });
    
    it('should store metadata correctly', async () => {
      const metadata = {
        companyA: 'comp-1',
        companyB: 'comp-2',
        similarity: 0.85,
      };
      
      const task = await service.createTask({
        tenantId: 'tenant-123',
        entityType: 'dedup_candidate',
        entityId: 'entity-789',
        approvalType: 'dedup_review',
        priority: 'normal',
        pipelineStage: 'E1',
        metadata,
      });
      
      expect(task.metadata).toEqual(metadata);
    });
    
    it('should link to BullMQ job for resume', async () => {
      const task = await service.createTask({
        tenantId: 'tenant-123',
        entityType: 'silver_company',
        entityId: 'entity-abc',
        approvalType: 'data_validation',
        priority: 'normal',
        pipelineStage: 'E1',
        bullmqJobId: 'job-123',
        bullmqQueueName: 'silver:promote',
      });
      
      expect(task.bullmqJobId).toBe('job-123');
      expect(task.bullmqQueueName).toBe('silver:promote');
    });
  });
});
```

### 1.2 State Transitions

```typescript
describe('ApprovalService State Transitions', () => {
  
  describe('claim', () => {
    it('should transition pending → assigned', async () => {
      const task = await createPendingTask();
      
      await service.claim(task.id, 'user-123');
      
      const updated = await service.getTask(task.id);
      expect(updated.status).toBe('assigned');
      expect(updated.assignedTo).toBe('user-123');
      expect(updated.assignedAt).toBeInstanceOf(Date);
    });
    
    it('should prevent claiming already assigned task', async () => {
      const task = await createPendingTask();
      await service.claim(task.id, 'user-123');
      
      await expect(service.claim(task.id, 'user-456'))
        .rejects.toThrow('Task already assigned');
    });
    
    it('should allow reassignment by admin', async () => {
      const task = await createPendingTask();
      await service.claim(task.id, 'user-123');
      
      await service.reassign(task.id, 'user-456', 'admin-role');
      
      const updated = await service.getTask(task.id);
      expect(updated.assignedTo).toBe('user-456');
    });
  });
  
  describe('decide', () => {
    it('should transition assigned → approved', async () => {
      const task = await createAssignedTask();
      
      await service.decide(task.id, {
        decision: 'approved',
        reason: 'Data verified correct',
        decidedBy: 'user-123',
      });
      
      const updated = await service.getTask(task.id);
      expect(updated.status).toBe('approved');
      expect(updated.decision).toBe('approved');
      expect(updated.decisionReason).toBe('Data verified correct');
      expect(updated.decidedAt).toBeInstanceOf(Date);
    });
    
    it('should transition assigned → rejected', async () => {
      const task = await createAssignedTask();
      
      await service.decide(task.id, {
        decision: 'rejected',
        reason: 'Invalid data detected',
        decidedBy: 'user-123',
      });
      
      const updated = await service.getTask(task.id);
      expect(updated.status).toBe('rejected');
    });
    
    it('should require reason for rejection', async () => {
      const task = await createAssignedTask();
      
      await expect(service.decide(task.id, {
        decision: 'rejected',
        reason: '', // Empty reason
        decidedBy: 'user-123',
      })).rejects.toThrow('Rejection reason required');
    });
    
    it('should prevent double decision', async () => {
      const task = await createApprovedTask();
      
      await expect(service.decide(task.id, {
        decision: 'rejected',
        reason: 'Changed my mind',
        decidedBy: 'user-123',
      })).rejects.toThrow('Task already decided');
    });
  });
});
```

### 1.3 Escalation

```typescript
describe('ApprovalService Escalation', () => {
  
  it('should schedule warning at 80% SLA', async () => {
    const task = await service.createTask({
      tenantId: 'tenant-123',
      entityType: 'entity',
      entityId: 'id',
      approvalType: 'dedup_review',
      priority: 'normal', // 60 min SLA
      pipelineStage: 'E1',
    });
    
    // Check that warning job is scheduled
    const warningJob = await escalationQueue.getJob(`warn-${task.id}`);
    expect(warningJob).toBeDefined();
    expect(warningJob.delay).toBe(48 * 60 * 1000); // 80% of 60 min
  });
  
  it('should schedule escalation at 100% SLA', async () => {
    const task = await service.createTask({
      tenantId: 'tenant-123',
      entityType: 'entity',
      entityId: 'id',
      approvalType: 'dedup_review',
      priority: 'normal', // 60 min SLA
      pipelineStage: 'E1',
    });
    
    const escalationJob = await escalationQueue.getJob(`esc-${task.id}`);
    expect(escalationJob).toBeDefined();
    expect(escalationJob.delay).toBe(60 * 60 * 1000); // 100% of 60 min
  });
  
  it('should cancel escalation jobs when decided', async () => {
    const task = await createAssignedTask();
    
    await service.decide(task.id, {
      decision: 'approved',
      reason: 'OK',
      decidedBy: 'user-123',
    });
    
    const warningJob = await escalationQueue.getJob(`warn-${task.id}`);
    const escalationJob = await escalationQueue.getJob(`esc-${task.id}`);
    
    expect(warningJob).toBeNull(); // Removed
    expect(escalationJob).toBeNull(); // Removed
  });
  
  it('should auto-expire task when SLA exceeded', async () => {
    // Create task with very short SLA for testing
    vi.useFakeTimers();
    
    const task = await service.createTask({
      tenantId: 'tenant-123',
      entityType: 'entity',
      entityId: 'id',
      approvalType: 'test_review',
      priority: 'urgent', // Assume 5 min SLA
      pipelineStage: 'E1',
    });
    
    // Fast forward past SLA
    vi.advanceTimersByTime(6 * 60 * 1000); // 6 minutes
    
    // Process escalation
    await processEscalationQueue();
    
    const updated = await service.getTask(task.id);
    expect(updated.status).toBe('escalated');
    expect(updated.escalationLevel).toBe(1);
    
    vi.useRealTimers();
  });
});
```

---

## 2. AUDIT LOGGING TESTS

```typescript
// packages/hitl/tests/audit-log.test.ts
describe('HITL Audit Logging', () => {
  
  it('should log task creation', async () => {
    const task = await service.createTask(taskData);
    
    const logs = await getAuditLogs(task.id);
    expect(logs).toContainEqual(
      expect.objectContaining({
        action: 'TASK_CREATED',
        taskId: task.id,
        performedBy: 'system',
      })
    );
  });
  
  it('should log decision with full context', async () => {
    const task = await createAssignedTask();
    
    await service.decide(task.id, {
      decision: 'approved',
      reason: 'Verified',
      decidedBy: 'user-123',
    });
    
    const logs = await getAuditLogs(task.id);
    const decisionLog = logs.find(l => l.action === 'DECISION_APPROVED');
    
    expect(decisionLog).toMatchObject({
      taskId: task.id,
      performedBy: 'user-123',
      details: {
        reason: 'Verified',
        previousStatus: 'assigned',
        newStatus: 'approved',
      },
    });
  });
  
  it('should be immutable (no updates allowed)', async () => {
    const log = await createAuditLog();
    
    await expect(
      db.execute(sql`UPDATE approval_audit_log SET action = 'HACKED' WHERE id = ${log.id}`)
    ).rejects.toThrow(); // Trigger should block
  });
  
  it('should maintain hash chain integrity', async () => {
    const task = await createPendingTask();
    await service.claim(task.id, 'user-1');
    await service.decide(task.id, { decision: 'approved', reason: 'OK', decidedBy: 'user-1' });
    
    const logs = await getAuditLogs(task.id);
    
    // Verify hash chain
    for (let i = 1; i < logs.length; i++) {
      expect(logs[i].previousHash).toBe(logs[i - 1].eventHash);
    }
  });
});
```

---

## 3. RLS & AUTHORIZATION TESTS

```typescript
// packages/hitl/tests/authorization.test.ts
describe('HITL Authorization', () => {
  
  it('should enforce tenant isolation', async () => {
    const taskTenantA = await service.createTask({
      tenantId: 'tenant-A',
      ...taskData,
    });
    
    // Switch to tenant B context
    await setTenantContext('tenant-B');
    
    // Should not find task from tenant A
    await expect(service.getTask(taskTenantA.id))
      .rejects.toThrow('Task not found');
  });
  
  it('should allow only eligible roles to decide', async () => {
    const task = await createAssignedTask({
      requiredRole: 'manager',
    });
    
    // User without manager role
    await expect(service.decide(task.id, {
      decision: 'approved',
      reason: 'OK',
      decidedBy: 'user-without-role',
    })).rejects.toThrow('Insufficient permissions');
  });
  
  it('should validate assignment based on workload', async () => {
    // Create 10 tasks for user
    for (let i = 0; i < 10; i++) {
      await createAssignedTask({ assignedTo: 'busy-user' });
    }
    
    const newTask = await createPendingTask();
    
    // Should warn about workload
    const result = await service.claim(newTask.id, 'busy-user');
    expect(result.warning).toBe('User at capacity');
  });
});
```

---

## 4. BullMQ JOB RESUME TESTS

```typescript
// packages/hitl/tests/job-resume.test.ts
describe('HITL Job Resume', () => {
  
  it('should resume blocked job when approved', async () => {
    // Create a job that pauses for approval
    const job = await promotionQueue.add('promote', {
      silverId: 'silver-123',
      requiresApproval: true,
    });
    
    // Job should create approval task and pause
    await waitForJobState(job, 'paused');
    
    const task = await findApprovalTask('promote', job.id);
    expect(task).toBeDefined();
    
    // Approve
    await service.decide(task.id, {
      decision: 'approved',
      reason: 'Looks good',
      decidedBy: 'user-123',
    });
    
    // Job should complete
    await waitForJobState(job, 'completed');
    
    const result = await job.getReturnValue();
    expect(result.success).toBe(true);
  });
  
  it('should fail blocked job when rejected', async () => {
    const job = await promotionQueue.add('promote', {
      silverId: 'silver-456',
      requiresApproval: true,
    });
    
    await waitForJobState(job, 'paused');
    
    const task = await findApprovalTask('promote', job.id);
    
    await service.decide(task.id, {
      decision: 'rejected',
      reason: 'Data issues',
      decidedBy: 'user-123',
    });
    
    // Job should fail with rejection
    await waitForJobState(job, 'failed');
    
    const failedReason = await job.failedReason;
    expect(failedReason).toContain('HITL rejected');
  });
});
```

---

## 5. XState MACHINE TESTS

```typescript
// packages/hitl/tests/state-machine.test.ts
import { interpret } from 'xstate';
import { approvalMachine } from '../src/state-machine';

describe('Approval State Machine', () => {
  
  it('should have correct initial state', () => {
    const machine = interpret(approvalMachine).start();
    expect(machine.state.value).toBe('pending');
  });
  
  it('should allow valid transitions', () => {
    const machine = interpret(approvalMachine).start();
    
    machine.send('CLAIM');
    expect(machine.state.value).toBe('assigned');
    
    machine.send('APPROVE');
    expect(machine.state.value).toBe('approved');
  });
  
  it('should block invalid transitions', () => {
    const machine = interpret(approvalMachine).start();
    
    // Cannot approve from pending
    machine.send('APPROVE');
    expect(machine.state.value).toBe('pending'); // Unchanged
  });
  
  it('should handle escalation path', () => {
    const machine = interpret(approvalMachine).start();
    
    machine.send('CLAIM');
    machine.send('ESCALATE');
    
    expect(machine.state.value).toBe('escalated');
    expect(machine.state.context.escalationLevel).toBe(1);
  });
});
```

---

## CHECKLIST VALIDARE

### Core Functionality

- [ ] Task creation with SLA calculation
- [ ] Claim/assign flow
- [ ] Approve/reject flow
- [ ] Escalation scheduling
- [ ] Decision prevents double-submission

### Security

- [ ] Tenant isolation via RLS
- [ ] Role-based access for decisions
- [ ] Audit log immutability
- [ ] Hash chain integrity

### Integration

- [ ] BullMQ job pause/resume
- [ ] Notification triggers
- [ ] Metrics emission
- [ ] UI websocket updates

---

**Document generat:** 20 Ianuarie 2026  
**Conformitate:** Master Spec v1.2, Unified HITL System Spec
