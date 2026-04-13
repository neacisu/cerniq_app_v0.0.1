<!-- neuron-contract:author-complete -->

# Neuron `ai:agent:generate`

> **Status:** audit manual **2026-04-11**. **`ai:agent:generate`** nu apare în `processors` din `workers/e3-ai-sales/src/main.ts`, nici ca intrare dedicată în `queue-registry.ts` la acest audit. **Nu s-a găsit** `nodeKey` / pereche coadă în `cognitive-node-catalog.ts` pentru acest literal (doar `e3:ai:agent-orchestrate` pentru orchestrare).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `ai:agent:generate` |
| etapa | E3 |
| familie (v2) | `ai-core` |
| contract_path | `contracts/neurons/E3/ai--agent--generate.md` |
| ADR familie (indicativ) | [ai-core](../../adr/families/e3/ai-core.md) |

## Scop în context real

**v2:** DeliberativeNeuron, planificare și generare comercială, coadă confirmată `ai:agent:generate`, rutare LLM (QwQ / SGLang în textul v2). **Repo (E3):** fluxul agent implementat este **`ai:context:build` → `ai:agent:orchestrate` → `ai:e3:response:generate`** (`main.ts` L187–192), fără pas separat înregistrat sub numele **`ai:agent:generate`**. Funcția de „generare” comercială este acoperită practic de **C14 orchestrate** + **C15 response generate** (coadă diferită de v2). Acest contract documentează **gap-ul de denumire / mapare** față de v2, nu o implementare cu acest `queueName`.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`ai:agent:generate\`` (L4434–4454).
- `workers/e3-ai-sales/src/main.ts` — map `processors` (L171–192), absență cheie `ai:agent:generate`.
- `workers/shared/src/queue-registry.ts` — căutare cozi `ai:agent:*` (doar `E3_AI_AGENT_ORCHESTRATE` găsită la audit).
- `packages/shared/src/cognitive-node-catalog.ts` — L1620–1621 (`agent-orchestrate` only).
- `workers/e3-ai-sales/src/workers/c14-ai-agent-orchestrate.ts`, `c15-ai-response-generate.ts` — flux efectiv de generare/orchestrare.

## Instanțe v2

- **Evidence status v2:** graph-export-grounded — aliniere runtime **neîncheiată** pentru acest antet.

## N/A pe criterii

- **Rând 8:** **N/A** la nivel de handler dedicat `ai:agent:generate` — nu există cod pentru această coadă; rutarea LLM apare în C14/C15.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** catalog + registry pentru `ai:agent:generate`. | v2 queue `ai:agent:generate`. | Implementare sub alte nume (C14/C15). |
| 2 | Etapă, familie, swimlane | — | v2 E3 `ai-core`. | — |
| 3 | Rol declarat | — | v2 planificare + generare. | Comportament mapat conceptual la C14+C15. |
| 4 | NeuronType + SOFAI | — | v2 DeliberativeNeuron. | — |
| 5 | Criticitate | — | v2 HIGH. | — |
| 6 | Înveliș telemetrie | — | v2 `cognitive.ai.agent.generate`. | Fără worker cu acest queueName. |
| 7 | Înveliș politică | — | v2 Tier 3, HITL. | — |
| 8 | Rutare model (dacă AI) | N/A pentru coada v2 izolată | v2 QwQ / SGLang. | Vezi `reasoningChat` în C14. |
| 9 | Guardrails | — | v2. | C14: `e3ScanPromptBeforeLlm` / `e3ScanOutputAfterLlm`. |
| 10 | Escaladare HITL | — | v2. | Alte cozi `human:*` în același worker binary. |
| 11 | Micro-OODA | — | v2 OODA. | — |
| 12 | Tier + de-escaladare | — | v2. | — |
| 13 | Stack | Worker binary E3: BullMQ, `reasoningChat`, guards (`e3-llm-guard.js`). | v2 §2.3. | **Limită:** fără handler `ai:agent:generate` explicit. |

### Mapare OTel

- **v2:** `cognitive.ai.agent.generate`.
- **Cod:** **fără** mapare 1:1; telemetrie pe cozile reale (`ai:agent:orchestrate`, `ai:e3:response:generate`) — stadiu **migrare / alias** recomandat.

---
*Generator inițial:* înlocuit prin audit manual.
