# CERNIQ.APP — ETAPA 2: TESTING STRATEGY
## Comprehensive Test Plan for Cold Outreach Module
### Versiunea 1.0 | 15 Ianuarie 2026

---

# 1. TEST COVERAGE MATRIX

## 1.1 Coverage Requirements

| Component | Unit | Integration | E2E | Coverage Target |
|-----------|------|-------------|-----|-----------------|
| Quota Guardian Workers | ✅ | ✅ | - | 95% |
| Orchestration Workers | ✅ | ✅ | - | 90% |
| WhatsApp Workers | ✅ | ✅ | ✅ | 90% |
| Email Workers | ✅ | ✅ | ✅ | 85% |
| Webhook Handlers | ✅ | ✅ | - | 95% |
| Sequence Workers | ✅ | ✅ | - | 85% |
| AI Workers | ✅ | ✅ | - | 80% |
| HITL Workers | ✅ | ✅ | ✅ | 90% |
| API Endpoints | ✅ | ✅ | ✅ | 90% |
| Frontend Components | ✅ | - | ✅ | 80% |

---

# 2. UNIT TESTS

## 2.1 Quota Guardian Tests

```typescript
// tests/unit/workers/quota/guardian-check.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { quotaGuardianCheckProcessor } from '@/workers/quota/guardian-check.worker';
import { createMockJob } from '@/tests/utils/mock-job';
import Redis from 'ioredis-mock';

describe('QuotaGuardianCheck Worker', () => {
  let mockRedis: Redis;

  beforeEach(() => {
    mockRedis = new Redis();
    vi.mock('ioredis', () => ({ default: vi.fn(() => mockRedis) }));
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockRedis.flushall();
  });

  describe('Follow-up messages (cost=0)', () => {
    it('should always allow follow-up regardless of quota', async () => {
      // Setup: quota already at limit
      await mockRedis.set('quota:wa:phone-123:2026-01-15', '200');
      
      const job = createMockJob({
        phoneId: 'phone-123',
        isNewContact: false,
        targetTimezone: 'Europe/Bucharest',
      });

      const result = await quotaGuardianCheckProcessor(job);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('QUOTA_OK');
      expect(result.quotaDetails.remainingQuota).toBe(0);
    });

    it('should not increment quota for follow-up', async () => {
      await mockRedis.set('quota:wa:phone-123:2026-01-15', '50');

      const job = createMockJob({
        phoneId: 'phone-123',
        isNewContact: false,
      });

      await quotaGuardianCheckProcessor(job);

      const quota = await mockRedis.get('quota:wa:phone-123:2026-01-15');
      expect(quota).toBe('50'); // Unchanged
    });
  });

  describe('New contact messages (cost=1)', () => {
    it('should allow when quota available', async () => {
      await mockRedis.set('quota:wa:phone-123:2026-01-15', '50');
      await mockRedis.set('phone:status:phone-123', 'ACTIVE');

      const job = createMockJob({
        phoneId: 'phone-123',
        isNewContact: true,
        targetTimezone: 'Europe/Bucharest',
      });

      // Mock current time to be within business hours
      vi.setSystemTime(new Date('2026-01-15T10:00:00+02:00'));

      const result = await quotaGuardianCheckProcessor(job);

      expect(result.allowed).toBe(true);
      expect(result.quotaDetails.currentUsage).toBe(51);
    });

    it('should reject when quota exceeded', async () => {
      await mockRedis.set('quota:wa:phone-123:2026-01-15', '200');
      await mockRedis.set('phone:status:phone-123', 'ACTIVE');

      const job = createMockJob({
        phoneId: 'phone-123',
        isNewContact: true,
      });

      vi.setSystemTime(new Date('2026-01-15T10:00:00+02:00'));

      const result = await quotaGuardianCheckProcessor(job);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('QUOTA_EXCEEDED');
      expect(result.recommendation.action).toBe('DELAY');
    });

    it('should suggest alternative phone when quota exceeded', async () => {
      await mockRedis.set('quota:wa:phone-123:2026-01-15', '200');
      await mockRedis.set('quota:wa:phone-456:2026-01-15', '50');
      await mockRedis.set('phone:status:phone-123', 'ACTIVE');
      await mockRedis.set('phone:status:phone-456', 'ACTIVE');

      const job = createMockJob({
        phoneId: 'phone-123',
        isNewContact: true,
        tenantId: 'tenant-001',
      });

      vi.setSystemTime(new Date('2026-01-15T10:00:00+02:00'));

      const result = await quotaGuardianCheckProcessor(job);

      expect(result.allowed).toBe(false);
      expect(result.recommendation.alternativePhoneId).toBe('phone-456');
    });
  });

  describe('Business hours enforcement', () => {
    it('should reject outside business hours (before 09:00)', async () => {
      await mockRedis.set('phone:status:phone-123', 'ACTIVE');

      const job = createMockJob({
        phoneId: 'phone-123',
        isNewContact: true,
        targetTimezone: 'Europe/Bucharest',
      });

      vi.setSystemTime(new Date('2026-01-15T07:00:00+02:00'));

      const result = await quotaGuardianCheckProcessor(job);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('OUTSIDE_BUSINESS_HOURS');
      expect(result.recommendation.delayUntil).toContain('09:00');
    });

    it('should reject outside business hours (after 18:00)', async () => {
      await mockRedis.set('phone:status:phone-123', 'ACTIVE');

      const job = createMockJob({
        phoneId: 'phone-123',
        isNewContact: true,
        targetTimezone: 'Europe/Bucharest',
      });

      vi.setSystemTime(new Date('2026-01-15T19:00:00+02:00'));

      const result = await quotaGuardianCheckProcessor(job);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('OUTSIDE_BUSINESS_HOURS');
    });

    it('should reject on weekends', async () => {
      await mockRedis.set('phone:status:phone-123', 'ACTIVE');

      const job = createMockJob({
        phoneId: 'phone-123',
        isNewContact: true,
        targetTimezone: 'Europe/Bucharest',
      });

      // Saturday
      vi.setSystemTime(new Date('2026-01-17T10:00:00+02:00'));

      const result = await quotaGuardianCheckProcessor(job);

      expect(result.allowed).toBe(false);
      expect(result.businessHours.isWeekend).toBe(true);
    });
  });

  describe('Phone status checks', () => {
    it('should reject when phone is offline', async () => {
      await mockRedis.set('phone:status:phone-123', 'OFFLINE');

      const job = createMockJob({
        phoneId: 'phone-123',
        isNewContact: true,
      });

      const result = await quotaGuardianCheckProcessor(job);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('PHONE_OFFLINE');
    });

    it('should reject when phone is banned', async () => {
      await mockRedis.set('phone:status:phone-123', 'BANNED');

      const job = createMockJob({
        phoneId: 'phone-123',
        isNewContact: true,
      });

      const result = await quotaGuardianCheckProcessor(job);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('PHONE_BANNED');
    });
  });
});
```

