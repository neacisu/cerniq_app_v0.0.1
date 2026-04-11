# ADR-FAMILY-e2-templates

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e2-templates |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E2 |
| Familie | `templates` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e2-templates` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Procesare șabloane mesaje: spintax, personalizare, validare înainte de trimitere.

## Dovezi confirmate în Cerniq

| nodeKey | Coadă BullMQ |
| --- | --- |
| `e2:template:spintax` | `template:spintax:process` |
| `e2:template:personalize` | `template:personalize` |
| `e2:template:validate` | `template:validate` |

- Registry: `TEMPLATE_SPINTAX_PROCESS`, `TEMPLATE_PERSONALIZE`, `TEMPLATE_VALIDATE`.

### Export graf (v2)

- **1** neuron; exemplu: `template:spintax:process` **doar**.

### Reconciliere

- Graf: un nod; runtime: **trei** cozi — același tip de gap ca la secvențe (export agregat).

## Decizie de guvernanță familială

1. **Proprietar:** Outreach Content.
2. **Capabilitate:** variante de mesaj și validare sintactică.
3. **Guardrail:** injecție conținut înșabloane — politică securitate.

## Limită evidență

- Reguli complete de validare: din worker.
