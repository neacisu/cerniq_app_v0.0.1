# CERNIQ.APP — TESTE F1.10: WORKERS CAT. M-P - DEDUP, SCORING

## Teste pentru deduplication, scoring, pipeline orchestration

**Fază:** F1.10 | **Workeri:** 9

---

## M.1-M.2 DEDUPLICATION

```typescript
describe('Exact Match Dedup', () => {
  it('should detect duplicate CUI', async () => {
    await insertCompany({ cui: '12345678' });
    const result = await dedupExact.findDuplicates({ cui: '12345678' });
    expect(result.duplicates).toHaveLength(1);
  });
});

describe('Fuzzy Match Dedup', () => {
  it('should detect similar companies', async () => {
    await insertCompany({ denumire: 'AGRO TEST SRL' });
    const result = await dedupFuzzy.findSimilar({ denumire: 'AGRO TSET SRL' });
    expect(result.matches[0].similarity).toBeGreaterThan(0.7);
  });
  
  it('should trigger HITL for mid-confidence', async () => {
    const result = await dedupFuzzy.process({ similarity: 0.85 });
    expect(result.requiresHitl).toBe(true);
  });
});
```

## N.1-N.3 SCORING

```typescript
describe('Quality Scorer', () => {
  it('should calculate completeness', () => {
    const score = calculateCompleteness({
      cui: '12345678',
      denumire: 'Test',
      email: null,
      telefon: null,
    });
    expect(score).toBe(50); // 2/4 fields
  });
});

describe('Lead Scorer', () => {
  it('should calculate weighted score', () => {
    const score = calculateLeadScore({
      fitScore: 80,
      engagementScore: 60,
      intentScore: 40,
    });
    // (80*0.4 + 60*0.35 + 40*0.25) = 63
    expect(score).toBe(63);
  });
});
```

## O.1-O.2 PROMOTION

```typescript
describe('Silver to Gold Promotion', () => {
  it('should promote eligible company', async () => {
    const silver = await createSilverCompany({ qualityScore: 80 });
    const result = await promotionWorker.process({ silverCompanyId: silver.id });
    expect(result.goldCompanyId).toBeDefined();
  });
  
  it('should reject low quality', async () => {
    const silver = await createSilverCompany({ qualityScore: 30 });
    const result = await promotionWorker.process({ silverCompanyId: silver.id });
    expect(result.rejected).toBe(true);
    expect(result.reason).toContain('quality');
  });
});
```

## P.1-P.2 PIPELINE

```typescript
describe('Pipeline Orchestrator', () => {
  it('should execute DAG in order', async () => {
    const executionOrder: string[] = [];
    const result = await pipeline.execute(['normalize', 'validate', 'enrich', 'score']);
    expect(result.completed).toEqual(['normalize', 'validate', 'enrich', 'score']);
  });
});
```

---

**Document generat:** 20 Ianuarie 2026
