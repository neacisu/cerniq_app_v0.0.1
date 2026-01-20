# CERNIQ.APP — TESTE F0.5: OBSERVABILITY (SIGNOZ)

## Teste pentru SigNoz și OpenTelemetry

**Fază:** F0.5 | **Taskuri:** 3

---

## TESTE

### SigNoz Health

```typescript
describe('SigNoz Observability', () => {
  
  it('should accept traces on OTel Collector', async () => {
    const response = await fetch('http://localhost:4318/v1/traces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resourceSpans: [{
          resource: { attributes: [] },
          scopeSpans: [{
            spans: [{
              traceId: '1234567890abcdef',
              spanId: 'abcdef12',
              name: 'test-span',
              startTimeUnixNano: Date.now() * 1e6,
              endTimeUnixNano: Date.now() * 1e6,
            }],
          }],
        }],
      }),
    });
    
    expect([200, 202]).toContain(response.status);
  });
  
  it('should accept metrics on OTel Collector', async () => {
    const response = await fetch('http://localhost:4318/v1/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resourceMetrics: [],
      }),
    });
    
    expect([200, 202]).toContain(response.status);
  });
  
  it('should have SigNoz UI accessible', async () => {
    const response = await fetch('http://localhost:3301');
    expect(response.status).toBe(200);
  });
});
```

### Log Correlation

```typescript
describe('Log-Trace Correlation', () => {
  
  it('should include trace_id in logs', async () => {
    // Make request that generates trace
    await api.get('/api/v1/companies');
    
    // Check logs for trace_id
    const logs = await getRecentLogs({ service: 'api' });
    const hasTraceId = logs.some(l => l.trace_id !== undefined);
    
    expect(hasTraceId).toBe(true);
  });
});
```

---

## CHECKLIST

- [ ] OTel Collector accepts traces
- [ ] OTel Collector accepts metrics
- [ ] SigNoz UI accessible
- [ ] Logs contain trace_id

---

**Document generat:** 20 Ianuarie 2026
