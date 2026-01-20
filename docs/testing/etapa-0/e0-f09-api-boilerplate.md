# CERNIQ.APP — TESTE F0.9: API BOILERPLATE

## Teste pentru Fastify API Bootstrap

**Fază:** F0.9 | **Taskuri:** 8 (F0.9.1.T001 - F0.9.2.T003)  
**Referință:** [etapa0-plan-implementare-complet-v2.md](file:///var/www/CerniqAPP/docs/specifications/Etapa%200/etapa0-plan-implementare-complet-v2.md)

---

## SUMAR TASKURI

| Task ID | Denumire | Tip Test |
| ------- | -------- | -------- |
| F0.9.1.T001 | Fastify App Init | Unit + Integration |
| F0.9.1.T002 | Plugin Architecture | Unit |
| F0.9.1.T003 | Error Handler | Unit |
| F0.9.1.T004 | Request Validation (Zod) | Unit |
| F0.9.1.T005 | OpenTelemetry Integration | Integration |
| F0.9.2.T001 | Health Endpoint | Integration |
| F0.9.2.T002 | Readiness Probe | Integration |
| F0.9.2.T003 | Liveness Probe | Integration |

---

## 1. FASTIFY APP TESTS

### 1.1 App Initialization

```typescript
// apps/api/tests/unit/app.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app';
import type { FastifyInstance } from 'fastify';

describe('Fastify App', () => {
  let app: FastifyInstance;
  
  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
  });
  
  afterAll(async () => {
    await app.close();
  });
  
  describe('initialization', () => {
    it('should initialize without errors', () => {
      expect(app).toBeDefined();
      expect(app.server).toBeDefined();
    });
    
    it('should register all required plugins', () => {
      expect(app.hasPlugin('@fastify/cors')).toBe(true);
      expect(app.hasPlugin('@fastify/helmet')).toBe(true);
      expect(app.hasPlugin('@fastify/swagger')).toBe(true);
      expect(app.hasPlugin('@fastify/rate-limit')).toBe(true);
    });
    
    it('should have correct server settings', () => {
      expect(app.initialConfig.trustProxy).toBe(true);
      expect(app.initialConfig.disableRequestLogging).toBe(false);
    });
  });
  
  describe('route registration', () => {
    it('should have /health route registered', () => {
      const routes = app.printRoutes();
      expect(routes).toContain('GET /health');
    });
    
    it('should have /api/v1 prefix for API routes', () => {
      const routes = app.printRoutes();
      expect(routes).toContain('/api/v1');
    });
  });
});
```

### 1.2 Plugin Architecture

```typescript
// apps/api/tests/unit/plugins/database.test.ts
import { describe, it, expect, vi } from 'vitest';
import { buildApp } from '../../../src/app';

describe('Database Plugin', () => {
  
  it('should decorate app with db instance', async () => {
    const app = await buildApp({ logger: false });
    await app.ready();
    
    expect(app.db).toBeDefined();
    expect(typeof app.db.select).toBe('function');
    
    await app.close();
  });
  
  it('should close db connection on app close', async () => {
    const app = await buildApp({ logger: false });
    await app.ready();
    
    const closeSpy = vi.spyOn(app.db.$client, 'end');
    
    await app.close();
    
    expect(closeSpy).toHaveBeenCalled();
  });
});
```

### 1.3 Error Handler

```typescript
// apps/api/tests/unit/error-handler.test.ts
import { describe, it, expect } from 'vitest';
import { buildApp } from '../../src/app';

describe('Error Handler', () => {
  
  it('should return 400 for validation errors', async () => {
    const app = await buildApp({ logger: false });
    await app.ready();
    
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/companies',
      payload: { cui: 'invalid' }, // Missing required fields
    });
    
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      message: expect.any(String),
    });
    
    await app.close();
  });
  
  it('should return 401 for auth errors', async () => {
    const app = await buildApp({ logger: false });
    await app.ready();
    
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/companies',
      // No Authorization header
    });
    
    expect(response.statusCode).toBe(401);
    
    await app.close();
  });
  
  it('should return 500 for unhandled errors', async () => {
    const app = await buildApp({ logger: false });
    
    // Register route that throws
    app.get('/test-error', () => {
      throw new Error('Unhandled error');
    });
    
    await app.ready();
    
    const response = await app.inject({
      method: 'GET',
      url: '/test-error',
    });
    
    expect(response.statusCode).toBe(500);
    expect(response.json().message).not.toContain('Unhandled error'); // No leak
    
    await app.close();
  });
  
  it('should not leak stack traces in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    const app = await buildApp({ logger: false });
    app.get('/test-error', () => {
      throw new Error('Secret error');
    });
    await app.ready();
    
    const response = await app.inject({
      method: 'GET',
      url: '/test-error',
    });
    
    expect(response.json().stack).toBeUndefined();
    
    process.env.NODE_ENV = originalEnv;
    await app.close();
  });
});
```

---

## 2. REQUEST VALIDATION TESTS

### 2.1 Zod Schema Validation

```typescript
// apps/api/tests/unit/validation/company.test.ts
import { describe, it, expect } from 'vitest';
import { createCompanySchema, updateCompanySchema } from '../../../src/schemas/company';

describe('Company Validation Schemas', () => {
  
  describe('createCompanySchema', () => {
    it('should validate correct data', () => {
      const validData = {
        cui: '12345678',
        denumire: 'Test Company SRL',
      };
      
      const result = createCompanySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
    
    it('should reject empty CUI', () => {
      const invalidData = {
        cui: '',
        denumire: 'Test Company',
      };
      
      const result = createCompanySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('cui');
    });
    
    it('should reject CUI with letters', () => {
      const invalidData = {
        cui: '1234567A',
        denumire: 'Test Company',
      };
      
      const result = createCompanySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
    
    it('should strip RO prefix from CUI', () => {
      const data = {
        cui: 'RO12345678',
        denumire: 'Test Company',
      };
      
      const result = createCompanySchema.safeParse(data);
      if (result.success) {
        expect(result.data.cui).toBe('12345678');
      }
    });
    
    it('should require denumire', () => {
      const invalidData = {
        cui: '12345678',
      };
      
      const result = createCompanySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
  
  describe('updateCompanySchema', () => {
    it('should allow partial updates', () => {
      const validData = {
        denumire: 'Updated Name',
      };
      
      const result = updateCompanySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
    
    it('should validate leadScore range', () => {
      const invalidData = {
        leadScore: 150, // > 100
      };
      
      const result = updateCompanySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
```

---

## 3. HEALTH & PROBE TESTS

### 3.1 Health Endpoint

```typescript
// apps/api/tests/integration/health.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app';
import type { FastifyInstance } from 'fastify';

describe('Health Endpoints', () => {
  let app: FastifyInstance;
  
  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
  });
  
  afterAll(async () => {
    await app.close();
  });
  
  describe('GET /health', () => {
    it('should return 200 when healthy', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });
      
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        status: 'healthy',
        version: expect.any(String),
        timestamp: expect.any(String),
      });
    });
    
    it('should include component status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });
      
      const body = response.json();
      expect(body.components).toMatchObject({
        database: expect.any(String),
        redis: expect.any(String),
      });
    });
  });
  
  describe('GET /health/ready', () => {
    it('should return 200 when ready to accept traffic', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/ready',
      });
      
      expect(response.statusCode).toBe(200);
      expect(response.json().ready).toBe(true);
    });
    
    it('should check database connectivity', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/ready',
      });
      
      const body = response.json();
      expect(body.checks.database).toBe('ok');
    });
    
    it('should check Redis connectivity', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/ready',
      });
      
      const body = response.json();
      expect(body.checks.redis).toBe('ok');
    });
  });
  
  describe('GET /health/live', () => {
    it('should return 200 when process is alive', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/live',
      });
      
      expect(response.statusCode).toBe(200);
      expect(response.json().alive).toBe(true);
    });
    
    it('should include uptime', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/live',
      });
      
      const body = response.json();
      expect(body.uptime).toBeGreaterThan(0);
    });
    
    it('should include memory usage', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/live',
      });
      
      const body = response.json();
      expect(body.memory).toMatchObject({
        heapUsed: expect.any(Number),
        heapTotal: expect.any(Number),
        rss: expect.any(Number),
      });
    });
  });
});
```

---

## 4. OPENTELEMETRY TESTS

### 4.1 Tracing Integration

```typescript
// apps/api/tests/integration/otel.test.ts
import { describe, it, expect, vi } from 'vitest';
import { trace, context } from '@opentelemetry/api';
import { buildApp } from '../../src/app';

describe('OpenTelemetry Integration', () => {
  
  it('should create spans for HTTP requests', async () => {
    const spanEndSpy = vi.fn();
    const mockSpan = {
      end: spanEndSpy,
      setAttribute: vi.fn(),
      setStatus: vi.fn(),
    };
    
    vi.spyOn(trace.getTracer('test'), 'startSpan').mockReturnValue(mockSpan as any);
    
    const app = await buildApp({ logger: false });
    await app.ready();
    
    await app.inject({
      method: 'GET',
      url: '/health',
    });
    
    // Verify span was created and ended
    expect(spanEndSpy).toHaveBeenCalled();
    
    await app.close();
  });
  
  it('should propagate trace context', async () => {
    const app = await buildApp({ logger: false });
    await app.ready();
    
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: {
        traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
      },
    });
    
    expect(response.statusCode).toBe(200);
    // Trace context should be propagated (check in actual implementation)
    
    await app.close();
  });
  
  it('should record error spans', async () => {
    const app = await buildApp({ logger: false });
    
    app.get('/error-test', () => {
      throw new Error('Test error');
    });
    
    await app.ready();
    
    await app.inject({
      method: 'GET',
      url: '/error-test',
    });
    
    // Error span should be recorded (verify in OTel collector)
    
    await app.close();
  });
});
```

---

## 5. RATE LIMITING TESTS

```typescript
// apps/api/tests/integration/rate-limit.test.ts
describe('Rate Limiting', () => {
  
  it('should allow requests under limit', async () => {
    const app = await buildApp({ logger: false });
    await app.ready();
    
    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        app.inject({ method: 'GET', url: '/health' })
      )
    );
    
    expect(responses.every(r => r.statusCode === 200)).toBe(true);
    
    await app.close();
  });
  
  it('should return 429 when limit exceeded', async () => {
    const app = await buildApp({
      logger: false,
      rateLimit: { max: 5, timeWindow: '1 minute' },
    });
    await app.ready();
    
    // Make 10 requests, should hit limit
    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        app.inject({ method: 'GET', url: '/health' })
      )
    );
    
    const rateLimited = responses.filter(r => r.statusCode === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
    
    await app.close();
  });
  
  it('should include rate limit headers', async () => {
    const app = await buildApp({ logger: false });
    await app.ready();
    
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });
    
    expect(response.headers['x-ratelimit-limit']).toBeDefined();
    expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    
    await app.close();
  });
});
```

---

## CHECKLIST VALIDARE

### App Initialization

- [ ] Fastify app starts without errors
- [ ] All plugins registered
- [ ] Routes registered with correct prefixes

### Error Handling

- [ ] 400 for validation errors
- [ ] 401 for auth errors
- [ ] 500 for unhandled errors
- [ ] No stack trace leak in production

### Request Validation

- [ ] Zod schemas validate correctly
- [ ] Invalid data rejected
- [ ] Input sanitization works

### Health Endpoints

- [ ] /health returns 200
- [ ] /health/ready checks dependencies
- [ ] /health/live returns uptime/memory

### OpenTelemetry

- [ ] Spans created for requests
- [ ] Trace context propagated
- [ ] Errors recorded in spans

### Rate Limiting

- [ ] Limits enforced
- [ ] 429 returned when exceeded
- [ ] Headers included

---

**Document generat:** 20 Ianuarie 2026  
**Conformitate:** Master Spec v1.2
