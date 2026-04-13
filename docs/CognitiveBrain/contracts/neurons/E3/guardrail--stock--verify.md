<!-- neuron-contract:author-complete -->

# Neuron `guardrail:stock:verify`

> **Status:** audit manual **2026-04-11**. **Gap runtime:** `grep` pe `guardrail:stock:verify` în `*.ts`/`*.js` → **zero** rezultate. **Nu** există `QUEUES` în `queue-registry.ts` sau `nodeKey` în catalog pentru această coadă. **Proximitate:** v2 și ADR discută mapare către **`guardrail:sku:validate`** (M74) — coadă și catalog diferite; nu sunt echivalente fără decizie explicită de migrare.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `guardrail:stock:verify` |
| etapa | E3 |
| familie (v2) | `guardrails` |
| contract_path | `contracts/neurons/E3/guardrail--stock--verify.md` |
| ADR familie (indicativ) | [guardrails](../../adr/families/e3/guardrails.md) |

## Scop în context real

**v2** (L5141–5161): neuron **issue** din graf, **GuardrailNeuron** inferat, coadă `guardrail:stock:verify`, **evidence:** ne-reconciliat cu registry (L5160–5161). **Comportament în repo:** implementare **lipsă** pentru coada exactă; workerul **M74** implementează **`guardrail:sku:validate`** (`m74-guardrail-sku-validate.ts`, `main.ts` L266) — validare SKU menționat vs `gold_products`, nu același nume de coadă. **ADR** [`guardrails.md`](../../adr/families/e3/guardrails.md) L38, L52 — gap `stock:verify` vs `sku:validate`.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L5141–5161.
- `workers/shared/src/queue-registry.ts` — L336–340 (fără `stock:verify`).
- `packages/shared/src/cognitive-node-catalog.ts` — `guardrail:sku:validate` L2179–2186; fără `stock:verify`.
- `docs/CognitiveBrain/adr/families/e3/guardrails.md`.
- Căutare `guardrail:stock:verify` în cod — zero (2026-04-11).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L5157); fără cod.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** — fără `nodeKey` pentru `guardrail:stock:verify`. | v2 câmp coadă (L5155). | Implementare absentă. |
| 2 | Etapă, familie, swimlane | — | E3, guardrails; swimlane `guardrails` în metrici v2 (L5159). | — |
| 3 | Rol declarat | — | v2 operațional guardrails (L5152–5154). | — |
| 4 | NeuronType + SOFAI | — | v2 inferat GuardrailNeuron (L5148). | — |
| 5 | Criticitate | — | v2 inferat CRITICAL (L5150). | — |
| 6 | Înveliș telemetrie | — | v2 `cognitive.guardrail.stock.verify` (L5160). | Fără worker. |
| 7 | Înveliș politică | — | v2 HITL (L5158). | — |
| 8 | Rutare model (dacă AI) | **N/A**. | v2 Non-AI. | — |
| 9 | Guardrails | — | NeMo + determinist (L5156). | — |
| 10 | Escaladare HITL | — | v2 (L5158). | — |
| 11 | Micro-OODA | — | v2 (L5156). | — |
| 12 | Tier + de-escaladare | — | v2 Tier 2 (L5151). | — |
| 13 | Stack (subset) | **Referință înrudită (altă coadă):** M74 `guardrail:sku:validate` + `guardrails.runSkuValidate`. | v2 §2.3. | **Nu** înlocuiește contractul `stock:verify` fără decizie ADR. |

### Mapare OTel

- **v2:** `cognitive.guardrail.stock.verify`.
- **Cod:** **neimplementat** pentru coada canonică — fără `cognitive.nodeKey`.

---
*Generator inițial:* înlocuit prin audit manual.
