# CERNIQ.APP — ETAPA 4: WORKERS CATEGORIA I
## Alert & Notification Workers (6 Workers)
### Versiunea 1.0 | 19 Ianuarie 2026

---

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
  
  // Send WhatsApp
  await notificationService.sendWhatsApp({
    to: order.client.phone,
    template: 'payment_received',
    variables: {
      client_name: order.client.contactName,
      amount: amount.toFixed(2),
      currency: 'RON',
      order_number: order.orderNumber,
      remaining: order.amountDue.toFixed(2)
    }
  });
  
  // Send Email
  await notificationService.sendEmail({
    to: order.client.email,
    subject: `Plată primită - Comanda ${order.orderNumber}`,
    template: 'payment_received',
    variables: {
      client_name: order.client.contactName,
      amount: amount.toFixed(2),
      order_number: order.orderNumber
    }
  });
}
```

## Worker #40: alert:client:shipped
```typescript
export async function alertClientShippedProcessor(
  job: Job<{orderId: string, awbNumber: string}>
): Promise<void> {
  const { orderId, awbNumber, tenantId } = job.data;
  
  const order = await db.query.goldOrders.findFirst({
    where: eq(goldOrders.id, orderId),
    with: { client: true, shipment: true }
  });
  
  // Send WhatsApp with tracking link
  await notificationService.sendWhatsApp({
    to: order.client.phone,
    template: 'order_shipped',
    variables: {
      client_name: order.client.contactName,
      order_number: order.orderNumber,
      awb_number: awbNumber,
      tracking_url: order.shipment.trackingUrl,
      estimated_delivery: order.shipment.estimatedDeliveryDate
    }
  });
  
  // Send Email with PDF label
  await notificationService.sendEmail({
    to: order.client.email,
    subject: `Comanda ${order.orderNumber} a fost expediată`,
    template: 'order_shipped',
    attachments: [{ filename: `AWB-${awbNumber}.pdf`, url: order.shipment.labelPdfUrl }]
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
  
  // Send WhatsApp with feedback request
  await notificationService.sendWhatsApp({
    to: order.client.phone,
    template: 'order_delivered',
    variables: {
      client_name: order.client.contactName,
      order_number: order.orderNumber,
      feedback_url: `${process.env.APP_URL}/feedback/${orderId}`
    }
  });
}
```

## Worker #42: alert:client:payment-reminder
```typescript
export async function alertClientPaymentReminderProcessor(
  job: Job<{orderId: string, daysOverdue: number, level: 'FIRST' | 'SECOND' | 'FINAL'}>
): Promise<void> {
  const { orderId, daysOverdue, level, tenantId } = job.data;
  
  const order = await db.query.goldOrders.findFirst({
    where: eq(goldOrders.id, orderId),
    with: { client: true }
  });
  
  const templates = {
    FIRST: { whatsapp: 'payment_reminder_1', email: 'payment_reminder_friendly' },
    SECOND: { whatsapp: 'payment_reminder_2', email: 'payment_reminder_urgent' },
    FINAL: { whatsapp: 'payment_reminder_final', email: 'payment_reminder_legal' }
  };
  
  await notificationService.sendWhatsApp({
    to: order.client.phone,
    template: templates[level].whatsapp,
    variables: {
      client_name: order.client.contactName,
      order_number: order.orderNumber,
      amount_due: order.amountDue.toFixed(2),
      days_overdue: daysOverdue,
      due_date: order.dueDate
    }
  });
  
  await notificationService.sendEmail({
    to: order.client.email,
    subject: level === 'FINAL' 
      ? `URGENT: Factură restantă - ${order.orderNumber}`
      : `Reminder plată - ${order.orderNumber}`,
    template: templates[level].email
  });
}
```

## Worker #43: alert:internal:credit-blocked
```typescript
export async function alertInternalCreditBlockedProcessor(
  job: Job<{orderId: string, clientId: string, reason: string}>
): Promise<void> {
  const { orderId, clientId, reason, tenantId } = job.data;
  
  const order = await db.query.goldOrders.findFirst({
    where: eq(goldOrders.id, orderId),
    with: { client: true }
  });
  
  // Send Slack alert
  await slackClient.sendMessage({
    channel: '#credit-alerts',
    text: `⚠️ Credit Blocat`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Comandă blocată pentru credit*\n` +
                `Client: ${order.client.companyName}\n` +
                `Comandă: ${order.orderNumber}\n` +
                `Valoare: ${order.totalAmount} RON\n` +
                `Motiv: ${reason}`
        }
      },
      {
        type: 'actions',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: 'Vezi detalii' }, url: `${process.env.APP_URL}/orders/${orderId}` },
          { type: 'button', text: { type: 'plain_text', text: 'Aprobă override' }, action_id: 'approve_credit_override', value: orderId }
        ]
      }
    ]
  });
}
```

## Worker #44: alert:internal:daily-summary (Cron 18:00)
```typescript
export async function alertInternalDailySummaryProcessor(
  job: Job<{correlationId: string}>
): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Gather metrics
  const [ordersCreated, paymentsReceived, shipmentsDelivered, overdueOrders] = await Promise.all([
    db.select({ count: sql`count(*)` }).from(goldOrders).where(gte(goldOrders.createdAt, today)),
    db.select({ sum: sql`sum(amount)` }).from(goldPayments).where(gte(goldPayments.transactionDate, today)),
    db.select({ count: sql`count(*)` }).from(goldShipments).where(and(eq(goldShipments.status, 'DELIVERED'), gte(goldShipments.deliveredAt, today))),
    db.select({ count: sql`count(*)`, sum: sql`sum(amount_due)` }).from(goldOrders).where(and(lt(goldOrders.dueDate, today), gt(goldOrders.amountDue, 0)))
  ]);
  
  // Send email summary
  await notificationService.sendEmail({
    to: process.env.DAILY_SUMMARY_RECIPIENTS?.split(',') || ['admin@company.com'],
    subject: `📊 Raport Zilnic - ${today.toLocaleDateString('ro-RO')}`,
    template: 'daily_summary',
    variables: {
      date: today.toLocaleDateString('ro-RO'),
      orders_created: ordersCreated[0]?.count || 0,
      payments_received: (paymentsReceived[0]?.sum || 0).toFixed(2),
      shipments_delivered: shipmentsDelivered[0]?.count || 0,
      overdue_count: overdueOrders[0]?.count || 0,
      overdue_value: (overdueOrders[0]?.sum || 0).toFixed(2)
    }
  });
}
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
