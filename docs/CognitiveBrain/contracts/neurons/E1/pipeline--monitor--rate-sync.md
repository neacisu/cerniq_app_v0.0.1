<!-- neuron-contract:author-complete -->

# Neuron `pipeline:monitor:rate-sync`

> **Status:** audit manual **2026-04-11**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `pipeline:monitor:rate-sync` |
| etapa | E1 |
| familie (v2, prima instanță) | `monitor` |
| contract_path | `contracts/neurons/E1/pipeline--monitor--rate-sync.md` |
| ADR familie (indicativ) | [monitor](../../adr/families/e1/monitor.md) |

## Scop în context real

**v2** descrie **`pipeline:monitor:rate-sync`** ca neuron de monitorizare (AttentionNeuron, HIGH) distinct de **`pipeline:monitor:health`**. **În cod**, ambele sunt implementate în același job **`pipeline:monitor`** / span **`e1:pipeline:monitor`** (`p3-pipeline-monitor.ts`). Partea **rate/backlog**: după remedierea entităților blocate, workerul iterează **`queueRegistry`**, citește `getJobCounts` per coadă și actualizează gauge Prometheus **`queueDepth`** (waiting+delayed+paused) (~L132–159). **Concluzie:** «rate-sync» v2 nu are coadă sau span propriu; este **o secțiune** a monitorului unic.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`pipeline:monitor:rate-sync\`` (~L2853–2873).
- `packages/shared/src/cognitive-node-catalog.ts` — `e1:pipeline:monitor` / `pipeline:monitor` (~L925–932).
- `workers/shared/src/queue-registry.ts` — `PIPELINE_MONITOR`, `queueRegistry` consumat indirect.
- `workers/enrichment/src/workers/p3-pipeline-monitor.ts` — bucla `queueRegistry` + `queueDepth.set` (~L132–159).
- `rg` `pipeline:monitor:rate-sync` în `*.ts`: **fără** literal.

## Instanțe v2

- **OTel (v2):** `cognitive.pipeline.monitor.rate-sync`

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** literal `pipeline:monitor:rate-sync`. **Runtime:** `e1:pipeline:monitor`. | v2 canonic. | Sub-neuron fără `nodeKey` separat. |
| 2 | Etapă, familie, swimlane | E1; `pipeline-control` în catalog. | v2 monitor. | — |
| 3 | Rol declarat | Sincronizare observabilitate adâncime cozi înregistrate în registry. | v2 rate-sync. | Împărțit fișier cu health. |
| 4 | NeuronType + SOFAI | `AttentionNeuron` (catalog + v2). | v2. | — |
| 5 | Criticitate | `HIGH` (v2 + catalog). | v2. | — |
| 6 | Înveliș telemetrie | Același span `cognitive:e1:pipeline:monitor`; **fără** `cognitive.pipeline.monitor.rate-sync`. | ADR-0003. | — |
| 7 | Înveliș politică | Folosește config registry; fără OPA în eșantion. | v2 Tier 3. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | `Promise.allSettled` — eșecuri per-coadă nu opresc tot eșantionul (~L133–147). | ADR-0007. | — |
| 10 | Escaladare HITL | **Nu** în secțiunea rate-sync; HITL în aceeași rulare pentru SLA (contract health). | ADR-0008. | — |
| 11 | Micro-OODA | OBSERVE: cozi registry; ORIENT: agregare waiting; ACT: metrici. | v2 OODA. | — |
| 12 | Tier + de-escaladare | N/A prag LLM; eșantionare periodică din job. | v2. | — |
| 13 | Stack | BullMQ `getJobCounts`, Prometheus `queueDepth`, `queueRegistry`. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.pipeline.monitor.rate-sync`.
- **Cod:** **lipsă** span dedicat; acoperit de `cognitive:e1:pipeline:monitor`.
- **Stare:** **logic v2 separat**, **telemetrie unificată**.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
