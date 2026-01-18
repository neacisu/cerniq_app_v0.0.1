# CERNIQ.APP — ETAPA 1: TESTING STRATEGY

## Comprehensive Test Plan & Automation

### Versiunea 1.0 | 15 Ianuarie 2026

---

## 1. TESTING OVERVIEW

### 1.1 Test Pyramid

```text
                    ┌───────────┐
                    │    E2E    │  5%   - Playwright
                    │   Tests   │       - Critical flows
                 ┌──┴───────────┴──┐
                 │   Integration   │  15%  - API testing
                 │     Tests       │       - DB integration
              ┌──┴─────────────────┴──┐
              │      Unit Tests       │  80%  - Vitest
              │   (Functions/Logic)   │       - Fast feedback
              └───────────────────────┘
```

### 1.2 Test Stack

| Layer | Tool | Purpose |
| ------- | ------ | --------- |
| Unit | Vitest | Fast unit tests |
| Integration | Vitest + Testcontainers | API/DB tests |
| E2E | Playwright | Browser automation |
| Performance | k6 | Load testing |
| Contract | Pact | API contracts |

---

## 2. UNIT TESTING

### 2.1 Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
    setupFiles: ['./test/setup.ts'],
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@cerniq/db': path.resolve(__dirname, '../packages/db/src'),
      '@cerniq/validation': path.resolve(__dirname, '../packages/validation/src'),
    },
  },
});
```

## 2.2 Test Setup

```typescript
// test/setup.ts
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import type { PrismaClient } from '@prisma/client';

// Mock DB
export const prismaMock = mockDeep<PrismaClient>();

beforeEach(() => {
  mockReset(prismaMock);
});

// Global test utilities
global.createTestTenant = () => ({
  id: 'test-tenant-123',
  name: 'Test Tenant',
  createdAt: new Date(),
});

global.createTestUser = (overrides = {}) => ({
  id: 'test-user-123',
  tenantId: 'test-tenant-123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'operator',
  ...overrides,
});
```

## 2.3 Unit Test Examples

### CUI Validation

```typescript
// packages/validation/src/__tests__/cui.test.ts
import { describe, it, expect } from 'vitest';
import { validateCui, validateCuiChecksum } from '../validators/cui';

describe('CUI Validation', () => {
  describe('validateCuiChecksum', () => {
    it('should return true for valid CUI', () => {
      expect(validateCuiChecksum('12345678')).toBe(true);
      expect(validateCuiChecksum('1234567890')).toBe(true);
    });

    it('should return false for invalid checksum', () => {
      expect(validateCuiChecksum('12345679')).toBe(false);
      expect(validateCuiChecksum('00000000')).toBe(false);
    });

    it('should handle CUI with leading zeros', () => {
      expect(validateCuiChecksum('00123456')).toBe(true);
    });
  });

  describe('validateCui', () => {
    it('should reject non-numeric CUI', () => {
      expect(validateCui('ABC12345')).toEqual({
        valid: false,
        error: 'CUI must contain only digits',
      });
    });

    it('should reject CUI with wrong length', () => {
      expect(validateCui('123')).toEqual({
        valid: false,
        error: 'CUI must be 6-10 digits',
      });
    });

    it('should accept valid CUI', () => {
      expect(validateCui('12345678')).toEqual({
        valid: true,
        normalized: '12345678',
      });
    });
  });
});
```

### Phone Normalization

```typescript
// packages/validation/src/__tests__/phone.test.ts
import { describe, it, expect } from 'vitest';
import { normalizePhone, detectCarrier } from '../validators/phone';

