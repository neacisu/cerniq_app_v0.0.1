# CERNIQ.APP — ETAPA 4: WORKERS CATEGORII H, I, J, K
## Returns, Alerts, Audit, HITL Workers
### Versiunea 1.0 | 19 Ianuarie 2026

---

# CATEGORIA H: RETURNS & RMA (2 Workers)

## Worker #37: return:request:create

```typescript
export async function returnRequestCreateProcessor(
  job: Job<ReturnRequestInput>
): Promise<ReturnRequestOutput> {
  const { correlationId, tenantId, orderId, clientId, items, reason, reasonDetails } = job.data;
  
  // Get order and shipment
  const order = await db.query.goldOrders.findFirst({
    where: eq(goldOrders.id, orderId),
    with: { shipment: true, items: true }
  });
  
  if (!order.shipment || order.shipment.status !== 'DELIVERED') {
    throw new Error('Order not delivered, cannot initiate return');
  }
  
  // Check eligibility (14 days from delivery)
  const daysSinceDelivery = Math.floor(
    (Date.now() - new Date(order.shipment.deliveredAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  const isEligible = daysSinceDelivery <= 14;
  const requiresApproval = !isEligible || items.reduce((sum, i) => sum + i.value, 0) > 1000;
  
  // Calculate values
  const itemsValue = items.reduce((sum, item) => {
    const orderItem = order.items.find(oi => oi.id === item.orderItemId);
    return sum + (orderItem.unitPrice * item.quantity);
  }, 0);
  
  const restockingFee = reason === 'CUSTOMER_CHANGED_MIND' ? itemsValue * 0.15 : 0;
  const refundAmount = itemsValue - restockingFee;
  
  // Create return record
  const returnNumber = await generateReturnNumber(tenantId);
  
  const [returnRecord] = await db.insert(goldReturns).values({
    tenantId,
    returnNumber,
    orderId,
    clientId,
    originalShipmentId: order.shipmentId,
    status: requiresApproval ? 'REQUESTED' : 'APPROVED',
    reason,
    reasonDetails,
    items: items,
    itemsValue,
    restockingFee,
    refundAmount,
    isEligible,
    eligibilityReason: isEligible ? 'Within return period' : 'Outside return period',
    daysSinceDelivery,
    requiresApproval,
    requestedAt: new Date()
  }).returning();
  
  if (requiresApproval) {
    // Create HITL task
    await flowProducer.add({
      queueName: 'hitl:approval:return-request',
      data: { correlationId, returnId: returnRecord.id, reason, itemsValue, daysSinceDelivery }
    });
  } else {
    // Auto-approved, generate return AWB
    await flowProducer.add({
      queueName: 'sameday:return:initiate',
      data: { correlationId, returnId: returnRecord.id, orderId }
    });
  }
  
  return {
    returnId: returnRecord.id,
    returnNumber,
    status: returnRecord.status,
    isEligible,
    refundAmount,
    requiresApproval
  };
}
```

## Worker #38: return:process:stock

```typescript
export async function returnProcessStockProcessor(
  job: Job<{returnId: string, shipmentStatus: string}>
): Promise<void> {
  const { returnId, shipmentStatus } = job.data;
  
  if (shipmentStatus !== 'DELIVERED') return;
  
  const returnRecord = await db.query.goldReturns.findFirst({
    where: eq(goldReturns.id, returnId),
    with: { order: { with: { items: true } } }
  });
  
  // Update return status
  await db.update(goldReturns)
    .set({ status: 'RECEIVED', receivedAt: new Date() })
    .where(eq(goldReturns.id, returnId));
  
  // Restock items
  for (const returnItem of returnRecord.items) {
    const orderItem = returnRecord.order.items.find(oi => oi.id === returnItem.orderItemId);
    
    await db.update(goldProducts)
      .set({ stockQuantity: sql`stock_quantity + ${returnItem.quantity}` })
      .where(eq(goldProducts.id, orderItem.productId));
  }
  
  // Queue for inspection
  await flowProducer.add({
    queueName: 'return:inspect:queue',
    data: { returnId }
  });
}
```

