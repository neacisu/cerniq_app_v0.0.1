# CERNIQ.APP — TESTE E2: ORCHESTRATION

## Teste pentru sequence engine și A/B testing

**Categorie:** B | **Workeri:** 8

---

## TESTE

```typescript
describe('Sequence Engine', () => {
  it('should start sequence', async () => {
    const seq = await sequenceService.start({
      leadId: 'lead-123',
      templateId: 'seq-welcome',
    });
    expect(seq.status).toBe('active');
  });
  
  it('should execute steps in order', async () => {
    const steps = ['email', 'wait:1d', 'whatsapp', 'wait:2d', 'call'];
    const seq = await createSequence(steps);
    
    await sequenceWorker.processNextStep(seq.id);
    expect(await getCompletedSteps(seq.id)).toEqual(['email']);
  });
  
  it('should handle delays', async () => {
    const seq = await createSequenceWithDelay('1d');
    await sequenceWorker.processNextStep(seq.id);
    expect(seq.nextStepAt).toBeAfter(new Date());
  });
  
  it('should stop on reply', async () => {
    const seq = await createActiveSequence();
    await sequenceService.handleReply(seq.leadId);
    expect(await getSequence(seq.id).status).toBe('stopped');
  });
});

describe('A/B Testing', () => {
  it('should randomly assign variants', async () => {
    const variants = { A: 0, B: 0 };
    for (let i = 0; i < 1000; i++) {
      const v = await abService.assignVariant('test-exp');
      variants[v]++;
    }
    expect(variants.A).toBeCloseTo(500, -1);
    expect(variants.B).toBeCloseTo(500, -1);
  });
  
  it('should track conversion', async () => {
    await abService.trackConversion('lead-123', 'test-exp');
    const stats = await abService.getStats('test-exp');
    expect(stats.conversions).toBe(1);
  });
});
```

---

**Document generat:** 20 Ianuarie 2026
