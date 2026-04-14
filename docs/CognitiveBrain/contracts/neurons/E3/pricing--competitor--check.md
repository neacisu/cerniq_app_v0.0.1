<!-- neuron-contract:author-complete -->

# Neuron `pricing:competitor:check`

> **Status:** audit manual **2026-04-11**. **v2** (E3 / `pricing`, `AttentionNeuron`, swimlane `pricing-engine`, Non-AI). **Cod:** procesor BullMQ în `workers/e3-ai-sales`; rezultat **STUB** — fără integrare concurenți; nu ajustează prețuri (comentariu sursă).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `pricing:competitor:check` |
| etapa | E3 |
| familie (v2) | `pricing` |
| contract_path | `contracts/neurons/E3/pricing--competitor--check.md` |
| ADR familie (indicativ) | [pricing](../../adr/families/e3/pricing.md) |

## Scop în context real

**v2** (L5458–5481): vigilență prețuri vs concurență, `AttentionNeuron`, criticitate **MEDIUM**, Tier 4, OODA declarat ca observare praguri și alertă. **Cod:** `pricingCompetitorCheckProcessor` numără produse active (sau ID-uri trimise), loghează mesaj STUB și întoarce `note: "competitor-check-pending"` fără date competitive (`competitive: null`). Comentariul din fișier confirmă integrarea externă *pending*. Deci scopul v2 este **destinație**; implementarea curentă este **placeholder operațional** (fără pricing concurențial real).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`pricing:competitor:check\`` (L5458–5481).
- `packages/shared/src/cognitive-node-catalog.ts` — `n("e3:pricing:competitor-check", "pricing:competitor:check", ...)` (L1785–1793).
- `workers/shared/src/queue-registry.ts` — `E3_PRICING_COMPETITOR_CHECK` (L251).
- `workers/e3-ai-sales/src/main.ts` — mapare `processors["pricing:competitor:check"]` (L212).
- `workers/e3-ai-sales/src/workers/e32-pricing-competitor-check.ts` — procesor + tipuri job/rezultat.
- `workers/e3-ai-sales/src/__tests__/e-workers.test.ts` — `describe("E32 — pricingCompetitorCheckProcessor"` (L891+).
- `workers/shared/src/factory.ts` — `wrapProcessorWithCognitiveInstrumentation` + `withCognitiveSpan` (L90–107).
- `workers/shared/src/cognitive-helpers.ts` — `tracer.startActiveSpan` cu prefix `cognitive:` + `nodeKey` (L226).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 «Non-AI neuron — deterministic processing» (L5477).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | `nodeKey` **`e3:pricing:competitor-check`** în catalog (L1786); coadă **`pricing:competitor:check`** în registry (`E3_PRICING_COMPETITOR_CHECK`, L251) și în `main.ts` (L212). | Confirmat v2 **Confirmed queue field** (L5475). | — |
| 2 | Etapă, familie, swimlane | `registerCognitiveWorkerEtapa(3)` în `main.ts` (L37); catalog: `etapa` 3, swimlane **`pricing-engine`** (L1789–1790). | E3; familie `pricing`; swimlane `pricing-engine` (v2 L5468, L5479). | — |
| 3 | Rol declarat | Procesor: enumerare `goldProducts`, fără apel competitor; return STUB (e32 L47–56). | Verificare preț concurență + analogie reticulară (v2 L5472–5474). | Comportament informativ declarat în cod ≠ ajustare automată (e32 L5–6). |
| 4 | NeuronType + SOFAI | Catalog: **`AttentionNeuron`** (L1789). | v2 `AttentionNeuron` (L5466). | Mapare explicită System1/2 pentru `AttentionNeuron`: v2 §2.1 nu detaliază în blocul citit — fără completare inventată. |
| 5 | Criticitate | Catalog **`MEDIUM`** (L1792). | `MEDIUM` (v2 L5469). | — |
| 6 | Înveliș telemetrie | Factory: pentru job cu `tenantId`, `withCognitiveSpan(nodeKey, …)` cu span **`cognitive:e3:pricing:competitor-check`** și atribute `cognitive.nodeKey`, `cognitive.neuronType`, etc. (`cognitive-helpers.ts` L226–233; `factory.ts` L98–106). Procesorul nu apelează direct `withCognitiveSpan`. | v2 OTel `cognitive.e3.pricing.competitor-check` (L5480) — convenție cu **puncte** vs **`cognitive:nodeKey` cu două puncte**. | **Migrare / aliniere denumire** span: convenții diferite; atribute reale = implementare worker-shared. |
| 7 | Înveliș politică | STUB fără Cedar/OPA sau metadata HITL în procesor. | Tier 4; HITL la eșecuri repetate, SLA 8h (v2 L5470, L5478). | Politici v2 **destinație**; lipsă cod pentru HITL specific acestui neuron. |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI (L5477). | — |
| 9 | Guardrails | Doar logică STUB + `setSessionTenantId`; fără NeMo în fișier. | NeMo / determinist — destinație ADR-0007. | — |
| 10 | Escaladare HITL | Fără enqueue `human:*` în e32. | v2 HITL la erori repetate (L5478). | Motor `human:escalate` etc. există în același worker (`main.ts` L270–272) dar **nu** legat de acest procesor în codul citit. |
| 11 | Micro-OODA | **Cod:** citire DB produse → log → return structură fixă; nu poll metrics externi. | OODA v2: observare praguri / alertă (L5476). | OODA din v2 **nu** e mapat operațional în STUB. |
| 12 | Tier + de-escaladare | Fără praguri încredere / 2σ în procesor. | Tier 4 (v2 L5470). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ procesor + Drizzle/`@cerniq/db` pentru `goldProducts`. | Kafka, SGLang etc. — v2 §2.3 ca destinație platformă. | Versiuni stack neuronal: nu extrase din acest fișier. |

### Mapare OTel

- **v2:** `cognitive.e3.pricing.competitor-check`.
- **Cod:** span activ = prefix `cognitive:` + `nodeKey` rezolvat din catalog → literal `cognitive:e3:pricing:competitor-check`; atribute `cognitive.nodeKey`, `cognitive.neuronType`, `cognitive.swimlane`, `cognitive.etapa`, `cognitive.function`.
- **Stare:** **parțial aliniat** (instrumentare generică factory + catalog) vs **denumire puncte** din v2; fără dovadă că numele v2 cu puncte e emis în cod.

---
*Generator inițial:* înlocuit prin audit manual.
