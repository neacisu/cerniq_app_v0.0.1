<!-- neuron-contract:author-complete -->

# Neuron `human:takeover:initiate`

> **Status:** audit manual **2026-04-11**. ADR-0064: oprire automatizare, flag journey, assign review, stop secvențe.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `human:takeover:initiate` |
| etapa | E2 |
| familie (v2) | `human` |
| contract_path | `contracts/neurons/E2/human--takeover--initiate.md` |
| ADR familie (indicativ) | [human](../../adr/families/e2/human.md) |

## Scop în context real

**v2 + catalog:** `HumanNeuron`, inițiere preluare conversație de la AI, criticitate **CRITICAL** în catalog. **Repo:** `createHumanTakeoverWorker` în `workers/outreach/src/workers/hitl.ts` (L436–564) pe `QUEUES.HUMAN_TAKEOVER_INITIATE`: actualizează `lead_journey` (`isHumanControlled: true`, `assignedToUser`, `requiresHumanReview: true`), actualizează `humanReviewQueue` (status `ASSIGNED`, `assignedTo`, `assignedAt`), enfilează `sequence:stop` cu motiv `HUMAN_TAKEOVER`, inserează `hitlAuditLog` + `auditWriter`. Eșecuri: `UnrecoverableError` dacă journey/review lipsesc.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`human:takeover:initiate\`` (L3467–3488+).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:human:takeover-initiate` (L1416–1423).
- `workers/shared/src/queue-registry.ts` — `HUMAN_TAKEOVER_INITIATE` (L173, L842).
- `workers/outreach/src/workers/hitl.ts` — `TakeoverInitiateJobData`, `createHumanTakeoverWorker` (L95–108, L436–564).
- `workers/outreach/src/index.ts` — L185.

## Instanțe v2

- **Catalog nodeKey:** `e2:human:takeover-initiate`
- **OTel (v2):** `cognitive.e2.human.takeover-initiate`

## N/A pe criterii

- **Rând 8:** **N/A** — non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e2:human:takeover-initiate`**, worker `createHumanTakeoverWorker`. | v2. | — |
| 2 | Etapă, familie, swimlane | Catalog: etapa 2, `human-oversight`. | v2 CRITICAL + Tier 2 în antet v2. | Catalog criticitate **CRITICAL**; v2 Tier 2 — ambele citite. |
| 3 | Rol declarat | Preluare control uman + oprire secvențe. | v2. | — |
| 4 | NeuronType + SOFAI | **Catalog:** `HumanNeuron`. | v2. | — |
| 5 | Criticitate | **Catalog:** `CRITICAL`. | v2 antet. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e2:human:takeover-initiate", …)` (L442). | v2 span. | — |
| 7 | Înveliș politică | ADR-0064 în comentarii + câmpuri DB; audit structurat. | v2 HITL mandatory / SLA 2h — **SLA 2h** nu apare literal în acest handler. | SLA detaliat: verificare în `hitl:sla:enforce` / specs. |
| 8 | Rutare model (dacă AI) | N/A | Non-AI. | N/A |
| 9 | Guardrails | `UnrecoverableError` pe rânduri zero; idempotență operațională limitată. | ADR-0007. | — |
| 10 | Escaladare HITL | `sequence_stop` + audit; parte din lanț HITL. | v2. | — |
| 11 | Micro-OODA | Update journey + review + enqueue + audit. | v2 LangGraph/UI — **nu** în cod. | LangGraph: **destinație v2**. |
| 12 | Tier + de-escaladare | Eșec dur la date inconsistente. | v2 Tier 2. | — |
| 13 | Stack | BullMQ, Postgres, coadă `sequence:stop`. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.e2.human.takeover-initiate`.
- **Cod:** `withCognitiveSpan("e2:human:takeover-initiate")` — **aliniat**.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
