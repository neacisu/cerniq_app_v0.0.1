# CERNIQ.APP — TESTE F0.10: DATABASE SCHEMA FOUNDATION

## Teste pentru Drizzle migrations și schema de bază

**Fază:** F0.10 | **Taskuri:** 6

---

## TESTE

```typescript
describe('Database Schema Foundation', () => {
  it('should run migrations', async () => {
    await migrate(db, { migrationsFolder: './drizzle' });
  });
  
  it('should have base tables', async () => {
    const tables = await db.execute(sql`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `);
    expect(tables.map(t => t.tablename)).toContain('tenants');
    expect(tables.map(t => t.tablename)).toContain('users');
  });
  
  it('should have RLS enabled on tenant tables', async () => {
    const result = await db.execute(sql`
      SELECT relrowsecurity FROM pg_class WHERE relname = 'tenants'
    `);
    expect(result[0].relrowsecurity).toBe(true);
  });
  
  it('should rollback migrations cleanly', async () => {
    await migrateDown(db);
    await migrate(db, { migrationsFolder: './drizzle' });
  });
});
```

---

**Document generat:** 20 Ianuarie 2026