describe('Phone Normalization', () => {
  describe('normalizePhone', () => {
    it('should normalize Romanian mobile numbers', () => {
      expect(normalizePhone('0721123456')).toEqual({
        valid: true,
        normalized: '+40721123456',
        type: 'MOBILE',
        national: '0721 123 456',
        international: '+40 721 123 456',
      });
    });

    it('should handle international format', () => {
      expect(normalizePhone('+40721123456')).toEqual({
        valid: true,
        normalized: '+40721123456',
        type: 'MOBILE',
        national: '0721 123 456',
        international: '+40 721 123 456',
      });
    });

    it('should normalize Romanian landline numbers', () => {
      expect(normalizePhone('0212345678')).toEqual({
        valid: true,
        normalized: '+40212345678',
        type: 'FIXED_LINE',
        national: '021 234 5678',
        international: '+40 21 234 5678',
      });
    });

    it('should reject invalid numbers', () => {
      expect(normalizePhone('123')).toEqual({
        valid: false,
        error: 'Invalid phone number',
      });
    });
  });

  describe('detectCarrier', () => {
    it('should detect Vodafone', () => {
      expect(detectCarrier('+40721123456')).toBe('Vodafone');
      expect(detectCarrier('+40722123456')).toBe('Vodafone');
    });

    it('should detect Orange', () => {
      expect(detectCarrier('+40741123456')).toBe('Orange');
      expect(detectCarrier('+40751123456')).toBe('Orange');
    });

    it('should detect Digi', () => {
      expect(detectCarrier('+40761123456')).toBe('Digi');
    });

    it('should return unknown for landlines', () => {
      expect(detectCarrier('+40212345678')).toBe('Unknown');
    });
  });
});
```

### Quality Scoring

```typescript
// packages/services/src/__tests__/quality-scoring.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { calculateCompletenessScore, calculateAccuracyScore } from '../scoring';

describe('Quality Scoring', () => {
  describe('calculateCompletenessScore', () => {
    it('should return 100 for fully complete company', () => {
      const company = {
        cui: '12345678',
        denumire: 'Test SRL',
        nrRegCom: 'J40/123/2020',
        adresaCompleta: 'Str. Test 1',
        localitate: 'București',
        judet: 'București',
        codPostal: '010101',
        emailPrincipal: 'test@example.com',
        telefonPrincipal: '+40721123456',
        website: 'https://example.com',
        codCaenPrincipal: '0111',
        formaJuridica: 'SRL',
        cifraAfaceri: 1000000,
        profitNet: 100000,
        numarAngajati: 10,
        isAgricultural: true,
        suprafataAgricola: 100,
        culturiPrincipale: ['cereale'],
        latitude: 44.4268,
        longitude: 26.1025,
      };

      const result = calculateCompletenessScore(company);
      expect(result.score).toBe(100);
      expect(result.missingFields).toHaveLength(0);
    });

    it('should calculate partial score correctly', () => {
      const company = {
        cui: '12345678',
        denumire: 'Test SRL',
        // Missing most fields
      };

      const result = calculateCompletenessScore(company);
      expect(result.score).toBeLessThan(50);
      expect(result.missingFields).toContain('adresaCompleta');
      expect(result.missingFields).toContain('emailPrincipal');
    });

    it('should weight identification fields higher', () => {
      const companyWithId = {
        cui: '12345678',
        denumire: 'Test SRL',
        nrRegCom: 'J40/123/2020',
      };

      const companyWithContact = {
        emailPrincipal: 'test@example.com',
        telefonPrincipal: '+40721123456',
        website: 'https://example.com',
      };

      const idScore = calculateCompletenessScore(companyWithId).score;
      const contactScore = calculateCompletenessScore(companyWithContact).score;

      // Identification should be weighted higher
      expect(idScore).toBeGreaterThan(contactScore);
    });
  });

  describe('calculateAccuracyScore', () => {
    it('should give full points for verified data', () => {
      const company = {
        cuiValidatedAt: new Date(),
        cuiAnafVerified: true,
        emailVerifiedAt: new Date(),
        emailStatus: 'valid',
        phoneValidatedAt: new Date(),
        hlrReachable: true,
        geocodingAccuracy: 'rooftop',
      };

      const result = calculateAccuracyScore(company);
      expect(result.score).toBeGreaterThan(90);
    });

    it('should penalize invalid email', () => {
      const company = {
        emailStatus: 'invalid',
      };

      const result = calculateAccuracyScore(company);
      expect(result.issues).toContain('email_invalid');
    });
  });
});
```

---

## 3. INTEGRATION TESTING

### 3.1 Database Integration Tests

```typescript
// test/integration/db.setup.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

