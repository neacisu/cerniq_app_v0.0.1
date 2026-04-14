<!-- neuron-contract:author-complete -->

# Neuron `metrics:llm-usage:aggregate`

> **Status:** audit manual **2026-04-11**. **v2:** E3 / `ops`, `AutonomicNeuron`, agregare metrici (etichetă «llm-usage» în numele cozii), **Non-AI** la nivel de rutare model, Tier 4, span `cognitive.metrics.llm-usage.aggregate`. **Repo:** fără intrare catalog pentru `metrics:llm-usage:aggregate`, fără literal în `queue-registry.ts`, `rg` în `workers/` pentru `llm-usage` / `metrics:llm-usage:aggregate` fără potrivire — **gap runtime**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `metrics:llm-usage:aggregate` |
| etapa | E3 |
| familie (v2) | `ops` |
| contract_path | `contracts/neurons/E3/metrics--llm-usage--aggregate.md` |
| ADR familie (indicativ) | [ops](../../adr/families/e3/ops.md) |

## Scop în context real

**v2** (L5326–5346): neuron listat ca soluție în subgraful `ops` — din denumire și etichetă graf (`metrics / llm-usage / aggregate`) se înțelege **rol de destinație documentară** de agregare a utilizării LLM (metrici operaționale), nu neapărat apel LLM în handler. Tip `AutonomicNeuron`, **MEDIUM**, Tier 4, OODA generic mentenanță/cron, **Model routing: Non-AI**. **Contract evidence status:** același tip ca alți neuroni ops din export graf — *not yet reconciled with runtime registry*. **Repo la 2026-04-11:** nu există coadă BullMQ sau worker mapat explicit la `metrics:llm-usage:aggregate`; agregările LLM pot exista în alte căi (ex. observabilitate) dar **nu** sub acest `queueName` verificat.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`metrics:llm-usage:aggregate\`` (L5326–5346).
- `docs/CognitiveBrain/adr/families/e3/ops.md`.
- `packages/shared/src/cognitive-node-catalog.ts` — fără potrivire pentru `metrics:llm-usage:aggregate`.
- `workers/shared/src/queue-registry.ts` — fără literal `metrics:llm-usage:aggregate`.
- `workers/` — căutare `llm-usage`, `metrics:llm-usage:aggregate`: **0** fișiere relevante.
- `docs/CognitiveBrain/NEURON_MATRIX.csv` — rând v2_line 5325; `queue_in_registry` = `no`.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 declară «Non-AI neuron — deterministic processing» (L5342). Numele cozii evocă **obiectul** metricilor (LLM), nu rutarea unui model în handler.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap:** fără `nodeKey` catalog; fără registry. | `metrics:llm-usage:aggregate` (L5340). | v2 §2.4. |
| 2 | Etapă, familie, swimlane | **Neconectat** în cod. | E3; `ops`; swimlane `ops` (L5344). | — |
| 3 | Rol declarat | **Lipsă handler** pentru această coadă. | Scop ops + agregare metrici (inferat din etichetă graf L5331). | — |
| 4 | NeuronType + SOFAI | **Neconectat.** | `AutonomicNeuron` → System1 (v2 §2.1). | — |
| 5 | Criticitate | **Neconectat.** | `MEDIUM` (L5335). | — |
| 6 | Înveliș telemetrie | **Lipsă** worker. | Span `cognitive.metrics.llm-usage.aggregate` (L5345). | Doar destinație documentată. |
| 7 | Înveliș politică | **Lipsă** în cod. | Tier 4; audit log 90d; fără HITL obligatoriu (L5336, L5343). | ADR-0007 — destinație. |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI (L5342). | — |
| 9 | Guardrails | **Lipsă** per-neuron. | ADR-0007. | — |
| 10 | Escaladare HITL | **Lipsă** coadă. | Fără HITL obligatoriu în bloc (L5343). | ADR-0008. |
| 11 | Micro-OODA | **Lipsă** implementare. | OODA cron/maintenance (L5341). | — |
| 12 | Tier + de-escaladare | **Lipsă** cod. | Tier 4 (L5336). | — |
| 13 | Stack v2 §2.3 | **Neaplicabil** până la worker. | BullMQ — destinație pentru job queue. | — |

### Mapare OTel

- **v2:** `cognitive.metrics.llm-usage.aggregate`.
- **Cod:** `withCognitiveSpan` — atribute `cognitive.nodeKey`, etc.
- **Stare 2026-04-11:** **doar destinație documentată** — fără dovadă runtime pentru această coadă.

---
*Generator inițial:* înlocuit prin audit manual.