## 2.2 Spintax Processing Tests

```typescript
// tests/unit/utils/spintax.test.ts

import { describe, it, expect } from 'vitest';
import { processSpintax } from '@/utils/spintax';

describe('Spintax Processing', () => {
  it('should replace simple variables', () => {
    const template = 'Bună ziua {{contactName}}, vă contactăm de la {{companyName}}.';
    const variables = {
      contactName: 'Ion',
      companyName: 'Agro SRL',
    };

    const result = processSpintax(template, variables);

    expect(result).toBe('Bună ziua Ion, vă contactăm de la Agro SRL.');
  });

  it('should process single spintax option randomly', () => {
    const template = '{Bună|Salut|Hello} {{contactName}}';
    const variables = { contactName: 'Ion' };

    const results = new Set();
    for (let i = 0; i < 100; i++) {
      results.add(processSpintax(template, variables));
    }

    // Should have multiple variants
    expect(results.size).toBeGreaterThan(1);
    // All should contain the name
    results.forEach(result => {
      expect(result).toContain('Ion');
    });
  });

  it('should process nested spintax', () => {
    const template = '{Bună {ziua|seara}|Salut}';
    const result = processSpintax(template, {});

    expect(['Bună ziua', 'Bună seara', 'Salut']).toContain(result);
  });

  it('should handle missing variables gracefully', () => {
    const template = 'Bună {{contactName}}, de la {{companyName}}';
    const variables = { contactName: 'Ion' };

    const result = processSpintax(template, variables);

    // Should keep placeholder for missing variable
    expect(result).toBe('Bună Ion, de la {{companyName}}');
  });

  it('should escape special characters', () => {
    const template = '{{companyName}} - {opțiune1|opțiune2}';
    const variables = { companyName: 'Test & Co. <script>' };

    const result = processSpintax(template, variables);

    expect(result).toContain('Test &amp; Co. &lt;script&gt;');
  });
});
```

## 2.3 State Machine Tests