---

# CATEGORIA I: ALERTS & NOTIFICATIONS (6 Workers)

## Worker #39: alert:client:payment-received

```typescript
export async function alertClientPaymentReceivedProcessor(
  job: Job<{orderId: string, amount: number, paymentId: string}>
): Promise<void> {
  const { orderId, amount, tenantId } = job.data;
  
  const order = await db.query.goldOrders.findFirst({
    where: eq(goldOrders.id, orderId),
    with: { client: true }
  });
  
  const templateVars = {
    clientName: order.client.companyName,
    orderNumber: order.orderNumber,
    amount: formatCurrency(amount),
    remainingAmount: formatCurrency(order.amountDue),
    isPaidInFull: order.amountDue <= 0
  };
  
  // Send WhatsApp
  if (order.client.whatsappPhone) {
    await flowProducer.add({
      queueName: 'notification:send:whatsapp',
      data: {
        phone: order.client.whatsappPhone,
        template: 'payment_received',
        variables: templateVars
      }
    });
  }
  
  // Send Email
  await flowProducer.add({
    queueName: 'notification:send:email',
    data: {
      to: order.client.contactEmail,
      template: 'payment_received',
      subject: `Plată primită - Comandă ${order.orderNumber}`,
      variables: templateVars
    }
  });
}
```

## Worker #40: alert:client:shipped

```typescript
export async function alertClientShippedProcessor(
  job: Job<{orderId: string, awbNumber: string, trackingUrl: string}>
): Promise<void> {
  const { orderId, awbNumber, trackingUrl, tenantId } = job.data;
  
  const order = await db.query.goldOrders.findFirst({
    where: eq(goldOrders.id, orderId),
    with: { client: true, shipment: true }
  });
  
  const templateVars = {
    clientName: order.client.companyName,
    orderNumber: order.orderNumber,
    awbNumber,
    trackingUrl,
    estimatedDelivery: formatDate(order.shipment.estimatedDeliveryDate),
    labelPdfUrl: order.shipment.labelPdfUrl
  };
  
  // Send WhatsApp with tracking link
  await flowProducer.add({
    queueName: 'notification:send:whatsapp',
    data: {
      phone: order.client.whatsappPhone,
      template: 'order_shipped',
      variables: templateVars
    }
  });
  
  // Send Email with AWB PDF
  await flowProducer.add({
    queueName: 'notification:send:email',
    data: {
      to: order.client.contactEmail,
      template: 'order_shipped',
      subject: `Comanda ${order.orderNumber} a fost expediată - AWB: ${awbNumber}`,
      variables: templateVars,
      attachments: [{ url: order.shipment.labelPdfUrl, filename: `AWB-${awbNumber}.pdf` }]
    }
  });
}
```

## Worker #41: alert:client:delivered

```typescript
export async function alertClientDeliveredProcessor(
  job: Job<{orderId: string}>
): Promise<void> {
  const { orderId, tenantId } = job.data;
  
  const order = await db.query.goldOrders.findFirst({
    where: eq(goldOrders.id, orderId),
    with: { client: true }
  });
  
  const templateVars = {
    clientName: order.client.companyName,
    orderNumber: order.orderNumber,
    feedbackUrl: `${process.env.APP_URL}/feedback/${orderId}`
  };
  
  // Send delivery confirmation
  await flowProducer.add({
    queueName: 'notification:send:email',
    data: {
      to: order.client.contactEmail,
      template: 'order_delivered',
      subject: `Comanda ${order.orderNumber} a fost livrată`,
      variables: templateVars
    }
  });
}
```

## Worker #42: alert:client:payment-reminder

