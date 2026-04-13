<!-- neuron-contract:author-complete -->

# Neuron `pricing:discount:calculate`

> **Status:** audit manual **2026-04-13**. **v2** descrie rutare LLM predictivă; **cod** = **determinist SQL** (`gold.get_max_discount`), fără apel LLM — divergență documentată la rândurile 4 și 8.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `pricing:discount:calculate` |
| etapa | E3 |
| familie (v2) | `pricing` |
| contract_path | `contracts/neurons/E3/pricing--discount--calculate.md` |
| ADR familie (indicativ) | [pricing](../../adr/families/e3/pricing.md) |

## Scop în context real

**v2** (L5483–5506): `PredictiveNeuron`, calcul discount eligibil, criticitate **HIGH**, Tier 3, rutare **PRIMARY vllm-reasoning-32b** + fallback confidență. **Cod:** citește discount maxim permis prin `SELECT gold.get_max_discount(tenantId, productId)`; dacă `requestedDiscountPct` depășește maximul, aruncă eroare; altfel întoarce `maxAllowedDiscount` și opțional `approved`. Comentariu sursă: **CRITICAL DETERMINISTIC**, fără LLM. Funcția împlinește **politica de plafon discount** din SQL, nu modelul predictiv din v2.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`pricing:discount:calculate\`` (L5483–5506).
- `packages/shared/src/cognitive-node-catalog.ts` — `e3:pricing:discount-calculate` / `pricing:discount:calculate` (L1740–1748).
- `workers/shared/src/queue-registry.ts` — `E3_PRICING_DISCOUNT_CALCULATE` (L246).
- `workers/e3-ai-sales/src/main.ts` — `processors["pricing:discount:calculate"]` (L207).
- `workers/e3-ai-sales/src/workers/e27-pricing-discount-calculate.ts` — procesor (apel SQL L36–38, validare L46–61).
- `workers/e3-ai-sales/src/__tests__/e-workers.test.ts` — `describe("E27 — pricingDiscountCalculateProcessor"` (L193+).
- `workers/shared/src/factory.ts` — `wrapProcessorWithCognitiveInstrumentation` + `withCognitiveSpan` când există `tenantId` (L90–107).
- `workers/shared/src/cognitive-helpers.ts` — `tracer.startActiveSpan` cu prefix `cognitive:` + `nodeKey` (L226–234).

## Instanțe v2

- —

## N/A pe criterii

- — (rând 8: **aplicabil** — v2 prevede rutare LLM; tratat în tabel, nu N/A.)

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | `e3:pricing:discount-calculate` în catalog (L1741); registry `E3_PRICING_DISCOUNT_CALCULATE` (L246); `main.ts` (L207). | `pricing:discount:calculate` (v2 L5500). | Catalog: intrare `n(...)` L1740–1748. |
| 2 | Etapă, familie, swimlane | Catalog: etapa 3, swimlane `pricing-engine` (L1745–1746). | Idem v2 L5493, L5504. | — |
| 3 | Rol declarat | SQL `get_max_discount` + validare `requestedDiscountPct` (e27 L36–61). | Funcție cognitivă discount volum/segment/politică (v2 L5497–5499). | Implementare = plafon SQL; nu reflectă explicit „segment” în TS (logica poate fi în `gold.get_max_discount` — neexpandată în acest audit). |
| 4 | NeuronType + SOFAI | Catalog **`PredictiveNeuron`** (L1744). | v2 `PredictiveNeuron` (L5491). | **Divergență:** cod determinist, fără model predictiv — tipul din catalog rămâne, comportamentul nu e „predictiv LLM”. |
| 5 | Criticitate | Catalog **`HIGH`** (L1747). | `HIGH` (v2 L5494). | — |
| 6 | Înveliș telemetrie | Același lanț factory → `withCognitiveSpan` → `cognitive:e3:pricing:discount-calculate`. | v2 `cognitive.e3.pricing.discount-calculate` (L5505). | Denumire span puncte vs `cognitive:nodeKey`. |
| 7 | Înveliș politică | Erori la discount peste plafon → throw (e27 L47–50); fără HITL explicit în fișier. | Tier 3; HITL la anomalii confidență /2σ (v2 L5495, L5503). | Politica v2 HITL **nu** e mapată în acest procesor. |
| 8 | Rutare model (dacă AI) | **Fără LLM:** `db.execute` cu SQL `SELECT gold.get_max_discount(...)` (e27 L36–38). | PRIMARY vllm + fallback confidență < 0.80; SGLang structured output (v2 L5502). | **Divergență majoră** v2 ↔ cod la data auditului. |
| 9 | Guardrails | Plafon SQL + verificare numerică în TS. | NeMo + praguri v2 (L5503). | NeMo: **lipsă** în e27. |
| 10 | Escaladare HITL | Fără enqueue human în e27. | HITL la anomalii (v2 L5503). | — |
| 11 | Micro-OODA | Flux: setare tenant → query discount → decizie numerică. | OODA cu „compute predictive score” (v2 L5501). | „Predictive score” din v2 **nu** apare în cod TS. |
| 12 | Tier + de-escaladare | Fără prag confidență; eșec = excepție BullMQ. | Tier 3; trigger confidență (v2 L5495, L5503). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ + `@cerniq/db` / SQL. | SGLang, vLLM în v2 pentru acest neuron (L5502). | Stack LLM din v2 **neutilizat** în implementarea citită. |

### Mapare OTel

- **v2:** `cognitive.e3.pricing.discount-calculate`.
- **Cod:** `cognitive:e3:pricing:discount-calculate` + atribute catalog.
- **Stare:** instrumentare factory **da**; aliniere denumire span față de v2: ca la competitor.

---
*Generator inițial:* înlocuit prin audit manual.
