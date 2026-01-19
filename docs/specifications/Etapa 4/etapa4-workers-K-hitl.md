# CERNIQ.APP — ETAPA 4: WORKERS CATEGORIA K
## Human Intervention Workers - HITL (6 Workers)
### Versiunea 1.0 | 19 Ianuarie 2026

---

## HITL Approval Matrix
```typescript
const HITL_APPROVAL_MATRIX = {
  'credit:override:small': { approver: 'SALES_MANAGER', slaHours: 4, escalateTo: 'CFO' },
  'credit:override:large': { approver: 'CFO', slaHours: 2, escalateTo: 'CEO' },
  'credit:limit:high': { approver: 'CFO', slaHours: 4, escalateTo: 'CEO' },
  'refund:large': { approver: 'FINANCE_MANAGER', slaHours: 4, escalateTo: 'CFO' },
  'contract:atypical': { approver: 'LEGAL', slaHours: 24, escalateTo: 'CEO' },
  'payment:unmatched': { approver: 'ACCOUNTING', slaHours: 8, escalateTo: 'CFO' }
};
```

## Worker #48: hitl:approval:credit-override
```typescript
export async function hitlApprovalCreditOverrideProcessor(
  job: Job<{orderId: string, clientId: string, profileId: string, orderTotal: number, available: number, overage: number}>
): Promise<{approvalId: string}> {
  const { orderId, clientId, orderTotal, available, overage, tenantId, correlationId } = job.data;
  
  const client = await db.query.goldClients.findFirst({ where: eq(goldClients.id, clientId) });
  const overagePercent = (overage / available) * 100;
  
  const taskType = overagePercent > 10 ? 'credit:override:large' : 'credit:override:small';
  const matrix = HITL_APPROVAL_MATRIX[taskType];
  
  // Create HITL task
  const [approval] = await db.insert(hitlApprovals).values({
    tenantId,
    taskType,
    title: `Credit Override - ${client.companyName}`,
    description: `Comandă ${orderTotal} RON necesită override. Credit disponibil: ${available} RON. Depășire: ${overage} RON (${overagePercent.toFixed(1)}%)`,
    entityType: 'gold_orders',
    entityId: orderId,
    priority: overagePercent > 20 ? 'HIGH' : 'NORMAL',
    status: 'PENDING',
    assignedRole: matrix.approver,
    slaDeadline: new Date(Date.now() + matrix.slaHours * 60 * 60 * 1000),
    escalateTo: matrix.escalateTo,
    metadata: { orderId, clientId, orderTotal, available, overage, overagePercent },
    correlationId
  }).returning();
  
  // Update order
  await db.update(goldOrders)
    .set({ status: 'PENDING_APPROVAL', creditApprovalId: approval.id })
    .where(eq(goldOrders.id, orderId));
  
  // Notify approver
  await notifyApprover(matrix.approver, approval);
  
  // Schedule escalation check
  await flowProducer.add({
    queueName: 'hitl:escalation:overdue',
    data: { approvalId: approval.id },
    opts: { delay: matrix.slaHours * 60 * 60 * 1000 }
  });
  
  return { approvalId: approval.id };
}
```

## Worker #49: hitl:approval:credit-limit
```typescript
export async function hitlApprovalCreditLimitProcessor(
  job: Job<{profileId: string, proposedLimit: number, riskTier: string, score: number}>
): Promise<{approvalId: string}> {
  const { profileId, proposedLimit, riskTier, score, tenantId, correlationId } = job.data;
  
  const profile = await db.query.goldCreditProfiles.findFirst({
    where: eq(goldCreditProfiles.id, profileId),
    with: { client: true }
  });
  
  const matrix = HITL_APPROVAL_MATRIX['credit:limit:high'];
  
  const [approval] = await db.insert(hitlApprovals).values({
    tenantId,
    taskType: 'credit:limit:high',
    title: `Aprobare Limită Credit - ${profile.client.companyName}`,
    description: `Limită propusă: ${proposedLimit} EUR. Score: ${score}. Tier: ${riskTier}`,
    entityType: 'gold_credit_profiles',
    entityId: profileId,
    priority: 'HIGH',
    status: 'PENDING',
    assignedRole: matrix.approver,
    slaDeadline: new Date(Date.now() + matrix.slaHours * 60 * 60 * 1000),
    metadata: { profileId, proposedLimit, riskTier, score, clientName: profile.client.companyName },
    correlationId
  }).returning();
  
  await notifyApprover(matrix.approver, approval);
  
  return { approvalId: approval.id };
}
```

## Worker #50: hitl:approval:refund-large
```typescript
export async function hitlApprovalRefundLargeProcessor(
  job: Job<{returnId: string, itemsValue: number, clientId: string}>
): Promise<{approvalId: string}> {
  const { returnId, itemsValue, clientId, tenantId, correlationId } = job.data;
  
  const returnRecord = await db.query.goldReturns.findFirst({
    where: eq(goldReturns.id, returnId),
    with: { client: true, order: true }
  });
  
  const matrix = HITL_APPROVAL_MATRIX['refund:large'];
  
  const [approval] = await db.insert(hitlApprovals).values({
    tenantId,
    taskType: 'refund:large',
    title: `Aprobare Refund - ${returnRecord.client.companyName}`,
    description: `Refund solicitat: ${itemsValue} RON pentru comanda ${returnRecord.order.orderNumber}`,
    entityType: 'gold_returns',
    entityId: returnId,
    priority: itemsValue > 5000 ? 'HIGH' : 'NORMAL',
    status: 'PENDING',
    assignedRole: matrix.approver,
    slaDeadline: new Date(Date.now() + matrix.slaHours * 60 * 60 * 1000),
    metadata: { returnId, itemsValue, orderId: returnRecord.orderId },
    correlationId
  }).returning();
  
  await db.update(goldReturns)
    .set({ approvalId: approval.id })
    .where(eq(goldReturns.id, returnId));
  
  return { approvalId: approval.id };
}
```

