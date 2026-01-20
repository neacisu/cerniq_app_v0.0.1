# CERNIQ.APP — TESTE F1.15: TESTING & MONITORING

## Teste pentru coverage și monitoring integration

**Fază:** F1.15 | **Taskuri:** 6

---

## TESTE

```typescript
describe('Test Coverage', () => {
  it('should meet 80% threshold', async () => {
    const { stdout } = await exec('pnpm test:coverage --json');
    const coverage = JSON.parse(stdout);
    expect(coverage.total.lines.pct).toBeGreaterThanOrEqual(80);
  });
});

describe('CI Integration', () => {
  it('should have test job in CI', async () => {
    const workflow = await readYaml('.github/workflows/ci.yml');
    expect(workflow.jobs.test).toBeDefined();
  });
});

describe('Metrics Emission', () => {
  it('should emit worker metrics', async () => {
    await workerQueue.add('test', {});
    await sleep(1000);
    
    const metrics = await fetchMetrics('http://localhost:4318/metrics');
    expect(metrics).toContain('bullmq_job_completed_total');
  });
});
```

---

**Document generat:** 20 Ianuarie 2026