```typescript
export async function alertClientPaymentReminderProcessor(
  job: Job<{orderId: string, daysOverdue: number, escalationLevel: string}>
): Promise<void> {
  const { orderId, daysOverdue, escalationLevel, tenantId } = job.data;
  
  const order = await db.query.goldOrders.findFirst({
    where: eq(goldOrders.id, orderId),
    with: { client: true }
  });
  
  const templateMap = {
    'NORMAL': 'payment_reminder_friendly',
    'HIGH': 'payment_reminder_urgent',
    'CRITICAL': 'payment_reminder_final'
  };
  
  const subjectMap = {
    'NORMAL': `Reminder: Plată scadentă - Comandă ${order.orderNumber}`,
    'HIGH': `URGENT: Plată restantă ${daysOverdue} zile - Comandă ${order.orderNumber}`,
    'CRITICAL': `FINAL: Acțiune imediată necesară - ${order.orderNumber}`
  };
  
  await flowProducer.add({
    queueName: 'notification:send:email',
    data: {
      to: order.client.contactEmail,
      template: templateMap[escalationLevel],
      subject: subjectMap[escalationLevel],
      variables: {
        clientName: order.client.companyName,
        orderNumber: order.orderNumber,
        amountDue: formatCurrency(order.amountDue),
        daysOverdue,
        dueDate: formatDate(order.dueDate),
        paymentUrl: `${process.env.APP_URL}/pay/${orderId}`
      }
    }
  });
}
```

## Worker #43-44: Internal Alerts

```typescript
// Worker #43: alert:internal:credit-blocked
export async function alertInternalCreditBlockedProcessor(
  job: Job<{orderId: string, clientId: string, reason: string}>
): Promise<void> {
  const { orderId, clientId, reason } = job.data;
  
  const order = await db.query.goldOrders.findFirst({
    where: eq(goldOrders.id, orderId),
    with: { client: true }
  });
  
  // Send Slack alert
  await slackClient.send({
    channel: '#sales-alerts',
    text: `:warning: Credit Blocked for Order ${order.orderNumber}`,
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: 'Credit Check Failed' } },
      { type: 'section', fields: [
        { type: 'mrkdwn', text: `*Client:* ${order.client.companyName}` },
        { type: 'mrkdwn', text: `*Order:* ${order.orderNumber}` },
        { type: 'mrkdwn', text: `*Amount:* ${formatCurrency(order.totalAmount)}` },
        { type: 'mrkdwn', text: `*Reason:* ${reason}` }
      ]}
    ]
  });
}

// Worker #44: alert:internal:daily-summary (Cron 18:00)
export async function alertInternalDailySummaryProcessor(
  job: Job<{correlationId: string}>
): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Aggregate stats
  const stats = {
    ordersCreated: await db.$count(goldOrders, and(
      gte(goldOrders.createdAt, today)
    )),
    paymentsReceived: await db.select({ total: sum(goldPayments.amount) })
      .from(goldPayments)
      .where(gte(goldPayments.createdAt, today)),
    shipmentsDelivered: await db.$count(goldShipments, and(
      eq(goldShipments.status, 'DELIVERED'),
      gte(goldShipments.deliveredAt, today)
    )),
    overdueOrders: await db.$count(goldOrders, and(
      lt(goldOrders.dueDate, today),
      gt(goldOrders.amountDue, 0)
    )),
    pendingHitl: await db.$count(hitlApprovals, eq(hitlApprovals.status, 'PENDING'))
  };
  
  // Send summary email
  await flowProducer.add({
    queueName: 'notification:send:email',
    data: {
      to: process.env.DAILY_SUMMARY_RECIPIENTS.split(','),
      template: 'daily_summary',
      subject: `Daily Summary - ${formatDate(today)}`,
      variables: stats
    }
  });
}
```

---

# CATEGORIA J: AUDIT & COMPLIANCE (3 Workers)

## Worker #45: audit:log:write

```typescript
// High-concurrency audit logger
export async function auditLogWriteProcessor(
  job: Job<AuditLogInput>
): Promise<{ logId: string }> {
  const {
    eventType, entityType, entityId, actorType, actorId,
    action, oldValues, newValues, metadata, correlationId
  } = job.data;
  
  const [log] = await db.insert(goldAuditLogsEtapa4).values({
    tenantId: job.data.tenantId,
    eventType,
    entityType,
    entityId,
    actorType,
    actorId,
    action,
    oldValues: oldValues || {},
    newValues: newValues || {},
    metadata: metadata || {},
    correlationId,
    sourceSystem: 'ETAPA4',
    success: true
  }).returning();
  
  // Also send to SigNoz
  tracer.startSpan('audit.event', {
    attributes: {
      'audit.event_type': eventType,
      'audit.entity_type': entityType,
      'audit.entity_id': entityId,
      'audit.correlation_id': correlationId
    }
  }).end();
  
  return { logId: log.id };
}
```

