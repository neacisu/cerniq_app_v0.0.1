<!-- neuron-contract:author-complete -->

# Neuron `ai:tool:execute`

> **Status:** audit manual **2026-04-11**. **Gap runtime:** nu există `ai:tool:execute` în `queue-registry.ts`, în `cognitive-node-catalog.ts` sau în `main.ts` (`rg` pe cod). Execuția tool-urilor din conversație este tratată în **C14** prin parsarea `<tool_call>` și fluxul ulterior (ex. C15+), nu ca worker separat cu această coadă.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `ai:tool:execute` |
| etapa | E3 |
| familie (v2) | `ai-core` |
| contract_path | `contracts/neurons/E3/ai--tool--execute.md` |
| ADR familie (indicativ) | [ai-core](../../adr/families/e3/ai-core.md) |

## Scop în context real

**v2** (L4600–4620) definește `Confirmed queue field` **`ai:tool:execute`**, neuron **technology** / **DeliberativeNeuron** inferat, cu OODA+LLM și metrici; **evidence status:** graph-export, *not yet reconciled with runtime registry*. **Repo:** fără înregistrare la audit. **`c14-ai-agent-orchestrate.ts`** extrage apeluri de tool din ieșirea modelului (pattern `<tool_call>`), dar **nu** enfilează un job `ai:tool:execute` — deci funcția „execuție tool” din v2 **nu** are echivalent 1:1 ca neuron de coadă. Documentația `etapa3-workers-C-ai-agent-core.md` poate menționa un worker istoric; nu constituie dovadă că binarul curent `e3-ai-sales` expune coada `ai:tool:execute`.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`ai:tool:execute\`` (L4600–4620).
- `packages/shared/src/cognitive-node-catalog.ts` — `tool:execute` / `ai:tool:execute`: **fără potrivire**.
- `workers/shared/src/queue-registry.ts` — **fără potrivire**.
- `workers/e3-ai-sales/src/main.ts` — **fără** cheie `ai:tool:execute` în `processors`.
- `workers/e3-ai-sales/src/workers/c14-ai-agent-orchestrate.ts` — `TOOL_CALL_REGEX`, parsare `<tool_call>` (ex. L40, L141).
- `rg` workspace (`tool:execute`, `ai:tool:execute`): doar documentație / matrice / plan v2.

## Instanțe v2

- —

## N/A pe criterii

- —

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Lipsă** catalog + registry pentru `ai:tool:execute`. | v2: coadă confirmată `ai:tool:execute`. | v2 §2.4. |
| 2 | Etapă, familie, swimlane | — | v2: E3, ai-core; swimlane `ai-core` în metrici. | — |
| 3 | Rol declarat | Parsare `<tool_call>` în C14 (`c14-ai-agent-orchestrate.ts` L40, L141); **fără** coadă `ai:tool:execute`. | v2: execuție tool ca neuron separat. | Granularitate v2 vs refactor C13–C18. |
| 4 | NeuronType + SOFAI | — | v2: DeliberativeNeuron inferat. | — |
| 5 | Criticitate | — | v2: HIGH inferat. | — |
| 6 | Înveliș telemetrie | — | v2: `cognitive.ai.tool.execute`. | Fără handler — fără span dedicat. |
| 7 | Înveliș politică | — | v2: Tier 3. | — |
| 8 | Rutare model (dacă AI) | — | v2: QwQ / SGLang. | LLM în C14, nu în coadă `ai:tool:execute`. |
| 9 | Guardrails | — | ADR-0007. | Guard C14 separat. |
| 10 | Escaladare HITL | — | ADR-0008. | — |
| 11 | Micro-OODA | — | v2 OODA complet pe acest neuron. | Implementare: flux distribuit pe mai multe cozi `ai:*`. |
| 12 | Tier + de-escaladare | — | v2 Tier 3. | — |
| 13 | Stack (subset) | — | v2 §2.3. | Fără coadă BullMQ pentru acest nume. |

### Mapare OTel

- **v2:** `cognitive.ai.tool.execute`.
- **Cod:** **gap** — la introducere worker: mapare `cognitive.nodeKey` + fabrică (`factory.ts`).

---
*Generator inițial:* înlocuit prin audit manual.
