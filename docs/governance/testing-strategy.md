# CERNIQ.APP — Testing Strategy

## Governance Document - Referințe

### Versiunea 1.0 | 18 Ianuarie 2026

---

## Strategii de Testare per Etapă

Strategia de testare este documentată detaliat în fiecare etapă a proiectului:

| Etapă | Document | Descriere |
| ----- | -------- | --------- |
| Etapa 0 | [`etapa0-testing-strategy.md`](../specifications/Etapa%200/etapa0-testing-strategy.md) | Infrastructure testing, Docker, CI/CD |
| Etapa 1 | [`etapa1-testing-strategy.md`](../specifications/Etapa%201/etapa1-testing-strategy.md) | Data enrichment, API testing |
| Etapa 2 | [`etapa2-testing-strategy.md`](../specifications/Etapa%202/etapa2-testing-strategy.md) | Cold outreach, workers, integration |
| Etapa 3 | [`etapa3-testing-strategy.md`](../specifications/Etapa%203/etapa3-testing-strategy.md) | AI Agent, Guardrails testing |
| Etapa 4 | [`etapa4-testing-strategy.md`](../specifications/Etapa%204/etapa4-testing-strategy.md) | Post-sale modules, credit scoring |
| Etapa 5 | [`etapa5-testing-strategy.md`](../specifications/Etapa%205/etapa5-testing-strategy.md) | Nurturing workflows, graph analysis |

---

## 📚 Testing Documentation Framework (66 fișiere)

> **Documentație completă:** [`docs/testing/`](../testing/)

### Overview Documents

| Document | Descriere |
| -------- | --------- |
| [`00-testing-overview.md`](../testing/00-testing-overview.md) | Strategia generală, Test Pyramid, Coverage Targets |
| [`01-testing-types-catalog.md`](../testing/01-testing-types-catalog.md) | Catalog 10 tipuri teste cu exemple |
| [`02-testing-tools-stack.md`](../testing/02-testing-tools-stack.md) | Vitest, Playwright, k6, Pact, Pumba config |
| [`03-testing-conventions.md`](../testing/03-testing-conventions.md) | Naming, patterns, anti-patterns |

### Teste per Etapă

| Etapă | Index | Fișiere |
| ----- | ----- | ------- |
| Etapa 0 | [`etapa-0/e0-index.md`](../testing/etapa-0/e0-index.md) | 14 docs (infrastructură) |
| Etapa 1 | [`etapa-1/e1-index.md`](../testing/etapa-1/e1-index.md) | 13 docs (data enrichment) |
| Etapa 2 | [`etapa-2/e2-index.md`](../testing/etapa-2/e2-index.md) | 7 docs (cold outreach) |
| Etapa 3 | [`etapa-3/e3-index.md`](../testing/etapa-3/e3-index.md) | 9 docs (AI sales agent) |
| Etapa 4 | [`etapa-4/e4-index.md`](../testing/etapa-4/e4-index.md) | 7 docs (post-sale) |
| Etapa 5 | [`etapa-5/e5-index.md`](../testing/etapa-5/e5-index.md) | 5 docs (nurturing) |

### Teste Cross-Cutting (Transversale)

| Document | Focus |
| -------- | ----- |
| [`cc-hitl-tests.md`](../testing/cross-cutting/cc-hitl-tests.md) | Human-in-the-Loop approval workflows |
| [`cc-performance-tests.md`](../testing/cross-cutting/cc-performance-tests.md) | k6 load testing (1000 RPS, 500 Jobs/s) |
| [`cc-chaos-tests.md`](../testing/cross-cutting/cc-chaos-tests.md) | Pumba failure injection (Redis, DB) |
| [`cc-security-tests.md`](../testing/cross-cutting/cc-security-tests.md) | OWASP Top 10, RLS bypass |
| [`cc-contract-tests.md`](../testing/cross-cutting/cc-contract-tests.md) | Pact consumer/provider |
| [`cc-multi-tenant-tests.md`](../testing/cross-cutting/cc-multi-tenant-tests.md) | RLS policies, isolation |
| [`cc-gdpr-tests.md`](../testing/cross-cutting/cc-gdpr-tests.md) | Retention, erasure, anonymization |

---

## ADR Asociat

- [ADR-0029: Testing Strategy](../adr/ADR%20Etapa%200/ADR-0029-Testing-Strategy.md)

## Principii Generale

1. **Test Pyramid**: Unit (70%) → Integration (20%) → E2E (10%)
2. **Framework**: Vitest pentru toate testele
3. **Coverage Target**: Conform Master Spec § 2.10.8 (Canonical Test Coverage Targets)
4. **CI Integration**: Toate PR-urile trebuie să treacă testele

---

**Document tip:** Governance Index  
**Actualizat:** 18 Ianuarie 2026
