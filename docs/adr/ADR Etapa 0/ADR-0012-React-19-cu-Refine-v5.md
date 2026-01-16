# ADR-0012: React 19 cu Refine v5

**Status:** Accepted  
**Data:** 2026-01-15  
**Deciders:** Alex (1-Person-Team)

## Context

Frontend-ul admin pentru Cerniq.app necesită:

- CRUD operations rapide
- Dashboard-uri pentru HITL approvals
- Real-time updates
- Data fetching optimizat

## Decizie

Utilizăm **React 19.2.3** cu **Refine v5** (headless) și **shadcn/ui**.

## Consecințe

### Pozitive

- React 19 Server Components pentru data fetching
- `useOptimistic` pentru UI responsiv
- React Compiler 1.0 (12% faster loads, 2.5x faster interactions)
- Refine headless = control complet UI
- TanStack Query v5 integration

### Pattern

```typescript
// App.tsx cu Refine
import { Refine } from '@refinedev/core';
import { dataProvider } from './providers/data-provider';

function App() {
  return (
    <Refine
      dataProvider={dataProvider('/api/v1')}
      resources={[
        {
          name: 'companies',
          list: '/companies',
          show: '/companies/:id',
          create: '/companies/create',
          edit: '/companies/:id/edit',
          meta: { label: 'Companii' },
        },
        {
          name: 'approvals',
          list: '/approvals',
          show: '/approvals/:id',
          meta: { label: 'Aprobări HITL' },
        },
      ]}
    >
      {/* Routes */}
    </Refine>
  );
}
```