## Worker #46: audit:compliance:check (Cron 06:00)

```typescript
export async function auditComplianceCheckProcessor(
  job: Job<{correlationId: string}>
): Promise<ComplianceCheckResult> {
  const issues = [];
  
  // 1. Check GDPR retention (7 years for financial)
  const oldRecords = await db.query.goldAuditLogsEtapa4.findMany({
    where: lt(goldAuditLogsEtapa4.createdAt, sql`NOW() - INTERVAL '7 years'`)
  });
  if (oldRecords.length > 0) {
    issues.push({ type: 'GDPR_RETENTION', count: oldRecords.length });
  }
  
  // 2. Check e-Factura compliance (5 days from invoice)
  const pendingEfactura = await db.query.goldInvoices.findMany({
    where: and(
      isNull(goldInvoices.efacturaStatus),
      lt(goldInvoices.createdAt, sql`NOW() - INTERVAL '5 days'`)
    )
  });
  if (pendingEfactura.length > 0) {
    issues.push({ type: 'EFACTURA_OVERDUE', count: pendingEfactura.length });
  }
  
  // 3. Check unsigned contracts expiring
  const expiringContracts = await db.query.goldContracts.findMany({
    where: and(
      eq(goldContracts.status, 'SENT_FOR_SIGNATURE'),
      lt(goldContracts.expiryDate, sql`NOW() + INTERVAL '3 days'`)
    )
  });
  if (expiringContracts.length > 0) {
    issues.push({ type: 'CONTRACTS_EXPIRING', count: expiringContracts.length });
  }
  
  // Store compliance report
  await db.insert(complianceReports).values({
    reportDate: new Date(),
    issuesFound: issues.length,
    issues,
    status: issues.length === 0 ? 'COMPLIANT' : 'ISSUES_FOUND'
  });
  
  return { issuesCount: issues.length, issues };
}
```

## Worker #47: audit:data:anonymize (Cron Sunday 02:00)

```typescript
export async function auditDataAnonymizeProcessor(
  job: Job<{correlationId: string}>
): Promise<{ anonymizedCount: number }> {
  // Find records older than 7 years that need anonymization
  const cutoffDate = new Date();
  cutoffDate.setFullYear(cutoffDate.getFullYear() - 7);
  
  // Anonymize audit logs (keep structure, remove PII)
  const result = await db.execute(sql`
    UPDATE gold_audit_logs_etapa4
    SET 
      old_values = jsonb_set(old_values, '{pii}', '"[REDACTED]"'),
      new_values = jsonb_set(new_values, '{pii}', '"[REDACTED]"'),
      metadata = jsonb_set(metadata, '{anonymized}', 'true')
    WHERE created_at < ${cutoffDate}
    AND metadata->>'anonymized' IS NULL
  `);
  
  return { anonymizedCount: result.rowCount };
}
```

---

# CATEGORIA K: HITL WORKERS (6 Workers)

## Worker #48: hitl:approval:credit-override

