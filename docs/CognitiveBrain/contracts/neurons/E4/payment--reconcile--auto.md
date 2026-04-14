<!-- neuron-contract:author-complete -->

# Neuron `payment:reconcile:auto`

> **Status:** audit manual **2026-04-13** — handler B7, catalog, registry, plan v2 L6327–6350. Fără scripturi de generare.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `payment:reconcile:auto` |
| etapa | E4 |
| familie (v2) | `cash` |
| contract_path | `contracts/neurons/E4/payment--reconcile--auto.md` |
| ADR familie (indicativ) | [cash](../../adr/families/e4/cash.md) |

## Scop în context real

Reconciliere **Tier 1**: potrivire exactă între referința plății și `goldOrders.orderNumber`, toleranță sumă ±0,01 RON; persistență în `gold_payment_reconciliations`, actualizare `gold_payments`, apoi coadă `payment:balance:update` (B10). Fără match exact → B8 fuzzy; mai multe candidați → B9 manual.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### NEURON` L6327–6350.
- Catalog: [`packages/shared/src/cognitive-node-catalog.ts`](../../../../../packages/shared/src/cognitive-node-catalog.ts) — intrare `e4:payment:reconcile-auto` / coadă `payment:reconcile:auto` (~L2292–2300).
- Registry: [`workers/shared/src/queue-registry.ts`](../../../../../workers/shared/src/queue-registry.ts) — `E4_PAYMENT_RECONCILE_AUTO` (~L369), config worker ~L1092.
- Handler: [`workers/e4-postsale/src/workers/b7-payment-reconcile-auto.ts`](../../../../../workers/e4-postsale/src/workers/b7-payment-reconcile-auto.ts).
- Motor reconciliere: [`workers/e4-postsale/src/lib/reconciliation-engine.ts`](../../../../../workers/e4-postsale/src/lib/reconciliation-engine.ts) — `loadPendingPayment`, `runTierOneMatch`, `insertReconciliation`.
- Bootstrap: [`workers/e4-postsale/src/index.ts`](../../../../../workers/e4-postsale/src/index.ts) — înregistrare B7 ~L184–189.
- Metrici: [`workers/e4-postsale/src/e4-metrics.js`](../../../../../workers/e4-postsale/src/e4-metrics.js) — `e4ReconciliationDurationSeconds`, `e4ReconciliationTotal` (import în B7).
- Teste: [`workers/e4-postsale/src/__tests__/b-workers.test.ts`](../../../../../workers/e4-postsale/src/__tests__/b-workers.test.ts).
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `cash` (v2 L6327–6350)

- **Catalog nodeKey:** `e4:payment:reconcile-auto`
- **Neuron type:** `ReconciliationNeuron`
- **Swimlane:** `payment-processing`
- **Criticitate:** `CRITICAL`
- **Autonomy tier (v2):** Tier 2 (suggest to human)
- **OODA (v2):** OBSERVE → ORIENT → DECIDE → ACT (procesare ReconciliationNeuron)
- **Model routing (v2):** Non-AI
- **OTel span (v2):** `cognitive.e4.payment.reconcile-auto`
- **Evidence status (v2):** catalog-grounded + research-enhanced

## N/A pe criterii

- **8 — Rutare model:** N/A — neuron Non-AI (v2 + catalog).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Coadă BullMQ: `payment:reconcile:auto` (`queue-registry.ts` ~L369). `nodeKey` catalog: `e4:payment:reconcile-auto` (`cognitive-node-catalog.ts` ~L2293). | v2 L6334–6344 — aceeași coadă și nodeKey. | — |
| 2 | Etapă, familie, swimlane | `etapa=4`, swimlane `payment-processing` în catalog (~L2297–2298). | v2: E4, familie `cash`, swimlane `payment-processing`. | — |
| 3 | Rol declarat | Funcție catalog: reconciliere Tier 1 ±0,01 RON. B7: match `orderNumber`/referință + sumă (comentariu fișier ~L4–8). | v2 L6341–6342 — cognitive function identică. | — |
| 4 | NeuronType + SOFAI | `NeuronType.ReconciliationNeuron` în catalog. | v2 L6335–6336 — ReconciliationNeuron; analogie corticală în v2. Clasificare SOFAI: raportată ca în v2 §2.1, fără extindere aici. | — |
| 5 | Criticitate | `CRITICAL` în catalog (~L2299). | v2 L6338 — CRITICAL. | — |
| 6 | Înveliș telemetrie | B7 **nu** folosește `withCognitiveSpan`; folosește Prometheus `e4ReconciliationDurationSeconds`, `e4ReconciliationTotal` (B7 ~L22, L56–59, L105–110). Span OTel v2 rămâne destinație nominală. | v2 L6348 — `cognitive.e4.payment.reconcile-auto`. | Nealiniere: span v2 vs instrumentare curentă (metrici, fără span activ pe B7). |
| 7 | Înveliș politică | Idempotență: doar plăți `PENDING` (`loadPendingPayment`); comentariu anti-halucinare B7 ~L10–11. Tier/autonomy Cedar/OPA: neafișat în handler. | v2 L6339–6347 — Tier 2, HITL pentru acțiuni ireversibile. | Politici Cedar/OPA: destinație arhitecturală (v2 §2.2), nelegate explicit în B7. |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI (v2 L6346). | — |
| 9 | Guardrails | Reguli deterministe Tier 1 în `reconciliation-engine` + skip non-PENDING. | NeMo / guardrail-uri LLM: N/A pentru acest neuron. | — |
| 10 | Escaladare HITL | >1 match exact → coadă `payment:reconcile:manual` (B9) cu candidați (B7 ~L124–161). | v2 — politică HITL la ireversibil; B9 este cale explicită. | SLA/orchestrator HITL transversal: vezi ADR-0008, nu duplicat în B7. |
| 11 | Micro-OODA | Flux: încarcă plată → `runTierOneMatch` → ramuri match / B8 / B9 / B10 (B7 întreg). | v2 L6345 — OODA generic ReconciliationNeuron. | — |
| 12 | Tier + de-escaladare | Fără prag de „încredere” sub 0,80 în Tier 1 — match binar sau delegare B8/B9. | v2 L6339 — Tier 2 suggest-to-human. | Invarianți încredere 0,80: nu aplicați în codul Tier 1 citit. |
| 13 | Stack v2 §2.3 (subset) | BullMQ (`createQueue` / `add`), Redis DB E4, Drizzle/DB tenant (`setSessionTenantId`). | Aliniat plan operațional E4 post-sale. | Versiuni infra: din manifeste repo, nu reiterate aici. |

### Mapare OTel

- **Convenție v2 / plan:** `cognitive.e4.payment.reconcile-auto` (v2 L6349); atribute gen `cognitive.neuron.id` — vezi ADR-0003.
- **Cod:** `withCognitiveSpan` setează `cognitive.nodeKey`, `cognitive.neuronType`, `cognitive.swimlane`, `cognitive.etapa`, `cognitive.function` ([`cognitive-helpers.ts`](../../../../../workers/shared/src/cognitive-helpers.ts) ~L226–234). **B7 nu apelează** `withCognitiveSpan`; observabilitate practică = metrici Prometheus din `e4-metrics.js`.
- **Stare:** parțial aliniat — metrici da, span per-neuron pe B7 nu.

---
*Audit manual 2026-04-13.*
