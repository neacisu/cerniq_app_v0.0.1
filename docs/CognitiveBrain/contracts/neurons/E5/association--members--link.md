<!-- neuron-contract:author-complete -->

# Neuron `association:members:link`

> **Status:** audit manual **2026-04-13**. **v2** → coadă **`association:members:link`** (L8231–8251). **Runtime:** **`association:member:match`** (G41), `e5:association:member-match` în catalog. **Bootstrap E5:** `workers/e5-nurturing/src/index.ts` pornește doar A1–A8, B9–B14, C15–C19 (L68–L91); G41 **nu** este în `push()`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `association:members:link` |
| etapa | E5 |
| familie (v2) | `graph-community` |
| contract_path | `contracts/neurons/E5/association--members--link.md` |
| ADR familie (indicativ) | [graph-community](../../adr/families/e5/graph-community.md); ingest: [association-ingest](../../adr/families/e5/association-ingest.md) |

## Scop în context real

**v2:** legături membri, `KnowledgeNeuron` în bloc v2. **Cod:** potrivire membri asociație ↔ clienți (`g41` antet L7–16), `AssociativeNeuron` în catalog — **divergență tip** față de v2.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — (L8231–8251).
- `packages/shared/src/cognitive-node-catalog.ts` — `e5:association:member-match`, `association:member:match` (L3132–3140).
- `workers/shared/src/queue-registry.ts` — `E5_ASSOCIATION_MEMBER_MATCH` → `"association:member:match"` (L600).
- `workers/e5-nurturing/src/workers/g41-association-member-match.ts` — `withCognitiveSpan("e5:association:member:match", …)` (L279).
- `workers/e5-nurturing/src/index.ts` — fără import G41 (L36–40, L68–91).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L8247).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`association:member:match`** (registry L600); `e5:association:member-match` (catalog L3133–3134). **Fără** `association:members:link`. | v2 L8245. | Plural `members` + `link` (v2) vs `member` + `match` (cod). |
| 2 | Etapă, familie, swimlane | Etapa 5, swimlane **`association-scraping`** (L3137–3138). | v2 familie `graph-community` (L8234). | Swimlane cod ≠ etichetă familie v2. |
| 3 | Rol declarat | CUI exact + fuzzy Jaccard + relații (`g41` L7–16). | v2 generic (L8242–8244). | — |
| 4 | NeuronType + SOFAI | **`AssociativeNeuron`** (L3136). | v2 **`KnowledgeNeuron`** (L8238). | **Divergență explicită.** |
| 5 | Criticitate | `MEDIUM` (L3140). | v2 `MEDIUM` (L8240). | — |
| 6 | Înveliș telemetrie | Span literal **`e5:association:member:match`** (L279) — două puncte în `member:match`. Catalog `nodeKey` **`e5:association:member-match`** (L3133). | v2 `cognitive.association.members.link` (L8250). | **Span ≠ nodeKey** (coloană `:` vs `-`). |
| 7 | Înveliș politică | — | v2 L8248–8249. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Prag Jaccard 0.45 (`g41` L15). | NeMo țintă. | — |
| 10 | Escaladare HITL | — | v2 L8248. | — |
| 11 | Micro-OODA | Match → poate declanșa G42 (acoperire). | v2 L8246. | — |
| 12 | Tier + de-escaladare | — | Tier 4 (L8241). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ + Drizzle. | — | — |

### Mapare OTel

- **v2:** `cognitive.association.members.link`.
- **Cod:** `e5:association:member:match` în `withCognitiveSpan` (nu `member-match`).

---
*Audit manual 2026-04-13; surse verificate în repo.*