let container: StartedPostgreSqlContainer;
let pool: Pool;
let db: ReturnType<typeof drizzle>;

export async function setupTestDb() {
  container = await new PostgreSqlContainer('postgres:16')
    .withDatabase('cerniq_test')
    .withUsername('test')
    .withPassword('test')
    .start();

  pool = new Pool({
    connectionString: container.getConnectionUri(),
  });

  db = drizzle(pool);

  // Run migrations
  await migrate(db, { migrationsFolder: './drizzle' });

  return { db, pool };
}

export async function teardownTestDb() {
  await pool?.end();
  await container?.stop();
}

export async function cleanupTestData() {
  await db.execute(sql`TRUNCATE bronze_contacts CASCADE`);
  await db.execute(sql`TRUNCATE silver_companies CASCADE`);
  await db.execute(sql`TRUNCATE gold_companies CASCADE`);
  await db.execute(sql`TRUNCATE approval_tasks CASCADE`);
}
```

### Worker Integration Tests

```typescript
// test/integration/workers/ingest.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDb, teardownTestDb, cleanupTestData } from '../db.setup';
import { processCSVIngest } from '@/workers/ingest/csv';
import { bronzeContacts } from '@cerniq/db/schema';
import { eq } from 'drizzle-orm';

describe('CSV Ingest Worker Integration', () => {
  let db: any;

  beforeAll(async () => {
    const setup = await setupTestDb();
    db = setup.db;
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await cleanupTestData();
  });

  it('should ingest valid CSV data', async () => {
    const csvData = `name,cui,email,phone
"Test Company SRL",12345678,test@example.com,0721123456
"Another Company SA",87654321,another@example.com,0741987654`;

    const result = await processCSVIngest({
      tenantId: 'test-tenant',
      csvContent: csvData,
      mapping: {
        name: 'name',
        cui: 'cui',
        email: 'email',
        phone: 'phone',
      },
      hasHeader: true,
    });

    expect(result.processedRows).toBe(2);
    expect(result.errorRows).toBe(0);

    const contacts = await db.select().from(bronzeContacts);
    expect(contacts).toHaveLength(2);
    expect(contacts[0].extractedName).toBe('Test Company SRL');
  });

  it('should handle duplicate CUI', async () => {
    const csvData = `name,cui
"Company A",12345678
"Company B",12345678`;

    const result = await processCSVIngest({
      tenantId: 'test-tenant',
      csvContent: csvData,
      mapping: { name: 'name', cui: 'cui' },
      skipDuplicates: true,
    });

    expect(result.processedRows).toBe(1);
    expect(result.duplicatesSkipped).toBe(1);
  });

  it('should validate CUI checksum', async () => {
    const csvData = `name,cui
"Valid Company",12345678
"Invalid Company",99999999`;

    const result = await processCSVIngest({
      tenantId: 'test-tenant',
      csvContent: csvData,
      mapping: { name: 'name', cui: 'cui' },
      validateCui: true,
    });

    expect(result.processedRows).toBe(1);
    expect(result.validationErrors).toBe(1);
  });
});
```

### 3.2 API Integration Tests

```typescript
// test/integration/api/bronze.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '@/app';
import { setupTestDb, teardownTestDb } from '../db.setup';

