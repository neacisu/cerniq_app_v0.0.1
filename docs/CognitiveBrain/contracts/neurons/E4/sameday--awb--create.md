<!-- neuron-contract:author-complete -->

# Neuron `sameday:awb:create`

> **Status:** audit manual **2026-04-13**. **v2** (L7139–L7162): coadă `sameday:awb:create`, `LogisticsNeuron`, `CRITICAL`, catalog-grounded. **Repo:** **E22** — `E4_SAMEDAY_AWB_CREATE` (`queue-registry.ts` L406), `samedayAwbCreateProcessor` (`e22-sameday-awb-create.ts`), worker `index.ts` L324–329. **Observație:** fișierul E22 citit **nu** apelează `withCognitiveSpan` — **fără** span `cognitive:e4:sameday:awb-create` din acest procesor (căutare în `e22-sameday-awb-create.ts`).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `sameday:awb:create` |
| etapa | E4 |
| familie (v2) | `logistics` |
| contract_path | `contracts/neurons/E4/sameday--awb--create.md` |
| ADR familie (indicativ) | [logistics](../../adr/families/e4/logistics.md) |

## Scop în context real

**Cod:** creare AWB via `createSamedayAwb`, INSERT `goldShipments`, metrică `e4ShipmentsCreatedTotal` (header `e22-sameday-awb-create.ts` L1–11; implementare începe L29). Trigger: `order:ready` (comentariu L4).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L7139–L7162.
- `workers/shared/src/queue-registry.ts` — L406.
- `packages/shared/src/cognitive-node-catalog.ts` — L2433–L2440.
- `workers/e4-postsale/src/workers/e22-sameday-awb-create.ts` — procesor E22.
- `workers/e4-postsale/src/index.ts` — E22 L324–329.
- `workers/e4-postsale/src/__tests__/e-workers.test.ts` — referințe cozi Sameday (ex. L142).
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L7158).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Coadă + catalog `e4:sameday:awb-create` aliniate. | v2 L7156. | — |
| 2 | Etapă, familie, swimlane | `logistics` (L2437–L2438). | v2 L7149. | — |
| 3 | Rol declarat | AWB + INSERT shipment. | v2 L7153–L7155. | — |
| 4 | NeuronType + SOFAI | `LogisticsNeuron`. | v2 L7147. | — |
| 5 | Criticitate | `CRITICAL` (L2440). | v2 L7150. | — |
| 6 | Înveliș telemetrie | **Lipsește** `withCognitiveSpan` în E22 citit. | v2 `cognitive.e4.sameday.awb-create` (L7161). | Gap telemetrie cognitivă per-neuron în handler. |
| 7 | Înveliș politică | — | v2 L7159. | — |
| 8 | Rutare model (dacă AI) | **N/A** | L7158. | — |
| 9 | Guardrails | Integrare API Sameday + DB. | — | — |
| 10 | Escaladare HITL | — | v2 L7159. | — |
| 11 | Micro-OODA | Flux determinist în E22. | v2 OODA generic (L7157). | — |
| 12 | Tier + de-escaladare | — | Tier 2 (L7151). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ + client Sameday. | — | — |

### Mapare OTel

- **v2:** `cognitive.e4.sameday.awb-create` (L7161).
- **Cod:** procesorul E22 citit **nu** deschide span cognitiv standard; observabilitate suplimentară: `createServiceLogger` **absent** în primele linii din E22 (spre deosebire de E23).

---
*Revizuire manuală:* dovezi repo 2026-04-13.
