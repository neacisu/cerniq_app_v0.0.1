<!-- neuron-contract:author-complete -->

# Neuron `contract:generate:notice`

> **Status:** audit manual **2026-04-13**. v2 L6512–6532 confirmă coadă `contract:generate:notice`. **Nu** există potrivire în [`queue-registry.ts`](../../../../../workers/shared/src/queue-registry.ts) sau în [`cognitive-node-catalog.ts`](../../../../../packages/shared/src/cognitive-node-catalog.ts) la audit. ADR familie: pașii `generate:notice` apar în **graf**, nu ca literali în registry.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `contract:generate:notice` |
| etapa | E4 |
| familie (v2) | `contracts` |
| contract_path | `contracts/neurons/E4/contract--generate--notice.md` |
| ADR familie (indicativ) | [contracts](../../adr/families/e4/contracts.md) |

## Scop în context real

**Destinație (graf v2):** generare act / notificare în fluxul contractual. **Stare Cerniq:** fără worker BullMQ sau `nodeKey` mapat la acest literal în sursele citite; notificările operaționale pot fi în alte cozi (ex. alerte) — **neconectat** fără dovezi suplimentare.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L6512–6532.
- ADR: [`adr/families/e4/contracts.md`](../../adr/families/e4/contracts.md) — L43–44 limită evidență.
- Registry / catalog: căutare `contract:generate:notice` — **0** potriviri la audit.
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `contracts` (v2 L6512–6532)

- **Confirmed queue field:** `contract:generate:notice`
- **Neuron type (v2 inferat):** ContractNeuron
- **Evidence status:** graph-export (L6532)
- **OTel (v2):** `cognitive.contract.generate.notice`

## N/A pe criterii

- **8 — Rutare model:** N/A — Non-AI (v2).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap:** fără coadă/registry/catalog pentru `contract:generate:notice`. | v2 L6526. | Implementare viitoare sau mapare semantică nedocumentată în cod. |
| 2 | Etapă, familie, swimlane | — | v2: E4, `contracts`; swimlane `contracts` în metrică L6531. | — |
| 3 | Rol declarat | — | v2 L6524–6525. | — |
| 4 | NeuronType + SOFAI | — | v2 ContractNeuron inferat. | — |
| 5 | Criticitate | — | v2 inferat MEDIUM. | — |
| 6 | Înveliș telemetrie | — | v2 L6531. | — |
| 7 | Înveliș politică | — | v2 L6529. | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI. | — |
| 9 | Guardrails | — | — | — |
| 10 | Escaladare HITL | — | — | — |
| 11 | Micro-OODA | — | v2 L6527. | — |
| 12 | Tier + de-escaladare | — | v2 Tier 4. | — |
| 13 | Stack v2 §2.3 (subset) | — | — | — |

### Mapare OTel

- **v2:** `cognitive.contract.generate.notice`.
- **Cod:** neimplementat ca atare la audit — fără `withCognitiveSpan` sau coadă dedicată dovedită.

---
*Audit manual 2026-04-13.*
