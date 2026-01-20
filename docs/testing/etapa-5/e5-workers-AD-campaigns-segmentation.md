# CERNIQ.APP — TESTE E5: CAMPAIGNS & SEGMENTATION

## Teste pentru campaign engine și RFM segmentation

**Categorii:** A-D | **Workeri:** 14

---

## CAMPAIGNS

```typescript
describe('Campaign Engine', () => {
  it('should create campaign', async () => {
    const campaign = await campaignService.create({
      name: 'Summer Sale',
      type: 'promotional',
      segment: 'high_value',
      startDate: new Date(),
    });
    expect(campaign.id).toBeDefined();
    expect(campaign.status).toBe('draft');
  });
  
  it('should schedule campaign', async () => {
    const campaign = await createCampaign();
    await campaignService.schedule(campaign.id, futureDate(7));
    expect(await getCampaign(campaign.id).scheduledAt).toBeDefined();
  });
  
  it('should execute campaign', async () => {
    const campaign = await createScheduledCampaign();
    await campaignService.execute(campaign.id);
    expect(await getCampaign(campaign.id).status).toBe('executing');
  });
  
  it('should track opens and clicks', async () => {
    const campaign = await createExecutedCampaign();
    await trackOpen(campaign.id, 'customer-1');
    await trackClick(campaign.id, 'customer-1', 'link-1');
    const stats = await getCampaignStats(campaign.id);
    expect(stats.opens).toBe(1);
    expect(stats.clicks).toBe(1);
  });
});
```

## RFM SEGMENTATION

```typescript
describe('RFM Segmentation', () => {
  it('should calculate recency score', () => {
    expect(calculateRecencyScore(daysAgo(5))).toBe(5);
    expect(calculateRecencyScore(daysAgo(60))).toBe(3);
    expect(calculateRecencyScore(daysAgo(180))).toBe(1);
  });
  
  it('should calculate frequency score', () => {
    expect(calculateFrequencyScore(20)).toBe(5);
    expect(calculateFrequencyScore(5)).toBe(3);
    expect(calculateFrequencyScore(1)).toBe(1);
  });
  
  it('should calculate monetary score', () => {
    expect(calculateMonetaryScore(100000)).toBe(5);
    expect(calculateMonetaryScore(10000)).toBe(3);
    expect(calculateMonetaryScore(1000)).toBe(1);
  });
  
  it('should assign segment', () => {
    expect(getSegment({ r: 5, f: 5, m: 5 })).toBe('champions');
    expect(getSegment({ r: 1, f: 1, m: 1 })).toBe('hibernating');
    expect(getSegment({ r: 5, f: 1, m: 1 })).toBe('new_customers');
  });
  
  it('should segment all customers', async () => {
    await seedCustomers(100);
    await segmentationService.segmentAll();
    const segments = await getSegmentCounts();
    expect(Object.keys(segments).length).toBeGreaterThan(0);
  });
});
```

---

**Document generat:** 20 Ianuarie 2026
