<!-- neuron-contract:author-complete -->

# Neuron `search:rerank:cross-encoder`

> **Status:** audit manual **2026-04-13**. **Gap:** fără coadă / `nodeKey` / handler pentru `search:rerank:cross-encoder` în `workers/**/*.ts` (căutare `rerank` / `cross.encoder` / `crossEncoder` — fără potriviri). **Notă:** fuziunea RRF există separat (`search:rrf:fuse`, B10) — nu este cross-encoder.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `search:rerank:cross-encoder` |
| etapa | E3 |
| familie (v2) | `product-search` |
| contract_path | `contracts/neurons/E3/search--rerank--cross-encoder.md` |
| ADR familie (indicativ) | [product-search](../../adr/families/e3/product-search.md) |

## Scop în context real

**v2** (L5740–5760): reranking cu cross-encoder; **Contract evidence status** indică neconciliere cu registry. **Repo:** neimplementat ca atare; poziționare în pipeline rămâne **doar destinație arhitecturală** față de B10 (RRF ponderat vector/BM25).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`search:rerank:cross-encoder\`` (L5740–5760).
- `workers/shared/src/queue-registry.ts` — fără intrare pentru `search:rerank:cross-encoder`.
- `packages/shared/src/cognitive-node-catalog.ts` — fără `nodeKey` pentru acest slug.
- Căutare în `workers/**/*.ts` — zero potriviri pentru rerank / cross-encoder (audit **2026-04-13**).
- Referință comparativă: `search:rrf:fuse` / `e3:search:rrf-fuse` (catalog L1581–1587; `b10-search-rrf-fuse.ts`).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L5756). (În research, cross-encoder implică de obicei model scoring perechi query–doc; **lipsește implementarea**.)

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** — fără handler. | v2 L5754. | — |
| 2 | Etapă, familie, swimlane | Neconectat. | v2 L5758. | — |
| 3 | Rol declarat | Lipsă. | v2 L5751–5753. | RRF (B10) acoperă alt mecanism de ordonare. |
| 4 | NeuronType + SOFAI | Neconectat. | `KnowledgeNeuron` v2 (L5747). | — |
| 5 | Criticitate | Neconectat. | `MEDIUM` (L5749). | — |
| 6 | Înveliș telemetrie | Lipsă. | `cognitive.search.rerank.cross-encoder` (L5759). | — |
| 7 | Înveliș politică | — | v2 L5757. | — |
| 8 | Rutare model (dacă AI) | **N/A** (criteriu; fără cod). | v2 Non-AI (L5756). | Contradicție potențială cu „cross-encoder» ca model — v2 §2.4 până la implementare. |
| 9 | Guardrails | — | — | — |
| 10 | Escaladare HITL | — | v2 L5757. | — |
| 11 | Micro-OODA | — | v2 L5755. | — |
| 12 | Tier + de-escaladare | — | Tier 4 (L5750). | — |
| 13 | Stack v2 §2.3 (subset) | — | — | — |

### Mapare OTel

- **v2:** `cognitive.search.rerank.cross-encoder`.
- **Cod:** **nu sunt emise** — fără `withCognitiveSpan` asociat acestui `nodeKey`.
- **Stare:** **doar destinație documentară** în v2; reconciliere necesară la introducerea cozii / catalogului.

---
*Generator inițial:* înlocuit prin audit manual.
