# CERNIQ.APP — TESTING TOOLS STACK

## Tooling complet pentru testare automatizată

**Versiunea:** 1.0 | **Data:** 20 Ianuarie 2026 | **Status:** NORMATIV

---

## CUPRINS

1. [Unit & Integration Testing](#1-unit--integration-testing)
2. [E2E Testing](#2-e2e-testing)
3. [Performance Testing](#3-performance-testing)
4. [Contract Testing](#4-contract-testing)
5. [Chaos Engineering](#5-chaos-engineering)
6. [Security Testing](#6-security-testing)
7. [Database Testing](#7-database-testing)
8. [Mocking & Fixtures](#8-mocking--fixtures)
9. [Coverage & Reporting](#9-coverage--reporting)
10. [CI Integration](#10-ci-integration)

---

## 1. UNIT & INTEGRATION TESTING

### 1.1 Vitest

**Versiune:** 3.x (Core Test Runner)

```bash
pnpm add -D vitest @vitest/coverage-v8 @vitest/ui
```

#### Configurare

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'e2e'],
    
    // Parallel execution
    pool: 'threads',
    poolOptions: {
      threads: { singleThread: false },
    },
    
    // Timeouts
    testTimeout: 10000,
    hookTimeout: 30000,
    
    // Coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
      include: ['src/**/*.ts'],
      exclude: [
        '**/*.d.ts',
        '**/*.test.ts',
        '**/fixtures/**',
        '**/mocks/**',
      ],
    },
    
    // Setup files
    setupFiles: ['./tests/setup.ts'],
    
    // Reporters
    reporters: ['default', 'json'],
    outputFile: './test-results.json',
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@test': resolve(__dirname, './tests'),
    },
  },
});
```

#### Scripts package.json

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:integration": "vitest run --config vitest.integration.config.ts"
  }
}
```

### 1.2 Supertest (HTTP Testing)

**Versiune:** 7.x

```typescript
// tests/integration/api.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { buildApp } from '../../src/app';

describe('API Integration', () => {
  let request: supertest.SuperTest<supertest.Test>;

  beforeAll(async () => {
    const app = await buildApp();
    await app.ready();
    request = supertest(app.server);
  });

  it('GET /health returns 200', async () => {
    const response = await request.get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'healthy',
      version: expect.any(String),
    });
  });
});
```

---

## 2. E2E TESTING

### 2.1 Playwright

**Versiune:** 1.49.x

```bash
pnpm add -D @playwright/test
npx playwright install
```

#### Configurare playwright

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['junit', { outputFile: 'test-results/e2e-junit.xml' }],
  ],
  
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Timeouts
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

#### Page Object Pattern

```typescript
// tests/e2e/pages/LoginPage.ts
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId('email-input');
    this.passwordInput = page.getByTestId('password-input');
    this.submitButton = page.getByTestId('submit-button');
    this.errorMessage = page.getByTestId('error-message');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }
}
```

---

## 3. PERFORMANCE TESTING

### 3.1 k6

**Versiune:** 0.55.x

```bash
brew install k6  # macOS
# sau
sudo apt install k6  # Ubuntu
```

#### Configurare Scenarii

```javascript
// tests/performance/scenarios.js
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const requestCount = new Counter('requests');
const latencyTrend = new Trend('latency');

export const options = {
  scenarios: {
    // Smoke test - sanity check
    smoke: {
      executor: 'constant-vus',
      vus: 5,
      duration: '1m',
    },
    // Load test - normal traffic
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 0 },
      ],
    },
    // Stress test - breaking point
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 500 },
        { duration: '5m', target: 1000 },
        { duration: '2m', target: 0 },
      ],
    },
    // Spike test - sudden burst
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 },
        { duration: '1m', target: 1000 },
        { duration: '10s', target: 0 },
      ],
    },
  },
  
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.05'],
  },
};

export default function () {
  group('API Companies', () => {
    const res = http.get(`${__ENV.API_URL}/api/v1/companies`, {
      headers: { Authorization: `Bearer ${__ENV.TOKEN}` },
    });
    
    requestCount.add(1);
    latencyTrend.add(res.timings.duration);
    
    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 200ms': (r) => r.timings.duration < 200,
      'has data': (r) => r.json().data !== undefined,
    });
    
    errorRate.add(!success);
  });
  
  sleep(0.1 + Math.random() * 0.2);
}
```

#### Output și Reporting

```bash
# Run cu output JSON
k6 run --out json=results.json tests/performance/load.js

# Run cu Prometheus output
k6 run --out experimental-prometheus-rw tests/performance/load.js

# Run cu HTML report (via xk6-dashboard)
xk6-dashboard run tests/performance/load.js
```

---

## 4. CONTRACT TESTING

### 4.1 Pact

**Versiune:** 14.x

```bash
pnpm add -D @pact-foundation/pact
```

#### Consumer Side

```typescript
// tests/contract/consumer/companies.pact.ts
import { PactV4, MatchersV3 } from '@pact-foundation/pact';

const provider = new PactV4({
  consumer: 'WebAdminApp',
  provider: 'CompaniesService',
  dir: './pacts',
});

describe('Companies API Contract - Consumer', () => {
  it('fetches a company by ID', async () => {
    await provider
      .addInteraction()
      .given('a company with ID abc-123 exists')
      .uponReceiving('a request for company abc-123')
      .withRequest('GET', '/api/v1/companies/abc-123', (builder) => {
        builder.headers({ Authorization: MatchersV3.like('Bearer token') });
      })
      .willRespondWith(200, (builder) => {
        builder
          .headers({ 'Content-Type': 'application/json' })
          .jsonBody({
            id: MatchersV3.uuid(),
            cui: MatchersV3.string('12345678'),
            denumire: MatchersV3.string('Test SRL'),
            createdAt: MatchersV3.datetime("yyyy-MM-dd'T'HH:mm:ss.SSSXXX"),
          });
      })
      .executeTest(async (mockServer) => {
        const response = await fetch(
          `${mockServer.url}/api/v1/companies/abc-123`,
          { headers: { Authorization: 'Bearer test' } }
        );
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('cui');
      });
  });
});
```

#### Provider Verification

```typescript
// tests/contract/provider/verify.ts
import { Verifier } from '@pact-foundation/pact';

describe('Provider Verification', () => {
  it('validates contracts with consumers', async () => {
    await new Verifier({
      providerBaseUrl: 'http://localhost:3000',
      pactUrls: ['./pacts/WebAdminApp-CompaniesService.json'],
      stateHandlers: {
        'a company with ID abc-123 exists': async () => {
          await seedCompany({ id: 'abc-123' });
        },
      },
    }).verifyProvider();
  });
});
```

---

## 5. CHAOS ENGINEERING

### 5.1 Pumba

**Versiune:** Latest

```bash
docker pull gaiaadm/pumba:latest
```

#### Scenarii

```yaml
# docker-compose.chaos.yml
version: '3.8'

services:
  # Kill random container every 5 min
  chaos-kill:
    image: gaiaadm/pumba:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: >
      --random
      --interval 5m
      kill
      --signal SIGKILL
      re2:cerniq-.*

  # Network delay on API
  chaos-delay:
    image: gaiaadm/pumba:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: >
      netem
      --duration 1m
      --tc-image gaiadocker/iproute2
      delay
      --time 200
      --jitter 50
      cerniq-api

  # Network loss on workers
  chaos-loss:
    image: gaiaadm/pumba:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: >
      netem
      --duration 30s
      --tc-image gaiadocker/iproute2
      loss
      --percent 10
      cerniq-workers
```

#### Verificare Resilience

```typescript
// tests/chaos/redis-failure.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('Redis Failure Resilience', () => {
  it('should handle Redis temporary failure', async () => {
    // Kill Redis
    await execAsync('docker kill cerniq-redis');
    
    // Wait 5 seconds
    await sleep(5000);
    
    // API should return 503 but not crash
    const response = await fetch('http://localhost:3000/health');
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      status: 'degraded',
      redis: 'unhealthy',
    });
    
    // Restart Redis
    await execAsync('docker start cerniq-redis');
    
    // Wait for reconnection
    await sleep(10000);
    
    // API should recover
    const recoveredResponse = await fetch('http://localhost:3000/health');
    expect(recoveredResponse.status).toBe(200);
  }, 60000);
});
```

---

## 6. SECURITY TESTING

### 6.1 Trivy

```bash
# Install
brew install trivy  # macOS

# Scan dependencies
trivy fs --scanners vuln .

# Scan Docker image
trivy image cerniq-api:latest

# CI configuration
trivy fs --exit-code 1 --severity HIGH,CRITICAL .
```

### 6.2 OWASP ZAP

```bash
# Docker run
docker run -t owasp/zap2docker-stable zap-baseline.py -t https://staging.cerniq.app

# With authentication
docker run -v $(pwd):/zap/wrk:rw owasp/zap2docker-stable zap-full-scan.py \
  -t https://staging.cerniq.app \
  -r zap-report.html
```

### 6.3 ESLint Security Plugin

```javascript
// eslint.config.js
import security from 'eslint-plugin-security';

export default [
  {
    plugins: { security },
    rules: {
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-unsafe-regex': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-possible-timing-attacks': 'warn',
    },
  },
];
```

---

## 7. DATABASE TESTING

### 7.1 pgTAP

```sql
-- Install
CREATE EXTENSION IF NOT EXISTS pgtap;

-- Run tests
SELECT * FROM runtests('tests/db/');
```

### 7.2 Drizzle Test Utilities

```typescript
// packages/test-utils/src/database.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { v4 as uuid } from 'uuid';

export async function createTestDatabase() {
  const testDbName = `cerniq_test_${uuid().replace(/-/g, '')}`;
  
  // Create database
  const adminPool = new Pool({ database: 'postgres' });
  await adminPool.query(`CREATE DATABASE ${testDbName}`);
  await adminPool.end();
  
  // Connect to test database
  const pool = new Pool({ database: testDbName });
  const db = drizzle(pool);
  
  // Run migrations
  await migrate(db, { migrationsFolder: './drizzle' });
  
  return {
    db,
    pool,
    name: testDbName,
    cleanup: async () => {
      await pool.end();
      const admin = new Pool({ database: 'postgres' });
      await admin.query(`DROP DATABASE ${testDbName}`);
      await admin.end();
    },
  };
}
```

---

## 8. MOCKING & FIXTURES

### 8.1 MSW (Mock Service Worker)

```typescript
// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  // ANAF API mock
  http.get('https://webservicesp.anaf.ro/api/*', ({ request }) => {
    const url = new URL(request.url);
    const cui = url.searchParams.get('cui');
    
    return HttpResponse.json({
      found: [
        {
          cui: Number(cui),
          denumire: 'Mock Company SRL',
          platitor_tva: true,
        },
      ],
    });
  }),
  
  // OpenAI mock
  http.post('https://api.openai.com/v1/chat/completions', () => {
    return HttpResponse.json({
      id: 'mock-id',
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'Mock AI response',
          },
        },
      ],
    });
  }),
];

// tests/setup.ts
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

export const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### 8.2 Fixtures

```typescript
// tests/fixtures/companies.ts
import { faker } from '@faker-js/faker';

export function createCompanyFixture(overrides = {}) {
  return {
    id: faker.string.uuid(),
    tenantId: faker.string.uuid(),
    cui: faker.string.numeric(8),
    denumire: faker.company.name(),
    platitorTva: faker.datatype.boolean(),
    codCaenPrincipal: faker.helpers.arrayElement(['0111', '0112', '0113']),
    judet: faker.helpers.arrayElement(['București', 'Cluj', 'Timiș']),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
}

export function createCompaniesFixtures(count: number, overrides = {}) {
  return Array.from({ length: count }, () => createCompanyFixture(overrides));
}
```

---

## 9. COVERAGE & REPORTING

### 9.1 Coverage Tools

```typescript
// vitest.config.ts - coverage section
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html', 'lcov', 'cobertura'],
  reportsDirectory: './coverage',
  
  // Thresholds
  thresholds: {
    global: {
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
    },
    // Per-file thresholds for critical paths
    'src/features/hitl/**': {
      lines: 95,
      functions: 95,
    },
    'src/features/payments/**': {
      lines: 95,
      functions: 95,
    },
  },
}
```

### 9.2 CI Reporting

```yaml
# .github/workflows/test.yml
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v4
  with:
    files: ./coverage/lcov.info
    flags: unittests
    fail_ci_if_error: true
    
- name: SonarCloud Scan
  uses: SonarSource/sonarcloud-github-action@v2
  env:
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

---

## 10. CI INTEGRATION

### 10.1 GitHub Actions Complete

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck

  unit-tests:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:coverage
      - uses: codecov/codecov-action@v4

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    services:
      postgres:
        image: postgis/postgis:18-3.6
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      redis:
        image: redis:7.4-alpine
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:integration
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379

  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: npx playwright install --with-deps
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Trivy
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          severity: 'HIGH,CRITICAL'
          exit-code: '1'
```

---

## MATRICE VERSIUNI TOOLS

| Tool | Versiune | Scop |
| ---- | -------- | ---- |
| Vitest | 3.x | Unit/Integration |
| Playwright | 1.49.x | E2E |
| k6 | 0.55.x | Performance |
| Pact | 14.x | Contract |
| Pumba | latest | Chaos |
| Trivy | latest | Security |
| MSW | 2.x | Mocking |
| pgTAP | 1.3.x | Database |
| Faker.js | 9.x | Fixtures |

---

**Document generat:** 20 Ianuarie 2026  
**Conformitate:** Master Spec v1.2
