# CERNIQ.APP — ETAPA 0: HEALTH CHECK SPECIFICATIONS

## Specificații Complete pentru Health Checks

### Versiunea 1.1 | 18 Ianuarie 2026

> **📋 ADR Asociat:** [ADR-0025: Health Check Patterns](../../adr/ADR%20Etapa%200/ADR-0025-Health-Check-Patterns.md)

---

## 1. ARHITECTURĂ 3-TIER HEALTH CHECKS

## 1.1 Niveluri Health Check

| Endpoint | Scop | Verificări | Response Time |
| -------- | ---- | ---------- | ------------- |
| `/health/live` | Kubernetes liveness | Process running | < 10ms |
| `/health/ready` | Kubernetes readiness | DB + Redis connected | < 500ms |
| `/health/deps` | Debugging | All dependencies + latency | < 2000ms |

---

## 2. IMPLEMENTARE API

## 2.1 Liveness Check

```typescript
// apps/api/src/routes/health/live.ts
import { FastifyPluginAsync } from 'fastify';

const liveRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health/live', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ok'] },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }, async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString()
    };
  });
};

export default liveRoute;
```

## 2.2 Readiness Check

```typescript
// apps/api/src/routes/health/ready.ts
import { FastifyPluginAsync } from 'fastify';

interface ReadinessResponse {
  status: 'ok' | 'degraded' | 'unhealthy';
  checks: {
    database: boolean;
    redis: boolean;
  };
  timestamp: string;
}

const readyRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health/ready', async (request, reply): Promise<ReadinessResponse> => {
    const checks = {
      database: false,
      redis: false
    };

    // Check PostgreSQL
    try {
      await fastify.db.execute('SELECT 1');
      checks.database = true;
    } catch (err) {
      fastify.log.error({ err }, 'Database health check failed');
    }

    // Check Redis
    try {
      await fastify.redis.ping();
      checks.redis = true;
    } catch (err) {
      fastify.log.error({ err }, 'Redis health check failed');
    }

    const allHealthy = checks.database && checks.redis;
    const status = allHealthy ? 'ok' : 'unhealthy';

    if (!allHealthy) {
      reply.code(503);
    }

    return {
      status,
      checks,
      timestamp: new Date().toISOString()
    };
  });
};

export default readyRoute;
```

## 2.3 Dependencies Check (Detailed)

```typescript
// apps/api/src/routes/health/deps.ts
import { FastifyPluginAsync } from 'fastify';

interface DependencyCheck {
  name: string;
  status: 'healthy' | 'unhealthy';
  latencyMs: number;
  details?: Record<string, unknown>;
  error?: string;
}

interface DepsResponse {
  status: 'ok' | 'degraded' | 'unhealthy';
  dependencies: DependencyCheck[];
  timestamp: string;
}

const depsRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health/deps', async (request, reply): Promise<DepsResponse> => {
    const dependencies: DependencyCheck[] = [];

    // PostgreSQL
    const pgStart = Date.now();
    try {
      const result = await fastify.db.execute('SELECT version(), pg_postmaster_start_time()');
      dependencies.push({
        name: 'postgresql',
        status: 'healthy',
        latencyMs: Date.now() - pgStart,
        details: {
          version: result[0]?.version,
          uptime: result[0]?.pg_postmaster_start_time
        }
      });
    } catch (err) {
      dependencies.push({
        name: 'postgresql',
        status: 'unhealthy',
        latencyMs: Date.now() - pgStart,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    }

    // Redis
    const redisStart = Date.now();
    try {
      const info = await fastify.redis.info('server');
      const versionMatch = info.match(/redis_version:(\S+)/);
      dependencies.push({
        name: 'redis',
        status: 'healthy',
        latencyMs: Date.now() - redisStart,
        details: {
          version: versionMatch?.[1]
        }
      });
    } catch (err) {
      dependencies.push({
        name: 'redis',
        status: 'unhealthy',
        latencyMs: Date.now() - redisStart,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    }

    // BullMQ Queues
    const bullStart = Date.now();
    try {
      const queueNames = ['enrichment', 'outreach', 'ai-sales'];
      const queueStats = await Promise.all(
        queueNames.map(async (name) => {
          const queue = fastify.queues[name];
          if (!queue) return { name, waiting: 0, active: 0, failed: 0 };
          const counts = await queue.getJobCounts();
          return { name, ...counts };
        })
      );
      dependencies.push({
        name: 'bullmq',
        status: 'healthy',
        latencyMs: Date.now() - bullStart,
        details: { queues: queueStats }
      });
    } catch (err) {
      dependencies.push({
        name: 'bullmq',
        status: 'unhealthy',
        latencyMs: Date.now() - bullStart,
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    }

    const unhealthyCount = dependencies.filter(d => d.status === 'unhealthy').length;
    let status: 'ok' | 'degraded' | 'unhealthy';
    
    if (unhealthyCount === 0) {
      status = 'ok';
    } else if (unhealthyCount < dependencies.length) {
      status = 'degraded';
      reply.code(503);
    } else {
      status = 'unhealthy';
      reply.code(503);
    }

    return {
      status,
      dependencies,
      timestamp: new Date().toISOString()
    };
  });
};

export default depsRoute;
```

