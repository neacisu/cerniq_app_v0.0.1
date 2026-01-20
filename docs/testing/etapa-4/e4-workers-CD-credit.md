# CERNIQ.APP — TESTE E4: CREDIT SCORING

## Teste pentru credit scoring cu Termene.ro

**Categorii:** C-D | **Workeri:** 5

---

## TESTE

```typescript
describe('Credit Scoring', () => {
  it('should calculate credit score', async () => {
    const customer = await createCustomer({
      cui: '12345678',
      orderHistory: [{ total: 5000, paid: true }],
    });
    
    const score = await creditService.calculateScore(customer.id);
    expect(score.value).toBeGreaterThanOrEqual(0);
    expect(score.value).toBeLessThanOrEqual(100);
  });
  
  it('should factor in Termene.ro data', async () => {
    server.use(http.get('https://termene.ro/*', () => 
      HttpResponse.html('<div class="dosare">0 dosare</div>')
    ));
    const score = await creditService.calculateScore('customer-1');
    expect(score.factors.termeneRisk).toBe('low');
  });
  
  it('should reduce score for late payments', async () => {
    const customer = await createCustomer({
      orderHistory: [
        { total: 5000, paid: true, daysLate: 30 },
      ],
    });
    const score = await creditService.calculateScore(customer.id);
    expect(score.value).toBeLessThan(50);
  });
});

describe('Credit Limits', () => {
  it('should set limit based on score', async () => {
    const customer = await createCustomerWithScore(80);
    const limit = await creditService.calculateLimit(customer.id);
    expect(limit).toBeGreaterThan(0);
  });
  
  it('should deny credit for low score', async () => {
    const customer = await createCustomerWithScore(20);
    const limit = await creditService.calculateLimit(customer.id);
    expect(limit).toBe(0);
  });
  
  it('should track credit usage', async () => {
    const customer = await createCustomerWithLimit(10000);
    await creditService.use(customer.id, 3000);
    expect(await creditService.getAvailable(customer.id)).toBe(7000);
  });
});
```

---

**Document generat:** 20 Ianuarie 2026
