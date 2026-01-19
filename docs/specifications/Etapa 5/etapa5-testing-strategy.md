# CERNIQ.APP — ETAPA 5: TESTING STRATEGY
## Comprehensive Testing pentru Nurturing Agentic
### Versiunea 1.0 | 19 Ianuarie 2026

---

## 1. Testing Pyramid

```
                    ┌─────────────┐
                    │    E2E      │  5%  - Critical paths
                    │   Tests     │
                 ┌──┴─────────────┴──┐
                 │   Integration     │  25% - Worker chains, APIs
                 │      Tests        │
              ┌──┴───────────────────┴──┐
              │       Unit Tests        │  70% - Business logic
              │                         │
              └─────────────────────────┘
```

---

## 2. Unit Tests

### 2.1 State Machine Tests

```typescript
// tests/unit/state-machine/transitions.test.ts
describe('NurturingStateMachine', () => {
  describe('ONBOARDING transitions', () => {
    it('should transition to NURTURING_ACTIVE after onboarding complete', async () => {
      const client = createMockClient({ currentState: 'ONBOARDING' });
      client.onboardingCompletedAt = new Date();
      
      const newState = await evaluateStateTransition(client);
      
      expect(newState).toBe('NURTURING_ACTIVE');
    });
    
    it('should remain ONBOARDING if not complete', async () => {
      const client = createMockClient({ currentState: 'ONBOARDING' });
      client.onboardingCompletedAt = null;
      
      const newState = await evaluateStateTransition(client);
      
      expect(newState).toBe('ONBOARDING');
    });
  });
  
  describe('NURTURING_ACTIVE transitions', () => {
    it('should transition to AT_RISK when churn score > 50', async () => {
      const client = createMockClient({ 
        currentState: 'NURTURING_ACTIVE',
        churnRiskScore: 55
      });
      const signals = [createMockChurnSignal()];
      
      const newState = await evaluateStateTransition(client, signals);
      
      expect(newState).toBe('AT_RISK');
    });
    
    it('should transition to LOYAL_CLIENT with 3+ orders and NPS >= 8', async () => {
      const client = createMockClient({
        currentState: 'NURTURING_ACTIVE',
        totalOrders: 4,
        npsScore: 9
      });
      
      const newState = await evaluateStateTransition(client, []);
      
      expect(newState).toBe('LOYAL_CLIENT');
    });
  });
});
```

### 2.2 Churn Score Tests

```typescript
// tests/unit/churn/score-calculation.test.ts
describe('ChurnScoreCalculation', () => {
  it('should calculate weighted score correctly', () => {
    const signals = [
      { type: 'NEGATIVE_SENTIMENT', strength: 80 },
      { type: 'ORDER_FREQUENCY_DROP', strength: 60 }
    ];
    
    const score = calculateChurnScore(signals);
    
    // 80 * 0.20 + 60 * 0.15 = 16 + 9 = 25
    // Normalized: 25 / 0.35 = 71.4
    expect(score).toBeCloseTo(71.4, 1);
  });
  
  it('should return 0 with no signals', () => {
    const score = calculateChurnScore([]);
    expect(score).toBe(0);
  });
  
  it('should cap at 100', () => {
    const signals = [
      { type: 'NEGATIVE_SENTIMENT', strength: 100 },
      { type: 'COMPETITOR_MENTION', strength: 100 },
      { type: 'ORDER_FREQUENCY_DROP', strength: 100 },
      { type: 'PAYMENT_DELAY', strength: 100 }
    ];
    
    const score = calculateChurnScore(signals);
    expect(score).toBeLessThanOrEqual(100);
  });
});
```

### 2.3 Referral Consent Tests

```typescript
// tests/unit/referral/consent.test.ts
describe('ReferralConsent', () => {
  it('should require consent for EXPLICIT referrals', async () => {
    const referral = createMockReferral({ type: 'EXPLICIT', consentGiven: false });
    
    const canOutreach = await checkOutreachAllowed(referral);
    
    expect(canOutreach).toBe(false);
  });
  
  it('should allow outreach after consent given', async () => {
    const referral = createMockReferral({ 
      type: 'EXPLICIT', 
      consentGiven: true,
      consentGivenAt: new Date()
    });
    
    const canOutreach = await checkOutreachAllowed(referral);
    
    expect(canOutreach).toBe(true);
  });
  
  it('should enforce 30-day cooldown between requests', async () => {
    const lastRequest = subDays(new Date(), 15);
    
    const canRequest = await checkCooldown('client-123', lastRequest);
    
    expect(canRequest).toBe(false);
  });
});
```

---

## 3. Integration Tests

