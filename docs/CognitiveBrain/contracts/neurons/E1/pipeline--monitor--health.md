<!-- neuron-contract:author-complete -->

# Neuron `pipeline:monitor:health`

> **Status:** audit manual **2026-04-11**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `pipeline:monitor:health` |
| etapa | E1 |
| familie (v2, prima instanță) | `monitor` |
| contract_path | `contracts/neurons/E1/pipeline--monitor--health.md` |
| ADR familie (indicativ) | [monitor](../../adr/families/e1/monitor.md) |

## Scop în context real

**v2** separă **`pipeline:monitor:health`** (AttentionNeuron, HIGH, Tier 3) de **`pipeline:monitor:rate-sync`**. **În runtime** există o **singură** coadă BullMQ **`pipeline:monitor`** și un procesor **`p3-pipeline-monitor.ts`** cu span **`e1:pipeline:monitor`**. Acest procesor îmbină: (1) **„sănătate” flux** — companii silver blocate în `enrichmentStatus: in_progress` >1h (re-enfilează `pipeline:orchestrate`), companii `promotionStatus: eligible` fără gold >30min (re-enfilează `pipeline:promote:gold`), task-uri approval depășite SLA + job `hitl:escalate`; (2) **eșantionare adâncime cozi** (vezi contractul `rate-sync`). **Concluzie:** `pipeline:monitor:health` este **capabilitate logică** în cadrul aceluiași worker; nu există coadă dedicată cu numele v2.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`pipeline:monitor:health\`` (~L2831–2851).
- `packages/shared/src/cognitive-node-catalog.ts` — `e1:pipeline:monitor` / `pipeline:monitor` (~L925–932).
- `workers/shared/src/queue-registry.ts` — `PIPELINE_MONITOR: "pipeline:monitor"` (~L86).
- `workers/enrichment/src/main.ts` — `"pipeline:monitor": pipelineMonitorProcessor` (~L170).
- `workers/enrichment/src/workers/p3-pipeline-monitor.ts` — `withCognitiveSpan("e1:pipeline:monitor", …)`, interogări `stalled`/`stuck`/`breachedApprovals`, cozi `pipeline:orchestrate`, `pipeline:promote:gold`, `hitl:escalate` (~L28–122).
- `rg` `pipeline:monitor:health` în `*.ts`: **fără** literal.

## Instanțe v2

- **OTel (v2):** `cognitive.pipeline.monitor.health`
- **Guardrail/HITL (v2):** HITL la eșecuri repetate (3+); SLA 4h — **verificare strictă în cod:** parțial prin escaladare SLA approval + metrică `hitlSlaBreachTotal` (~L71–130); pragul «3+ erori» **nu** apare literal în eșantionul citit.

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** literal `pipeline:monitor:health`. **Runtime:** `e1:pipeline:monitor`, coadă `pipeline:monitor`. | v2 canonic. | Două antete v2 → un worker. |
| 2 | Etapă, familie, swimlane | E1; catalog swimlane `pipeline-control`. | v2 monitor. | — |
| 3 | Rol declarat | Catalog: «Monitorizare stare pipeline E1»; cod: remediere întârzieri + SLA HITL. | v2 health / vigilență. | — |
| 4 | NeuronType + SOFAI | Catalog: `AttentionNeuron`. v2: `AttentionNeuron`. | v2. | — |
| 5 | Criticitate | Catalog: `HIGH`. v2: `HIGH`. | v2. | — |
| 6 | Înveliș telemetrie | Span `cognitive:e1:pipeline:monitor`. **Fără** span separat `cognitive.pipeline.monitor.health`. | ADR-0003. | Nealinat string v2. |
| 7 | Înveliș politică | Tier 3 în v2; praguri timp 1h/30min în cod (~L50–69). | v2. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Validare job Zod; acțiuni corrective prin re-enqueue. | ADR-0007. | — |
| 10 | Escaladare HITL | `hitl:escalate` + `hitlSlaBreachTotal` pentru approval-uri depășite (~L112–130). | ADR-0008. | — |
| 11 | Micro-OODA | OBSERVE: DB + registry cozi; ORIENT: praguri timp; DECIDE: re-orchestrate/re-promote/escalate; ACT: `add` job-uri. | v2 OODA monitor. | Partajat cu rate-sync în același fișier. |
| 12 | Tier + de-escaladare | Fără model încredere; remediere automată limitată la condițiile SQL citite. | v2 §2.2. | — |
| 13 | Stack | BullMQ multi-cozi, Postgres (`silverCompanies`, `approvalTasks`), Prometheus gauge `queueDepth`. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.pipeline.monitor.health`.
- **Cod:** `cognitive:e1:pipeline:monitor` (unic pentru ambele sub-roluri v2 health + rate-sync în implementarea actuală).
- **Stare:** **parțial aliniat** semantic; **fără** deduplicare span per sub-neuron v2.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