```typescript
// tests/unit/workers/lead/state-transition.test.ts

import { describe, it, expect } from 'vitest';
import { validateTransition, VALID_TRANSITIONS } from '@/workers/lead/state-machine';

describe('Lead State Machine', () => {
  describe('Valid transitions', () => {
    it.each([
      ['COLD', 'CONTACTED_WA'],
      ['COLD', 'CONTACTED_EMAIL'],
      ['CONTACTED_WA', 'WARM_REPLY'],
      ['CONTACTED_EMAIL', 'WARM_REPLY'],
      ['WARM_REPLY', 'NEGOTIATION'],
      ['NEGOTIATION', 'CONVERTED'],
      ['NEGOTIATION', 'DEAD'],
    ])('should allow %s → %s', (from, to) => {
      expect(validateTransition(from, to)).toBe(true);
    });
  });

  describe('Invalid transitions', () => {
    it.each([
      ['COLD', 'CONVERTED'],        // Skip stages
      ['COLD', 'NEGOTIATION'],      // Skip stages
      ['CONVERTED', 'COLD'],        // Can't go back from final
      ['CONVERTED', 'DEAD'],        // Final state
      ['DEAD', 'CONVERTED'],        // Can only resurrect to COLD
    ])('should reject %s → %s', (from, to) => {
      expect(validateTransition(from, to)).toBe(false);
    });
  });

  describe('Special transitions', () => {
    it('should allow DEAD → COLD (resurrection)', () => {
      expect(validateTransition('DEAD', 'COLD')).toBe(true);
    });

    it('should allow PAUSED to multiple states', () => {
      expect(validateTransition('PAUSED', 'COLD')).toBe(true);
      expect(validateTransition('PAUSED', 'WARM_REPLY')).toBe(true);
      expect(validateTransition('PAUSED', 'NEGOTIATION')).toBe(true);
    });
  });
});
```

---

# 3. INTEGRATION TESTS

## 3.1 Full Outreach Flow Test

