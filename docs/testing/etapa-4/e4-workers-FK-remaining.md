# CERNIQ.APP — TESTE E4: STOCK, CONTRACTS, RETURNS

## Teste pentru inventory sync, contracts, returns, alerts

**Categorii:** F-K | **Workeri:** 22

---

## STOCK SYNC

```typescript
describe('Stock Sync', () => {
  it('should sync from ERP', async () => {
    await stockSyncService.syncFromERP();
    const stock = await getStock('SKU-001');
    expect(stock).toBeGreaterThanOrEqual(0);
  });
  
  it('should emit low stock alert', async () => {
    await setStock('SKU-001', 5);
    const alerts = await alertService.checkLowStock();
    expect(alerts.find(a => a.sku === 'SKU-001')).toBeDefined();
  });
});
```

## CONTRACTS

```typescript
describe('Contract Generation', () => {
  it('should generate PDF contract', async () => {
    const order = await createOrder({ requiresContract: true });
    const contract = await contractService.generate(order.id);
    expect(contract.pdfBuffer).toBeDefined();
    expect(contract.pdfBuffer.length).toBeGreaterThan(0);
  });
  
  it('should include customer data', async () => {
    const contract = await contractService.generate('order-123');
    expect(contract.customerName).toBeDefined();
    expect(contract.cui).toBeDefined();
  });
  
  it('should require signature for high value', async () => {
    const order = await createOrder({ total: 100000 });
    const contract = await contractService.generate(order.id);
    expect(contract.requiresSignature).toBe(true);
  });
});
```

## RETURNS

```typescript
describe('Returns Processing', () => {
  it('should create return request', async () => {
    const order = await createDeliveredOrder();
    const returnReq = await returnService.create(order.id, {
      reason: 'damaged',
      items: [{ sku: 'SKU-001', qty: 1 }],
    });
    expect(returnReq.status).toBe('pending');
  });
  
  it('should require HITL for refund', async () => {
    const returnReq = await createReturnRequest();
    await returnService.approve(returnReq.id);
    const tasks = await getApprovalTasks({ type: 'refund_approval' });
    expect(tasks.find(t => t.entityId === returnReq.id)).toBeDefined();
  });
  
  it('should restock after return received', async () => {
    const returnReq = await createApprovedReturn();
    const stockBefore = await getStock('SKU-001');
    await returnService.receive(returnReq.id);
    const stockAfter = await getStock('SKU-001');
    expect(stockAfter).toBe(stockBefore + 1);
  });
});
```

## ALERTS

```typescript
describe('Alert System', () => {
  it('should send low stock alert', async () => {
    await setStock('SKU-001', 5);
    await alertService.processLowStock();
    const notifications = await getNotifications({ type: 'low_stock' });
    expect(notifications.length).toBeGreaterThan(0);
  });
  
  it('should send payment overdue alert', async () => {
    await createOrder({ paymentDue: daysAgo(7), paymentStatus: 'pending' });
    await alertService.processOverdue();
    const notifications = await getNotifications({ type: 'payment_overdue' });
    expect(notifications.length).toBeGreaterThan(0);
  });
});
```

---

**Document generat:** 20 Ianuarie 2026
