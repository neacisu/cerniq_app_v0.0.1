<!-- neuron-contract:author-complete -->

# Neuron `contract:template:select`

> **Status:** audit manual **2026-04-13**. **v2** folosește coada `contract:template:select` (graph export). **Runtime:** selecția de clauze este **`contract:clauses:select`** (G33) / `e4:contract:clauses-select` în catalog — același rol operațional (clauze per `riskTier`), alt nume de coadă.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `contract:template:select` |
| etapa | E4 |
| familie (v2) | `contracts` |
| contract_path | `contracts/neurons/E4/contract--template--select.md` |
| ADR familie (indicativ) | [contracts](../../adr/families/e4/contracts.md) |

## Scop în context real

**v2** (L6600–6620): neuron `ContractNeuron`, selecție clauze per risc, OODA orientat spre DocuSign. **Cod:** `contractClausesSelectProcessor` alege coduri de clauze după `riskTier` (mapare fixă L35–41), citește `gold_contract_clauses`, actualizează `gold_contracts.clausesUsed`, apoi enfilează `contract:docusign:send` (`g33-contract-clauses-select.ts`).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`contract:template:select\`` (L6600–6620).
- `packages/shared/src/cognitive-node-catalog.ts` — `e4:contract:clauses-select` / `contract:clauses:select` (L2536–2543).
- `workers/shared/src/queue-registry.ts` — `E4_CONTRACT_CLAUSES_SELECT` → `contract:clauses:select` (L425–426).
- `workers/e4-postsale/src/index.ts` — worker G33 (L382–387).
- `workers/e4-postsale/src/workers/g33-contract-clauses-select.ts` — `withCognitiveSpan("e4:contract:clauses:select", …)` (L54–56).
- `workers/e4-postsale/src/__tests__/g-workers.test.ts` — `contractClausesSelectProcessor`.
- `workers/shared/src/cognitive-helpers.ts` — `withCognitiveSpan` / atribute span (L215–234).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L6616).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Runtime: **`contract:clauses:select`**, `nodeKey` catalog **`e4:contract:clauses-select`** (L2537–2538). **Fără** `contract:template:select` în registry. | v2 coadă L6614. | Mapare semantică v2 → G33; nume coadă diferit. |
| 2 | Etapă, familie, swimlane | Catalog: etapa 4, swimlane **`contract-execution`** (L2541). | v2 familie `contracts` (L6603); metrici swimlane `contracts` (L6617). | Swimlane v2 generic vs `contract-execution` în catalog. |
| 3 | Rol declarat | Selecție clauze + DB + enqueue G34 (antet + flux g33). | v2 OODA L6615. | — |
| 4 | NeuronType + SOFAI | `ContractNeuron` (L2531). | v2 `ContractNeuron` inferat (L6607). | — |
| 5 | Criticitate | `HIGH` (L2543). | `MEDIUM` v2 (L6609). | Divergență criticitate. |
| 6 | Înveliș telemetrie | Apel explicit `withCognitiveSpan("e4:contract:clauses:select", …)` (L54–56). Catalog: **`e4:contract:clauses-select`**. | v2 `cognitive.contract.template.select` (L6619). | **Span vs catalog:** șirul din `withCognitiveSpan` folosește `:` în segmente; `nodeKey` catalog folosește `-` — posibil fără atribute din catalog la `getNodeByKey`. |
| 7 | Înveliș politică | Logică deterministă pe `riskTier`; fără OPA în fișier. | Tier 4; fără HITL obligatoriu v2 (L6617). | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Mapare fixă coduri clauze din plan (antet L15–16). | NeMo destinație ADR-0007. | — |
| 10 | Escaladare HITL | — | v2 L6617. | — |
| 11 | Micro-OODA | DB → update contract → coadă următoare. | v2 L6615. | — |
| 12 | Tier + de-escaladare | — | Tier 4 (L6610). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ + Drizzle + Redis (REDIS_DB_E4 în g33 L29). | DocuSign în lanțul G34+. | — |

### Mapare OTel

- **v2:** `cognitive.contract.template.select`.
- **Cod:** span `cognitive:e4:contract:clauses:select` (șir din procesor); convenție canonică catalog `e4:contract:clauses-select`; atribute `cognitive.nodeKey` etc. doar dacă `getNodeByKey` rezolvă cheia — **posibil nealiniere** (vezi `cognitive-helpers.ts` L225–234).
- **Stare:** **parțial aliniat** (comportament G33 = scop v2; denumiri coadă / span / catalog diferite).

---
*Generator inițial:* înlocuit prin audit manual.
