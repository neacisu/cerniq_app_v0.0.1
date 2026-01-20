# CERNIQ.APP — ETAPA 4: TESTING STRATEGY
## Comprehensive Testing Plan
### Versiunea 1.0 | 19 Ianuarie 2026

---

## 1. Testing Pyramid

```
                    ┌─────────┐
                    │  E2E    │  5%
                    │  Tests  │
                   ─┴─────────┴─
                  ┌─────────────┐
                  │ Integration │  15%
                  │   Tests     │
                 ─┴─────────────┴─
                ┌─────────────────┐
                │    Contract     │  20%
                │     Tests       │
               ─┴─────────────────┴─
              ┌───────────────────────┐
              │      Unit Tests       │  60%
              └───────────────────────┘
```

---

## 2. Unit Tests

### 2.1 Worker Unit Tests
```typescript
// tests/workers/credit-score-calculate.test.ts
describe('CreditScoreCalculateWorker', () => {
  it('should calculate score correctly for clean company', async () => {
    const input = {
      anafData: { inactive: false, tvaStatus: 'ACTIVE' },
      financialData: { profit: 50000, revenue: 200000, equity: 30000 },
      bpiData: { status: 'CLEAN' },
      paymentHistory: { onTimeRate: 95 }
    };
    
    const result = await calculateCreditScore(input);
    
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.riskTier).toBe('HIGH');
  });
  
  it('should return BLOCKED for insolvent company', async () => {
    const input = {
      anafData: { inactive: true },
      bpiData: { status: 'INSOLVENCY' }
    };
    
    const result = await calculateCreditScore(input);
    
    expect(result.score).toBeLessThan(30);
    expect(result.riskTier).toBe('BLOCKED');
  });
});
```

### 2.2 Reconciliation Tests
```typescript
describe('PaymentReconciliation', () => {
  describe('Exact Match', () => {
    it('should match by exact reference', async () => {
      const payment = { amount: 1000, reference: 'INV-12345' };
      const invoice = { invoiceNumber: 'INV-12345', totalAmount: 1000 };
      
      const result = await reconcileExact(payment, [invoice]);
      
      expect(result.matched).toBe(true);
      expect(result.confidence).toBe(100);
    });
  });
  
  describe('Fuzzy Match', () => {
    it('should match similar amounts and names', async () => {
      const payment = { amount: 1005, counterpartyName: 'AGRO FARM SRL' };
      const invoice = { totalAmount: 1000, clientName: 'Agro Farm S.R.L.' };
      
      const result = await reconcileFuzzy(payment, [invoice]);
      
      expect(result.matched).toBe(true);
      expect(result.confidence).toBeGreaterThan(85);
    });
  });
});
```

---

## 3. Integration Tests

### 3.1 Worker Flow Tests
```typescript
describe('Order Lifecycle Flow', () => {
  it('should process order from creation to delivery', async () => {
    // Create order
    const order = await createOrder(testOrderData);
    expect(order.status).toBe('DRAFT');
    
    // Simulate payment
    await simulateRevolutWebhook({ orderId: order.id, amount: order.totalAmount });
    
    // Wait for workers
    await waitForJobCompletion('payment:reconcile:auto');
    
    // Check order updated
    const updatedOrder = await getOrder(order.id);
    expect(updatedOrder.status).toBe('PAYMENT_RECEIVED');
    
    // Check credit flow
    await waitForJobCompletion('credit:limit:check');
    await waitForJobCompletion('credit:limit:reserve');
    
    // Check contract
    await waitForJobCompletion('contract:generate:docx');
    expect(updatedOrder.contractId).toBeDefined();
  });
});
```

### 3.2 Webhook Tests
```typescript
describe('Revolut Webhook Integration', () => {
  it('should process valid webhook', async () => {
    const payload = generateRevolutWebhook('TransactionCreated', { amount: 50000 });
    const signature = generateHmacSignature(payload);
    
    const response = await request(app)
      .post('/webhooks/revolut/business')
      .set('X-Revolut-Signature-V1', signature)
      .send(payload);
    
    expect(response.status).toBe(200);
  });
  
  it('should reject invalid signature', async () => {
    const payload = generateRevolutWebhook('TransactionCreated');
    
    const response = await request(app)
      .post('/webhooks/revolut/business')
      .set('X-Revolut-Signature-V1', 'invalid')
      .send(payload);
    
    expect(response.status).toBe(401);
  });
});
```

---

## 4. Contract Tests

### 4.1 API Contract Tests
```typescript
// tests/contracts/orders-api.contract.ts
describe('Orders API Contract', () => {
  it('GET /orders should return valid schema', async () => {
    const response = await api.get('/monitoring/orders');
    
    expect(response).toMatchSchema(OrdersResponseSchema);
    expect(response.data.orders).toBeArray();
    expect(response.data.meta).toHaveProperty('total');
  });
  
  it('PATCH /orders/:id/status should accept valid transitions', async () => {
    const response = await api.patch(`/monitoring/orders/${orderId}/status`, {
      status: 'CREDIT_APPROVED'
    });
    
    expect(response.status).toBe(200);
    expect(response.data.order.status).toBe('CREDIT_APPROVED');
  });
});
```

---

## 5. E2E Tests

### 5.1 Complete Order Flow
```typescript
// tests/e2e/order-complete-flow.spec.ts
test('Complete order from quote to delivery', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name=email]', 'test@example.com');
  await page.click('button[type=submit]');
  
  // Navigate to orders
  await page.click('text=Monitoring');
  await page.click('text=Comenzi');
  
  // View order
  await page.click('text=ORD-001');
  
  // Check status
  await expect(page.locator('[data-testid=order-status]')).toHaveText('În Tranzit');
  
  // Check payment
  await expect(page.locator('[data-testid=amount-paid]')).toContainText('1,000');
});
```

---

## 6. Performance Tests

### 6.1 Worker Load Tests
```typescript
// tests/performance/workers.perf.ts
describe('Worker Performance', () => {
  it('should process 100 payments in under 60 seconds', async () => {
    const start = Date.now();
    
    // Queue 100 payment jobs
    const jobs = Array(100).fill(null).map(() => 
      queuePaymentJob(generatePaymentData())
    );
    
    await Promise.all(jobs);
    await waitForQueueEmpty('payment:reconcile:auto');
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(60000);
  });
});
```

---

## 7. Test Coverage Targets

| Component | Min Coverage |
|-----------|--------------|
| Workers | 85% |
| API Endpoints | 90% |
| UI Components | 70% |
| Database Functions | 95% |

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
