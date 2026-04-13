<!-- neuron-contract:author-complete -->

# Neuron `guardrail:discount:check`

> **Status:** audit manual **2026-04-11**. **M73** — verificare deterministă discount extras din text AI vs `gold.get_max_discount` și marjă netă minimă **8%** (`MIN_MARGIN_PERCENT` în `guardrails.ts`); la eșec persistă `guardrail_violations` cu severitate **CRITICAL**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `guardrail:discount:check` |
| etapa | E3 |
| familie (v2) | `guardrails` |
| contract_path | `contracts/neurons/E3/guardrail--discount--check.md` |
| ADR familie (indicativ) | [guardrails](../../adr/families/e3/guardrails.md) |

## Scop în context real

**v2** (L5044–5067): **GuardrailNeuron**, **CRITICAL**, discount deterministic, praguri declarative **>50% blocare / >30% escaladare director** (L5058–5059). **Repo:** `m73-guardrail-discount-check.ts` — `runDiscountCheck` + `persistGuardrailViolation` la fail (`m73` L39–51); fără NeMo în acest fișier. **Logică:** `guardrails.ts` `runDiscountCheck` (L354+) — SQL `gold.get_max_discount` (L388), marjă netă vs `MIN_MARGIN_PERCENT` **8** (L326–340). **Înregistrare:** `main.ts` L265. **Registry:** `E3_GUARDRAIL_DISCOUNT_CHECK` (`queue-registry.ts` L338). **Teste:** `m-workers.test.ts` M73 (L217+); `guardrails.test.ts` discount.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L5044–5067.
- `packages/shared/src/cognitive-node-catalog.ts` — L2170–2177.
- `workers/shared/src/queue-registry.ts` — L338.
- `workers/e3-ai-sales/src/main.ts` — L265.
- `workers/e3-ai-sales/src/workers/m73-guardrail-discount-check.ts`.
- `workers/e3-ai-sales/src/lib/guardrails.ts` — `MIN_MARGIN_PERCENT`, `runDiscountCheck`.
- `workers/e3-ai-sales/src/__tests__/m-workers.test.ts`, `guardrails.test.ts`.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L5063); M73 fără LLM.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e3:guardrail:discount-check`**, **`guardrail:discount:check`** (`cognitive-node-catalog.ts` L2171–2172). | v2 (L5061). | — |
| 2 | Etapă, familie, swimlane | E3; **`ai-reasoning`** (`cognitive-node-catalog.ts` L2175). | v2 guardrails / ai-reasoning (L5047–5055). | — |
| 3 | Rol declarat | Parsare discount + verificare DB + violare persistată (`m73` L4–10, L42–51; `guardrails.ts` L354+). | v2: praguri 50%/30% (L5058–5059). | **Divergență:** implementarea folosește **max discount per produs** + marjă **8%**, nu pragurile fixe 50/30 din v2. |
| 4 | NeuronType + SOFAI | **`GuardrailNeuron`** (`cognitive-node-catalog.ts` L2174). | v2 GuardrailNeuron (L5052). | — |
| 5 | Criticitate | **`CRITICAL`** (`cognitive-node-catalog.ts` L2177). | v2 CRITICAL (L5055). | — |
| 6 | Înveliș telemetrie | `createWorker` + `withCognitiveSpan`. | v2 `cognitive.e3.guardrail.discount-check` (L5066). | **Parțial aliniat**. |
| 7 | Înveliș politică | Severitate CRITICAL la violare (`m73` L50–51). | v2 Tier 2, HITL acțiuni ireversibile (L5056, L5064). | Legătura explicită HITL în M73 lipsește; flux C16/C18/N76 în alte fișiere. |
| 8 | Rutare model (dacă AI) | **N/A**. | v2 Non-AI. | — |
| 9 | Guardrails | Regex discount + SQL + marjă (`guardrails.ts` L95–119, L326–340, L354+). | v2 menționează NeMo în OODA (L5062). | NeMo **nu** apare în `runDiscountCheck`; doar verificări deterministe. |
| 10 | Escaladare HITL | Nu direct în M73. | ADR-0008; `guardrails.ts` antet L11–12 (flow3x → N76). | — |
| 11 | Micro-OODA | OBSERVE — răspuns AI; ORIENT — `runDiscountCheck`; DECIDE — pass/fail; ACT — persist + return (`m73` L31–61). | v2 intercept + gate (L5062). | — |
| 12 | Tier + de-escaladare | Fără prag «confidence» în M73. | v2 Tier 2 (L5056). | — |
| 13 | Stack (subset) | BullMQ, Drizzle, SQL `gold.get_max_discount`. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.e3.guardrail.discount-check`.
- **Cod:** `cognitive.nodeKey` **`e3:guardrail:discount-check`** — **parțial aliniat**.

---
*Generator inițial:* înlocuit prin audit manual.
