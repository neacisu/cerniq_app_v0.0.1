<!-- neuron-contract:author-complete -->

# Neuron `return:process:stock`

> **Status:** audit manual **2026-04-13**. **v2** (L7095–L7115): coadă **`return:process:stock`**, tip inferat **`LogisticsNeuron`**, criticitate `MEDIUM`. **Repo:** coadă runtime **`return:process`** (H38), `ReturnNeuron` în catalog, criticitate **`HIGH`** — **nu** există literal `return:process:stock` în `queue-registry.ts` sau TS citit.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `return:process:stock` |
| etapa | E4 |
| familie (v2) | `logistics` |
| contract_path | `contracts/neurons/E4/return--process--stock.md` |
| ADR familie (indicativ) | [logistics](../../adr/families/e4/logistics.md) |

## Scop în context real

**Cod (H38):** finalizează retur — verifică `RETURN_PROCESSING`, setează `RETURNED`, audit `RETURN_PROCESSED`, enqueue I40 (`h38-return-process.ts` L1–12, L35–37). **Semantic:** include ajustări stoc indirect (comentariu lanț H37→F30/H38); **nu** redenumește coada ca „stock” în registry.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L7095–L7115.
- `workers/shared/src/queue-registry.ts` — `E4_RETURN_PROCESS: "return:process"` (L455); **fără** `return:process:stock`.
- `packages/shared/src/cognitive-node-catalog.ts` — `e4:return:process` / `return:process`, `ReturnNeuron` (L2583–2590).
- `workers/e4-postsale/src/workers/h38-return-process.ts` — `withCognitiveSpan("e4:return:process", …)` (L35–36).
- `workers/e4-postsale/src/index.ts` — H38 worker (L453–457).
- Căutare `return:process:stock` în `workers/**/*.ts`, `packages/**/*.ts` — **0** potriviri relevante pentru nume coadă (2026-04-13).
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L7112).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`return:process`** + `e4:return:process`. | v2 **`return:process:stock`** L7109. | Nume coadă diferit. |
| 2 | Etapă, familie, swimlane | Catalog: `logistics`, etapă 4 (L2587–L2588). | v2 familie `logistics` (L7098). | — |
| 3 | Rol declarat | Procesare retur finală + alertă livrare. | „Proces stock” în eticheta v2 (L7100). | — |
| 4 | NeuronType + SOFAI | **`ReturnNeuron`**. | v2 **`LogisticsNeuron`** inferat (L7102). | Contradicție tip neuron. |
| 5 | Criticitate | **`HIGH`** (L2589). | v2 **`MEDIUM`** (L7104). | Contradicție. |
| 6 | Înveliș telemetrie | `cognitive:e4:return:process`. | v2 `cognitive.return.process.stock` (L7114). | Convenții diferite. |
| 7 | Înveliș politică | — | v2 L7113. | — |
| 8 | Rutare model (dacă AI) | **N/A** | L7112. | — |
| 9 | Guardrails | Verificări status comandă în handler. | — | — |
| 10 | Escaladare HITL | — | v2 L7113. | — |
| 11 | Micro-OODA | UPDATE + audit + enqueue alert. | v2 OODA AWB/Sameday (L7110). | v2 OODA mai larg decât H38. |
| 12 | Tier + de-escaladare | — | Tier 4 (L7105). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ. | — | — |

### Mapare OTel

- **v2:** `cognitive.return.process.stock` (L7114).
- **Cod:** `cognitive:e4:return:process`.

---
*Revizuire manuală:* dovezi repo 2026-04-13.
