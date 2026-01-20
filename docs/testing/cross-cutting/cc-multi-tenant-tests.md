# CERNIQ.APP — TESTE CROSS-CUTTING: MULTI-TENANT

## Teste pentru izolarea datelor între tenanți

**Scope:** Toate etapele (E0-E5) | **Focus:** RLS, Data Isolation, Tenant Context

---

## PRINCIPII MULTI-TENANT

| Principiu | Implementare | Test Focus |
| --------- | ------------ | ---------- |
| **Data Isolation** | PostgreSQL RLS | Cross-tenant query blocking |
| **Tenant Context** | `app.current_tenant_id` | Context propagation |
| **Default Deny** | RLS policies | Access without context |
| **Audit Trail** | Per-tenant logs | Log segregation |

---

## 1. RLS POLICY TESTS

### 1.1 Core Tables with RLS

```typescript
// tests/security/multi-tenant/rls-policies.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { db, setTenantContext, resetTenantContext } from '@cerniq/db';

describe('RLS Policies', () => {
  
  const TENANT_A = 'tenant-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const TENANT_B = 'tenant-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  
  let companyIdTenantA: string;
  let companyIdTenantB: string;
  
  beforeAll(async () => {
    // Seed data for both tenants
    await setTenantContext(TENANT_A);
    const [compA] = await db.insert(goldCompanies).values({
      tenantId: TENANT_A,
      cui: '11111111',
      denumire: 'Company Tenant A',
      leadScore: 50,
    }).returning();
    companyIdTenantA = compA.id;
    
    await setTenantContext(TENANT_B);
    const [compB] = await db.insert(goldCompanies).values({
      tenantId: TENANT_B,
      cui: '22222222',
      denumire: 'Company Tenant B',
      leadScore: 75,
    }).returning();
    companyIdTenantB = compB.id;
  });
  
  afterEach(async () => {
    await resetTenantContext();
  });
  
  const tablesWithRLS = [
    'bronze_contacts',
    'silver_companies',
    'silver_contacts',
    'gold_companies',
    'gold_contacts',
    'gold_lead_journey',
    'approval_tasks',
    'audit_log',
    'outreach_sequences',
    'orders',
    'payments',
  ];
  
  describe.each(tablesWithRLS)('Table: %s', (tableName) => {
    
    it('should have RLS enabled', async () => {
      const result = await db.execute(sql`
        SELECT relrowsecurity 
        FROM pg_class 
        WHERE relname = ${tableName}
      `);
      
      expect(result[0]?.relrowsecurity).toBe(true);
    });
    
    it('should have at least one policy', async () => {
      const result = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM pg_policies
        WHERE tablename = ${tableName}
      `);
      
      expect(parseInt(result[0].count)).toBeGreaterThan(0);
    });
  });
  
  describe('Cross-Tenant Data Access', () => {
    
    it('Tenant A cannot see Tenant B companies', async () => {
      await setTenantContext(TENANT_A);
      
      const results = await db
        .select()
        .from(goldCompanies)
        .where(eq(goldCompanies.id, companyIdTenantB));
      
      expect(results).toHaveLength(0);
    });
    
    it('Tenant A can see own companies', async () => {
      await setTenantContext(TENANT_A);
      
      const results = await db
        .select()
        .from(goldCompanies)
        .where(eq(goldCompanies.id, companyIdTenantA));
      
      expect(results).toHaveLength(1);
      expect(results[0].denumire).toBe('Company Tenant A');
    });
    
    it('SELECT * returns only own tenant data', async () => {
      await setTenantContext(TENANT_A);
      
      const allCompanies = await db.select().from(goldCompanies);
      
      // All should be tenant A
      expect(allCompanies.every(c => c.tenantId === TENANT_A)).toBe(true);
      // Should not contain tenant B company
      expect(allCompanies.find(c => c.id === companyIdTenantB)).toBeUndefined();
    });
  });
  
  describe('Write Operations', () => {
    
    it('cannot UPDATE other tenant data', async () => {
      await setTenantContext(TENANT_A);
      
      const updated = await db
        .update(goldCompanies)
        .set({ denumire: 'HACKED' })
        .where(eq(goldCompanies.id, companyIdTenantB))
        .returning();
      
      expect(updated).toHaveLength(0);
      
      // Verify unchanged
      await setTenantContext(TENANT_B);
      const company = await db.select().from(goldCompanies)
        .where(eq(goldCompanies.id, companyIdTenantB));
      expect(company[0].denumire).toBe('Company Tenant B');
    });
    
    it('cannot DELETE other tenant data', async () => {
      await setTenantContext(TENANT_A);
      
      const deleted = await db
        .delete(goldCompanies)
        .where(eq(goldCompanies.id, companyIdTenantB))
        .returning();
      
      expect(deleted).toHaveLength(0);
      
      // Verify still exists
      await setTenantContext(TENANT_B);
      const exists = await db.select().from(goldCompanies)
        .where(eq(goldCompanies.id, companyIdTenantB));
      expect(exists).toHaveLength(1);
    });
    
    it('cannot INSERT with wrong tenant_id', async () => {
      await setTenantContext(TENANT_A);
      
      await expect(
        db.insert(goldCompanies).values({
          tenantId: TENANT_B, // Wrong tenant!
          cui: '99999999',
          denumire: 'Sneaky Company',
        })
      ).rejects.toThrow(); // RLS should block
    });
  });
  
  describe('Context Not Set', () => {
    
    it('should block all access when tenant context not set', async () => {
      await resetTenantContext();
      
      await expect(
        db.select().from(goldCompanies)
      ).rejects.toThrow('tenant context required');
    });
  });
});
```

---

## 2. API TENANT ISOLATION

```typescript
// tests/security/multi-tenant/api-isolation.test.ts
describe('API Multi-Tenant Isolation', () => {
  
  let tokenTenantA: string;
  let tokenTenantB: string;
  let companyIdTenantA: string;
  
  beforeAll(async () => {
    tokenTenantA = await createJwtForTenant('tenant-A');
    tokenTenantB = await createJwtForTenant('tenant-B');
    
    // Create company in tenant A
    const response = await api
      .post('/api/v1/companies')
      .set('Authorization', `Bearer ${tokenTenantA}`)
      .send({ cui: '33333333', denumire: 'API Test Company' });
    
    companyIdTenantA = response.body.id;
  });
  
  describe('GET endpoints', () => {
    
    it('Tenant B cannot access Tenant A company', async () => {
      const response = await api
        .get(`/api/v1/companies/${companyIdTenantA}`)
        .set('Authorization', `Bearer ${tokenTenantB}`);
      
      expect(response.status).toBe(404); // Not 403 to prevent enumeration
    });
    
    it('Tenant A can access own company', async () => {
      const response = await api
        .get(`/api/v1/companies/${companyIdTenantA}`)
        .set('Authorization', `Bearer ${tokenTenantA}`);
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(companyIdTenantA);
    });
    
    it('List returns only own tenant data', async () => {
      const response = await api
        .get('/api/v1/companies')
        .set('Authorization', `Bearer ${tokenTenantB}`);
      
      expect(response.status).toBe(200);
      // Should not contain tenant A's company
      expect(response.body.data.find(c => c.id === companyIdTenantA)).toBeUndefined();
    });
  });
  
  describe('PUT/PATCH endpoints', () => {
    
    it('Tenant B cannot update Tenant A company', async () => {
      const response = await api
        .patch(`/api/v1/companies/${companyIdTenantA}`)
        .set('Authorization', `Bearer ${tokenTenantB}`)
        .send({ denumire: 'Hacked Name' });
      
      expect(response.status).toBe(404);
      
      // Verify unchanged
      const verifyResponse = await api
        .get(`/api/v1/companies/${companyIdTenantA}`)
        .set('Authorization', `Bearer ${tokenTenantA}`);
      
      expect(verifyResponse.body.denumire).toBe('API Test Company');
    });
  });
  
  describe('DELETE endpoints', () => {
    
    it('Tenant B cannot delete Tenant A company', async () => {
      const response = await api
        .delete(`/api/v1/companies/${companyIdTenantA}`)
        .set('Authorization', `Bearer ${tokenTenantB}`);
      
      expect(response.status).toBe(404);
      
      // Verify still exists
      const verifyResponse = await api
        .get(`/api/v1/companies/${companyIdTenantA}`)
        .set('Authorization', `Bearer ${tokenTenantA}`);
      
      expect(verifyResponse.status).toBe(200);
    });
  });
});
```

---

## 3. WORKER TENANT CONTEXT

```typescript
// tests/security/multi-tenant/worker-context.test.ts
describe('Worker Tenant Context Propagation', () => {
  
  let queue: Queue;
  let worker: Worker;
  
  beforeAll(() => {
    queue = new Queue('test-tenant-queue', { connection: redis });
  });
  
  afterAll(async () => {
    await queue.close();
  });
  
  it('should pass tenant_id in job data', async () => {
    const job = await queue.add('process', {
      tenantId: 'tenant-from-job',
      companyId: 'company-123',
    });
    
    expect(job.data.tenantId).toBe('tenant-from-job');
  });
  
  it('should set tenant context in worker', async () => {
    let capturedTenantId: string | null = null;
    
    worker = new Worker(
      'test-tenant-queue',
      async (job) => {
        // Worker should set context
        await setTenantContext(job.data.tenantId);
        
        // Capture current context
        const result = await db.execute(sql`SELECT current_setting('app.current_tenant_id')`);
        capturedTenantId = result[0].current_setting;
        
        return { success: true };
      },
      { connection: redis }
    );
    
    const job = await queue.add('process', {
      tenantId: 'worker-test-tenant',
      data: {},
    });
    
    await job.waitUntilFinished(queue.events);
    
    expect(capturedTenantId).toBe('worker-test-tenant');
    
    await worker.close();
  });
  
  it('should prevent cross-tenant operations in worker', async () => {
    worker = new Worker(
      'test-tenant-queue',
      async (job) => {
        await setTenantContext(job.data.tenantId);
        
        // Try to access different tenant's data
        const otherTenantData = await db
          .select()
          .from(goldCompanies)
          .where(eq(goldCompanies.tenantId, 'different-tenant'));
        
        // Should return empty due to RLS
        return { found: otherTenantData.length };
      },
      { connection: redis }
    );
    
    const job = await queue.add('process', {
      tenantId: 'restricted-tenant',
    });
    
    const result = await job.waitUntilFinished(queue.events);
    expect(result.found).toBe(0);
    
    await worker.close();
  });
});
```

---

## 4. AUDIT LOG SEGREGATION

```typescript
// tests/security/multi-tenant/audit-segregation.test.ts
describe('Audit Log Tenant Segregation', () => {
  
  it('should record tenant_id in audit log', async () => {
    await setTenantContext('audit-test-tenant');
    
    // Perform an auditable action
    await db.insert(goldCompanies).values({
      tenantId: 'audit-test-tenant',
      cui: '44444444',
      denumire: 'Audit Test Company',
    });
    
    // Check audit log
    const logs = await db.execute(sql`
      SELECT * FROM audit_log 
      WHERE tenant_id = 'audit-test-tenant'
      ORDER BY created_at DESC
      LIMIT 1
    `);
    
    expect(logs[0].tenant_id).toBe('audit-test-tenant');
    expect(logs[0].action).toBe('INSERT');
    expect(logs[0].table_name).toBe('gold_companies');
  });
  
  it('should not allow cross-tenant audit log access', async () => {
    await setTenantContext('tenant-X');
    
    const otherTenantLogs = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.tenantId, 'tenant-Y'));
    
    expect(otherTenantLogs).toHaveLength(0);
  });
});
```

---

## 5. RATE LIMITING PER TENANT

```typescript
// tests/security/multi-tenant/rate-limiting.test.ts
describe('Per-Tenant Rate Limiting', () => {
  
  it('should apply separate rate limits per tenant', async () => {
    const tokenA = await createJwtForTenant('rate-tenant-A');
    const tokenB = await createJwtForTenant('rate-tenant-B');
    
    // Exhaust tenant A's limit
    for (let i = 0; i < 110; i++) {
      await api.get('/api/v1/companies').set('Authorization', `Bearer ${tokenA}`);
    }
    
    // Tenant A should be rate limited
    const tenantAResponse = await api
      .get('/api/v1/companies')
      .set('Authorization', `Bearer ${tokenA}`);
    
    expect(tenantAResponse.status).toBe(429);
    
    // Tenant B should NOT be affected
    const tenantBResponse = await api
      .get('/api/v1/companies')
      .set('Authorization', `Bearer ${tokenB}`);
    
    expect(tenantBResponse.status).toBe(200);
  });
});
```

---

## CHECKLIST VALIDARE

### RLS Policies

- [ ] All core tables have RLS enabled
- [ ] SELECT blocked for other tenants
- [ ] UPDATE blocked for other tenants
- [ ] DELETE blocked for other tenants
- [ ] INSERT with wrong tenant_id blocked
- [ ] Access blocked when context not set

### API Layer

- [ ] GET returns 404 for other tenant resources
- [ ] PUT/PATCH cannot modify other tenant data
- [ ] DELETE cannot remove other tenant data
- [ ] List endpoints filter by tenant

### Worker Layer

- [ ] Tenant context set from job data
- [ ] Workers cannot access other tenant data
- [ ] Tenant ID logged in job processing

### Cross-Cutting

- [ ] Audit logs segregated by tenant
- [ ] Rate limits applied per tenant
- [ ] Cache keys prefixed with tenant

---

**Document generat:** 20 Ianuarie 2026  
**Conformitate:** Master Spec v1.2
