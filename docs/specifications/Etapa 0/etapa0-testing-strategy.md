# CERNIQ.APP — ETAPA 0: TESTING STRATEGY

## Strategia Completă de Testare

### Versiunea 1.0 | 15 Ianuarie 2026

---

## 1. PIRAMIDA TESTELOR

```text
         ╱╲
        ╱  ╲         E2E Tests (5%)
       ╱────╲        - Critical user journeys
      ╱      ╲       - Playwright
     ╱────────╲
    ╱          ╲     Integration Tests (25%)
   ╱────────────╲    - API + DB + Queue
  ╱              ╲   - Real dependencies
 ╱────────────────╲
╱                  ╲  Unit Tests (70%)
╱────────────────────╲ - Pure functions
                       - Mocked dependencies
                       - Vitest
```

---

## 2. COVERAGE REQUIREMENTS

| Component | Minimum | Target | Critical |
| --------- | ------- | ------ | -------- |
| API Routes | 80% | 90% | - |
| Business Logic | 85% | 95% | - |
| Workers | 75% | 85% | - |
| Event Schemas | 90% | 95% | ✓ |
| HITL Approval | 95% | 98% | ✓ |
| Migrations | 100% | 100% | ✓ |
| Auth/Security | 95% | 98% | ✓ |

---

## 3. UNIT TESTS (VITEST)

