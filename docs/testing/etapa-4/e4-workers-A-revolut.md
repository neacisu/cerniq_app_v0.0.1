# CERNIQ.APP — TESTE E4: REVOLUT PAYMENTS

## Teste pentru Revolut Business API și webhooks

**Categorie:** A | **Workeri:** 5

---

## TESTE

```typescript
describe('Revolut Integration', () => {
  it('should create payment request', async () => {
    server.use(http.post('https://sandbox-b2b.revolut.com/*', () => 
      HttpResponse.json({ id: 'pay-123', state: 'pending' })
    ));
    const payment = await revolutService.createPayment({
      amount: 5000,
      currency: 'RON',
      reference: 'ORD-001',
    });
    expect(payment.id).toBe('pay-123');
  });
  
  it('should process payment webhook', async () => {
    const webhook = {
      type: 'TransactionStateChanged',
      data: { id: 'pay-123', state: 'completed' },
    };
    await revolutService.processWebhook(webhook);
    const order = await getOrderByPaymentRef('pay-123');
    expect(order.paymentStatus).toBe('paid');
  });
  
  it('should validate webhook signature', () => {
    const payload = JSON.stringify({ id: 'test' });
    const signature = createRevolutSignature(payload);
    expect(revolutService.verifySignature(payload, signature)).toBe(true);
  });
  
  it('should handle idempotent webhooks', async () => {
    const webhook = { id: 'evt-123', type: 'TransactionStateChanged' };
    await revolutService.processWebhook(webhook);
    await revolutService.processWebhook(webhook); // Duplicate
    const count = await getWebhookProcessCount('evt-123');
    expect(count).toBe(1);
  });
});
```

---

**Document generat:** 20 Ianuarie 2026
