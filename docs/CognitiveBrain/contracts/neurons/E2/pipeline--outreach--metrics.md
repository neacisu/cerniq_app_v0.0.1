<!-- neuron-contract:author-complete -->

# Neuron `pipeline:outreach:metrics`

> **Status:** audit manual **2026-04-11**. Worker **merge**: rutare prioritară, arhivă eveniment sau agregator health pipeline.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `pipeline:outreach:metrics` |
| etapa | E2 |
| familie (v2) | `monitoring` |
| contract_path | `contracts/neurons/E2/pipeline--outreach--metrics.md` |
| ADR familie (indicativ) | [monitoring](../../adr/families/e2/monitoring.md) |

## Scop în context real

**v2:** colectare și agregare metrici outreach. **Repo:** `createMergedPipelineMetricsWorker` (`workers/outreach/src/workers/webhooks.ts`, L573–593) pe `QUEUES.PIPELINE_OUTREACH_METRICS`: (1) dacă `job.data.targetQueue` este string → `executePriorityRouteJob` (`resilience.ts`); (2) dacă există `job.data.event` obiect → `executeEventArchiveJob` (persistență `webhook_event_archive`); (3) altfel → `executeHealthCheckAggregatorJob` (`monitoring.ts`, L363–407 — agregare statistici telefoane din `wa_phone_numbers`, log avertisment dacă `active < LOW_PHONE_ALERT_THRESHOLD` fără enfileare `ALERT_PHONE_OFFLINE`). **Limită evidență:** la audit **2026-04-11** nu s-au găsit producători BullMQ pentru această coadă în fișierele `.ts` din repo — worker în `workers/outreach/src/index.ts` (L165).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`pipeline:outreach:metrics\`` (L3717+).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:pipeline:outreach-metrics` (L1472–1480).
- `workers/shared/src/queue-registry.ts` — `PIPELINE_OUTREACH_METRICS`.
- `workers/outreach/src/workers/webhooks.ts` — `createMergedPipelineMetricsWorker`, `executeEventArchiveJob`.
- `workers/outreach/src/workers/monitoring.ts` — `executeHealthCheckAggregatorJob`.
- `workers/outreach/src/workers/resilience.ts` — `executePriorityRouteJob` (referință din webhooks).

## Instanțe v2

- **Catalog nodeKey:** `e2:pipeline:outreach-metrics`
- **OTel (v2):** `cognitive.e2.pipeline.outreach-metrics`

## N/A pe criterii

- **Rând 8:** **N/A** — non-AI în v2.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e2:pipeline:outreach-metrics`**, coadă `pipeline:outreach:metrics`. | v2. | — |
| 2 | Etapă, familie, swimlane | Catalog: etapa 2, `pipeline-control`. | v2. | — |
| 3 | Rol declarat | Triaj job-uri: rutare, arhivă webhook sau snapshot „health” telefoane. | v2: metrici outreach. | Ramura health nu scrie cozi de alertă automate (doar log). |
| 4 | NeuronType + SOFAI | Catalog: `AttentionNeuron`. | v2. | — |
| 5 | Criticitate | Catalog / v2: `MEDIUM`. | v2. | — |
| 6 | Înveliș telemetrie | `createWorker` + span condiționat. | Span v2. | — |
| 7 | Înveliș politică | Rutare + audit + citire agregată DB. | v2 tier4. | — |
| 8 | Rutare model (dacă AI) | N/A | Non-AI. | N/A |
| 9 | Guardrails | `concurrency: 10` pe worker merge. | ADR-0007 țintă. | — |
| 10 | Escaladare HITL | Nu direct. | v2. | — |
| 11 | Micro-OODA | OBSERVE formă payload; ACT una din trei căi. | v2. | — |
| 12 | Tier + de-escaladare | Health returnează obiect JSON fără throw în calea citită. | v2. | — |
| 13 | Stack | BullMQ, Postgres, modul `resilience` pentru rutare. | v2 §2.3. | **Producer neidentificat în repo (TS).** |

### Mapare OTel

- **v2:** `cognitive.e2.pipeline.outreach-metrics`.
- **Cod:** **aliniat** când `tenantId` disponibil în datele job-ului pentru instrumentare.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
