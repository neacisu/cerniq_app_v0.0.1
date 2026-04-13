<!-- neuron-contract:author-complete -->

# Neuron `stock:reserve:release`

> **Status:** audit manual **2026-04-13**. **Cod:** F35 — eliberare rezervări expirate; comentariu CRON la 5 minute în antetul fișierului.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `stock:reserve:release` |
| etapa | E3 |
| familie (v2) | `stock` |
| contract_path | `contracts/neurons/E3/stock--reserve--release.md` |
| ADR familie (indicativ) | [stock](../../adr/families/e3/stock.md) |

## Scop în context real

**v2** (L5787–5810). **Cod:** selectează rezervări `ACTIVE`/`RESERVED` cu `expiresAt < NOW()`, apoi le marchează expirate și ajustează `reserved_quantity` în inventar (`f35-stock-reserve-release.ts` L41–53 și continuarea fișierului).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`stock:reserve:release\`` (L5787–5810).
- `packages/shared/src/cognitive-node-catalog.ts` — `e3:stock:reserve-release` / `stock:reserve:release` (L1814–1821).
- `workers/shared/src/queue-registry.ts` — `E3_STOCK_RESERVE_RELEASE` (L261); concurență (L949).
- `workers/e3-ai-sales/src/main.ts` — `processors["stock:reserve:release"]` (L216).
- `workers/e3-ai-sales/src/workers/f35-stock-reserve-release.ts`.
- `workers/e3-ai-sales/src/__tests__/f-workers.test.ts` — `F35 — stockReserveReleaseProcessor`.
- `workers/shared/src/factory.ts` — `wrapProcessorWithCognitiveInstrumentation` (L90–107).
- `workers/shared/src/cognitive-helpers.ts` — `withCognitiveSpan` (L215–234).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L5806).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | `e3:stock:reserve-release` (L1815–1816); registry L261; `main.ts` L216. | v2 L5804. | — |
| 2 | Etapă, familie, swimlane | `stock-management` (L1818). | v2 L5797. | — |
| 3 | Rol declarat | Cleanup expirate + decrement rezervat (f35). | v2 L5801–5803. | — |
| 4 | NeuronType + SOFAI | `ProceduralNeuron` (L1817). | v2 L5795. | — |
| 5 | Criticitate | `HIGH` (L1820). | v2 L5798. | — |
| 6 | Înveliș telemetrie | Span `cognitive:e3:stock:reserve-release` când `tenantId` în job (job poate rula fără tenant — f35 L35–39). | v2 `cognitive.e3.stock.reserve-release` (L5809). | Dacă lipsește `tenantId`, factory poate ocoli span-ul (`factory.ts` L105). |
| 7 | Înveliș politică | Filtru opțional `tenantId` în `job.data` (f35 L35–39). | v2 L5799, L5807. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | SQL determinist. | — | — |
| 10 | Escaladare HITL | — | v2 L5807. | — |
| 11 | Micro-OODA | Scan expirări → update inventar. | v2 L5805. | — |
| 12 | Tier + de-escaladare | — | Tier 3 (v2 L5799). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ + SQL + Drizzle. | — | — |

### Mapare OTel

- **v2:** `cognitive.e3.stock.reserve-release`.
- **Cod:** span `cognitive:e3:stock:reserve-release` când instrumentarea rulează (prezență `tenantId` în context job — `factory.ts` L105–106); atribute standard `cognitive.nodeKey`, … (`cognitive-helpers.ts` L226–234).
- **Stare:** **parțial aliniat**; trasee fără `tenantId` pot executa procesorul **fără** `withCognitiveSpan` (comportament citit în factory).

---
*Generator inițial:* înlocuit prin audit manual.
