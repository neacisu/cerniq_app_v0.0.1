# CERNIQ.APP — TESTE E5: SOCIAL GRAPH & CHURN

## Teste pentru NetworkX graph și churn prediction

**Categorii:** E-K | **Workeri:** 12

---

## SOCIAL GRAPH

```typescript
describe('Social Graph', () => {
  it('should add node', async () => {
    await graphService.addNode('customer-1', { name: 'Ion' });
    const node = await graphService.getNode('customer-1');
    expect(node.data.name).toBe('Ion');
  });
  
  it('should add edge (referral)', async () => {
    await graphService.addEdge('customer-1', 'customer-2', { type: 'referral' });
    const edges = await graphService.getEdges('customer-1');
    expect(edges).toContainEqual(expect.objectContaining({ target: 'customer-2' }));
  });
  
  it('should calculate centrality', async () => {
    await createNetwork([
      { from: 'A', to: 'B' },
      { from: 'A', to: 'C' },
      { from: 'A', to: 'D' },
      { from: 'B', to: 'C' },
    ]);
    const centrality = await graphService.calculateCentrality();
    expect(centrality['A']).toBeGreaterThan(centrality['D']);
  });
  
  it('should find KOLs', async () => {
    await createLargeNetwork(100);
    const kols = await graphService.findKOLs({ minCentrality: 0.7 });
    expect(kols.length).toBeGreaterThan(0);
    expect(kols[0].centrality).toBeGreaterThanOrEqual(0.7);
  });
  
  it('should detect clusters', async () => {
    await createClusteredNetwork();
    const clusters = await graphService.detectCommunities();
    expect(clusters.length).toBeGreaterThan(1);
  });
});
```

## CHURN PREDICTION

```typescript
describe('Churn Prediction', () => {
  it('should identify at-risk customer', async () => {
    const customer = await createCustomer({
      lastOrder: daysAgo(90),
      orderFrequency: 'weekly',
      engagementScore: 10,
    });
    const risk = await churnService.predictRisk(customer.id);
    expect(risk.probability).toBeGreaterThan(0.7);
    expect(risk.segment).toBe('at_risk');
  });
  
  it('should identify churned customer', async () => {
    const customer = await createCustomer({
      lastOrder: daysAgo(180),
      orderFrequency: 'weekly',
    });
    const risk = await churnService.predictRisk(customer.id);
    expect(risk.segment).toBe('churned');
  });
  
  it('should trigger winback campaign', async () => {
    const customer = await createAtRiskCustomer();
    await churnService.processAtRisk(customer.id);
    const campaigns = await getCustomerCampaigns(customer.id);
    expect(campaigns.find(c => c.type === 'winback')).toBeDefined();
  });
  
  it('should calculate churn factors', async () => {
    const factors = await churnService.getChurnFactors('customer-1');
    expect(factors).toContain('inactivity');
  });
});
```

---

**Document generat:** 20 Ianuarie 2026
