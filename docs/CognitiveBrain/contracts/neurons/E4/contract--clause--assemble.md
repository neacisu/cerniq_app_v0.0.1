<!-- neuron-contract:author-complete -->

# Neuron `contract:clause:assemble`

> **Status:** audit manual **2026-04-13**. Eticheta graf v2 `contract:clause:assemble` **nu** există ca literal în `queue-registry.ts`. **Implementare:** G33 — coadă `contract:clauses:select`, `nodeKey` catalog `e4:contract:clauses-select`. **`withCognitiveSpan`** din cod folosește stringul `e4:contract:clauses:select` (două puncte) — **nealinier** la `e4:contract:clauses-select` din catalog (`getNodeByKey` poate returna `undefined`).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue (graf) | `contract:clause:assemble` |
| coadă runtime | `contract:clauses:select` |
| etapa | E4 |
| familie (v2) | `contracts` |
| contract_path | `contracts/neurons/E4/contract--clause--assemble.md` |
| ADR familie (indicativ) | [contracts](../../adr/families/e4/contracts.md) |

## Scop în context real

Selecție clauze contractuale după `riskTier` (mapare fixă L2099 în comentariu G33), îmbinare cu clauze obligatorii din `gold_contract_clauses`, UPDATE `gold_contracts.clausesUsed`, enqueue G34 `contract:docusign:send`.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L6468–6488.
- ADR familie: [`adr/families/e4/contracts.md`](../../adr/families/e4/contracts.md) — tabel cozi + reconciliere denumiri.
- Catalog: [`cognitive-node-catalog.ts`](../../../../../packages/shared/src/cognitive-node-catalog.ts) — `e4:contract:clauses-select` (~L2536–2543).
- Registry: [`queue-registry.ts`](../../../../../workers/shared/src/queue-registry.ts) — `E4_CONTRACT_CLAUSES_SELECT` (~L426).
- Handler: [`g33-contract-clauses-select.ts`](../../../../../workers/e4-postsale/src/workers/g33-contract-clauses-select.ts).
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `contracts` (v2 L6468–6488)

- **Confirmed queue field:** `contract:clause:assemble`
- **Neuron type (v2 inferat):** ContractNeuron
- **Evidence status:** graph-export (L6488)
- **OTel (v2):** `cognitive.contract.clause.assemble`

## N/A pe criterii

- **8 — Rutare model:** N/A — Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Runtime `contract:clauses:select`; graf `contract:clause:assemble`. Catalog `e4:contract:clauses-select`. | v2 L6482. | Trei denumiri pentru același pas din pipeline. |
| 2 | Etapă, familie, swimlane | Catalog: etapa 4, `contract-execution`. | v2: E4, `contracts`. | Swimlane v2 L6487 `contracts` vs catalog `contract-execution`. |
| 3 | Rol declarat | G33 antet + mapare coduri risk tier (~L1–41, ~L60–80). | v2 L6480–6481 generic. | — |
| 4 | NeuronType + SOFAI | `ContractNeuron` în catalog. | v2 ContractNeuron inferat. | — |
| 5 | Criticitate | `HIGH` în catalog (~L2542). | v2 inferat MEDIUM. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e4:contract:clauses:select", …)` (G33 ~L54–55). Span activ: `cognitive:e4:contract:clauses:select` (pattern helper). Catalog cheie cu **cratimă**. | v2 L6487 — metrică generică. | **Nealiniere nodeKey** colon vs cratimă → atribute catalog pe span posibil incomplete. |
| 7 | Înveliș politică | Reguli deterministe pe tier; fără Cedar în G33. | v2 L6485 — fără HITL obligatoriu. | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI. | — |
| 9 | Guardrails | Mapare strictă coduri clauză din plan (comentariu anti-halucinare G33). | — | — |
| 10 | Escaladare HITL | Nu în G33. | — | — |
| 11 | Micro-OODA | Select clauze → UPDATE contract → enqueue G34. | v2 OODA L6483. | — |
| 12 | Tier + de-escaladare | Fără prag încredere. | v2 Tier 4. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ, Drizzle, enqueue G34. | — | — |

### Mapare OTel

- **v2 (graf):** `cognitive.contract.clause.assemble`.
- **Cod:** `withCognitiveSpan` + `cognitive.nodeKey` = argumentul string din G33; aliniere la catalog necesită unificare `e4:contract:clauses-select` vs `e4:contract:clauses:select`.

---
*Audit manual 2026-04-13.*
