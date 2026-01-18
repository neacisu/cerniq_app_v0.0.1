# ADR-0025: Health Check Patterns

**Status:** Accepted  
**Data:** 2026-01-15  
**Deciders:** Alex (1-Person-Team)

## Context

Toate serviciile necesită health checks pentru:

- Docker/orchestrator health monitoring
- Load balancer routing
- Dependency status verification

## Decizie

Implementăm **3-tier health checks**: liveness, readiness, dependencies.

## Consecințe

```typescript
// Health check endpoints
fastify.get('/health/live', async () => ({ status: 'ok' }));

fastify.get('/health/ready', async () => {
  const checks = await Promise.all([
    checkDatabase(),
    checkRedis(),
  ]);
  
  const allHealthy = checks.every(c => c.healthy);
  
  return {
    status: allHealthy ? 'ok' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  };
});

fastify.get('/health/deps', async () => ({
  postgres: await checkPostgres(),
  redis: await checkRedis(),
  signoz: await checkSignoz(),
}));
```

### Docker Healthcheck

```yaml
services:
  api:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:64000/health/ready"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
```

## Documentație Detaliată

Pentru specificații complete și implementare, vezi:
**[`docs/specifications/Etapa 0/etapa0-health-check-specs.md`](../../specifications/Etapa%200/etapa0-health-check-specs.md)**
