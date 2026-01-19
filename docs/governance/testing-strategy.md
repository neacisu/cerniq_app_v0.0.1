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

## ADR Asociat

- [ADR-0029: Testing Strategy](../adr/ADR%20Etapa%200/ADR-0029-Testing-Strategy.md)

## Principii Generale

1. **Test Pyramid**: Unit (70%) → Integration (20%) → E2E (10%)
2. **Framework**: Vitest pentru toate testele
3. **Coverage Target**: Minimum 80% pentru cod critic
4. **CI Integration**: Toate PR-urile trebuie să treacă testele

---

**Document tip:** Governance Index  
**Actualizat:** 18 Ianuarie 2026
