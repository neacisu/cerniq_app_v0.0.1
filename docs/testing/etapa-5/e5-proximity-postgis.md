# CERNIQ.APP — TESTE E5: POSTGIS PROXIMITY

## Teste pentru geographic queries și proximity

---

## TESTE

```typescript
describe('PostGIS Proximity', () => {
  beforeAll(async () => {
    await seedCustomersWithLocations([
      { id: 'A', lat: 44.4268, lng: 26.1025 }, // București
      { id: 'B', lat: 44.4500, lng: 26.0900 }, // 3km from A
      { id: 'C', lat: 46.7712, lng: 23.6236 }, // Cluj (350km)
      { id: 'D', lat: 45.7538, lng: 21.2257 }, // Timișoara
    ]);
  });
  
  it('should find customers in radius', async () => {
    const nearby = await proximityService.findNearby({
      lat: 44.4268,
      lng: 26.1025,
      radiusKm: 10,
    });
    expect(nearby.map(c => c.id)).toContain('A');
    expect(nearby.map(c => c.id)).toContain('B');
    expect(nearby.map(c => c.id)).not.toContain('C');
  });
  
  it('should calculate distance', async () => {
    const distance = await proximityService.getDistance('A', 'C');
    expect(distance).toBeCloseTo(350, -1); // ~350km
  });
  
  it('should find nearest warehouse', async () => {
    await seedWarehouses([
      { id: 'W1', lat: 44.4, lng: 26.1 }, // București
      { id: 'W2', lat: 46.7, lng: 23.6 }, // Cluj
    ]);
    const nearest = await proximityService.findNearestWarehouse('D');
    expect(nearest.id).toBeDefined();
  });
  
  it('should cluster customers by region', async () => {
    const clusters = await proximityService.clusterByRegion();
    expect(clusters.find(c => c.region === 'București')).toBeDefined();
    expect(clusters.find(c => c.region === 'Cluj')).toBeDefined();
  });
});
```

---

**Document generat:** 20 Ianuarie 2026
