# CERNIQ.APP — TESTE CROSS-CUTTING: CHAOS ENGINEERING

## Teste de reziliență cu Pumba și failure injection

**Scope:** Toate etapele | **Tool:** Pumba, Docker, tc

---

## SCENARII CHAOS

| Scenario | Target | Durata | Impact Așteptat |
| -------- | ------ | ------ | --------------- |
| Redis Kill | redis container | 30s | Queue stall, graceful recovery |
| PostgreSQL Kill | postgres container | 30s | API 503, reconnect |
| Network Delay | api container | 60s | Latency spike, no errors |
| Network Loss | workers containers | 60s | Job retries, no data loss |
| Memory Pressure | api container | 120s | OOM handling |
| Disk Full | postgres volume | 60s | Write failures, alerts |

---

## TESTE

### Redis Failure Recovery

```typescript
describe('Redis Failure', () => {
  it('should recover after Redis restart', async () => {
    // Add jobs to queue
    for (let i = 0; i < 100; i++) {
      await queue.add('test', { id: i });
    }
    
    // Kill Redis
    await exec('docker kill cerniq-redis');
    
    // Wait 5 seconds
    await sleep(5000);
    
    // API should return 503 for queue operations
    const response = await api.post('/api/v1/import/start');
    expect(response.status).toBe(503);
    
    // Restart Redis
    await exec('docker start cerniq-redis');
    await sleep(10000);
    
    // Should recover
    const healthResponse = await api.get('/health');
    expect(healthResponse.status).toBe(200);
    expect(healthResponse.body.components.redis).toBe('healthy');
    
    // Jobs should still be in queue
    const jobCount = await queue.count();
    expect(jobCount).toBe(100);
  }, 60000);
});
```

### PostgreSQL Failover

```typescript
describe('PostgreSQL Failure', () => {
  it('should handle connection pool exhaustion', async () => {
    // Pause PostgreSQL (simulate slow queries)
    await exec('docker pause cerniq-postgres');
    
    // API calls should timeout, not crash
    const promises = Array.from({ length: 50 }, () =>
      api.get('/api/v1/companies').timeout(5000).catch(e => e)
    );
    
    const results = await Promise.all(promises);
    
    // Should timeout, not crash
    expect(results.every(r => r.status === 408 || r.code === 'ETIMEDOUT')).toBe(true);
    
    // Unpause
    await exec('docker unpause cerniq-postgres');
    await sleep(5000);
    
    // Should recover
    const response = await api.get('/health');
    expect(response.body.components.database).toBe('healthy');
  }, 30000);
});
```

### Network Partition

```yaml
# docker-compose.chaos.yml
services:
  chaos-network-delay:
    image: gaiaadm/pumba:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: >
      netem
      --duration 60s
      --tc-image gaiadocker/iproute2
      delay
      --time 500
      --jitter 200
      cerniq-api
```

```typescript
describe('Network Delay', () => {
  it('should handle 500ms latency spike', async () => {
    // Start chaos
    await exec('docker compose -f docker-compose.chaos.yml up -d chaos-network-delay');
    
    const start = Date.now();
    const response = await api.get('/api/v1/companies');
    const duration = Date.now() - start;
    
    // Should complete but be slow
    expect(response.status).toBe(200);
    expect(duration).toBeGreaterThan(500);
    expect(duration).toBeLessThan(10000);
    
    // Stop chaos
    await exec('docker compose -f docker-compose.chaos.yml down');
  }, 120000);
});
```

---

## RUNBOOK

### Pre-Chaos Checklist

- [ ] Backup current state
- [ ] Notify team
- [ ] Ensure monitoring is active
- [ ] Prepare rollback commands

### Post-Chaos Verification

- [ ] All services healthy
- [ ] No data loss
- [ ] Metrics back to baseline
- [ ] Alerts cleared

---

**Document generat:** 20 Ianuarie 2026