## Worker #51: hitl:investigation:payment
```typescript
export async function hitlInvestigationPaymentProcessor(
  job: Job<{paymentId: string, amount: number, counterpartyName: string, candidates: any[]}>
): Promise<{approvalId: string}> {
  const { paymentId, amount, counterpartyName, candidates, tenantId, correlationId } = job.data;
  
  const matrix = HITL_APPROVAL_MATRIX['payment:unmatched'];
  
  const [approval] = await db.insert(hitlApprovals).values({
    tenantId,
    taskType: 'payment:unmatched',
    title: `Investigare Plată - ${amount} RON de la ${counterpartyName}`,
    description: `Plată nereconciliată automat. ${candidates.length} candidați găsiți.`,
    entityType: 'gold_payments',
    entityId: paymentId,
    priority: 'NORMAL',
    status: 'PENDING',
    assignedRole: matrix.approver,
    slaDeadline: new Date(Date.now() + matrix.slaHours * 60 * 60 * 1000),
    metadata: { paymentId, amount, counterpartyName, candidates },
    correlationId
  }).returning();
  
  await db.update(goldPayments)
    .set({ reconciliationStatus: 'UNMATCHED' })
    .where(eq(goldPayments.id, paymentId));
  
  return { approvalId: approval.id };
}
```

## Worker #52: hitl:task:resolve
```typescript
export async function hitlTaskResolveProcessor(
  job: Job<{approvalId: string, decision: 'APPROVED' | 'REJECTED', userId: string, notes?: string}>
): Promise<void> {
  const { approvalId, decision, userId, notes, tenantId, correlationId } = job.data;
  
  const approval = await db.query.hitlApprovals.findFirst({
    where: eq(hitlApprovals.id, approvalId)
  });
  
  // Update approval
  await db.update(hitlApprovals)
    .set({
      status: decision,
      resolvedBy: userId,
      resolvedAt: new Date(),
      resolutionNotes: notes
    })
    .where(eq(hitlApprovals.id, approvalId));
  
  // Execute decision based on task type
  switch (approval.taskType) {
    case 'credit:override:small':
    case 'credit:override:large':
      if (decision === 'APPROVED') {
        await db.update(goldOrders)
          .set({ status: 'CREDIT_APPROVED', creditApproved: true })
          .where(eq(goldOrders.id, approval.entityId));
        
        // Reserve credit with override
        await flowProducer.add({
          queueName: 'credit:limit:reserve',
          data: { 
            orderId: approval.entityId, 
            profileId: approval.metadata.profileId,
            amount: approval.metadata.orderTotal,
            isOverride: true
          }
        });
      } else {
        await db.update(goldOrders)
          .set({ status: 'CANCELLED', cancelledAt: new Date() })
          .where(eq(goldOrders.id, approval.entityId));
      }
      break;
      
    case 'credit:limit:high':
      if (decision === 'APPROVED') {
        await db.update(goldCreditProfiles)
          .set({ creditLimit: approval.metadata.proposedLimit })
          .where(eq(goldCreditProfiles.id, approval.entityId));
      }
      break;
      
    case 'refund:large':
      if (decision === 'APPROVED') {
        await db.update(goldReturns)
          .set({ status: 'REFUND_APPROVED' })
          .where(eq(goldReturns.id, approval.entityId));
        
        // Process refund
        await flowProducer.add({
          queueName: 'revolut:refund:process',
          data: { returnId: approval.entityId }
        });
      } else {
        await db.update(goldReturns)
          .set({ status: 'REFUND_REJECTED' })
          .where(eq(goldReturns.id, approval.entityId));
      }
      break;
      
    case 'payment:unmatched':
      if (decision === 'APPROVED' && approval.metadata.selectedInvoiceId) {
        await flowProducer.add({
          queueName: 'payment:reconcile:manual',
          data: { 
            paymentId: approval.entityId, 
            invoiceId: approval.metadata.selectedInvoiceId 
          }
        });
      }
      break;
  }
  
  await logAudit('HITL_RESOLVED', 'hitl_approvals', approvalId, correlationId, { decision, userId });
}
```

## Worker #53: hitl:escalation:overdue
```typescript
export async function hitlEscalationOverdueProcessor(
  job: Job<{approvalId: string}>
): Promise<void> {
  const { approvalId } = job.data;
  
  const approval = await db.query.hitlApprovals.findFirst({
    where: eq(hitlApprovals.id, approvalId)
  });
  
  // Check if still pending
  if (approval.status !== 'PENDING') {
    return; // Already resolved
  }
  
  // Escalate
  const matrix = HITL_APPROVAL_MATRIX[approval.taskType];
  
  await db.update(hitlApprovals)
    .set({
      assignedRole: matrix.escalateTo,
      priority: 'CRITICAL',
      escalatedAt: new Date(),
      escalationCount: sql`escalation_count + 1`
    })
    .where(eq(hitlApprovals.id, approvalId));
  
  // Notify escalation target
  await slackClient.sendMessage({
    channel: '#escalations',
    text: `🚨 ESCALARE: Task HITL depășit SLA`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${approval.title}*\n${approval.description}\nEscalat către: ${matrix.escalateTo}`
        }
      }
    ]
  });
  
  // Schedule next escalation
  await flowProducer.add({
    queueName: 'hitl:escalation:overdue',
    data: { approvalId },
    opts: { delay: 2 * 60 * 60 * 1000 } // 2 hours
  });
}
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
