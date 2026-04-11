# ADR-FAMILY-e3-guardrails

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e3-guardrails |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E3 |
| Familie | `guardrails` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e3-guardrails` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Verificări **deterministe** înainte/după răspuns AI: preț, stoc, discount, SKU, fiscal — aliniate conceptului ADR-0007 (v2) ca plan de infrastructură guardrail.

## Dovezi confirmate în Cerniq

| nodeKey | Coadă BullMQ |
| --- | --- |
| `e3:guardrail:price-check` | `guardrail:price:check` |
| `e3:guardrail:stock-check` | `guardrail:stock:check` |
| `e3:guardrail:discount-check` | `guardrail:discount:check` |
| `e3:guardrail:sku-validate` | `guardrail:sku:validate` |
| `e3:guardrail:fiscal-validate` | `guardrail:fiscal:validate` |

- Registry: `E3_GUARDRAIL_*` — match.

### Export graf (v2)

- **5** neuroni; exemple: `guardrail:discount:check`, `guardrail:log:analyze`, `guardrail:price:check`, `guardrail:stock:check`, `guardrail:stock:verify`.

### Reconciliere

| Observație |
| --- |
| Graf: `guardrail:log:analyze`, `guardrail:stock:verify` — **nu** apar ca literali în `QUEUES` la audit; catalog folosește `guardrail:sku:validate` în loc de `stock:verify`. **Gap** graf ↔ registry/catalog. |

## Observabilitate

- Span-uri cognitive: [cognitive-helpers.ts](../../../../workers/shared/src/cognitive-helpers.ts) pentru procesare instrumentată.

## Decizie de guvernanță familială

1. **Proprietar:** E3 Risk + Platform.
2. **Capabilitate:** blocare acțiuni invalide înainte de execuție motor.
3. **Telemetrie:** **CRITICAL** pe încălcări.

## Limită evidență

- Mapare `guardrail:stock:verify` vs `guardrail:sku:validate`: clarificare în cod sau regenerare graf.
