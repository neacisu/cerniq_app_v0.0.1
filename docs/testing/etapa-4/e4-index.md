# CERNIQ.APP — ETAPA 4: INDEX TESTE POST-SALE

## Documentație testare pentru 67 workeri post-vânzare

**Versiunea:** 1.0 | **Data:** 20 Ianuarie 2026  
**Referință:** [etapa4-plan-implementare-COMPLET.md](file:///var/www/CerniqAPP/docs/specifications/Etapa%204/etapa4-plan-implementare-COMPLET.md)

---

## SUMAR

| Categorie | Workeri | Document Teste |
| --------- | ------- | -------------- |
| A. Revolut Payments | 5 | [e4-workers-A-revolut.md](./e4-workers-A-revolut.md) |
| B. Reconciliation | 3 | [e4-workers-B-reconciliation.md](./e4-workers-B-reconciliation.md) |
| C. Credit Scoring | 3 | [e4-workers-C-credit-scoring.md](./e4-workers-C-credit-scoring.md) |
| D. Credit Limits | 2 | [e4-workers-D-credit-limits.md](./e4-workers-D-credit-limits.md) |
| E. Sameday Logistics | 4 | [e4-workers-E-sameday.md](./e4-workers-E-sameday.md) |
| F-G. Stock & Contracts | 10 | [e4-workers-FG-stock-contracts.md](./e4-workers-FG-stock-contracts.md) |
| H-J. Returns & Alerts | 8 | [e4-workers-HIJ-returns-alerts.md](./e4-workers-HIJ-returns-alerts.md) |
| K. HITL | 4 | [e4-workers-K-hitl.md](./e4-workers-K-hitl.md) |
| Schema | — | [e4-schema-orders.md](./e4-schema-orders.md) |
| API | — | [e4-api-endpoints.md](./e4-api-endpoints.md) |
| **TOTAL** | **67** | **10 documente** |

---

## KEY TEST AREAS

### Revolut Webhook Processing

```typescript
describe('Revolut Webhooks', () => {
  it('should validate webhook signature', async () => {
    const payload = JSON.stringify({ orderId: '123' });
    const signature = createRevolutSignature(payload);
    
    const result = await webhookHandler.verify(payload, signature);
    expect(result.valid).toBe(true);
  });
  
  it('should process payment.completed event', async () => {
    const event = {
      type: 'payment.completed',
      data: { orderId: 'order-123', amount: 1000 },
    };
    
    await webhookHandler.process(event);
    
    const order = await getOrder('order-123');
    expect(order.paymentStatus).toBe('paid');
  });
  
  it('should handle idempotent delivery', async () => {
    const event = { id: 'evt-123', type: 'payment.completed' };
    
    await webhookHandler.process(event);
    await webhookHandler.process(event); // Duplicate
    
    const processCount = await getEventProcessCount('evt-123');
    expect(processCount).toBe(1);
  });
});
```

### AWB Generation (Sameday)

```typescript
describe('Sameday AWB', () => {
  it('should generate valid AWB', async () => {
    const order = await createOrder({ shipping: 'sameday' });
    
    const awb = await samedayService.generateAWB(order.id);
    
    expect(awb.awbNumber).toMatch(/^\d{10}$/);
    expect(awb.pdfUrl).toBeDefined();
  });
  
  it('should track AWB status', async () => {
    const awb = await createAWB();
    
    const status = await samedayService.getStatus(awb.awbNumber);
    
    expect(['in_transit', 'delivered', 'returned']).toContain(status.state);
  });
});
```

### Bank Reconciliation

```typescript
describe('Reconciliation', () => {
  it('should match payment to order', async () => {
    const order = await createOrder({ total: 1500 });
    const payment = await createBankPayment({
      reference: order.reference,
      amount: 1500,
    });
    
    await reconciliationWorker.process(payment);
    
    const updatedOrder = await getOrder(order.id);
    expect(updatedOrder.paymentId).toBe(payment.id);
  });
  
  it('should flag amount mismatch', async () => {
    const order = await createOrder({ total: 1500 });
    const payment = await createBankPayment({
      reference: order.reference,
      amount: 1400, // Mismatch
    });
    
    await reconciliationWorker.process(payment);
    
    const flags = await getReconciliationFlags(order.id);
    expect(flags).toContain('AMOUNT_MISMATCH');
  });
});
```

---

## COVERAGE TARGETS

| Component | Min Coverage | Critical |
| --------- | ------------ | -------- |
| Revolut Webhooks | 95% | 100% |
| Reconciliation | 95% | 100% |
| Credit Scoring | 90% | 95% |
| AWB Generation | 85% | 90% |

---

**Document generat:** 20 Ianuarie 2026