describe('Bronze API Integration', () => {
  let authToken: string;

  beforeAll(async () => {
    await setupTestDb();
    // Get test auth token
    authToken = await getTestAuthToken();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  describe('POST /api/v1/bronze/contacts', () => {
    it('should create bronze contact', async () => {
      const response = await request(app)
        .post('/api/v1/bronze/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          extractedName: 'Test Company SRL',
          extractedCui: '12345678',
          extractedEmail: 'test@example.com',
          sourceType: 'manual',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
    });

    it('should validate CUI format', async () => {
      const response = await request(app)
        .post('/api/v1/bronze/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          extractedName: 'Test Company',
          extractedCui: 'invalid',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/bronze/contacts', () => {
    it('should list contacts with pagination', async () => {
      // Create test data
      for (let i = 0; i < 25; i++) {
        await request(app)
          .post('/api/v1/bronze/contacts')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            extractedName: `Company ${i}`,
            sourceType: 'manual',
          });
      }

      const response = await request(app)
        .get('/api/v1/bronze/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(10);
      expect(response.body.meta.total).toBe(25);
      expect(response.body.meta.totalPages).toBe(3);
    });

    it('should filter by processing status', async () => {
      const response = await request(app)
        .get('/api/v1/bronze/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ processingStatus: 'pending' });

      expect(response.status).toBe(200);
      response.body.data.forEach((contact: any) => {
        expect(contact.processingStatus).toBe('pending');
      });
    });
  });
});
```

---

## 4. E2E TESTING

### 4.1 Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
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
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## 4.2 E2E Test Examples

### Import Flow

```typescript
// e2e/import-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Import Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should complete CSV import', async ({ page }) => {
    // Navigate to import
    await page.click('[data-testid="nav-import"]');
    await expect(page).toHaveURL('/imports');

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('e2e/fixtures/sample-contacts.csv');

    // Wait for preview
    await expect(page.locator('[data-testid="preview-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="preview-rows"]')).toHaveText('5 rânduri');

    // Configure mapping
    await page.selectOption('[data-testid="mapping-name"]', 'nume_firma');
    await page.selectOption('[data-testid="mapping-cui"]', 'cod_fiscal');
    await page.selectOption('[data-testid="mapping-email"]', 'email');

    // Start import
    await page.click('[data-testid="start-import-button"]');

    // Wait for completion
    await expect(page.locator('[data-testid="import-status"]')).toHaveText('Completat', {
      timeout: 30000,
    });
    await expect(page.locator('[data-testid="imported-count"]')).toHaveText('5');
  });

  test('should handle import errors gracefully', async ({ page }) => {
    await page.click('[data-testid="nav-import"]');

    // Upload invalid file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('e2e/fixtures/invalid-file.txt');

    // Should show error
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'Format fișier invalid'
    );
  });
});
```

### HITL Approval Flow

```typescript
// e2e/hitl-approval.spec.ts
import { test, expect } from '@playwright/test';

test.describe('HITL Approval Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOperator(page);
  });

  test('should review and approve dedup task', async ({ page }) => {
    // Create test dedup task
    const taskId = await createTestDedupTask();

    // Navigate to approvals
    await page.goto('/approvals');
    await expect(page.locator('[data-testid="pending-count"]')).toHaveText(/[1-9]/);

    // Open task
    await page.click(`[data-testid="task-${taskId}"]`);
    await expect(page).toHaveURL(`/approvals/${taskId}`);

    // Review comparison
    await expect(page.locator('[data-testid="company-a"]')).toBeVisible();
    await expect(page.locator('[data-testid="company-b"]')).toBeVisible();
    await expect(page.locator('[data-testid="similarity-score"]')).toBeVisible();

    // Make decision
    await page.fill('[data-testid="decision-reason"]', 'Confirmat - aceleași date de contact');
    await page.click('[data-testid="approve-merge-button"]');

    // Verify success
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Aprobat');
    await expect(page).toHaveURL('/approvals');
  });

  test('should show SLA countdown', async ({ page }) => {
    await page.goto('/approvals');

    // Check SLA indicator
    const slaIndicator = page.locator('[data-testid="sla-countdown"]').first();
    await expect(slaIndicator).toBeVisible();

    // Verify color changes based on urgency
    const urgentTask = await createUrgentTestTask();
    await page.reload();

    const urgentIndicator = page.locator(`[data-testid="task-${urgentTask}"] [data-testid="sla-countdown"]`);
    await expect(urgentIndicator).toHaveClass(/text-red/);
  });
});
```

---

## 5. PERFORMANCE TESTING

### 5.1 k6 Load Tests

```javascript
// k6/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');

export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up
    { duration: '5m', target: 50 },   // Sustained load
    { duration: '2m', target: 100 },  // Peak load
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3001';
const AUTH_TOKEN = __ENV.AUTH_TOKEN;

