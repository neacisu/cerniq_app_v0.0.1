<!-- neuron-contract:author-complete -->

# Neuron `contract:sign:check-expiry`

> **Status:** audit manual **2026-04-13**. Graf v2 `contract:sign:check-expiry` → runtime **`contract:status:poll`** (G35, cron `0 1 * * *`). Logica include **expirare** envelope și alertă „expiry soon” (vezi antet G35). `withCognitiveSpan("e4:contract:status:poll", …)` vs catalog `e4:contract:status-poll` — **nealinier** cratimă/punctuație.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue (graf) | `contract:sign:check-expiry` |
| coadă runtime | `contract:status:poll` |
| etapa | E4 |
| familie (v2) | `contracts` |
| contract_path | `contracts/neurons/E4/contract--sign--check-expiry.md` |
| ADR familie (indicativ) | [contracts](../../adr/families/e4/contracts.md) |

## Scop în context real

Polling zilnic contracte `SENT_DOCUSIGN` cu `expiresAt` în viitor: interogare DocuSign, ramuri signed → enqueue G36, declined/voided → anulare, aproape de expirare → metrică `e4ContractExpiryAlertsTotal`, expirat → `EXPIRED`.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L6534–6554.
- ADR: [`adr/families/e4/contracts.md`](../../adr/families/e4/contracts.md).
- Catalog: [`cognitive-node-catalog.ts`](../../../../../packages/shared/src/cognitive-node-catalog.ts) — `e4:contract:status-poll` (~L2554–2561).
- Handler: [`g35-contract-status-poll.ts`](../../../../../workers/e4-postsale/src/workers/g35-contract-status-poll.ts).
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `contracts` (v2 L6534–6554)

- **Confirmed queue field:** `contract:sign:check-expiry`
- **Evidence status:** graph-export (L6554)
- **OTel (v2):** `cognitive.contract.sign.check-expiry`

## N/A pe criterii

- **8 — Rutare model:** N/A — Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Coadă: `contract:status:poll`. Catalog: `e4:contract:status-poll`. Graf: `contract:sign:check-expiry`. | v2 L6548. | — |
| 2 | Etapă, familie, swimlane | Catalog: etapa 4, `contract-execution`. | v2: E4, `contracts`. | — |
| 3 | Rol declarat | G35 antet L1–15: polling + expirare + semnat. | v2 L6546–6547. | — |
| 4 | NeuronType + SOFAI | `ContractNeuron`. | v2 inferat ContractNeuron. | — |
| 5 | Criticitate | `HIGH` în catalog (~L2560). | v2 inferat MEDIUM. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e4:contract:status:poll", …)` (~L131–132). | v2 L6553. | Catalog folosește `status-poll`; cod `status:poll` → posibil `getNodeByKey` null. |
| 7 | Înveliș politică | Rate limit notat în antet G35 (~L14–15). | v2 L6551. | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI. | — |
| 9 | Guardrails | Filtru status + `expiresAt` în SQL G35. | — | — |
| 10 | Escaladare HITL | Nu direct; G36 pentru semnat. | — | — |
| 11 | Micro-OODA | Poll → decizie stare → enqueue sau update. | v2 OODA L6549. | — |
| 12 | Tier + de-escaladare | Fără prag încredere. | v2 Tier 4. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ, client DocuSign, metrici observabilitate. | — | — |

### Mapare OTel

- **v2 (graf):** `cognitive.contract.sign.check-expiry`.
- **Cod:** span `cognitive:e4:contract:status:poll` — reconciliere recomandată cu `e4:contract:status-poll` din catalog.

---
*Audit manual 2026-04-13.*
