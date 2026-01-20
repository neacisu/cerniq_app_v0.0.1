# CERNIQ.APP — TESTE E5: HITL & SCHEMA

## Teste pentru E5 HITL și nurturing schema

---

## HITL

```typescript
describe('E5 HITL', () => {
  it('should create task for KOL approval', async () => {
    const kol = await identifyKOL('customer-123');
    const tasks = await getApprovalTasks({ type: 'kol_approval' });
    expect(tasks.find(t => t.entityId === 'customer-123')).toBeDefined();
  });
  
  it('should create task for winback approval', async () => {
    const customer = await createChurningCustomer();
    await winbackService.propose(customer.id, { discount: 30 });
    const tasks = await getApprovalTasks({ type: 'winback_approval' });
    expect(tasks.find(t => t.entityId === customer.id)).toBeDefined();
  });
  
  it('should create task for churn intervention', async () => {
    const customer = await createHighValueChurningCustomer();
    await churnService.flagForIntervention(customer.id);
    const tasks = await getApprovalTasks({ type: 'churn_intervention' });
    expect(tasks.find(t => t.entityId === customer.id)).toBeDefined();
  });
});
```

## SCHEMA

```typescript
describe('Nurturing Schema', () => {
  it('should have nurturing tables', async () => {
    const tables = await getTableNames();
    expect(tables).toContain('campaigns');
    expect(tables).toContain('campaign_recipients');
    expect(tables).toContain('customer_segments');
    expect(tables).toContain('customer_graph');
  });
  
  it('should have PostGIS geography column', async () => {
    const columns = await getColumnTypes('customers');
    expect(columns.location_geography).toBe('geography');
  });
});
```

## API

```typescript
describe('Nurturing API', () => {
  it('should list campaigns', async () => {
    const response = await api.get('/api/v1/campaigns');
    expect(response.status).toBe(200);
  });
  
  it('should get segment analytics', async () => {
    const response = await api.get('/api/v1/analytics/segments');
    expect(response.body.segments).toBeInstanceOf(Array);
  });
  
  it('should get churn report', async () => {
    const response = await api.get('/api/v1/analytics/churn');
    expect(response.body.atRisk).toBeDefined();
  });
});
```

---

**Document generat:** 20 Ianuarie 2026
