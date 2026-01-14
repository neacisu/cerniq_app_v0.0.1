# ADR-0029: Testing Strategy

**Status:** Accepted  
**Data:** 2026-01-15  
**Deciders:** Alex (1-Person-Team)

## Context

Cerniq.app necesită test coverage adecvat pentru:

- Business logic (unit tests)
- API endpoints (integration tests)
- Critical flows (E2E tests)

## Decizie

Test pyramid: 70% unit, 25% integration, 5% E2E.

## Consecințe

### Tools

- **Unit/Integration**: Vitest
- **E2E**: Playwright
- **Database**: pgTAP
- **Contracts**: Zod schema tests

### Coverage Requirements

| Component | Min Coverage |
| --------- | ----------- |
| API Routes | 80% |
| Workers | 75% |
| Event Handlers | 90% |
| HITL Logic | 95% |
| DB Migrations | 100% |

### Commands

```bash
pnpm test              # All tests
pnpm test:unit         # Unit tests only
pnpm test:integration  # Integration tests
pnpm test:e2e          # E2E tests
pnpm test:coverage     # With coverage report
```
