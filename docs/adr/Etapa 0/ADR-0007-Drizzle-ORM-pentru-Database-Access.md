# ADR-0007: Drizzle ORM pentru Database Access

**Status:** Accepted  
**Data:** 2026-01-15  
**Deciders:** Alex (1-Person-Team)

## Context

Necesităm un ORM TypeScript pentru accesul la PostgreSQL care oferă:

- Type safety completă
- SQL-like syntax (nu magic)
- Performance superioară
- Integrare cu Zod pentru validation

## Decizie

Utilizăm **Drizzle ORM** cu **drizzle-zod** integration.

## Consecințe

### Pozitive

- SQL-like syntax - predictibil și debuggable
- Zod schemas auto-generated din DB schema
- Performanță superioară vs Prisma (~3x faster queries)
- drizzle-kit pentru migrații
- Zero runtime overhead

### Negative

- Documentație mai puțin matură decât Prisma
- Comunitate mai mică

### Pattern Utilizare

```typescript
// Schema definition
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const silverCompanies = pgTable('silver_companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  cui: varchar('cui', { length: 12 }),
  denumire: varchar('denumire', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// Zod schema auto-generated
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

export const insertCompanySchema = createInsertSchema(silverCompanies);
export const selectCompanySchema = createSelectSchema(silverCompanies);
```
