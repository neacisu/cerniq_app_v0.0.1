<!-- neuron-contract:author-complete -->

# Neuron `hitl:task:resolve`

> **Status:** audit manual **2026-04-13**. **v2** (L7070–L7093): coadă `hitl:task:resolve`, `HumanNeuron`, catalog-grounded. **Repo:** **K52** — `E4_HITL_TASK_RESOLVE` în `queue-registry.ts`, worker în `index.ts`, procesor `hitlTaskResolveProcessor` în `k-hitl-workers.ts` (comentariu K52 L367–369). **Nealiniere catalog ↔ span:** catalog `e4:hitl:task-resolve` (`cognitive-node-catalog.ts` L2716) vs `withCognitiveSpan("e4:hitl:task:resolve", …)` (L392–393) → risc atribute OTel din `getNodeByKey` nepopulate.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `hitl:task:resolve` |
| etapa | E4 |
| familie (v2) | `hitl` |
| contract_path | `contracts/neurons/E4/hitl--task--resolve.md` |
| ADR familie (indicativ) | [hitl](../../adr/families/e4/hitl.md) |

## Scop în context real

**Cod:** utilizator rezolvă manual un task HITL (`decide` pe `approval_tasks`), audit `HITL_TASK_RESOLVED` în `gold_audit_logs_etapa4`, metrică `e4HitlTasksCreatedTotal` cu `task_type: "task_resolve"` (`k-hitl-workers.ts` L398–431). **v2** menționează OODA cu LangGraph/UI (L7088) — în sursa citită apare `approvalService.decide` + DB, fără dovezi LangGraph în același fișier.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L7070–L7093; duplicat #2 L8677–L8700.
- `workers/shared/src/queue-registry.ts` — `E4_HITL_TASK_RESOLVE: "hitl:task:resolve"` (L501).
- `packages/shared/src/cognitive-node-catalog.ts` — L2715–L2722 (`e4:hitl:task-resolve`).
- `workers/e4-postsale/src/workers/k-hitl-workers.ts` — K52 (L367–439).
- `workers/e4-postsale/src/index.ts` — K52 worker (L553–557).
- `workers/e4-postsale/src/__tests__/fhijk-workers.test.ts` — suită K52 (L1037+).
- `workers/shared/src/cognitive-helpers.ts` — `cognitive:${nodeKey}` (L226).
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- **Bloc principal:** antet v2 „NEURON hitl:task:resolve” (L7070–7093) — aceeași coadă și același `nodeKey` catalog ca în cod.
- **Duplicat plan #2:** același neuron sub antetul v2 „NEURON hitl:task:resolve — duplicat #2” (L8677–8700). Textul v2 aduce câmpuri **catalog-grounded** explicite (ex. Catalog nodeKey, Swimlane, Criticality MEDIUM, OTel span name `cognitive.e4.hitl.task-resolve`) și politici diferite față de blocul E5 generic de deasupra (ex. SLA **8h**, HITL „on repeated failure” L8697–8698 vs comentariu K52 „no SLA” în cod). **Repo:** un singur set de artefacte runtime (K52); contractul de față se referă la implementarea E4, nu la dublura narativă E5 din graf.

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L7089).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Coadă + K52; catalog `e4:hitl:task-resolve`. | v2 L7087. | Cheie span `e4:hitl:task:resolve` ≠ `nodeKey` catalog. |
| 2 | Etapă, familie, swimlane | `human-oversight-e4`, etapă 4 (L2719–L2720). | v2 familie `hitl`, swimlane `human-oversight-e4` (L7080). | — |
| 3 | Rol declarat | Rezolvare task + audit (K52). | v2 L7084–L7086. | — |
| 4 | NeuronType + SOFAI | `HumanNeuron` (L2718). | v2 L7078. | — |
| 5 | Criticitate | `MEDIUM` catalog (L2722). | v2 `MEDIUM` L7081. | — |
| 6 | Înveliș telemetrie | Span `cognitive:e4:hitl:task:resolve`. | v2 `cognitive.e4.hitl.task-resolve` (L7092). | Diferență `:` vs `-` în cheie. |
| 7 | Înveliș politică | — | v2 L7090. | — |
| 8 | Rutare model (dacă AI) | **N/A** | L7089. | — |
| 9 | Guardrails | Flux `decide` + audit obligatoriu în handler. | — | — |
| 10 | Escaladare HITL | Natura worker = HITL. | v2 L7090. | — |
| 11 | Micro-OODA | Handler: decide + insert audit. | v2 OODA LangGraph (L7088). | LangGraph neconfirmat în `k-hitl-workers.ts`. |
| 12 | Tier + de-escaladare | Comentariu K52: fără SLA (L369). | v2 Tier 4 „fully autonomous” (L7082) — contraintuitiv pentru `HumanNeuron`; duplicat #2 menționează SLA 8h (L8697). | Contradicție v2 tier vs tip neuron; două variante text v2 pentru același neuron. |
| 13 | Stack v2 §2.3 (subset) | BullMQ E4. | — | — |

### Mapare OTel

- **v2:** `cognitive.e4.hitl.task-resolve` (L7092).
- **Cod:** `cognitive:e4:hitl:task:resolve` (din `withCognitiveSpan`).

---
*Revizuire manuală:* dovezi repo 2026-04-13.
