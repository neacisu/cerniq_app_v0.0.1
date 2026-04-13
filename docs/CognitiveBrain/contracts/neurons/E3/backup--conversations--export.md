<!-- neuron-contract:author-complete -->

# Neuron `backup:conversations:export`

> **Status:** audit manual **2026-04-11**. **v2** plasează neuronul în E3 / familie `ops`, tip `AutonomicNeuron`, Non-AI, Tier 4, span `cognitive.backup.conversations.export`. **Repo:** nu există intrare în `cognitive-node-catalog.ts`, nu apare literal `backup:conversations:export` în `queue-registry.ts`, iar căutarea în `workers/` și `apps/` nu găsește coadă/handler — **gap runtime** la data auditului.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `backup:conversations:export` |
| etapa | E3 |
| familie (v2) | `ops` |
| contract_path | `contracts/neurons/E3/backup--conversations--export.md` |
| ADR familie (indicativ) | [ops](../../adr/families/e3/ops.md) |

## Scop în context real

**v2** (L5304–5324): neuron operațional în subgraful `ops` din E3 — export de backup al conversațiilor, tip `AutonomicNeuron`, **MEDIUM**, Tier 4, procesare deterministă (Non-AI), ciclu OODA declarat ca mentenanță declanșată (cron → verificare stare → execuție task fundal). **Contract evidence status** în v2: *graph-export-grounded + architecture-enhanced*; coada *not yet reconciled with runtime registry*. **Repo la 2026-04-11:** nu s-a identificat `Worker`/`Queue`/`add` pentru `backup:conversations:export`; ADR familie `ops` notează deja lipsa potrivirilor în registry pentru această coadă exemplificativă. Comportament operațional în producție pentru acest `queueName` rămâne **neimplementat sau neconectat** în codul citit.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`backup:conversations:export\`` (L5304–5324).
- `docs/CognitiveBrain/adr/families/e3/ops.md` — observație registry pentru cozi ops exemplu.
- `packages/shared/src/cognitive-node-catalog.ts` — căutare `backup` / `conversations` / `export` în context coadă: **fără** potrivire pentru acest `v2_queue`.
- `workers/shared/src/queue-registry.ts` — **fără** literal `backup:conversations:export`.
- `workers/`, `apps/` — `rg` pentru `backup:conversations:export` / `conversations:export`: **0** rezultate.
- `docs/CognitiveBrain/NEURON_MATRIX.csv` — rând `backup:conversations:export` (v2_line 5303); `queue_in_registry` = `no`.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 «Non-AI neuron — deterministic processing» (L5320); fără LLM de mapat în cod la acest neuron.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap:** fără `nodeKey` în catalog pentru `backup:conversations:export`; fără constantă coadă în `queue-registry.ts` la audit. | v2 **Confirmed queue field** `backup:conversations:export` (L5318). | v2 §2.4 — aliniere catalog/registry viitoare. |
| 2 | Etapă, familie, swimlane | **Neconectat:** nu există în cod intrare de catalog care să fixeze swimlane; matricea listează E3 / ops. | E3; familie `ops`; swimlane `ops` în metrică Prometheus din v2 (L5322). | — |
| 3 | Rol declarat | **Lipsă handler:** nu s-a găsit fișier worker care să implementeze exportul de conversații sub această coadă. | Scop operațional/cognitiv generic ops + analogie autonomică (v2 L5312–5317). | — |
| 4 | NeuronType + SOFAI | **Neconectat:** fără `NeuronType` din catalog pentru această coadă. | v2 `AutonomicNeuron` → System1 (reactiv) conform clasificării SOFAI din v2 §2.1. | — |
| 5 | Criticitate | **Neconectat** în cod. | `MEDIUM` (v2 L5313). | — |
| 6 | Înveliș telemetrie | **Lipsă:** fără `withCognitiveSpan` / worker pentru coadă; nu se poate confirma maparea la atribute reale. | OTel span v2: `cognitive.backup.conversations.export` (L5323). | Doar țintă până la implementare. |
| 7 | Înveliș politică | **Lipsă** metadata job / praguri în cod pentru acest neuron. | Tier 4 (L5314); «No mandatory HITL. Audit log 90 days.» (L5321). | Cedar/OPA:țintă ADR-0007. |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI (L5320). | — |
| 9 | Guardrails | **Lipsă** implementare specifică în repo pentru acest queue. | NeMo / determinist — țintă ADR-0007. | — |
| 10 | Escaladare HITL | **Lipsă** legătură runtime; sinapse v2 către `human:*` există în documentația graf (contracte synapse), nu în cod auditat pentru coadă. | v2 fără HITL obligatoriu pentru acest bloc (L5321). | ADR-0008 motor transversal. |
| 11 | Micro-OODA | **Lipsă** cod care să materializeze OODA pentru această coadă. | OBSERVE/ORIENT/DECIDE/ACT (v2 L5319). | Neo4j GraphRAG în ORIENT: țintă v2/ADR dacă se extinde. |
| 12 | Tier + de-escaladare | **Lipsă** invarianți în cod (încredere, 2σ, etc.). | Tier 4 (v2 L5314). | — |
| 13 | Stack v2 §2.3 (subset) | **Neaplicabil operațional** până la worker: BullMQ țintă pentru cozi job. | v2 §2.3 + ADR-uri stack. | Fără versiuni runtime deduse din acest neuron. |

### Mapare OTel

- **v2 / plan:** `cognitive.backup.conversations.export`; convenții ADR pot menționa `cognitive.neuron.*` / `cognitive.processing.stage`.
- **Cod:** `withCognitiveSpan` — `cognitive.nodeKey`, `cognitive.neuronType`, `cognitive.swimlane`, `cognitive.etapa`, `cognitive.function` (`workers/shared/src/cognitive-helpers.ts`).
- **Stare la 2026-04-11:** **doar țintă** — fără dovadă de worker/span pentru `backup:conversations:export` în repo.

---
*Generator inițial:* înlocuit prin audit manual.