```typescript
// tests/integration/outreach-flow.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDB, cleanupTestDB, createTestTenant, createTestLead } from '@/tests/utils/db';
import { setupTestQueues, waitForJob, clearQueues } from '@/tests/utils/queues';
import { mockTimelinesAI } from '@/tests/mocks/timelinesai';
import { db } from '@cerniq/db';
import { goldLeadJourney, goldCommunicationLog, waPhoneNumbers } from '@cerniq/db/schema';

describe('Outreach Flow Integration', () => {
  let tenant: any;
  let phone: any;

  beforeAll(async () => {
    await setupTestDB();
    await setupTestQueues();
    
    tenant = await createTestTenant();
    phone = await createTestPhone(tenant.id);
    
    mockTimelinesAI.setup();
  });

  afterAll(async () => {
    await cleanupTestDB();
    await clearQueues();
    mockTimelinesAI.teardown();
  });

  it('should complete full new contact flow', async () => {
    // 1. Create lead
    const lead = await createTestLead(tenant.id, {
      telefonPrincipal: '+40700000001',
      emailPrincipal: 'test@example.com',
    });

    // 2. Create journey entry
    const journey = await db.insert(goldLeadJourney).values({
      tenantId: tenant.id,
      leadId: lead.id,
      engagementStage: 'COLD',
      isNewContact: true,
    }).returning();

    // 3. Trigger dispatch
    await triggerQueue('outreach:orchestrator:dispatch', {
      tenantId: tenant.id,
      batchSize: 1,
      channelPreference: 'WHATSAPP',
    });

    // 4. Wait for queue chain to complete
    await waitForJob('q:wa:phone_01', 30000);

    // 5. Verify state changes
    const updatedJourney = await db.query.goldLeadJourney.findFirst({
      where: eq(goldLeadJourney.leadId, lead.id),
    });

    expect(updatedJourney?.engagementStage).toBe('CONTACTED_WA');
    expect(updatedJourney?.isNewContact).toBe(false);
    expect(updatedJourney?.assignedPhoneId).toBe(phone.id);
    expect(updatedJourney?.firstContactAt).toBeDefined();

    // 6. Verify communication logged
    const logs = await db.query.goldCommunicationLog.findMany({
      where: eq(goldCommunicationLog.leadJourneyId, journey[0].id),
    });

    expect(logs).toHaveLength(1);
    expect(logs[0].channel).toBe('WHATSAPP');
    expect(logs[0].direction).toBe('OUTBOUND');
    expect(logs[0].quotaCost).toBe(1);
    expect(logs[0].status).toBe('SENT');

    // 7. Verify quota incremented
    const quotaKey = `quota:wa:${phone.id}:${new Date().toISOString().split('T')[0]}`;
    const quota = await redis.get(quotaKey);
    expect(parseInt(quota || '0')).toBeGreaterThan(0);

    // 8. Verify follow-up scheduled
    expect(updatedJourney?.nextActionAt).toBeDefined();
  });

  it('should process reply and transition to WARM_REPLY', async () => {
    // Setup: lead in CONTACTED_WA state
    const lead = await createTestLead(tenant.id);
    const journey = await createJourneyInState(lead.id, 'CONTACTED_WA', phone.id);

    // Simulate incoming webhook
    const webhookPayload = mockTimelinesAI.createReplyWebhook({
      chatId: journey.lastChatId,
      content: 'Da, sunt interesat de produsele voastre.',
    });

    await triggerQueue('webhook:timelinesai:ingest', webhookPayload);

    // Wait for processing
    await waitForJob('ai:sentiment:analyze', 10000);

    // Verify transition
    const updatedJourney = await db.query.goldLeadJourney.findFirst({
      where: eq(goldLeadJourney.leadId, lead.id),
    });

    expect(updatedJourney?.engagementStage).toBe('WARM_REPLY');
    expect(updatedJourney?.replyCount).toBe(1);
    expect(updatedJourney?.lastReplyAt).toBeDefined();
    expect(updatedJourney?.sentimentScore).toBeGreaterThan(0);
  });

  it('should trigger human review for negative sentiment', async () => {
    const lead = await createTestLead(tenant.id);
    const journey = await createJourneyInState(lead.id, 'CONTACTED_WA', phone.id);

    const webhookPayload = mockTimelinesAI.createReplyWebhook({
      chatId: journey.lastChatId,
      content: 'Nu mă mai contactați! Este o reclamație!',
    });

    await triggerQueue('webhook:timelinesai:ingest', webhookPayload);
    await waitForJob('human:review:queue', 10000);

    const updatedJourney = await db.query.goldLeadJourney.findFirst({
      where: eq(goldLeadJourney.leadId, lead.id),
    });

    expect(updatedJourney?.requiresHumanReview).toBe(true);
    expect(updatedJourney?.humanReviewPriority).toBe('URGENT');

    // Verify review item created
    const review = await db.query.humanReviewQueue.findFirst({
      where: eq(humanReviewQueue.leadJourneyId, journey.id),
    });

    expect(review).toBeDefined();
    expect(review?.priority).toBe('URGENT');
    expect(review?.reason).toBe('NEGATIVE_SENTIMENT');
  });

  it('should respect quota limits', async () => {
    // Set quota to near limit
    await redis.set(`quota:wa:${phone.id}:${today}`, '199');

    const lead1 = await createTestLead(tenant.id);
    const lead2 = await createTestLead(tenant.id);

    await createJourneyInState(lead1.id, 'COLD');
    await createJourneyInState(lead2.id, 'COLD');

    // Dispatch both
    await triggerQueue('outreach:orchestrator:dispatch', {
      tenantId: tenant.id,
      batchSize: 2,
    });

    await waitForJob('outreach:orchestrator:dispatch', 10000);

    // Only one should be sent (quota allows 1 more)
    const sentCount = await db.select({ count: count() })
      .from(goldCommunicationLog)
      .where(and(
        eq(goldCommunicationLog.status, 'SENT'),
        gte(goldCommunicationLog.createdAt, todayStart),
      ));

    expect(sentCount[0].count).toBe(1);

    // Other should be delayed
    const quota = await redis.get(`quota:wa:${phone.id}:${today}`);
    expect(quota).toBe('200');
  });
});
```

---

# 4. E2E TESTS

## 4.1 Dashboard E2E

```typescript
// tests/e2e/outreach-dashboard.spec.ts

import { test, expect } from '@playwright/test';
import { loginAsUser, createTestData } from './helpers';

test.describe('Outreach Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'sales@test.com');
    await createTestData();
  });

  test('should display KPIs correctly', async ({ page }) => {
    await page.goto('/outreach/dashboard');

    // Wait for data to load
    await page.waitForSelector('[data-testid="kpi-contacted"]');

    // Verify KPI cards
    const contactedKPI = page.locator('[data-testid="kpi-contacted"]');
    await expect(contactedKPI).toContainText(/\d+/);

    const repliesKPI = page.locator('[data-testid="kpi-replies"]');
    await expect(repliesKPI).toContainText(/\d+/);
  });

  test('should show quota usage grid', async ({ page }) => {
    await page.goto('/outreach/dashboard');

    const quotaGrid = page.locator('[data-testid="quota-grid"]');
    await expect(quotaGrid).toBeVisible();

    // Should have 20 phone indicators
    const phoneIndicators = page.locator('[data-testid^="phone-indicator-"]');
    await expect(phoneIndicators).toHaveCount(20);
  });

  test('should navigate to lead detail on click', async ({ page }) => {
    await page.goto('/outreach/leads');

    // Click first lead row
    await page.locator('table tbody tr').first().click();

    // Should navigate to detail page
    await expect(page).toHaveURL(/\/outreach\/leads\/[a-f0-9-]+/);
  });
});
```

