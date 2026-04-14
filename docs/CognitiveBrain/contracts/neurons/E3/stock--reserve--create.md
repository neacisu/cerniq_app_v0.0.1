<!-- neuron-contract:author-complete -->

# Neuron `stock:reserve:create`

> **Status:** audit manual **2026-04-13**. Coadă aliniată v2 ↔ registry ↔ catalog; procesor **F34** — rezervare tranzacțională anti-oversell.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `stock:reserve:create` |
| etapa | E3 |
| familie (v2) | `stock` |
| contract_path | `contracts/neurons/E3/stock--reserve--create.md` |
| ADR familie (indicativ) | [stock](../../adr/families/e3/stock.md) |

## Scop în context real

**v2** (L5762–5785). **Cod:** creează rezervare în `stock_reservations` cu izolare tranzacțională serializabilă (antet f34 L4–5), TTL per stare negociere (`RESERVATION_TTL_MS`, f34 L40–46), prevenire oversell (f34 L31–37 și `OversellPreventionError` L31–37).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`stock:reserve:create\`` (L5762–5785).
- `packages/shared/src/cognitive-node-catalog.ts` — `e3:stock:reserve-create` / `stock:reserve:create` (L1805–1812).
- `workers/shared/src/queue-registry.ts` — `E3_STOCK_RESERVE_CREATE` (L260); config concurență (L948).
- `workers/e3-ai-sales/src/main.ts` — `processors["stock:reserve:create"]` (L215).
- `workers/e3-ai-sales/src/workers/f34-stock-reserve-create.ts`.
- `workers/e3-ai-sales/src/__tests__/f-workers.test.ts` — `F34 — stockReserveCreateProcessor`.
- `workers/shared/src/factory.ts` — `wrapProcessorWithCognitiveInstrumentation` (L90–107).
- `workers/shared/src/cognitive-helpers.ts` — `withCognitiveSpan` (L215–234).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L5781).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | `e3:stock:reserve-create` / `stock:reserve:create` (catalog L1806–1807); registry L260; `main.ts` L215. | v2 L5779. | — |
| 2 | Etapă, familie, swimlane | Swimlane `stock-management` (L1810). | v2 L5772. | — |
| 3 | Rol declarat | Rezervare + TTL + tranzacție (f34 antet + corp). | v2 L5776–5778. | — |
| 4 | NeuronType + SOFAI | `ProceduralNeuron` (L1809). | v2 L5770. | — |
| 5 | Criticitate | `HIGH` (L1812). | v2 L5773. | — |
| 6 | Înveliș telemetrie | Span `cognitive:e3:stock:reserve-create` când `tenantId` în job (factory + helpers). | v2 `cognitive.e3.stock.reserve-create` (L5784). | Convenție puncte vs `cognitive:nodeKey`. |
| 7 | Înveliș politică | Excepții oversell; fără OPA în fișierul procesor. | Tier 3; HITL anomalii (v2 L5774, L5782). | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Logică tranzacțională deterministă + erori explicite la oversell. | NeMo destinație ADR-0007. | — |
| 10 | Escaladare HITL | — | v2 L5782. | — |
| 11 | Micro-OODA | Payload → verificare stoc în tranzacție → insert rezervare. | v2 L5780. | — |
| 12 | Tier + de-escaladare | TTL explicit per stare (f34 L40–46). | Tier 3 (v2 L5774). | — |
| 13 | Stack v2 §2.3 (subset) | Postgres + BullMQ + Drizzle. | — | — |

### Mapare OTel

- **v2:** `cognitive.e3.stock.reserve-create`.
- **Cod:** span activ = `cognitive:e3:stock:reserve-create`; atribute `cognitive.nodeKey`, `cognitive.neuronType`, `cognitive.swimlane`, `cognitive.etapa`, `cognitive.function` (`cognitive-helpers.ts` L226–234); înveliș `factory.ts` (L90–107).
- **Stare:** **parțial aliniat** (aceeași cheie canonică) între convenția v2 cu puncte și span-ul `cognitive:${nodeKey}`.

---
*Generator inițial:* înlocuit prin audit manual.
