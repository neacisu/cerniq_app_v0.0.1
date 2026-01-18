# ADR-0021: Naming Conventions (snake_case/camelCase)

**Status:** Accepted  
**Data:** 2026-01-15  
**Deciders:** Alex (1-Person-Team)

## Context

Necesităm consistență în naming între layers.

## Decizie

| Layer | Convention | Exemplu |
| ----- | ---------- | ------- |
| PostgreSQL (tables, columns) | snake_case | `gold_lead_journey`, `tenant_id` |
| TypeScript (variables, functions) | camelCase | `leadJourney`, `tenantId` |
| TypeScript (types, interfaces) | PascalCase | `LeadJourney`, `TenantId` |
| TypeScript (constants) | SCREAMING_SNAKE_CASE | `MAX_RETRY_ATTEMPTS` |
| Python (variables, functions) | snake_case | `lead_journey`, `tenant_id` |
| Python (classes) | PascalCase | `LeadJourneyService` |
| API endpoints | kebab-case | `/api/v1/lead-journey` |
| Environment variables | SCREAMING_SNAKE_CASE | `DATABASE_URL` |
| Files TS | kebab-case | `lead-journey.service.ts` |
| Files Python | snake_case | `lead_journey_service.py` |

## Documentație Detaliată

Pentru convențiile complete de naming, vezi:

- **[`master-specification.md`](../../specifications/master-specification.md)** § "Naming Conventions" - sursă canonică
- **[`coding-standards.md`](../../developer-guide/coding-standards.md)** § "Naming Conventions" - ghid detaliat
