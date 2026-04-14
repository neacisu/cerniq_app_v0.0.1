<!-- neuron-contract:author-complete -->

# Neuron `contract:sign:complete`

> **Status:** audit manual **2026-04-13**. Graf v2 `contract:sign:complete` → runtime **`contract:signed:process`** (G36). `withCognitiveSpan("e4:contract:signed:process", …)` vs catalog **`e4:contract:signed-process`** — nealinier.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue (graf) | `contract:sign:complete` |
| coadă runtime | `contract:signed:process` |
| etapa | E4 |
| familie (v2) | `contracts` |
| contract_path | `contracts/neurons/E4/contract--sign--complete.md` |
| ADR familie (indicativ) | [contracts](../../adr/families/e4/contracts.md) |

## Scop în context real

Download PDF combinat din DocuSign, stocare locală semnată, UPDATE `gold_contracts` (`SIGNED`, `signedPdfUrl`, `docusignStatus`), INSERT audit Etapa 4, metrică `e4ContractsSignedTotal`. Idempotent dacă status deja `SIGNED`.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L6556–6576.
- ADR: [`adr/families/e4/contracts.md`](../../adr/families/e4/contracts.md).
- Catalog: [`cognitive-node-catalog.ts`](../../../../../packages/shared/src/cognitive-node-catalog.ts) — `e4:contract:signed-process` (~L2563–2570).
- Handler: [`g36-contract-signed-process.ts`](../../../../../workers/e4-postsale/src/workers/g36-contract-signed-process.ts).
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `contracts` (v2 L6556–6576)

- **Confirmed queue field:** `contract:sign:complete`
- **Evidence status:** graph-export (L6576)
- **OTel (v2):** `cognitive.contract.sign.complete`

## N/A pe criterii

- **8 — Rutare model:** N/A — Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Coadă: `contract:signed:process`. Catalog: `e4:contract:signed-process`. Graf: `contract:sign:complete`. | v2 L6570. | — |
| 2 | Etapă, familie, swimlane | Catalog: etapa 4, `contract-execution`. | v2: E4, `contracts`. | — |
| 3 | Rol declarat | G36 antet L1–9 + pași implementare. | v2 L6568–6569. | — |
| 4 | NeuronType + SOFAI | `ContractNeuron`. | v2 inferat ContractNeuron. | — |
| 5 | Criticitate | `CRITICAL` în catalog (~L2569). | v2 inferat MEDIUM. | Nealiniere criticitate. |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e4:contract:signed:process", …)` (G36 ~L31–32). Logger `createServiceLogger`. | v2 L6575. | nodeKey cod vs catalog cu cratimă. |
| 7 | Înveliș politică | Idempotent skip dacă deja SIGNED (G36 ~L53–56). | v2 L6573. | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI. | — |
| 9 | Guardrails | Verificare contract existent + status înainte de download. | — | — |
| 10 | Escaladare HITL | Nu în G36. | — | — |
| 11 | Micro-OODA | Download → store → UPDATE → audit. | v2 OODA L6571. | — |
| 12 | Tier + de-escaladare | Fără prag încredere. | v2 Tier 4. | — |
| 13 | Stack v2 §2.3 (subset) | DocuSign API, filesystem local, DB. | — | — |

### Mapare OTel

- **v2 (graf):** `cognitive.contract.sign.complete`.
- **Cod:** `cognitive:e4:contract:signed:process` — unificare recomandată cu `e4:contract:signed-process`.

---
*Audit manual 2026-04-13.*
