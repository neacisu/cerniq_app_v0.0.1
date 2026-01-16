# ADR-0009: Zod pentru Validation Strategy

**Status:** Accepted  
**Data:** 2026-01-15  
**Deciders:** Alex (1-Person-Team)

## Context

Necesităm o strategie de validare unificată între:

- API request/response
- Database schemas
- Form validation frontend
- Worker job payloads

## Decizie

Utilizăm **Zod** ca soluție unică de validare în tot stack-ul.

## Consecințe

### Pozitive

- **Single source of truth** pentru types și validation
- Funcționează în Node.js, browser, și edge
- Integrare nativă cu Fastify, Drizzle, React Hook Form
- Type inference automată
- Coercion pentru inputs nesigure

### Configurație

```typescript
// packages/shared-types/schemas/company.ts
import { z } from 'zod';

export const CompanySchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  cui: z.string().regex(/^\d{2,10}$/, 'CUI invalid'),
  denumire: z.string().min(1).max(255),
  platitorTva: z.boolean().default(false),
  createdAt: z.date(),
});

export type Company = z.infer<typeof CompanySchema>;

// Validare CUI cu modulo-11 custom
export const CuiSchema = z.string().refine(validateCuiChecksum, {
  message: 'CUI checksum invalid',
});
```