## 3.1 Setup Vitest

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts', '**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types/**',
        '**/mocks/**'
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80
      }
    },
    setupFiles: ['./test/setup.ts'],
    testTimeout: 10000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

## 3.2 Test Setup

```typescript
// test/setup.ts
import { beforeAll, afterAll, beforeEach } from 'vitest';

// Mock environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/cerniq_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';

// Global mocks
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));
```

## 3.3 Exemple Unit Tests

```typescript
// src/lib/validators/cui.test.ts
import { describe, it, expect } from 'vitest';
import { validateCUI, formatCUI } from './cui';

describe('CUI Validator', () => {
  describe('validateCUI', () => {
    it('should accept valid CUI with checksum', () => {
      expect(validateCUI('12345678')).toBe(true);
    });

    it('should reject CUI with invalid checksum', () => {
      expect(validateCUI('12345679')).toBe(false);
    });

    it('should reject CUI with letters', () => {
      expect(validateCUI('1234567A')).toBe(false);
    });

    it('should reject empty CUI', () => {
      expect(validateCUI('')).toBe(false);
    });

    it('should handle RO prefix', () => {
      expect(validateCUI('RO12345678')).toBe(true);
    });
  });

  describe('formatCUI', () => {
    it('should remove RO prefix', () => {
      expect(formatCUI('RO12345678')).toBe('12345678');
    });

    it('should trim whitespace', () => {
      expect(formatCUI('  12345678  ')).toBe('12345678');
    });
  });
});
```

```typescript
// src/services/enrichment.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnrichmentService } from './enrichment';
import { anafClient } from '@/lib/clients/anaf';

vi.mock('@/lib/clients/anaf');

describe('EnrichmentService', () => {
  let service: EnrichmentService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EnrichmentService();
  });

  describe('enrichFromANAF', () => {
    it('should enrich company with ANAF data', async () => {
      const mockAnafData = {
        denumire: 'Test SRL',
        adresa: 'Bucuresti, Sector 1',
        stare_fiscala: 'ACTIV',
        numar_angajati: 50
      };

      vi.mocked(anafClient.getCompanyInfo).mockResolvedValue(mockAnafData);

      const result = await service.enrichFromANAF('12345678');

      expect(result).toEqual({
        name: 'Test SRL',
        address: 'Bucuresti, Sector 1',
        fiscal_status: 'ACTIV',
        employees: 50
      });
      expect(anafClient.getCompanyInfo).toHaveBeenCalledWith('12345678');
    });

    it('should handle ANAF API errors', async () => {
      vi.mocked(anafClient.getCompanyInfo).mockRejectedValue(
        new Error('API unavailable')
      );

      await expect(service.enrichFromANAF('12345678')).rejects.toThrow(
        'Enrichment failed: API unavailable'
      );
    });
  });
});
```

---

## 4. INTEGRATION TESTS

## 4.1 Test Database Setup

```typescript
// test/integration/setup.ts
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

let pgContainer: PostgreSqlContainer;
let redisContainer: RedisContainer;
let db: ReturnType<typeof drizzle>;

export async function setupTestDatabase() {
  // Start PostgreSQL container
  pgContainer = await new PostgreSqlContainer('postgis/postgis:18-3.5')
    .withDatabase('cerniq_test')
    .withUsername('test')
    .withPassword('test')
    .start();

  // Start Redis container
  redisContainer = await new RedisContainer('redis:7.4-alpine')
    .start();

  // Connect to database
  const pool = new Pool({
    connectionString: pgContainer.getConnectionUri()
  });
  db = drizzle(pool);

  // Run migrations
  await migrate(db, { migrationsFolder: './drizzle' });

  return {
    db,
    pgUri: pgContainer.getConnectionUri(),
    redisUri: `redis://${redisContainer.getHost()}:${redisContainer.getPort()}`
  };
}

export async function teardownTestDatabase() {
  await pgContainer?.stop();
  await redisContainer?.stop();
}
```

## 4.2 API Integration Tests

```typescript
// test/integration/api/companies.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '@/app';
import { setupTestDatabase, teardownTestDatabase } from '../setup';
import type { FastifyInstance } from 'fastify';

describe('Companies API', () => {
  let app: FastifyInstance;
  let testDb: Awaited<ReturnType<typeof setupTestDatabase>>;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
    app = await buildApp({
      databaseUrl: testDb.pgUri,
      redisUrl: testDb.redisUri
    });
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Clean database between tests
    await testDb.db.delete(companies);
  });

  describe('POST /api/v1/companies', () => {
    it('should create a new company', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/companies',
        headers: {
          'x-tenant-id': 'test-tenant',
          'authorization': 'Bearer test-token'
        },
        payload: {
          cui: '12345678',
          name: 'Test Company SRL'
        }
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.cui).toBe('12345678');
      expect(body.data.name).toBe('Test Company SRL');
    });

    it('should reject duplicate CUI within tenant', async () => {
      // Create first company
      await app.inject({
        method: 'POST',
        url: '/api/v1/companies',
        headers: { 'x-tenant-id': 'test-tenant', 'authorization': 'Bearer test-token' },
        payload: { cui: '12345678', name: 'First Company' }
      });

      // Try to create duplicate
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/companies',
        headers: { 'x-tenant-id': 'test-tenant', 'authorization': 'Bearer test-token' },
        payload: { cui: '12345678', name: 'Duplicate Company' }
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('GET /api/v1/companies/:id', () => {
    it('should return company by ID', async () => {
      // Create company first
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/companies',
        headers: { 'x-tenant-id': 'test-tenant', 'authorization': 'Bearer test-token' },
        payload: { cui: '12345678', name: 'Test Company' }
      });
      const created = JSON.parse(createResponse.body);

      // Get company
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/companies/${created.data.id}`,
        headers: { 'x-tenant-id': 'test-tenant', 'authorization': 'Bearer test-token' }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.id).toBe(created.data.id);
    });

    it('should return 404 for non-existent company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/companies/non-existent-id',
        headers: { 'x-tenant-id': 'test-tenant', 'authorization': 'Bearer test-token' }
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
```

---

## 5. E2E TESTS (PLAYWRIGHT)

## 5.1 Playwright Config

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI
  }
});
```

## 5.2 E2E Test Example

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('[data-testid="email-input"]', 'wrong@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'Invalid credentials'
    );
  });
});
```

---

## 6. DATABASE TESTS (pgTAP)

## 6.1 Setup pgTAP

```sql
-- Install pgTAP extension
CREATE EXTENSION IF NOT EXISTS pgtap;

-- test/db/test_constraints.sql
BEGIN;
SELECT plan(5);

-- Test tenant isolation
SELECT has_column('gold_companies', 'tenant_id', 'gold_companies has tenant_id');

-- Test unique constraint includes tenant
SELECT col_is_unique('gold_companies', ARRAY['tenant_id', 'cui'], 
  'CUI is unique per tenant');

-- Test RLS is enabled
SELECT policies_are('gold_companies', ARRAY['tenant_isolation_policy'],
  'gold_companies has tenant isolation policy');

-- Test foreign key
SELECT has_fk('gold_companies', 'FK to tenants');

-- Test not null constraints
SELECT col_not_null('gold_companies', 'cui', 'CUI cannot be null');

SELECT * FROM finish();
ROLLBACK;
```

---

## 7. CI/CD PIPELINE

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test:unit
      - uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:18-3.5
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7.4-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: pnpm test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: pnpm exec playwright install
      - run: pnpm test:e2e
```

---

**Document generat:** 15 Ianuarie 2026
