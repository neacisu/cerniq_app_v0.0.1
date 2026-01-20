# CERNIQ.APP — TESTE E2: QUOTA GUARDIAN

## Teste pentru Lua scripts și quota management

**Categorie:** A | **Workeri:** 6

---

## TESTE

```typescript
describe('Quota Lua Scripts', () => {
  it('should atomically check and consume', async () => {
    await redis.set('quota:phone:123:daily', '200');
    const result = await redis.eval(CONSUME_QUOTA_LUA, 1, 'quota:phone:123:daily');
    expect(result).toBe(199);
  });
  
  it('should reject when exhausted', async () => {
    await redis.set('quota:phone:123:daily', '0');
    const result = await redis.eval(CONSUME_QUOTA_LUA, 1, 'quota:phone:123:daily');
    expect(result).toBe(-1);
  });
  
  it('should reset daily quotas', async () => {
    await redis.set('quota:phone:123:daily', '50');
    await quotaService.resetDaily();
    const quota = await redis.get('quota:phone:123:daily');
    expect(quota).toBe('200');
  });
});

describe('Multi-Channel Aggregation', () => {
  it('should aggregate across channels', async () => {
    await quotaService.consume('whatsapp', 50);
    await quotaService.consume('email', 30);
    const total = await quotaService.getTotalConsumed();
    expect(total).toBe(80);
  });
});
```

---

**Document generat:** 20 Ianuarie 2026
