# CERNIQ.APP — TESTE E3: STOCK & INVENTORY

## Teste pentru stock management și reservations

**Categorie:** F | **Workeri:** 6

---

## TESTE

```typescript
describe('Stock Service', () => {
  it('should check availability', async () => {
    await setStock('SKU-001', 100);
    const available = await stockService.checkAvailability('SKU-001', 50);
    expect(available).toBe(true);
  });
  
  it('should reject insufficient stock', async () => {
    await setStock('SKU-001', 10);
    const available = await stockService.checkAvailability('SKU-001', 50);
    expect(available).toBe(false);
  });
  
  it('should reserve stock atomically', async () => {
    await setStock('SKU-001', 100);
    const reservation = await stockService.reserve('SKU-001', 30);
    expect(reservation.id).toBeDefined();
    expect(await getAvailableStock('SKU-001')).toBe(70);
  });
  
  it('should release expired reservations', async () => {
    const reservation = await stockService.reserve('SKU-001', 30, { ttl: 100 });
    await sleep(150);
    await stockService.releaseExpired();
    expect(await getAvailableStock('SKU-001')).toBe(100);
  });
  
  it('should confirm reservation', async () => {
    const reservation = await stockService.reserve('SKU-001', 30);
    await stockService.confirm(reservation.id);
    expect(await getPhysicalStock('SKU-001')).toBe(70);
  });
});
```

---

**Document generat:** 20 Ianuarie 2026
