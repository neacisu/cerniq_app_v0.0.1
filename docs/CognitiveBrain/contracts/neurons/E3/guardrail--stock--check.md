<!-- neuron-contract:author-complete -->

# Neuron `guardrail:stock:check`

> **Status:** audit manual **2026-04-11**. **M72** — `runStockCheck`: detectează afirmații pozitive despre stoc în răspunsul AI și le compară cu `get_available_stock` (logică în `guardrails.ts`); la inconsistență → `guardrail_violations` **CRITICAL**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `guardrail:stock:check` |
| etapa | E3 |
| familie (v2) | `guardrails` |
| contract_path | `contracts/neurons/E3/guardrail--stock--check.md` |
| ADR familie (indicativ) | [guardrails](../../adr/families/e3/guardrails.md) |

## Scop în context real

**v2** (L5116–5139): **GuardrailNeuron**, blocare confirmare dacă stoc disponibil < cantitate cerută (L5130–5131). **Repo:** `m72-guardrail-stock-check.ts` — `runStockCheck` (`m72` L36–37), pattern «avem stoc» vs disponibil 0 în antet (`m72` L5–9); violare stock (`m72` L39–47). **Înregistrare:** `main.ts` L264. **Registry:** `E3_GUARDRAIL_STOCK_CHECK` (`queue-registry.ts` L337). **Teste:** `m-workers.test.ts` M72 (L168+); `guardrails.test.ts` stock.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L5116–5139.
- `packages/shared/src/cognitive-node-catalog.ts` — L2161–2168.
- `workers/shared/src/queue-registry.ts` — L337.
- `workers/e3-ai-sales/src/main.ts` — L264.
- `workers/e3-ai-sales/src/workers/m72-guardrail-stock-check.ts`.
- `workers/e3-ai-sales/src/lib/guardrails.ts` — `runStockCheck`.
- `workers/e3-ai-sales/src/__tests__/m-workers.test.ts`, `guardrails.test.ts`.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L5135).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e3:guardrail:stock-check`**, **`guardrail:stock:check`** (`cognitive-node-catalog.ts` L2162–2163). | v2 (L5133). | — |
| 2 | Etapă, familie, swimlane | E3; **`ai-reasoning`** (`cognitive-node-catalog.ts` L2166). | v2 (L5119–5126). | — |
| 3 | Rol declarat | NLP ușor (keywords) + stoc DB (`m72` L5–9, L36–37). | v2 cantitate cerută vs disponibil (L5130–5131). | Detaliu complet al regulilor în `runStockCheck` — vezi `guardrails.ts`. |
| 4 | NeuronType + SOFAI | **`GuardrailNeuron`** (`cognitive-node-catalog.ts` L2165). | v2 (L5124). | — |
| 5 | Criticitate | **`CRITICAL`** (`cognitive-node-catalog.ts` L2168). | v2 (L5127). | — |
| 6 | Înveliș telemetrie | `createWorker` + `withCognitiveSpan`. | v2 `cognitive.e3.guardrail.stock-check` (L5138). | **Parțial aliniat**. |
| 7 | Înveliș politică | Violare CRITICAL (`m72` L41–47). | v2 Tier 2 + HITL (L5128, L5136). | — |
| 8 | Rutare model (dacă AI) | **N/A**. | v2 Non-AI. | — |
| 9 | Guardrails | Determinist, fără NeMo în worker (`m72`; `guardrails.ts`). | v2 NeMo în OODA (L5134). | — |
| 10 | Escaladare HITL | Nu în M72. | Flow N76 / C16. | — |
| 11 | Micro-OODA | OBSERVE — răspuns; ORIENT — `runStockCheck`; ACT — persist (`m72` L30–58). | v2 gate (L5134). | — |
| 12 | Tier + de-escaladare | Fără în M72. | v2 Tier 2 (L5128). | — |
| 13 | Stack (subset) | BullMQ, Drizzle. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.e3.guardrail.stock-check`.
- **Cod:** `cognitive.nodeKey` **`e3:guardrail:stock-check`** — **parțial aliniat**.

---
*Generator inițial:* înlocuit prin audit manual.
