# CERNIQ.APP — TESTE F1.7: WORKERS CAT. D-E - ANAF & TERMENE.RO

## Teste pentru workerii de îmbogățire ANAF și Termene.ro

**Fază:** F1.7 | **Workeri:** 9 | **Queue prefix:** `silver:enrich:anaf-*`, `silver:enrich:termene-*`

---

## WORKER OVERVIEW

| Worker | Queue | API | Rate Limit |
| ------ | ----- | --- | ---------- |
| D.1 ANAF TVA | `silver:enrich:anaf-tva` | WebServices SPV | 1 req/sec (max 100 CUI/request) |
| D.2 ANAF Fiscala | `silver:enrich:anaf-fiscal` | WebServices SPV | 1 req/sec (max 100 CUI/request) |
| D.3 ANAF eFactura | `silver:enrich:anaf-efactura` | SPV eFactura | 1 req/sec (max 100 CUI/request) |
| D.4 ANAF Bilant | `silver:enrich:anaf-bilant` | Portal Bilant | 1 req/sec (max 100 CUI/request) |
| D.5 ANAF Retry | `silver:enrich:anaf-retry` | All | N/A |
| E.1 Termene Company | `silver:enrich:termene-company` | Scraping | 30/min |
| E.2 Termene Dosare | `silver:enrich:termene-dosare` | Scraping | 30/min |
| E.3 Termene Financiar | `silver:enrich:termene-financial` | Scraping | 30/min |
| E.4 Termene Retry | `silver:enrich:termene-retry` | All | N/A |

---

## D.1: ANAF TVA WORKER

```typescript
// workers/anaf-tva/tests/anaf-tva.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { AnafTvaWorker } from '../src/anaf-tva.worker';

const server = setupServer(
  http.post('https://webservicesp.anaf.ro/api/v2/stare_tva', async ({ request }) => {
    const body = await request.json();
    const cui = body[0]?.cui;
    
    if (cui === '12345678') {
      return HttpResponse.json({
        found: [{
          date_generale: {
            cui: 12345678,
            denumire: 'COMPANY TEST SRL',
            adresa: 'JUD. BUCURESTI, MUN. BUCURESTI',
          },
          inregistrare_scop_tva: {
            scpTVA: true,
            dataInceputScpTVA: '2020-01-01',
          },
        }],
        notfound: [],
      });
    }
    
    return HttpResponse.json({ found: [], notfound: [{ cui }] });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('ANAF TVA Worker', () => {
  let worker: AnafTvaWorker;
  
  beforeEach(() => {
    worker = new AnafTvaWorker({ db: mockDb });
  });
  
  describe('fetchTvaStatus', () => {
    it('should fetch TVA status for valid CUI', async () => {
      const result = await worker.fetchTvaStatus('12345678');
      
      expect(result).toMatchObject({
        cui: '12345678',
        denumire: 'COMPANY TEST SRL',
        platitorTva: true,
        dataInceputTva: '2020-01-01',
      });
    });
    
    it('should handle CUI not found', async () => {
      const result = await worker.fetchTvaStatus('99999999');
      
      expect(result).toMatchObject({
        cui: '99999999',
        found: false,
      });
    });
    
    it('should batch multiple CUIs in single request', async () => {
      const cuis = ['12345678', '87654321', '11111111'];
      const result = await worker.fetchTvaStatusBatch(cuis);
      
      expect(result).toHaveLength(3);
    });
  });
  
  describe('rate limiting', () => {
    it('should respect 100/min rate limit', async () => {
      const requests: number[] = [];
      
      server.use(
        http.post('https://webservicesp.anaf.ro/api/v2/stare_tva', () => {
          requests.push(Date.now());
          return HttpResponse.json({ found: [], notfound: [] });
        })
      );
      
      // Make 150 requests
      for (let i = 0; i < 150; i++) {
        await worker.fetchTvaStatus(String(i).padStart(8, '0'));
      }
      
      // Check that rate limit was respected
      const firstMinuteRequests = requests.filter(
        t => t < requests[0] + 60000
      ).length;
      
      expect(firstMinuteRequests).toBeLessThanOrEqual(100);
    }, 120000);
  });
});
```

---

## E.1: TERMENE.RO COMPANY WORKER

```typescript
// workers/termene-company/tests/termene-company.test.ts
describe('Termene.ro Company Worker', () => {
  
  it('should extract company data from HTML', async () => {
    const mockHtml = `
      <div class="company-info">
        <h1>COMPANY TEST SRL</h1>
        <p>CUI: 12345678</p>
        <p>CAEN: 0111 - Cultivarea cerealelor</p>
        <p>Capital social: 200 RON</p>
      </div>
    `;
    
    const result = await worker.parseCompanyPage(mockHtml);
    
    expect(result).toMatchObject({
      denumire: 'COMPANY TEST SRL',
      cui: '12345678',
      caen: '0111',
      capitalSocial: 200,
    });
  });
  
  it('should handle anti-scraping blocks', async () => {
    server.use(
      http.get('https://termene.ro/firma/*', () => {
        return new HttpResponse('Access Denied', { status: 403 });
      })
    );
    
    const result = await worker.processJob({
      silverCompanyId: 'comp-123',
      cui: '12345678',
    });
    
    expect(result.status).toBe('blocked');
    expect(result.retryAfter).toBeGreaterThan(0);
  });
  
  it('should use rotating proxies', async () => {
    const usedIps: string[] = [];
    
    server.use(
      http.get('https://termene.ro/firma/*', ({ request }) => {
        usedIps.push(request.headers.get('X-Forwarded-For') || 'direct');
        return HttpResponse.text('<html>OK</html>');
      })
    );
    
    for (let i = 0; i < 5; i++) {
      await worker.fetchCompanyPage('12345678');
    }
    
    const uniqueIps = new Set(usedIps);
    expect(uniqueIps.size).toBeGreaterThan(1);
  });
});
```

---

## CHECKLIST VALIDARE

### ANAF Workers (D.1-D.5)

- [ ] Fetch TVA status corect
- [ ] Handle CUI not found
- [ ] Batch requests
- [ ] Rate limit 100/min
- [ ] Retry cu exponential backoff

### Termene.ro Workers (E.1-E.4)

- [ ] Parse HTML corect
- [ ] Handle anti-scraping
- [ ] Rotating proxies
- [ ] Extract financial data
- [ ] Extract dosare (cases)

---

**Document generat:** 20 Ianuarie 2026
