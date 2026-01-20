# CERNIQ.APP — TESTE F1.12: BACKEND API

## Teste pentru API endpoints Etapa 1

**Fază:** F1.12 | **Endpoints:** 40+ | **Prefix:** `/api/v1/`

---

## ENDPOINT MATRIX

| Resource | GET | POST | PUT | PATCH | DELETE |
| -------- | --- | ---- | --- | ----- | ------ |
| /companies | ✅ List | ✅ Create | — | ✅ Update | ✅ Soft |
| /contacts | ✅ List | ✅ Create | — | ✅ Update | ✅ Soft |
| /imports | ✅ List | ✅ Start | — | — | ✅ Cancel |
| /approvals | ✅ List | — | — | ✅ Decide | — |
| /stats | ✅ Dashboard | — | — | — | — |

---

## COMPANIES API TESTS

```typescript
// apps/api/tests/integration/companies.test.ts
describe('Companies API', () => {
  
  describe('GET /api/v1/companies', () => {
    it('should return paginated list', async () => {
      await seedCompanies(50);
      
      const response = await api
        .get('/api/v1/companies')
        .query({ page: 1, limit: 20 })
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(20);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 50,
        totalPages: 3,
      });
    });
    
    it('should filter by judet', async () => {
      const response = await api
        .get('/api/v1/companies')
        .query({ judet: 'București' })
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.body.data.every(c => c.judet === 'București')).toBe(true);
    });
    
    it('should filter by leadScore range', async () => {
      const response = await api
        .get('/api/v1/companies')
        .query({ leadScoreMin: 50, leadScoreMax: 80 })
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.body.data.every(c => 
        c.leadScore >= 50 && c.leadScore <= 80
      )).toBe(true);
    });
    
    it('should search by denumire', async () => {
      const response = await api
        .get('/api/v1/companies')
        .query({ q: 'AGRO' })
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.body.data.every(c => 
        c.denumire.includes('AGRO')
      )).toBe(true);
    });
  });
  
  describe('POST /api/v1/companies', () => {
    it('should create company', async () => {
      const response = await api
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cui: '12345678',
          denumire: 'New Company SRL',
        });
      
      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
    });
    
    it('should reject duplicate CUI', async () => {
      await api
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${token}`)
        .send({ cui: '11111111', denumire: 'First' });
      
      const response = await api
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${token}`)
        .send({ cui: '11111111', denumire: 'Duplicate' });
      
      expect(response.status).toBe(409);
    });
  });
  
  describe('PATCH /api/v1/companies/:id', () => {
    it('should update partial fields', async () => {
      const company = await createCompany();
      
      const response = await api
        .patch(`/api/v1/companies/${company.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ leadScore: 85 });
      
      expect(response.status).toBe(200);
      expect(response.body.leadScore).toBe(85);
    });
  });
});
```

---

## IMPORTS API TESTS

```typescript
describe('Imports API', () => {
  
  describe('POST /api/v1/imports', () => {
    it('should start CSV import', async () => {
      const response = await api
        .post('/api/v1/imports')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', 'fixtures/valid.csv')
        .field('mapping', JSON.stringify({
          cui: 'CUI',
          denumire: 'Denumire',
        }));
      
      expect(response.status).toBe(202);
      expect(response.body.batchId).toBeDefined();
      expect(response.body.status).toBe('processing');
    });
    
    it('should reject invalid file type', async () => {
      const response = await api
        .post('/api/v1/imports')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', 'fixtures/test.pdf');
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('file type');
    });
  });
  
  describe('GET /api/v1/imports/:id/status', () => {
    it('should return import progress', async () => {
      const batch = await startImport('fixtures/large.csv');
      
      const response = await api
        .get(`/api/v1/imports/${batch.id}/status`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: expect.stringMatching(/processing|completed/),
        progress: expect.any(Number),
        processedRows: expect.any(Number),
      });
    });
  });
});
```

---

## CHECKLIST VALIDARE

- [ ] GET /companies returns paginated data
- [ ] Filters work (judet, leadScore, search)
- [ ] POST creates company
- [ ] Duplicate CUI rejected
- [ ] PATCH updates partial fields
- [ ] Import starts correctly
- [ ] Import status updates correctly
- [ ] Auth required on all endpoints

---

**Document generat:** 20 Ianuarie 2026