## 4.2 Review Queue E2E

```typescript
// tests/e2e/review-queue.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Review Queue', () => {
  test('should display pending reviews by priority', async ({ page }) => {
    await page.goto('/outreach/review');

    // Check priority tabs
    await expect(page.locator('[data-testid="tab-urgent"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-high"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-medium"]')).toBeVisible();

    // Urgent tab should be active by default
    await expect(page.locator('[data-testid="tab-urgent"]')).toHaveAttribute('data-state', 'active');
  });

  test('should resolve review with approval', async ({ page }) => {
    await page.goto('/outreach/review');

    // Find first review card
    const reviewCard = page.locator('[data-testid="review-card"]').first();
    await expect(reviewCard).toBeVisible();

    // Click approve button
    await reviewCard.locator('button:has-text("Aprobă")').click();

    // Confirm in dialog
    await page.locator('button:has-text("Aprobă și Trimite")').click();

    // Should show success toast
    await expect(page.locator('.toast')).toContainText('Review rezolvat');
  });

  test('should show SLA countdown', async ({ page }) => {
    await page.goto('/outreach/review');

    const slaIndicator = page.locator('[data-testid="sla-countdown"]').first();
    await expect(slaIndicator).toBeVisible();
    await expect(slaIndicator).toContainText(/\d+[hm]/); // e.g., "2h" or "45m"
  });
});
```

---

# 5. PERFORMANCE TESTS

## 5.1 Load Testing with k6

```javascript
// tests/load/outreach-dispatch.js

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Ramp up
    { duration: '5m', target: 50 },   // Hold
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% requests under 500ms
    http_req_failed: ['rate<0.01'],     // <1% failure rate
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:64000';

export default function () {
  // Test leads listing endpoint
  const leadsRes = http.get(`${BASE_URL}/api/v1/outreach/leads?limit=20`, {
    headers: {
      'Authorization': `Bearer ${__ENV.TEST_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  check(leadsRes, {
    'leads status 200': (r) => r.status === 200,
    'leads has data': (r) => JSON.parse(r.body).data.length > 0,
  });

  sleep(1);

  // Test quota check (simulates high-frequency checks)
  const quotaRes = http.get(`${BASE_URL}/api/v1/outreach/phones`, {
    headers: {
      'Authorization': `Bearer ${__ENV.TEST_TOKEN}`,
    },
  });

  check(quotaRes, {
    'quota status 200': (r) => r.status === 200,
  });

  sleep(0.5);
}
```

---

# 6. TEST DATA FACTORIES

```typescript
// tests/utils/factories.ts

import { faker } from '@faker-js/faker/locale/ro';

export function createLeadFactory(overrides = {}) {
  return {
    denumire: faker.company.name(),
    cui: faker.string.numeric(8),
    judet: faker.helpers.arrayElement(['București', 'Cluj', 'Timiș', 'Iași']),
    localitate: faker.location.city(),
    emailPrincipal: faker.internet.email(),
    telefonPrincipal: `+407${faker.string.numeric(8)}`,
    isAgricultural: faker.datatype.boolean(),
    ...overrides,
  };
}

export function createJourneyFactory(leadId: string, overrides = {}) {
  return {
    leadId,
    engagementStage: 'COLD',
    isNewContact: true,
    sentimentScore: 0,
    replyCount: 0,
    ...overrides,
  };
}

export function createCommunicationFactory(journeyId: string, overrides = {}) {
  return {
    leadJourneyId: journeyId,
    channel: 'WHATSAPP',
    direction: 'OUTBOUND',
    status: 'SENT',
    content: faker.lorem.sentence(),
    sentAt: new Date(),
    quotaCost: 1,
    ...overrides,
  };
}
```

---

**Document generat:** 15 Ianuarie 2026
**Conformitate:** Master Spec v1.2, Testing Standards
