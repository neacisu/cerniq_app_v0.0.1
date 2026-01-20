# CERNIQ.APP — TESTE E4: RECONCILIATION

## Teste pentru bank reconciliation

**Categorie:** B | **Workeri:** 3

---

## TESTE

```typescript
describe('Reconciliation', () => {
  it('should match payment to order by reference', async () => {
    const order = await createOrder({ reference: 'ORD-001', total: 1500 });
    const payment = await createBankPayment({ reference: 'ORD-001', amount: 1500 });
    
    await reconciliationService.process(payment);
    
    const updated = await getOrder(order.id);
    expect(updated.paymentId).toBe(payment.id);
    expect(updated.paymentStatus).toBe('paid');
  });
  
  it('should flag amount mismatch', async () => {
    const order = await createOrder({ reference: 'ORD-002', total: 1500 });
    const payment = await createBankPayment({ reference: 'ORD-002', amount: 1400 });
    
    await reconciliationService.process(payment);
    
    const flags = await getReconciliationFlags(order.id);
    expect(flags).toContain('AMOUNT_MISMATCH');
  });
  
  it('should flag orphan payment', async () => {
    const payment = await createBankPayment({ reference: 'UNKNOWN', amount: 1000 });
    
    await reconciliationService.process(payment);
    
    expect(payment.status).toBe('orphan');
  });
  
  it('should create HITL task for manual review', async () => {
    const payment = await createBankPayment({ reference: 'ORD-003', amount: 1400 });
    await reconciliationService.process(payment);
    
    const tasks = await getApprovalTasks({ type: 'reconciliation_review' });
    expect(tasks.find(t => t.entityId === payment.id)).toBeDefined();
  });
});
```

---

**Document generat:** 20 Ianuarie 2026
