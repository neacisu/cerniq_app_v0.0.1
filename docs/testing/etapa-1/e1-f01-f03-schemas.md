# CERNIQ.APP — TESTE F1.1-F1.3: DATABASE SCHEMAS

## Teste pentru Bronze, Silver, Gold schemas

**Faze:** F1.1, F1.2, F1.3 | **Referință:** [schema-database.md](file:///var/www/CerniqAPP/docs/specifications/schema-database.md)

---

## F1.1: BRONZE SCHEMA

```typescript
describe('Bronze Schema', () => {
  
  describe('bronze_contacts table', () => {
    it('should have required columns', async () => {
      const columns = await getTableColumns('bronze_contacts');
      
      expect(columns).toContain('id');
      expect(columns).toContain('tenant_id');
      expect(columns).toContain('raw_payload');
      expect(columns).toContain('source_type');
      expect(columns).toContain('content_hash');
      expect(columns).toContain('processing_status');
    });
    
    it('should have immutability trigger', async () => {
      const contact = await insertBronzeContact({ cui: '12345678' });
      
      await expect(
        db.update(bronzeContacts)
          .set({ rawPayload: { cui: 'modified' } })
          .where(eq(bronzeContacts.id, contact.id))
      ).rejects.toThrow('immutable');
    });
    
    it('should enforce unique content_hash per tenant', async () => {
      await insertBronzeContact({ tenantId: 'A', contentHash: 'hash1' });
      
      await expect(
        insertBronzeContact({ tenantId: 'A', contentHash: 'hash1' })
      ).rejects.toThrow('duplicate');
      
      // Different tenant should work
      await expect(
        insertBronzeContact({ tenantId: 'B', contentHash: 'hash1' })
      ).resolves.toBeDefined();
    });
  });
});
```

---

## F1.2: SILVER SCHEMA

```typescript
describe('Silver Schema', () => {
  
  describe('silver_companies table', () => {
    it('should have GENERATED columns', async () => {
      const company = await insertSilverCompany({
        denumire: 'AGRO TEST SRL',
      });
      
      // denumireNormalizata should be auto-generated
      expect(company.denumireNormalizata).toBe('AGRO TEST SRL');
    });
    
    it('should have pg_trgm index for fuzzy search', async () => {
      const indexes = await getTableIndexes('silver_companies');
      
      expect(indexes.find(i => i.includes('trgm'))).toBeDefined();
    });
  });
  
  describe('silver_contacts table', () => {
    it('should link to silver_companies', async () => {
      const company = await insertSilverCompany({ cui: '12345678' });
      const contact = await insertSilverContact({
        companyId: company.id,
        email: 'test@example.com',
      });
      
      expect(contact.companyId).toBe(company.id);
    });
  });
});
```

---

## F1.3: GOLD SCHEMA

```typescript
describe('Gold Schema', () => {
  
  describe('gold_companies table', () => {
    it('should have pgvector embedding column', async () => {
      const columns = await getTableColumns('gold_companies');
      expect(columns).toContain('embedding');
    });
    
    it('should store vector embedding', async () => {
      const embedding = Array.from({ length: 1536 }, () => Math.random());
      
      const company = await insertGoldCompany({
        cui: '12345678',
        denumire: 'Test Company',
        embedding,
      });
      
      expect(company.embedding).toHaveLength(1536);
    });
    
    it('should support vector similarity search', async () => {
      await seedGoldCompaniesWithEmbeddings(100);
      
      const queryVector = generateEmbedding('agricultural company');
      
      const results = await db.execute(sql`
        SELECT id, denumire, embedding <-> ${queryVector}::vector as distance
        FROM gold_companies
        ORDER BY distance
        LIMIT 5
      `);
      
      expect(results).toHaveLength(5);
      expect(results[0].distance).toBeLessThan(1);
    });
  });
  
  describe('gold_lead_journey table', () => {
    it('should track FSM state transitions', async () => {
      const journey = await insertLeadJourney({
        companyId: 'comp-123',
        currentState: 'COLD',
      });
      
      await updateLeadJourney(journey.id, { currentState: 'WARM' });
      
      const history = await getJourneyHistory(journey.id);
      expect(history).toContain('COLD');
      expect(history).toContain('WARM');
    });
  });
});
```

---

## CHECKLIST

### Bronze (F1.1)

- [ ] bronze_contacts created
- [ ] Immutability trigger works
- [ ] content_hash unique per tenant

### Silver (F1.2)

- [ ] GENERATED columns work
- [ ] pg_trgm index created
- [ ] FK to companies works

### Gold (F1.3)

- [ ] pgvector embedding works
- [ ] Vector similarity search works
- [ ] FSM state tracking works

---

**Document generat:** 20 Ianuarie 2026
