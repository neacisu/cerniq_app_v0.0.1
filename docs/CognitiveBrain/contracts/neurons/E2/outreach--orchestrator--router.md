<!-- neuron-contract:author-complete -->

# Neuron `outreach:orchestrator:router`

> **Status:** audit manual **2026-04-11**. Worker subțire: redirecționează către o coadă țintă dinamică (`targetQueue`) cu payload propagat.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `outreach:orchestrator:router` |
| etapa | E2 |
| familie (v2) | `orchestrator` |
| contract_path | `contracts/neurons/E2/outreach--orchestrator--router.md` |
| ADR familie (indicativ) | [orchestrator](../../adr/families/e2/orchestrator.md) |

## Scop în context real

**v2:** rutare pe canal optim. **Repo:** `createOutreachOrchestratorRouterWorker` (`workers/outreach/src/workers/extra-dispatch.ts`, L193–224) citește `job.data`: `targetQueue`, `jobName` (implicit `"dispatch"`), `payload`; deschide `createQueue(targetQueue)`, apelează `add(jobName, ensureJobDataCorrelationId({...payload, correlationId}))`, închide coada, returnează `{ forwarded: targetQueue, jobName }`. Fără LLM, fără decizie de canal în acest fișier — doar forward.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`outreach:orchestrator:router\`` (L3792–3815).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:outreach:orchestrator-router` (L1027–1035).
- `workers/shared/src/queue-registry.ts` — `OUTREACH_ORCHESTRATOR_ROUTER`.
- `workers/outreach/src/workers/extra-dispatch.ts` — `createOutreachOrchestratorRouterWorker`.
- `workers/outreach/src/index.ts` — înregistrare (L219).
- `workers/shared/src/factory.ts` — `buildCognitiveContextFromJob` (L51–58): cere `tenantId` la **nivel rădăcină** `job.data`.

## Instanțe v2

- **Catalog nodeKey:** `e2:outreach:orchestrator-router`
- **OTel (v2):** `cognitive.e2.outreach.orchestrator-router`

## N/A pe criterii

- **Rând 8:** **N/A** — fără LLM în handler.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | `e2:outreach:orchestrator-router`; coadă `outreach:orchestrator:router`. | v2 + catalog. | — |
| 2 | Etapă, familie, swimlane | Catalog: etapa 2, `pipeline-control`. | v2. | — |
| 3 | Rol declarat | Forward generic către `targetQueue` + corelare din `payload`. | v2 „canal optim” — decizia e în producător, nu aici. | — |
| 4 | NeuronType + SOFAI | Catalog: `ExecutiveNeuron`. | v2. | Comportament procedural (proxy). |
| 5 | Criticitate | Catalog / v2: `CRITICAL`. | v2. | — |
| 6 | Înveliș telemetrie | `createWorker` fără `withCognitiveSpan` explicit în procesor. | Span v2. | **Limită:** `job.data` router are `targetQueue` + `payload`; `tenantId` poate fi doar în `payload`. `buildCognitiveContextFromJob` verifică `data.tenantId` la rădăcină → **`withCognitiveSpan` din fabrică poate fi ocolit** (L105–106 `factory.ts`) pentru job-uri fără `tenantId` top-level. |
| 7 | Înveliș politică | Nicio politică suplimentară în router. | v2 tier 2. | — |
| 8 | Rutare model (dacă AI) | N/A | v2 LLM — neimplementat. | N/A |
| 9 | Guardrails | Doar `ensureJobDataCorrelationId`. | ADR-0007 țintă. | `targetQueue` nevalidat în acest fișier. |
| 10 | Escaladare HITL | Nu. | v2. | — |
| 11 | Micro-OODA | OBSERVE: citire job; DECIDE: implicit forward; ACT: `q.add`. | v2 OODA complet — simplificat în cod. | — |
| 12 | Tier + de-escaladare | Eșec `add`/Redis → excepție. | v2. | — |
| 13 | Stack | BullMQ `createQueue` / `close`. | v2 §2.3. | Fără test dedicat găsit la audit. |

### Mapare OTel

- **v2:** `cognitive.e2.outreach.orchestrator-router`.
- **Cod:** rezolvare `nodeKey` din coadă + `withCognitiveSpan` în fabrică **dacă** `tenantId` la rădăcină; altfel doar observabilitate BullMQ generică — **parțial / gap telemetrie cognitivă** pentru payload-uri imbricate.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
