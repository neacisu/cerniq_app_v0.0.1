# CERNIQ.APP — ETAPA 5: INDEX TESTE NURTURING

## Documentație testare pentru 58 workeri nurturing

**Versiunea:** 1.0 | **Data:** 20 Ianuarie 2026  
**Referință:** [etapa5-plan-implementare-COMPLET.md](file:///var/www/CerniqAPP/docs/specifications/Etapa%205/etapa5-plan-implementare-COMPLET.md)

---

## SUMAR

| Categorie | Workeri | Document Teste |
| --------- | ------- | -------------- |
| A-B. Campaigns | 8 | [e5-workers-AB-campaigns.md](./e5-workers-AB-campaigns.md) |
| C-D. Segmentation | 6 | [e5-workers-CD-segmentation.md](./e5-workers-CD-segmentation.md) |
| E-K. Graph & Churn | 12 | [e5-workers-EK-graph-churn.md](./e5-workers-EK-graph-churn.md) |
| Schema | — | [e5-schema-nurturing.md](./e5-schema-nurturing.md) |
| HITL | 4 | [e5-hitl-system.md](./e5-hitl-system.md) |
| Proximity | 6 | [e5-proximity-postgis.md](./e5-proximity-postgis.md) |
| **TOTAL** | **58** | **6 documente** |

---

## KEY TEST AREAS

### Customer Segmentation (RFM)

```typescript
describe('RFM Segmentation', () => {
  it('should calculate RFM scores', async () => {
    const customer = await createCustomer({
      lastOrder: daysAgo(10),
      orderCount: 15,
      totalSpend: 50000,
    });
    
    const rfm = await segmentationService.calculateRFM(customer.id);
    
    expect(rfm).toMatchObject({
      recency: 5,  // Recent (< 30 days)
      frequency: 4, // Regular buyer
      monetary: 5,  // High value
      segment: 'champions',
    });
  });
});
```

### Social Graph (NetworkX)

```typescript
describe('Social Graph', () => {
  it('should detect KOL (Key Opinion Leader)', async () => {
    // Create network with central node
    await createCustomerNetwork({
      nodes: ['A', 'B', 'C', 'D', 'E'],
      edges: [
        ['A', 'B'], ['A', 'C'], ['A', 'D'], ['A', 'E'],
        ['B', 'C'],
      ],
    });
    
    const kols = await graphService.findKOLs({ minCentrality: 0.7 });
    
    expect(kols[0].customerId).toBe('A');
    expect(kols[0].centrality).toBeGreaterThan(0.7);
  });
  
  it('should detect referral chains', async () => {
    await createReferralChain(['A', 'B', 'C', 'D']);
    
    const chain = await graphService.getReferralChain('D');
    
    expect(chain).toEqual(['A', 'B', 'C', 'D']);
    expect(chain.length).toBe(4);
  });
});
```

### Churn Prediction

```typescript
describe('Churn Prediction', () => {
  it('should identify at-risk customers', async () => {
    const customer = await createCustomer({
      lastOrder: daysAgo(90),
      orderFrequency: 'monthly',
      engagementScore: 20,
    });
    
    const risk = await churnService.predictRisk(customer.id);
    
    expect(risk.probability).toBeGreaterThan(0.7);
    expect(risk.segment).toBe('at_risk');
  });
  
  it('should trigger winback campaign', async () => {
    const customer = await createAtRiskCustomer();
    
    await churnService.processAtRisk(customer.id);
    
    const campaigns = await getCustomerCampaigns(customer.id);
    expect(campaigns.find(c => c.type === 'winback')).toBeDefined();
  });
});
```

### PostGIS Proximity

```typescript
describe('PostGIS Proximity', () => {
  it('should find customers within radius', async () => {
    await createCustomersWithLocations([
      { id: 'A', lat: 44.4268, lng: 26.1025 }, // București
      { id: 'B', lat: 44.4500, lng: 26.0900 }, // 3km away
      { id: 'C', lat: 46.7712, lng: 23.6236 }, // Cluj (far)
    ]);
    
    const nearby = await proximityService.findNearby({
      lat: 44.4268,
      lng: 26.1025,
      radiusKm: 10,
    });
    
    expect(nearby.map(c => c.id)).toContain('A');
    expect(nearby.map(c => c.id)).toContain('B');
    expect(nearby.map(c => c.id)).not.toContain('C');
  });
});
```

---

## COVERAGE TARGETS

| Component | Min Coverage |
| --------- | ------------ |
| RFM Segmentation | 90% |
| Social Graph | 85% |
| Churn Prediction | 85% |
| PostGIS Queries | 90% |

---

**Document generat:** 20 Ianuarie 2026
