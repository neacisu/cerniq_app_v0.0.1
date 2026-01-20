# CERNIQ.APP — TESTE E2: API & SCHEMA

## Teste pentru Outreach API și schema

---

## API ENDPOINTS

```typescript
describe('Campaigns API', () => {
  it('should create campaign', async () => {
    const response = await api.post('/api/v1/campaigns').send({ name: 'Test', type: 'email' });
    expect(response.status).toBe(201);
  });
  
  it('should list campaigns', async () => {
    const response = await api.get('/api/v1/campaigns');
    expect(response.body.data).toBeInstanceOf(Array);
  });
});

describe('Sequences API', () => {
  it('should create sequence', async () => {
    const response = await api.post('/api/v1/sequences').send({
      name: 'Welcome',
      steps: [{ type: 'email', templateId: 'tpl-1' }],
    });
    expect(response.status).toBe(201);
  });
});
```

## SCHEMA

```typescript
describe('Outreach Schema', () => {
  it('should have outreach tables', async () => {
    const tables = await getTableNames();
    expect(tables).toContain('outreach_campaigns');
    expect(tables).toContain('outreach_sequences');
    expect(tables).toContain('outreach_messages');
  });
});
```

---

**Document generat:** 20 Ianuarie 2026
