# CERNIQ.APP — TESTE E3: PRICING & DISCOUNTS

## Teste pentru dynamic pricing și discount rules

**Categorie:** E | **Workeri:** 6

---

## TESTE

```typescript
describe('Pricing Engine', () => {
  it('should calculate base price', () => {
    const price = pricingEngine.calculate({ sku: 'SKU-001', quantity: 1 });
    expect(price.basePrice).toBe(500);
  });
  
  it('should apply volume discount', () => {
    const price = pricingEngine.calculate({ sku: 'SKU-001', quantity: 100 });
    expect(price.discount).toBeGreaterThan(0);
    expect(price.finalPrice).toBeLessThan(50000);
  });
  
  it('should apply customer tier discount', () => {
    const price = pricingEngine.calculate({
      sku: 'SKU-001',
      quantity: 10,
      customerTier: 'gold',
    });
    expect(price.tierDiscount).toBe(10); // 10%
  });
  
  it('should cap maximum discount', () => {
    const price = pricingEngine.calculate({
      sku: 'SKU-001',
      quantity: 1000,
      customerTier: 'platinum',
      promoCode: 'SUMMER20',
    });
    expect(price.totalDiscountPercent).toBeLessThanOrEqual(25);
  });
});

describe('Discount Approval', () => {
  it('should auto-approve < 15%', async () => {
    const result = await discountService.request({ percent: 10, orderId: 'ord-1' });
    expect(result.approved).toBe(true);
    expect(result.method).toBe('auto');
  });
  
  it('should require HITL >= 15%', async () => {
    const result = await discountService.request({ percent: 20, orderId: 'ord-2' });
    expect(result.approved).toBe(false);
    expect(result.pendingApproval).toBe(true);
  });
});
```

---

**Document generat:** 20 Ianuarie 2026
