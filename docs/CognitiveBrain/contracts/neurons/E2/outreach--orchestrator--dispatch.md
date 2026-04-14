<!-- neuron-contract:author-complete -->

# Neuron `outreach:orchestrator:dispatch`

> **Status:** audit manual **2026-04-11**. Worker determinist: selectează lead-uri eligibile și enfilează `outreach:phone:allocator` (nu trimite direct pe canale).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `outreach:orchestrator:dispatch` |
| etapa | E2 |
| familie (v2) | `orchestrator` |
| contract_path | `contracts/neurons/E2/outreach--orchestrator--dispatch.md` |
| ADR familie (indicativ) | [orchestrator](../../adr/families/e2/orchestrator.md) |

## Scop în context real

**v2:** dispatch outreach către canale, tier2, ExecutiveNeuron. **Repo:** `createDispatchWorker` (`workers/outreach/src/workers/orchestration.ts`, L94–184) interoghează `lead_journey` (stări `COLD` / `CONTACTED_WA` / `CONTACTED_EMAIL`, `next_action_at`, fără review uman), exclude lead-uri cu `gold_companies.doNotContact`, apoi pentru fiecare lead adaugă job `allocate` pe coada `outreach:phone:allocator` cu `PhoneAllocatorJobData`. Incrementează `outreachDispatched` cu `channel: "PENDING"`. **Producători:** worker E5 (ex. `workers/e5-nurturing/src/workers/i50-content-template-render.ts`, L207) folosește aceeași coadă. Nu există apel LLM în handler.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`outreach:orchestrator:dispatch\`` (L3767–3790).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:outreach:orchestrator-dispatch` (L1018–1026).
- `workers/shared/src/queue-registry.ts` — `OUTREACH_ORCHESTRATOR_DISPATCH`.
- `workers/outreach/src/workers/orchestration.ts` — `createDispatchWorker`, `DispatchJobData`, `DispatchResult`.
- `workers/outreach/src/index.ts` — înregistrare worker (L146).
- `workers/outreach/src/workers/orchestration.integration.test.ts` — export smoke (L20–21).
- `workers/e5-nurturing/src/workers/i50-content-template-render.ts` — enqueue dispatch (indicativ).

## Instanțe v2

- **Catalog nodeKey:** `e2:outreach:orchestrator-dispatch`
- **OTel (v2):** `cognitive.e2.outreach.orchestrator-dispatch`

## N/A pe criterii

- **Rând 8:** **N/A** pentru rutare LLM în cod; v2 menționează model routing — comportamentul real este non-AI (SQL + BullMQ).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | `e2:outreach:orchestrator-dispatch`; coadă `outreach:orchestrator:dispatch`. | v2 + catalog. | — |
| 2 | Etapă, familie, swimlane | Catalog: etapa 2, `pipeline-control`. | v2 orchestrator. | — |
| 3 | Rol declarat | „Dispatch” efectiv = enfilează alocator telefon per lead eligibil. | v2 „către canale” — implementare în doi pași (allocator → selector). | Lanțul până la trimitere nu e în acest worker. |
| 4 | NeuronType + SOFAI | Catalog: `ExecutiveNeuron`. | v2 System2 (clasificare v2 §2.1). | — |
| 5 | Criticitate | Catalog / v2: `CRITICAL`. | v2. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e2:outreach:orchestrator-dispatch")` (L100) + strat `createWorker` (`factory.ts` L90–107). | Span v2. | Posibil span dublu imbricat dacă ambele straturi active. |
| 7 | Înveliș politică | Filtre `requiresHumanReview` / `isHumanControlled`; DNC pe `gold_companies`. | v2 tier 2 + HITL — destinație v2. | Fără Cedar/OPA în acest fișier. |
| 8 | Rutare model (dacă AI) | N/A | v2 declară LLM — neimplementat în handler. | N/A |
| 9 | Guardrails | Reguli SQL + skip DNC. | ADR-0007 — destinație. | — |
| 10 | Escaladare HITL | Exclude lead-uri cu `requiresHumanReview`. | v2 HITL. | Nu enfilează cozi `human:*` aici. |
| 11 | Micro-OODA | OBSERVE: query eligibili; ORIENT: DNC set; DECIDE: loop enqueue; ACT: `phoneAllocatorQueue.add`. | v2 OODA + FlowProducer — cod fără FlowProducer. | v2 menționează DAG; BullMQ simplu. |
| 12 | Tier + de-escaladare | Eșecuri DB/BullMQ → excepții BullMQ. | v2 trigger-e încredere — fără în cod. | — |
| 13 | Stack | BullMQ, Postgres (`@cerniq/db`), metrici `outreachDispatched`. | v2 §2.3. | Teste: doar export, fără integrare DB. |

### Mapare OTel

- **v2:** `cognitive.e2.outreach.orchestrator-dispatch`.
- **Cod:** `withCognitiveSpan("e2:outreach:orchestrator-dispatch")` — **aliniat** la nume catalog/nodeKey; atribute `cognitive.nodeKey` etc. prin `withCognitiveSpan` / fabrică (vezi `cognitive-helpers.ts`).

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
