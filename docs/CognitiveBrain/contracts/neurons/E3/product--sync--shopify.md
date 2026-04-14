<!-- neuron-contract:author-complete -->

# Neuron `product:sync:shopify`

> **Status:** audit manual **2026-04-13**. **v2** (L5624–5644) descrie coadă și OTel; **repo:** fără potriviri `shopify` / `Shopify` în fișiere `*.ts`, `*.tsx`, `*.js`, `*.mjs` (căutare la nivel monorepo). **Gap runtime** — niciun procesor / registry / catalog pentru această coadă.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `product:sync:shopify` |
| etapa | E3 |
| familie (v2) | `product-search` |
| contract_path | `contracts/neurons/E3/product--sync--shopify.md` |
| ADR familie (indicativ) | [product-search](../../adr/families/e3/product-search.md) |

## Scop în context real

**v2:** neuron knowledge pentru sincronizare Shopify (etichetă graf L5628–5638). **Repo:** niciun handler; ingest produse există separat (`product:ingest`) fără mențiune Shopify în codul căutat.

## Surse audit

- v2 — L5624–5644.
- `packages/shared/src/cognitive-node-catalog.ts` — fără potrivire `shopify` / `product:sync:shopify`.
- `workers/shared/src/queue-registry.ts` — fără potrivire.
- Căutare `shopify` / `Shopify` în `*.{ts,tsx,js,mjs}` — 0 rezultate (audit 2026-04-13).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L5640).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap:** fără `nodeKey` / registry pentru `product:sync:shopify`. | v2 L5638. | v2 §2.4. |
| 2 | Etapă, familie, swimlane | Neconectat. | E3 / product-search / swimlane product-search (L5620). | — |
| 3 | Rol declarat | Lipsă handler. | v2 L5635–5637. | — |
| 4 | NeuronType + SOFAI | Neconectat. | `KnowledgeNeuron` v2 (L5631). | — |
| 5 | Criticitate | Neconectat. | `MEDIUM` (L5633). | — |
| 6 | Înveliș telemetrie | Lipsă worker. | `cognitive.product.sync.shopify` (L5643). | Doar destinație documentată. |
| 7 | Înveliș politică | — | v2 L5634, L5641. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | — | — | — |
| 10 | Escaladare HITL | — | v2 L5641. | — |
| 11 | Micro-OODA | — | v2 L5639. | — |
| 12 | Tier + de-escaladare | — | Tier 4 (L5634). | — |
| 13 | Stack v2 §2.3 (subset) | — | — | — |

### Mapare OTel

- **v2:** `cognitive.product.sync.shopify`.
- **Cod:** neimplementat — fără span.

---
*Generator inițial:* înlocuit prin audit manual.
