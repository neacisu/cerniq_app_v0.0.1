# CERNIQ.APP — ETAPA 4: WORKERS CATEGORIA H
## Returns & RMA Workers (2 Workers)
### Versiunea 1.0 | 19 Ianuarie 2026

---

## Worker #37: return:request:create
```typescript
const RETURN_POLICY = {
  maxDaysFromDelivery: 14,
  autoApproveUnder: 500,
  requiresHitlOver: 1000
};

export async function returnRequestCreateProcessor(
  job: Job<{orderId: string, items: Array<{itemId: string, quantity: number, reason: string}>, customerNotes?: string}>
): Promise<{returnId: string, status: string}> {
  const { orderId, items, customerNotes, tenantId, correlationId } = job.data;
  
  const order = await db.query.goldOrders.findFirst({
    where: eq(goldOrders.id, orderId),
    with: { shipment: true, items: true, client: true }
  });
  
  // Check eligibility
  if (!order.shipment?.deliveredAt) {
    throw new Error('ORDER_NOT_DELIVERED');
  }
  
  const daysSinceDelivery = Math.floor(
    (Date.now() - new Date(order.shipment.deliveredAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysSinceDelivery > RETURN_POLICY.maxDaysFromDelivery) {
    return { returnId: null, status: 'REJECTED', reason: 'RETURN_PERIOD_EXPIRED' };
  }
  
  // Calculate return value
  let itemsValue = 0;
  for (const returnItem of items) {
    const orderItem = order.items.find(i => i.id === returnItem.itemId);
    if (orderItem) {
      itemsValue += orderItem.unitPrice * returnItem.quantity;
    }
  }
  
  // Create return
  const returnNumber = `RET-${Date.now()}-${orderId.slice(0, 8)}`;
  const requiresApproval = itemsValue > RETURN_POLICY.requiresHitlOver;
  
  const [returnRecord] = await db.insert(goldReturns).values({
    tenantId,
    returnNumber,
    orderId,
    originalShipmentId: order.shipmentId,
    clientId: order.clientId,
    status: itemsValue <= RETURN_POLICY.autoApproveUnder ? 'APPROVED' : 'REQUESTED',
    reason: items[0].reason,
    reasonDetails: customerNotes,
    customerNotes,
    items: items.map(i => ({ ...i, orderItemId: i.itemId })),
    itemsValue,
    isEligible: true,
    daysSinceDelivery,
    requiresApproval
  }).returning();
  
  // Auto-approve small returns
  if (itemsValue <= RETURN_POLICY.autoApproveUnder) {
    await flowProducer.add({
      queueName: 'sameday:return:initiate',
      data: { returnId: returnRecord.id }
    });
    return { returnId: returnRecord.id, status: 'AUTO_APPROVED' };
  }
  
  // Large returns need HITL
  if (requiresApproval) {
    await flowProducer.add({
      queueName: 'hitl:approval:refund-large',
      data: { returnId: returnRecord.id, itemsValue, clientId: order.clientId }
    });
    return { returnId: returnRecord.id, status: 'PENDING_APPROVAL' };
  }
  
  return { returnId: returnRecord.id, status: 'APPROVED' };
}
```

## Worker #38: return:process:stock
```typescript
export async function returnProcessStockProcessor(
  job: Job<{returnId: string, shipmentId: string}>
): Promise<void> {
  const { returnId } = job.data;
  
  const returnRecord = await db.query.goldReturns.findFirst({
    where: eq(goldReturns.id, returnId),
    with: { order: { with: { items: true } } }
  });
  
  // Restock items
  for (const returnItem of returnRecord.items as any[]) {
    const orderItem = returnRecord.order.items.find(i => i.id === returnItem.orderItemId);
    if (orderItem) {
      await db.update(goldProducts)
        .set({ stockQuantity: sql`stock_quantity + ${returnItem.quantity}` })
        .where(eq(goldProducts.id, orderItem.productId));
    }
  }
  
  // Update return status
  await db.update(goldReturns)
    .set({ status: 'RECEIVED', receivedAt: new Date() })
    .where(eq(goldReturns.id, returnId));
  
  // If inspection auto-approved, create refund
  if (returnRecord.itemsValue <= RETURN_POLICY.autoApproveUnder) {
    await db.update(goldReturns)
      .set({ status: 'REFUND_APPROVED', inspectionResult: 'APPROVED' })
      .where(eq(goldReturns.id, returnId));
    
    // Create refund
    const [refund] = await db.insert(goldRefunds).values({
      tenantId: returnRecord.tenantId,
      orderId: returnRecord.orderId,
      returnId,
      clientId: returnRecord.clientId,
      amount: returnRecord.itemsValue,
      status: 'APPROVED',
      reason: 'RETURN'
    }).returning();
    
    await db.update(goldReturns)
      .set({ refundId: refund.id, status: 'REFUND_PROCESSED' })
      .where(eq(goldReturns.id, returnId));
    
    // Process refund via Revolut
    await flowProducer.add({
      queueName: 'revolut:refund:process',
      data: { refundId: refund.id, clientId: returnRecord.clientId, amount: returnRecord.itemsValue }
    });
  }
}
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