---

## 3. DOCKER HEALTHCHECKS

## 3.1 PostgreSQL

```yaml
services:
  postgres:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U cerniq -d cerniq_production"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 60s
```

## 3.2 Redis

```yaml
services:
  redis:
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
```

## 3.3 API

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

## 3.4 Traefik

```yaml
services:
  traefik:
    healthcheck:
      test: ["CMD", "traefik", "healthcheck"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## 4. RESPONSE EXAMPLES

## 4.1 Liveness Response

```json
{
  "status": "ok",
  "timestamp": "2026-01-15T10:30:00.000Z"
}
```

## 4.2 Readiness Response (Healthy)

```json
{
  "status": "ok",
  "checks": {
    "database": true,
    "redis": true
  },
  "timestamp": "2026-01-15T10:30:00.000Z"
}
```

## 4.3 Readiness Response (Unhealthy)

```json
{
  "status": "unhealthy",
  "checks": {
    "database": true,
    "redis": false
  },
  "timestamp": "2026-01-15T10:30:00.000Z"
}
```

## 4.4 Dependencies Response

```json
{
  "status": "ok",
  "dependencies": [
    {
      "name": "postgresql",
      "status": "healthy",
      "latencyMs": 12,
      "details": {
        "version": "PostgreSQL 18.1",
        "uptime": "2026-01-14T08:00:00.000Z"
      }
    },
    {
      "name": "redis",
      "status": "healthy",
      "latencyMs": 3,
      "details": {
        "version": "7.4.7"
      }
    },
    {
      "name": "bullmq",
      "status": "healthy",
      "latencyMs": 25,
      "details": {
        "queues": [
          {"name": "enrichment", "waiting": 45, "active": 5, "failed": 0},
          {"name": "outreach", "waiting": 120, "active": 10, "failed": 2}
        ]
      }
    }
  ],
  "timestamp": "2026-01-15T10:30:00.000Z"
}
```

---

## 5. MONITORING INTEGRATION

## 5.1 Prometheus Metrics

```typescript
// Expose health as Prometheus metrics
import { Counter, Gauge } from 'prom-client';

const healthCheckGauge = new Gauge({
  name: 'cerniq_health_check_status',
  help: 'Health check status (1=healthy, 0=unhealthy)',
  labelNames: ['check']
});

const healthCheckLatency = new Gauge({
  name: 'cerniq_health_check_latency_ms',
  help: 'Health check latency in milliseconds',
  labelNames: ['check']
});

// Update on each health check
healthCheckGauge.set({ check: 'database' }, checks.database ? 1 : 0);
healthCheckLatency.set({ check: 'database' }, pgLatency);
```

## 5.2 Alerting Rules

```yaml
# Prometheus alerting rules
groups:
  - name: cerniq-health
    rules:
      - alert: DatabaseUnhealthy
        expr: cerniq_health_check_status{check="database"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database health check failing"
          
      - alert: HighHealthCheckLatency
        expr: cerniq_health_check_latency_ms > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Health check latency > 1s"
```

---

**Document generat:** 15 Ianuarie 2026
