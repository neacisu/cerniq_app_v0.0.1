# CERNIQ.APP — TESTING CONVENTIONS

## Standarde și patterns pentru scrierea testelor

**Versiunea:** 1.0 | **Data:** 20 Ianuarie 2026 | **Status:** NORMATIV

---

## CUPRINS

1. [Naming Conventions](#1-naming-conventions)
2. [File Structure](#2-file-structure)
3. [Test Structure](#3-test-structure)
4. [Assertions](#4-assertions)
5. [Mocking Patterns](#5-mocking-patterns)
6. [Async Testing](#6-async-testing)
7. [Data Management](#7-data-management)
8. [Anti-Patterns](#8-anti-patterns)

---

## 1. NAMING CONVENTIONS

### 1.1 File Naming

```text
src/
├── features/
│   └── companies/
│       ├── companies.service.ts
│       ├── companies.service.test.ts      ← Unit test
│       └── companies.service.spec.ts      ← Integration test (alternativ)

tests/
├── unit/
│   └── companies.service.test.ts          ← Unit tests (alternativ)
├── integration/
│   └── companies-api.test.ts              ← Integration tests
└── e2e/
    └── company-import-flow.spec.ts        ← E2E tests
```

**Reguli:**

- `.test.ts` — Unit tests (colocated sau în `/tests/unit/`)
- `.spec.ts` — Integration/E2E tests
- Numele fișierului = numele modulului testat

### 1.2 Test Suite Naming

```typescript
// ✅ CORECT - Descrie modulul/clasa
describe('CompaniesService', () => {
  describe('findById', () => {
    it('should return company when exists', () => {});
    it('should throw NotFoundError when company does not exist', () => {});
  });
});

// ❌ GREȘIT - Prea generic
describe('Tests', () => {
  it('test 1', () => {});
  it('works', () => {});
});
```

### 1.3 Test Case Naming

**Pattern:** `should [expected behavior] when [condition]`

```typescript
// ✅ CORECT
it('should return 404 when company ID does not exist', () => {});
it('should create audit log when company is updated', () => {});
it('should throw ValidationError when CUI format is invalid', () => {});

// ❌ GREȘIT
it('company not found', () => {});
it('test validation', () => {});
it('returns correct data', () => {});
```

### 1.4 Variable Naming in Tests

```typescript
// ✅ CORECT - Descriptive
const validCompanyData = createCompanyFixture();
const companyWithInvalidCui = createCompanyFixture({ cui: 'invalid' });
const expiredJwtToken = createExpiredToken();

// ❌ GREȘIT - Ambiguu
const data = {};
const obj = {};
const x = 'test';
```

---

## 2. FILE STRUCTURE

### 2.1 Colocated Tests

Pentru **unit tests**, plasăm testele lângă codul testat:

```text
src/features/companies/
├── companies.service.ts
├── companies.service.test.ts      ← Colocated
├── companies.controller.ts
├── companies.controller.test.ts   ← Colocated
├── schemas/
│   ├── company.schema.ts
│   └── company.schema.test.ts     ← Colocated
└── utils/
    ├── cui-validator.ts
    └── cui-validator.test.ts      ← Colocated
```

### 2.2 Separate Test Directory

Pentru **integration și e2e tests**:

```text
tests/
├── integration/
│   ├── api/
│   │   ├── companies.test.ts
│   │   ├── contacts.test.ts
│   │   └── auth.test.ts
│   ├── workers/
│   │   ├── csv-parser.test.ts
│   │   └── anaf-enrichment.test.ts
│   └── database/
│       ├── rls-policies.test.ts
│       └── triggers.test.ts
├── e2e/
│   ├── flows/
│   │   ├── lead-import.spec.ts
│   │   ├── company-enrichment.spec.ts
│   │   └── approval-workflow.spec.ts
│   └── pages/
│       ├── login.spec.ts
│       └── dashboard.spec.ts
├── fixtures/
│   ├── companies.ts
│   ├── contacts.ts
│   └── users.ts
├── mocks/
│   ├── handlers.ts
│   └── server.ts
├── utils/
│   ├── test-db.ts
│   ├── test-app.ts
│   └── factories.ts
└── setup.ts
```

### 2.3 Test Utilities

```typescript
// tests/utils/factories.ts
export const factories = {
  company: (overrides = {}) => ({
    id: faker.string.uuid(),
    tenantId: faker.string.uuid(),
    cui: faker.string.numeric(8),
    ...overrides,
  }),
  
  user: (overrides = {}) => ({
    id: faker.string.uuid(),
    email: faker.internet.email(),
    ...overrides,
  }),
};

// tests/utils/test-app.ts
export async function createTestApp(config = {}) {
  const app = Fastify();
  await registerPlugins(app, { ...defaultConfig, ...config });
  await registerRoutes(app);
  await app.ready();
  return app;
}

// tests/utils/test-db.ts
export async function createTestDatabase() { /* ... */ }
export async function seedData(db, fixtures) { /* ... */ }
export async function cleanupDatabase(db) { /* ... */ }
```

---

## 3. TEST STRUCTURE

### 3.1 AAA Pattern (Arrange-Act-Assert)

```typescript
it('should calculate lead score from component scores', () => {
  // ARRANGE - Setup test data
  const company = factories.company({
    fitScore: 80,
    engagementScore: 60,
    intentScore: 40,
  });
  
  // ACT - Execute the code under test
  const leadScore = calculateLeadScore(company);
  
  // ASSERT - Verify the result
  expect(leadScore).toBe(65); // (80*0.4 + 60*0.35 + 40*0.25) = 65
});
```

### 3.2 Given-When-Then (BDD Style)

```typescript
describe('ApprovalService', () => {
  describe('decide', () => {
    it('should transition task to approved state', async () => {
      // GIVEN a pending approval task
      const task = await createPendingTask();
      
      // WHEN the task is approved
      await approvalService.decide(task.id, {
        decision: 'approved',
        reason: 'Data verified',
        decidedBy: 'user-123',
      });
      
      // THEN the task status should be approved
      const updated = await getTask(task.id);
      expect(updated.status).toBe('approved');
      expect(updated.decidedBy).toBe('user-123');
    });
  });
});
```

### 3.3 Setup și Teardown

```typescript
describe('CompaniesAPI', () => {
  let app: FastifyInstance;
  let db: TestDatabase;
  
  // Suite-level setup
  beforeAll(async () => {
    db = await createTestDatabase();
    app = await createTestApp({ db });
  });
  
  // Suite-level teardown
  afterAll(async () => {
    await app.close();
    await db.cleanup();
  });
  
  // Test-level - transaction isolation
  beforeEach(async () => {
    await db.execute(sql`BEGIN`);
  });
  
  afterEach(async () => {
    await db.execute(sql`ROLLBACK`);
  });
  
  it('...', () => {});
});
```

### 3.4 Nesting Describe Blocks

```typescript
// ✅ Bine structurat - organizat pe metodă/feature
describe('UserService', () => {
  describe('create', () => {
    describe('with valid data', () => {
      it('should create user', () => {});
      it('should hash password', () => {});
      it('should send welcome email', () => {});
    });
    
    describe('with invalid data', () => {
      it('should throw on duplicate email', () => {});
      it('should throw on invalid password', () => {});
    });
  });
  
  describe('delete', () => {
    it('should soft delete user', () => {});
    it('should anonymize GDPR data', () => {});
  });
});

// ❌ Over-nesting - max 3 levels recomandat
describe('Service', () => {
  describe('method', () => {
    describe('scenario', () => {
      describe('sub-scenario', () => {
        describe('edge case', () => { // Prea adânc
          it('...', () => {});
        });
      });
    });
  });
});
```

---

## 4. ASSERTIONS

### 4.1 Matchers Comuni

```typescript
// Equality
expect(result).toBe(expected);           // Strict equality (===)
expect(result).toEqual(expected);        // Deep equality
expect(result).toStrictEqual(expected);  // Deep + undefined properties

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeDefined();
expect(value).toBeUndefined();

// Numbers
expect(num).toBeGreaterThan(5);
expect(num).toBeLessThanOrEqual(10);
expect(float).toBeCloseTo(0.3, 5);

// Strings
expect(str).toContain('substring');
expect(str).toMatch(/regex/);
expect(str).toHaveLength(10);

// Arrays
expect(arr).toContain(item);
expect(arr).toHaveLength(3);
expect(arr).toContainEqual({ id: 1 });

// Objects
expect(obj).toHaveProperty('key');
expect(obj).toHaveProperty('nested.key', value);
expect(obj).toMatchObject({ partial: 'match' });

// Functions
expect(fn).toThrow();
expect(fn).toThrow(ErrorClass);
expect(fn).toThrow('error message');
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledWith(arg1, arg2);
expect(fn).toHaveBeenCalledTimes(2);
```

### 4.2 Async Assertions

```typescript
// Promises
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow(Error);

// Await then assert
const result = await asyncOperation();
expect(result).toBe(expected);
```

### 4.3 Custom Matchers

```typescript
// tests/setup.ts
expect.extend({
  toBeValidCUI(received) {
    const pass = /^\d{2,10}$/.test(received);
    return {
      pass,
      message: () =>
        `expected ${received} ${pass ? 'not ' : ''}to be a valid CUI`,
    };
  },
  
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    return {
      pass,
      message: () =>
        `expected ${received} to be within range ${floor} - ${ceiling}`,
    };
  },
});

// Usage
expect('12345678').toBeValidCUI();
expect(score).toBeWithinRange(0, 100);
```

---

## 5. MOCKING PATTERNS

### 5.1 Function Mocks

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock creation
const mockFn = vi.fn();
const mockFnWithReturn = vi.fn().mockReturnValue('result');
const mockFnAsync = vi.fn().mockResolvedValue('async result');

// Mock implementation
mockFn.mockImplementation((arg) => arg * 2);

// Mock once
mockFn.mockReturnValueOnce('first call');
mockFn.mockReturnValueOnce('second call');

// Assertions
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith('arg');
expect(mockFn).toHaveBeenCalledTimes(2);
expect(mockFn.mock.calls[0][0]).toBe('first arg');
```

### 5.2 Module Mocks

```typescript
// Mock entire module
vi.mock('@/services/email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
  verifyEmail: vi.fn().mockResolvedValue(true),
}));

// Mock with factory
vi.mock('@/lib/database', () => {
  return {
    db: {
      query: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
    },
  };
});

// Partial mock
vi.mock('@/utils', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    dangerousFunction: vi.fn(), // Override specific function
  };
});
```

### 5.3 Spy Pattern

```typescript
import * as utils from '@/utils';

describe('with spy', () => {
  it('should call original function but track calls', () => {
    const spy = vi.spyOn(utils, 'formatDate');
    
    const result = formatDate(new Date());
    
    expect(spy).toHaveBeenCalled();
    expect(result).toBe('2026-01-20'); // Real return value
  });
  
  it('can override return value while spying', () => {
    vi.spyOn(utils, 'formatDate').mockReturnValue('mocked date');
    
    const result = formatDate(new Date());
    
    expect(result).toBe('mocked date');
  });
});
```

### 5.4 External Service Mocks

```typescript
// tests/mocks/anaf.ts
import { http, HttpResponse } from 'msw';

export const anafHandlers = [
  http.post('https://webservicesp.anaf.ro/api/v2/stare_tva', async ({ request }) => {
    const body = await request.json();
    const cui = body[0]?.cui;
    
    if (cui === '12345678') {
      return HttpResponse.json({
        found: [{
          date_generale: {
            cui: cui,
            denumire: 'Test Company SRL',
            adresa: 'Str. Test 123, București',
          },
          inregistrare_scop_tva: {
            scpTVA: true,
          },
        }],
      });
    }
    
    return HttpResponse.json({ found: [], notfound: [cui] });
  }),
];
```

---

## 6. ASYNC TESTING

### 6.1 Promises și Async/Await

```typescript
// ✅ CORECT - async/await
it('should fetch company data', async () => {
  const company = await companyService.findById('123');
  expect(company).toBeDefined();
});

// ✅ CORECT - expect.resolves
it('should resolve with data', async () => {
  await expect(companyService.findById('123')).resolves.toMatchObject({
    id: '123',
  });
});

// ✅ CORECT - expect.rejects
it('should reject with error', async () => {
  await expect(companyService.findById('invalid'))
    .rejects.toThrow(NotFoundError);
});

// ❌ GREȘIT - Missing await
it('should fetch company data', () => {
  expect(companyService.findById('123')).resolves.toBeDefined();
  // Test passes immediately before promise resolves!
});
```

### 6.2 Timeouts

```typescript
it('should complete long operation', async () => {
  // Override timeout for slow test
  vi.setConfig({ testTimeout: 30000 });
  
  const result = await longRunningOperation();
  expect(result).toBeDefined();
}, 30000); // Also via third argument
```

### 6.3 Polling și Retries

```typescript
import { waitFor } from '@testing-library/dom';

it('should eventually update status', async () => {
  await triggerStatusUpdate();
  
  // Poll until condition is met
  await waitFor(
    async () => {
      const status = await getStatus();
      expect(status).toBe('completed');
    },
    { timeout: 5000, interval: 100 }
  );
});

// Custom retry utility
async function retry<T>(
  fn: () => Promise<T>,
  options: { retries: number; delay: number }
): Promise<T> {
  for (let i = 0; i < options.retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === options.retries - 1) throw error;
      await sleep(options.delay);
    }
  }
  throw new Error('Retry exhausted');
}
```

---

## 7. DATA MANAGEMENT

### 7.1 Factories

```typescript
// tests/fixtures/factories.ts
import { faker } from '@faker-js/faker';

export function createCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: faker.string.uuid(),
    tenantId: faker.string.uuid(),
    cui: faker.string.numeric(8),
    denumire: faker.company.name(),
    platitorTva: faker.datatype.boolean(),
    codCaenPrincipal: faker.helpers.arrayElement(['0111', '0112', '0113']),
    judet: faker.helpers.arrayElement(['București', 'Cluj', 'Timiș']),
    leadScore: faker.number.int({ min: 0, max: 100 }),
    currentState: faker.helpers.arrayElement(['COLD', 'WARM', 'HOT']),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
}

export function createCompanies(count: number, overrides = {}): Company[] {
  return Array.from({ length: count }, () => createCompany(overrides));
}
```

### 7.2 Seeding

```typescript
// tests/fixtures/seed.ts
export async function seedCompanies(db: Database, count = 10) {
  const companies = createCompanies(count);
  await db.insert(companiesTable).values(companies);
  return companies;
}

export async function seedFullDataset(db: Database) {
  const tenant = await createTenant(db);
  const users = await seedUsers(db, tenant.id, 5);
  const companies = await seedCompanies(db, tenant.id, 100);
  const contacts = await seedContacts(db, companies, 3);
  
  return { tenant, users, companies, contacts };
}
```

### 7.3 Isolation

```typescript
describe('Database Tests', () => {
  // Transaction rollback pattern
  beforeEach(async () => {
    await db.execute(sql`BEGIN`);
  });
  
  afterEach(async () => {
    await db.execute(sql`ROLLBACK`);
  });
  
  it('should not persist changes', async () => {
    await db.insert(companies).values(createCompany());
    
    const count = await db.select({ count: sql`count(*)` }).from(companies);
    expect(count[0].count).toBe('1');
    
    // ROLLBACK în afterEach - datele se resetează
  });
});
```

---

## 8. ANTI-PATTERNS

### 8.1 ❌ Teste Dependente de Ordine

```typescript
// ❌ GREȘIT - testele depind unul de celălalt
let createdId: string;

it('should create company', async () => {
  const response = await createCompany(data);
  createdId = response.id; // Stored for next test
});

it('should get created company', async () => {
  const company = await getCompany(createdId); // Depends on previous test
  expect(company).toBeDefined();
});

// ✅ CORECT - fiecare test este independent
it('should create and get company', async () => {
  const created = await createCompany(data);
  const fetched = await getCompany(created.id);
  expect(fetched).toEqual(created);
});
```

### 8.2 ❌ Sleep în Teste

```typescript
// ❌ GREȘIT - sleep arbitrar
it('should update status', async () => {
  await triggerJob();
  await sleep(5000); // Arbitrary wait
  const status = await getStatus();
  expect(status).toBe('completed');
});

// ✅ CORECT - polling with timeout
it('should update status', async () => {
  await triggerJob();
  await waitFor(
    () => expect(getStatus()).resolves.toBe('completed'),
    { timeout: 10000 }
  );
});
```

### 8.3 ❌ Testarea Implementării

```typescript
// ❌ GREȘIT - testează detalii de implementare
it('should call repository', async () => {
  const spy = vi.spyOn(repository, 'findById');
  
  await service.getCompany('123');
  
  expect(spy).toHaveBeenCalled(); // Coupling to implementation
});

// ✅ CORECT - testează comportament
it('should return company data', async () => {
  const result = await service.getCompany('123');
  
  expect(result).toMatchObject({
    id: '123',
    denumire: expect.any(String),
  });
});
```

### 8.4 ❌ Assertions Prea Generale

```typescript
// ❌ GREȘIT - assert prea vag
it('should return data', async () => {
  const result = await service.getCompanies();
  expect(result).toBeTruthy(); // Nu spune nimic util
});

// ✅ CORECT - assert specific
it('should return paginated companies', async () => {
  const result = await service.getCompanies({ page: 1, limit: 10 });
  
  expect(result).toMatchObject({
    data: expect.arrayContaining([
      expect.objectContaining({ id: expect.any(String) }),
    ]),
    pagination: {
      page: 1,
      limit: 10,
      total: expect.any(Number),
    },
  });
});
```

### 8.5 ❌ God Test

```typescript
// ❌ GREȘIT - un singur test face prea mult
it('should handle everything', async () => {
  const created = await createCompany(data);
  expect(created.id).toBeDefined();
  
  const updated = await updateCompany(created.id, newData);
  expect(updated.name).toBe(newData.name);
  
  await deleteCompany(created.id);
  const deleted = await getCompany(created.id);
  expect(deleted).toBeNull();
});

// ✅ CORECT - teste separate pentru fiecare comportament
describe('CompanyService', () => {
  it('should create company', async () => {});
  it('should update company', async () => {});
  it('should delete company', async () => {});
});
```

---

## CHECKLIST DE REVIZIE

Înainte de merge, verifică:

- [ ] Numele testelor urmează pattern-ul `should ... when ...`
- [ ] Fiecare test este independent
- [ ] Nu folosește `sleep()` — polling instead
- [ ] Assertions sunt specifice, nu `.toBeTruthy()`
- [ ] Mocks sunt resetate în `afterEach`
- [ ] Edge cases sunt acoperite
- [ ] Error cases sunt testate
- [ ] Async/await este folosit corect
- [ ] Coverage threshold este îndeplinit

---

**Document generat:** 20 Ianuarie 2026  
**Conformitate:** Master Spec v1.2