export function setup() {
  // Create test data
  const response = http.post(`${BASE_URL}/api/v1/test/seed`, null, {
    headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
  });
  return { seedId: response.json('seedId') };
}

export default function () {
  // Test bronze contacts list
  const bronzeResponse = http.get(`${BASE_URL}/api/v1/bronze/contacts?limit=20`, {
    headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
  });
  
  check(bronzeResponse, {
    'bronze list status 200': (r) => r.status === 200,
    'bronze list has data': (r) => r.json('data').length > 0,
  });
  
  apiLatency.add(bronzeResponse.timings.duration);
  errorRate.add(bronzeResponse.status !== 200);

  sleep(1);

  // Test silver companies list
  const silverResponse = http.get(`${BASE_URL}/api/v1/silver/companies?limit=20`, {
    headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
  });
  
  check(silverResponse, {
    'silver list status 200': (r) => r.status === 200,
  });
  
  apiLatency.add(silverResponse.timings.duration);
  errorRate.add(silverResponse.status !== 200);

  sleep(1);

  // Test company detail
  const companyId = silverResponse.json('data')[0]?.id;
  if (companyId) {
    const detailResponse = http.get(`${BASE_URL}/api/v1/silver/companies/${companyId}`, {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    });
    
    check(detailResponse, {
      'detail status 200': (r) => r.status === 200,
      'detail has cui': (r) => r.json('data.cui') !== undefined,
    });
    
    apiLatency.add(detailResponse.timings.duration);
  }

  sleep(1);
}

export function teardown(data) {
  // Cleanup test data
  http.del(`${BASE_URL}/api/v1/test/seed/${data.seedId}`, {
    headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
  });
}
```

### 5.2 Import Performance Test

```javascript
// k6/import-stress.js
import http from 'k6/http';
import { check } from 'k6';
import { FormData } from 'https://jslib.k6.io/formdata/0.0.2/index.js';