### 3.1 Worker Chain Tests

```typescript
// tests/integration/workers/order-to-nurturing.test.ts
describe('Order to Nurturing Flow', () => {
  beforeAll(async () => {
    await setupTestDb();
    await clearQueues();
  });
  
  it('should create nurturing state on first order', async () => {
    const clientId = await createTestClient();
    const orderId = await createTestOrder(clientId, { status: 'DELIVERED' });
    
    // Trigger worker
    await orderCompletedWorker.process({
      data: { clientId, orderId, orderValue: 1000 }
    });
    
    // Wait for chain
    await waitForQueue('lifecycle', 5000);
    
    // Verify
    const state = await db.query.goldNurturingState.findFirst({
      where: eq(goldNurturingState.clientId, clientId)
    });
    
    expect(state).toBeDefined();
    expect(state.currentState).toBe('ONBOARDING');
    expect(state.totalOrders).toBe(1);
  });
  
  it('should schedule NPS survey 3 days after order', async () => {
    const clientId = await createTestClient();
    
    await orderCompletedWorker.process({
      data: { clientId, orderId: 'test-order', orderValue: 1000 }
    });
    
    // Check delayed job exists
    const delayedJobs = await feedbackQueue.getDelayed();
    const npsJob = delayedJobs.find(j => 
      j.name === 'feedback:nps:send' && j.data.clientId === clientId
    );
    
    expect(npsJob).toBeDefined();
    expect(npsJob.delay).toBeCloseTo(3 * 24 * 60 * 60 * 1000, -5);
  });
});
```

### 3.2 API Integration Tests

```typescript
// tests/integration/api/nurturing.test.ts
describe('Nurturing API', () => {
  let authToken: string;
  
  beforeAll(async () => {
    authToken = await getTestAuthToken();
  });
  
  describe('GET /api/v1/nurturing/clients', () => {
    it('should return paginated clients with state', async () => {
      const response = await request(app)
        .get('/api/v1/nurturing/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, pageSize: 10 });
      
      expect(response.status).toBe(200);
      expect(response.body.clients).toBeInstanceOf(Array);
      expect(response.body.meta.total).toBeGreaterThan(0);
      expect(response.body.aggregations.byState).toBeDefined();
    });
    
    it('should filter by state', async () => {
      const response = await request(app)
        .get('/api/v1/nurturing/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ state: ['AT_RISK'] });
      
      expect(response.status).toBe(200);
      response.body.clients.forEach(client => {
        expect(client.currentState).toBe('AT_RISK');
      });
    });
  });
  
  describe('POST /api/v1/nurturing/referrals', () => {
    it('should create referral and schedule consent request', async () => {
      const response = await request(app)
        .post('/api/v1/nurturing/referrals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          referrerClientId: testClientId,
          referredContactName: 'Test Contact',
          referredContactPhone: '+40712345678',
          relationship: 'NEIGHBOR'
        });
      
      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.status).toBe('PENDING_CONSENT');
    });
  });
});
```

### 3.3 PostGIS Tests

```typescript
// tests/integration/geo/proximity.test.ts
describe('Geospatial Proximity', () => {
  it('should find neighbors within radius', async () => {
    // Create anchor with known location
    const anchor = await createTestClientWithLocation({
      lat: 45.1833,
      lon: 27.9500  // Brăila
    });
    
    // Create nearby prospect
    await createTestProspectWithLocation({
      lat: 45.1900,  // ~750m north
      lon: 27.9500
    });
    
    // Create far prospect
    await createTestProspectWithLocation({
      lat: 46.0000,  // ~90km north
      lon: 27.9500
    });
    
    // Run proximity calculation
    const result = await proximityCalculateWorker.process({
      data: { 
        tenantId: testTenantId,
        anchorClientId: anchor.id,
        radiusKm: 5
      }
    });
    
    expect(result.prospectsFound).toBe(1);
  });
});
```

---

## 4. E2E Tests

### 4.1 Critical Path: Client Lifecycle

