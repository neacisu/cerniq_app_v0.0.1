<!-- neuron-contract:author-complete -->

# Neuron `reconcile:overdue:check`

> **Status:** audit manual **2026-04-13**. v2 L6399–6419: coadă graf `reconcile:overdue:check` — **lipsește** din `queue-registry.ts`. **Cel mai apropiat echivalent runtime:** `payment:overdue:detect` (B11) + `payment:overdue:escalate` (B12), conform catalog și `index.ts` E4.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue (graf) | `reconcile:overdue:check` |
| echivalent runtime (semantic) | `payment:overdue:detect` (+ lanț B12) |
| etapa | E4 |
| familie (v2) | `cash` |
| contract_path | `contracts/neurons/E4/reconcile--overdue--check.md` |
| ADR familie (indicativ) | [cash](../../adr/families/e4/cash.md) |

## Scop în context real

**Graf v2:** verificare restanțe / overdue în subgraph cash. **Cod:** B11 selectează comenzi `INVOICED` / `PARTIALLY_PAID` cu `paymentDueAt` depășit (grație 1 zi), marchează overdue și enfilează B12 pentru escaladare; cron comentat `0 9 * * *` în `index.ts`.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L6399–6419.
- Catalog: [`cognitive-node-catalog.ts`](../../../../../packages/shared/src/cognitive-node-catalog.ts) — `e4:payment:overdue-detect` / `payment:overdue:detect` (~L2328–2335); `e4:payment:overdue-escalate` (~L2337–2344).
- Registry: [`queue-registry.ts`](../../../../../workers/shared/src/queue-registry.ts) — `E4_PAYMENT_OVERDUE_DETECT`, `E4_PAYMENT_OVERDUE_ESCALATE` (~L376–378).
- Handlers: [`b11-payment-overdue-detect.ts`](../../../../../workers/e4-postsale/src/workers/b11-payment-overdue-detect.ts), [`b12-payment-overdue-escalate.ts`](../../../../../workers/e4-postsale/src/workers/b12-payment-overdue-escalate.ts).
- Bootstrap: [`workers/e4-postsale/src/index.ts`](../../../../../workers/e4-postsale/src/index.ts) — B11/B12 ~L216–229.
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `cash` (v2 L6399–6419)

- **Tip inferat (v2):** `ReconciliationNeuron`
- **Confirmed queue field:** `reconcile:overdue:check`
- **Evidence status:** graph-export — ne-reconciliat cu registry (v2 L6419)
- **OTel (v2):** `cognitive.reconcile.overdue.check`

## N/A pe criterii

- **8 — Rutare model:** N/A — Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Graf:** `reconcile:overdue:check` (lipsă registry). **Runtime:** `payment:overdue:detect` + `e4:payment:overdue-detect` în catalog. | v2 L6413 — etichetă graf. | Două nume; contractul documentează maparea semantică. |
| 2 | Etapă, familie, swimlane | B11/B12: swimlane `payment-processing` (catalog). | v2: E4, `cash`. | Swimlane v2 L6417 `cash` vs catalog `payment-processing`. |
| 3 | Rol declarat | B11: detecție comenzi restante + enqueue B12 (fișier ~L1–46, ~L93+). | v2 L6410–6412 — descriere generică. | — |
| 4 | NeuronType + SOFAI | `ReconciliationNeuron` pentru ambele cozi în catalog. | v2 — ReconciliationNeuron inferat. | — |
| 5 | Criticitate | B11 `HIGH`, B12 `CRITICAL` în catalog. | v2 inferat `MEDIUM`. | Nealiniere criticitate. |
| 6 | Înveliș telemetrie | B11: fără `withCognitiveSpan` în fișierul citit la audit. | v2 L6418 — metrică generică. | Span `cognitive.reconcile.overdue.check` neimplementat pentru eticheta graf. |
| 7 | Înveliș politică | Logică grație zile + limit batch 500 (B11 ~L43–86). | v2 L6416 — fără HITL obligatoriu. | B12 poate declanșa căi HITL — vezi worker B12. |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI. | — |
| 9 | Guardrails | Filtru status comenzi + `deletedAt` null (B11). | — | — |
| 10 | Escaladare HITL | B12 dedicat escaladării (registry). | v2 OODA L6414. | — |
| 11 | Micro-OODA | Select overdue → mark / enqueue escalate (B11 header). | v2 L6414. | — |
| 12 | Tier + de-escaladare | Graduated escalation în descriere B12 (comentariu `index.ts` ~L224). | v2 Tier 4. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ, Redis E4, DB. | — | — |

### Mapare OTel

- **v2 (graf):** `cognitive.reconcile.overdue.check`.
- **Cod:** spanuri `cognitive:${nodeKey}` ar urma catalogul `e4:payment:overdue-detect` (cu cratimă în catalog); B11 nu folosește `withCognitiveSpan` în sursa citită.

---
*Audit manual 2026-04-13.*