export const options = {
  scenarios: {
    import_stress: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1m',
      preAllocatedVUs: 10,
      maxVUs: 50,
      stages: [
        { duration: '5m', target: 10 },  // 10 imports/minute
        { duration: '10m', target: 20 }, // 20 imports/minute
        { duration: '5m', target: 5 },   // Cool down
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<30000'], // Import can take up to 30s
    'checks{type:import}': ['rate>0.95'],
  },
};

export default function () {
  // Generate CSV with 100 rows
  const csv = generateTestCSV(100);
  
  const fd = new FormData();
  fd.append('file', http.file(csv, 'test-import.csv', 'text/csv'));
  fd.append('mapping', JSON.stringify({
    name: 'name',
    cui: 'cui',
    email: 'email',
  }));

  const response = http.post(`${BASE_URL}/api/v1/imports`, fd.body(), {
    headers: {
      'Content-Type': `multipart/form-data; boundary=${fd.boundary}`,
      Authorization: `Bearer ${AUTH_TOKEN}`,
    },
    timeout: '60s',
  });

  check(response, {
    'import accepted': (r) => r.status === 202,
    'import has batch id': (r) => r.json('data.batchId') !== undefined,
  }, { type: 'import' });
}

function generateTestCSV(rows) {
  let csv = 'name,cui,email,phone\n';
  for (let i = 0; i < rows; i++) {
    const cui = String(10000000 + i).padStart(8, '0');
    csv += `"Company ${i} SRL",${cui},company${i}@example.com,072${String(i).padStart(7, '0')}\n`;
  }
  return csv;
}
```

---

## 6. TEST DATA MANAGEMENT

### 6.1 Fixtures

```typescript
// test/fixtures/bronze-contacts.ts
export const bronzeContactFixtures = {
  validContact: {
    extractedName: 'Test Company SRL',
    extractedCui: '12345678',
    extractedEmail: 'test@example.com',
    extractedPhone: '+40721123456',
    extractedAddress: 'Str. Test 1, București',
    sourceType: 'manual',
  },

  minimalContact: {
    extractedName: 'Minimal Company',
    sourceType: 'csv',
  },

  agriculturalContact: {
    extractedName: 'Agro Farm SRL',
    extractedCui: '87654321',
    extractedEmail: 'contact@agrofarm.ro',
    sourceType: 'manual',
    rawPayload: {
      codCaen: '0111',
      suprafata: 150,
    },
  },
};

// test/fixtures/silver-companies.ts
export const silverCompanyFixtures = {
  enrichedCompany: {
    cui: '12345678',
    denumire: 'Test Company SRL',
    nrRegCom: 'J40/123/2020',
    adresaCompleta: 'Str. Test 1, Sector 1, București',
    localitate: 'București',
    judet: 'București',
    codPostal: '010101',
    emailPrincipal: 'test@example.com',
    telefonPrincipal: '+40721123456',
    website: 'https://example.com',
    codCaenPrincipal: '0111',
    formaJuridica: 'SRL',
    statusFirma: 'ACTIVA',
    platitorTva: true,
    cifraAfaceri: 5000000,
    profitNet: 500000,
    numarAngajati: 25,
    isAgricultural: true,
    suprafataAgricola: 150,
    culturiPrincipale: ['cereale', 'oleaginoase'],
    enrichmentStatus: 'complete',
    enrichmentSourcesCompleted: ['anaf', 'termene', 'onrc'],
    completenessScore: 95,
    accuracyScore: 90,
    freshnessScore: 100,
    totalQualityScore: 94,
  },
};
```

### 6.2 Factory Functions

```typescript
// test/factories/company.factory.ts
import { faker } from '@faker-js/faker/locale/ro';

export function createBronzeContact(overrides = {}) {
  return {
    id: faker.string.uuid(),
    tenantId: 'test-tenant',
    extractedName: faker.company.name(),
    extractedCui: faker.string.numeric(8),
    extractedEmail: faker.internet.email(),
    extractedPhone: `+4072${faker.string.numeric(7)}`,
    extractedAddress: faker.location.streetAddress(),
    sourceType: 'manual',
    processingStatus: 'pending',
    createdAt: new Date(),
    ...overrides,
  };
}

export function createSilverCompany(overrides = {}) {
  const cui = faker.string.numeric(8);
  return {
    id: faker.string.uuid(),
    tenantId: 'test-tenant',
    cui,
    denumire: faker.company.name(),
    nrRegCom: `J40/${faker.number.int({ min: 1, max: 9999 })}/${faker.number.int({ min: 2015, max: 2024 })}`,
    adresaCompleta: faker.location.streetAddress(),
    localitate: faker.location.city(),
    judet: faker.helpers.arrayElement(['București', 'Cluj', 'Timiș', 'Iași']),
    emailPrincipal: faker.internet.email(),
    telefonPrincipal: `+4072${faker.string.numeric(7)}`,
    statusFirma: 'ACTIVA',
    enrichmentStatus: 'complete',
    completenessScore: faker.number.int({ min: 50, max: 100 }),
    accuracyScore: faker.number.int({ min: 50, max: 100 }),
    freshnessScore: faker.number.int({ min: 50, max: 100 }),
    isMasterRecord: true,
    createdAt: new Date(),
    ...overrides,
  };
}

export function createApprovalTask(overrides = {}) {
  return {
    id: faker.string.uuid(),
    tenantId: 'test-tenant',
    entityType: 'company',
    entityId: faker.string.uuid(),
    approvalType: 'dedup_review',
    priority: 'normal',
    status: 'pending',
    dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    metadata: {},
    createdAt: new Date(),
    ...overrides,
  };
}
```

---

## 7. CI/CD TEST PIPELINE

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
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:unit
      
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: cerniq_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      
      - run: npm ci
      - run: npm run db:migrate
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/cerniq_test
      
      - run: npm run test:integration
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/cerniq_test
          REDIS_URL: redis://localhost:6379

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      
      - run: npm ci
      - run: npx playwright install --with-deps
      
      - run: npm run test:e2e
      
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

**Document generat:** 15 Ianuarie 2026
**Conformitate:** Master Spec v1.2
