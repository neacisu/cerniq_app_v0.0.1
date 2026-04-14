<!-- neuron-contract:author-complete -->

# Neuron `report:conversion:analyze`

> **Status:** audit manual **2026-04-11**. **v2** plasează neuronul în E3 / familie `ops`, tip `AutonomicNeuron`, Non-AI, Tier 4, span `cognitive.report.conversion.analyze`. **Repo:** nu există intrare în `cognitive-node-catalog.ts` pentru acest `v2_queue`, nu apare literal `report:conversion:analyze` în `queue-registry.ts`, iar căutarea în `workers/` și `apps/` (fișiere `.ts`) nu găsește coadă/handler — **gap runtime** la data auditului.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `report:conversion:analyze` |
| etapa | E3 |
| familie (v2) | `ops` |
| contract_path | `contracts/neurons/E3/report--conversion--analyze.md` |
| ADR familie (indicativ) | [ops](../../adr/families/e3/ops.md) |

## Scop în context real

**v2** (L5414–5434): neuron în subgraful `ops` din E3 — analiză conversie (raportare), tip `AutonomicNeuron`, **MEDIUM**, Tier 4, procesare deterministă (Non-AI), ciclu OODA declarat ca mentenanță declanșată (cron → verificare stare → execuție task fundal). **Contract evidence status** în v2: *graph-export-grounded + architecture-enhanced*; coada *not yet reconciled with runtime registry*. **Repo la 2026-04-11:** nu s-a identificat `Worker`/`Queue`/`add` pentru `report:conversion:analyze`; ADR familie `ops` grupează cozi ops fără potrivire în registry pentru exemple similare. Comportament operațional pentru acest `queueName` rămâne **neimplementat sau neconectat** în codul citit.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`report:conversion:analyze\`` (L5414–5434).
- `docs/CognitiveBrain/adr/families/e3/ops.md` — observații registry pentru familia ops.
- `packages/shared/src/cognitive-node-catalog.ts` — căutare `report:conversion:analyze`: **fără** potrivire (doar alte chei `report:*`, ex. `feedback:report:generate`).
- `workers/shared/src/queue-registry.ts` — **fără** literal `report:conversion:analyze` (singura potrivire `report` verificată: `feedback:report:generate`).
- `workers/`, `apps/` — `rg` pentru `report:conversion:analyze` în `*.ts`: **0** rezultate.
- `docs/CognitiveBrain/NEURON_MATRIX.csv` — rând `report:conversion:analyze`; `queue_in_registry` = `no`.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 «Non-AI neuron — deterministic processing» (L5430); fără LLM de mapat în cod la acest neuron.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap:** fără `nodeKey` în catalog pentru `report:conversion:analyze`; fără constantă coadă în `queue-registry.ts` la audit. | v2 **Confirmed queue field** `report:conversion:analyze` (L5428). | v2 §2.4 — aliniere catalog/registry viitoare. |
| 2 | Etapă, familie, swimlane | **Neconectat:** nu există în cod intrare de catalog care să fixeze swimlane; matricea listează E3 / ops. | E3; familie `ops`; swimlane `ops` în metrică Prometheus din v2 (L5432). | — |
| 3 | Rol declarat | **Lipsă handler:** nu s-a găsit fișier worker care să implementeze analiza de conversie sub această coadă. | Scop operațional/cognitiv + analogie autonomică (v2 L5425–5427). | — |
| 4 | NeuronType + SOFAI | **Neconectat:** fără `NeuronType` din catalog pentru această coadă. | v2 `AutonomicNeuron` → System1 (reactiv) conform clasificării SOFAI din v2 §2.1. | — |
| 5 | Criticitate | **Neconectat** în cod. | `MEDIUM` (v2 L5423). | — |
| 6 | Înveliș telemetrie | **Lipsă:** fără `withCognitiveSpan` / worker pentru coadă; nu se poate confirma maparea la atribute reale. | OTel span v2: `cognitive.report.conversion.analyze` (L5433). | Doar destinație documentată până la implementare. |
| 7 | Înveliș politică | **Lipsă** metadata job / praguri în cod pentru acest neuron. | Tier 4 (L5424); «No mandatory HITL. Audit log 90 days.» (L5431). | Cedar/OPA: destinație ADR-0007. |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI (L5430). | — |
| 9 | Guardrails | **Lipsă** implementare specifică în repo pentru acest queue. | NeMo / determinist — destinație ADR-0007. | — |
| 10 | Escaladare HITL | **Lipsă** legătură runtime pentru această coadă. | v2 fără HITL obligatoriu pentru acest bloc (L5431). | ADR-0008 motor transversal. |
| 11 | Micro-OODA | **Lipsă** cod care să materializeze OODA pentru această coadă. | OBSERVE/ORIENT/DECIDE/ACT (v2 L5429). | Neo4j GraphRAG în ORIENT: destinație v2/ADR dacă se extinde. |
| 12 | Tier + de-escaladare | **Lipsă** invarianți în cod (încredere, 2σ, etc.). | Tier 4 (v2 L5424). | — |
| 13 | Stack v2 §2.3 (subset) | **Neaplicabil operațional** până la worker: BullMQ — destinație pentru cozi job. | v2 §2.3 + ADR-uri stack. | Fără versiuni runtime deduse din acest neuron. |

### Mapare OTel

- **v2 / plan:** `cognitive.report.conversion.analyze`; convenții ADR pot menționa `cognitive.neuron.*` / `cognitive.processing.stage`.
- **Cod:** `withCognitiveSpan` — `cognitive.nodeKey`, `cognitive.neuronType`, `cognitive.swimlane`, `cognitive.etapa`, `cognitive.function` (`workers/shared/src/cognitive-helpers.ts`).
- **Stare la 2026-04-11:** **doar destinație documentată** — fără dovadă de worker/span pentru `report:conversion:analyze` în repo.

---
*Generator inițial:* înlocuit prin audit manual.
