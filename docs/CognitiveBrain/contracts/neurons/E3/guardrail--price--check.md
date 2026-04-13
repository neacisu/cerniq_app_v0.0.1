<!-- neuron-contract:author-complete -->

# Neuron `guardrail:price:check`

> **Status:** audit manual **2026-04-11**. **M71** — extrage prețuri din text AI (`extractPrices` / `runPriceCheck`), compară cu `gold_products` pentru itemii negocierii, toleranță implicită **2%** (`tolerancePercent` default în job); la fail **CRITICAL** + `guardrail_violations`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `guardrail:price:check` |
| etapa | E3 |
| familie (v2) | `guardrails` |
| contract_path | `contracts/neurons/E3/guardrail--price--check.md` |
| ADR familie (indicativ) | [guardrails](../../adr/families/e3/guardrails.md) |

## Scop în context real

**v2** (L5091–5114): **GuardrailNeuron**, preț vs cost ×1.05 / marjă minimă (L5105–5106). **Repo:** `m71-guardrail-price-check.ts` — `runPriceCheck` cu `tolerancePercent` default **2** (`m71` L27–38, L45–46); violare → `persistGuardrailViolation` severity CRITICAL (`m71` L48–57). Detalii numerice în `guardrails.ts` (`runPriceCheck`). **Înregistrare:** `main.ts` L263. **Registry:** `E3_GUARDRAIL_PRICE_CHECK` (`queue-registry.ts` L336). **Teste:** `m-workers.test.ts` M71 (L64+); `guardrails.test.ts`.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L5091–5114.
- `packages/shared/src/cognitive-node-catalog.ts` — L2152–2159.
- `workers/shared/src/queue-registry.ts` — L336.
- `workers/e3-ai-sales/src/main.ts` — L263.
- `workers/e3-ai-sales/src/workers/m71-guardrail-price-check.ts`.
- `workers/e3-ai-sales/src/lib/guardrails.ts` — `runPriceCheck`, `extractPrices`.
- `workers/e3-ai-sales/src/__tests__/m-workers.test.ts`, `guardrails.test.ts`.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L5110).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e3:guardrail:price-check`**, **`guardrail:price:check`** (`cognitive-node-catalog.ts` L2153–2154). | v2 (L5108). | — |
| 2 | Etapă, familie, swimlane | E3; **`ai-reasoning`** (`cognitive-node-catalog.ts` L2157). | v2 (L5094–5101). | — |
| 3 | Rol declarat | Verificare prețuri menționate vs catalog (`m71` L4–9, L45–46). | v2 cost × 1.05 (L5105–5106). | Alinierea exactă la «cost × 1.05» = în `runPriceCheck` (citire suplimentară pentru o singură formulă). |
| 4 | NeuronType + SOFAI | **`GuardrailNeuron`** (`cognitive-node-catalog.ts` L2156). | v2 (L5099). | — |
| 5 | Criticitate | **`CRITICAL`** (`cognitive-node-catalog.ts` L2159). | v2 (L5102). | — |
| 6 | Înveliș telemetrie | `createWorker` + `withCognitiveSpan`. | v2 `cognitive.e3.guardrail.price-check` (L5113). | **Parțial aliniat**. |
| 7 | Înveliș politică | Violare CRITICAL (`m71` L50–56). | v2 Tier 2 + HITL (L5103, L5111). | — |
| 8 | Rutare model (dacă AI) | **N/A**. | v2 Non-AI. | — |
| 9 | Guardrails | Regex preț + DB (`guardrails.ts` L49–92 + `runPriceCheck`). | v2 NeMo în OODA (L5109). | NeMo **nu** în `runPriceCheck` — doar determinist. |
| 10 | Escaladare HITL | Nu în M71. | Flow global C16/N76 (`guardrails.ts` L11–12). | — |
| 11 | Micro-OODA | OBSERVE — `response`; ORIENT — `runPriceCheck`; DECIDE — pass/fail; ACT — persist (`m71` L33–67). | v2 gate downstream (L5109). | — |
| 12 | Tier + de-escaladare | Fără în M71. | v2 Tier 2 (L5103). | — |
| 13 | Stack (subset) | BullMQ, Drizzle, regex. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.e3.guardrail.price-check`.
- **Cod:** `cognitive.nodeKey` **`e3:guardrail:price-check`** — **parțial aliniat**.

---
*Generator inițial:* înlocuit prin audit manual.