```typescript
export async function hitlApprovalCreditOverrideProcessor(
  job: Job<CreditOverrideInput>
): Promise<{ approvalId: string }> {
  const { orderId, clientId, orderTotal, available, overage, correlationId, tenantId } = job.data;
  
  const client = await db.query.goldClients.findFirst({
    where: eq(goldClients.id, clientId)
  });
  
  // Determine approver based on overage
  const overagePercent = (overage / available) * 100;
  const approverRole = overagePercent > 10 ? 'CFO' : 'SALES_MANAGER';
  const slaHours = overagePercent > 10 ? 2 : 4;
  
  const [approval] = await db.insert(hitlApprovals).values({
    tenantId,
    taskType: 'CREDIT_OVERRIDE',
    title: `Credit Override: ${client.companyName}`,
    description: `Cerere depășire limită credit cu ${formatCurrency(overage)} pentru comandă ${orderTotal}`,
    priority: overagePercent > 20 ? 'HIGH' : 'NORMAL',
    status: 'PENDING',
    requiredRole: approverRole,
    slaExpiresAt: new Date(Date.now() + slaHours * 60 * 60 * 1000),
    entityType: 'gold_orders',
    entityId: orderId,
    metadata: {
      clientId,
      clientName: client.companyName,
      orderTotal,
      availableCredit: available,
      overage,
      overagePercent
    },
    correlationId
  }).returning();
  
  // Notify approvers
  await notifyApprovers(approverRole, approval);
  
  return { approvalId: approval.id };
}
```

## Worker #52: hitl:task:resolve

```typescript
export async function hitlTaskResolveProcessor(
  job: Job<TaskResolveInput>
): Promise<TaskResolveOutput> {
  const { approvalId, decision, notes, resolvedBy, tenantId } = job.data;
  
  const approval = await db.query.hitlApprovals.findFirst({
    where: eq(hitlApprovals.id, approvalId)
  });
  
  // Update approval
  await db.update(hitlApprovals)
    .set({
      status: decision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
      resolvedBy,
      resolvedAt: new Date(),
      resolutionNotes: notes
    })
    .where(eq(hitlApprovals.id, approvalId));
  
  // Execute resolution action based on task type
  switch (approval.taskType) {
    case 'CREDIT_OVERRIDE':
      if (decision === 'APPROVED') {
        await flowProducer.add({
          queueName: 'credit:limit:reserve',
          data: { orderId: approval.entityId, approvalId }
        });
      } else {
        await db.update(goldOrders)
          .set({ status: 'CANCELLED', cancelledAt: new Date() })
          .where(eq(goldOrders.id, approval.entityId));
      }
      break;
      
    case 'PAYMENT_INVESTIGATION':
      if (decision === 'APPROVED') {
        await flowProducer.add({
          queueName: 'payment:reconcile:manual',
          data: { paymentId: approval.entityId, matchedInvoiceId: approval.metadata.selectedInvoiceId }
        });
      }
      break;
      
    case 'REFUND_REQUEST':
      if (decision === 'APPROVED') {
        await flowProducer.add({
          queueName: 'revolut:refund:process',
          data: { refundId: approval.entityId }
        });
      }
      break;
  }
  
  return { resolvedTaskType: approval.taskType, decision };
}
```

## Worker #53: hitl:escalation:overdue

```typescript
export async function hitlEscalationOverdueProcessor(
  job: Job<{correlationId: string}>
): Promise<{ escalatedCount: number }> {
  // Find tasks past SLA
  const overdueTasks = await db.query.hitlApprovals.findMany({
    where: and(
      eq(hitlApprovals.status, 'PENDING'),
      lt(hitlApprovals.slaExpiresAt, new Date())
    )
  });
  
  for (const task of overdueTasks) {
    // Escalate to next level
    const escalationMap = {
      'SALES_MANAGER': 'CFO',
      'CFO': 'CEO',
      'FINANCE_MANAGER': 'CFO',
      'ACCOUNTING': 'CFO'
    };
    
    const newApprover = escalationMap[task.requiredRole] || 'CEO';
    
    await db.update(hitlApprovals)
      .set({
        requiredRole: newApprover,
        priority: 'CRITICAL',
        escalatedAt: new Date(),
        escalationCount: sql`escalation_count + 1`,
        slaExpiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 more hours
      })
      .where(eq(hitlApprovals.id, task.id));
    
    // Send urgent notification
    await slackClient.send({
      channel: '#escalations',
      text: `:rotating_light: ESCALATION: Task ${task.id} is overdue and escalated to ${newApprover}`
    });
  }
  
  return { escalatedCount: overdueTasks.length };
}
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
