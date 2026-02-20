# CERNIQ.APP — TESTE F0.5: OBSERVABILITY (STACK CENTRALIZAT)

## Teste pentru OpenTelemetry (OTEL Collector local) + pipeline observability centralizat

**Fază:** F0.5 | **Taskuri:** 3

---

## TESTE

### OTEL Collector (HTTP) accepta traces/metrics

```typescript
describe("Observability (OTEL Collector)", () => {
  it("should accept traces on OTel Collector", async () => {
    const response = await fetch("http://localhost:64071/v1/traces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resourceSpans: [
          {
            resource: { attributes: [] },
            scopeSpans: [
              {
                spans: [
                  {
                    traceId: "1234567890abcdef",
                    spanId: "abcdef12",
                    name: "test-span",
                    startTimeUnixNano: Date.now() * 1e6,
                    endTimeUnixNano: Date.now() * 1e6,
                  },
                ],
              },
            ],
          },
        ],
      }),
    });

    expect([200, 202]).toContain(response.status);
  });

  it("should accept metrics on OTel Collector", async () => {
    const response = await fetch("http://localhost:64071/v1/metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resourceMetrics: [],
      }),
    });

    expect([200, 202]).toContain(response.status);
  });

  // Nota: UI-ul de observability este centralizat pe orchestrator (Grafana),
  // nu este expus ca UI local pe host.
});
```

### Log Correlation

```typescript
describe("Log-Trace Correlation", () => {
  it("should include trace_id in logs", async () => {
    // Make request that generates trace
    await api.get("/api/v1/companies");

    // Check logs for trace_id
    const logs = await getRecentLogs({ service: "api" });
    const hasTraceId = logs.some((l) => l.trace_id !== undefined);

    expect(hasTraceId).toBe(true);
  });
});
```

---

## CHECKLIST

- [ ] OTel Collector accepts traces
- [ ] OTel Collector accepts metrics
- [ ] Logs contain trace_id

---

**Document generat:** 20 Ianuarie 2026