```typescript
// tests/e2e/client-lifecycle.test.ts
describe('E2E: Client Lifecycle', () => {
  it('should progress client from order to advocate', async () => {
    // 1. Create order (Etapa 4 output)
    const { clientId } = await createOrderDelivered();
    
    // 2. Wait for nurturing state
    await eventually(async () => {
      const state = await getNurturingState(clientId);
      expect(state.currentState).toBe('ONBOARDING');
    }, 10000);
    
    // 3. Complete onboarding (simulate time passing)
    await advanceTime(15 * 24 * 60 * 60 * 1000); // 15 days
    await triggerCron('onboarding:complete:check');
    
    await eventually(async () => {
      const state = await getNurturingState(clientId);
      expect(state.currentState).toBe('NURTURING_ACTIVE');
    });
    
    // 4. Add more orders
    await createOrderDelivered({ clientId });
    await createOrderDelivered({ clientId });
    
    // 5. Submit high NPS
    await submitNpsResponse(clientId, 9, 'Great service!');
    
    await eventually(async () => {
      const state = await getNurturingState(clientId);
      expect(state.currentState).toBe('LOYAL_CLIENT');
    });
    
    // 6. Create successful referrals
    const referral1 = await createReferral(clientId);
    await convertReferral(referral1.id);
    const referral2 = await createReferral(clientId);
    await convertReferral(referral2.id);
    
    await eventually(async () => {
      const state = await getNurturingState(clientId);
      expect(state.currentState).toBe('ADVOCATE');
    }, 30000);
  }, 120000); // 2 min timeout
});
```

### 4.2 Critical Path: Churn Prevention

```typescript
// tests/e2e/churn-prevention.test.ts
describe('E2E: Churn Prevention Flow', () => {
  it('should detect churn risk and create intervention', async () => {
    // 1. Create active client
    const clientId = await createActiveClient();
    
    // 2. Send negative message
    await simulateWhatsAppMessage(clientId, 
      'Prețurile voastre sunt prea mari. Am găsit mai ieftin la AgroCompetitor.'
    );
    
    // 3. Wait for sentiment analysis
    await waitForQueue('sentiment', 10000);
    
    // 4. Verify churn signal created
    const signals = await getChurnSignals(clientId);
    expect(signals.some(s => s.type === 'NEGATIVE_SENTIMENT')).toBe(true);
    expect(signals.some(s => s.type === 'COMPETITOR_MENTION')).toBe(true);
    
    // 5. Verify state changed to AT_RISK
    await eventually(async () => {
      const state = await getNurturingState(clientId);
      expect(state.currentState).toBe('AT_RISK');
    });
    
    // 6. Verify HITL task created
    const tasks = await getHitlTasks({ clientId, taskType: 'CHURN_INTERVENTION' });
    expect(tasks.length).toBe(1);
    expect(tasks[0].priority).toBe('HIGH');
  });
});
```

---

## 5. Performance Tests

### 5.1 PostGIS Query Performance

```typescript
// tests/performance/geo-queries.test.ts
describe('PostGIS Performance', () => {
  it('should handle KNN query for 100K records under 100ms', async () => {
    const start = Date.now();
    
    const result = await db.execute(sql`
      SELECT id, ST_Distance(location_geography, ${testPoint}::geography) as distance
      FROM gold_contacts
      WHERE ST_DWithin(location_geography, ${testPoint}::geography, 10000)
      ORDER BY location_geography <-> ${testPoint}::geography
      LIMIT 50
    `);
    
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(100);
    console.log(`KNN query: ${duration}ms for ${result.length} results`);
  });
});
```

### 5.2 Graph Algorithm Performance

```typescript
// tests/performance/graph-algorithms.test.ts
describe('Graph Performance', () => {
  it('should complete Leiden community detection under 60s for 10K nodes', async () => {
    const start = Date.now();
    
    const result = await pythonGraphService.post('/graph/community/leiden', {
      tenant_id: testTenantId,
      graph_id: largeTestGraphId
    });
    
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(60000);
    console.log(`Leiden detection: ${duration}ms for ${result.data.communities.length} communities`);
  });
});
```

---

## 6. Test Data Factories

```typescript
// tests/factories/nurturing.factory.ts
export const createMockNurturingState = (overrides?: Partial<NurturingState>): NurturingState => ({
  id: faker.string.uuid(),
  tenantId: testTenantId,
  clientId: faker.string.uuid(),
  currentState: 'NURTURING_ACTIVE',
  totalOrders: faker.number.int({ min: 1, max: 10 }),
  totalRevenue: faker.number.float({ min: 1000, max: 50000 }),
  npsScore: faker.number.int({ min: 0, max: 10 }),
  churnRiskScore: faker.number.float({ min: 0, max: 100 }),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

export const createMockChurnSignal = (overrides?: Partial<ChurnSignal>): ChurnSignal => ({
  id: faker.string.uuid(),
  clientId: faker.string.uuid(),
  signalType: faker.helpers.arrayElement(['NEGATIVE_SENTIMENT', 'COMPETITOR_MENTION', 'PAYMENT_DELAY']),
  strength: faker.number.float({ min: 20, max: 100 }),
  confidence: faker.number.float({ min: 0.7, max: 1 }),
  isResolved: false,
  ...overrides
});
```

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
