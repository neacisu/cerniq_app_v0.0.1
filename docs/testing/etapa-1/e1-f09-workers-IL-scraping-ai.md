# CERNIQ.APP — TESTE F1.9: WORKERS CAT. I-L - SCRAPING, AI, GEO

## Teste pentru web scraping, AI enrichment, geocoding, agricultural

**Fază:** F1.9 | **Workeri:** 16

---

## I.1-I.4 SCRAPING

```typescript
describe('Website Scraper', () => {
  it('should extract company info', async () => {
    const result = await scraper.scrape('https://company.ro');
    expect(result.title).toBeDefined();
    expect(result.emails).toBeInstanceOf(Array);
  });
  
  it('should handle timeout', async () => {
    const result = await scraper.scrape('https://slow-site.com', { timeout: 5000 });
    expect(result.error).toContain('timeout');
  });
});

describe('Social Scraper', () => {
  it('should extract LinkedIn data', async () => {
    server.use(http.get('https://linkedin.com/*', () => HttpResponse.html('<html>...</html>')));
    const result = await socialScraper.scrapeLinkedIn('company-name');
    expect(result.employees).toBeDefined();
  });
});
```

## J.1-J.4 AI ENRICHMENT

```typescript
describe('AI Categorizer', () => {
  it('should categorize company', async () => {
    server.use(http.post('https://api.openai.com/*', () => HttpResponse.json({
      choices: [{ message: { content: '{"category": "agriculture"}' } }]
    })));
    const result = await aiCategorizer.categorize({ denumire: 'AGRO SRL', caen: '0111' });
    expect(result.category).toBe('agriculture');
  });
});

describe('AI Scorer', () => {
  it('should return numeric score', async () => {
    const result = await aiScorer.score(companyData);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
```

## K.1-K.3 GEOCODING

```typescript
describe('Geocoder', () => {
  it('should geocode address', async () => {
    server.use(http.get('https://maps.googleapis.com/*', () => HttpResponse.json({
      results: [{ geometry: { location: { lat: 44.4, lng: 26.1 } } }]
    })));
    const result = await geocoder.geocode('Bucuresti, Romania');
    expect(result.lat).toBeCloseTo(44.4, 1);
    expect(result.lng).toBeCloseTo(26.1, 1);
  });
});
```

## L.1-L.5 AGRICULTURAL

```typescript
describe('APIA Checker', () => {
  it('should detect agricultural company', async () => {
    const result = await apiaChecker.check('12345678');
    expect(result.isAgricultural).toBeDefined();
  });
});
```

---

**Document generat:** 20 Ianuarie 2026
