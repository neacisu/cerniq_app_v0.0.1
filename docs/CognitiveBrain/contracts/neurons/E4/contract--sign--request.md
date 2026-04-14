<!-- neuron-contract:author-complete -->

# Neuron `contract:sign:request`

> **Status:** audit manual **2026-04-13**. Graf v2 `contract:sign:request` → runtime **`contract:docusign:send`** (G34). `withCognitiveSpan("e4:contract:docusign:send", …)` vs catalog **`e4:contract:docusign-send`** — nealinier.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue (graf) | `contract:sign:request` |
| coadă runtime | `contract:docusign:send` |
| etapa | E4 |
| familie (v2) | `contracts` |
| contract_path | `contracts/neurons/E4/contract--sign--request.md` |
| ADR familie (indicativ) | [contracts](../../adr/families/e4/contracts.md) |

## Scop în context real

Citire PDF contract, creare envelope DocuSign cu semnatar ADMINISTRATOR, trimitere, UPDATE `gold_contracts` (`SENT_DOCUSIGN`), audit `CONTRACT_SENT`. Verificări `pdfUrl`, `expiresAt` în G34.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L6578–6598.
- ADR: [`adr/families/e4/contracts.md`](../../adr/families/e4/contracts.md).
- Catalog: [`cognitive-node-catalog.ts`](../../../../../packages/shared/src/cognitive-node-catalog.ts) — `e4:contract:docusign-send` (~L2545–2552).
- Handler: [`g34-contract-docusign-send.ts`](../../../../../workers/e4-postsale/src/workers/g34-contract-docusign-send.ts).
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `contracts` (v2 L6578–6598)

- **Confirmed queue field:** `contract:sign:request`
- **Evidence status:** graph-export (L6598)
- **OTel (v2):** `cognitive.contract.sign.request`

## N/A pe criterii

- **8 — Rutare model:** N/A — Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Coadă: `contract:docusign:send`. Catalog: `e4:contract:docusign-send`. Graf: `contract:sign:request`. | v2 L6592. | — |
| 2 | Etapă, familie, swimlane | Catalog: etapa 4, `contract-execution`. | v2: E4, `contracts`. | — |
| 3 | Rol declarat | G34 antet L1–12 + flux envelope. | v2 L6590–6591. | — |
| 4 | NeuronType + SOFAI | `ContractNeuron`. | v2 inferat ContractNeuron. | — |
| 5 | Criticitate | `CRITICAL` în catalog (~L2551). | v2 inferat MEDIUM. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e4:contract:docusign:send", …)` (G34 ~L40–41). | v2 L6597. | nodeKey cod vs catalog. |
| 7 | Înveliș politică | Validări PDF și expirare în G34. | v2 L6595. | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI. | — |
| 9 | Guardrails | Verificare contract + `pdfUrl` obligatoriu. | — | — |
| 10 | Escaladare HITL | Nu în G34. | — | — |
| 11 | Micro-OODA | Încarcă date → creează envelope → trimite → persistă. | v2 OODA L6593. | — |
| 12 | Tier + de-escaladare | Fără prag încredere. | v2 Tier 4. | — |
| 13 | Stack v2 §2.3 (subset) | DocuSign API, DB, fișiere locale. | — | — |

### Mapare OTel

- **v2 (graf):** `cognitive.contract.sign.request`.
- **Cod:** `cognitive:e4:contract:docusign:send` — unificare recomandată cu `e4:contract:docusign-send`.

---
*Audit manual 2026-04-13.*
